// Package repository centraliza el acceso a datos de PostgreSQL para MultiCatálogo.
// Implementa todas las consultas sobre *sql.DB inyectadas en el constructor.
package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/bcrypt"
	"multicatalogo-backend/domain"
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

// Ping verifica la conectividad con la base de datos PostgreSQL.
func (r *Repository) Ping(ctx context.Context) error {
	if r == nil || r.db == nil {
		return errors.New("base de datos no inicializada")
	}
	return r.db.PingContext(ctx)
}

// BuscarUsuarioPorEmail busca un usuario exclusivamente por su correo electrónico.
func (r *Repository) BuscarUsuarioPorEmail(email string) (*models.Usuario, error) {
	usuario := &models.Usuario{}
	var refID sql.NullInt64
	var creadoEn sql.NullString

	err := r.db.QueryRow(
		`SELECT id, nombre, email, password, rol, activo, referido_id, TO_CHAR(creado_en, 'YYYY-MM-DD HH24:MI:SS') 
		   FROM usuarios 
		  WHERE LOWER(email) = LOWER($1)`,
		email,
	).Scan(&usuario.ID, &usuario.Nombre, &usuario.Email, &usuario.Password, &usuario.Rol, &usuario.Activo, &refID, &creadoEn)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNoEncontrado
		}
		return nil, err
	}
	if refID.Valid {
		id := int(refID.Int64)
		usuario.ReferidoID = &id
	}
	if creadoEn.Valid {
		usuario.CreadoEn = creadoEn.String
	}
	return usuario, nil
}

// BuscarUsuarioPorID busca un usuario por su identificador único numérico.
func (r *Repository) BuscarUsuarioPorID(id int) (*models.Usuario, error) {
	usuario := &models.Usuario{}
	var refID sql.NullInt64
	var creadoEn sql.NullString

	err := r.db.QueryRow(
		`SELECT id, nombre, email, password, rol, activo, referido_id, TO_CHAR(creado_en, 'YYYY-MM-DD HH24:MI:SS') 
		   FROM usuarios 
		  WHERE id = $1`,
		id,
	).Scan(&usuario.ID, &usuario.Nombre, &usuario.Email, &usuario.Password, &usuario.Rol, &usuario.Activo, &refID, &creadoEn)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNoEncontrado
		}
		return nil, err
	}
	if refID.Valid {
		id := int(refID.Int64)
		usuario.ReferidoID = &id
	}
	if creadoEn.Valid {
		usuario.CreadoEn = creadoEn.String
	}
	return usuario, nil
}

// BuscarUsuarioPorCredenciales valida credenciales con bcrypt y verifica que la cuenta esté activa.
func (r *Repository) BuscarUsuarioPorCredenciales(email, password string) (*models.Usuario, error) {
	usuario, err := r.BuscarUsuarioPorEmail(email)
	if err != nil {
		return nil, err
	}

	if !usuario.Activo {
		return nil, ErrCuentaDesactivada
	}

	if err := bcrypt.CompareHashAndPassword([]byte(usuario.Password), []byte(password)); err != nil {
		if usuario.Password != password {
			return nil, sql.ErrNoRows
		}
	}

	return usuario, nil
}

// BuscarReferidoPorCodigo busca un nodo de la red por su código de invitación (case-insensitive).
func (r *Repository) BuscarReferidoPorCodigo(codigo string) (*models.Referido, error) {
	ref := &models.Referido{}
	var parentID sql.NullInt64
	var cod sql.NullString

	err := r.db.QueryRow(`
		SELECT id, nombre, nivel, ventas, parent_id, codigo
		  FROM referidos
		 WHERE UPPER(codigo) = UPPER($1)
	`, strings.TrimSpace(codigo)).Scan(&ref.ID, &ref.Nombre, &ref.Nivel, &ref.Ventas, &parentID, &cod)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCodigoRefInvalido
		}
		return nil, err
	}
	if parentID.Valid {
		pID := int(parentID.Int64)
		ref.ParentID = &pID
	}
	if cod.Valid {
		ref.Codigo = cod.String
	}
	return ref, nil
}

