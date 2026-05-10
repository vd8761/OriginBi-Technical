package server

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

func (s *Server) recordAttemptEvent(
	ctx context.Context,
	attemptID uuid.UUID,
	kind string,
	severity int16,
	examQuestionID *uuid.UUID,
	payload any,
) error {
	ctx, cancel := contextWithTimeout(ctx, 3*time.Second)
	defer cancel()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err := s.recordAttemptEventTx(ctx, tx, attemptID, kind, severity, examQuestionID, payload); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (s *Server) recordAttemptEventTx(
	ctx context.Context,
	tx txExecutor,
	attemptID uuid.UUID,
	kind string,
	severity int16,
	examQuestionID *uuid.UUID,
	payload any,
) error {
	if kind == "" {
		return fmt.Errorf("event kind is required")
	}
	occurredAt := time.Now().UTC()
	raw, err := eventPayload(payload)
	if err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO attempt_events (
		    attempt_id, occurred_at, kind, severity, exam_question_id, payload
		)
		VALUES ($1, $2, $3, $4, $5, $6::jsonb)
	`, attemptID, occurredAt, kind, severity, examQuestionID, raw); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO attempt_event_summary (attempt_id, kind, count, last_at)
		VALUES ($1, $2, 1, $3)
		ON CONFLICT (attempt_id, kind) DO UPDATE
		SET count = attempt_event_summary.count + 1,
		    last_at = GREATEST(attempt_event_summary.last_at, EXCLUDED.last_at)
	`, attemptID, kind, occurredAt); err != nil {
		return err
	}
	return nil
}

func eventPayload(payload any) ([]byte, error) {
	if payload == nil {
		return []byte("{}"), nil
	}
	switch v := payload.(type) {
	case json.RawMessage:
		if len(v) == 0 {
			return []byte("{}"), nil
		}
		if !json.Valid(v) {
			return nil, fmt.Errorf("invalid event payload")
		}
		return v, nil
	case []byte:
		if len(v) == 0 {
			return []byte("{}"), nil
		}
		if !json.Valid(v) {
			return nil, fmt.Errorf("invalid event payload")
		}
		return v, nil
	default:
		raw, err := json.Marshal(v)
		if err != nil {
			return nil, err
		}
		return raw, nil
	}
}
