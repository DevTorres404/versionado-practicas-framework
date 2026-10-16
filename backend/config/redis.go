// Package config centraliza la configuración y el cliente de conexión a Redis (Fase 3).
package config

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisConfig reúne los parámetros para la conexión a Redis.
type RedisConfig struct {
	Host     string
	Port     string
	Password string
	DB       int
	URL      string
}

// LoadRedis lee las variables de entorno para configurar Redis.
// Da prioridad a REDIS_URL / REDIS_URI si están definidas; de lo contrario
// utiliza REDIS_HOST, REDIS_PORT, REDIS_PASSWORD y REDIS_DB.
func LoadRedis() (RedisConfig, error) {
	// Cargamos .env si aún no se ha cargado en el proceso
	if err := loadDotEnv(".env"); err != nil && !os.IsNotExist(err) {
		return RedisConfig{}, err
	}

	url := envOr("REDIS_URL", "")
	if url == "" {
		url = envOr("REDIS_URI", "")
	}

	dbNum := 0
	if dbStr := os.Getenv("REDIS_DB"); dbStr != "" {
		if val, err := strconv.Atoi(dbStr); err == nil {
			dbNum = val
		}
	}

	cfg := RedisConfig{
		Host:     envOr("REDIS_HOST", "localhost"),
		Port:     envOr("REDIS_PORT", "6379"),
		Password: envOr("REDIS_PASSWORD", ""),
		DB:       dbNum,
		URL:      url,
	}

	return cfg, nil
}

// NewRedisClient inicializa y verifica la conexión al servidor de Redis.
// Aplica timeout de 5 segundos en el Ping para asegurar fail-fast si el
// servicio no está alcanzable.
func NewRedisClient(cfg RedisConfig) (*redis.Client, error) {
	var opts *redis.Options

	if cfg.URL != "" {
		parsedOpts, err := redis.ParseURL(cfg.URL)
		if err != nil {
			return nil, fmt.Errorf("parse redis url: %w", err)
		}
		opts = parsedOpts
	} else {
		opts = &redis.Options{
			Addr:     fmt.Sprintf("%s:%s", cfg.Host, cfg.Port),
			Password: cfg.Password,
			DB:       cfg.DB,
		}
	}

	client := redis.NewClient(opts)

	// Verificación de conectividad con timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		_ = client.Close()
		return nil, fmt.Errorf("ping redis: %w", err)
	}

	return client, nil
}

// CloseRedis cierra la conexión con Redis; se invoca en el shutdown de la aplicación.
func CloseRedis(client *redis.Client) error {
	if client == nil {
		return nil
	}
	return client.Close()
}

// RedisCache implementa la interfaz CacheRepository desacoplada (Inyección de Dependencias, Fase 4).
type RedisCache struct {
	client *redis.Client
}

// NewRedisCache envuelve el cliente oficial de Redis en la abstracción de caché.
func NewRedisCache(client *redis.Client) *RedisCache {
	return &RedisCache{client: client}
}

// Get obtiene el valor asociado a la clave desde Redis.
func (r *RedisCache) Get(ctx context.Context, key string) (string, error) {
	if r == nil || r.client == nil {
		return "", errors.New("cliente de redis no inicializado")
	}
	return r.client.Get(ctx, key).Result()
}

// Set guarda una clave con valor y tiempo de expiración (TTL).
func (r *RedisCache) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	if r == nil || r.client == nil {
		return nil
	}
	return r.client.Set(ctx, key, value, ttl).Err()
}

// Del elimina una o más claves de la caché (invalidación de caché).
func (r *RedisCache) Del(ctx context.Context, keys ...string) error {
	if r == nil || r.client == nil || len(keys) == 0 {
		return nil
	}
	return r.client.Del(ctx, keys...).Err()
}

// Ping verifica la conexión activa con Redis.
func (r *RedisCache) Ping(ctx context.Context) error {
	if r == nil || r.client == nil {
		return errors.New("cliente de redis no inicializado")
	}
	return r.client.Ping(ctx).Err()
}