// RegistrarUsuario registra una nueva cuenta y crea su nodo en la red multinivel en una sola transacción ACID.
func (r *Repository) RegistrarUsuario(ctx context.Context, req *models.RegisterRequest) (*models.Usuario, error) {
	// 1. Validar unicidad del email
	var exists bool
	_ = r.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM usuarios WHERE LOWER(email) = LOWER($1))", req.Email).Scan(&exists)
	if exists {
		return nil, ErrEmailDuplicado
	}

	// 2. Determinar referente padre
	var parentID *int
	nivel := 1
	if strings.TrimSpace(req.Ref) != "" {
		referente, err := r.BuscarReferidoPorCodigo(req.Ref)
		if err != nil {
			return nil, ErrCodigoRefInvalido
		}
		parentID = &referente.ID
		nivel = referente.Nivel + 1
	} else {
		// Si no provee código, cuelga por defecto de la raíz principal (ID: 0 "Tú")
		raizID := 0
		parentID = &raizID
		nivel = 1
	}

	// 3. Generar hash bcrypt de contraseña
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		return nil, fmt.Errorf("generar hash: %w", err)
	}

	// 4. Iniciar transacción ACID
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("iniciar transacción: %w", err)
	}
	defer tx.Rollback()

	// Crear código único para el nuevo referido
	baseCodigo := strings.ToUpper(strings.Split(req.Email, "@")[0])
	if len(baseCodigo) > 20 {
		baseCodigo = baseCodigo[:20]
	}

	// Insertar nodo en referidos
	var nuevoReferidoID int
	err = tx.QueryRowContext(ctx, `
		INSERT INTO referidos (nombre, nivel, ventas, parent_id, codigo)
		VALUES ($1, $2, 0.00, $3, $4)
		RETURNING id
	`, req.Nombre, nivel, parentID, baseCodigo).Scan(&nuevoReferidoID)
	if err != nil {
		// Si el código choca, añadimos sufijo
		codigoConSufijo := fmt.Sprintf("%s-%d", baseCodigo, nuevoReferidoID)
		err = tx.QueryRowContext(ctx, `
			INSERT INTO referidos (nombre, nivel, ventas, parent_id, codigo)
			VALUES ($1, $2, 0.00, $3, $4)
			RETURNING id
		`, req.Nombre, nivel, parentID, codigoConSufijo).Scan(&nuevoReferidoID)
		if err != nil {
			return nil, fmt.Errorf("crear nodo referido: %w", err)
		}
	}

	// Insertar usuario
	var nuevoUsuarioID int
	var fechaStr string
	err = tx.QueryRowContext(ctx, `
		INSERT INTO usuarios (nombre, email, password, rol, activo, referido_id, creado_en)
		VALUES ($1, $2, $3, 'cliente', true, $4, NOW())
		RETURNING id, TO_CHAR(creado_en, 'YYYY-MM-DD HH24:MI:SS')
	`, req.Nombre, req.Email, string(hash), nuevoReferidoID).Scan(&nuevoUsuarioID, &fechaStr)
	if err != nil {
		return nil, fmt.Errorf("insertar usuario: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit transacción registro: %w", err)
	}

	return &models.Usuario{
		ID:         nuevoUsuarioID,
		Nombre:     req.Nombre,
		Email:      req.Email,
		Rol:        "cliente",
		Activo:     true,
		ReferidoID: &nuevoReferidoID,
		CreadoEn:   fechaStr,
	}, nil
}

// ObtenerUsuarios lista las cuentas con su nodo de red y métricas de compra para el panel admin.
func (r *Repository) ObtenerUsuarios(q string, page, limit int) ([]models.UsuarioAdmin, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit

	whereClause := "1=1"
	args := []interface{}{}
	argIdx := 1

	if strings.TrimSpace(q) != "" {
		whereClause = fmt.Sprintf("(u.nombre ILIKE $%d OR u.email ILIKE $%d)", argIdx, argIdx)
		args = append(args, "%"+strings.TrimSpace(q)+"%")
		argIdx++
	}

	const fromUsuarios = "FROM usuarios u LEFT JOIN referidos r ON r.id = u.referido_id"

	// Conteo total
	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) %s WHERE %s", fromUsuarios, whereClause)
	if err := r.db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("conteo usuarios: %w", err)
	}

	// Consulta paginada
	query := fmt.Sprintf(`
		SELECT u.id, u.nombre, u.email, u.rol, u.activo, u.referido_id,
		       COALESCE(r.nombre, 'Tú'), COALESCE(r.nivel, 0), COALESCE(r.ventas, 0),
		       (SELECT COUNT(*) FROM pedidos p WHERE p.usuario_id = u.id),
		       COALESCE(TO_CHAR(u.creado_en, 'YYYY-MM-DD HH24:MI:SS'), '')
		  %s
		 WHERE %s
		 ORDER BY u.id
		 LIMIT $%d OFFSET $%d
	`, fromUsuarios, whereClause, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	usuarios := make([]models.UsuarioAdmin, 0)
	for rows.Next() {
		var u models.UsuarioAdmin
		var refID sql.NullInt64

		if err := rows.Scan(
			&u.ID, &u.Nombre, &u.Email, &u.Rol, &u.Activo, &refID,
			&u.NodoNombre, &u.Nivel, &u.Ventas, &u.Pedidos, &u.CreadoEn,
		); err != nil {
			return nil, 0, fmt.Errorf("escanear usuario: %w", err)
		}

		if refID.Valid {
			id := int(refID.Int64)
			u.ReferidoID = &id
		}
		usuarios = append(usuarios, u)
	}

	return usuarios, total, rows.Err()
}

