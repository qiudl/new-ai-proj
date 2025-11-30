package handlers

import (
	"net/http"
	"strconv"

	"ai-project-backend/models"
	"ai-project-backend/services"

	"github.com/gin-gonic/gin"
)

// MCPAPIKeyHandler MCP API Key 管理处理器
type MCPAPIKeyHandler struct {
	apiKeyService *services.MCPAPIKeyService
}

// NewMCPAPIKeyHandler 创建 MCP API Key 处理器
func NewMCPAPIKeyHandler(apiKeyService *services.MCPAPIKeyService) *MCPAPIKeyHandler {
	return &MCPAPIKeyHandler{
		apiKeyService: apiKeyService,
	}
}

// ListAPIKeys 列出用户的所有 API Keys
// @Summary 列出 MCP API Keys
// @Description 获取当前用户的所有 MCP API Keys，管理员可通过 all=true 查看所有用户的 Keys
// @Tags MCP API Keys
// @Accept json
// @Produce json
// @Param include_revoked query bool false "是否包含已撤销的 Keys"
// @Param status query string false "状态过滤 (active/revoked/expired)"
// @Param page query int false "页码" default(1)
// @Param limit query int false "每页数量" default(20)
// @Param all query bool false "查看所有用户的 Keys (仅管理员)"
// @Param user_id query int false "按用户 ID 过滤 (仅管理员)"
// @Success 200 {object} models.ListMCPAPIKeysResponse
// @Failure 401 {object} gin.H
// @Failure 500 {object} gin.H
// @Router /api/v1/mcp/keys [get]
func (h *MCPAPIKeyHandler) ListAPIKeys(c *gin.Context) {
	// 获取当前用户 ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	// 解析查询参数
	var req models.ListMCPAPIKeysRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid query parameters",
			"error":   err.Error(),
		})
		return
	}

	// 设置默认值
	if req.Page == 0 {
		req.Page = 1
	}
	if req.Limit == 0 {
		req.Limit = 20
	}

	// 检查是否是管理员
	isAdmin := false
	if userRole, exists := c.Get("user_role"); exists {
		if roleStr, ok := userRole.(string); ok {
			isAdmin = (roleStr == "admin" || roleStr == "super_admin")
		}
	}

	var keys []models.MCPAPIKey
	var total int64
	var err error

	// 如果请求查看所有 Keys，且用户是管理员
	if req.All && isAdmin {
		keys, total, err = h.apiKeyService.ListAllAPIKeys(c.Request.Context(), &req)
	} else {
		// 非管理员或未请求 all，只能查看自己的 Keys
		keys, total, err = h.apiKeyService.ListAPIKeys(c.Request.Context(), getUserIDInt(userID), &req)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to list API keys",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "API keys retrieved successfully",
		"data": models.ListMCPAPIKeysResponse{
			Keys:    keys,
			Total:   total,
			Page:    req.Page,
			Limit:   req.Limit,
			IsAdmin: isAdmin, // 告知前端当前用户是否是管理员
		},
	})
}

// CreateAPIKey 创建新的 API Key
// @Summary 创建 MCP API Key
// @Description 为当前用户创建新的 MCP API Key
// @Tags MCP API Keys
// @Accept json
// @Produce json
// @Param request body models.CreateMCPAPIKeyRequest true "创建请求"
// @Success 201 {object} models.CreateMCPAPIKeyResponse
// @Failure 400 {object} gin.H
// @Failure 401 {object} gin.H
// @Failure 500 {object} gin.H
// @Router /api/v1/mcp/keys [post]
func (h *MCPAPIKeyHandler) CreateAPIKey(c *gin.Context) {
	// 获取当前用户 ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	// 解析请求体
	var req models.CreateMCPAPIKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request body",
			"error":   err.Error(),
		})
		return
	}

	// 获取企业 ID（如果有）
	var enterpriseID *int
	if eid, exists := c.Get("enterprise_id"); exists {
		if id, ok := eid.(int); ok && id > 0 {
			enterpriseID = &id
		}
	}

	// 创建 API Key
	apiKey, plainKey, err := h.apiKeyService.CreateAPIKey(c.Request.Context(), getUserIDInt(userID), enterpriseID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to create API key",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "API key created successfully. Please save the plain key - it will not be shown again.",
		"data": models.CreateMCPAPIKeyResponse{
			ID:        apiKey.ID,
			KeyID:     apiKey.KeyID,
			PlainKey:  plainKey, // 明文 Key，仅此一次显示
			Name:      apiKey.Name,
			ExpiresAt: apiKey.ExpiresAt,
			CreatedAt: apiKey.CreatedAt,
		},
	})
}

