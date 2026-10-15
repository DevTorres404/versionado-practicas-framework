// Declaramos que este es el paquete principal (main), es decir, el archivo ejecutable que inicia el programa.
package main

import (
	// Importamos 'log' para mensajes de arranque/apagado y 'os'/'signal' para el shutdown.
	"log"
	"os"
	"os/signal"
	"syscall"

	// Importamos el framework principal Fiber.
	"github.com/gofiber/fiber/v2"
	// Importamos el middleware CORS para gestionar la seguridad entre distintos puertos/dominios.
	"github.com/gofiber/fiber/v2/middleware/cors"
	// Importamos la configuración y el pool de conexiones a PostgreSQL.
	"multicatalogo-backend/config"
	// Importamos el repositorio (capa de datos sobre *sql.DB).
	"multicatalogo-backend/repository"
	// Importamos nuestro propio paquete de rutas para delegarle la configuración de los endpoints.
	"multicatalogo-backend/routes"
)

// func main es el punto de entrada de la aplicación en Go. Todo comienza a ejecutarse aquí.
func main() {
	// Cargamos la configuración desde .env / variables de entorno.
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("FATAL: no se pudo cargar la configuración: %v", err)
	}

	// Abrimos el pool de conexiones y hacemos ping con timeout.
	// Si PostgreSQL no está alcanzable, la aplicación NO arranca (fail fast).
	db, err := config.NewDB(cfg)
	if err != nil {
		log.Fatalf("FATAL: PostgreSQL no alcanzable en %s:%s — %v", cfg.Host, cfg.Port, err)
	}
	// Cerramos el pool al finalizar el proceso.
	defer func() {
		if err := config.Close(db); err != nil {
			log.Printf("error al cerrar la base de datos: %v", err)
		}
	}()

	log.Printf("Conectado a PostgreSQL en %s:%s/%s", cfg.Host, cfg.Port, cfg.DBName)

	// Cargamos la configuración de Redis e inicializamos la conexión con fail-fast (Fase 3).
	redisCfg, err := config.LoadRedis()
	if err != nil {
		log.Fatalf("FATAL: no se pudo cargar la configuración de Redis: %v", err)
	}

	rdb, err := config.NewRedisClient(redisCfg)
	if err != nil {
		log.Fatalf("FATAL: Redis no alcanzable en %s:%s — %v", redisCfg.Host, redisCfg.Port, err)
	}
	defer func() {
		if err := config.CloseRedis(rdb); err != nil {
			log.Printf("error al cerrar Redis: %v", err)
		}
	}()

	log.Printf("Conectado a Redis en %s:%s (DB %d)", redisCfg.Host, redisCfg.Port, redisCfg.DB)

	// Instanciamos una nueva aplicación de Fiber y la guardamos en la variable 'app'.
	app := fiber.New()

	// Implementamos el middleware CORS a nivel global usando app.Use() para interceptar todas las peticiones entrantes.
	app.Use(cors.New(cors.Config{
		// Configuramos el CORS para permitir únicamente peticiones provenientes del frontend local en el puerto 5173.
		AllowOrigins: "http://172.17.82.108:5173, http://localhost:5173",
		// Declaramos de forma explícita qué cabeceras (Headers) se permitirán en la comunicación.
		AllowHeaders: "Origin, Content-Type, Accept",
	}))

	// Llamamos a la función SetupRoutes de nuestro paquete 'routes',
	// inyectando el repositorio conectado a PostgreSQL y el cliente Redis.
	routes.SetupRoutes(app, repository.New(db), rdb)

	// Escuchamos en un goroutine para poder apagar el servidor con señales (SIGINT/SIGTERM).
	listenErr := make(chan error, 1)
	go func() {
		log.Println("Servidor escuchando en http://localhost:3000")
		listenErr <- app.Listen(":3000")
	}()

	// Canal de señales del sistema operativo (Ctrl+C / SIGTERM).
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)

	select {
	case err := <-listenErr:
		// Si el servidor no pudo escuchar (ej. puerto ocupado), terminamos con error.
		if err != nil {
			log.Fatalf("FATAL: el servidor dejó de escuchar: %v", err)
		}
	case s := <-sig:
		// Señal de apagado: cerramos Fiber y luego el pool (defer).
		log.Printf("Señal %v recibida: apagando el servidor…", s)
		if err := app.Shutdown(); err != nil {
			log.Printf("error al apagar Fiber: %v", err)
		}
	}
}

// // main.go
// package main

// import (
// 	"github.com/gofiber/fiber/v2"
// 	"github.com/gofiber/fiber/v2/middleware/cors"
// )

// // Estructuras de datos
// type LoginRequest struct {
// 	Email    string `json:"email"`
// 	Password string `json:"password"`
// }

// type Producto struct {
// 	ID     int     `json:"id"`
// 	Nombre string  `json:"nombre"`
// 	Precio float64 `json:"precio"`
// 	Img    string  `json:"img"`
// }

// func main() {
// 	app := fiber.New()

// 	// Middleware CORS para permitir peticiones desde React (Vite corre en el puerto 5173)
// 	app.Use(cors.New(cors.Config{
// 		AllowOrigins: "http://localhost:5173",
// 		AllowHeaders: "Origin, Content-Type, Accept",
// 	}))

// 	// Endpoint para Login
// 	app.Post("/api/login", func(c *fiber.Ctx) error {
// 		var req LoginRequest
// 		if err := c.BodyParser(&req); err != nil {
// 			return c.Status(400).JSON(fiber.Map{"error": "Cuerpo de petición inválido"})
// 		}

// 		if req.Email == "admin@upse.edu.ec" && req.Password == "123456" {
// 			return c.JSON(fiber.Map{"token": "fake-jwt-token-123", "email": req.Email})
// 		}
// 		return c.Status(401).JSON(fiber.Map{"error": "Credenciales incorrectas"})
// 	})

// 	// Endpoint para obtener Productos
// 	app.Get("/api/productos", func(c *fiber.Ctx) error {
// 		productos := []Producto{
// 			{ID: 1, Nombre: "Serum Revitalizante", Precio: 45.00, Img: "https://picsum.photos/seed/serum/150"},
// 			{ID: 2, Nombre: "Crema Hidratante Pro", Precio: 32.50, Img: "https://picsum.photos/seed/crema/150"},
// 			{ID: 3, Nombre: "Tónico Purificante", Precio: 28.00, Img: "https://picsum.photos/seed/tonico/150"},
// 			{ID: 4, Nombre: "Mascarilla Nocturna", Precio: 50.00, Img: "https://picsum.photos/seed/mascarilla/150"},
// 		}
// 		return c.JSON(productos)
// 	})

// 	app.Listen(":3000")
// }
