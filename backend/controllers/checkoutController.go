// Package controllers maneja la lógica de endpoints HTTP de la aplicación.
package controllers

import (
	"context"
	"fmt"
	"log"
	"math/rand"
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

// Checkout procesa la compra mediante una transacción ACID en PostgreSQL.
// Si es exitosa, dispara una Goroutine para calcular comisiones en segundo plano (Fase 4, Pasos 2-5).
func (cc *CheckoutController) Checkout(c *fiber.Ctx) error {
	var req models.CheckoutRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(models.APIError{
			Status:  400,
			Message: "Cuerpo de petición inválido",
			Details: err.Error(),
		})
	}

	// Validaciones básicas de negocio
	if req.Cliente.Nombre == "" || req.Cliente.Email == "" || len(req.Items) == 0 {
		return c.Status(400).JSON(models.APIError{
			Status:  400,
			Message: "Datos de cliente o items del carrito incompletos",
		})
	}

	if req.Total <= 0 {
		for _, it := range req.Items {
			req.Total += it.Precio * float64(it.Cantidad)
		}
	}

	// Generamos número de pedido único con prefijo MC-
	numeroPedido := fmt.Sprintf("MC-%06d", rand.Intn(1000000))

	// Paso 3: Ejecutamos la transacción ACID en PostgreSQL
	pedido, err := cc.repo.CrearPedido(c.Context(), &req, numeroPedido)
	if err != nil {
		log.Printf("[Checkout Error - ACID ROLLBACK]: %v", err)
		return c.Status(500).JSON(models.APIError{
			Status:  500,
			Message: "Error en la transacción de compra (Rollback ejecutado)",
			Details: err.Error(),
		})
	}

	// Paso 4: Lanzamos Goroutine asíncrona para actualizar comisiones de la red e invalidar caché
	go cc.procesarComisionesAsincrono(pedido.Total, req.Cliente.Email)

	// Respondemos inmediatamente al cliente sin hacerlo esperar por el cálculo de la red
	resp := models.CheckoutResponse{
		Numero:  pedido.Numero,
		Total:   pedido.Total,
		Fecha:   pedido.Fecha,
		Cliente: req.Cliente,
		Items:   req.Items,
		Mensaje: "Pedido procesado exitosamente con transacción ACID",
	}

	return c.Status(201).JSON(resp)
}

// procesarComisionesAsincrono corre en una Goroutine (concurrencia, Tema 1)
// para actualizar saldos de la red en PostgreSQL e invalidar la caché en Redis (Pasos 4 y 5).
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

	// Paso 5: Invalidamos la clave de caché en Redis para que el dashboard refleje nuevos KPIs
	if cc.cache != nil {
		claveUsuario := "red:tree:" + emailUsuario
		claveAdmin := "red:tree:admin@upse.edu.ec"
		if err := cc.cache.Del(ctx, claveUsuario, claveAdmin); err != nil {
			log.Printf("[Caché Error] Fallo al invalidar caché en Redis: %v", err)
		} else {
			log.Printf("[Caché] Claves invalidadas en Redis: %s, %s", claveUsuario, claveAdmin)
		}
	}
}
