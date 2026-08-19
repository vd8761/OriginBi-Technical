package server

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestAllowedOrigins(t *testing.T) {
	t.Setenv("ALLOWED_ORIGINS", "")
	if !isAllowedOrigin("http://localhost:3000") {
		t.Fatal("expected localhost origin to be allowed by local default")
	}
	if isAllowedOrigin("https://example.com") {
		t.Fatal("expected arbitrary origin to be blocked without explicit allowlist")
	}

	t.Setenv("ALLOWED_ORIGINS", "https://app.example.com, http://localhost:3000/")
	if !isAllowedOrigin("https://app.example.com") {
		t.Fatal("expected configured production origin to be allowed")
	}
	if !isAllowedOrigin("http://localhost:3000") {
		t.Fatal("expected configured localhost origin to be allowed after trimming slash")
	}
	if isAllowedOrigin("http://localhost:3001") {
		t.Fatal("expected non-configured localhost port to be blocked when allowlist is set")
	}
}

func TestSessionCookieDeploymentControls(t *testing.T) {
	expires := time.Now().Add(time.Hour)

	t.Setenv("APP_ENV", "production")
	t.Setenv("COOKIE_SECURE", "")
	t.Setenv("COOKIE_DOMAIN", "example.com")
	t.Setenv("COOKIE_SAMESITE", "strict")
	rec := httptest.NewRecorder()
	setSessionCookie(rec, "token", expires)
	cookie := rec.Result().Cookies()[0]
	if !cookie.Secure {
		t.Fatal("expected production cookie to be secure")
	}
	if cookie.Domain != "example.com" {
		t.Fatalf("expected configured cookie domain, got %q", cookie.Domain)
	}
	if cookie.SameSite != http.SameSiteStrictMode {
		t.Fatalf("expected strict SameSite, got %v", cookie.SameSite)
	}

	t.Setenv("APP_ENV", "development")
	t.Setenv("COOKIE_SECURE", "false")
	t.Setenv("COOKIE_DOMAIN", "")
	t.Setenv("COOKIE_SAMESITE", "none")
	rec = httptest.NewRecorder()
	setSessionCookie(rec, "token", expires)
	cookie = rec.Result().Cookies()[0]
	if !cookie.Secure {
		t.Fatal("expected SameSite=None cookie to force Secure")
	}
	if cookie.SameSite != http.SameSiteNoneMode {
		t.Fatalf("expected none SameSite, got %v", cookie.SameSite)
	}
}

func TestAuthSessionRoutesRequireCookie(t *testing.T) {
	srv := New(nil, slog.New(slog.NewTextHandler(io.Discard, nil)))

	for _, tc := range []struct {
		method string
		path   string
	}{
		{method: http.MethodGet, path: "/v1/auth/session"},
		{method: http.MethodPost, path: "/v1/auth/logout"},
	} {
		req := httptest.NewRequest(tc.method, tc.path, nil)
		rec := httptest.NewRecorder()
		srv.Handler().ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("%s %s: expected 401, got %d", tc.method, tc.path, rec.Code)
		}
	}
}

func TestNormalizeRegistrationInput(t *testing.T) {
	req := registerRequest{
		Email:       " USER@example.COM ",
		Password:    "password123",
		Name:        " Jane Candidate ",
		Gender:      "",
		CountryCode: "+91",
		Phone:       "9876543210",
		Role:        "",
	}
	if err := normalizeRegistrationInput(&req, true); err != nil {
		t.Fatalf("expected valid registration, got %v", err)
	}
	if req.Email != "user@example.com" {
		t.Fatalf("expected normalized email, got %q", req.Email)
	}
	if req.Gender != "OTHER" || req.Role != "COLLEGE_STUDENT" {
		t.Fatalf("expected defaults, got gender=%q role=%q", req.Gender, req.Role)
	}

	req.Email = "not-an-email"
	if err := normalizeRegistrationInput(&req, true); err == nil {
		t.Fatal("expected invalid email to fail")
	}

	req.Email = "user@example.com"
	req.Password = "       "
	if err := normalizeRegistrationInput(&req, true); err == nil {
		t.Fatal("expected blank password to fail")
	}

	req.Password = "password123"
	req.Metadata = json.RawMessage("{")
	if err := normalizeRegistrationInput(&req, true); err == nil {
		t.Fatal("expected invalid metadata to fail")
	}
}

