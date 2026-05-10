package server

import (
	"encoding/json"
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

func TestBootstrapTokenMustBeConfigured(t *testing.T) {
	t.Setenv("BOOTSTRAP_ADMIN_TOKEN", "")
	if _, ok := bootstrapToken(); ok {
		t.Fatal("expected bootstrap to be disabled when token is unset")
	}

	t.Setenv("BOOTSTRAP_ADMIN_TOKEN", "secret")
	token, ok := bootstrapToken()
	if !ok || token != "secret" {
		t.Fatalf("expected configured token, got %q ok=%v", token, ok)
	}
	if !constantTimeEqual("secret", token) {
		t.Fatal("expected constant-time comparison to accept matching token")
	}
	if constantTimeEqual("wrong", token) {
		t.Fatal("expected constant-time comparison to reject non-matching token")
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
	if err := validateCodeRunRequest(&req); err != nil {
		t.Fatalf("expected valid code run, got %v", err)
	}
	if req.EntryFile != "solution.py" {
		t.Fatalf("expected entry file to default, got %q", req.EntryFile)
	}

	req.Files = append(req.Files, codeFileDTO{Path: "solution.py", Content: "print('dupe')"})
	if err := validateCodeRunRequest(&req); err == nil {
		t.Fatal("expected duplicate paths to fail")
	}

	req.Files = []codeFileDTO{{Path: "../secret.py", Content: "print('bad')"}}
	req.EntryFile = "../secret.py"
	if err := validateCodeRunRequest(&req); err == nil {
		t.Fatal("expected path traversal to fail")
	}

	req.Files = []codeFileDTO{{Path: "solution.py", Content: strings.Repeat("x", maxCandidateSourceBytes+1)}}
	req.EntryFile = "solution.py"
	if err := validateCodeRunRequest(&req); err == nil {
		t.Fatal("expected large source to fail")
	}

	req.Files = []codeFileDTO{{Path: "solution.py", Content: "print('ok')"}}
	req.EntryFile = "missing.py"
	if err := validateCodeRunRequest(&req); err == nil {
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
