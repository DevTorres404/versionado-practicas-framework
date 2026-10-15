package controllers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"multicatalogo-backend/models"
)

// MockDBRepository simula la persistencia para pruebas unitarias
type MockDBRepository struct {
	crearPedidoFn func(ctx context.Context, req *models.CheckoutRequest, numeroPedido string) (*models.Pedido, error)
	actualizarFn  func(ctx context.Context, total float64) error
}

func (m *MockDBRepository) BuscarUsuarioPorCredenciales(email, password string) (*models.Usuario, error) {
	return nil, nil
}
func (m *MockDBRepository) ObtenerProductos() ([]models.Producto, error) {
	return nil, nil
}
func (m *MockDBRepository) ObtenerProductoPorID(id int) (*models.Producto, error) {
	return nil, nil
}
func (m *MockDBRepository) ObtenerRed() (*models.Referido, error) {
	return nil, nil
}
func (m *MockDBRepository) CrearPedido(ctx context.Context, req *models.CheckoutRequest, numeroPedido string) (*models.Pedido, error) {
	if m.crearPedidoFn != nil {
		return m.crearPedidoFn(ctx, req, numeroPedido)
	}
	return &models.Pedido{
		ID:     1,
		Numero: numeroPedido,
		Total:  req.Total,
		Fecha:  "2026-10-15 09:00:00",
	}, nil
}
func (m *MockDBRepository) ActualizarComisionesReferidos(ctx context.Context, total float64) error {
	if m.actualizarFn != nil {
		return m.actualizarFn(ctx, total)
	}
	return nil
}

// MockCacheRepository simula el almacenamiento en caché
type MockCacheRepository struct {
	delCalled bool
}

func (m *MockCacheRepository) Get(ctx context.Context, key string) (string, error) {
	return "", nil
}
func (m *MockCacheRepository) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	return nil
}
func (m *MockCacheRepository) Del(ctx context.Context, keys ...string) error {
	m.delCalled = true
	return nil
}

func TestCheckoutExitoso(t *testing.T) {
	app := fiber.New()
	mockRepo := &MockDBRepository{}
	mockCache := &MockCacheRepository{}

	ctrl := NewCheckoutController(mockRepo, mockCache)
	app.Post("/api/checkout", ctrl.Checkout)

	reqPayload := models.CheckoutRequest{
		Cliente: models.ClienteCheckout{
			Nombre:    "Damian Torres",
			Email:     "damian@upse.edu.ec",
			Direccion: "Av. Principal 123",
			Ciudad:    "La Libertad",
			Telefono:  "0991234567",
		},
		MetodoPago: "Tarjeta de crédito",
		Items: []models.ItemCheckout{
			{ID: 1, Nombre: "Serum Revitalizante", Precio: 45.0, Cantidad: 1},
		},
		Total: 45.0,
	}

	body, _ := json.Marshal(reqPayload)
	req := httptest.NewRequest("POST", "/api/checkout", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}

	if resp.StatusCode != fiber.StatusCreated {
		t.Errorf("status = %d, want %d", resp.StatusCode, fiber.StatusCreated)
	}

	var resData models.CheckoutResponse
	if err := json.NewDecoder(resp.Body).Decode(&resData); err != nil {
		t.Fatalf("decode response error: %v", err)
	}

	if resData.Total != 45.0 {
		t.Errorf("total = %f, want 45.0", resData.Total)
	}
}

func TestCheckoutValidacionFalla(t *testing.T) {
	app := fiber.New()
	ctrl := NewCheckoutController(&MockDBRepository{}, &MockCacheRepository{})
	app.Post("/api/checkout", ctrl.Checkout)

	// Petición con items vacíos
	reqPayload := models.CheckoutRequest{
		Cliente: models.ClienteCheckout{Nombre: "Test", Email: "test@upse.edu.ec"},
		Items:   []models.ItemCheckout{},
	}

	body, _ := json.Marshal(reqPayload)
	req := httptest.NewRequest("POST", "/api/checkout", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}

	if resp.StatusCode != fiber.StatusBadRequest {
		t.Errorf("status = %d, want %d", resp.StatusCode, fiber.StatusBadRequest)
	}
}

func TestCheckoutRollbackEnFalla(t *testing.T) {
	app := fiber.New()
	mockRepo := &MockDBRepository{
		crearPedidoFn: func(ctx context.Context, req *models.CheckoutRequest, numeroPedido string) (*models.Pedido, error) {
			return nil, errors.New("falla simulada: rollback ejecutado")
		},
	}
	ctrl := NewCheckoutController(mockRepo, &MockCacheRepository{})
	app.Post("/api/checkout", ctrl.Checkout)

	reqPayload := models.CheckoutRequest{
		Cliente: models.ClienteCheckout{Nombre: "Test", Email: "test@upse.edu.ec"},
		Items:   []models.ItemCheckout{{ID: 99999, Nombre: "Inexistente", Precio: 10, Cantidad: 1}},
		Total:   10.0,
	}

	body, _ := json.Marshal(reqPayload)
	req := httptest.NewRequest("POST", "/api/checkout", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}

	if resp.StatusCode != fiber.StatusInternalServerError {
		t.Errorf("status = %d, want %d", resp.StatusCode, fiber.StatusInternalServerError)
	}
}
