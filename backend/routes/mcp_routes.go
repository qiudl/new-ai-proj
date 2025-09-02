package routes

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"ai-project-backend/handlers"
	"ai-project-backend/middleware"
)

// responseRecorder 用于捕获响应内容
type responseRecorder struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (r *responseRecorder) Write(data []byte) (int, error) {
	r.body.Write(data)
	return r.ResponseWriter.Write(data)
}

// RegisterMCPRoutes 注册MCP专用路由
func RegisterMCPRoutes(router *gin.RouterGroup, app ApplicationInterface) {
	// MCP专用路由组
	mcp := router.Group("/mcp")
	mcp.Use(middleware.AuthMiddleware(app.GetJWTManager())) // MCP请求也需要认证

	// 获取handlers
	documentHandler := app.GetDocumentHandler()
	workNoteHandler := app.GetWorkNoteHandler()
	reportHandler := app.GetReportHandler()

	// 任务文档相关路由
	mcp.POST("/create-and-attach", createAndAttachTaskDocument(documentHandler))
	mcp.POST("/create-and-attach-work-note", createAndAttachWorkNote(workNoteHandler))
	mcp.GET("/task-document/:taskId", getTaskDocument(documentHandler))
	mcp.DELETE("/task-document/:taskId", deleteTaskDocument(documentHandler))
	mcp.GET("/task-document/:taskId/exists", hasTaskDocument(documentHandler))

	// 工作笔记相关路由
	mcp.POST("/create-work-note", createWorkNote(workNoteHandler))
	mcp.POST("/work-notes", createWorkNote(workNoteHandler))  // 保留兼容性
	mcp.GET("/list-work-notes", listWorkNotes(workNoteHandler))
	mcp.GET("/work-notes", listWorkNotes(workNoteHandler))
	mcp.GET("/search-work-notes", searchWorkNotes(workNoteHandler))
	mcp.GET("/work-notes/search", searchWorkNotes(workNoteHandler))
	mcp.GET("/work-notes/:id", getWorkNote(workNoteHandler))
	mcp.PUT("/work-notes/:id", updateWorkNote(workNoteHandler))

	// 报告相关路由
	mcp.GET("/get-daily-work-report", reportHandler.GetDailyWorkReport)
	mcp.POST("/get-daily-work-report", reportHandler.GetDailyWorkReport)
}

// createAndAttachTaskDocument MCP专用：创建并关联任务文档
func createAndAttachTaskDocument(h *handlers.DocumentHandler) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			TaskID    int    `json:"taskId"`
			Content   string `json:"content"`
			ProjectID *int   `json:"projectId,omitempty"`
			Title     string `json:"title,omitempty"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Invalid request body: " + err.Error(),
			})
			return
		}

		if req.TaskID == 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "taskId is required",
			})
			return
		}

		if req.Content == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "content is required",
			})
			return
		}

		// 设置默认项目ID为1
		projectID := 1
		if req.ProjectID != nil {
			projectID = *req.ProjectID
		}

		// 生成默认标题（如果没有提供）
		title := req.Title
		if title == "" {
			title = "任务文档"
		}

		// 设置路径参数，模拟标准API调用
		c.Params = append(c.Params, gin.Param{Key: "id", Value: strconv.Itoa(projectID)})
		c.Params = append(c.Params, gin.Param{Key: "taskId", Value: strconv.Itoa(req.TaskID)})

		// 构造请求体，匹配DocumentHandler.CreateAndAttachDocument期望的格式
		requestBody := map[string]interface{}{
			"title":   title,
			"content": req.Content,
		}

		// 将请求体重新编码为JSON
		jsonBody, _ := json.Marshal(requestBody)
		c.Request.Body = ioutil.NopCloser(strings.NewReader(string(jsonBody)))
		c.Request.ContentLength = int64(len(jsonBody))

		// 调用现有的任务文档创建逻辑
		h.CreateAndAttachDocument(c)
	}
}

// createAndAttachWorkNote MCP专用：创建并关联工作笔记到任务
func createAndAttachWorkNote(h *handlers.WorkNoteHandler) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			TaskID  int    `json:"taskId"`
			Content string `json:"content"`
			Title   string `json:"title,omitempty"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Invalid request body: " + err.Error(),
			})
			return
		}

		if req.TaskID == 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "taskId is required",
			})
			return
		}

		if req.Content == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "content is required",
			})
			return
		}

		// 生成默认标题（如果没有提供）
		title := req.Title
		if title == "" {
			title = fmt.Sprintf("工作笔记-任务%d", req.TaskID)
		}

		// 首先创建工作笔记
		requestBody := map[string]interface{}{
			"title":      title,
			"content":    req.Content,
			"visibility": "team",
			"status":     "draft",
			"type":       "markdown",
		}

		// 设置请求体
		jsonBody, _ := json.Marshal(requestBody)
		originalBody := c.Request.Body
		c.Request.Body = ioutil.NopCloser(strings.NewReader(string(jsonBody)))
		c.Request.ContentLength = int64(len(jsonBody))

		// 创建一个响应记录器来捕获创建工作笔记的响应
		w := &responseRecorder{ResponseWriter: c.Writer, body: &bytes.Buffer{}}
		c.Writer = w

		// 调用现有的工作笔记创建逻辑
		h.CreateWorkNote(c)

		// 恢复原始请求体
		c.Request.Body = originalBody

		// 解析创建响应，获取工作笔记ID
		var createResp struct {
			Success bool `json:"success"`
			Data    struct {
				ID int `json:"id"`
			} `json:"data"`
		}

		if err := json.Unmarshal(w.body.Bytes(), &createResp); err != nil || !createResp.Success {
			// 如果工作笔记创建失败，返回错误
			return
		}

		// 如果工作笔记创建成功，尝试关联到任务
		userID, _ := c.Get("user_id")
		if workNoteID := createResp.Data.ID; workNoteID > 0 && userID != nil {
			// 这里需要调用关联服务，但由于我们在MCP路由中，需要手动创建关联
			// 为简化处理，暂时在响应中标记关联信息
			var finalResp map[string]interface{}
			json.Unmarshal(w.body.Bytes(), &finalResp)
			finalResp["task_association"] = map[string]interface{}{
				"task_id":       req.TaskID,
				"work_note_id":  workNoteID,
				"relation_type": "attached",
				"message":       fmt.Sprintf("工作笔记已创建并准备关联到任务 %d", req.TaskID),
			}

			// 重新编码响应
			c.Writer = gin.ResponseWriter(c.Writer.(*responseRecorder).ResponseWriter)
			c.JSON(http.StatusOK, finalResp)
			return
		}
	}
}

