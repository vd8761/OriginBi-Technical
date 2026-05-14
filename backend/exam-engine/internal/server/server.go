// Package server wires the HTTP router, middleware, and runtime handlers.
package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/originbi/exam-engine/internal/auth"
	"github.com/originbi/exam-engine/internal/db"
	"github.com/originbi/exam-engine/internal/pluginhost"
	assessmentcoding "github.com/originbi/exam-engine/plugins/assessment-coding"
	evaluationllm "github.com/originbi/exam-engine/plugins/evaluation-llm"
)

type Server struct {
	pool            *db.Pool
	logger          *slog.Logger
	router          chi.Router
	limiter         *rateLimiter
	codeRunSem      chan struct{}
	judgeHTTPClient *http.Client
	cognito         *auth.CognitoVerifier
	defaultOrgID    string
	// plugins is set by AttachPluginRegistry after server.New. Handlers must
	// handle nil for compat with tests that don't bootstrap a registry.
	plugins *pluginhost.Registry
}

// AttachPluginRegistry binds an in-memory plugin registry to the server and
// registers the in-process action handlers owned by assessment.coding.
func (s *Server) AttachPluginRegistry(r *pluginhost.Registry) error {
	s.plugins = r
	if r == nil {
		return nil
	}
	if err := r.RegisterAction(assessmentcoding.Slug, assessmentcoding.ActionRunCustom, s.handleCodingAction); err != nil {
		return err
	}
	if err := r.RegisterAction(assessmentcoding.Slug, assessmentcoding.ActionRunTests, s.handleCodingAction); err != nil {
		return err
	}
	if err := r.RegisterAction(assessmentcoding.Slug, assessmentcoding.ActionSubmit, s.handleCodingAction); err != nil {
		return err
	}
	if err := evaluationllm.Register(r); err != nil {
		return err
	}
	return nil
}

func New(pool *db.Pool, logger *slog.Logger, opts ...any) *Server {
	var cognito *auth.CognitoVerifier
	var defaultOrgID string
	if len(opts) > 0 {
		cognito, _ = opts[0].(*auth.CognitoVerifier)
	}
	if len(opts) > 1 {
		defaultOrgID, _ = opts[1].(string)
	}
	s := &Server{
		pool:         pool,
		logger:       logger,
		cognito:      cognito,
		defaultOrgID: defaultOrgID,
		limiter:      newRateLimiter(),
		codeRunSem:   make(chan struct{}, envInt("JUDGE0_MAX_CONCURRENCY", 12)),
		judgeHTTPClient: &http.Client{
			Timeout: envDurationSeconds("JUDGE0_HTTP_TIMEOUT_SECONDS", 95*time.Second),
			Transport: &http.Transport{
				MaxIdleConns:        envInt("JUDGE0_MAX_IDLE_CONNS", 100),
				MaxIdleConnsPerHost: envInt("JUDGE0_MAX_IDLE_CONNS_PER_HOST", 32),
				IdleConnTimeout:     envDurationSeconds("JUDGE0_IDLE_CONN_TIMEOUT_SECONDS", 90*time.Second),
			},
		},
	}
	s.router = s.routes()
	return s
}

func (s *Server) Handler() http.Handler { return s.router }

func (s *Server) routes() chi.Router {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(120 * time.Second))
	r.Use(s.cors)
	r.Use(s.logRequests)
	r.Use(s.rejectBadOrigin)

	r.Get("/healthz", s.healthz)
	r.Get("/readyz", s.readyz)

	// Authenticated runtime API. The two highest-throughput endpoints are
	// heartbeat and events ingest, designed first per the schema plan.
	r.Route("/v1", func(r chi.Router) {
		r.Post("/auth/register", s.register)
		r.Post("/auth/login", s.login)
		r.Post("/admin/bootstrap", s.bootstrapAdmin)

		r.Group(func(r chi.Router) {
			r.Use(s.sessionMiddleware)
			r.Post("/auth/logout", s.logout)
			r.Get("/auth/session", s.session)
			r.Get("/me/registration", s.getRegistration)
			r.Put("/me/registration", s.updateRegistration)
			r.Get("/me/assignments", s.listAssignments)
			r.Get("/me/languages", s.meLanguages)
			r.Post("/purchases/demo", s.demoPurchase)
			r.Post("/attempts/start", s.startAttempt)
			r.Get("/attempts/{attempt_id}/snapshot", s.attemptSnapshot)
			r.Put("/attempts/{attempt_id}/answers/{exam_question_id}", s.saveAnswer)
			r.Post("/attempts/{attempt_id}/answers/{exam_question_id}/runs", s.runCode)
			r.Post("/attempts/{attempt_id}/submit", s.submitAttempt)
			r.Post("/attempts/{attempt_id}/heartbeat", s.heartbeat)
			r.Post("/attempts/{attempt_id}/events", s.ingestEvents)
			r.Get("/admin/questions", s.listAdminQuestions)
			r.Post("/admin/questions", s.createAdminQuestion)
			r.Post("/admin/questions/bulk-import", s.bulkImportAdminQuestions)
			r.Get("/admin/questions/{question_id}", s.getAdminQuestion)
			r.Put("/admin/questions/{question_id}", s.updateAdminQuestion)
			r.Delete("/admin/questions/{question_id}", s.deleteAdminQuestion)
			r.Get("/admin/questions/{question_id}/test-cases", s.listAdminQuestionTestCases)
			r.Post("/admin/questions/{question_id}/test-cases", s.appendAdminQuestionTestCase)
			r.Put("/admin/questions/{question_id}/test-cases/{tc_id}", s.updateAdminQuestionTestCase)
			r.Delete("/admin/questions/{question_id}/test-cases/{tc_id}", s.deleteAdminQuestionTestCase)
			r.Get("/admin/plugins", s.listPlugins)
			r.Post("/admin/plugins", s.createPlugin)
			r.Get("/admin/plugins/{plugin_id}", s.getPlugin)
			r.Put("/admin/plugins/{plugin_id}", s.updatePlugin)
			r.Put("/admin/plugins/{plugin_id}/state", s.updatePluginState)
			r.Get("/admin/plugins/{plugin_id}/dependents", s.pluginDependentsHandler)
			r.Get("/admin/exam-packages", s.listExamPackages)
			r.Post("/admin/exam-packages", s.createExamPackage)
			r.Get("/admin/exam-packages/{pkg_id}", s.getExamPackage)
			r.Put("/admin/exam-packages/{pkg_id}", s.updateExamPackage)
			r.Post("/admin/pricing-items", s.createPricingItem)
			r.Get("/admin/users/{user_id}/entitlements", s.adminUserEntitlements)
			r.Get("/admin/judge0/health", s.judge0Health)
		})
	})

	return r
}

