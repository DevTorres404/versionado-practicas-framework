// Declaramos el paquete routes, cuya única responsabilidad es registrar los endpoints de la API.
package routes

import (
	"github.com/gofiber/fiber/v2"
	"multicatalogo-backend/controllers"
	"multicatalogo-backend/middleware"
)

// SetupRoutes registra los endpoints de la API enlazando directamente los métodos
// de los controladores con sus dependencias inyectadas y aplicando guardas de autenticación.
func SetupRoutes(
	app *fiber.App,
	authCtrl *controllers.AuthController,
	prodCtrl *controllers.ProdController,
	redCtrl *controllers.RedController,
	pedidoCtrl *controllers.PedidoController,
	checkoutCtrl *controllers.CheckoutController,
	liqCtrl *controllers.LiquidacionController,
	repCtrl *controllers.ReporteController,
	healthCtrl *controllers.HealthController,
	jwtSecret string,
) {
	// Endpoints públicos de autenticación y salud
	app.Post("/api/login", authCtrl.Login)
	app.Post("/api/register", authCtrl.Register)
	app.Get("/api/health", healthCtrl.HealthCheck)

	// Catálogo de productos público (activos, con Cache-Aside)
	app.Get("/api/productos", prodCtrl.GetProductos)
	app.Get("/api/productos/:id", prodCtrl.GetProductoPorID)

	// Middlewares de autenticación y autorización
	requireAuth := middleware.RequireAuth(jwtSecret)
	requireAdmin := middleware.RequireAdmin()

	// Catálogo administrativo (CRUD y listado completo)
	app.Get("/api/admin/productos", requireAuth, requireAdmin, prodCtrl.AdminGetProductos)
	app.Post("/api/productos", requireAuth, requireAdmin, prodCtrl.CrearProducto)
	app.Put("/api/productos/:id", requireAuth, requireAdmin, prodCtrl.ActualizarProducto)
	app.Delete("/api/productos/:id", requireAuth, requireAdmin, prodCtrl.DesactivarProducto)

	// Gestión y ciclo de vida de pedidos
	app.Post("/api/checkout", requireAuth, checkoutCtrl.Checkout)
	app.Get("/api/pedidos/mios", requireAuth, pedidoCtrl.GetMisPedidos)
	app.Get("/api/pedidos/:id", requireAuth, pedidoCtrl.GetPedidoByID)
	app.Get("/api/pedidos", requireAuth, requireAdmin, pedidoCtrl.AdminGetPedidos)
	app.Patch("/api/pedidos/:id/estado", requireAuth, requireAdmin, pedidoCtrl.CambiarEstado)

	// Red multinivel y comisiones
	app.Get("/api/red", requireAuth, redCtrl.GetRed)
	app.Get("/api/red/mia", requireAuth, redCtrl.GetMiRed)
	app.Get("/api/comisiones/mias", requireAuth, redCtrl.GetMisComisiones)

	// Liquidaciones
	app.Post("/api/liquidaciones", requireAuth, requireAdmin, liqCtrl.CrearLiquidacion)
	app.Get("/api/liquidaciones", requireAuth, requireAdmin, liqCtrl.GetLiquidaciones)
	app.Get("/api/liquidaciones/mias", requireAuth, liqCtrl.GetMisLiquidaciones)

	// Reportes ejecutivos y analíticas de negocio (Admin)
	app.Get("/api/reportes/resumen", requireAuth, requireAdmin, repCtrl.GetResumen)
	app.Get("/api/reportes/top-productos", requireAuth, requireAdmin, repCtrl.GetTopProductos)
	app.Get("/api/reportes/top-referidos", requireAuth, requireAdmin, repCtrl.GetTopReferidos)
}
