package main

import (
	"context"
	"log"

	"tech-assessment-engine/internal/auth"
	"tech-assessment-engine/internal/config"
	"tech-assessment-engine/internal/repository"
	"tech-assessment-engine/internal/routes"
)

func main() {
	cfg := config.LoadConfig()

	// Initialize Database connection
	repository.ConnectDB(cfg)

	// The assessment API is unusable without a way to authenticate callers, so
	// a missing or unreachable Cognito configuration is fatal. Failing to boot
	// is the correct outcome: the alternative is serving exam data to anyone.
	verifier, err := auth.NewCognitoVerifier(
		context.Background(),
		cfg.CognitoRegion,
		cfg.CognitoUserPoolID,
		cfg.CognitoClientID,
	)
	if err != nil {
		log.Fatalf("cognito verifier init failed: %v", err)
	}

	if cfg.AllowedOrigins == "" {
		log.Printf("warning: ALLOWED_ORIGINS is empty — browsers will be refused cross-origin access")
	}

	r := routes.SetupRouter(verifier, cfg.AllowedOrigins)

	log.Printf("Tech Assessment Engine Service starting on port %s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
