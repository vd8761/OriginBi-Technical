package server

import (
	"context"
	"database/sql"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/originbi/exam-engine/internal/auth"
)

const (
	systemOrgID         = "00000000-0000-0000-0000-000000000001"
	codingExamVersionID = "00000000-0000-0000-0000-000000000601"
)

type assignmentDTO struct {
	ID              string     `json:"id"`
	AssignmentRef   string     `json:"assignmentRef"`
	ItemRef         string     `json:"itemRef"`
	Status          string     `json:"status"`
	ExamVersionID   string     `json:"examVersionId"`
	AvailableFrom   *time.Time `json:"availableFrom,omitempty"`
	AvailableUntil  *time.Time `json:"availableUntil,omitempty"`
	PurchasedAt     *time.Time `json:"purchasedAt,omitempty"`
	ActiveAttemptID string     `json:"activeAttemptId,omitempty"`
	AttemptStatus   string     `json:"attemptStatus,omitempty"`
	Completed       bool       `json:"completed"`
}

type assignmentsResponse struct {
	Assignments []assignmentDTO `json:"assignments"`
}
func (s *Server) listAssignments(w http.ResponseWriter, r *http.Request) {
	principal, err := auth.Require(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}

	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	rows, err := s.pool.Query(ctx, `
		SELECT a.id,
		       COALESCE(a.assignment_ref, ''),
		       COALESCE(pi.item_ref, a.assignment_ref, ''),
		       a.status::text,
		       a.exam_version_id,
		       a.available_from,
		       a.available_until,
		       a.created_at AS paid_at,
		       COALESCE(active_attempt.id::text, ''),
		       COALESCE(active_attempt.status::text, ''),
		       EXISTS (
		           SELECT 1
		           FROM attempts done
		           WHERE done.assignment_id = a.id
		             AND done.status IN ('submitted','timed_out','under_review','evaluated','published')
		       ) AS completed
		FROM exam_assignments a
		LEFT JOIN pricing_items pi ON pi.item_ref = a.assignment_ref
		LEFT JOIN LATERAL (
		    SELECT id, status
		    FROM attempts
		    WHERE assignment_id = a.id
		      AND status IN ('started','in_progress','paused')
		    ORDER BY created_at DESC
		    LIMIT 1
		) active_attempt ON true
		WHERE a.candidate_user_id = $1
		ORDER BY a.created_at DESC
	`, principal.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	resp := assignmentsResponse{Assignments: []assignmentDTO{}}
	for rows.Next() {
		var dto assignmentDTO
		var id uuid.UUID
		var examVersionID uuid.UUID
		var availableFrom, availableUntil, purchasedAt sql.NullTime
		if err := rows.Scan(
			&id,
			&dto.AssignmentRef,
			&dto.ItemRef,
			&dto.Status,
			&examVersionID,
			&availableFrom,
			&availableUntil,
			&purchasedAt,
			&dto.ActiveAttemptID,
			&dto.AttemptStatus,
			&dto.Completed,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "assignment scan failed")
			return
		}
		dto.ID = id.String()
		dto.ExamVersionID = examVersionID.String()
		dto.AvailableFrom = nullTimePtr(availableFrom)
		dto.AvailableUntil = nullTimePtr(availableUntil)
		dto.PurchasedAt = nullTimePtr(purchasedAt)
		resp.Assignments = append(resp.Assignments, dto)
	}
	if rows.Err() != nil {
		writeError(w, http.StatusInternalServerError, "assignment rows failed")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func nullTimePtr(v sql.NullTime) *time.Time {
	if !v.Valid {
		return nil
	}
	return &v.Time
}

func int64String(v int64) string {
	return strconv.FormatInt(v, 10)
}

// grantFreeAssignmentTx idempotently creates a single active assignment for
// the given assignment_ref inside an existing transaction. Returns nil if the
// ref is not a known coding language plugin (caller should treat as no-op).
func (s *Server) grantFreeAssignmentTx(ctx context.Context, tx pgx.Tx, userID int64, assignmentRef string) error {
	ref := strings.ToLower(strings.TrimSpace(assignmentRef))
	if ref == "" {
		return nil
	}
	if s.plugins != nil {
		ok, err := s.plugins.IsPurchasableLanguagePlugin(ctx, ref)
		if err != nil {
			return err
		}
		if !ok {
			return nil
		}
	}
	var pricingExists bool
	if err := tx.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM pricing_items WHERE item_ref = $1)
	`, ref).Scan(&pricingExists); err != nil {
		return err
	}
	if !pricingExists {
		return nil
	}
	metadata, err := s.buildAssignmentMetadata(ctx, tx, uuid.MustParse(codingExamVersionID), ref)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO exam_assignments (
		    id, exam_version_id, candidate_user_id, assigned_by, assigned_org_id,
		    available_from, available_until, max_attempts, status,
		    assignment_ref, metadata
		)
		VALUES (
		    $1, $2, $3, $3, $4,
		    now(), NULL, 1, 'active',
		    $5, jsonb_build_object('language', replace($5, 'coding:', ''), 'grantedBy', 'admin_registration') || $6::jsonb
		)
		ON CONFLICT (candidate_user_id, assignment_ref)
		    WHERE assignment_ref IS NOT NULL AND status <> 'revoked'
		DO UPDATE
		SET status = 'active',
		    available_from = COALESCE(exam_assignments.available_from, EXCLUDED.available_from),
		    available_until = NULL,
		    metadata = CASE
		        WHEN exam_assignments.metadata ? 'settingsSnapshot' THEN exam_assignments.metadata
		        ELSE exam_assignments.metadata || EXCLUDED.metadata
		    END
	`, uuid.New(), codingExamVersionID, userID, systemOrgID, ref, metadata)
	return err
}

