package handlers

import (
	"net/http"
	"strconv"
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

func (h *AssessmentHandler) GetAttemptsStats(c *gin.Context) {
	userIdStr := c.Query("userId")
	var userIdPtr *int64

	if userIdStr != "" {
		userId, err := strconv.ParseInt(userIdStr, 10, 64)
		if err == nil {
			userIdPtr = &userId
		}
	}

	stats, err := h.service.GetAttemptsStats(userIdPtr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

func (h *AssessmentHandler) StartAttempt(c *gin.Context) {
	module := c.Param("module")
	var req models.StartAttemptRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request payload: " + err.Error(),
		})
		return
	}

	res, err := h.service.StartAttempt(module, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, res)
}

func (h *AssessmentHandler) GetAttemptQuestions(c *gin.Context) {
	token := c.Param("token")

	res, err := h.service.GetAttemptQuestions(token)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, res)
}

func (h *AssessmentHandler) SubmitAttempt(c *gin.Context) {
	module := c.Param("module")
	token := c.Param("token")

	// The incoming payload can be a direct map or wrapper with "answers" key
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid answer payload",
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

	res, err := h.service.SubmitAttempt(module, token, answersMap)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, res)
}
