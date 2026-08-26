// Command migrate applies exam-engine's goose migrations and exits.
//
// The server also migrates at boot when RUN_MIGRATIONS=true, which is right
// for a rolling deploy but wrong for provisioning: bringing a database up for
// the first time should not require starting an HTTP listener, and a migration
// failure should be visible as a non-zero exit rather than a service that
// refused to come up.
//
// exam-engine must migrate a fresh database FIRST — its baseline creates
// users, registrations and questions, which assessment-service's tables
// reference with foreign keys.
//
//	DATABASE_URL=postgres://... go run ./cmd/migrate
package main

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/originbi/exam-engine/internal/migrate"
)

func main() {
	dsn := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if dsn == "" {
		fmt.Fprintln(os.Stderr, "DATABASE_URL is not set")
		os.Exit(1)
	}

	// Long enough for a baseline against a cold managed database, short enough
	// that a hung connection fails the deploy instead of stalling it.
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	if err := migrate.Up(ctx, dsn); err != nil {
		fmt.Fprintf(os.Stderr, "migration failed: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("exam-engine migrations applied")
}
