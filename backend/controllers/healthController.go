package controllers

import "github.com/gofiber/fiber/v2"

// HealthCheck devuelve el estado operativo del servidor.
func HealthCheck(c *fiber.Ctx) error {
	return c.Status(200).JSON(fiber.Map{
		"status":  "ok",
		"message": "Servidor Go/Fiber operativo",
	})
}
