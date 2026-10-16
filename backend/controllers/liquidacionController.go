// Package controllers maneja los endpoints de liquidaciones para MultiCatálogo.
package controllers

import (
	"errors"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// LiquidacionController gestiona la aprobación y consulta de pagos a distribuidores.
type LiquidacionController struct {
	repo repository.DBRepository
}

// NewLiquidacionController inicializa el controlador de liquidaciones.
func NewLiquidacionController(repo repository.DBRepository) *LiquidacionController {
	return &LiquidacionController{repo: repo}
}

// CrearLiquidacion procesa y liquida las comisiones pendientes de un distribuidor (Admin).
func (lc *LiquidacionController) CrearLiquidacion(c *fiber.Ctx) error {
	var req models.LiquidacionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "Cuerpo de petición inválido",
			Details: err.Error(),
		})
	}

	if req.ReferidoID <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "El campo referido_id debe ser un entero positivo",
		})
	}

	liq, err := lc.repo.CrearLiquidacion(c.Context(), req.ReferidoID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(liq)
}

// GetLiquidaciones lista todo el historial de liquidaciones generadas en la plataforma (Admin).
func (lc *LiquidacionController) GetLiquidaciones(c *fiber.Ctx) error {
	list, err := lc.repo.ObtenerLiquidaciones(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al consultar liquidaciones",
			Details: err.Error(),
		})
	}

	return c.JSON(list)
}

// GetMisLiquidaciones lista los desembolsos recibidos por el distribuidor autenticado.
func (lc *LiquidacionController) GetMisLiquidaciones(c *fiber.Ctx) error {
	subStr, _ := c.Locals("sub").(string)
	if subStr == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(models.APIError{
			Status:  fiber.StatusUnauthorized,
			Message: "Identidad de usuario no verificada",
		})
	}

	uid, err := strconv.Atoi(subStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "Identificador de usuario inválido",
		})
	}

	usuario, err := lc.repo.BuscarUsuarioPorID(uid)
	if err != nil {
		if errors.Is(err, repository.ErrNoEncontrado) {
			return c.Status(fiber.StatusNotFound).JSON(models.APIError{
				Status:  fiber.StatusNotFound,
				Message: "Usuario no encontrado",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al buscar usuario",
			Details: err.Error(),
		})
	}

	if usuario.ReferidoID == nil {
		return c.JSON([]models.Liquidacion{})
	}

	list, err := lc.repo.ObtenerLiquidacionesUsuario(c.Context(), *usuario.ReferidoID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al consultar liquidaciones del distribuidor",
			Details: err.Error(),
		})
	}

	return c.JSON(list)
}
