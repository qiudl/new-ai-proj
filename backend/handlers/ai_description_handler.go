package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"strconv"
	"sync"

	"github.com/gin-gonic/gin"

	"ai-project-backend/cache"
	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/services"
)

// AIDescriptionHandler AI任务描述生成处理器
type AIDescriptionHandler struct {
	db                *sql.DB
	descGenerator     *services.DescriptionGenerator
}

// NewAIDescriptionHandler 创建AI描述处理器
func NewAIDescriptionHandler(db database.DB, cacheService *cache.AICacheService) *AIDescriptionHandler {
	sqlDB := db.GetDB().(*sql.DB)
	descGenerator := services.NewDescriptionGenerator(sqlDB, cacheService)

	return &AIDescriptionHandler{
		db:            sqlDB,
		descGenerator: descGenerator,
	}
}

// GenerateDescriptionRequest 生成描述请求
type GenerateDescriptionRequest struct {
	Model          string                                 `json:"model" binding:"required"`
	Options        *services.GenerateDescriptionOptions   `json:"options"`
}

// GenerateDescription 为单个任务生成描述
// @Summary 生成任务描述
// @Description 使用AI为指定任务生成详细描述
// @Tags AI
// @Accept json
// @Produce json
// @Param id path int true "任务ID"
// @Param request body GenerateDescriptionRequest true "生成描述请求"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/tasks/{id}/ai/generate-description [post]
func (h *AIDescriptionHandler) GenerateDescription(c *gin.Context) {
	// 1. 获取任务ID
	taskIDStr := c.Param("id")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的任务ID",
			"error":   err.Error(),
		})
		return
	}

	// 2. 解析请求
	var req GenerateDescriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数错误",
			"error":   err.Error(),
		})
		return
	}

	// 3. 设置默认选项
	if req.Options == nil {
		req.Options = &services.GenerateDescriptionOptions{
			Mode:           "replace",
			Style:          "detailed",
			Length:         "medium",
			IncludeContext: true,
			Stream:         false,
			MaxTokens:      800,
		}
	}

	// 4. 验证任务是否存在
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM tasks WHERE id = $1)`
	err = h.db.QueryRow(query, taskID).Scan(&exists)
	if err != nil {
		log.Printf("[AIDescriptionHandler] Database error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "数据库查询失败",
			"error":   err.Error(),
		})
		return
	}

	if !exists {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrCodeNotFound,
			"任务不存在",
			nil,
		))
		return
	}

	// 5. 调用生成服务
	log.Printf("[AIDescriptionHandler] Generating description for task %d with model %s", taskID, req.Model)

	result, err := h.descGenerator.GenerateDescription(c.Request.Context(), taskID, req.Model, req.Options)
	if err != nil {
		log.Printf("[AIDescriptionHandler] Generate description error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "生成描述失败",
			"error":   err.Error(),
		})
		return
	}

	log.Printf("[AIDescriptionHandler] Description generated successfully for task %d", taskID)

	// 6. 返回结果
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
		"message": "描述生成成功",
	})
}

// UpdateTaskDescriptionRequest 更新任务描述请求
type UpdateTaskDescriptionRequest struct {
	Description string `json:"description" binding:"required"`
	Mode        string `json:"mode"`  // replace | append
}

// UpdateTaskDescription 更新任务描述（将AI生成的描述保存到任务）
// @Summary 更新任务描述
// @Description 将AI生成的描述保存到任务
// @Tags AI
// @Accept json
// @Produce json
// @Param id path int true "任务ID"
// @Param request body UpdateTaskDescriptionRequest true "更新描述请求"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/tasks/{id}/ai/update-description [post]
func (h *AIDescriptionHandler) UpdateTaskDescription(c *gin.Context) {
	// 1. 获取任务ID
	taskIDStr := c.Param("id")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的任务ID",
			"error":   err.Error(),
		})
		return
	}

	// 2. 解析请求
	var req UpdateTaskDescriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数错误",
			"error":   err.Error(),
		})
		return
	}

	// 默认模式为替换
	if req.Mode == "" {
		req.Mode = "replace"
	}

	// 3. 根据模式更新描述
	var updateQuery string
	var description string

	if req.Mode == "append" {
		// 追加模式：获取现有描述并拼接
		var currentDesc sql.NullString
		query := `SELECT description FROM tasks WHERE id = $1`
		err = h.db.QueryRow(query, taskID).Scan(&currentDesc)
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(
				models.ErrCodeNotFound,
				"任务不存在",
				nil,
			))
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "查询任务失败",
				"error":   err.Error(),
			})
			return
		}

		if currentDesc.Valid && currentDesc.String != "" {
			description = currentDesc.String + "\n\n" + req.Description
		} else {
			description = req.Description
		}
	} else {
		// 替换模式
		description = req.Description
	}

	// 4. 更新数据库
	updateQuery = `
		UPDATE tasks
		SET description = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`

	result, err := h.db.Exec(updateQuery, description, taskID)
	if err != nil {
		log.Printf("[AIDescriptionHandler] Update task description error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "更新任务描述失败",
			"error":   err.Error(),
		})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "任务不存在",
		})
		return
	}

	log.Printf("[AIDescriptionHandler] Task %d description updated successfully (mode: %s)", taskID, req.Mode)

	// 5. 返回成功
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"task_id":     taskID,
			"description": description,
			"mode":        req.Mode,
		},
		"message": "任务描述更新成功",
	})
}

// GetDescriptionSuggestions 获取任务描述建议
// @Summary 获取描述建议
// @Description 基于任务上下文提供多个描述建议
// @Tags AI
// @Produce json
// @Param id path int true "任务ID"
// @Param model query string true "AI模型"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/tasks/{id}/ai/description-suggestions [get]
func (h *AIDescriptionHandler) GetDescriptionSuggestions(c *gin.Context) {
	// 1. 获取任务ID
	taskIDStr := c.Param("id")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的任务ID",
			"error":   err.Error(),
		})
		return
	}

	// 2. 获取模型参数
	model := c.Query("model")
	if model == "" {
		model = "deepseek" // 默认模型
	}

	// 3. 验证任务是否存在
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM tasks WHERE id = $1)`
	err = h.db.QueryRow(query, taskID).Scan(&exists)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "数据库查询失败",
			"error":   err.Error(),
		})
		return
	}

	if !exists {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrCodeNotFound,
			"任务不存在",
			nil,
		))
		return
	}

	// 4. 生成3个不同风格的建议（并发优化）
	suggestions := []map[string]interface{}{}
	var suggestionsMutex sync.Mutex
	var wg sync.WaitGroup

	styles := []struct {
		style  string
		length string
		name   string
	}{
		{"brief", "short", "简洁版"},
		{"detailed", "medium", "详细版"},
		{"technical", "long", "技术版"},
	}

	// 并发生成所有建议（从27秒优化到~9秒）
	for _, s := range styles {
		wg.Add(1)
		go func(styleConfig struct {
			style  string
			length string
			name   string
		}) {
			defer wg.Done()

			options := &services.GenerateDescriptionOptions{
				Mode:           "suggest",
				Style:          styleConfig.style,
				Length:         styleConfig.length,
				IncludeContext: true,
			}

			result, err := h.descGenerator.GenerateDescription(c.Request.Context(), taskID, model, options)
			if err != nil {
				log.Printf("[AIDescriptionHandler] Generate suggestion (%s) error: %v", styleConfig.name, err)
				return
			}

			// 线程安全地添加到结果列表
			suggestionsMutex.Lock()
			suggestions = append(suggestions, map[string]interface{}{
				"name":        styleConfig.name,
				"style":       styleConfig.style,
				"description": result.GeneratedDesc,
			})
			suggestionsMutex.Unlock()

			log.Printf("[AIDescriptionHandler] Suggestion (%s) generated successfully", styleConfig.name)
		}(s)
	}

	// 等待所有并发任务完成
	wg.Wait()

	if len(suggestions) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "生成建议失败",
		})
		return
	}

	// 5. 返回建议列表
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"task_id":     taskID,
			"suggestions": suggestions,
			"total":       len(suggestions),
		},
		"message": "描述建议生成成功",
	})
}