// GetAPIKey 获取单个 API Key 详情
// @Summary 获取 MCP API Key 详情
// @Description 获取指定 API Key 的详细信息
// @Tags MCP API Keys
// @Accept json
// @Produce json
// @Param keyId path string true "Key ID (如 mcp_key_xxx)"
// @Success 200 {object} models.MCPAPIKey
// @Failure 401 {object} gin.H
// @Failure 404 {object} gin.H
// @Router /api/v1/mcp/keys/{keyId} [get]
func (h *MCPAPIKeyHandler) GetAPIKey(c *gin.Context) {
	// 获取当前用户 ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	keyID := c.Param("keyId")
	if keyID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Key ID is required",
		})
		return
	}

	// 获取 API Key
	apiKey, err := h.apiKeyService.GetAPIKeyByKeyID(c.Request.Context(), keyID)
	if err != nil {
		if err == services.ErrAPIKeyNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "API key not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to get API key",
			"error":   err.Error(),
		})
		return
	}

	// 验证所有权
	if apiKey.UserID != getUserIDInt(userID) {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "API key not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "API key retrieved successfully",
		"data":    apiKey,
	})
}

// UpdateAPIKey 更新 API Key
// @Summary 更新 MCP API Key
// @Description 更新指定 API Key 的信息（名称、描述、过期时间）
// @Tags MCP API Keys
// @Accept json
// @Produce json
// @Param keyId path string true "Key ID"
// @Param request body models.UpdateMCPAPIKeyRequest true "更新请求"
// @Success 200 {object} models.MCPAPIKey
// @Failure 400 {object} gin.H
// @Failure 401 {object} gin.H
// @Failure 404 {object} gin.H
// @Failure 500 {object} gin.H
// @Router /api/v1/mcp/keys/{keyId} [put]
func (h *MCPAPIKeyHandler) UpdateAPIKey(c *gin.Context) {
	// 获取当前用户 ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	keyID := c.Param("keyId")
	if keyID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Key ID is required",
		})
		return
	}

	// 解析请求体
	var req models.UpdateMCPAPIKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request body",
			"error":   err.Error(),
		})
		return
	}

	// 更新 API Key
	apiKey, err := h.apiKeyService.UpdateAPIKey(c.Request.Context(), keyID, getUserIDInt(userID), &req)
	if err != nil {
		if err == services.ErrAPIKeyNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "API key not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to update API key",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "API key updated successfully",
		"data":    apiKey,
	})
}

// RevokeAPIKey 撤销 API Key
// @Summary 撤销 MCP API Key
// @Description 撤销指定的 API Key，撤销后无法恢复
// @Tags MCP API Keys
// @Accept json
// @Produce json
// @Param keyId path string true "Key ID"
// @Success 200 {object} gin.H
// @Failure 401 {object} gin.H
// @Failure 404 {object} gin.H
// @Failure 500 {object} gin.H
// @Router /api/v1/mcp/keys/{keyId} [delete]
func (h *MCPAPIKeyHandler) RevokeAPIKey(c *gin.Context) {
	// 获取当前用户 ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	keyID := c.Param("keyId")
	if keyID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Key ID is required",
		})
		return
	}

	// 撤销 API Key
	err := h.apiKeyService.RevokeAPIKey(c.Request.Context(), keyID, getUserIDInt(userID))
	if err != nil {
		if err == services.ErrAPIKeyNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "API key not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to revoke API key",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "API key revoked successfully",
	})
}

