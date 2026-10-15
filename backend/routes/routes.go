// Declaramos el paquete routes, cuya única responsabilidad es registrar los endpoints de la API.
package routes

import (
	// Importamos Fiber para poder recibir y configurar la instancia principal de la aplicación.
	"github.com/gofiber/fiber/v2"
	// Importamos nuestro paquete de controladores, donde residen las funciones que se ejecutarán en cada ruta.
	"multicatalogo-backend/controllers"
	// Importamos el repositorio para inyectarlo en los locals de la petición.
	"multicatalogo-backend/repository"
	// Importamos el cliente oficial de Redis para inyectarlo en los handlers.
	"github.com/redis/go-redis/v9"
)

// SetupRoutes recibe la app Fiber, el repositorio (PostgreSQL) y el cliente de
// Redis para registrar las rutas e inyectar dependencias en los locals de cada
// petición sin variables globales de paquete.
func SetupRoutes(app *fiber.App, repo *repository.Repository, rdb *redis.Client) {
	// Inyectamos el repositorio y Redis en todos los handlers (dependencia sin globals).
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("repository", repo)
		c.Locals("redis", rdb)
		return c.Next()
	})

	// Definimos una ruta HTTP POST en "/api/login" y la enlazamos a la función Login del paquete controllers.
	app.Post("/api/login", controllers.Login)

	// Definimos una ruta HTTP GET en "/api/productos" y la enlazamos a la función GetProductos del paquete controllers.
	app.Get("/api/productos", controllers.GetProductos)

	// Definimos una ruta HTTP GET para un producto específico por ID.
	app.Get("/api/productos/:id", controllers.GetProductoPorID)

	// Definimos una ruta HTTP GET para verificar el estado de salud del servidor.
	app.Get("/api/health", controllers.HealthCheck)

	// Ruta nueva de la Fase 2: red multinivel de referidos desde PostgreSQL.
	app.Get("/api/red", controllers.GetRed)
}
