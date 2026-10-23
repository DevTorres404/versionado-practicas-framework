// Package controllers maneja los endpoints administrativos de gestión de usuarios.
package controllers

import (
	// Importamos strconv para convertir los parámetros de paginación a enteros.
	"strconv"

	// Importamos Fiber para manejar la respuesta HTTP.
	"github.com/gofiber/fiber/v2"
	// Importamos nuestro paquete de modelos para usar Pagina y APIError.
	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// UsuarioController agrupa las operaciones administrativas sobre cuentas de usuario.
type UsuarioController struct {
	repo repository.DBRepository
}

// NewUsuarioController crea un UsuarioController con su repositorio inyectado.
func NewUsuarioController(repo repository.DBRepository) *UsuarioController {
	return &UsuarioController{repo: repo}
}

// AdminGetUsuarios lista usuarios con búsqueda por nombre o email y paginación para el admin.
func (uc *UsuarioController) AdminGetUsuarios(c *fiber.Ctx) error {
	q := c.Query("q")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	usuarios, total, err := uc.repo.ObtenerUsuarios(q, page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error interno al consultar usuarios de administración",
			Details: err.Error(),
		})
	}

	return c.JSON(models.Pagina{
		Data:  usuarios,
		Page:  page,
		Limit: limit,
		Total: total,
	})
}
