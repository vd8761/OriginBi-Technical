package routes

import (
	"tech-assessment-engine/internal/handlers"

	"github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {
	r := gin.Default()

	// CORS Middleware matching NestJS perfectly
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, Accept")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	handler := handlers.NewAssessmentHandler()

	// Health Check
	r.GET("/health", handler.HealthCheck)

	// Assessment core routing group
	api := r.Group("/api/assessment")
	{
		api.GET("/attempts-stats", handler.GetAttemptsStats)
		api.POST("/:module/attempts", handler.StartAttempt)
		api.GET("/:module/attempts/:token/questions", handler.GetAttemptQuestions)
		api.POST("/:module/attempts/:token/submit", handler.SubmitAttempt)
	}

	return r
}