// BatchGenerateDescriptionsRequest 批量生成描述请求
type BatchGenerateDescriptionsRequest struct {
	TaskIDs []int                                `json:"task_ids" binding:"required"`
	Model   string                               `json:"model" binding:"required"`
	Options *services.GenerateDescriptionOptions `json:"options"`
}

// BatchGenerateDescriptions 批量生成任务描述
// @Summary 批量生成任务描述
// @Description 为多个任务批量生成描述
// @Tags AI
// @Accept json
// @Produce json
// @Param request body BatchGenerateDescriptionsRequest true "批量生成描述请求"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/tasks/ai/batch-generate-descriptions [post]
func (h *AIDescriptionHandler) BatchGenerateDescriptions(c *gin.Context) {
	// 1. 解析请求
	var req BatchGenerateDescriptionsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数错误",
			"error":   err.Error(),
		})
		return
	}

	// 2. 限制批量数量
	if len(req.TaskIDs) > 20 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "批量生成数量不能超过20个",
		})
		return
	}

	// 3. 设置默认选项
	if req.Options == nil {
		req.Options = &services.GenerateDescriptionOptions{
			Mode:           "replace",
			Style:          "detailed",
			Length:         "medium",
			IncludeContext: true,
		}
	}

	// 4. 批量生成（并发优化）
	results := []interface{}{}
	errors := []map[string]interface{}{}
	var resultsMutex sync.Mutex
	var wg sync.WaitGroup

	// 并发生成所有任务的描述
	for _, taskID := range req.TaskIDs {
		wg.Add(1)
		go func(tid int) {
			defer wg.Done()

			result, err := h.descGenerator.GenerateDescription(c.Request.Context(), tid, req.Model, req.Options)

			resultsMutex.Lock()
			if err != nil {
				log.Printf("[AIDescriptionHandler] Batch generate - task %d error: %v", tid, err)
				errors = append(errors, map[string]interface{}{
					"task_id": tid,
					"error":   err.Error(),
				})
			} else {
				results = append(results, result)
				log.Printf("[AIDescriptionHandler] Batch generate - task %d completed", tid)
			}
			resultsMutex.Unlock()
		}(taskID)
	}

	// 等待所有并发任务完成
	wg.Wait()

	// 5. 返回结果
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"results":        results,
			"success_count":  len(results),
			"failed_count":   len(errors),
			"errors":         errors,
		},
		"message": "批量生成完成",
	})
}
