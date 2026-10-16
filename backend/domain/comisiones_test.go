package domain

import (
	"testing"
)

func TestRepartirComisionesValoresPositivos(t *testing.T) {
	total := 100.0
	comisiones := RepartirComisiones(total)

	if len(comisiones) != 3 {
		t.Fatalf("se esperaban 3 niveles de comisión, se obtuvieron %d", len(comisiones))
	}

	// Nivel 1: 10% de 100 = 10
	if comisiones[0].Nivel != 1 || comisiones[0].Monto != 10.0 {
		t.Errorf("Nivel 1 incorrecto: %+v, esperado 10.0", comisiones[0])
	}
	// Nivel 2: 5% de 100 = 5
	if comisiones[1].Nivel != 2 || comisiones[1].Monto != 5.0 {
		t.Errorf("Nivel 2 incorrecto: %+v, esperado 5.0", comisiones[1])
	}
	// Nivel 3: 2% de 100 = 2
	if comisiones[2].Nivel != 3 || comisiones[2].Monto != 2.0 {
		t.Errorf("Nivel 3 incorrecto: %+v, esperado 2.0", comisiones[2])
	}
}

func TestRepartirComisionesTotalCeroONegativo(t *testing.T) {
	if comisiones := RepartirComisiones(0); comisiones != nil {
		t.Errorf("se esperaba nil para total 0, se obtuvo %+v", comisiones)
	}
	if comisiones := RepartirComisiones(-50); comisiones != nil {
		t.Errorf("se esperaba nil para total negativo, se obtuvo %+v", comisiones)
	}
}
