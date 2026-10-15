// Declaramos el paquete routes, cuya única responsabilidad es registrar los endpoints de la API.
package routes

import (
	"github.com/gofiber/fiber/v2"
	"multicatalogo-backend/controllers"
)

// SetupRoutes registra los endpoints de la API enlazando directamente los métodos
// de los controladores con sus dependencias inyectadas (Inyección de Dependencias, Fase 4).
func SetupRoutes(
	app *fiber.App,
	authCtrl *controllers.AuthController,
	prodCtrl *controllers.ProdController,
	redCtrl *controllers.RedController,
	checkoutCtrl *controllers.CheckoutController,
	healthCtrl *controllers.HealthController,
) {
	// Endpoint de autenticación
	app.Post("/api/login", authCtrl.Login)

	// Catálogo de productos con Cache-Aside
	app.Get("/api/productos", prodCtrl.GetProductos)
	app.Get("/api/productos/:id", prodCtrl.GetProductoPorID)

	// Estado de salud del servicio
	app.Get("/api/health", healthCtrl.HealthCheck)

	// Red multinivel de referidos con Cache-Aside
	app.Get("/api/red", redCtrl.GetRed)

	// Microservicio de simulación de transacciones ACID con Goroutines (Fase 4)
	app.Post("/api/checkout", checkoutCtrl.Checkout)
}
