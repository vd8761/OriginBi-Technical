package handlers

import (
	"errors"
	"log"
	"net/http"

	"tech-assessment-engine/internal/middleware"
	"tech-assessment-engine/internal/models"
	"tech-assessment-engine/internal/service"

	"github.com/gin-gonic/gin"
)

type AssessmentHandler struct {
	service *service.AssessmentService
}

func NewAssessmentHandler() *AssessmentHandler {
	return &AssessmentHandler{
		service: service.NewAssessmentService(),
	}
}

func (h *AssessmentHandler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"service": "tech-assessment-engine",
	})
}

// authedUserID pulls the identity established by the auth middleware. A miss
// means the route was mounted without RequireAuth, which must never ship.
func authedUserID(c *gin.Context) (int64, bool) {
	userID, ok := middleware.UserID(c)
	if !ok {
		log.Printf("BUG: %s %s reached a handler without RequireAuth", c.Request.Method, c.Request.URL.Path)
		c.AbortWithStatusJSON(http.StatusInternalServerError,
			gin.H{"success": false, "error": "internal error"})
		return 0, false
	}
	return userID, true
}

// fail maps a service error to a response. Ownership and lookup failures get
// specific status codes; anything else is logged in full and reported to the
// caller generically, so raw SQL never reaches a client.
func fail(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrAttemptNotFound):
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "attempt not found"})
	case errors.Is(err, service.ErrAttemptForbidden):
		c.JSON(http.StatusForbidden, gin.H{"success": false, "error": "this attempt belongs to another user"})
	case errors.Is(err, service.ErrModuleUnsupported):
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "unknown assessment module"})
	case errors.Is(err, service.ErrAssessmentNotFound):
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "no active assessment for this module"})
	default:
		log.Printf("assessment error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "internal error"})
	}
}

func (h *AssessmentHandler) GetAttemptsStats(c *gin.Context) {
	userID, ok := authedUserID(c)
	if !ok {
		return
	}

	stats, err := h.service.GetAttemptsStats(userID)
	if err != nil {
		fail(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

func (h *AssessmentHandler) StartAttempt(c *gin.Context) {
	userID, ok := authedUserID(c)
	if !ok {
		return
	}

	module := c.Param("module")
	var req models.StartAttemptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "invalid request payload",
		})
		return
	}

	res, err := h.service.StartAttempt(module, userID, req)
	if err != nil {
		fail(c, err)
		return
	}

	c.JSON(http.StatusOK, res)
}

func (h *AssessmentHandler) GetAttemptQuestions(c *gin.Context) {
	userID, ok := authedUserID(c)
	if !ok {
		return
	}

	res, err := h.service.GetAttemptQuestions(c.Param("module"), c.Param("token"), userID)
	if err != nil {
		fail(c, err)
		return
	}

	c.JSON(http.StatusOK, res)
}

func (h *AssessmentHandler) SubmitAttempt(c *gin.Context) {
	userID, ok := authedUserID(c)
	if !ok {
		return
	}

	module := c.Param("module")
	token := c.Param("token")

	// The incoming payload can be a direct map or wrapper with "answers" key
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "invalid answer payload",
		})
		return
	}

	// Try unpacking answers key if present
	answersMap := body
	if wrap, ok := body["answers"]; ok {
		if unpacked, ok := wrap.(map[string]interface{}); ok {
			answersMap = unpacked
		}
	}

	res, err := h.service.SubmitAttempt(module, token, userID, answersMap)
	if err != nil {
		fail(c, err)
		return
	}

	c.JSON(http.StatusOK, res)
}
