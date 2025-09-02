package handlers

import (
	"ai-project-backend/database"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// UserStatsHandler handles user statistics operations
type UserStatsHandler struct {
	userStatsRepo *database.UserStatsRepository
}

// NewUserStatsHandler creates a new user statistics handler
func NewUserStatsHandler(userStatsRepo *database.UserStatsRepository) *UserStatsHandler {
	return &UserStatsHandler{
		userStatsRepo: userStatsRepo,
	}
}

// GetBasicStats handles GET /api/v1/users/stats/basic
func (h *UserStatsHandler) GetBasicStats(c *gin.Context) {
	stats, err := h.userStatsRepo.GetBasicStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to retrieve basic user statistics",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// GetRoleStats handles GET /api/v1/users/stats/roles
func (h *UserStatsHandler) GetRoleStats(c *gin.Context) {
	stats, err := h.userStatsRepo.GetRoleStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to retrieve role statistics",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// GetUserActivity handles GET /api/v1/users/stats/activity
func (h *UserStatsHandler) GetUserActivity(c *gin.Context) {
	// Parse pagination parameters
	page := 1
	pageSize := 20

	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if pageSizeStr := c.Query("page_size"); pageSizeStr != "" {
		if ps, err := strconv.Atoi(pageSizeStr); err == nil && ps > 0 && ps <= 100 {
			pageSize = ps
		}
	}

	offset := (page - 1) * pageSize

	activities, err := h.userStatsRepo.GetUserActivity(pageSize, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to retrieve user activity statistics",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"data":      activities,
		"page":      page,
		"page_size": pageSize,
		"total":     len(activities), // Note: This is the page size, not total count
	})
}

// GetCompanyStats handles GET /api/v1/users/stats/companies
func (h *UserStatsHandler) GetCompanyStats(c *gin.Context) {
	stats, err := h.userStatsRepo.GetCompanyStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to retrieve company statistics",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// GetRegistrationTrends handles GET /api/v1/users/stats/trends
func (h *UserStatsHandler) GetRegistrationTrends(c *gin.Context) {
	trends, err := h.userStatsRepo.GetRegistrationTrends()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to retrieve registration trends",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    trends,
	})
}

// GetUserPerformance handles GET /api/v1/users/stats/performance
func (h *UserStatsHandler) GetUserPerformance(c *gin.Context) {
	// Parse pagination parameters
	page := 1
	pageSize := 20

	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if pageSizeStr := c.Query("page_size"); pageSizeStr != "" {
		if ps, err := strconv.Atoi(pageSizeStr); err == nil && ps > 0 && ps <= 100 {
			pageSize = ps
		}
	}

	offset := (page - 1) * pageSize

	performances, err := h.userStatsRepo.GetUserPerformance(pageSize, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to retrieve user performance statistics",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"data":      performances,
		"page":      page,
		"page_size": pageSize,
		"total":     len(performances),
	})
}

// GetTopPerformers handles GET /api/v1/users/stats/top-performers
func (h *UserStatsHandler) GetTopPerformers(c *gin.Context) {
	// Parse limit parameter (default 10)
	limit := 10
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 50 {
			limit = l
		}
	}

	performers, err := h.userStatsRepo.GetTopPerformers(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to retrieve top performers",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    performers,
		"limit":   limit,
	})
}

// GetDashboardStats handles GET /api/v1/users/stats/dashboard
// Returns a combined view of key statistics for dashboard display
func (h *UserStatsHandler) GetDashboardStats(c *gin.Context) {
	// Get basic stats
	basicStats, err := h.userStatsRepo.GetBasicStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to retrieve dashboard statistics",
			"details": err.Error(),
		})
		return
	}

	// Get top 5 performers
	topPerformers, err := h.userStatsRepo.GetTopPerformers(5)
	if err != nil {
		// Log error but don't fail the request
		topPerformers = []database.UserPerformance{}
	}

	// Get recent registration trends (last 4 weeks)
	trends, err := h.userStatsRepo.GetRegistrationTrends()
	if err != nil {
		// Log error but don't fail the request
		trends = []database.RegistrationTrend{}
	}

	// Limit trends to last 4 weeks
	if len(trends) > 4 {
		trends = trends[:4]
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"basic_stats":    basicStats,
			"top_performers": topPerformers,
			"recent_trends":  trends,
		},
	})
}

// GetActiveUsersCount handles GET /api/v1/users/stats/active-count?days=N
func (h *UserStatsHandler) GetActiveUsersCount(c *gin.Context) {
	// Parse days parameter (default 30)
	days := 30
	if daysStr := c.Query("days"); daysStr != "" {
		if d, err := strconv.Atoi(daysStr); err == nil && d > 0 {
			days = d
		}
	}

	count, err := h.userStatsRepo.GetActiveUsersCount(days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to retrieve active users count",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"active_users_count": count,
			"period_days":        days,
		},
	})
}
