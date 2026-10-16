// Package controllers maneja la lógica de endpoints HTTP de la aplicación.
package controllers

import (
	"context"
	"errors"
	"fmt"
	"log"
	"math/rand"
	"os"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// CheckoutController gestiona el procesamiento transaccional de pedidos y concurrencia (Fase 4).
type CheckoutController struct {
	repo  repository.DBRepository
	cache repository.CacheRepository
}

// NewCheckoutController crea un CheckoutController con sus dependencias inyectadas.
func NewCheckoutController(repo repository.DBRepository, cache repository.CacheRepository) *CheckoutController {
	return &CheckoutController{repo: repo, cache: cache}
}

// sanitizeDetails oculta detalles internos en producción y los expone solo con APP_ENV=dev.
func sanitizeDetails(err error) interface{} {
	if err == nil {
		return nil
	}
	if os.Getenv("APP_ENV") == "dev" {
		return err.Error()
	}
	return nil
}

// Checkout procesa la compra mediante una transacción ACID en PostgreSQL.
// La identidad se deriva de los claims del JWT verificado en c.Locals;
// si el cliente envía un email adulterado en el body, se sobrescribe con la identidad real del token.
func (cc *CheckoutController) Checkout(c *fiber.Ctx) error {
	var req models.CheckoutRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "Cuerpo de petición inválido",
			Details: sanitizeDetails(err),
		})
	}

	// La identidad del token prima sobre el body para impedir suplantación
	if tokenEmail, ok := c.Locals("userEmail").(string); ok && tokenEmail != "" {
		req.Cliente.Email = tokenEmail
	}

	// Derivamos usuario_id desde el claim 'sub' si existe
	var usuarioID *int
	if subStr, ok := c.Locals("sub").(string); ok && subStr != "" {
		if uid, err := strconv.Atoi(subStr); err == nil {
			usuarioID = &uid
		}
	}

	// Validaciones básicas de datos requeridos
	if req.Cliente.Nombre == "" || req.Cliente.Email == "" || len(req.Items) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "Datos de cliente o items del carrito incompletos",
		})
	}

	// Validación estricta de cantidad mayor que cero
	for _, it := range req.Items {
		if it.Cantidad <= 0 {
			return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
				Status:  fiber.StatusBadRequest,
				Message: "cantidad debe ser mayor que cero",
				Details: sanitizeDetails(fmt.Errorf("item ID %d tiene cantidad %d", it.ID, it.Cantidad)),
			})
		}
	}

	// Generamos número de pedido único con prefijo MC-
	numeroPedido := fmt.Sprintf("MC-%06d", rand.Intn(1000000))

	// Ejecutamos la transacción ACID en PostgreSQL (con FOR UPDATE y recálculo en servidor)
	pedido, err := cc.repo.CrearPedido(c.Context(), &req, numeroPedido, usuarioID)
	if err != nil {
		log.Printf("[Checkout Error - ACID ROLLBACK]: %v", err)

		if errors.Is(err, repository.ErrCantidadInvalida) {
			return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
				Status:  fiber.StatusBadRequest,
				Message: "cantidad debe ser mayor que cero",
				Details: sanitizeDetails(err),
			})
		}
		if errors.Is(err, repository.ErrStockInsuficiente) {
			return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
				Status:  fiber.StatusBadRequest,
				Message: err.Error(),
				Details: sanitizeDetails(err),
			})
		}
		if errors.Is(err, repository.ErrNoEncontrado) {
			return c.Status(fiber.StatusNotFound).JSON(models.APIError{
				Status:  fiber.StatusNotFound,
				Message: err.Error(),
				Details: sanitizeDetails(err),
			})
		}

		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error en la transacción de compra (Rollback ejecutado)",
			Details: sanitizeDetails(err),
		})
	}

	// Lanzamos Goroutine asíncrona con contexto propio independiente del request
	go cc.procesarComisionesAsincrono(pedido.Total, req.Cliente.Email)

	// Respondemos inmediatamente al cliente con el pedido confirmado
	resp := models.CheckoutResponse{
		Numero:  pedido.Numero,
		Total:   pedido.Total,
		Fecha:   pedido.Fecha,
		Cliente: req.Cliente,
		Items:   req.Items,
		Mensaje: "Pedido procesado exitosamente con transacción ACID",
	}

	return c.Status(fiber.StatusCreated).JSON(resp)
}

// procesarComisionesAsincrono corre en una Goroutine (concurrencia, Tema 1)
// para actualizar saldos de la red en PostgreSQL e invalidar la caché en Redis (productos:all y red:tree:*).
func (cc *CheckoutController) procesarComisionesAsincrono(total float64, emailUsuario string) {
	log.Printf("[Goroutine Concurrente] Iniciando cálculo asíncrono de comisiones para venta de $%.2f...", total)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Actualizamos saldos de la red multinivel en PostgreSQL
	if err := cc.repo.ActualizarComisionesReferidos(ctx, total); err != nil {
		log.Printf("[Goroutine Error] No se pudieron actualizar comisiones: %v", err)
		return
	}
	log.Printf("[Goroutine Concurrente] Comisiones y ventas de la red actualizadas con éxito en PostgreSQL")

	// Invalidamos la caché de la red y del catálogo general en Redis
	if cc.cache != nil {
		claveUsuario := "red:tree:" + emailUsuario
		claveAdmin := "red:tree:admin@upse.edu.ec"
		claveProductos := "productos:all"
		if err := cc.cache.Del(ctx, claveProductos, claveUsuario, claveAdmin); err != nil {
			log.Printf("[Caché Error] Fallo al invalidar caché en Redis: %v", err)
		} else {
			log.Printf("[Caché] Claves invalidadas en Redis: %s, %s, %s", claveProductos, claveUsuario, claveAdmin)
		}
	}
}
