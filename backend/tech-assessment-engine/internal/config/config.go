package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	DBHost      string
	DBUser      string
	DBPass      string
	DBName      string
	DBPort      string
	DatabaseURL string
}

func LoadConfig() *Config {
	// Try loading from .env.local first (highest priority)
	_ = godotenv.Load(".env.local")
	// Try loading from .env
	_ = godotenv.Load()
	// Try loading from config.env (fallback/alternative)
	_ = godotenv.Load("config.env")

	port := os.Getenv("TECH_ENGINE_PORT")
	if port == "" {
		port = os.Getenv("PORT")
		if port == "" {
			port = "5001" // default to 5001 to avoid conflicts with NestJS assessment-service on 5000
		}
	}

	return &Config{
		Port:        port,
		DBHost:      os.Getenv("DB_HOST"),
		DBUser:      os.Getenv("DB_USER"),
		DBPass:      os.Getenv("DB_PASS"),
		DBName:      os.Getenv("DB_NAME"),
		DBPort:      os.Getenv("DB_PORT"),
		DatabaseURL: os.Getenv("DATABASE_URL"),
	}
}