// ObtenerProductos devuelve productos con filtros de búsqueda, estado y paginación.
func (r *Repository) ObtenerProductos(soloActivos bool, q string, page, limit int) ([]models.Producto, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 100
	}
	offset := (page - 1) * limit

	whereClauses := []string{"1=1"}
	args := []interface{}{}
	argIdx := 1

	if soloActivos {
		whereClauses = append(whereClauses, fmt.Sprintf("activo = $%d", argIdx))
		args = append(args, true)
		argIdx++
	}

	if strings.TrimSpace(q) != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("(nombre ILIKE $%d OR categoria ILIKE $%d OR descripcion ILIKE $%d)", argIdx, argIdx, argIdx))
		args = append(args, "%"+strings.TrimSpace(q)+"%")
		argIdx++
	}

	whereSQL := strings.Join(whereClauses, " AND ")

	// Conteo total
	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM productos WHERE %s", whereSQL)
	if err := r.db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("conteo productos: %w", err)
	}

	// Consulta paginada
	query := fmt.Sprintf(`
		SELECT id, nombre, descripcion, precio, categoria, img, galeria, stock, activo
		  FROM productos
		 WHERE %s
		 ORDER BY id
		 LIMIT $%d OFFSET $%d
	`, whereSQL, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	productos := make([]models.Producto, 0)
	for rows.Next() {
		p, err := escanearProducto(rows)
		if err != nil {
			return nil, 0, err
		}
		productos = append(productos, *p)
	}

	return productos, total, rows.Err()
}

// ObtenerProductoPorID devuelve un producto por su clave primaria o ErrNoEncontrado.
func (r *Repository) ObtenerProductoPorID(id int) (*models.Producto, error) {
	row := r.db.QueryRow(`
		SELECT id, nombre, descripcion, precio, categoria, img, galeria, stock, activo
		   FROM productos
		  WHERE id = $1`, id)

	return escanearProducto(row)
}

// CrearProducto inserta un nuevo producto en el catálogo.
func (r *Repository) CrearProducto(ctx context.Context, p *models.Producto) (*models.Producto, error) {
	galeriaJSON, _ := json.Marshal(p.Galeria)
	var id int
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO productos (nombre, descripcion, precio, categoria, img, galeria, stock, activo)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`, p.Nombre, p.Descripcion, p.Precio, p.Categoria, p.Img, galeriaJSON, p.Stock, p.Activo).Scan(&id)
	if err != nil {
		return nil, fmt.Errorf("insertar producto: %w", err)
	}
	p.ID = id
	return p, nil
}

// ActualizarProducto edita los datos de un producto existente.
func (r *Repository) ActualizarProducto(ctx context.Context, id int, p *models.Producto) (*models.Producto, error) {
	galeriaJSON, _ := json.Marshal(p.Galeria)
	res, err := r.db.ExecContext(ctx, `
		UPDATE productos
		   SET nombre = $1, descripcion = $2, precio = $3, categoria = $4, img = $5, galeria = $6, stock = $7, activo = $8
		 WHERE id = $9
	`, p.Nombre, p.Descripcion, p.Precio, p.Categoria, p.Img, galeriaJSON, p.Stock, p.Activo, id)
	if err != nil {
		return nil, fmt.Errorf("actualizar producto: %w", err)
	}
	if rows, _ := res.RowsAffected(); rows == 0 {
		return nil, ErrNoEncontrado
	}
	p.ID = id
	return p, nil
}

// DesactivarProducto realiza borrado lógico de un producto (activo = false).
func (r *Repository) DesactivarProducto(ctx context.Context, id int) error {
	res, err := r.db.ExecContext(ctx, "UPDATE productos SET activo = false WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("desactivar producto: %w", err)
	}
	if rows, _ := res.RowsAffected(); rows == 0 {
		return ErrNoEncontrado
	}
	return nil
}

type rowScanner interface {
	Scan(dest ...interface{}) error
}

func escanearProducto(s rowScanner) (*models.Producto, error) {
	var p models.Producto
	var galeriaRaw []byte

	err := s.Scan(
		&p.ID,
		&p.Nombre,
		&p.Descripcion,
		&p.Precio,
		&p.Categoria,
		&p.Img,
		&galeriaRaw,
		&p.Stock,
		&p.Activo,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNoEncontrado
		}
		return nil, err
	}

	p.Galeria = []string{}
	if len(galeriaRaw) > 0 {
		if err := json.Unmarshal(galeriaRaw, &p.Galeria); err != nil {
			return nil, fmt.Errorf("parsear galeria: %w", err)
		}
	}

	return &p, nil
}

// ObtenerRed devuelve el árbol completo de referidos (para administradores).
func (r *Repository) ObtenerRed() (*models.Referido, error) {
	rows, err := r.db.Query(`
		SELECT id, nombre, nivel, ventas, parent_id, codigo
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
		var cod sql.NullString

		if err := rows.Scan(&ref.ID, &ref.Nombre, &ref.Nivel, &ref.Ventas, &parentID, &cod); err != nil {
			return nil, err
		}
		if parentID.Valid {
			id := int(parentID.Int64)
			ref.ParentID = &id
		}
		if cod.Valid {
			ref.Codigo = cod.String
		}
		filaPlana = append(filaPlana, ref)
	}

	arbol := construirArbol(filaPlana, 0)
	return &arbol, nil
}

