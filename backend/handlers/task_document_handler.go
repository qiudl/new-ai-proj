package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	
	"github.com/gin-gonic/gin"
)

// TaskDocumentHandler 任务文档处理器
type TaskDocumentHandler struct {
	docsBasePath string
}

// NewTaskDocumentHandler 创建任务文档处理器实例
func NewTaskDocumentHandler(docsBasePath string) *TaskDocumentHandler {
	return &TaskDocumentHandler{
		docsBasePath: docsBasePath,
	}
}

// DocumentRequest 文档请求结构
type DocumentRequest struct {
	Content string `json:"content"`
}

// DocumentResponse 文档响应结构
type DocumentResponse struct {
	Content string `json:"content"`
}

// ensureDocsDir 确保文档目录存在
func (h *TaskDocumentHandler) ensureDocsDir() error {
	return os.MkdirAll(h.docsBasePath, 0755)
}

// getDocumentPath 获取文档文件路径
func (h *TaskDocumentHandler) getDocumentPath(taskID string) string {
	return filepath.Join(h.docsBasePath, fmt.Sprintf("%s.md", taskID))
}

// generateDefaultTemplate 生成默认文档模板
func (h *TaskDocumentHandler) generateDefaultTemplate(taskID string) string {
	return fmt.Sprintf(`# 任务文档

## 需求描述
<!-- 在这里描述任务的具体需求 -->

## 技术方案
<!-- 在这里描述实现方案 -->

## 实现进度
- [ ] 需求分析
- [ ] 技术设计
- [ ] 代码实现
- [ ] 测试验证

## 备注
<!-- 其他相关信息 -->
`)
}

// GetTaskDocument 获取任务文档 (Gin版本)
func (h *TaskDocumentHandler) GetTaskDocument(c *gin.Context) {
	projectID := c.Param("id")
	taskID := c.Param("taskId")

	// 验证项目ID和任务ID是否为数字
	if _, err := strconv.Atoi(projectID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}
	if _, err := strconv.Atoi(taskID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	h.getDocumentGin(c, taskID)
}

// SaveTaskDocument 保存任务文档 (Gin版本)
func (h *TaskDocumentHandler) SaveTaskDocument(c *gin.Context) {
	projectID := c.Param("id")
	taskID := c.Param("taskId")

	// 验证项目ID和任务ID是否为数字
	if _, err := strconv.Atoi(projectID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}
	if _, err := strconv.Atoi(taskID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	h.saveDocumentGin(c, taskID)
}

// CheckTaskDocument 检查任务文档是否存在 (Gin版本)
func (h *TaskDocumentHandler) CheckTaskDocument(c *gin.Context) {
	projectID := c.Param("id")
	taskID := c.Param("taskId")

	// 验证项目ID和任务ID是否为数字
	if _, err := strconv.Atoi(projectID); err != nil {
		c.Status(http.StatusBadRequest)
		return
	}
	if _, err := strconv.Atoi(taskID); err != nil {
		c.Status(http.StatusBadRequest)
		return
	}

	h.checkDocumentGin(c, taskID)
}

// getDocumentGin 获取文档内容 (Gin版本)
func (h *TaskDocumentHandler) getDocumentGin(c *gin.Context, taskID string) {
	filePath := h.getDocumentPath(taskID)

	content, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			// 文件不存在，返回默认模板
			defaultContent := h.generateDefaultTemplate(taskID)
			c.JSON(http.StatusOK, DocumentResponse{Content: defaultContent})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("读取文档失败: %v", err)})
		return
	}

	c.JSON(http.StatusOK, DocumentResponse{Content: string(content)})
}

// saveDocumentGin 保存文档内容 (Gin版本)
func (h *TaskDocumentHandler) saveDocumentGin(c *gin.Context, taskID string) {
	// 确保文档目录存在
	if err := h.ensureDocsDir(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("创建文档目录失败: %v", err)})
		return
	}

	var request DocumentRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("解析请求体失败: %v", err)})
		return
	}

	filePath := h.getDocumentPath(taskID)
	if err := os.WriteFile(filePath, []byte(request.Content), 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("保存文档失败: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// checkDocumentGin 检查文档是否存在 (Gin版本)
func (h *TaskDocumentHandler) checkDocumentGin(c *gin.Context, taskID string) {
	filePath := h.getDocumentPath(taskID)

	if _, err := os.Stat(filePath); err != nil {
		if os.IsNotExist(err) {
			c.Status(http.StatusNotFound)
			return
		}
		c.Status(http.StatusInternalServerError)
		return
	}

	c.Status(http.StatusOK)
}