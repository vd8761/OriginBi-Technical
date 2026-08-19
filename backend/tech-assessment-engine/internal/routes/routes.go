package routes

import (
	"net/http"
	"strings"

	"tech-assessment-engine/internal/auth"
	"tech-assessment-engine/internal/handlers"
	"tech-assessment-engine/internal/middleware"

	"github.com/gin-gonic/gin"
)

// SetupRouter builds the HTTP router. The verifier is required: without it
// there is no way to authenticate a caller, so main refuses to boot rather
// than serving the assessment API unprotected.
func SetupRouter(verifier *auth.CognitoVerifier, allowedOrigins string) *gin.Engine {
	r := gin.Default()

	r.Use(corsMiddleware(parseOrigins(allowedOrigins)))

	handler := handlers.NewAssessmentHandler()

	// Unauthenticated: liveness only, no data.
	r.GET("/health", handler.HealthCheck)

	// Assessment core routing group. Every route here is authenticated and
	// acts on the caller's own identity.
	api := r.Group("/api/assessment", middleware.RequireAuth(verifier))
	{
		api.GET("/attempts-stats", handler.GetAttemptsStats)
		api.POST("/:module/attempts", handler.StartAttempt)
		api.GET("/:module/attempts/:token/questions", handler.GetAttemptQuestions)
		api.POST("/:module/attempts/:token/submit", handler.SubmitAttempt)
	}

	return r
}

func parseOrigins(raw string) map[string]bool {
	out := make(map[string]bool)
	for _, o := range strings.Split(raw, ",") {
		if o = strings.TrimSpace(o); o != "" {
			out[o] = true
		}
	}
	return out
}

// corsMiddleware reflects only allowlisted origins. The previous wildcard
// (`Allow-Origin: *` alongside `Allow-Credentials: true`) is not a valid
// combination and let any site on the internet call this API.
func corsMiddleware(allowed map[string]bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin != "" && allowed[origin] {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			c.Writer.Header().Add("Vary", "Origin")
		}
		c.Writer.Header().Set("Access-Control-Allow-Headers",
			"Authorization, Content-Type, Accept, Origin, X-Requested-With, Cache-Control")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		// Reject cross-origin state changes from origins we do not trust.
		if origin != "" && !allowed[origin] && c.Request.Method != http.MethodGet {
			c.AbortWithStatusJSON(http.StatusForbidden,
				gin.H{"success": false, "error": "origin not allowed"})
			return
		}

		c.Next()
	}
}
