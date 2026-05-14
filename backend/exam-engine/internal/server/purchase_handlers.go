package server

import (
	"database/sql"
	"errors"
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

type demoPurchaseRequest struct {
	ItemRef string `json:"itemRef"`
}

type demoPurchaseResponse struct {
	PurchaseID string        `json:"purchaseId"`
	Assignment assignmentDTO `json:"assignment"`
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
		       p.paid_at,
		       COALESCE(active_attempt.id::text, ''),
		       COALESCE(active_attempt.status::text, ''),
		       EXISTS (
		           SELECT 1
		           FROM attempts done
		           WHERE done.assignment_id = a.id
		             AND done.status IN ('submitted','timed_out','under_review','evaluated','published')
		       ) AS completed
		FROM exam_assignments a
		LEFT JOIN purchases p ON p.id = a.purchase_id
		LEFT JOIN pricing_items pi ON pi.id = p.pricing_item_id
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

func (s *Server) demoPurchase(w http.ResponseWriter, r *http.Request) {
	principal, err := auth.Require(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	var req demoPurchaseRequest
	if !decodeJSON(w, r, &req, maxRuntimeBodyBytes) {
		return
	}
	req.ItemRef = strings.ToLower(strings.TrimSpace(req.ItemRef))
	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	if s.plugins == nil {
		writeError(w, http.StatusServiceUnavailable, "plugin registry unavailable")
		return
	}
	ok, err := s.plugins.IsPurchasableLanguagePlugin(ctx, req.ItemRef)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "plugin lookup failed")
		return
	}
	if !ok {
		writeError(w, http.StatusBadRequest, "unsupported itemRef")
		return
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db unavailable")
		return
	}
	defer tx.Rollback(ctx)

	var pricingID uuid.UUID
	var priceCents int
	var currency string
	err = tx.QueryRow(ctx, `
		SELECT id, price_cents, currency
		FROM pricing_items
		WHERE item_ref = $1
	`, req.ItemRef).Scan(&pricingID, &priceCents, &currency)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "pricing item not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "pricing lookup failed")
		return
	}

	var purchaseID uuid.UUID
	providerRef := "demo:" + req.ItemRef + ":" + int64String(principal.UserID)
	err = tx.QueryRow(ctx, `
		INSERT INTO purchases (
		    id, user_id, pricing_item_id, amount_cents, currency,
		    provider, provider_ref, metadata
		)
		VALUES ($1, $2, $3, $4, $5, 'demo', $6, '{"source":"frontend-demo"}'::jsonb)
		ON CONFLICT (user_id, pricing_item_id, provider_ref) DO UPDATE
		SET paid_at = purchases.paid_at
		RETURNING id
	`, uuid.New(), principal.UserID, pricingID, priceCents, currency, providerRef).Scan(&purchaseID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "purchase failed")
		return
	}

	var assignmentID uuid.UUID
	var availableFrom sql.NullTime
	err = tx.QueryRow(ctx, `
		INSERT INTO exam_assignments (
		    id, exam_version_id, candidate_user_id, assigned_by, assigned_org_id,
		    available_from, available_until, max_attempts, status,
		    assignment_ref, purchase_id, metadata
		)
		VALUES (
		    $1, $2, $3, $3, $4,
		    now(), NULL, 1, 'active',
		    $5, $6, jsonb_build_object('language', replace($5, 'coding:', ''))
		)
		ON CONFLICT (candidate_user_id, assignment_ref)
		    WHERE assignment_ref IS NOT NULL AND status <> 'revoked'
		DO UPDATE
		SET status = 'active',
		    available_from = COALESCE(exam_assignments.available_from, EXCLUDED.available_from),
		    available_until = NULL,
		    purchase_id = COALESCE(exam_assignments.purchase_id, EXCLUDED.purchase_id)
		RETURNING id, available_from
	`, uuid.New(), codingExamVersionID, principal.UserID, systemOrgID, req.ItemRef, purchaseID).Scan(&assignmentID, &availableFrom)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "assignment failed")
		return
	}

	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "commit failed")
		return
	}

	dto := assignmentDTO{
		ID:            assignmentID.String(),
		AssignmentRef: req.ItemRef,
		ItemRef:       req.ItemRef,
		Status:        "active",
		ExamVersionID: codingExamVersionID,
		AvailableFrom: nullTimePtr(availableFrom),
		Completed:     false,
	}
	writeJSON(w, http.StatusOK, demoPurchaseResponse{
		PurchaseID: purchaseID.String(),
		Assignment: dto,
	})
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
