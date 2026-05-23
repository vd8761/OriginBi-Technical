package server

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/originbi/exam-engine/internal/auth"
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
		       COALESCE(a.assignment_ref, ''),
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