// grantFreeCodingAssignments idempotently creates an active assignment for
// every priced coding language for the given user. Used to satisfy the
// "registrations.registration_source = 'ADMIN' → free access" requirement.
// The assignment's purchase_id stays NULL because there is no Razorpay row;
// the assignment is the entitlement.
func (s *Server) grantFreeCodingAssignments(ctx context.Context, userID int64) error {
	rows, err := s.pool.Query(ctx, `
		SELECT item_ref
		FROM pricing_items
		WHERE item_kind = 'coding_language'
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	var refs []string
	for rows.Next() {
		var ref string
		if err := rows.Scan(&ref); err != nil {
			return err
		}
		refs = append(refs, ref)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	for _, ref := range refs {
		metadata, err := s.buildAssignmentMetadata(ctx, s.pool, uuid.MustParse(codingExamVersionID), ref)
		if err != nil {
			return err
		}
		if _, err := s.pool.Exec(ctx, `
			INSERT INTO exam_assignments (
			    id, exam_version_id, candidate_user_id, assigned_by, assigned_org_id,
			    available_from, available_until, max_attempts, status,
			    assignment_ref, metadata
			)
			VALUES (
			    $1, $2, $3, $3, $4,
			    now(), NULL, 1, 'active',
			    $5, jsonb_build_object('language', replace($5, 'coding:', ''), 'grantedBy', 'admin_registration') || $6::jsonb
			)
			ON CONFLICT (candidate_user_id, assignment_ref)
			    WHERE assignment_ref IS NOT NULL AND status <> 'revoked'
			DO UPDATE
			SET status = 'active',
			    metadata = CASE
			        WHEN exam_assignments.metadata ? 'settingsSnapshot' THEN exam_assignments.metadata
			        ELSE exam_assignments.metadata || EXCLUDED.metadata
			    END
		`, uuid.New(), codingExamVersionID, userID, systemOrgID, ref, metadata); err != nil {
			return err
		}
	}
	return nil
}
