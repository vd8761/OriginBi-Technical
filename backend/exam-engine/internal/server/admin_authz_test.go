package server

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"regexp"
	"strings"
	"testing"

	"github.com/originbi/exam-engine/internal/auth"
)

// TestAdminRoutesAreInsideAdminOnlyGroup guards the invariant that let three
// admin endpoints ship unprotected: admin authorization used to be an opt-in
// call inside each handler, so a route whose author forgot the call was served
// to any authenticated candidate. listActiveAttemptsForProctoring — the live
// feed of every candidate currently sitting an exam — was one of them.
//
// The router now wraps the whole group in adminOnly. This test reads the route
// table in server.go and fails if any /admin route is registered outside that
// group, which is exactly the mistake that is easy to make and invisible in
// review.
func TestAdminRoutesAreInsideAdminOnlyGroup(t *testing.T) {
	src, err := os.ReadFile("server.go")
	if err != nil {
		t.Fatalf("read server.go: %v", err)
	}
	text := string(src)

	const guard = "r.Use(s.adminOnly)"
	guardIdx := strings.Index(text, guard)
	if guardIdx < 0 {
		t.Fatalf("the admin route group no longer calls %s — admin authorization is not enforced at the router", guard)
	}

	// Extent of the group: from the guard to the brace that closes it, tracked
	// by depth so a nested block cannot end the group early.
	depth := 1
	end := -1
	for i := guardIdx + len(guard); i < len(text); i++ {
		switch text[i] {
		case '{':
			depth++
		case '}':
			depth--
			if depth == 0 {
				end = i
			}
		}
		if end >= 0 {
			break
		}
	}
	if end < 0 {
		t.Fatal("could not find the end of the adminOnly group")
	}

	routeRe := regexp.MustCompile(`r\.(?:Get|Post|Put|Patch|Delete|Head|Options)\("(/admin[^"]*)"`)
	var outside []string
	for _, m := range routeRe.FindAllStringSubmatchIndex(text, -1) {
		start := m[0]
		route := text[m[2]:m[3]]
		if start < guardIdx || start > end {
			outside = append(outside, route)
		}
	}

	if len(outside) > 0 {
		t.Fatalf("these /admin routes are registered outside the adminOnly group and are reachable by any authenticated user: %v", outside)
	}
}

// TestAdminOnlyRejectsUnauthenticated covers the middleware itself. An empty
// context carries no principal, so the request must be refused before it can
// reach a handler.
func TestAdminOnlyRejectsUnauthenticated(t *testing.T) {
	srv := New(nil, slog.New(slog.NewTextHandler(io.Discard, nil)))

	called := false
	handler := srv.adminOnly(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		called = true
	}))

	req := httptest.NewRequest(http.MethodGet, "/v1/admin/questions", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 without a principal, got %d", rec.Code)
	}
	if called {
		t.Fatal("admin handler ran for an unauthenticated request")
	}
}

// TestPrincipalCarriesAdminFlag pins the principal plumbing the middleware
// depends on: IsAdmin has to survive the trip through the request context.
// It was present on the session DTO for a long time but never reached the
// principal, which is part of why nothing enforced it.
func TestPrincipalCarriesAdminFlag(t *testing.T) {
	ctx := auth.WithPrincipal(context.Background(), auth.Principal{UserID: 7, IsAdmin: true})
	got, err := auth.Require(ctx)
	if err != nil {
		t.Fatalf("expected a principal, got error: %v", err)
	}
	if !got.IsAdmin {
		t.Fatal("IsAdmin did not survive the context round-trip")
	}

	ctx = auth.WithPrincipal(context.Background(), auth.Principal{UserID: 8})
	if got, _ = auth.Require(ctx); got.IsAdmin {
		t.Fatal("a principal with no admin role must not report IsAdmin")
	}
}
