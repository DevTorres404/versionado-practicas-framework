// Package controllers maneja los endpoints HTTP de pedidos y transacciones de MultiCatálogo.
package controllers

import (
	"errors"
	"fmt"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// PedidoController gestiona las consultas y ciclo de vida de pedidos.
type PedidoController struct {
	repo  repository.DBRepository
	cache repository.CacheRepository
}

// NewPedidoController inicializa el controlador con dependencias inyectadas.
func NewPedidoController(repo repository.DBRepository, cache repository.CacheRepository) *PedidoController {
	return &PedidoController{repo: repo, cache: cache}
}

// GetMisPedidos devuelve el historial paginado de pedidos del usuario autenticado.
func (pc *PedidoController) GetMisPedidos(c *fiber.Ctx) error {
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

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	pedidos, total, err := pc.repo.ObtenerPedidosUsuario(c.Context(), uid, page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al consultar historial de pedidos",
			Details: err.Error(),
		})
	}

	return c.JSON(models.Pagina{
		Data:  pedidos,
		Page:  page,
		Limit: limit,
		Total: total,
	})
}

// AdminGetPedidos devuelve todos los pedidos con filtro por estado y paginación para el admin.
func (pc *PedidoController) AdminGetPedidos(c *fiber.Ctx) error {
	estado := c.Query("estado")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	pedidos, total, err := pc.repo.ObtenerTodosPedidos(c.Context(), estado, page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al listar pedidos en administración",
			Details: err.Error(),
		})
	}

	return c.JSON(models.Pagina{
		Data:  pedidos,
		Page:  page,
		Limit: limit,
		Total: total,
	})
}

// GetPedidoByID devuelve el detalle de un pedido (cabecera + items) validando permisos de acceso.
func (pc *PedidoController) GetPedidoByID(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "ID de pedido inválido",
		})
	}

	pedido, err := pc.repo.ObtenerPedidoPorID(c.Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNoEncontrado) {
			return c.Status(fiber.StatusNotFound).JSON(models.APIError{
				Status:  fiber.StatusNotFound,
				Message: "Pedido no encontrado",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al consultar pedido",
			Details: err.Error(),
		})
	}

	// Comprobación de propiedad si el usuario no es admin
	rol, _ := c.Locals("userRol").(string)
	if rol != "admin" {
		subStr, _ := c.Locals("sub").(string)
		uid, _ := strconv.Atoi(subStr)
		userEmail, _ := c.Locals("userEmail").(string)

		esPropietario := (pedido.UsuarioID != nil && *pedido.UsuarioID == uid) ||
			(pedido.ClienteEmail != "" && pedido.ClienteEmail == userEmail)

		if !esPropietario {
			return c.Status(fiber.StatusForbidden).JSON(models.APIError{
				Status:  fiber.StatusForbidden,
				Message: "No tienes permiso para ver este pedido",
			})
		}
	}

	return c.JSON(pedido)
}

// CambiarEstadoRequest define el payload para transicionar el estado del pedido.
type CambiarEstadoRequest struct {
	Estado string `json:"estado"`
}

// CambiarEstado ejecuta la máquina de estados del pedido y revierte stock si se cancela.
func (pc *PedidoController) CambiarEstado(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "ID de pedido inválido",
		})
	}

	var req CambiarEstadoRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "Cuerpo de petición inválido",
			Details: err.Error(),
		})
	}

	if req.Estado == "" {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "El campo estado es obligatorio",
		})
	}

	pedidoActualizado, err := pc.repo.CambiarEstadoPedido(c.Context(), id, req.Estado)
	if err != nil {
		if errors.Is(err, repository.ErrTransicionInvalida) {
			return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
				Status:  fiber.StatusBadRequest,
				Message: fmt.Sprintf("Transición inválida: %v", err),
			})
		}
		if errors.Is(err, repository.ErrNoEncontrado) {
			return c.Status(fiber.StatusNotFound).JSON(models.APIError{
				Status:  fiber.StatusNotFound,
				Message: "Pedido no encontrado",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al actualizar estado del pedido",
			Details: err.Error(),
		})
	}

	// Si se canceló el pedido, se devolvió stock en PostgreSQL; invalidamos catálogo en Redis
	if req.Estado == "cancelado" && pc.cache != nil {
		_ = pc.cache.Del(c.Context(), "productos:all")
	}

	return c.JSON(pedidoActualizado)
}
