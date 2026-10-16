package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"multicatalogo-backend/models"
)

// JWTClaims define la estructura de claims del token JWT emitido por la API.
type JWTClaims struct {
	Sub   string `json:"sub"`
	Email string `json:"email"`
	Rol   string `json:"rol"`
	jwt.RegisteredClaims
}

// RequireAuth valida la cabecera Authorization: Bearer <token> mediante HMAC-SHA256
// e inyecta la identidad en c.Locals para que los controladores no dependan del body.
func RequireAuth(secret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			return c.Status(fiber.StatusUnauthorized).JSON(models.APIError{
				Status:  fiber.StatusUnauthorized,
				Message: "Token de autenticación requerido",
			})
		}

		tokenStr := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
		claims := &JWTClaims{}

		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fiber.ErrUnauthorized
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(models.APIError{
				Status:  fiber.StatusUnauthorized,
				Message: "Token inválido o expirado",
			})
		}

		c.Locals("userClaims", claims)
		c.Locals("userEmail", claims.Email)
		c.Locals("userRol", claims.Rol)
		c.Locals("sub", claims.Sub)

		return c.Next()
	}
}

// RequireAdmin exige que el usuario autenticado tenga rol 'admin'.
func RequireAdmin() fiber.Handler {
	return func(c *fiber.Ctx) error {
		rol, _ := c.Locals("userRol").(string)
		if rol != "admin" {
			return c.Status(fiber.StatusForbidden).JSON(models.APIError{
				Status:  fiber.StatusForbidden,
				Message: "Acceso denegado: se requieren permisos de administrador",
			})
		}
		return c.Next()
	}
}
