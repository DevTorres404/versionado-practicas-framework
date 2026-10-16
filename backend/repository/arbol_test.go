// Package repository — unit tests for the referral tree builder.
// The tree builder is the only DB-independent piece of the repository,
// so it is tested first (test-first policy).

package repository

import (
	"reflect"
	"testing"

	"multicatalogo-backend/models"
)

// ptrInt is a small helper to build ParentID values for the fixtures.
func ptrInt(v int) *int {
	return &v
}

// TestConstruirArbolReconstruyeElArbolOriginal verifies that the flat
// `referidos` rows (same order as the seeded data / red.ts tree) are
// rebuilt into the exact original hierarchy: root "Tú" (nivel 0, ventas
// 2400, no parent) with children 1,2,3; Ana (1) with 4,5; Luis (2) with 6;
// Carlos (4) with 7; leaf nodes without hijos.
func TestConstruirArbolReconstruyeElArbolOriginal(t *testing.T) {
	filaPlana := []models.Referido{
		{ID: 0, Nombre: "Tú", Nivel: 0, Ventas: 2400, ParentID: nil},
		{ID: 1, Nombre: "Ana García", Nivel: 1, Ventas: 1200, ParentID: ptrInt(0)},
		{ID: 2, Nombre: "Luis Poveda", Nivel: 1, Ventas: 850, ParentID: ptrInt(0)},
		{ID: 3, Nombre: "Marta Sánchez", Nivel: 1, Ventas: 430, ParentID: ptrInt(0)},
		{ID: 4, Nombre: "Carlos Ruiz", Nivel: 2, Ventas: 500, ParentID: ptrInt(1)},
		{ID: 5, Nombre: "Sofía León", Nivel: 2, Ventas: 430, ParentID: ptrInt(1)},
		{ID: 6, Nombre: "Marco Díaz", Nivel: 2, Ventas: 380, ParentID: ptrInt(2)},
		{ID: 7, Nombre: "Diana Paz", Nivel: 3, Ventas: 300, ParentID: ptrInt(4)},
	}

	esperado := models.Referido{
		ID: 0, Nombre: "Tú", Nivel: 0, Ventas: 2400, ParentID: nil,
		Hijos: []models.Referido{
			{
				ID: 1, Nombre: "Ana García", Nivel: 1, Ventas: 1200, ParentID: ptrInt(0),
				Hijos: []models.Referido{
					{
						ID: 4, Nombre: "Carlos Ruiz", Nivel: 2, Ventas: 500, ParentID: ptrInt(1),
						Hijos: []models.Referido{
							{ID: 7, Nombre: "Diana Paz", Nivel: 3, Ventas: 300, ParentID: ptrInt(4)},
						},
					},
					{ID: 5, Nombre: "Sofía León", Nivel: 2, Ventas: 430, ParentID: ptrInt(1)},
				},
			},
			{
				ID: 2, Nombre: "Luis Poveda", Nivel: 1, Ventas: 850, ParentID: ptrInt(0),
				Hijos: []models.Referido{
					{ID: 6, Nombre: "Marco Díaz", Nivel: 2, Ventas: 380, ParentID: ptrInt(2)},
				},
			},
			{ID: 3, Nombre: "Marta Sánchez", Nivel: 1, Ventas: 430, ParentID: ptrInt(0)},
		},
	}

	obtenido := construirArbol(filaPlana, 0)

	if !reflect.DeepEqual(obtenido, esperado) {
		t.Errorf("construirArbol() = %+v, want %+v", obtenido, esperado)
	}
}

// TestConstruirArbolEntradaVacia verifies that an empty flat list yields
// the zero-value root instead of panicking.
func TestConstruirArbolEntradaVacia(t *testing.T) {
	obtenido := construirArbol(nil, 0)

	if !reflect.DeepEqual(obtenido, models.Referido{}) {
		t.Errorf("construirArbol(nil) = %+v, want zero value", obtenido)
	}
}

// TestConstruirArbolOrdenIndependiente verifies that the builder does not
// depend on children being listed before their parents in the result copy:
// the returned root must include every child even though the root row was
// read first (regression guard for copy-too-early bugs).
func TestConstruirArbolIncluyeHijosDeLaRaiz(t *testing.T) {
	filaPlana := []models.Referido{
		{ID: 0, Nombre: "Tú", Nivel: 0, Ventas: 100, ParentID: nil},
		{ID: 1, Nombre: "Uno", Nivel: 1, Ventas: 50, ParentID: ptrInt(0)},
	}

	obtenido := construirArbol(filaPlana, 0)

	if len(obtenido.Hijos) != 1 {
		t.Fatalf("raíz con %d hijos, want 1", len(obtenido.Hijos))
	}
	if obtenido.Hijos[0].ID != 1 {
		t.Errorf("hijo ID = %d, want 1", obtenido.Hijos[0].ID)
	}
}