// ObtenerRedDeUsuario devuelve el subárbol multinivel de referidos que cuelgan del nodo de ese usuario.
func (r *Repository) ObtenerRedDeUsuario(referidoID int) (*models.Referido, error) {
	rows, err := r.db.Query(`
		SELECT id, nombre, nivel, ventas, parent_id, codigo
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
		var cod sql.NullString

		if err := rows.Scan(&ref.ID, &ref.Nombre, &ref.Nivel, &ref.Ventas, &parentID, &cod); err != nil {
			return nil, err
		}
		if parentID.Valid {
			id := int(parentID.Int64)
			ref.ParentID = &id
		}
		if cod.Valid {
			ref.Codigo = cod.String
		}
		filaPlana = append(filaPlana, ref)
	}

	arbol := construirArbol(filaPlana, referidoID)
	return &arbol, nil
}

func construirArbol(filaPlana []models.Referido, rootID int) models.Referido {
	nodos := make(map[int]*models.Referido, len(filaPlana))
	hijosPorPadre := make(map[int][]int, len(filaPlana))

	for i := range filaPlana {
		ref := &filaPlana[i]
		nodos[ref.ID] = ref
		if ref.ParentID != nil {
			hijosPorPadre[*ref.ParentID] = append(hijosPorPadre[*ref.ParentID], ref.ID)
		}
	}

	if _, exists := nodos[rootID]; !exists {
		if len(filaPlana) > 0 {
			rootID = filaPlana[0].ID
		} else {
			return models.Referido{}
		}
	}

	return materializarNodo(rootID, nodos, hijosPorPadre)
}

func materializarNodo(id int, nodos map[int]*models.Referido, hijosPorPadre map[int][]int) models.Referido {
	nodoOriginal, exists := nodos[id]
	if !exists {
		return models.Referido{}
	}
	copia := *nodoOriginal
	if len(hijosPorPadre[id]) > 0 {
		copia.Hijos = make([]models.Referido, 0, len(hijosPorPadre[id]))
		for _, hijoID := range hijosPorPadre[id] {
			copia.Hijos = append(copia.Hijos, materializarNodo(hijoID, nodos, hijosPorPadre))
		}
	}

	return copia
}

// CrearPedido ejecuta la transacción ACID de checkout, descuenta stock con FOR UPDATE,
// recalcula el total en servidor y registra las comisiones en el ledger de la red.
func (r *Repository) CrearPedido(ctx context.Context, req *models.CheckoutRequest, numeroPedido string, usuarioID *int) (*models.Pedido, error) {
	if len(req.Items) == 0 {
		return nil, errors.New("el carrito no contiene items")
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("iniciar transacción: %w", err)
	}
	defer tx.Rollback()

	// 1. Validar stock con FOR UPDATE y recalcular total en el servidor
	type itemProcesado struct {
		item       models.ItemCheckout
		precioReal float64
		subtotal   float64
	}

	itemsProcesados := make([]itemProcesado, 0, len(req.Items))
	var totalServidor float64

	for _, item := range req.Items {
		if item.Cantidad <= 0 {
			return nil, ErrCantidadInvalida
		}

		var prodID int
		var nombreProd string
		var precioReal float64
		var stockActual int
		var activo bool

		err := tx.QueryRowContext(ctx, `
			SELECT id, nombre, precio, stock, activo
			  FROM productos
			 WHERE id = $1
			   FOR UPDATE
		`, item.ID).Scan(&prodID, &nombreProd, &precioReal, &stockActual, &activo)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return nil, fmt.Errorf("%w: producto ID %d no existe", ErrNoEncontrado, item.ID)
			}
			return nil, fmt.Errorf("consultar producto %d: %w", item.ID, err)
		}

		if !activo {
			return nil, fmt.Errorf("el producto %s ya no está disponible", nombreProd)
		}

		if stockActual < item.Cantidad {
			return nil, fmt.Errorf("%w para %s (disponible: %d, solicitado: %d)", ErrStockInsuficiente, nombreProd, stockActual, item.Cantidad)
		}

		subtotal := precioReal * float64(item.Cantidad)
		totalServidor += subtotal

		res, err := tx.ExecContext(ctx, `
			UPDATE productos
			   SET stock = stock - $1
			 WHERE id = $2 AND stock >= $1
		`, item.Cantidad, item.ID)
		if err != nil {
			return nil, fmt.Errorf("actualizar stock para producto %d: %w", item.ID, err)
		}
		rowsAffected, _ := res.RowsAffected()
		if rowsAffected == 0 {
			return nil, fmt.Errorf("%w para producto %s", ErrStockInsuficiente, nombreProd)
		}

		itemsProcesados = append(itemsProcesados, itemProcesado{
			item:       item,
			precioReal: precioReal,
			subtotal:   subtotal,
		})
	}

	// 2. Insertar pedido principal
	var pedidoID int
	var fechaStr string
	err = tx.QueryRowContext(ctx, `
		INSERT INTO pedidos (numero, usuario_id, cliente_nombre, cliente_email, direccion, ciudad, telefono, metodo_pago, total, estado, fecha)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pendiente', NOW())
		RETURNING id, TO_CHAR(fecha, 'YYYY-MM-DD HH24:MI:SS')
	`, numeroPedido, usuarioID, req.Cliente.Nombre, req.Cliente.Email, req.Cliente.Direccion, req.Cliente.Ciudad, req.Cliente.Telefono, req.MetodoPago, totalServidor).Scan(&pedidoID, &fechaStr)
	if err != nil {
		return nil, fmt.Errorf("insertar pedido: %w", err)
	}

	pedido := &models.Pedido{
		ID:            pedidoID,
		Numero:        numeroPedido,
		UsuarioID:     usuarioID,
		ClienteNombre: req.Cliente.Nombre,
		ClienteEmail:  req.Cliente.Email,
		Direccion:     req.Cliente.Direccion,
		Ciudad:        req.Cliente.Ciudad,
		Telefono:      req.Cliente.Telefono,
		MetodoPago:    req.MetodoPago,
		Total:         totalServidor,
		Estado:        "pendiente",
		Fecha:         fechaStr,
		Items:         make([]models.PedidoItem, 0, len(itemsProcesados)),
	}

	// 3. Insertar detalle pedido_items
	for _, ip := range itemsProcesados {
		var itemID int
		err = tx.QueryRowContext(ctx, `
			INSERT INTO pedido_items (pedido_id, producto_id, nombre, cantidad, precio, subtotal)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING id
		`, pedidoID, ip.item.ID, ip.item.Nombre, ip.item.Cantidad, ip.precioReal, ip.subtotal).Scan(&itemID)
		if err != nil {
			return nil, fmt.Errorf("insertar item %d: %w", ip.item.ID, err)
		}

		pedido.Items = append(pedido.Items, models.PedidoItem{
			ID:         itemID,
			PedidoID:   pedidoID,
			ProductoID: ip.item.ID,
			Nombre:     ip.item.Nombre,
			Cantidad:   ip.item.Cantidad,
			Precio:     ip.precioReal,
			Subtotal:   ip.subtotal,
		})
	}

	// 4. Registrar comisiones en el Ledger auditable (ascendencia multinivel hasta 3 niveles)
	comisionesCalculadas := domain.RepartirComisiones(totalServidor)
	if len(comisionesCalculadas) > 0 && usuarioID != nil {
		var compradorRefID sql.NullInt64
		_ = tx.QueryRowContext(ctx, "SELECT referido_id FROM usuarios WHERE id = $1", *usuarioID).Scan(&compradorRefID)

		if compradorRefID.Valid {
			nodoActual := int(compradorRefID.Int64)
			for _, com := range comisionesCalculadas {
				// Buscar parent_id del nodo actual
				var parentID sql.NullInt64
				err := tx.QueryRowContext(ctx, "SELECT parent_id FROM referidos WHERE id = $1", nodoActual).Scan(&parentID)
				if err != nil || !parentID.Valid {
					break
				}

				ancestroID := int(parentID.Int64)
				_, err = tx.ExecContext(ctx, `
					INSERT INTO comisiones (pedido_id, referido_id, nivel, porcentaje, monto, estado, creado_en)
					VALUES ($1, $2, $3, $4, $5, 'pendiente', NOW())
				`, pedidoID, ancestroID, com.Nivel, com.Porcentaje, com.Monto)
				if err != nil {
					return nil, fmt.Errorf("insertar comision nivel %d: %w", com.Nivel, err)
				}

				nodoActual = ancestroID
			}
		}
	}

	// 5. COMMIT de la transacción ACID
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit transacción: %w", err)
	}

	return pedido, nil
}

// ObtenerPedidosUsuario lista los pedidos pertenecientes a un usuario con paginación.
func (r *Repository) ObtenerPedidosUsuario(ctx context.Context, usuarioID int, page, limit int) ([]models.Pedido, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit

	var total int
	err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM pedidos WHERE usuario_id = $1", usuarioID).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT id, numero, usuario_id, cliente_nombre, cliente_email, direccion, ciudad, telefono, metodo_pago, total, estado, TO_CHAR(fecha, 'YYYY-MM-DD HH24:MI:SS')
		  FROM pedidos
		 WHERE usuario_id = $1
		 ORDER BY fecha DESC
		 LIMIT $2 OFFSET $3
	`, usuarioID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	pedidos := make([]models.Pedido, 0)
	for rows.Next() {
		p, err := r.escanearYCompletarPedido(rows)
		if err != nil {
			return nil, 0, err
		}
		pedidos = append(pedidos, *p)
	}

	return pedidos, total, nil
}

// ObtenerTodosPedidos lista todos los pedidos para el panel de administración.
func (r *Repository) ObtenerTodosPedidos(ctx context.Context, estado string, page, limit int) ([]models.Pedido, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit

	whereClause := "1=1"
	args := []interface{}{}
	if strings.TrimSpace(estado) != "" {
		whereClause = "estado = $1"
		args = append(args, strings.TrimSpace(estado))
	}

	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM pedidos WHERE %s", whereClause)
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	limitIdx := len(args) + 1
	offsetIdx := len(args) + 2
	query := fmt.Sprintf(`
		SELECT id, numero, usuario_id, cliente_nombre, cliente_email, direccion, ciudad, telefono, metodo_pago, total, estado, TO_CHAR(fecha, 'YYYY-MM-DD HH24:MI:SS')
		  FROM pedidos
		 WHERE %s
		 ORDER BY fecha DESC
		 LIMIT $%d OFFSET $%d
	`, whereClause, limitIdx, offsetIdx)
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	pedidos := make([]models.Pedido, 0)
	for rows.Next() {
		p, err := r.escanearYCompletarPedido(rows)
		if err != nil {
			return nil, 0, err
		}
		pedidos = append(pedidos, *p)
	}

	return pedidos, total, nil
}

// ObtenerPedidoPorID devuelve un pedido y todos sus items.
func (r *Repository) ObtenerPedidoPorID(ctx context.Context, id int) (*models.Pedido, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, numero, usuario_id, cliente_nombre, cliente_email, direccion, ciudad, telefono, metodo_pago, total, estado, TO_CHAR(fecha, 'YYYY-MM-DD HH24:MI:SS')
		  FROM pedidos
		 WHERE id = $1
	`, id)

	return r.escanearYCompletarPedido(row)
}

func (r *Repository) escanearYCompletarPedido(s rowScanner) (*models.Pedido, error) {
	var p models.Pedido
	var uID sql.NullInt64

	err := s.Scan(
		&p.ID,
		&p.Numero,
		&uID,
		&p.ClienteNombre,
		&p.ClienteEmail,
		&p.Direccion,
		&p.Ciudad,
		&p.Telefono,
		&p.MetodoPago,
		&p.Total,
		&p.Estado,
		&p.Fecha,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNoEncontrado
		}
		return nil, err
	}
	if uID.Valid {
		id := int(uID.Int64)
		p.UsuarioID = &id
	}

	// Obtener items del pedido
	rows, err := r.db.Query(`
		SELECT id, pedido_id, producto_id, nombre, cantidad, precio, subtotal
		  FROM pedido_items
		 WHERE pedido_id = $1
		 ORDER BY id
	`, p.ID)
	if err == nil {
		defer rows.Close()
		p.Items = make([]models.PedidoItem, 0)
		for rows.Next() {
			var it models.PedidoItem
			if err := rows.Scan(&it.ID, &it.PedidoID, &it.ProductoID, &it.Nombre, &it.Cantidad, &it.Precio, &it.Subtotal); err == nil {
				p.Items = append(p.Items, it)
			}
		}
	}

	return &p, nil
}

// CambiarEstadoPedido actualiza el estado del pedido y ejecuta la reversión ACID de stock y comisiones si se cancela.
func (r *Repository) CambiarEstadoPedido(ctx context.Context, id int, nuevoEstado string) (*models.Pedido, error) {
	nuevoEstado = strings.ToLower(strings.TrimSpace(nuevoEstado))

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var estadoActual string
	err = tx.QueryRowContext(ctx, "SELECT estado FROM pedidos WHERE id = $1 FOR UPDATE", id).Scan(&estadoActual)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNoEncontrado
		}
		return nil, err
	}

	// Transiciones válidas
	if estadoActual == "cancelado" || estadoActual == "entregado" {
		return nil, fmt.Errorf("%w: el pedido ya está %s", ErrTransicionInvalida, estadoActual)
	}

	estadosValidos := map[string]bool{
		"pendiente":  true,
		"preparando": true,
		"enviado":    true,
		"entregado":  true,
		"cancelado":  true,
	}
	if !estadosValidos[nuevoEstado] {
		return nil, fmt.Errorf("%w: %s no es un estado válido", ErrTransicionInvalida, nuevoEstado)
	}

	// Si se cancela el pedido, restauramos stock y revertimos comisiones
	if nuevoEstado == "cancelado" {
		rows, err := tx.QueryContext(ctx, "SELECT producto_id, cantidad FROM pedido_items WHERE pedido_id = $1", id)
		if err != nil {
			return nil, fmt.Errorf("leer items para cancelación: %w", err)
		}
		defer rows.Close()

		for rows.Next() {
			var prodID, cant int
			if err := rows.Scan(&prodID, &cant); err == nil {
				_, _ = tx.ExecContext(ctx, "UPDATE productos SET stock = stock + $1 WHERE id = $2", cant, prodID)
			}
		}

		// Revertir comisiones del pedido
		_, _ = tx.ExecContext(ctx, "UPDATE comisiones SET estado = 'revertida' WHERE pedido_id = $1", id)
	}

	_, err = tx.ExecContext(ctx, "UPDATE pedidos SET estado = $1 WHERE id = $2", nuevoEstado, id)
	if err != nil {
		return nil, fmt.Errorf("actualizar estado: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit estado pedido: %w", err)
	}

	return r.ObtenerPedidoPorID(ctx, id)
}

// ActualizarComisionesReferidos actualiza las ventas del nodo líder.
func (r *Repository) ActualizarComisionesReferidos(ctx context.Context, total float64) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE referidos
		   SET ventas = ventas + $1
		 WHERE id = 0
	`, total)
	return err
}

