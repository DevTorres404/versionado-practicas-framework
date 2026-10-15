// Package repository centraliza el acceso a datos de PostgreSQL.
// Todas las funciones reciben la conexión inyectada por el constructor:
// no existen slices de datos empaquetados (package-level) aquí ni en los
// controladores; la única fuente de verdad es la base de datos.
package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	"multicatalogo-backend/models"
)

// Repository agrupa las consultas de la aplicación sobre *sql.DB.
type Repository struct {
	db *sql.DB
}

// New crea un Repository a partir de la conexión inyectada desde main.
func New(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// BuscarUsuarioPorCredenciales devuelve el usuario que coincide con email y
// password. Si no existe, devuelve sql.ErrNoRows (lo traduce el controlador a 401).
func (r *Repository) BuscarUsuarioPorCredenciales(email, password string) (*models.Usuario, error) {
	usuario := &models.Usuario{}

	err := r.db.QueryRow(
		`SELECT id, email, password, rol FROM usuarios WHERE email = $1 AND password = $2`,
		email, password,
	).Scan(&usuario.ID, &usuario.Email, &usuario.Password, &usuario.Rol)
	if err != nil {
		return nil, err
	}

	return usuario, nil
}

// ObtenerProductos devuelve el catálogo completo ordenado por id.
func (r *Repository) ObtenerProductos() ([]models.Producto, error) {
	rows, err := r.db.Query(`
		SELECT id, nombre, descripcion, precio, categoria, img, galeria
		   FROM productos
		  ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	productos := []models.Producto{}
	for rows.Next() {
		producto, err := escanearProducto(rows)
		if err != nil {
			return nil, err
		}
		productos = append(productos, *producto)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return productos, nil
}

// ObtenerProductoPorID devuelve un producto concreto o sql.ErrNoRows (404 en el controlador).
func (r *Repository) ObtenerProductoPorID(id int) (*models.Producto, error) {
	row := r.db.QueryRow(`
		SELECT id, nombre, descripcion, precio, categoria, img, galeria
		   FROM productos
		  WHERE id = $1`, id)

	return escanearProducto(row)
}

// ObtenerRed consulta las filas planas de la tabla `referidos` y reconstruye
// el árbol multinivel con la función pura construirArbol.
func (r *Repository) ObtenerRed() (*models.Referido, error) {
	rows, err := r.db.Query(`
		SELECT id, nombre, nivel, ventas, parent_id
		   FROM referidos
		  ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	filaPlana := []models.Referido{}
	for rows.Next() {
		var ref models.Referido
		var parentID sql.NullInt64

		if err := rows.Scan(&ref.ID, &ref.Nombre, &ref.Nivel, &ref.Ventas, &parentID); err != nil {
			return nil, err
		}
		if parentID.Valid {
			id := int(parentID.Int64)
			ref.ParentID = &id
		}
		filaPlana = append(filaPlana, ref)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	raiz := construirArbol(filaPlana)
	return &raiz, nil
}

// escanearProducto lee una fila con la forma de models.Producto; la columna
// JSONB `galeria` se deserializa a mano porque database/sql no parsea JSON.
func escanearProducto(scanner interface {
	Scan(dest ...any) error
}) (*models.Producto, error) {
	var producto models.Producto
	var galeriaJSON []byte

	err := scanner.Scan(
		&producto.ID,
		&producto.Nombre,
		&producto.Descripcion,
		&producto.Precio,
		&producto.Categoria,
		&producto.Img,
		&galeriaJSON,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}

	producto.Galeria = []string{}
	if len(galeriaJSON) > 0 {
		if err := json.Unmarshal(galeriaJSON, &producto.Galeria); err != nil {
			return nil, err
		}
	}

	return &producto, nil
}

// construirArbol es una función pura: recibe las filas planas de `referidos`
// (con ParentID apuntando al id del padre o nil en la raíz) y devuelve el
// árbol jerárquico listo para serializar. El orden de las filas determina el
// orden de los hijos; la raíz es la fila sin padre.
func construirArbol(filaPlana []models.Referido) models.Referido {
	// Indexamos los nodos por id y anotamos el orden de hijos de cada padre
	// (en el orden en que llegaron las filas).
	nodos := make(map[int]*models.Referido, len(filaPlana))
	hijosPorPadre := make(map[int][]int, len(filaPlana))

	raizID, hayRaiz := 0, false
	for i := range filaPlana {
		ref := &filaPlana[i]
		nodos[ref.ID] = ref
		if ref.ParentID == nil {
			raizID, hayRaiz = ref.ID, true
			continue
		}
		hijosPorPadre[*ref.ParentID] = append(hijosPorPadre[*ref.ParentID], ref.ID)
	}

	if !hayRaiz {
		return models.Referido{}
	}
	return materializarNodo(raizID, nodos, hijosPorPadre)
}

// materializarNodo copia recursivamente un nodo y todos sus descendientes.
// La copia se hace DESPUÉS de conocer los hijos de cada nodo, para no
// perder subárboles por copiar un nodo antes de que tenga sus hijos.
func materializarNodo(id int, nodos map[int]*models.Referido, hijosPorPadre map[int][]int) models.Referido {
	copia := *nodos[id]
	copia.Hijos = nil

	for _, hijoID := range hijosPorPadre[id] {
		copia.Hijos = append(copia.Hijos, materializarNodo(hijoID, nodos, hijosPorPadre))
	}

	return copia
}

// CrearPedido ejecuta una transacción SQL ACID en PostgreSQL para registrar
// la orden principal y su detalle en pedido_items, restando el stock simulado.
// Si cualquier paso falla, se ejecuta ROLLBACK garantizando consistencia (Fase 4, Paso 3).
func (r *Repository) CrearPedido(ctx context.Context, req *models.CheckoutRequest, numeroPedido string) (*models.Pedido, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("iniciar transacción: %w", err)
	}
	defer tx.Rollback()

	// 1. Insertar el registro principal del pedido en la tabla `pedidos`
	var pedidoID int
	var fechaStr string
	err = tx.QueryRowContext(ctx, `
		INSERT INTO pedidos (numero, cliente_nombre, cliente_email, direccion, ciudad, telefono, metodo_pago, total, fecha)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
		RETURNING id, TO_CHAR(fecha, 'YYYY-MM-DD HH24:MI:SS')
	`, numeroPedido, req.Cliente.Nombre, req.Cliente.Email, req.Cliente.Direccion, req.Cliente.Ciudad, req.Cliente.Telefono, req.MetodoPago, req.Total).Scan(&pedidoID, &fechaStr)
	if err != nil {
		return nil, fmt.Errorf("insertar pedido: %w", err)
	}

	pedido := &models.Pedido{
		ID:            pedidoID,
		Numero:        numeroPedido,
		ClienteNombre: req.Cliente.Nombre,
		ClienteEmail:  req.Cliente.Email,
		Direccion:     req.Cliente.Direccion,
		Ciudad:        req.Cliente.Ciudad,
		Telefono:      req.Cliente.Telefono,
		MetodoPago:    req.MetodoPago,
		Total:         req.Total,
		Fecha:         fechaStr,
		Items:         make([]models.PedidoItem, 0, len(req.Items)),
	}

	// 2. Insertar cada detalle en `pedido_items` y restar el stock simulado
	for _, item := range req.Items {
		subtotal := item.Precio * float64(item.Cantidad)
		var itemID int

		err = tx.QueryRowContext(ctx, `
			INSERT INTO pedido_items (pedido_id, producto_id, nombre, cantidad, precio, subtotal)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING id
		`, pedidoID, item.ID, item.Nombre, item.Cantidad, item.Precio, subtotal).Scan(&itemID)
		if err != nil {
			return nil, fmt.Errorf("insertar item %d: %w", item.ID, err)
		}

		// Restar stock simulado en productos
		_, err = tx.ExecContext(ctx, `
			UPDATE productos
			   SET stock = stock - $1
			 WHERE id = $2
		`, item.Cantidad, item.ID)
		if err != nil {
			return nil, fmt.Errorf("actualizar stock para producto %d: %w", item.ID, err)
		}

		pedido.Items = append(pedido.Items, models.PedidoItem{
			ID:         itemID,
			PedidoID:   pedidoID,
			ProductoID: item.ID,
			Nombre:     item.Nombre,
			Cantidad:   item.Cantidad,
			Precio:     item.Precio,
			Subtotal:   subtotal,
		})
	}

	// 3. Si todo es exitoso, COMMIT de la transacción ACID
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit transacción: %w", err)
	}

	return pedido, nil
}

// ActualizarComisionesReferidos actualiza las ventas de la red multinivel en PostgreSQL
// de forma asíncrona dentro de una Goroutine (Fase 4, Paso 4).
func (r *Repository) ActualizarComisionesReferidos(ctx context.Context, total float64) error {
	// Incrementamos las ventas del nodo líder de la red (id: 0, "Tú")
	_, err := r.db.ExecContext(ctx, `
		UPDATE referidos
		   SET ventas = ventas + $1
		 WHERE id = 0
	`, total)
	if err != nil {
		return fmt.Errorf("actualizar ventas de referidos: %w", err)
	}

	return nil
}
