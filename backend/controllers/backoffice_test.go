package controllers

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"multicatalogo-backend/models"
)

func TestAuthRegisterExitoso(t *testing.T) {
	app := fiber.New()
	mockRepo := &MockDBRepository{}
	authCtrl := NewAuthController(mockRepo, "test-secret")
	app.Post("/api/register", authCtrl.Register)

	payload := models.RegisterRequest{
		Nombre:   "Nuevo Distribuidor",
		Email:    "nuevo@upse.edu.ec",
		Password: "password123",
		Ref:      "TU",
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("POST", "/api/register", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}

	if resp.StatusCode != fiber.StatusCreated {
		t.Errorf("status = %d, want %d", resp.StatusCode, fiber.StatusCreated)
	}

	var resMap map[string]interface{}
	_ = json.NewDecoder(resp.Body).Decode(&resMap)
	if resMap["token"] == nil || resMap["token"] == "" {
		t.Errorf("expected token in register response")
	}
}

func TestAuthRegisterValidaciones(t *testing.T) {
	app := fiber.New()
	mockRepo := &MockDBRepository{}
	authCtrl := NewAuthController(mockRepo, "test-secret")
	app.Post("/api/register", authCtrl.Register)

	// Contraseña corta
	payload := models.RegisterRequest{
		Nombre:   "Corto",
		Email:    "corto@upse.edu.ec",
		Password: "123",
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("POST", "/api/register", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, _ := app.Test(req)
	if resp.StatusCode != fiber.StatusBadRequest {
		t.Errorf("status = %d, want 400", resp.StatusCode)
	}
}

func TestAdminProductosCRUD(t *testing.T) {
	app := fiber.New()
	mockRepo := &MockDBRepository{}
	mockCache := &MockCacheRepository{}
	prodCtrl := NewProdController(mockRepo, mockCache)

	app.Get("/api/admin/productos", prodCtrl.AdminGetProductos)
	app.Post("/api/productos", prodCtrl.CrearProducto)
	app.Put("/api/productos/:id", prodCtrl.ActualizarProducto)
	app.Delete("/api/productos/:id", prodCtrl.DesactivarProducto)

	// 1. Crear producto exitoso
	prodPayload := models.Producto{
		Nombre:    "Crema Antiedad",
		Categoria: "Cuidado Facial",
		Precio:    35.50,
		Stock:     20,
	}
	body, _ := json.Marshal(prodPayload)
	req := httptest.NewRequest("POST", "/api/productos", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, _ := app.Test(req)
	if resp.StatusCode != fiber.StatusCreated {
		t.Errorf("create product status = %d, want 201", resp.StatusCode)
	}
	if !mockCache.delCalled {
		t.Errorf("expected cache invalidation after creating product")
	}

	// 2. Admin listar productos (paginado)
	reqList := httptest.NewRequest("GET", "/api/admin/productos?page=1&limit=10", nil)
	respList, _ := app.Test(reqList)
	if respList.StatusCode != fiber.StatusOK {
		t.Errorf("admin get productos status = %d, want 200", respList.StatusCode)
	}

	// 3. Desactivar producto
	reqDel := httptest.NewRequest("DELETE", "/api/productos/99", nil)
	respDel, _ := app.Test(reqDel)
	if respDel.StatusCode != fiber.StatusOK {
		t.Errorf("delete product status = %d, want 200", respDel.StatusCode)
	}
}

func TestAdminUsuarios(t *testing.T) {
	app := fiber.New()
	mockRepo := &MockDBRepository{}
	userCtrl := NewUsuarioController(mockRepo)

	app.Get("/api/admin/usuarios", userCtrl.AdminGetUsuarios)

	req := httptest.NewRequest("GET", "/api/admin/usuarios?page=1&limit=10", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}

	if resp.StatusCode != fiber.StatusOK {
		t.Errorf("admin get usuarios status = %d, want %d", resp.StatusCode, fiber.StatusOK)
	}

	var resMap map[string]interface{}
	_ = json.NewDecoder(resp.Body).Decode(&resMap)
	if resMap["data"] == nil {
		t.Errorf("expected data in usuarios response")
	}
	if resMap["total"] == nil {
		t.Errorf("expected total in usuarios response")
	}
}

func TestPedidoTransicionesEstado(t *testing.T) {
	app := fiber.New()
	mockRepo := &MockDBRepository{}
	mockCache := &MockCacheRepository{}
	pedidoCtrl := NewPedidoController(mockRepo, mockCache)

	app.Patch("/api/pedidos/:id/estado", pedidoCtrl.CambiarEstado)

	// Transición válida
	body, _ := json.Marshal(map[string]string{"estado": "preparando"})
	req := httptest.NewRequest("PATCH", "/api/pedidos/1/estado", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, _ := app.Test(req)
	if resp.StatusCode != fiber.StatusOK {
		t.Errorf("patch estado status = %d, want 200", resp.StatusCode)
	}

	// Transición cancelada invalida caché de productos
	mockCache.delCalled = false
	bodyCancel, _ := json.Marshal(map[string]string{"estado": "cancelado"})
	reqCancel := httptest.NewRequest("PATCH", "/api/pedidos/1/estado", bytes.NewReader(bodyCancel))
	reqCancel.Header.Set("Content-Type", "application/json")

	respCancel, _ := app.Test(reqCancel)
	if respCancel.StatusCode != fiber.StatusOK {
		t.Errorf("patch cancel status = %d, want 200", respCancel.StatusCode)
	}
	if !mockCache.delCalled {
		t.Errorf("expected cache invalidation on order cancellation")
	}
}

func TestReportesAdmin(t *testing.T) {
	app := fiber.New()
	mockRepo := &MockDBRepository{}
	repCtrl := NewReporteController(mockRepo)

	app.Get("/api/reportes/resumen", repCtrl.GetResumen)
	app.Get("/api/reportes/top-productos", repCtrl.GetTopProductos)
	app.Get("/api/reportes/top-referidos", repCtrl.GetTopReferidos)

	req1 := httptest.NewRequest("GET", "/api/reportes/resumen", nil)
	resp1, _ := app.Test(req1)
	if resp1.StatusCode != fiber.StatusOK {
		t.Errorf("get resumen status = %d, want 200", resp1.StatusCode)
	}

	req2 := httptest.NewRequest("GET", "/api/reportes/top-productos?limit=5", nil)
	resp2, _ := app.Test(req2)
	if resp2.StatusCode != fiber.StatusOK {
		t.Errorf("get top productos status = %d, want 200", resp2.StatusCode)
	}

	req3 := httptest.NewRequest("GET", "/api/reportes/top-referidos?limit=5", nil)
	resp3, _ := app.Test(req3)
	if resp3.StatusCode != fiber.StatusOK {
		t.Errorf("get top referidos status = %d, want 200", resp3.StatusCode)
	}
}
