package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		fmt.Fprintf(os.Stderr, "DATABASE_URL environment variable is not set\n")
		os.Exit(1)
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to connect to database: %v\n", err)
		os.Exit(1)
	}
	defer pool.Close()

	fmt.Println("--- Querying last 20 code_runs ---")
	rows, err := pool.Query(ctx, `
		SELECT id, attempt_id, answer_id, mode, judge0_status_id, judge0_status_desc, stdout, stderr, compile_output, time_seconds, memory_kb, started_at, finished_at
		FROM code_runs ORDER BY started_at DESC LIMIT 20
	`)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Query error code_runs: %v\n", err)
		os.Exit(1)
	}
	defer rows.Close()

	for rows.Next() {
		var id, attemptID, answerID, mode string
		var statusDesc *string
		var stdout, stderr, compileOutput *string
		var statusID *int
		var timeSeconds *float64
		var memoryKB *int
		var startedAt, finishedAt *time.Time

		err = rows.Scan(&id, &attemptID, &answerID, &mode, &statusID, &statusDesc, &stdout, &stderr, &compileOutput, &timeSeconds, &memoryKB, &startedAt, &finishedAt)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Scan error: %v\n", err)
			continue
		}

		resMap := map[string]interface{}{
			"id":                 id,
			"attempt_id":         attemptID,
			"answer_id":          answerID,
			"mode":               mode,
			"judge0_status_id":   statusID,
			"judge0_status_desc": statusDesc,
			"stdout":             stdout,
			"stderr":             stderr,
			"compile_output":     compileOutput,
			"time_seconds":       timeSeconds,
			"memory_kb":          memoryKB,
			"started_at":         startedAt,
			"finished_at":        finishedAt,
		}
		resJSON, _ := json.Marshal(resMap)
		fmt.Println(string(resJSON))
	}
}