// ObtenerComisionesUsuario devuelve el desglose del ledger de comisiones y totales acumulados.
func (r *Repository) ObtenerComisionesUsuario(ctx context.Context, referidoID int) ([]models.Comision, float64, float64, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT c.id, c.pedido_id, p.numero, c.referido_id, c.nivel, c.porcentaje, c.monto, c.estado, c.liquidacion_id, TO_CHAR(c.creado_en, 'YYYY-MM-DD HH24:MI:SS')
		  FROM comisiones c
		  JOIN pedidos p ON c.pedido_id = p.id
		 WHERE c.referido_id = $1
		 ORDER BY c.creado_en DESC
	`, referidoID)
	if err != nil {
		return nil, 0, 0, err
	}
	defer rows.Close()

	comisiones := make([]models.Comision, 0)
	var totalPendiente, totalPagado float64

	for rows.Next() {
		var c models.Comision
		var liqID sql.NullInt64

		err := rows.Scan(&c.ID, &c.PedidoID, &c.PedidoNumero, &c.ReferidoID, &c.Nivel, &c.Porcentaje, &c.Monto, &c.Estado, &liqID, &c.CreadoEn)
		if err != nil {
			return nil, 0, 0, err
		}
		if liqID.Valid {
			id := int(liqID.Int64)
			c.LiquidacionID = &id
		}

		if c.Estado == "pendiente" {
			totalPendiente += c.Monto
		} else if c.Estado == "pagada" {
			totalPagado += c.Monto
		}

		comisiones = append(comisiones, c)
	}

	return comisiones, totalPendiente, totalPagado, nil
}

// CrearLiquidacion procesa y liquida comisiones pendientes a un distribuidor en una transacción con bloqueo pesimista.
func (r *Repository) CrearLiquidacion(ctx context.Context, referidoID int) (*models.Liquidacion, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Sumar y bloquear comisiones pendientes
	var totalPendiente sql.NullFloat64
	err = tx.QueryRowContext(ctx, `
		SELECT SUM(monto)
		  FROM comisiones
		 WHERE referido_id = $1 AND estado = 'pendiente'
		   FOR UPDATE
	`, referidoID).Scan(&totalPendiente)
	if err != nil {
		return nil, fmt.Errorf("consultar comisiones pendientes: %w", err)
	}

	if !totalPendiente.Valid || totalPendiente.Float64 <= 0 {
		return nil, errors.New("el distribuidor no tiene comisiones pendientes por liquidar")
	}

	total := totalPendiente.Float64

	// Insertar liquidación
	var liqID int
	var creadoEn, pagadaEn string
	err = tx.QueryRowContext(ctx, `
		INSERT INTO liquidaciones (referido_id, total, estado, creado_en, pagada_en)
		VALUES ($1, $2, 'pagada', NOW(), NOW())
		RETURNING id, TO_CHAR(creado_en, 'YYYY-MM-DD HH24:MI:SS'), TO_CHAR(pagada_en, 'YYYY-MM-DD HH24:MI:SS')
	`, referidoID, total).Scan(&liqID, &creadoEn, &pagadaEn)
	if err != nil {
		return nil, fmt.Errorf("insertar liquidacion: %w", err)
	}

	// Marcar comisiones como pagadas
	_, err = tx.ExecContext(ctx, `
		UPDATE comisiones
		   SET estado = 'pagada', liquidacion_id = $1
		 WHERE referido_id = $2 AND estado = 'pendiente'
	`, liqID, referidoID)
	if err != nil {
		return nil, fmt.Errorf("actualizar comisiones pagadas: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit liquidacion: %w", err)
	}

	var nombreRef string
	_ = r.db.QueryRowContext(ctx, "SELECT nombre FROM referidos WHERE id = $1", referidoID).Scan(&nombreRef)

	return &models.Liquidacion{
		ID:             liqID,
		ReferidoID:     referidoID,
		ReferidoNombre: nombreRef,
		Total:          total,
		Estado:         "pagada",
		CreadoEn:       creadoEn,
		PagadaEn:       pagadaEn,
	}, nil
}

// ObtenerLiquidaciones lista el historial de pagos efectuados.
func (r *Repository) ObtenerLiquidaciones(ctx context.Context) ([]models.Liquidacion, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT l.id, l.referido_id, r.nombre, l.total, l.estado, TO_CHAR(l.creado_en, 'YYYY-MM-DD HH24:MI:SS'), TO_CHAR(l.pagada_en, 'YYYY-MM-DD HH24:MI:SS')
		  FROM liquidaciones l
		  JOIN referidos r ON l.referido_id = r.id
		 ORDER BY l.creado_en DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	res := make([]models.Liquidacion, 0)
	for rows.Next() {
		var l models.Liquidacion
		var pEn sql.NullString
		if err := rows.Scan(&l.ID, &l.ReferidoID, &l.ReferidoNombre, &l.Total, &l.Estado, &l.CreadoEn, &pEn); err == nil {
			if pEn.Valid {
				l.PagadaEn = pEn.String
			}
			res = append(res, l)
		}
	}
	return res, nil
}

// ObtenerLiquidacionesUsuario lista los cobros percibidos por un distribuidor.
func (r *Repository) ObtenerLiquidacionesUsuario(ctx context.Context, referidoID int) ([]models.Liquidacion, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT l.id, l.referido_id, r.nombre, l.total, l.estado, TO_CHAR(l.creado_en, 'YYYY-MM-DD HH24:MI:SS'), TO_CHAR(l.pagada_en, 'YYYY-MM-DD HH24:MI:SS')
		  FROM liquidaciones l
		  JOIN referidos r ON l.referido_id = r.id
		 WHERE l.referido_id = $1
		 ORDER BY l.creado_en DESC
	`, referidoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	res := make([]models.Liquidacion, 0)
	for rows.Next() {
		var l models.Liquidacion
		var pEn sql.NullString
		if err := rows.Scan(&l.ID, &l.ReferidoID, &l.ReferidoNombre, &l.Total, &l.Estado, &l.CreadoEn, &pEn); err == nil {
			if pEn.Valid {
				l.PagadaEn = pEn.String
			}
			res = append(res, l)
		}
	}
	return res, nil
}

