package server

import (
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
)

type dashboardKPIs struct {
	ActiveCandidates        int64 `json:"activeCandidates"`
	ActiveCandidatesOnline  int64 `json:"activeCandidatesOnline"`
	QuestionBankTotal       int64 `json:"questionBankTotal"`
	QuestionBankPluginCount int64 `json:"questionBankPluginCount"`
	LiveSessions            int64 `json:"liveSessions"`
	LiveSessionsMonitored   int64 `json:"liveSessionsMonitored"`
	FlaggedToday            int64 `json:"flaggedToday"`
	FlaggedAwaitingReview   int64 `json:"flaggedAwaitingReview"`
}

type dashboardLiveAssessment struct {
	ExamVersionID   string `json:"examVersionId"`
	Name            string `json:"name"`
	Module          string `json:"module"`
	Status          string `json:"status"` // live | scheduled | draft
	Completed       int64  `json:"completed"`
	Total           int64  `json:"total"`
	DurationMinutes int    `json:"durationMinutes"`
	UpdatedAt       string `json:"updatedAt"`
}

type dashboardActivityItem struct {
	ID         string `json:"id"`
	Actor      string `json:"actor"`
	Action     string `json:"action"`
	Target     string `json:"target"`
	Tone       string `json:"tone"` // green | amber | red | blue | neutral
	CreatedAt  string `json:"createdAt"`
}

type dashboardDayCount struct {
	Day   string `json:"day"`
	Count int64  `json:"count"`
}

type dashboardSeries struct {
	SubmissionsPerDay      []dashboardDayCount `json:"submissionsPerDay"`
	ProctorIncidentsPerDay []dashboardDayCount `json:"proctorIncidentsPerDay"`
	SubmissionsWeekTotal   int64               `json:"submissionsWeekTotal"`
	ProctorIncidentsWeek   int64               `json:"proctorIncidentsWeek"`
	AvgPassRateWeek        *float64            `json:"avgPassRateWeek"`
}

type dashboardSummaryResponse struct {
	KPIs            dashboardKPIs              `json:"kpis"`
	LiveAssessments []dashboardLiveAssessment  `json:"liveAssessments"`
	RecentActivity  []dashboardActivityItem    `json:"recentActivity"`
	Series          dashboardSeries            `json:"series"`
}

