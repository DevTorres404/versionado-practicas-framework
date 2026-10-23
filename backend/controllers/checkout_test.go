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
	"golang.org/x/crypto/bcrypt"
	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// MockDBRepository simula la persistencia para pruebas unitarias
type MockDBRepository struct {
	crearPedidoFn func(ctx context.Context, req *models.CheckoutRequest, numeroPedido string, usuarioID *int) (*models.Pedido, error)
	actualizarFn  func(ctx context.Context, total float64) error
	pingFn        func(ctx context.Context) error
}

func (m *MockDBRepository) BuscarUsuarioPorEmail(email string) (*models.Usuario, error) {
	if email == "admin@upse.edu.ec" {
		hash, _ := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.DefaultCost)
		refID := 0
		return &models.Usuario{
			ID:         1,
			Email:      "admin@upse.edu.ec",
			Password:   string(hash),
			Rol:        "admin",
			Activo:     true,
			ReferidoID: &refID,
		}, nil
	}
	return nil, repository.ErrNoEncontrado
}

func (m *MockDBRepository) BuscarUsuarioPorID(id int) (*models.Usuario, error) {
	return m.BuscarUsuarioPorEmail("admin@upse.edu.ec")
}

func (m *MockDBRepository) BuscarUsuarioPorCredenciales(email, password string) (*models.Usuario, error) {
	user, err := m.BuscarUsuarioPorEmail(email)
	if err != nil {
		return nil, err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		return nil, errors.New("credenciales incorrectas")
	}
	return user, nil
}

func (m *MockDBRepository) RegistrarUsuario(ctx context.Context, req *models.RegisterRequest) (*models.Usuario, error) {
	refID := 10
	return &models.Usuario{
		ID:         10,
		Nombre:     req.Nombre,
		Email:      req.Email,
		Rol:        "cliente",
		Activo:     true,
		ReferidoID: &refID,
	}, nil
}

func (m *MockDBRepository) ObtenerProductos(soloActivos bool, q string, page, limit int) ([]models.Producto, int, error) {
	return nil, 0, nil
}

func (m *MockDBRepository) ObtenerUsuarios(q string, page, limit int) ([]models.UsuarioAdmin, int, error) {
	usuarios := []models.UsuarioAdmin{
		{
			ID:         1,
			Nombre:     "Wilter Villón",
			Email:      "admin@upse.edu.ec",
			Rol:        "admin",
			Activo:     true,
			NodoNombre: "Tú",
			Nivel:      0,
			Ventas:     5400,
			Pedidos:    5,
		},
	}
	return usuarios, len(usuarios), nil
}

func (m *MockDBRepository) ObtenerProductoPorID(id int) (*models.Producto, error) {
	return nil, nil
}

func (m *MockDBRepository) CrearProducto(ctx context.Context, p *models.Producto) (*models.Producto, error) {
	p.ID = 99
	return p, nil
}

func (m *MockDBRepository) ActualizarProducto(ctx context.Context, id int, p *models.Producto) (*models.Producto, error) {
	p.ID = id
	return p, nil
}

func (m *MockDBRepository) DesactivarProducto(ctx context.Context, id int) error {
	return nil
}

func (m *MockDBRepository) ObtenerRed() (*models.Referido, error) {
	return nil, nil
}

func (m *MockDBRepository) ObtenerRedDeUsuario(referidoID int) (*models.Referido, error) {
	return nil, nil
}

func (m *MockDBRepository) BuscarReferidoPorCodigo(codigo string) (*models.Referido, error) {
	return nil, nil
}

func (m *MockDBRepository) CrearPedido(ctx context.Context, req *models.CheckoutRequest, numeroPedido string, usuarioID *int) (*models.Pedido, error) {
	if m.crearPedidoFn != nil {
		return m.crearPedidoFn(ctx, req, numeroPedido, usuarioID)
	}
	return &models.Pedido{
		ID:            1,
		Numero:        numeroPedido,
		UsuarioID:     usuarioID,
		ClienteEmail:  req.Cliente.Email,
		ClienteNombre: req.Cliente.Nombre,
		Total:         req.Total,
		Fecha:         "2026-10-15 09:00:00",
	}, nil
}

func (m *MockDBRepository) ObtenerPedidosUsuario(ctx context.Context, usuarioID int, page, limit int) ([]models.Pedido, int, error) {
	return nil, 0, nil
}

func (m *MockDBRepository) ObtenerTodosPedidos(ctx context.Context, estado string, page, limit int) ([]models.Pedido, int, error) {
	return nil, 0, nil
}

func (m *MockDBRepository) ObtenerPedidoPorID(ctx context.Context, id int) (*models.Pedido, error) {
	return nil, nil
}

func (m *MockDBRepository) CambiarEstadoPedido(ctx context.Context, id int, nuevoEstado string) (*models.Pedido, error) {
	return nil, nil
}

func (m *MockDBRepository) ActualizarComisionesReferidos(ctx context.Context, total float64) error {
	if m.actualizarFn != nil {
		return m.actualizarFn(ctx, total)
	}
	return nil
}

func (m *MockDBRepository) ObtenerComisionesUsuario(ctx context.Context, referidoID int) ([]models.Comision, float64, float64, error) {
	return nil, 0, 0, nil
}

