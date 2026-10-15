// Package config centraliza la carga de la configuración de conexión a
// PostgreSQL y la creación del pool de conexiones (T3 de la Fase 2).
package config

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"strings"
	"time"

	// Driver oficial: pgx v5 expuesto a través de database/sql (stdlib).
	// Se eligió database/sql (y no pgxpool) porque los controladores mapean
	// sql.ErrNoRows a respuestas 404/401, tal como exige la tarea.
	_ "github.com/jackc/pgx/v5/stdlib"
)

// Config reúne los parámetros de conexión a la base de datos.
// Todos los valores se leen con las claves POSTGRES_* (ver .env.example).
type Config struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

// Load lee el archivo .env (si existe) y luego las variables de entorno.
// Las variables ya definidas fuera del proceso tienen prioridad sobre .env.
func Load() (Config, error) {
	// La ausencia de .env no es un error fatal: se puede configurar por SO.
	if err := loadDotEnv(".env"); err != nil && !os.IsNotExist(err) {
		return Config{}, err
	}

	cfg := Config{
		Host:     envOr("POSTGRES_HOST", "localhost"),
		Port:     envOr("POSTGRES_PORT", "5432"),
		User:     envOr("POSTGRES_USER", "multicatalogo"),
		Password: envOr("POSTGRES_PASSWORD", "multicatalogo"),
		DBName:   envOr("POSTGRES_DB", "multicatalogo"),
		SSLMode:  envOr("POSTGRES_SSLMODE", "disable"),
	}

	return cfg, nil
}

// DSN construye la cadena de conexión estilo key=value que entiende pgx.
func (c Config) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.Host, c.Port, c.User, c.Password, c.DBName, c.SSLMode,
	)
}

// NewDB abre el pool de conexiones, aplica los límites del pool y verifica
// la conexión con un ping acotado en el tiempo. Si la base de datos no está
// alcanzable, devuelve error: la aplicación NO debe arrancar (fail fast).
func NewDB(cfg Config) (*sql.DB, error) {
	db, err := sql.Open("pgx", cfg.DSN())
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	// Pool de conexiones: límites conservadores para una app monolítica.
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(30 * time.Minute)
	db.SetConnMaxIdleTime(5 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return db, nil
}

// Close cierra el pool de conexiones; se invoca con defer en el shutdown.
func Close(db *sql.DB) error {
	if db == nil {
		return nil
	}
	return db.Close()
}

// envOr devuelve la variable de entorno o un valor por defecto.
func envOr(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok && value != "" {
		return value
	}
	return fallback
}

// loadDotEnv parsea un archivo .env estilo KEY=VALUE y exporta cada clave
// solo si aún no está definida (las variables del proceso mandan).
func loadDotEnv(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	for _, raw := range strings.Split(string(data), "\n") {
		line := strings.TrimSpace(raw)
		// Líneas vacías y comentarios se ignoran.
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		// Soporte opcional del prefijo "export ".
		line = strings.TrimPrefix(line, "export ")

		key, value, found := strings.Cut(line, "=")
		if !found {
			continue
		}

		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		// Se aceptan valores entre comillas simples o dobles.
		value = strings.Trim(value, `"'`)

		if key == "" {
			continue
		}
		if _, exists := os.LookupEnv(key); exists {
			continue
		}
		if err := os.Setenv(key, value); err != nil {
			return err
		}
	}

	return nil
}
