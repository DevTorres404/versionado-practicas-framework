// Seguimos dentro del paquete controllers, ya que maneja la lógica de otra sección del negocio.
package controllers

import (
	// Importamos 'database/sql' y 'errors' para traducir sql.ErrNoRows a un 404.
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	// Importamos strconv para convertir el parámetro de ruta a entero.
	"strconv"
	// Importamos Fiber para manejar la respuesta HTTP.
	"github.com/gofiber/fiber/v2"
	// Importamos el cliente oficial de Redis para Cache-Aside.
	"github.com/redis/go-redis/v9"
	// Importamos nuestro paquete de modelos para usar la estructura Producto.
	"multicatalogo-backend/models"
)

// GetProductos es la función controladora encargada de devolver el catálogo de artículos
// implementando el patrón Cache-Aside con Redis (Fase 3).
func GetProductos(c *fiber.Ctx) error {
	// Obtenemos el repositorio inyectado por routes.SetupRoutes.
	repo, err := obtenerRepositorio(c)
	if err != nil {
		return err
	}

	rdb, _ := c.Locals("redis").(*redis.Client)
	ctx := c.Context()

	// 1. Intenta leer la clave `productos:all` desde Redis.
	if rdb != nil {
		cachedJSON, err := rdb.Get(ctx, "productos:all").Result()
		if err == nil && cachedJSON != "" {
			// 2. Si existe (Cache Hit), deserializa el JSON y retorna la respuesta inmediatamente (sin tocar PostgreSQL).
			var productos []models.Producto
			if err := json.Unmarshal([]byte(cachedJSON), &productos); err == nil {
				c.Set("X-Cache", "HIT")
				return c.JSON(productos)
			}
		}
	}

	// 3. Si no existe (Cache Miss), consulta PostgreSQL.
	productos, err := repo.ObtenerProductos()
	if err != nil {
		return c.Status(500).JSON(models.APIError{
			Status:  500,
			Message: "Error interno al consultar el catálogo",
			Details: err.Error(),
		})
	}

	// Serializa el resultado a JSON y guárdalo en Redis con un tiempo de expiración (TTL) de 5 minutos.
	if rdb != nil {
		if data, err := json.Marshal(productos); err == nil {
			_ = rdb.Set(ctx, "productos:all", data, 5*time.Minute).Err()
		}
	}

	// Retorna la respuesta con cabecera informativa de Cache Miss.
	c.Set("X-Cache", "MISS")
	return c.JSON(productos)
}

// GetProductoPorID devuelve un producto específico basado en su ID.
func GetProductoPorID(c *fiber.Ctx) error {
	idParam := c.Params("id")

	id, err := strconv.Atoi(idParam)
	if err != nil {
		return c.Status(400).JSON(models.APIError{
			Status:  400,
			Message: "El ID del producto debe ser un número válido",
			Details: err.Error(),
		})
	}

	// Obtenemos el repositorio inyectado por routes.SetupRoutes.
	repo, err := obtenerRepositorio(c)
	if err != nil {
		return err
	}

	// Consultamos el producto real en PostgreSQL; si la fila no existe
	// (sql.ErrNoRows) respondemos con un 404 en lugar de datos inventados.
	producto, err := repo.ObtenerProductoPorID(id)
	if errors.Is(err, sql.ErrNoRows) {
		return c.Status(404).JSON(models.APIError{
			Status:  404,
			Message: "Producto no encontrado",
			Details: "No existe un producto con id " + strconv.Itoa(id),
		})
	}
	if err != nil {
		return c.Status(500).JSON(models.APIError{
			Status:  500,
			Message: "Error interno al consultar el producto",
			Details: err.Error(),
		})
	}

	return c.JSON(producto)
}