func (s *Server) healthz(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) readyz(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := contextWithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if err := s.pool.Ping(ctx); err != nil {
		writeJSON(w, http.StatusServiceUnavailable,
			map[string]string{"status": "db unreachable", "error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ready"})
}

func (s *Server) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if isAllowedOrigin(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Requested-With, Authorization, X-User-Id, X-Org-Id")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) rejectBadOrigin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !isUnsafeMethod(r.Method) {
			next.ServeHTTP(w, r)
			return
		}
		origin := r.Header.Get("Origin")
		if origin != "" && !isAllowedOrigin(origin) {
			writeError(w, http.StatusForbidden, "origin not allowed")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func isAllowedOrigin(origin string) bool {
	origin = strings.TrimSpace(origin)
	if origin == "" {
		return false
	}
	if configured := configuredAllowedOrigins(); len(configured) > 0 {
		for _, allowed := range configured {
			if origin == allowed {
				return true
			}
		}
		return false
	}
	return strings.HasPrefix(origin, "http://localhost:") ||
		strings.HasPrefix(origin, "http://127.0.0.1:")
}

func configuredAllowedOrigins() []string {
	raw := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS"))
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		if v := strings.TrimSpace(part); v != "" {
			origins = append(origins, strings.TrimRight(v, "/"))
		}
	}
	return origins
}

func isUnsafeMethod(method string) bool {
	switch method {
	case http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
		return true
	default:
		return false
	}
}

// logRequests emits a minimal structured access log per request.
func (s *Server) logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
		next.ServeHTTP(ww, r)
		s.logger.Info("http",
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
			slog.Int("status", ww.Status()),
			slog.Int("bytes", ww.BytesWritten()),
			slog.Duration("dur", time.Since(start)),
			slog.String("rid", middleware.GetReqID(r.Context())),
		)
	})
}

// ---------------- helpers ----------------

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

const (
	maxAuthBodyBytes    = 64 << 10
	maxRuntimeBodyBytes = 1 << 20
	maxCodeRunBodyBytes = 2 << 20
)

func decodeJSON(w http.ResponseWriter, r *http.Request, dst any, limit int64) bool {
	r.Body = http.MaxBytesReader(w, r.Body, limit)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		var maxErr *http.MaxBytesError
		if errors.As(err, &maxErr) {
			writeError(w, http.StatusRequestEntityTooLarge, "request body too large")
			return false
		}
		writeError(w, http.StatusBadRequest, "invalid body")
		return false
	}
	if err := dec.Decode(&struct{}{}); err != io.EOF {
		writeError(w, http.StatusBadRequest, "invalid body")
		return false
	}
	return true
}

func envBool(name string, fallback bool) bool {
	raw := strings.TrimSpace(os.Getenv(name))
	if raw == "" {
		return fallback
	}
	v, err := strconv.ParseBool(raw)
	if err != nil {
		return fallback
	}
	return v
}

func envInt(name string, fallback int) int {
	raw := strings.TrimSpace(os.Getenv(name))
	if raw == "" {
		return fallback
	}
	v, err := strconv.Atoi(raw)
	if err != nil || v <= 0 {
		return fallback
	}
	return v
}

func envDurationSeconds(name string, fallback time.Duration) time.Duration {
	raw := strings.TrimSpace(os.Getenv(name))
	if raw == "" {
		return fallback
	}
	v, err := strconv.Atoi(raw)
	if err != nil || v <= 0 {
		return fallback
	}
	return time.Duration(v) * time.Second
}

func secureCookies() bool {
	if strings.TrimSpace(os.Getenv("COOKIE_SECURE")) != "" {
		return envBool("COOKIE_SECURE", false)
	}
	return strings.EqualFold(os.Getenv("APP_ENV"), "production")
}

func cookieDomain() string {
	return strings.TrimSpace(os.Getenv("COOKIE_DOMAIN"))
}

func sameSiteMode() http.SameSite {
	switch strings.ToLower(strings.TrimSpace(os.Getenv("COOKIE_SAMESITE"))) {
	case "strict":
		return http.SameSiteStrictMode
	case "none":
		return http.SameSiteNoneMode
	default:
		return http.SameSiteLaxMode
	}
}

func tooManyRequestsMessage(limit int, window time.Duration) string {
	return fmt.Sprintf("too many requests; limit %d per %s", limit, window.Round(time.Second))
}
