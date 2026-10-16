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
	// Importamos los controladores para instanciarlos con Inyección de Dependencias.
	"multicatalogo-backend/controllers"
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

	// Implementamos el middleware CORS a nivel global permitiendo Authorization para tokens JWT
	app.Use(cors.New(cors.Config{
		AllowOrigins: "http://172.17.82.108:5173, http://localhost:5173",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
	}))

	// Variables de configuración de servidor y seguridad
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "multicatalogo-super-secret-jwt-key-2026"
	}

	// Instanciamos el repositorio y el adaptador de caché (Inyección de Dependencias, Fase 4)
	repo := repository.New(db)
	cache := config.NewRedisCache(rdb)

	// Instanciamos los controladores inyectándoles sus dependencias
	authCtrl := controllers.NewAuthController(repo, jwtSecret)
	prodCtrl := controllers.NewProdController(repo, cache)
	redCtrl := controllers.NewRedController(repo, cache)
	pedidoCtrl := controllers.NewPedidoController(repo, cache)
	checkoutCtrl := controllers.NewCheckoutController(repo, cache)
	liqCtrl := controllers.NewLiquidacionController(repo)
	repCtrl := controllers.NewReporteController(repo)
	healthCtrl := controllers.NewHealthController(repo, cache)

	// Inyectamos los controladores y la clave JWT en el router
	routes.SetupRoutes(app, authCtrl, prodCtrl, redCtrl, pedidoCtrl, checkoutCtrl, liqCtrl, repCtrl, healthCtrl, jwtSecret)

	// Escuchamos en un goroutine para poder apagar el servidor con señales (SIGINT/SIGTERM).
	listenErr := make(chan error, 1)
	go func() {
		log.Printf("Servidor escuchando en http://localhost:%s", port)
		listenErr <- app.Listen(":" + port)
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
