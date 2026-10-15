package config

import (
	"os"
	"testing"
)

func TestLoadRedisDefault(t *testing.T) {
	// Limpiamos variables de entorno para probar valores por defecto
	os.Unsetenv("REDIS_HOST")
	os.Unsetenv("REDIS_PORT")
	os.Unsetenv("REDIS_PASSWORD")
	os.Unsetenv("REDIS_DB")
	os.Unsetenv("REDIS_URL")
	os.Unsetenv("REDIS_URI")

	cfg, err := LoadRedis()
	if err != nil {
		t.Fatalf("LoadRedis() error = %v", err)
	}

	if cfg.Host != "localhost" {
		t.Errorf("cfg.Host = %s, want localhost", cfg.Host)
	}
	if cfg.Port != "6379" {
		t.Errorf("cfg.Port = %s, want 6379", cfg.Port)
	}
	if cfg.DB != 0 {
		t.Errorf("cfg.DB = %d, want 0", cfg.DB)
	}
}

func TestLoadRedisCustomEnv(t *testing.T) {
	os.Setenv("REDIS_HOST", "redis.internal")
	os.Setenv("REDIS_PORT", "6380")
	os.Setenv("REDIS_DB", "2")
	defer func() {
		os.Unsetenv("REDIS_HOST")
		os.Unsetenv("REDIS_PORT")
		os.Unsetenv("REDIS_DB")
	}()

	cfg, err := LoadRedis()
	if err != nil {
		t.Fatalf("LoadRedis() error = %v", err)
	}

	if cfg.Host != "redis.internal" {
		t.Errorf("cfg.Host = %s, want redis.internal", cfg.Host)
	}
	if cfg.Port != "6380" {
		t.Errorf("cfg.Port = %s, want 6380", cfg.Port)
	}
	if cfg.DB != 2 {
		t.Errorf("cfg.DB = %d, want 2", cfg.DB)
	}
}
