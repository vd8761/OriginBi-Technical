// Request authentication for the tech assessment engine.
//
// Every /api/assessment route is authenticated: the caller presents a Cognito
// access token and the local users.id is resolved from it server-side. The
// user identity is NEVER taken from the request body or query string — doing
// so previously allowed any caller to start and submit an exam as any user.
package middleware

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"tech-assessment-engine/internal/auth"
	"tech-assessment-engine/internal/repository"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// contextUserIDKey is the gin context key holding the authenticated users.id.
const contextUserIDKey = "auth.userID"

// RequireAuth verifies the bearer token and pins the resolved local user id
// onto the request context. Requests without a valid token are rejected.
func RequireAuth(verifier *auth.CognitoVerifier) gin.HandlerFunc {
	return func(c *gin.Context) {
		token, err := bearerToken(c.Request.Header.Get("Authorization"))
		if err != nil {
			abortUnauthorized(c, "missing or malformed Authorization header")
			return
		}

		ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
		defer cancel()

		claims, err := verifier.Verify(ctx, token)
		if err != nil {
			// The verification failure reason is deliberately not echoed to the
			// caller; it is useful to an attacker probing token handling.
			abortUnauthorized(c, "invalid or expired token")
			return
		}

		userID, err := resolveLocalUser(repository.GetDB(), claims)
		if err != nil {
			// Authenticated against Cognito but no local record. This is a
			// provisioning gap, not a credential problem.
			abortStatus(c, http.StatusForbidden, "no account provisioned for this user on the technical platform")
			return
		}

		c.Set(contextUserIDKey, userID)
		c.Next()
	}
}

// UserID returns the authenticated user id pinned by RequireAuth. The bool is
// false when the route was not wrapped in RequireAuth, which is a programming
// error rather than a runtime condition.
func UserID(c *gin.Context) (int64, bool) {
	v, ok := c.Get(contextUserIDKey)
	if !ok {
		return 0, false
	}
	id, ok := v.(int64)
	return id, ok
}

func bearerToken(header string) (string, error) {
	if header == "" {
		return "", errors.New("missing Authorization header")
	}
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || strings.TrimSpace(parts[1]) == "" {
		return "", errors.New("malformed Authorization header")
	}
	return strings.TrimSpace(parts[1]), nil
}

// resolveLocalUser maps Cognito claims onto a local users row.
//
// Matching prefers cognito_sub. Older rows were created with an empty sub, so
// we fall back to an email match on those only, then backfill the sub so the
// next request takes the fast path. This mirrors exam-engine's userFromBearer.
func resolveLocalUser(db *gorm.DB, claims *auth.CognitoClaims) (int64, error) {
	identity := strings.TrimSpace(claims.Email)
	if identity == "" {
		identity = strings.TrimSpace(claims.Username)
	}

	var userID int64
	err := db.Raw(`
		SELECT id
		FROM users
		WHERE (
		        cognito_sub = ?
		        OR (
		            ? <> ''
		            AND lower(COALESCE(email, '')) = lower(?)
		            AND COALESCE(cognito_sub, '') = ''
		        )
		      )
		  AND is_active = TRUE
		  AND is_blocked = FALSE
		ORDER BY CASE WHEN cognito_sub = ? THEN 0 ELSE 1 END, id
		LIMIT 1
	`, claims.Sub, identity, identity, claims.Sub).Scan(&userID).Error
	if err != nil {
		return 0, err
	}
	if userID == 0 {
		return 0, errors.New("no local user for cognito subject")
	}

	if identity != "" {
		// Best effort: a failed backfill only costs us the slow path next time.
		_ = db.Exec(`
			UPDATE users
			SET cognito_sub = ?, updated_at = now()
			WHERE id = ? AND COALESCE(cognito_sub, '') = ''
		`, claims.Sub, userID).Error
	}

	return userID, nil
}

func abortUnauthorized(c *gin.Context, message string) {
	abortStatus(c, http.StatusUnauthorized, message)
}

func abortStatus(c *gin.Context, status int, message string) {
	c.AbortWithStatusJSON(status, gin.H{"success": false, "error": message})
}
