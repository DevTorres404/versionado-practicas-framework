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

// obtenerRepositorio recupera el repositorio que routes.SetupRoutes inyecta
// en los locals de la petición. Así las funciones conservan su firma original
// (c *fiber.Ctx) error sin usar variables de paquete.
func obtenerRepositorio(c *fiber.Ctx) (*repository.Repository, error) {
	repo, ok := c.Locals("repository").(*repository.Repository)
	if !ok || repo == nil {
		return nil, c.Status(500).JSON(models.APIError{
			Status:  500,
			Message: "Repositorio de datos no configurado",
		})
	}
	return repo, nil
}

// Login es la función controladora que se ejecutará cuando el cliente envíe sus credenciales.
func Login(c *fiber.Ctx) error {
	// Creamos una variable 'req' del tipo LoginRequest (ubicada en nuestro paquete models) para almacenar los datos.
	var req models.LoginRequest

	// Intentamos parsear (transformar) el cuerpo JSON entrante y guardarlo en la variable 'req'.
	if err := c.BodyParser(&req); err != nil {
		// Si ocurre un error al parsear (ej. JSON mal formado), retornamos un estado HTTP 400 (Bad Request).
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

	// Obtenemos el repositorio inyectado (capa de acceso a datos sobre PostgreSQL).
	repo, err := obtenerRepositorio(c)
	if err != nil {
		return err
	}

	// Buscamos el usuario en la tabla `usuarios`; si no coincide ninguna fila
	// (sql.ErrNoRows) devolvemos exactamente el mismo 401 de siempre.
	usuario, err := repo.BuscarUsuarioPorCredenciales(req.Email, req.Password)
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