// GetAPIKeyStats 获取 API Key 使用统计
// @Summary 获取 MCP API Key 统计
// @Description 获取指定 API Key 的使用统计信息
// @Tags MCP API Keys
// @Accept json
// @Produce json
// @Param keyId path string true "Key ID"
// @Success 200 {object} models.MCPAPIKeyStats
// @Failure 401 {object} gin.H
// @Failure 404 {object} gin.H
// @Failure 500 {object} gin.H
// @Router /api/v1/mcp/keys/{keyId}/stats [get]
func (h *MCPAPIKeyHandler) GetAPIKeyStats(c *gin.Context) {
	// 获取当前用户 ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	keyID := c.Param("keyId")
	if keyID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Key ID is required",
		})
		return
	}

	// 验证 API Key 所有权
	apiKey, err := h.apiKeyService.GetAPIKeyByKeyID(c.Request.Context(), keyID)
	if err != nil {
		if err == services.ErrAPIKeyNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "API key not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to get API key",
			"error":   err.Error(),
		})
		return
	}

	if apiKey.UserID != getUserIDInt(userID) {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "API key not found",
		})
		return
	}

	// 获取统计信息
	stats, err := h.apiKeyService.GetAPIKeyStats(c.Request.Context(), apiKey.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to get API key stats",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "API key stats retrieved successfully",
		"data":    stats,
	})
}

// GetAPIKeyLogs 获取 API Key 调用日志
// @Summary 获取 MCP API Key 调用日志
// @Description 获取指定 API Key 的调用日志
// @Tags MCP API Keys
// @Accept json
// @Produce json
// @Param keyId path string true "Key ID"
// @Param page query int false "页码" default(1)
// @Param limit query int false "每页数量" default(50)
// @Param tool query string false "工具名称过滤"
// @Param status query string false "状态过滤 (success/error/timeout)"
// @Success 200 {object} models.ListMCPAPIKeyLogsResponse
// @Failure 401 {object} gin.H
// @Failure 404 {object} gin.H
// @Failure 500 {object} gin.H
// @Router /api/v1/mcp/keys/{keyId}/logs [get]
func (h *MCPAPIKeyHandler) GetAPIKeyLogs(c *gin.Context) {
	// 获取当前用户 ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	keyID := c.Param("keyId")
	if keyID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Key ID is required",
		})
		return
	}

	// 验证 API Key 所有权
	apiKey, err := h.apiKeyService.GetAPIKeyByKeyID(c.Request.Context(), keyID)
	if err != nil {
		if err == services.ErrAPIKeyNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "API key not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to get API key",
			"error":   err.Error(),
		})
		return
	}

	if apiKey.UserID != getUserIDInt(userID) {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "API key not found",
		})
		return
	}

	// 解析查询参数
	var req models.ListMCPAPIKeyLogsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid query parameters",
			"error":   err.Error(),
		})
		return
	}

	// 设置默认值
	if req.Page == 0 {
		req.Page = 1
	}
	if req.Limit == 0 {
		req.Limit = 50
	}

	// 获取日志
	logs, total, err := h.apiKeyService.GetAPIKeyLogs(c.Request.Context(), apiKey.ID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to get API key logs",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "API key logs retrieved successfully",
		"data": models.ListMCPAPIKeyLogsResponse{
			Logs:  logs,
			Total: total,
			Page:  req.Page,
			Limit: req.Limit,
		},
	})
}

// getUserIDInt 将用户 ID 转换为 int
func getUserIDInt(userID interface{}) int {
	switch v := userID.(type) {
	case int:
		return v
	case uint:
		return int(v)
	case int64:
		return int(v)
	case float64:
		return int(v)
	case string:
		if id, err := strconv.Atoi(v); err == nil {
			return id
		}
	}
	return 0
}
