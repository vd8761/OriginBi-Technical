package main

import (
	"log"
	"tech-assessment-engine/internal/config"
	"tech-assessment-engine/internal/repository"
	"tech-assessment-engine/internal/routes"
)

func main() {
	cfg := config.LoadConfig()

	// Initialize Database connection
	repository.ConnectDB(cfg)

	// Setup routing and engine
	r := routes.SetupRouter()

	log.Printf("Tech Assessment Engine Service starting on port %s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
