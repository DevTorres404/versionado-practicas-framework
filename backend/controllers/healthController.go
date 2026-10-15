package controllers

import "github.com/gofiber/fiber/v2"

// HealthController responde sobre el estado de salud de la API.
type HealthController struct{}

// NewHealthController inicializa el controlador de health check.
func NewHealthController() *HealthController {
	return &HealthController{}
}

// HealthCheck devuelve el estado operativo del servidor.
func (hc *HealthController) HealthCheck(c *fiber.Ctx) error {
	return c.Status(200).JSON(fiber.Map{
		"status":  "ok",
		"message": "Servidor Go/Fiber operativo",
	})
}
