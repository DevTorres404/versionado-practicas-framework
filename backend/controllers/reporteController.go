// Package controllers provee los endpoints analíticos de MultiCatálogo.
package controllers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// ReporteController provee indicadores de negocio y métricas consolidadas.
type ReporteController struct {
	repo repository.DBRepository
}

// NewReporteController inicializa el controlador de reportes analíticos.
func NewReporteController(repo repository.DBRepository) *ReporteController {
	return &ReporteController{repo: repo}
}

// GetResumen calcula y devuelve los KPIs globales de ventas y comisiones (Admin).
func (rc *ReporteController) GetResumen(c *fiber.Ctx) error {
	desde := c.Query("desde")
	hasta := c.Query("hasta")

	resumen, err := rc.repo.ObtenerReporteResumen(c.Context(), desde, hasta)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al consolidar indicadores de resumen",
			Details: err.Error(),
		})
	}

	return c.JSON(resumen)
}

// GetTopProductos entrega el ranking de los productos con mayor facturación (Admin).
func (rc *ReporteController) GetTopProductos(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "5"))

	top, err := rc.repo.ObtenerTopProductos(c.Context(), limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al calcular top productos",
			Details: err.Error(),
		})
	}

	return c.JSON(top)
}

// GetTopReferidos entrega el ranking de distribuidores con mayor volumen de red (Admin).
func (rc *ReporteController) GetTopReferidos(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "5"))

	top, err := rc.repo.ObtenerTopReferidos(c.Context(), limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al calcular top referidos",
			Details: err.Error(),
		})
	}

	return c.JSON(top)
}
