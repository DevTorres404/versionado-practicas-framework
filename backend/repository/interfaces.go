// Package repository define las interfaces y la implementación del acceso a datos (Fase 4).
package repository

import (
	"context"
	"time"

	"multicatalogo-backend/models"
)

// DBRepository define el contrato para desacoplar el acceso a PostgreSQL mediante Inyección de Dependencias.
type DBRepository interface {
	BuscarUsuarioPorCredenciales(email, password string) (*models.Usuario, error)
	ObtenerProductos() ([]models.Producto, error)
	ObtenerProductoPorID(id int) (*models.Producto, error)
	ObtenerRed() (*models.Referido, error)
	CrearPedido(ctx context.Context, req *models.CheckoutRequest, numeroPedido string) (*models.Pedido, error)
	ActualizarComisionesReferidos(ctx context.Context, total float64) error
}

// CacheRepository define el contrato para desacoplar el almacenamiento en caché mediante Inyección de Dependencias.
type CacheRepository interface {
	Get(ctx context.Context, key string) (string, error)
	Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error
	Del(ctx context.Context, keys ...string) error
}