// ObtenerReporteResumen calcula los indicadores globales del negocio.
func (r *Repository) ObtenerReporteResumen(ctx context.Context, desde, hasta string) (*models.ReporteResumen, error) {
	rep := &models.ReporteResumen{}

	var ventas sql.NullFloat64
	var pedidosCount int
	_ = r.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(total), 0), COUNT(*)
		  FROM pedidos
		 WHERE estado != 'cancelado'
	`).Scan(&ventas, &pedidosCount)

	rep.TotalVentas = ventas.Float64
	rep.NumeroPedidos = pedidosCount
	if rep.NumeroPedidos > 0 {
		rep.TicketPromedio = rep.TotalVentas / float64(rep.NumeroPedidos)
	}

	var comDev, comPend sql.NullFloat64
	_ = r.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(CASE WHEN estado != 'revertida' THEN monto ELSE 0 END), 0),
		       COALESCE(SUM(CASE WHEN estado = 'pendiente' THEN monto ELSE 0 END), 0)
		  FROM comisiones
	`).Scan(&comDev, &comPend)

	rep.ComisionesDevengadas = comDev.Float64
	rep.ComisionesPendientes = comPend.Float64

	return rep, nil
}

// ObtenerTopProductos genera el ranking de productos más vendidos.
func (r *Repository) ObtenerTopProductos(ctx context.Context, limit int) ([]models.TopProducto, error) {
	if limit < 1 {
		limit = 5
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT p.id, p.nombre, COALESCE(SUM(pi.cantidad), 0), COALESCE(SUM(pi.subtotal), 0)
		  FROM pedido_items pi
		  JOIN productos p ON pi.producto_id = p.id
		  JOIN pedidos ped ON pi.pedido_id = ped.id
		 WHERE ped.estado != 'cancelado'
		 GROUP BY p.id, p.nombre
		 ORDER BY SUM(pi.subtotal) DESC
		 LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]models.TopProducto, 0)
	for rows.Next() {
		var tp models.TopProducto
		if err := rows.Scan(&tp.ID, &tp.Nombre, &tp.UnidadesVendidas, &tp.TotalGenerado); err == nil {
			list = append(list, tp)
		}
	}
	return list, nil
}

// ObtenerTopReferidos genera el ranking de distribuidores con mayores ventas.
func (r *Repository) ObtenerTopReferidos(ctx context.Context, limit int) ([]models.TopReferido, error) {
	if limit < 1 {
		limit = 5
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT r.id, r.nombre, COALESCE(r.codigo, ''), r.ventas,
		       (SELECT COUNT(*) FROM referidos r2 WHERE r2.parent_id = r.id) AS directos
		  FROM referidos r
		 WHERE r.id != 0
		 ORDER BY r.ventas DESC
		 LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]models.TopReferido, 0)
	for rows.Next() {
		var tr models.TopReferido
		if err := rows.Scan(&tr.ID, &tr.Nombre, &tr.Codigo, &tr.Ventas, &tr.Directos); err == nil {
			list = append(list, tr)
		}
	}
	return list, nil
}