func (s *Server) adminDashboardSummary(w http.ResponseWriter, r *http.Request) {
	if !s.requireAdmin(w, r) {
		return
	}

	ctx, cancel := contextWithTimeout(r.Context(), 6*time.Second)
	defer cancel()

	out := dashboardSummaryResponse{
		LiveAssessments: []dashboardLiveAssessment{},
		RecentActivity:  []dashboardActivityItem{},
		Series: dashboardSeries{
			SubmissionsPerDay:      []dashboardDayCount{},
			ProctorIncidentsPerDay: []dashboardDayCount{},
		},
	}

	// ── KPIs ───────────────────────────────────────────────────────────
	if err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*)::bigint
		FROM questions
		WHERE deleted_at IS NULL AND is_archived = FALSE
	`).Scan(&out.KPIs.QuestionBankTotal); err != nil {
		writeError(w, http.StatusInternalServerError, "question count failed")
		return
	}

	if err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*)::bigint
		FROM plugins
		WHERE category = 'assessment'
	`).Scan(&out.KPIs.QuestionBankPluginCount); err != nil {
		writeError(w, http.StatusInternalServerError, "plugin count failed")
		return
	}

	if err := s.pool.QueryRow(ctx, `
		SELECT
		    COUNT(*) FILTER (WHERE status IN ('started','in_progress'))::bigint AS live,
		    COUNT(*) FILTER (WHERE status IN ('started','in_progress')
		                       AND last_seen_at IS NOT NULL
		                       AND last_seen_at > now() - interval '5 minutes')::bigint AS monitored
		FROM attempts
	`).Scan(&out.KPIs.LiveSessions, &out.KPIs.LiveSessionsMonitored); err != nil {
		writeError(w, http.StatusInternalServerError, "live session count failed")
		return
	}

	if err := s.pool.QueryRow(ctx, `
		SELECT COUNT(DISTINCT candidate_user_id)::bigint
		FROM attempts
		WHERE COALESCE(last_seen_at, started_at, created_at) > now() - interval '24 hours'
	`).Scan(&out.KPIs.ActiveCandidates); err != nil {
		writeError(w, http.StatusInternalServerError, "active candidate count failed")
		return
	}

	if err := s.pool.QueryRow(ctx, `
		SELECT COUNT(DISTINCT candidate_user_id)::bigint
		FROM attempts
		WHERE status IN ('started','in_progress')
		  AND last_seen_at IS NOT NULL
		  AND last_seen_at > now() - interval '5 minutes'
	`).Scan(&out.KPIs.ActiveCandidatesOnline); err != nil {
		writeError(w, http.StatusInternalServerError, "online candidate count failed")
		return
	}

	if err := s.pool.QueryRow(ctx, `
		SELECT
		    (SELECT COUNT(*)::bigint FROM plugin_decisions WHERE created_at::date = current_date) AS today,
		    (SELECT COUNT(*)::bigint FROM attempts WHERE status = 'under_review') AS awaiting
	`).Scan(&out.KPIs.FlaggedToday, &out.KPIs.FlaggedAwaitingReview); err != nil {
		writeError(w, http.StatusInternalServerError, "flagged count failed")
		return
	}

	// ── Live assessments (latest 8 exam versions) ──────────────────────
	rows, err := s.pool.Query(ctx, `
		SELECT ev.id,
		       e.title,
		       COALESCE(e.audience, '') AS audience,
		       ev.status::text,
		       ev.total_time_seconds,
		       COALESCE(ev.published_at, ev.created_at) AS updated_at,
		       (SELECT COUNT(*)::bigint FROM attempts a WHERE a.exam_version_id = ev.id) AS total,
		       (SELECT COUNT(*)::bigint FROM attempts a
		        WHERE a.exam_version_id = ev.id
		          AND a.status IN ('submitted','evaluated','published','timed_out')) AS completed
		FROM exam_versions ev
		JOIN exams e ON e.id = ev.exam_id
		WHERE e.deleted_at IS NULL
		ORDER BY COALESCE(ev.published_at, ev.created_at) DESC NULLS LAST
		LIMIT 8
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "live assessments failed")
		return
	}
	for rows.Next() {
		var (
			id          uuid.UUID
			title       string
			audience    string
			status      string
			totalTimeS  int
			updatedAt   time.Time
			total       int64
			completed   int64
		)
		if err := rows.Scan(&id, &title, &audience, &status, &totalTimeS, &updatedAt, &total, &completed); err != nil {
			rows.Close()
			writeError(w, http.StatusInternalServerError, "live assessment scan failed")
			return
		}
		out.LiveAssessments = append(out.LiveAssessments, dashboardLiveAssessment{
			ExamVersionID:   id.String(),
			Name:            title,
			Module:          moduleLabelForAudience(audience),
			Status:          uiStatusForExamVersion(status),
			Completed:       completed,
			Total:           total,
			DurationMinutes: totalTimeS / 60,
			UpdatedAt:       updatedAt.UTC().Format(time.RFC3339),
		})
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, "live assessment rows failed")
		return
	}

	// ── Recent activity (latest 8 plugin decisions) ────────────────────
	rows, err = s.pool.Query(ctx, `
		SELECT pd.id,
		       p.name AS plugin_name,
		       pd.decision,
		       COALESCE(pd.reason, '') AS reason,
		       pd.created_at,
		       a.candidate_user_id,
		       e.title
		FROM plugin_decisions pd
		JOIN plugins p ON p.id = pd.plugin_id
		LEFT JOIN attempts a ON a.id = pd.attempt_id
		LEFT JOIN exam_versions ev ON ev.id = a.exam_version_id
		LEFT JOIN exams e ON e.id = ev.exam_id
		ORDER BY pd.created_at DESC
		LIMIT 8
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "recent activity failed")
		return
	}
	for rows.Next() {
		var (
			id          uuid.UUID
			pluginName  string
			decision    string
			reason      string
			createdAt   time.Time
			candidateID *int64
			examTitle   *string
		)
		if err := rows.Scan(&id, &pluginName, &decision, &reason, &createdAt, &candidateID, &examTitle); err != nil {
			rows.Close()
			writeError(w, http.StatusInternalServerError, "recent activity scan failed")
			return
		}
		target := ""
		if examTitle != nil {
			target = *examTitle
		}
		if candidateID != nil {
			if target != "" {
				target += " · "
			}
			target += "OB-" + padInt64(*candidateID, 5)
		}
		if target == "" {
			target = reason
		}
		out.RecentActivity = append(out.RecentActivity, dashboardActivityItem{
			ID:        id.String(),
			Actor:     pluginName,
			Action:    decision,
			Target:    target,
			Tone:      toneForDecision(decision),
			CreatedAt: createdAt.UTC().Format(time.RFC3339),
		})
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, "recent activity rows failed")
		return
	}

	// ── Series: submissions/day + proctor incidents/day (7 days) ──────
	rows, err = s.pool.Query(ctx, `
		WITH days AS (
		    SELECT generate_series(current_date - 6, current_date, interval '1 day')::date AS d
		)
		SELECT days.d,
		       (SELECT COUNT(*)::bigint FROM attempts a
		        WHERE a.submitted_at::date = days.d)             AS submissions,
		       (SELECT COUNT(*)::bigint FROM plugin_decisions pd
		        WHERE pd.created_at::date = days.d)              AS incidents
		FROM days
		ORDER BY days.d
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "series query failed")
		return
	}
	for rows.Next() {
		var (
			day         time.Time
			submissions int64
			incidents   int64
		)
		if err := rows.Scan(&day, &submissions, &incidents); err != nil {
			rows.Close()
			writeError(w, http.StatusInternalServerError, "series scan failed")
			return
		}
		label := day.Format("Mon")
		out.Series.SubmissionsPerDay = append(out.Series.SubmissionsPerDay, dashboardDayCount{Day: label, Count: submissions})
		out.Series.ProctorIncidentsPerDay = append(out.Series.ProctorIncidentsPerDay, dashboardDayCount{Day: label, Count: incidents})
		out.Series.SubmissionsWeekTotal += submissions
		out.Series.ProctorIncidentsWeek += incidents
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, "series rows failed")
		return
	}

	// ── Avg pass rate (last 7 days, evaluated attempts only) ──────────
	var passRate *float64
	if err := s.pool.QueryRow(ctx, `
		SELECT AVG(CASE WHEN ev.pass_score IS NOT NULL AND a.final_score IS NOT NULL
		                THEN CASE WHEN a.final_score >= ev.pass_score THEN 1.0 ELSE 0.0 END
		                ELSE NULL END)
		FROM attempts a
		JOIN exam_versions ev ON ev.id = a.exam_version_id
		WHERE a.status IN ('evaluated','published')
		  AND a.submitted_at > now() - interval '7 days'
	`).Scan(&passRate); err == nil {
		out.Series.AvgPassRateWeek = passRate
	}

	writeJSON(w, http.StatusOK, out)
}

func moduleLabelForAudience(audience string) string {
	switch audience {
	case "coding":
		return "Coding"
	case "aptitude":
		return "Aptitude"
	case "communication":
		return "Communication"
	case "mnc":
		return "MNC"
	case "role":
		return "Role-based"
	default:
		return "General"
	}
}

func uiStatusForExamVersion(raw string) string {
	switch raw {
	case "published":
		return "live"
	case "scheduled":
		return "scheduled"
	default:
		return "draft"
	}
}

func toneForDecision(decision string) string {
	switch decision {
	case "auto_terminate", "block", "fail":
		return "red"
	case "warning", "warn", "pause", "auto_pause":
		return "amber"
	case "pass", "approve", "submit", "submitted":
		return "green"
	case "info", "sync", "synced":
		return "blue"
	default:
		return "neutral"
	}
}

func padInt64(v int64, width int) string {
	if v < 0 {
		v = -v
	}
	return fmt.Sprintf("%0*d", width, v)
}
