// Declaramos el paquete models para agrupar las estructuras de datos de la aplicación.
package models

// LoginRequest define la estructura para inicio de sesión.
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// RegisterRequest define la estructura para registro de nuevos clientes en la red.
type RegisterRequest struct {
	Nombre   string `json:"nombre"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Ref      string `json:"ref,omitempty"` // Código de referido opcional
}

// Producto define un artículo del catálogo.
type Producto struct {
	ID          int      `json:"id"`
	Nombre      string   `json:"nombre"`
	Descripcion string   `json:"descripcion"`
	Precio      float64  `json:"precio"`
	Categoria   string   `json:"categoria"`
	Img         string   `json:"img"`
	Galeria     []string `json:"galeria"`
	Stock       int      `json:"stock"`
	Activo      bool     `json:"activo"`
}

// Usuario representa una cuenta en la tabla `usuarios`.
type Usuario struct {
	ID         int    `json:"id"`
	Nombre     string `json:"nombre"`
	Email      string `json:"email"`
	Password   string `json:"-"`
	Rol        string `json:"rol"`
	Activo     bool   `json:"activo"`
	ReferidoID *int   `json:"referido_id,omitempty"`
	CreadoEn   string `json:"creado_en,omitempty"`
}

// UsuarioAdmin extiende la cuenta con datos del nodo de red y métricas de compra
// para el listado administrativo. Nunca expone la contraseña.
type UsuarioAdmin struct {
	ID         int     `json:"id"`
	Nombre     string  `json:"nombre"`
	Email      string  `json:"email"`
	Rol        string  `json:"rol"`
	Activo     bool    `json:"activo"`
	ReferidoID *int    `json:"referido_id,omitempty"`
	NodoNombre string  `json:"nodo_nombre"`
	Nivel      int     `json:"nivel"`
	Ventas     float64 `json:"ventas"`
	Pedidos    int     `json:"pedidos"`
	CreadoEn   string  `json:"creado_en,omitempty"`
}

// Referido representa un nodo de la red multinivel MLM.
type Referido struct {
	ID       int        `json:"id"`
	Nombre   string     `json:"nombre"`
	Nivel    int        `json:"nivel"`
	Ventas   float64    `json:"ventas"`
	Codigo   string     `json:"codigo,omitempty"`
	ParentID *int       `json:"-"`
	Hijos    []Referido `json:"hijos,omitempty"`
}

// APIError estandariza los mensajes de error HTTP.
type APIError struct {
	Status  int         `json:"status"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

// ClienteCheckout contiene los datos del comprador.
type ClienteCheckout struct {
	Nombre    string `json:"nombre"`
	Email     string `json:"email"`
	Direccion string `json:"direccion"`
	Ciudad    string `json:"ciudad"`
	Telefono  string `json:"telefono"`
}

// ItemCheckout representa un producto dentro del carrito/orden.
type ItemCheckout struct {
	ID       int     `json:"id"`
	Nombre   string  `json:"nombre"`
	Precio   float64 `json:"precio"`
	Cantidad int     `json:"cantidad"`
}

// CheckoutRequest es el payload esperado en POST /api/checkout.
type CheckoutRequest struct {
	Cliente    ClienteCheckout `json:"cliente"`
	MetodoPago string          `json:"metodoPago"`
	Items      []ItemCheckout  `json:"items"`
	Total      float64         `json:"total"`
}

// Pedido representa la orden de compra en la tabla `pedidos`.
type Pedido struct {
	ID            int          `json:"id"`
	Numero        string       `json:"numero"`
	UsuarioID     *int         `json:"usuario_id,omitempty"`
	ClienteNombre string       `json:"cliente_nombre"`
	ClienteEmail  string       `json:"cliente_email"`
	Direccion     string       `json:"direccion"`
	Ciudad        string       `json:"ciudad"`
	Telefono      string       `json:"telefono"`
	MetodoPago    string       `json:"metodo_pago"`
	Total         float64      `json:"total"`
	Estado        string       `json:"estado"`
	Fecha         string       `json:"fecha"`
	Items         []PedidoItem `json:"items,omitempty"`
}

// PedidoItem representa un item persistido en la tabla `pedido_items`.
type PedidoItem struct {
	ID         int     `json:"id"`
	PedidoID   int     `json:"pedido_id"`
	ProductoID int     `json:"producto_id"`
	Nombre     string  `json:"nombre"`
	Cantidad   int     `json:"cantidad"`
	Precio     float64 `json:"precio"`
	Subtotal   float64 `json:"subtotal"`
}

// CheckoutResponse es la respuesta tras finalizar la compra.
type CheckoutResponse struct {
	Numero  string          `json:"numero"`
	Total   float64         `json:"total"`
	Fecha   string          `json:"fecha"`
	Cliente ClienteCheckout `json:"cliente"`
	Items   []ItemCheckout  `json:"items"`
	Mensaje string          `json:"mensaje,omitempty"`
}

// Comision representa una fila en el ledger de comisiones.
type Comision struct {
	ID            int     `json:"id"`
	PedidoID      int     `json:"pedido_id"`
	PedidoNumero  string  `json:"pedido_numero,omitempty"`
	ReferidoID    int     `json:"referido_id"`
	Nivel         int     `json:"nivel"`
	Porcentaje    float64 `json:"porcentaje"`
	Monto         float64 `json:"monto"`
	Estado        string  `json:"estado"`
	LiquidacionID *int    `json:"liquidacion_id,omitempty"`
	CreadoEn      string  `json:"creado_en"`
}

// Liquidacion representa un desembolso agrupado a un distribuidor.
type Liquidacion struct {
	ID             int     `json:"id"`
	ReferidoID     int     `json:"referido_id"`
	ReferidoNombre string  `json:"referido_nombre,omitempty"`
	Total          float64 `json:"total"`
	Estado         string  `json:"estado"`
	CreadoEn       string  `json:"creado_en"`
	PagadaEn       string  `json:"pagada_en,omitempty"`
}

// LiquidacionRequest contiene el distribuidor a liquidar.
type LiquidacionRequest struct {
	ReferidoID int `json:"referido_id"`
}

// ReporteResumen consolida los indicadores ejecutivos de ventas y comisiones.
type ReporteResumen struct {
	TotalVentas          float64 `json:"total_ventas"`
	NumeroPedidos        int     `json:"numero_pedidos"`
	TicketPromedio       float64 `json:"ticket_promedio"`
	ComisionesDevengadas float64 `json:"comisiones_devengadas"`
	ComisionesPendientes float64 `json:"comisiones_pendientes"`
}

// TopProducto representa un producto en el ranking de ventas.
type TopProducto struct {
	ID               int     `json:"id"`
	Nombre           string  `json:"nombre"`
	UnidadesVendidas int     `json:"unidades_vendidas"`
	TotalGenerado    float64 `json:"total_generado"`
}

// TopReferido representa un distribuidor en el ranking de ventas.
type TopReferido struct {
	ID       int     `json:"id"`
	Nombre   string  `json:"nombre"`
	Codigo   string  `json:"codigo"`
	Ventas   float64 `json:"ventas"`
	Directos int     `json:"directos"`
}

// Pagina envuelve cualquier listado con metadatos de paginación.
type Pagina struct {
	Data  interface{} `json:"data"`
	Page  int         `json:"page"`
	Limit int         `json:"limit"`
	Total int         `json:"total"`
}