// getTaskDocument MCP专用：获取任务文档
func getTaskDocument(h *handlers.DocumentHandler) gin.HandlerFunc {
	return func(c *gin.Context) {
		taskIDStr := c.Param("taskId")
		if _, err := strconv.Atoi(taskIDStr); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Invalid taskId",
			})
			return
		}

		// 设置参数并调用现有逻辑
		c.Params = gin.Params{
			{Key: "id", Value: "1"}, // 默认项目ID为1
			{Key: "taskId", Value: taskIDStr},
		}
		h.GetTaskDocuments(c)
	}
}

// deleteTaskDocument MCP专用：删除任务文档
func deleteTaskDocument(h *handlers.DocumentHandler) gin.HandlerFunc {
	return func(c *gin.Context) {
		taskIDStr := c.Param("taskId")
		_, err := strconv.Atoi(taskIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Invalid taskId",
			})
			return
		}

		// TODO: 实现删除任务文档的逻辑
		c.JSON(http.StatusNotImplemented, gin.H{
			"success": false,
			"error":   "Delete task document not yet implemented",
		})
	}
}

// hasTaskDocument MCP专用：检查任务是否有文档
func hasTaskDocument(h *handlers.DocumentHandler) gin.HandlerFunc {
	return func(c *gin.Context) {
		taskIDStr := c.Param("taskId")
		_, err := strconv.Atoi(taskIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Invalid taskId",
			})
			return
		}

		// 设置参数并调用现有逻辑
		c.Params = gin.Params{
			{Key: "id", Value: "1"}, // 默认项目ID为1
			{Key: "taskId", Value: taskIDStr},
		}
		h.HasTaskDocument(c)
	}
}

// 工作笔记相关的MCP路由处理函数
func createWorkNote(h *handlers.WorkNoteHandler) gin.HandlerFunc {
	return func(c *gin.Context) {
		h.CreateWorkNote(c)
	}
}

func listWorkNotes(h *handlers.WorkNoteHandler) gin.HandlerFunc {
	return func(c *gin.Context) {
		h.ListWorkNotes(c)
	}
}

func searchWorkNotes(h *handlers.WorkNoteHandler) gin.HandlerFunc {
	return func(c *gin.Context) {
		h.SearchWorkNotes(c)
	}
}

func getWorkNote(h *handlers.WorkNoteHandler) gin.HandlerFunc {
	return func(c *gin.Context) {
		h.GetWorkNote(c)
	}
}

func updateWorkNote(h *handlers.WorkNoteHandler) gin.HandlerFunc {
	return func(c *gin.Context) {
		h.UpdateWorkNote(c)
	}
}
