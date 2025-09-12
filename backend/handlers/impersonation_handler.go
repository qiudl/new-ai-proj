package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"
	"github.com/gin-gonic/gin"
	"ai-project-backend/models"
	"ai-project-backend/utils"
)

type ImpersonationHandler struct {
	tokenService      TokenServiceInterface
	enterpriseService EnterpriseServiceInterface
	auditService      AuditServiceInterface
}

// Define interfaces for dependency injection
type TokenServiceInterface interface {
	GenerateImpersonationToken(originalClaims *models.ExtendedClaims, enterprise *models.Enterprise, reason string, ipAddress string) (string, error)
	GenerateNormalToken(userID int, username, role, userType string) (string, error)
	ParseToken(token string) (*models.ExtendedClaims, error)
}

type EnterpriseServiceInterface interface {
	GetEnterpriseByID(ctx context.Context, id int) (*models.Enterprise, error)
}

type AuditServiceInterface interface {
	LogEvent(ctx context.Context, data *models.AuditEventData) error
}

// NewImpersonationHandler 创建模拟处理器
func NewImpersonationHandler(
	tokenService TokenServiceInterface,
	enterpriseService EnterpriseServiceInterface,
	auditService AuditServiceInterface,
) *ImpersonationHandler {
	return &ImpersonationHandler{
		tokenService:      tokenService,
		enterpriseService: enterpriseService,
		auditService:      auditService,
	}
}

// ImpersonationRequest 模拟请求结构
type ImpersonationRequest struct {
	Reason string `json:"reason" binding:"required,min=10,max=500"`
}

// ImpersonationResponse 模拟响应结构
type ImpersonationResponse struct {
	Token      string                 `json:"token"`
	Enterprise EnterpriseInfo        `json:"enterprise"`
	Info       ImpersonationInfo     `json:"impersonation_info"`
	Message    string                 `json:"message"`
}

type EnterpriseInfo struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	Code string `json:"code"`
}

type ImpersonationInfo struct {
	OriginalUserID   int    `json:"original_user_id"`
	OriginalUsername string `json:"original_username"`
	ExpiresAt        string `json:"expires_at"`
	SessionID        string `json:"session_id"`
}

// StartImpersonation POST /api/v1/admin/impersonate/enterprise/:id
func (h *ImpersonationHandler) StartImpersonation(c *gin.Context) {
	// 1. 验证当前用户是系统管理员
	// 获取用户信息，优先从token_claims获取
	var userID int
	var username, role, userType string
	
	if tokenClaimsInterface, exists := c.Get("token_claims"); exists {
		if tokenClaims, ok := tokenClaimsInterface.(*utils.JWTClaims); ok {
			userID = tokenClaims.UserID
			username = tokenClaims.Username
			role = tokenClaims.Role
			userType = tokenClaims.UserType
		}
	}
	
	// 如果没有找到token_claims，尝试从claims获取（扩展claims）
	var extendedClaims *models.ExtendedClaims
	if userID == 0 {
		if claimsInterface, exists := c.Get("claims"); exists {
			if claims, ok := claimsInterface.(*models.ExtendedClaims); ok {
				extendedClaims = claims
				userID = claims.UserID
				username = claims.Username
				role = claims.Role
				userType = claims.UserType
			}
		}
	}
	
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "No authentication claims found",
		})
		return
	}
	
	if role != "admin" || userType != "system" {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Access denied",
			"message": "Only system administrators can impersonate enterprises",
		})
		return
	}
	
	// 2. 检查是否已经在模拟状态（仅当有扩展claims时检查）
	if extendedClaims != nil && extendedClaims.IsImpersonating() {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Already impersonating",
			"message": "Already in impersonation mode. Exit current session first.",
		})
		return
	}
	
	// 3. 获取目标企业ID
	enterpriseIDStr := c.Param("id")
	enterpriseID, err := strconv.Atoi(enterpriseIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid enterprise ID",
			"message": "Enterprise ID must be a valid integer",
		})
		return
	}
	
	// 4. 验证请求体
	var req ImpersonationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"message": err.Error(),
		})
		return
	}
	
	// 5. 获取目标企业信息
	enterprise, err := h.enterpriseService.GetEnterpriseByID(c.Request.Context(), enterpriseID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Enterprise not found",
			"message": fmt.Sprintf("Enterprise with ID %d not found", enterpriseID),
		})
		return
	}
	
	// 6. 创建ExtendedClaims（如果还没有的话）
	if extendedClaims == nil {
		extendedClaims = &models.ExtendedClaims{
			UserID:   userID,
			Username: username,
			Role:     role,
			UserType: userType,
		}
	}
	
	// 7. 生成模拟Token
	newToken, err := h.tokenService.GenerateImpersonationToken(
		extendedClaims,
		enterprise,
		req.Reason,
		c.ClientIP(),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to generate impersonation token",
			"message": err.Error(),
		})
		return
	}
	
	// 7. 解析新Token获取会话信息
	newClaims, err := h.tokenService.ParseToken(newToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to parse generated token",
		})
		return
	}
	
	// 8. 记录审计日志
	if h.auditService != nil {
		go h.auditService.LogEvent(c.Request.Context(), &models.AuditEventData{
			UserID:       &userID,
			UserName:     username,
			Action:       "impersonation_start",
			ResourceType: "enterprise",
			ResourceID:   fmt.Sprintf("%d", enterpriseID),
			Description:  fmt.Sprintf("Started impersonating enterprise %s (%s)", enterprise.Name, enterprise.Code),
			Status:       "success",
			Metadata: map[string]interface{}{
				"enterprise_name": enterprise.Name,
				"enterprise_code": enterprise.Code,
				"reason":         req.Reason,
				"session_id":     newClaims.ImpersonationContext.SessionID,
				"ip_address":     c.ClientIP(),
				"user_agent":     c.Request.UserAgent(),
				"expires_at":     newClaims.ImpersonationContext.ExpiresAt,
			},
		})
	}
	
	// 9. 返回响应
	response := ImpersonationResponse{
		Token: newToken,
		Enterprise: EnterpriseInfo{
			ID:   enterprise.ID,
			Name: enterprise.Name,
			Code: enterprise.Code,
		},
		Info: ImpersonationInfo{
			OriginalUserID:   userID,
			OriginalUsername: username,
			ExpiresAt:        newClaims.ImpersonationContext.ExpiresAt.Format(time.RFC3339),
			SessionID:        newClaims.ImpersonationContext.SessionID,
		},
		Message: fmt.Sprintf("Successfully switched to enterprise: %s", enterprise.Name),
	}
	
	c.JSON(http.StatusOK, response)
}

