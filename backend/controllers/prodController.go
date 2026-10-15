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
	// Importamos nuestro paquete de modelos para usar la estructura Producto.
	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// ProdController agrupa las operaciones del catálogo con dependencias inyectadas (Fase 4).
type ProdController struct {
	repo  repository.DBRepository
	cache repository.CacheRepository
}

// NewProdController crea un ProdController con su repositorio y caché inyectados.
func NewProdController(repo repository.DBRepository, cache repository.CacheRepository) *ProdController {
	return &ProdController{repo: repo, cache: cache}
}

// GetProductos devuelve el catálogo aplicando Cache-Aside sobre las dependencias inyectadas.
func (pc *ProdController) GetProductos(c *fiber.Ctx) error {
	ctx := c.Context()

	// 1. Intenta leer la clave `productos:all` desde la caché inyectada
	if pc.cache != nil {
		cachedJSON, err := pc.cache.Get(ctx, "productos:all")
		if err == nil && cachedJSON != "" {
			var productos []models.Producto
			if err := json.Unmarshal([]byte(cachedJSON), &productos); err == nil {
				c.Set("X-Cache", "HIT")
				return c.JSON(productos)
			}
		}
	}

	// 2. Si no existe (Cache Miss), consulta PostgreSQL mediante el repositorio inyectado
	productos, err := pc.repo.ObtenerProductos()
	if err != nil {
		return c.Status(500).JSON(models.APIError{
			Status:  500,
			Message: "Error interno al consultar el catálogo",
			Details: err.Error(),
		})
	}

	// 3. Serializa y guarda en caché con TTL de 5 minutos
	if pc.cache != nil {
		if data, err := json.Marshal(productos); err == nil {
			_ = pc.cache.Set(ctx, "productos:all", string(data), 5*time.Minute)
		}
	}

	c.Set("X-Cache", "MISS")
	return c.JSON(productos)
}

// GetProductoPorID devuelve un producto específico basado en su ID.
func (pc *ProdController) GetProductoPorID(c *fiber.Ctx) error {
	idParam := c.Params("id")

	id, err := strconv.Atoi(idParam)
	if err != nil {
		return c.Status(400).JSON(models.APIError{
			Status:  400,
			Message: "El ID del producto debe ser un número válido",
			Details: err.Error(),
		})
	}

	producto, err := pc.repo.ObtenerProductoPorID(id)
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
