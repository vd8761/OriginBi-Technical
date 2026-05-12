// Package config loads runtime settings from environment variables.
//
// We deliberately keep this small and dependency-free. .env loading is
// optional (only used in dev), so prod containers just inject env vars.
package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	HTTPAddr               string
	DatabaseURL            string
	LogLevel               string
	HeartbeatGrace         time.Duration
	RunMigrations          bool
	EnsurePartitionsOnBoot bool

	CognitoRegion     string
	CognitoUserPoolID string
	CognitoClientID   string
	DefaultOrgID      string
}

func Load() (*Config, error) {
	// .env.local is optional — silently ignore if missing. Fall back to .env
	// for backward compatibility, then to whatever the process already has.
	_ = godotenv.Load(".env.local")
	_ = godotenv.Load()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return nil, errors.New("DATABASE_URL is required")
	}

	cfg := &Config{
		HTTPAddr:               getenv("HTTP_ADDR", ":8080"),
		DatabaseURL:            dbURL,
		LogLevel:               getenv("LOG_LEVEL", "info"),
		HeartbeatGrace:         getDuration("HEARTBEAT_GRACE_SECONDS", 60*time.Second),
		RunMigrations:          getBool("RUN_MIGRATIONS", true),
		EnsurePartitionsOnBoot: getBool("ENSURE_PARTITIONS_ON_BOOT", true),
		CognitoRegion:          os.Getenv("COGNITO_REGION"),
		CognitoUserPoolID:      os.Getenv("COGNITO_USER_POOL_ID"),
		CognitoClientID:        os.Getenv("COGNITO_CLIENT_ID"),
		DefaultOrgID:           getenv("DEFAULT_ORG_ID", "00000000-0000-0000-0000-000000000001"),
	}
	if cfg.CognitoRegion == "" || cfg.CognitoUserPoolID == "" || cfg.CognitoClientID == "" {
		return nil, errors.New("COGNITO_REGION, COGNITO_USER_POOL_ID, and COGNITO_CLIENT_ID are required")
	}
	return cfg, nil
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func getDuration(k string, def time.Duration) time.Duration {
	v := os.Getenv(k)
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return def
	}
	return time.Duration(n) * time.Second
}

func getBool(k string, def bool) bool {
	v := os.Getenv(k)
	if v == "" {
		return def
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return def
	}
	return b
}

// String redacts secrets for safe logging.
func (c *Config) String() string {
	return fmt.Sprintf("Config{addr=%s, log=%s, migrations=%v, heartbeat_grace=%s}",
		c.HTTPAddr, c.LogLevel, c.RunMigrations, c.HeartbeatGrace)
}
