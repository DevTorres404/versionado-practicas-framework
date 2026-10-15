// Controlador de la red multinivel de referidos (endpoint nuevo de la Fase 2).
package controllers

import (
	"encoding/json"
	"time"

	// Importamos Fiber para manejar la respuesta HTTP.
	"github.com/gofiber/fiber/v2"
	// Importamos el cliente oficial de Redis para Cache-Aside.
	"github.com/redis/go-redis/v9"
	// Importamos nuestro paquete de modelos para usar APIError en caso de fallo.
	"multicatalogo-backend/models"
)

// GetRed devuelve el árbol de referidos implementando el patrón Cache-Aside con Redis (Fase 3).
// Busca en Redis la clave `red:tree:{email_usuario}` con un TTL de 10 minutos.
// La respuesta conserva la misma forma que el frontend:
// {id, nombre, nivel, ventas, hijos:[...]}.
func GetRed(c *fiber.Ctx) error {
	// Obtenemos el repositorio inyectado por routes.SetupRoutes.
	repo, err := obtenerRepositorio(c)
	if err != nil {
		return err
	}

	// Determinamos el email del usuario: parámetro de consulta, cabecera o fallback al admin de prueba.
	emailUsuario := c.Query("email")
	if emailUsuario == "" {
		emailUsuario = c.Get("X-User-Email")
	}
	if emailUsuario == "" {
		emailUsuario = "admin@upse.edu.ec"
	}

	cacheKey := "red:tree:" + emailUsuario
	rdb, _ := c.Locals("redis").(*redis.Client)
	ctx := c.Context()

	// 1. Intenta leer la clave red:tree:{email_usuario} desde Redis.
	if rdb != nil {
		cachedJSON, err := rdb.Get(ctx, cacheKey).Result()
		if err == nil && cachedJSON != "" {
			// Cache Hit: deserializa y retorna inmediatamente sin tocar PostgreSQL.
			var red models.Referido
			if err := json.Unmarshal([]byte(cachedJSON), &red); err == nil {
				c.Set("X-Cache", "HIT")
				return c.JSON(red)
			}
		}
	}

	// 2. Si hay un Cache Miss, arma el árbol desde PostgreSQL.
	red, err := repo.ObtenerRed()
	if err != nil {
		return c.Status(500).JSON(models.APIError{
			Status:  500,
			Message: "Error interno al consultar la red de referidos",
			Details: err.Error(),
		})
	}

	// 3. Guárdalo en Redis con un TTL de 10 minutos y retorna.
	if rdb != nil {
		if data, err := json.Marshal(red); err == nil {
			_ = rdb.Set(ctx, cacheKey, data, 10*time.Minute).Err()
		}
	}

	c.Set("X-Cache", "MISS")
	return c.JSON(red)
}