// ExitImpersonation POST /api/v1/admin/impersonate/exit
func (h *ImpersonationHandler) ExitImpersonation(c *gin.Context) {
	// 1. 获取当前Claims
	claims, exists := c.Get("claims")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "No authentication claims found",
		})
		return
	}
	
	extendedClaims, ok := claims.(*models.ExtendedClaims)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Invalid claims type",
		})
		return
	}
	
	// 2. 验证是否在模拟状态
	if !extendedClaims.IsImpersonating() {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Not impersonating",
			"message": "Not currently in impersonation mode",
		})
		return
	}
	
	ctx := extendedClaims.ImpersonationContext
	
	// 3. 生成原始用户的新Token
	originalToken, err := h.tokenService.GenerateNormalToken(
		ctx.OriginalUserID,
		ctx.OriginalUsername,
		ctx.OriginalRole,
		"system",
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to restore session",
			"message": err.Error(),
		})
		return
	}
	
	// 4. 记录审计日志
	if h.auditService != nil {
		duration := time.Since(ctx.StartedAt)
		go h.auditService.LogEvent(c.Request.Context(), &models.AuditEventData{
			UserID:       &ctx.OriginalUserID,
			UserName:     ctx.OriginalUsername,
			Action:       "impersonation_end",
			ResourceType: "enterprise",
			ResourceID:   fmt.Sprintf("%d", ctx.EnterpriseID),
			Description:  fmt.Sprintf("Exited impersonation of enterprise %s", ctx.EnterpriseName),
			Status:       "success",
			Metadata: map[string]interface{}{
				"session_id":        ctx.SessionID,
				"enterprise_name":   ctx.EnterpriseName,
				"duration_minutes":  duration.Minutes(),
				"original_reason":   ctx.Reason,
			},
		})
	}
	
	// 5. 返回原始Token
	c.JSON(http.StatusOK, gin.H{
		"token":   originalToken,
		"message": "Successfully exited impersonation mode",
		"original_user": gin.H{
			"id":       ctx.OriginalUserID,
			"username": ctx.OriginalUsername,
			"role":     ctx.OriginalRole,
		},
	})
}

// GetImpersonationStatus GET /api/v1/admin/impersonate/status
func (h *ImpersonationHandler) GetImpersonationStatus(c *gin.Context) {
	// 获取当前Claims
	claims, exists := c.Get("claims")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "No authentication claims found",
		})
		return
	}
	
	extendedClaims, ok := claims.(*models.ExtendedClaims)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Invalid claims type",
		})
		return
	}
	
	if !extendedClaims.IsImpersonating() {
		c.JSON(http.StatusOK, gin.H{
			"is_impersonating": false,
		})
		return
	}
	
	ctx := extendedClaims.ImpersonationContext
	
	c.JSON(http.StatusOK, gin.H{
		"is_impersonating": true,
		"enterprise": gin.H{
			"id":   ctx.EnterpriseID,
			"name": ctx.EnterpriseName,
			"code": ctx.EnterpriseCode,
		},
		"original_user": gin.H{
			"id":       ctx.OriginalUserID,
			"username": ctx.OriginalUsername,
			"role":     ctx.OriginalRole,
		},
		"session": gin.H{
			"id":         ctx.SessionID,
			"started_at": ctx.StartedAt.Format(time.RFC3339),
			"expires_at": ctx.ExpiresAt.Format(time.RFC3339),
			"reason":     ctx.Reason,
		},
	})
}

