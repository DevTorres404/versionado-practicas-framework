// Controlador de la red multinivel de referidos (endpoint nuevo de la Fase 2).
package controllers

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// RedController maneja las peticiones de la red multinivel con Inyección de Dependencias (Fase 4).
type RedController struct {
	repo  repository.DBRepository
	cache repository.CacheRepository
}

// NewRedController crea un RedController con su repositorio y caché inyectados.
func NewRedController(repo repository.DBRepository, cache repository.CacheRepository) *RedController {
	return &RedController{repo: repo, cache: cache}
}

// GetRed devuelve el árbol de referidos implementando el patrón Cache-Aside con dependencias inyectadas.
func (rc *RedController) GetRed(c *fiber.Ctx) error {
	// Determinamos el email del usuario: parámetro de consulta, cabecera o fallback al admin de prueba.
	emailUsuario := c.Query("email")
	if emailUsuario == "" {
		emailUsuario = c.Get("X-User-Email")
	}
	if emailUsuario == "" {
		emailUsuario = "admin@upse.edu.ec"
	}

	cacheKey := "red:tree:" + emailUsuario
	ctx := c.Context()

	// 1. Intenta leer la clave red:tree:{email_usuario} desde la caché inyectada
	if rc.cache != nil {
		cachedJSON, err := rc.cache.Get(ctx, cacheKey)
		if err == nil && cachedJSON != "" {
			var red models.Referido
			if err := json.Unmarshal([]byte(cachedJSON), &red); err == nil {
				c.Set("X-Cache", "HIT")
				return c.JSON(red)
			}
		}
	}

	// 2. Si hay un Cache Miss, arma el árbol desde PostgreSQL mediante el repositorio inyectado
	red, err := rc.repo.ObtenerRed()
	if err != nil {
		return c.Status(500).JSON(models.APIError{
			Status:  500,
			Message: "Error interno al consultar la red de referidos",
			Details: err.Error(),
		})
	}

	// 3. Guárdalo en caché con un TTL de 10 minutos y retorna
	if rc.cache != nil {
		if data, err := json.Marshal(red); err == nil {
			_ = rc.cache.Set(ctx, cacheKey, string(data), 10*time.Minute)
		}
	}

	c.Set("X-Cache", "MISS")
	return c.JSON(red)
}

// GetMiRed devuelve el subárbol multinivel anclado en el nodo de red del usuario autenticado.
func (rc *RedController) GetMiRed(c *fiber.Ctx) error {
	subStr, _ := c.Locals("sub").(string)
	if subStr == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(models.APIError{
			Status:  fiber.StatusUnauthorized,
			Message: "Identidad de usuario no verificada",
		})
	}

	var uid int
	if _, err := fmt.Sscanf(subStr, "%d", &uid); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "Identificador de usuario inválido",
		})
	}

	usuario, err := rc.repo.BuscarUsuarioPorID(uid)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(models.APIError{
			Status:  fiber.StatusNotFound,
			Message: "Usuario no encontrado",
		})
	}

	if usuario.ReferidoID == nil {
		return c.JSON(models.Referido{
			Nombre: usuario.Nombre,
			Nivel:  0,
		})
	}

	cacheKey := fmt.Sprintf("red:tree:%d", *usuario.ReferidoID)
	ctx := c.Context()

	if rc.cache != nil {
		if cachedJSON, err := rc.cache.Get(ctx, cacheKey); err == nil && cachedJSON != "" {
			var red models.Referido
			if err := json.Unmarshal([]byte(cachedJSON), &red); err == nil {
				c.Set("X-Cache", "HIT")
				return c.JSON(red)
			}
		}
	}

	red, err := rc.repo.ObtenerRedDeUsuario(*usuario.ReferidoID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al armar la red de referidos del usuario",
			Details: err.Error(),
		})
	}

	if rc.cache != nil {
		if data, err := json.Marshal(red); err == nil {
			_ = rc.cache.Set(ctx, cacheKey, string(data), 5*time.Minute)
		}
	}

	c.Set("X-Cache", "MISS")
	return c.JSON(red)
}

// GetMisComisiones devuelve el listado del ledger de comisiones y totales para el usuario autenticado.
func (rc *RedController) GetMisComisiones(c *fiber.Ctx) error {
	subStr, _ := c.Locals("sub").(string)
	if subStr == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(models.APIError{
			Status:  fiber.StatusUnauthorized,
			Message: "Identidad de usuario no verificada",
		})
	}

	var uid int
	if _, err := fmt.Sscanf(subStr, "%d", &uid); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "Identificador de usuario inválido",
		})
	}

	usuario, err := rc.repo.BuscarUsuarioPorID(uid)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(models.APIError{
			Status:  fiber.StatusNotFound,
			Message: "Usuario no encontrado",
		})
	}

	if usuario.ReferidoID == nil {
		return c.JSON(fiber.Map{
			"comisiones": []models.Comision{},
			"pendiente":  0.0,
			"pagado":     0.0,
		})
	}

	comisiones, pendiente, pagado, err := rc.repo.ObtenerComisionesUsuario(c.Context(), *usuario.ReferidoID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al consultar comisiones del usuario",
			Details: err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"comisiones": comisiones,
		"pendiente":  pendiente,
		"pagado":     pagado,
	})
}
