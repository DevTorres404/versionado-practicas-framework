// Declaramos el paquete controllers para agrupar las funciones que manejan la lógica de negocio de las rutas.
package controllers

import (
	// Importamos 'database/sql' y 'errors' para detectar credenciales inexistentes (sql.ErrNoRows).
	"database/sql"
	"errors"

	// Importamos el framework Fiber para tener acceso al contexto (c *fiber.Ctx) de la petición HTTP.
	"github.com/gofiber/fiber/v2"
	// Importamos nuestro paquete de modelos para poder usar la estructura LoginRequest.
	"multicatalogo-backend/models"
	// Importamos el repositorio para leer los usuarios desde PostgreSQL.
	"multicatalogo-backend/repository"
)

// AuthController maneja la autenticación mediante Inyección de Dependencias (Fase 4).
type AuthController struct {
	repo repository.DBRepository
}

// NewAuthController crea un AuthController con su repositorio PostgreSQL inyectado.
func NewAuthController(repo repository.DBRepository) *AuthController {
	return &AuthController{repo: repo}
}

// Login es la función controladora que se ejecutará cuando el cliente envíe sus credenciales.
func (ac *AuthController) Login(c *fiber.Ctx) error {
	// Creamos una variable 'req' del tipo LoginRequest para almacenar los datos.
	var req models.LoginRequest

	// Intentamos parsear el cuerpo JSON entrante
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(models.APIError{
			Status:  400,
			Message: "Cuerpo de petición inválido",
			Details: err.Error(),
		})
	}

	// Validamos explícitamente que los campos Email y Password no vengan vacíos
	if req.Email == "" || req.Password == "" {
		return c.Status(400).JSON(models.APIError{
			Status:  400,
			Message: "Email y Password son obligatorios",
		})
	}

	// Buscamos el usuario en la tabla `usuarios` usando la dependencia inyectada
	usuario, err := ac.repo.BuscarUsuarioPorCredenciales(req.Email, req.Password)
	if errors.Is(err, sql.ErrNoRows) {
		return c.Status(401).JSON(models.APIError{
			Status:  401,
			Message: "Credenciales incorrectas",
		})
	}
	if err != nil {
		return c.Status(500).JSON(models.APIError{
			Status:  500,
			Message: "Error interno al consultar las credenciales",
			Details: err.Error(),
		})
	}

	// Los tokens ficticios se mantienen por rol, igual que en la Fase 1:
	// admin → fake-jwt-token-123, cliente → fake-jwt-token-456.
	token := "fake-jwt-token-456"
	if usuario.Rol == "admin" {
		token = "fake-jwt-token-123"
	}

	return c.JSON(fiber.Map{"token": token, "email": req.Email, "rol": usuario.Rol})
}
