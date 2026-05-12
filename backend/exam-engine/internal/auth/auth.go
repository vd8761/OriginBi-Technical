// Package auth carries the authenticated principal through request context.
//
// v1 trusts the upstream NestJS gateway: the gateway validates the JWT and
// forwards X-User-Id and X-Org-Id headers. Replace with real JWT parsing
// when this engine is exposed directly to the public internet.
package auth

import (
	"context"
	"errors"
	"net/http"
	"strconv"
)

type Principal struct {
	UserID int64
	OrgID  string // UUID string of the org the request is acting on behalf of
}

type ctxKey struct{}

func WithPrincipal(ctx context.Context, p Principal) context.Context {
	return context.WithValue(ctx, ctxKey{}, p)
}

func FromContext(ctx context.Context) (Principal, bool) {
	p, ok := ctx.Value(ctxKey{}).(Principal)
	return p, ok
}

// Middleware extracts the principal from trusted gateway headers.
// Returns 401 if the user header is missing or malformed.
func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		uidStr := r.Header.Get("X-User-Id")
		if uidStr == "" {
			http.Error(w, "missing X-User-Id", http.StatusUnauthorized)
			return
		}
		uid, err := strconv.ParseInt(uidStr, 10, 64)
		if err != nil || uid <= 0 {
			http.Error(w, "invalid X-User-Id", http.StatusUnauthorized)
			return
		}
		p := Principal{
			UserID: uid,
			OrgID:  r.Header.Get("X-Org-Id"),
		}
		ctx := WithPrincipal(r.Context(), p)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// Require pulls the principal or returns an error suitable for handlers.
func Require(ctx context.Context) (Principal, error) {
	p, ok := FromContext(ctx)
	if !ok {
		return Principal{}, errors.New("unauthenticated")
	}
	return p, nil
}
