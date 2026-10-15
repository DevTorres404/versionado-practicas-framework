// Package repository centraliza el acceso a datos de PostgreSQL.
// Todas las funciones reciben la conexión inyectada por el constructor:
// no existen slices de datos empaquetados (package-level) aquí ni en los
// controladores; la única fuente de verdad es la base de datos.
package repository

import (
	"database/sql"
	"encoding/json"
	"errors"

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
