package server

import (
	"net/http"
	"strconv"
	"strings"
	"time"
)

type adminUserDTO struct {
	ID              int64   `json:"id"`
	Email           string  `json:"email"`
	FullName        string  `json:"fullName"`
	Role            string  `json:"role"`      // raw DB value (ADMIN/SUPER_ADMIN/STAFF/PROCTOR/STUDENT/…)
	RoleGroup       string  `json:"roleGroup"` // "Admin" | "Proctor" | "Student"
	Status          string  `json:"status"`    // active | blocked | pending
	InstitutionName string  `json:"institutionName"`
	Assessments     int64   `json:"assessments"`
	LastSeenAt      *string `json:"lastSeenAt"`
	CreatedAt       *string `json:"createdAt"`
}

type adminUsersResponse struct {
	Users  []adminUserDTO  `json:"users"`
	Total  int64           `json:"total"`
	Limit  int             `json:"limit"`
	Offset int             `json:"offset"`
	Counts adminUserCounts `json:"counts"`
}

type adminUserCounts struct {
	Total    int64 `json:"total"`
	Students int64 `json:"students"`
	Admins   int64 `json:"admins"`
	Proctors int64 `json:"proctors"`
	Blocked  int64 `json:"blocked"`
}

// listAdminUsers returns a paginated roster of users with registration and
// attempt-count aggregates. The query targets the Cognito-era schema
// (`role`, `is_active`, `is_blocked`); the legacy dev-bootstrap schema
// (`is_admin`, `status`, `deleted_at`) is not supported by this endpoint.
func (s *Server) listAdminUsers(w http.ResponseWriter, r *http.Request) {
	if !s.requireAdmin(w, r) {
		return
	}

	q := strings.TrimSpace(r.URL.Query().Get("q"))
	roleGroup := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("role")))
	status := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("status")))

	limit := 50
	if v := r.URL.Query().Get("limit"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			if parsed > 200 {
				parsed = 200
			}
			limit = parsed
		}
	}
	offset := 0
	if v := r.URL.Query().Get("offset"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	// Build filter SQL + args incrementally. Indexed args keep injection out.
	args := []any{}
	where := []string{}

	pushArg := func(v any) string {
		args = append(args, v)
		return "$" + strconv.Itoa(len(args))
	}

	if q != "" {
		like := "%" + q + "%"
		p := pushArg(like)
		where = append(where, "(u.email ILIKE "+p+" OR COALESCE(r.full_name, '') ILIKE "+p+")")
	}
	switch roleGroup {
	case "admin":
		where = append(where, "COALESCE(u.role, '') IN ('ADMIN','SUPER_ADMIN','STAFF')")
	case "proctor":
		where = append(where, "COALESCE(u.role, '') = 'PROCTOR'")
	case "student":
		where = append(where, "COALESCE(u.role, '') NOT IN ('ADMIN','SUPER_ADMIN','STAFF','PROCTOR')")
	}
	switch status {
	case "blocked":
		where = append(where, "u.is_blocked = TRUE")
	case "pending":
		where = append(where, "u.is_blocked = FALSE AND u.is_active = FALSE")
	case "active":
		where = append(where, "u.is_blocked = FALSE AND u.is_active = TRUE")
	}

	whereSQL := ""
	if len(where) > 0 {
		whereSQL = "WHERE " + strings.Join(where, " AND ")
	}

	ctx, cancel := contextWithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// Counts ignore the search/role/status filters so the dashboard cards
	// stay stable when the operator narrows the table.
	counts := adminUserCounts{}
	if err := s.pool.QueryRow(ctx, `
		SELECT
		    COUNT(*)::bigint AS total,
		    COUNT(*) FILTER (WHERE COALESCE(u.role, '') NOT IN ('ADMIN','SUPER_ADMIN','STAFF','PROCTOR'))::bigint AS students,
		    COUNT(*) FILTER (WHERE COALESCE(u.role, '') IN ('ADMIN','SUPER_ADMIN','STAFF'))::bigint AS admins,
		    COUNT(*) FILTER (WHERE COALESCE(u.role, '') = 'PROCTOR')::bigint AS proctors,
		    COUNT(*) FILTER (WHERE u.is_blocked = TRUE)::bigint AS blocked
		FROM users u
	`).Scan(&counts.Total, &counts.Students, &counts.Admins, &counts.Proctors, &counts.Blocked); err != nil {
		writeError(w, http.StatusInternalServerError, "user counts failed")
		return
	}

	var total int64
	totalSQL := `
		SELECT COUNT(*)::bigint
		FROM users u
		LEFT JOIN registrations r ON r.user_id = u.id
		` + whereSQL
	if err := s.pool.QueryRow(ctx, totalSQL, args...).Scan(&total); err != nil {
		writeError(w, http.StatusInternalServerError, "user count failed")
		return
	}

	limitArg := pushArg(limit)
	offsetArg := pushArg(offset)
	rowsSQL := `
		SELECT u.id,
		       COALESCE(u.email, ''),
		       COALESCE(r.full_name, ''),
		       COALESCE(u.role, '')                                       AS role,
		       COALESCE(
		           r.metadata->>'institutionName',
		           r.metadata->>'institution_name',
		           ''
		       )                                                          AS institution,
		       u.is_active,
		       u.is_blocked,
		       u.last_login_at,
		       u.created_at,
		       (SELECT COUNT(*)::bigint FROM attempts a WHERE a.candidate_user_id = u.id) AS assessments
		FROM users u
		LEFT JOIN registrations r ON r.user_id = u.id
		` + whereSQL + `
		ORDER BY u.created_at DESC NULLS LAST, u.id DESC
		LIMIT ` + limitArg + ` OFFSET ` + offsetArg

	rows, err := s.pool.Query(ctx, rowsSQL, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "user lookup failed")
		return
	}
	defer rows.Close()

	out := make([]adminUserDTO, 0, limit)
	for rows.Next() {
		var (
			u           adminUserDTO
			isActive    bool
			isBlocked   bool
			lastLogin   *time.Time
			createdAt   *time.Time
			roleRaw     string
			institution string
		)
		if err := rows.Scan(&u.ID, &u.Email, &u.FullName, &roleRaw, &institution,
			&isActive, &isBlocked, &lastLogin, &createdAt, &u.Assessments); err != nil {
			writeError(w, http.StatusInternalServerError, "user scan failed")
			return
		}
		u.Role = roleRaw
		u.RoleGroup = roleGroupFor(roleRaw)
		u.InstitutionName = institution
		switch {
		case isBlocked:
			u.Status = "blocked"
		case !isActive:
			u.Status = "pending"
		default:
			u.Status = "active"
		}
		if lastLogin != nil {
			v := lastLogin.UTC().Format(time.RFC3339)
			u.LastSeenAt = &v
		}
		if createdAt != nil {
			v := createdAt.UTC().Format(time.RFC3339)
			u.CreatedAt = &v
		}
		out = append(out, u)
	}
	if rows.Err() != nil {
		writeError(w, http.StatusInternalServerError, "user rows failed")
		return
	}

	writeJSON(w, http.StatusOK, adminUsersResponse{
		Users:  out,
		Total:  total,
		Limit:  limit,
		Offset: offset,
		Counts: counts,
	})
}

func roleGroupFor(raw string) string {
	switch strings.ToUpper(strings.TrimSpace(raw)) {
	case "ADMIN", "SUPER_ADMIN", "STAFF":
		return "Admin"
	case "PROCTOR":
		return "Proctor"
	default:
		return "Student"
	}
}
