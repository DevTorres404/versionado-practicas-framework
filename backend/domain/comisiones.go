// Package domain implementa las reglas de negocio puras del dominio multinivel (MLM),
// completamente desacopladas de I/O, base de datos y frameworks web.
package domain

import "math"

// ComisionCalculada representa el cálculo de comisión para un nivel específico.
type ComisionCalculada struct {
	Nivel      int     `json:"nivel"`
	Porcentaje float64 `json:"porcentaje"`
	Monto      float64 `json:"monto"`
}

// TasasComision define los porcentajes estándar de comisión por nivel:
// Nivel 1 (directo) = 10%, Nivel 2 = 5%, Nivel 3 = 2%
var TasasComision = map[int]float64{
	1: 0.10,
	2: 0.05,
	3: 0.02,
}

// RepartirComisiones calcula las comisiones puras hasta 3 niveles sobre el total vendido.
// Es una función matemática pura sin efectos secundarios ni llamadas a BD.
func RepartirComisiones(total float64) []ComisionCalculada {
	if total <= 0 {
		return nil
	}

	comisiones := make([]ComisionCalculada, 0, 3)
	for nivel := 1; nivel <= 3; nivel++ {
		tasa := TasasComision[nivel]
		// Redondeo bancario a 2 decimales
		monto := math.Round(total*tasa*100) / 100
		comisiones = append(comisiones, ComisionCalculada{
			Nivel:      nivel,
			Porcentaje: tasa * 100,
			Monto:      monto,
		})
	}
	return comisiones
}
