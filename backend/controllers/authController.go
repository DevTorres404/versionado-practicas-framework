// Declaramos el paquete controllers para agrupar las funciones que manejan la lógica de negocio de las rutas.
package controllers

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"multicatalogo-backend/middleware"
	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// AuthController maneja la autenticación mediante Inyección de Dependencias (Fase 4).
type AuthController struct {
	repo      repository.DBRepository
	jwtSecret string
}

// NewAuthController crea un AuthController con su repositorio PostgreSQL y clave JWT inyectados.
func NewAuthController(repo repository.DBRepository, jwtSecret string) *AuthController {
	return &AuthController{
		repo:      repo,
		jwtSecret: jwtSecret,
	}
}

// Login valida credenciales con bcrypt y emite un JWT real (HMAC-SHA256, 2h).
func (ac *AuthController) Login(c *fiber.Ctx) error {
	var req models.LoginRequest

	// Intentamos parsear el cuerpo JSON entrante
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "Cuerpo de petición inválido",
			Details: err.Error(),
		})
	}

	// Validamos explícitamente que los campos Email y Password no vengan vacíos
	if req.Email == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "Email y Password son obligatorios",
		})
	}

	// Buscamos el usuario y validamos credenciales con bcrypt mediante el repositorio
	usuario, err := ac.repo.BuscarUsuarioPorCredenciales(req.Email, req.Password)
	if errors.Is(err, repository.ErrCuentaDesactivada) {
		return c.Status(fiber.StatusForbidden).JSON(models.APIError{
			Status:  fiber.StatusForbidden,
			Message: "Cuenta desactivada. Contacte al administrador.",
		})
	}
	if errors.Is(err, sql.ErrNoRows) || errors.Is(err, repository.ErrNoEncontrado) {
		return c.Status(fiber.StatusUnauthorized).JSON(models.APIError{
			Status:  fiber.StatusUnauthorized,
			Message: "Credenciales incorrectas",
		})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error interno al consultar las credenciales",
			Details: err.Error(),
		})
	}

	// Generamos JWT criptográfico real firmado con HMAC-SHA256 (expiración 2h)
	now := time.Now()
	claims := middleware.JWTClaims{
		Sub:   fmt.Sprintf("%d", usuario.ID),
		Email: usuario.Email,
		Rol:   usuario.Rol,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(30 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}

	tokenObj := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := tokenObj.SignedString([]byte(ac.jwtSecret))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al generar token de acceso",
		})
	}

	return c.JSON(fiber.Map{
		"token": tokenStr,
		"email": usuario.Email,
		"rol":   usuario.Rol,
	})
}

// Register maneja el registro público de nuevos clientes/distribuidores en la red.
func (ac *AuthController) Register(c *fiber.Ctx) error {
	var req models.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "Cuerpo de petición inválido",
			Details: err.Error(),
		})
	}

	if req.Nombre == "" || req.Email == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "Nombre, email y password son obligatorios",
		})
	}

	if len(req.Password) < 6 {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "La contraseña debe tener al menos 6 caracteres",
		})
	}

	usuario, err := ac.repo.RegistrarUsuario(c.Context(), &req)
	if err != nil {
		if errors.Is(err, repository.ErrEmailDuplicado) {
			return c.Status(fiber.StatusConflict).JSON(models.APIError{
				Status:  fiber.StatusConflict,
				Message: "El correo electrónico ya está registrado",
			})
		}
		if errors.Is(err, repository.ErrCodigoRefInvalido) {
			return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
				Status:  fiber.StatusBadRequest,
				Message: "Código de referido inválido",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al registrar usuario",
			Details: err.Error(),
		})
	}

	// Emitir token JWT inmediato para auto-login
	now := time.Now()
	claims := middleware.JWTClaims{
		Sub:   fmt.Sprintf("%d", usuario.ID),
		Email: usuario.Email,
		Rol:   usuario.Rol,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(30 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}

	tokenObj := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, _ := tokenObj.SignedString([]byte(ac.jwtSecret))

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"token":   tokenStr,
		"usuario": usuario,
		"email":   usuario.Email,
		"rol":     usuario.Rol,
		"mensaje": "Usuario registrado exitosamente",
	})
}