func (m *MockDBRepository) CrearLiquidacion(ctx context.Context, referidoID int) (*models.Liquidacion, error) {
	return nil, nil
}

func (m *MockDBRepository) ObtenerLiquidaciones(ctx context.Context) ([]models.Liquidacion, error) {
	return nil, nil
}

func (m *MockDBRepository) ObtenerLiquidacionesUsuario(ctx context.Context, referidoID int) ([]models.Liquidacion, error) {
	return nil, nil
}

func (m *MockDBRepository) ObtenerReporteResumen(ctx context.Context, desde, hasta string) (*models.ReporteResumen, error) {
	return &models.ReporteResumen{}, nil
}

func (m *MockDBRepository) ObtenerTopProductos(ctx context.Context, limit int) ([]models.TopProducto, error) {
	return nil, nil
}

func (m *MockDBRepository) ObtenerTopReferidos(ctx context.Context, limit int) ([]models.TopReferido, error) {
	return nil, nil
}

func (m *MockDBRepository) Ping(ctx context.Context) error {
	if m.pingFn != nil {
		return m.pingFn(ctx)
	}
	return nil
}

// MockCacheRepository simula el almacenamiento en caché
type MockCacheRepository struct {
	delCalled bool
	pingFn    func(ctx context.Context) error
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
func (m *MockCacheRepository) Ping(ctx context.Context) error {
	if m.pingFn != nil {
		return m.pingFn(ctx)
	}
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

func TestCheckoutIdentidadPorTokenSobrescribeEmailFalso(t *testing.T) {
	app := fiber.New()
	mockRepo := &MockDBRepository{}
	mockCache := &MockCacheRepository{}

	ctrl := NewCheckoutController(mockRepo, mockCache)
	// Simulamos middleware que inyecta el email verificado del token
	app.Post("/api/checkout", func(c *fiber.Ctx) error {
		c.Locals("userEmail", "token_real@upse.edu.ec")
		return c.Next()
	}, ctrl.Checkout)

	reqPayload := models.CheckoutRequest{
		Cliente: models.ClienteCheckout{
			Nombre: "Atacante",
			Email:  "suplantador@fake.com", // Email fraudulento en body
		},
		MetodoPago: "Efectivo",
		Items: []models.ItemCheckout{
			{ID: 1, Nombre: "Serum", Precio: 45.0, Cantidad: 1},
		},
	}

	body, _ := json.Marshal(reqPayload)
	req := httptest.NewRequest("POST", "/api/checkout", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}

	if resp.StatusCode != fiber.StatusCreated {
		t.Fatalf("status = %d, want %d", resp.StatusCode, fiber.StatusCreated)
	}

	var resData models.CheckoutResponse
	if err := json.NewDecoder(resp.Body).Decode(&resData); err != nil {
		t.Fatalf("decode response error: %v", err)
	}

	if resData.Cliente.Email != "token_real@upse.edu.ec" {
		t.Errorf("email persistido = %s, want token_real@upse.edu.ec", resData.Cliente.Email)
	}
}

func TestCheckoutCantidadInvalida(t *testing.T) {
	app := fiber.New()
	ctrl := NewCheckoutController(&MockDBRepository{}, &MockCacheRepository{})
	app.Post("/api/checkout", ctrl.Checkout)

	reqPayload := models.CheckoutRequest{
		Cliente: models.ClienteCheckout{Nombre: "Test", Email: "test@upse.edu.ec"},
		Items: []models.ItemCheckout{
			{ID: 1, Nombre: "Serum", Precio: 45.0, Cantidad: 0}, // Cantidad inválida
		},
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
		crearPedidoFn: func(ctx context.Context, req *models.CheckoutRequest, numeroPedido string, usuarioID *int) (*models.Pedido, error) {
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

func TestHealthCheck(t *testing.T) {
	app := fiber.New()
	mockRepo := &MockDBRepository{}
	mockCache := &MockCacheRepository{}

	healthCtrl := NewHealthController(mockRepo, mockCache)
	app.Get("/api/health", healthCtrl.HealthCheck)

	// Caso 1: Todo saludable
	req := httptest.NewRequest("GET", "/api/health", nil)
	resp, _ := app.Test(req)
	if resp.StatusCode != fiber.StatusOK {
		t.Errorf("healthy status = %d, want %d", resp.StatusCode, fiber.StatusOK)
	}

	// Caso 2: PostgreSQL caído -> 503
	mockRepo.pingFn = func(ctx context.Context) error { return errors.New("pg down") }
	resp, _ = app.Test(req)
	if resp.StatusCode != fiber.StatusServiceUnavailable {
		t.Errorf("db down status = %d, want %d", resp.StatusCode, fiber.StatusServiceUnavailable)
	}

	// Caso 3: PostgreSQL activo pero Redis caído -> 200 degraded
	mockRepo.pingFn = nil
	mockCache.pingFn = func(ctx context.Context) error { return errors.New("redis down") }
	resp, _ = app.Test(req)
	if resp.StatusCode != fiber.StatusOK {
		t.Errorf("redis down status = %d, want %d", resp.StatusCode, fiber.StatusOK)
	}
}
