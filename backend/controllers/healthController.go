package controllers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
	"multicatalogo-backend/repository"
)

// HealthController responde sobre el estado de salud de la API y sus dependencias.
type HealthController struct {
	db    repository.DBRepository
	cache repository.CacheRepository
}

// NewHealthController inicializa el controlador con las dependencias de persistencia y caché.
func NewHealthController(db repository.DBRepository, cache repository.CacheRepository) *HealthController {
	return &HealthController{
		db:    db,
		cache: cache,
	}
}

// HealthCheck verifica la conectividad con PostgreSQL y Redis:
// Si PostgreSQL cae -> responde 503 Service Unavailable ("unhealthy").
// Si Redis cae -> responde 200 con estado "degraded" (fail-soft).
// Si ambos están activos -> responde 200 con estado "ok".
func (hc *HealthController) HealthCheck(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(c.Context(), 3*time.Second)
	defer cancel()

	dbStatus := "ok"
	if hc.db != nil {
		if err := hc.db.Ping(ctx); err != nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"status":   "unhealthy",
				"database": "down",
				"redis":    "unknown",
				"error":    err.Error(),
			})
		}
	}

	redisStatus := "ok"
	status := "ok"
	if hc.cache != nil {
		if err := hc.cache.Ping(ctx); err != nil {
			redisStatus = "down"
			status = "degraded"
		}
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"status":   status,
		"database": dbStatus,
		"redis":    redisStatus,
	})
}