func TestValidateCodeRunRequest(t *testing.T) {
	req := codeRunRequest{
		Mode:     "custom",
		Language: "python",
		Files: []codeFileDTO{
			{Path: "solution.py", Content: "print('ok')"},
		},
	}
	if err := validateCodeRunRequest(&req, false); err != nil {
		t.Fatalf("expected valid code run, got %v", err)
	}
	if req.EntryFile != "solution.py" {
		t.Fatalf("expected entry file to default, got %q", req.EntryFile)
	}

	req.Mode = "final"
	if err := validateCodeRunRequest(&req, false); err == nil {
		t.Fatal("expected candidate final mode to fail")
	}
	if err := validateCodeRunRequest(&req, true); err != nil {
		t.Fatalf("expected internal final mode to pass, got %v", err)
	}
	req.Mode = "custom"

	req.Files = append(req.Files, codeFileDTO{Path: "solution.py", Content: "print('dupe')"})
	if err := validateCodeRunRequest(&req, false); err == nil {
		t.Fatal("expected duplicate paths to fail")
	}

	req.Files = []codeFileDTO{{Path: "../secret.py", Content: "print('bad')"}}
	req.EntryFile = "../secret.py"
	if err := validateCodeRunRequest(&req, false); err == nil {
		t.Fatal("expected path traversal to fail")
	}

	req.Files = []codeFileDTO{{Path: "solution.py", Content: strings.Repeat("x", maxCandidateSourceBytes+1)}}
	req.EntryFile = "solution.py"
	if err := validateCodeRunRequest(&req, false); err == nil {
		t.Fatal("expected large source to fail")
	}

	req.Files = []codeFileDTO{{Path: "solution.py", Content: "print('ok')"}}
	req.EntryFile = "missing.py"
	if err := validateCodeRunRequest(&req, false); err == nil {
		t.Fatal("expected missing entry file to fail")
	}
}

func TestRateLimiter(t *testing.T) {
	limiter := newRateLimiter()
	if !limiter.allow("key", 2, time.Minute) {
		t.Fatal("expected first request to pass")
	}
	if !limiter.allow("key", 2, time.Minute) {
		t.Fatal("expected second request to pass")
	}
	if limiter.allow("key", 2, time.Minute) {
		t.Fatal("expected third request to be limited")
	}
}

// TestNoAuthBypassHeaders guards a removed authentication bypass.
//
// sessionMiddleware used to grant a full session — admin routes included — to
// any request carrying `X-Bypass-Key: originbi-secret-testing` plus an
// `X-User-Id`, with no credential of any kind. It also honoured `X-User-Id`
// alone whenever ASSESSMENT_AUTH was not "on", which was the default. Both
// paths are gone; the dev bypass now needs an explicit DEV_AUTH_BYPASS opt-in
// and is refused in production.
func TestNoAuthBypassHeaders(t *testing.T) {
	srv := New(nil, slog.New(slog.NewTextHandler(io.Discard, nil)))

	for _, tc := range []struct {
		name    string
		headers map[string]string
	}{
		{
			name:    "hardcoded bypass key",
			headers: map[string]string{"X-Bypass-Key": "originbi-secret-testing", "X-User-Id": "1"},
		},
		{
			name:    "user id header alone",
			headers: map[string]string{"X-User-Id": "1"},
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			// Neither ASSESSMENT_AUTH nor DEV_AUTH_BYPASS is set: the default
			// must be to reject, not to trust the headers.
			t.Setenv("ASSESSMENT_AUTH", "")
			t.Setenv("DEV_AUTH_BYPASS", "")

			req := httptest.NewRequest(http.MethodGet, "/v1/admin/questions", nil)
			for k, v := range tc.headers {
				req.Header.Set(k, v)
			}
			rec := httptest.NewRecorder()
			srv.Handler().ServeHTTP(rec, req)

			if rec.Code != http.StatusUnauthorized {
				t.Fatalf("expected 401 for %s, got %d", tc.name, rec.Code)
			}
		})
	}
}

func TestDevBypassRefusedInProduction(t *testing.T) {
	t.Setenv("DEV_AUTH_BYPASS", "on")

	t.Setenv("APP_ENV", "production")
	if devBypassEnabled() {
		t.Fatal("dev auth bypass must never be available in production")
	}

	t.Setenv("APP_ENV", "development")
	if !devBypassEnabled() {
		t.Fatal("expected explicit opt-in to enable the bypass outside production")
	}

	t.Setenv("DEV_AUTH_BYPASS", "")
	if devBypassEnabled() {
		t.Fatal("bypass must be off by default, even in development")
	}
}
