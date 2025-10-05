package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/services"
)

// AISubtaskHandler AI子任务处理器
type AISubtaskHandler struct {
	db                database.DB
	aiGenerateService *services.AIGenerateService
}

// NewAISubtaskHandler 创建AI子任务处理器
func NewAISubtaskHandler(db database.DB) *AISubtaskHandler {
	return &AISubtaskHandler{
		db:                db,
		aiGenerateService: services.NewAIGenerateService(db.GetDB().(*sql.DB)),
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
			Priority:            subtask.Priority,
			ParentID:            &parentIDInt,
			ProjectID:           parentTask.ProjectID,
			EstimatedHours:      &subtask.EstimatedHours,
			SortOrder:           i, // 保持顺序
			TimeTrackingMode:    "manual",
			TimeUnitPreference:  "auto",
			WorkHoursPerDay:     8,
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