// GetImpersonationHistory GET /api/v1/admin/impersonate/history
func (h *ImpersonationHandler) GetImpersonationHistory(c *gin.Context) {
	// 获取当前用户
	claims, exists := c.Get("claims")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "No authentication claims found",
		})
		return
	}
	
	extendedClaims, ok := claims.(*models.ExtendedClaims)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Invalid claims type",
		})
		return
	}
	
	// 验证权限
	if extendedClaims.Role != "admin" || extendedClaims.UserType != "system" {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Access denied",
		})
		return
	}
	
	// 获取分页参数
	page := 1
	pageSize := 20
	
	if p := c.Query("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}
	
	if ps := c.Query("page_size"); ps != "" {
		if parsed, err := strconv.Atoi(ps); err == nil && parsed > 0 && parsed <= 100 {
			pageSize = parsed
		}
	}
	
	// 构建查询过滤条件
	filters := make(map[string]interface{})
	
	// 添加用户ID过滤（可选）
	if userID := c.Query("user_id"); userID != "" {
		if parsed, err := strconv.Atoi(userID); err == nil {
			filters["user_id"] = parsed
		}
	}
	
	// 添加企业ID过滤（可选）
	if enterpriseID := c.Query("enterprise_id"); enterpriseID != "" {
		if parsed, err := strconv.Atoi(enterpriseID); err == nil {
			filters["enterprise_id"] = parsed
		}
	}
	
	// 添加操作类型过滤
	if action := c.Query("action"); action != "" {
		filters["action"] = action
	}
	
	// 模拟历史数据（实际应该从审计服务获取）
	mockHistory := []gin.H{
		{
			"id":            1,
			"session_id":    "demo_session_001",
			"user_id":       1,
			"username":      "admin",
			"enterprise_id": 1,
			"enterprise_name": "示例企业",
			"action":        "start",
			"started_at":    time.Now().Add(-2 * time.Hour).Format(time.RFC3339),
			"ended_at":      time.Now().Add(-30 * time.Minute).Format(time.RFC3339),
			"duration_minutes": 90,
			"reason":        "系统测试和功能验证",
			"ip_address":    "127.0.0.1",
			"status":        "ended",
		},
		{
			"id":            2,
			"session_id":    "demo_session_002",
			"user_id":       1,
			"username":      "admin",
			"enterprise_id": 2,
			"enterprise_name": "测试企业B",
			"action":        "start",
			"started_at":    time.Now().Add(-1 * time.Hour).Format(time.RFC3339),
			"ended_at":      nil,
			"duration_minutes": 60,
			"reason":        "用户问题排查",
			"ip_address":    "127.0.0.1",
			"status":        "active",
		},
	}
	
	// 应用过滤条件
	var filteredHistory []gin.H
	for _, record := range mockHistory {
		include := true
		
		if userIDFilter, exists := filters["user_id"]; exists {
			if record["user_id"] != userIDFilter {
				include = false
			}
		}
		
		if enterpriseIDFilter, exists := filters["enterprise_id"]; exists {
			if record["enterprise_id"] != enterpriseIDFilter {
				include = false
			}
		}
		
		if actionFilter, exists := filters["action"]; exists {
			if record["action"] != actionFilter {
				include = false
			}
		}
		
		if include {
			filteredHistory = append(filteredHistory, record)
		}
	}
	
	// 分页处理
	total := len(filteredHistory)
	totalPages := (total + pageSize - 1) / pageSize
	
	startIndex := (page - 1) * pageSize
	endIndex := startIndex + pageSize
	
	if startIndex >= total {
		filteredHistory = []gin.H{}
	} else {
		if endIndex > total {
			endIndex = total
		}
		filteredHistory = filteredHistory[startIndex:endIndex]
	}
	
	c.JSON(http.StatusOK, gin.H{
		"data": filteredHistory,
		"pagination": gin.H{
			"page":        page,
			"page_size":   pageSize,
			"total":       total,
			"total_pages": totalPages,
			"has_next":    page < totalPages,
			"has_prev":    page > 1,
		},
		"filters": filters,
		"message": "Impersonation history retrieved successfully",
		"note":    "This is mock data for development. In production, data will come from audit service.",
	})
}