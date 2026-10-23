// Package repository define las interfaces y la implementación del acceso a datos (Fase 4 & Back-office).
package repository

import (
	"context"
	"errors"
	"time"

	"multicatalogo-backend/models"
)

// Errores de dominio para control granular de respuestas HTTP
var (
	ErrNoEncontrado       = errors.New("recurso no encontrado")
	ErrCantidadInvalida   = errors.New("cantidad debe ser mayor que cero")
	ErrStockInsuficiente  = errors.New("stock insuficiente para el producto")
	ErrEmailDuplicado     = errors.New("el correo electrónico ya está registrado")
	ErrCodigoRefInvalido  = errors.New("código de referido inválido")
	ErrCuentaDesactivada  = errors.New("cuenta de usuario desactivada")
	ErrTransicionInvalida = errors.New("transición de estado de pedido no permitida")
)

// DBRepository define el contrato desacoplado para todas las operaciones de datos sobre PostgreSQL.
type DBRepository interface {
	// Autenticación y Cuentas de Usuario
	BuscarUsuarioPorEmail(email string) (*models.Usuario, error)
	BuscarUsuarioPorID(id int) (*models.Usuario, error)
	BuscarUsuarioPorCredenciales(email, password string) (*models.Usuario, error)
	RegistrarUsuario(ctx context.Context, req *models.RegisterRequest) (*models.Usuario, error)
	ObtenerUsuarios(q string, page, limit int) ([]models.UsuarioAdmin, int, error)

	// Catálogo de Productos (CRUD y Paginación)
	ObtenerProductos(soloActivos bool, q string, page, limit int) ([]models.Producto, int, error)
	ObtenerProductoPorID(id int) (*models.Producto, error)
	CrearProducto(ctx context.Context, p *models.Producto) (*models.Producto, error)
	ActualizarProducto(ctx context.Context, id int, p *models.Producto) (*models.Producto, error)
	DesactivarProducto(ctx context.Context, id int) error

	// Red Multinivel y Referidos
	ObtenerRed() (*models.Referido, error)
	ObtenerRedDeUsuario(referidoID int) (*models.Referido, error)
	BuscarReferidoPorCodigo(codigo string) (*models.Referido, error)

	// Pedidos y Motor Transaccional
	CrearPedido(ctx context.Context, req *models.CheckoutRequest, numeroPedido string, usuarioID *int) (*models.Pedido, error)
	ObtenerPedidosUsuario(ctx context.Context, usuarioID int, page, limit int) ([]models.Pedido, int, error)
	ObtenerTodosPedidos(ctx context.Context, estado string, page, limit int) ([]models.Pedido, int, error)
	ObtenerPedidoPorID(ctx context.Context, id int) (*models.Pedido, error)
	CambiarEstadoPedido(ctx context.Context, id int, nuevoEstado string) (*models.Pedido, error)
	ActualizarComisionesReferidos(ctx context.Context, total float64) error

	// Ledger de Comisiones y Liquidaciones
	ObtenerComisionesUsuario(ctx context.Context, referidoID int) ([]models.Comision, float64, float64, error)
	CrearLiquidacion(ctx context.Context, referidoID int) (*models.Liquidacion, error)
	ObtenerLiquidaciones(ctx context.Context) ([]models.Liquidacion, error)
	ObtenerLiquidacionesUsuario(ctx context.Context, referidoID int) ([]models.Liquidacion, error)

	// Reportes y Analíticas de Negocio
	ObtenerReporteResumen(ctx context.Context, desde, hasta string) (*models.ReporteResumen, error)
	ObtenerTopProductos(ctx context.Context, limit int) ([]models.TopProducto, error)
	ObtenerTopReferidos(ctx context.Context, limit int) ([]models.TopReferido, error)

	// Infraestructura y Monitoreo
	Ping(ctx context.Context) error
}

// CacheRepository define el contrato para operaciones sobre Redis.
type CacheRepository interface {
	Get(ctx context.Context, key string) (string, error)
	Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error
	Del(ctx context.Context, keys ...string) error
	Ping(ctx context.Context) error
}
