package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/services"
)

// AISubtaskHandler AI子任务处理器
type AISubtaskHandler struct {
	db                database.DB
	aiGenerateService *services.AIGenerateService
	promptRepo        *database.PromptRepository
}

// NewAISubtaskHandler 创建AI子任务处理器
func NewAISubtaskHandler(db database.DB) *AISubtaskHandler {
	sqlDB := db.GetDB().(*sql.DB)
	return &AISubtaskHandler{
		db:                db,
		aiGenerateService: services.NewAIGenerateService(sqlDB),
		promptRepo:        database.NewPromptRepository(sqlDB),
	}
}

// GenerateSubtasks 使用AI生成子任务
func (h *AISubtaskHandler) GenerateSubtasks(c *gin.Context) {
	taskIDStr := c.Param("id")
	taskID, err := strconv.ParseInt(taskIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "任务ID格式错误",
		})
		return
	}

	var req models.AIGenerateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	// 设置默认值
	if req.Context.MaxSubtasks == 0 {
		req.Context.MaxSubtasks = 10
	}

	// 获取父任务
	task, err := h.db.Tasks().GetByID(c.Request.Context(), int(taskID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "任务不存在",
		})
		return
	}

	// 调用AI生成服务
	result, err := h.aiGenerateService.GenerateSubtasks(c.Request.Context(), &services.GenerateSubtasksParams{
		ParentTask:         task,
		Model:              req.Model,
		CustomPrompt:       req.CustomPrompt, // 传递自定义提示词
		IncludeDescription: req.Context.IncludeDescription,
		IncludeSiblings:    req.Context.IncludeSiblings,
		MaxSubtasks:        req.Context.MaxSubtasks,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "AI生成失败: " + err.Error(),
		})
		return
	}

	// 🆕 自动保存提示词历史（异步）
	go func() {
		// 获取用户ID（从上下文中）
		userID := c.GetInt("user_id")
		if userID == 0 {
			userID = 1 // 默认管理员用户
		}

		if err := h.savePromptHistory(
			userID,
			taskID,
			req.Model,
			req.CustomPrompt,
			result,
		); err != nil {
			log.Printf("[警告] 保存提示词历史失败 (任务ID=%d): %v", taskID, err)
		} else {
			log.Printf("[信息] 成功保存提示词历史 (任务ID=%d, 用户ID=%d)", taskID, userID)
		}
	}()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// BatchCreateSubtasks 批量创建子任务（使用数据库事务）
func (h *AISubtaskHandler) BatchCreateSubtasks(c *gin.Context) {
	var req models.BatchCreateSubtasksRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	ctx := c.Request.Context()

	// 验证父任务存在
	parentTask, err := h.db.Tasks().GetByID(ctx, int(req.ParentID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "父任务不存在",
		})
		return
	}

	// ✅ 开启数据库事务
	tx, err := h.db.BeginTx(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "开启事务失败: " + err.Error(),
		})
		return
	}
	// 确保事务最终会被回滚（如果没有显式提交）
	defer tx.Rollback()

	// 批量创建子任务
	createdTasks := make([]models.Task, 0, len(req.Subtasks))
	parentIDInt := int(req.ParentID)

	for i, subtask := range req.Subtasks {
		task := &models.Task{
			Title:               subtask.Title,
			Description:         &subtask.Description,
			Status:              "todo",
			ParentID:            &parentIDInt,
			ProjectID:           parentTask.ProjectID,
			EstimatedMinutes:    int(subtask.EstimatedHours * 60), // 将小时转换为分钟
			SortOrder:           i, // 保持顺序
			TimeTrackingMode:    "manual",
			TimeUnitPreference:  "auto",
			WorkHoursPerDay:     8,
			CustomFields:        make(models.CustomFields), // 初始化为空map，避免nil导致的JSON错误
		}

		// ✅ 使用事务中的Repository创建任务
		createdTask, err := tx.Tasks().Create(ctx, task)
		if err != nil {
			// 事务会自动回滚（defer Rollback）
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "创建第 " + strconv.Itoa(i+1) + " 个子任务失败: " + err.Error(),
			})
			return
		}

		createdTasks = append(createdTasks, *createdTask)
	}

	// ✅ 提交事务
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "提交事务失败: " + err.Error(),
		})
		return
	}

	// 构建响应
	response := models.BatchCreateSubtasksResponse{
		Success:      true,
		CreatedCount: len(createdTasks),
		Tasks:        make([]models.TaskBrief, len(createdTasks)),
		Message:      "成功创建 " + strconv.Itoa(len(createdTasks)) + " 个子任务",
	}

	for i, task := range createdTasks {
		response.Tasks[i] = models.TaskBrief{
			ID:     int64(task.ID),
			Title:  task.Title,
			Status: task.Status,
		}
	}

	c.JSON(http.StatusOK, response)
}

// savePromptHistory 保存用户提示词历史记录（辅助函数）
func (h *AISubtaskHandler) savePromptHistory(
	userID int,
	taskID int64,
	model string,
	customPrompt *string,
	result *models.AIGenerateResponse,
) error {
	// 构建历史记录
	history := &models.UserPromptHistory{
		UserID:       userID,
		ParentTaskID: int(taskID),
		AIProvider:   extractProvider(model),
		AIModel:      model,
		SubtasksGenerated: len(result.Subtasks),
		TotalEstimatedHours: &result.Statistics.TotalHours,
	}

	// 设置提示词内容
	if customPrompt != nil && strings.TrimSpace(*customPrompt) != "" {
		history.PromptText = strings.TrimSpace(*customPrompt)
	} else {
		history.PromptText = "[系统默认Prompt]"
	}

	// 保存到数据库
	return h.promptRepo.CreatePromptHistory(history)
}

// extractProvider 从模型名称提取提供商
func extractProvider(model string) string {
	// 简单映射
	if strings.Contains(model, "claude") {
		return "claude"
	}
	if strings.Contains(model, "deepseek") {
		return "deepseek"
	}
	if strings.Contains(model, "gpt") || strings.Contains(model, "openai") {
		return "openai"
	}
	return model
}
