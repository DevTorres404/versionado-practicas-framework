// Declaramos el paquete models para agrupar las estructuras de datos de la aplicación.
package models

// LoginRequest define la estructura esperada para el cuerpo de la petición (JSON) al iniciar sesión.
type LoginRequest struct {
	// Email representa el correo del usuario; la etiqueta `json:"email"` indica cómo se mapea el JSON a esta variable.
	Email string `json:"email"`
	// Password representa la contraseña del usuario; se extrae del campo "password" del JSON entrante.
	Password string `json:"password"`
}

// Producto define la estructura de los datos de un artículo en nuestro catálogo.
type Producto struct {
	// ID es el identificador único numérico del producto.
	ID int `json:"id"`
	// Nombre es la descripción en texto del producto.
	Nombre string `json:"nombre"`
	// Descripcion es el texto largo del producto usado en la ficha de detalle.
	Descripcion string `json:"descripcion"`
	// Precio es el costo del producto, almacenado como un número con decimales (float64).
	Precio float64 `json:"precio"`
	// Categoria agrupa el producto para los filtros del catálogo.
	Categoria string `json:"categoria"`
	// Img es la URL o ruta que apunta a la fotografía o imagen del producto.
	Img string `json:"img"`
	// Galeria es la lista de imágenes adicionales (columna JSONB en PostgreSQL).
	Galeria []string `json:"galeria"`
	// Stock disponible del producto (simulado para transacciones ACID en Fase 4).
	Stock int `json:"stock,omitempty"`
}

// Usuario representa una fila de la tabla `usuarios` (inicio de sesión).
type Usuario struct {
	// ID es el identificador único del usuario.
	ID int `json:"id"`
	// Email es el correo con el que inicia sesión.
	Email string `json:"email"`
	// Password se mantiene en texto plano temporalmente (decisión del cuaderno de la tarea).
	Password string `json:"-"`
	// Rol determina los permisos del usuario (admin/cliente).
	Rol string `json:"rol"`
}

// Referido representa un nodo de la red multinivel de referidos.
// En la base de datos se guarda como una fila plana con `parent_id`;
// el campo Hijos se reconstruye en memoria con construirArbol().
type Referido struct {
	// ID es el identificador único del referido.
	ID int `json:"id"`
	// Nombre es el nombre visible del referido.
	Nombre string `json:"nombre"`
	// Nivel indica la profundidad en la red (0 = raíz, 1 = directo, ...).
	Nivel int `json:"nivel"`
	// Ventas son las ventas mensuales en dólares de ese referido.
	Ventas float64 `json:"ventas"`
	// ParentID es la fila padre en la tabla plana; no se expone en el JSON.
	ParentID *int `json:"-"`
	// Hijos son los referidos de un nivel más abajo (se reconstruye desde la BD).
	Hijos []Referido `json:"hijos,omitempty"`
}

// APIError estandariza los mensajes de error HTTP.
type APIError struct {
	Status  int         `json:"status"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

// ClienteCheckout contiene los datos del comprador enviados desde Checkout.tsx
type ClienteCheckout struct {
	Nombre    string `json:"nombre"`
	Email     string `json:"email"`
	Direccion string `json:"direccion"`
	Ciudad    string `json:"ciudad"`
	Telefono  string `json:"telefono"`
}

// ItemCheckout representa un producto dentro de la orden de compra
type ItemCheckout struct {
	ID       int     `json:"id"`
	Nombre   string  `json:"nombre"`
	Precio   float64 `json:"precio"`
	Cantidad int     `json:"cantidad"`
}

// CheckoutRequest es el payload esperado en POST /api/checkout
type CheckoutRequest struct {
	Cliente    ClienteCheckout `json:"cliente"`
	MetodoPago string          `json:"metodoPago"`
	Items      []ItemCheckout  `json:"items"`
	Total      float64         `json:"total"`
}

// Pedido representa la orden persistida en la tabla `pedidos` (Fase 4)
type Pedido struct {
	ID            int          `json:"id"`
	Numero        string       `json:"numero"`
	ClienteNombre string       `json:"cliente_nombre"`
	ClienteEmail  string       `json:"cliente_email"`
	Direccion     string       `json:"direccion"`
	Ciudad        string       `json:"ciudad"`
	Telefono      string       `json:"telefono"`
	MetodoPago    string       `json:"metodo_pago"`
	Total         float64      `json:"total"`
	Fecha         string       `json:"fecha"`
	Items         []PedidoItem `json:"items,omitempty"`
}

// PedidoItem representa un item persistido en la tabla `pedido_items`
type PedidoItem struct {
	ID         int     `json:"id"`
	PedidoID   int     `json:"pedido_id"`
	ProductoID int     `json:"producto_id"`
	Nombre     string  `json:"nombre"`
	Cantidad   int     `json:"cantidad"`
	Precio     float64 `json:"precio"`
	Subtotal   float64 `json:"subtotal"`
}

// CheckoutResponse es la respuesta enviada al frontend para mostrar en Confirmacion.tsx
type CheckoutResponse struct {
	Numero  string          `json:"numero"`
	Total   float64         `json:"total"`
	Fecha   string          `json:"fecha"`
	Cliente ClienteCheckout `json:"cliente"`
	Items   []ItemCheckout  `json:"items"`
	Mensaje string          `json:"mensaje,omitempty"`
}
