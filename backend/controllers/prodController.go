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

// GetProductos devuelve el catálogo público activo aplicando Cache-Aside sobre las dependencias inyectadas.
func (pc *ProdController) GetProductos(c *fiber.Ctx) error {
	ctx := c.Context()
	q := c.Query("q")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "100"))

	esBusquedaOmitible := q == "" && page == 1 && limit == 100

	// 1. Intenta leer la clave `productos:all` desde la caché inyectada si es la consulta base
	if esBusquedaOmitible && pc.cache != nil {
		cachedJSON, err := pc.cache.Get(ctx, "productos:all")
		if err == nil && cachedJSON != "" {
			var productos []models.Producto
			if err := json.Unmarshal([]byte(cachedJSON), &productos); err == nil {
				c.Set("X-Cache", "HIT")
				return c.JSON(productos)
			}
		}
	}

	// 2. Si no existe (Cache Miss) o es búsqueda filtrada, consulta PostgreSQL
	productos, total, err := pc.repo.ObtenerProductos(true, q, page, limit)
	if err != nil {
		return c.Status(500).JSON(models.APIError{
			Status:  500,
			Message: "Error interno al consultar el catálogo",
			Details: err.Error(),
		})
	}

	// 3. Serializa y guarda en caché con TTL de 5 minutos si es la consulta base
	if esBusquedaOmitible && pc.cache != nil {
		if data, err := json.Marshal(productos); err == nil {
			_ = pc.cache.Set(ctx, "productos:all", string(data), 5*time.Minute)
		}
	}

	c.Set("X-Cache", "MISS")

	// Si el cliente pide explícitamente paginación con query param 'page'
	if c.Query("page") != "" {
		return c.JSON(models.Pagina{
			Data:  productos,
			Page:  page,
			Limit: limit,
			Total: total,
		})
	}

	return c.JSON(productos)
}

// AdminGetProductos lista todos los productos (activos e inactivos) con paginación y búsqueda para el admin.
func (pc *ProdController) AdminGetProductos(c *fiber.Ctx) error {
	q := c.Query("q")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	productos, total, err := pc.repo.ObtenerProductos(false, q, page, limit)
	if err != nil {
		return c.Status(500).JSON(models.APIError{
			Status:  500,
			Message: "Error interno al consultar productos de administración",
			Details: err.Error(),
		})
	}

	return c.JSON(models.Pagina{
		Data:  productos,
		Page:  page,
		Limit: limit,
		Total: total,
	})
}

// CrearProducto permite al administrador agregar un nuevo producto al catálogo.
func (pc *ProdController) CrearProducto(c *fiber.Ctx) error {
	var p models.Producto
	if err := c.BodyParser(&p); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "Cuerpo de petición inválido",
			Details: err.Error(),
		})
	}

	if p.Nombre == "" || p.Categoria == "" || p.Precio <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "Nombre, categoría y precio mayor que cero son obligatorios",
		})
	}

	p.Activo = true
	creado, err := pc.repo.CrearProducto(c.Context(), &p)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al crear el producto",
			Details: err.Error(),
		})
	}

	if pc.cache != nil {
		_ = pc.cache.Del(c.Context(), "productos:all")
	}

	return c.Status(fiber.StatusCreated).JSON(creado)
}

// ActualizarProducto actualiza los datos de un producto y limpia la caché.
func (pc *ProdController) ActualizarProducto(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "ID de producto inválido",
		})
	}

	var p models.Producto
	if err := c.BodyParser(&p); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "Cuerpo de petición inválido",
			Details: err.Error(),
		})
	}

	actualizado, err := pc.repo.ActualizarProducto(c.Context(), id, &p)
	if err != nil {
		if errors.Is(err, repository.ErrNoEncontrado) {
			return c.Status(fiber.StatusNotFound).JSON(models.APIError{
				Status:  fiber.StatusNotFound,
				Message: "Producto no encontrado",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al actualizar producto",
			Details: err.Error(),
		})
	}

	if pc.cache != nil {
		_ = pc.cache.Del(c.Context(), "productos:all")
	}

	return c.JSON(actualizado)
}

// DesactivarProducto aplica borrado lógico desactivando un producto y limpiando la caché.
func (pc *ProdController) DesactivarProducto(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "ID de producto inválido",
		})
	}

	err = pc.repo.DesactivarProducto(c.Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNoEncontrado) {
			return c.Status(fiber.StatusNotFound).JSON(models.APIError{
				Status:  fiber.StatusNotFound,
				Message: "Producto no encontrado",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al desactivar producto",
			Details: err.Error(),
		})
	}

	if pc.cache != nil {
		_ = pc.cache.Del(c.Context(), "productos:all")
	}

	return c.JSON(fiber.Map{
		"mensaje": "Producto desactivado exitosamente",
		"id":      id,
	})
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
	if errors.Is(err, sql.ErrNoRows) || errors.Is(err, repository.ErrNoEncontrado) {
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
