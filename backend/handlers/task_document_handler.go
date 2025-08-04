package handlers

import (
	"encoding/base64"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// TaskDocumentHandler 任务文档处理器
type TaskDocumentHandler struct {
	docsBasePath string
	db          *gorm.DB
}

// NewTaskDocumentHandler 创建任务文档处理器实例
func NewTaskDocumentHandler(docsBasePath string, db *gorm.DB) *TaskDocumentHandler {
	return &TaskDocumentHandler{
		docsBasePath: docsBasePath,
		db:          db,
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

// ensureProjectDocsDir 确保项目文档目录存在
func (h *TaskDocumentHandler) ensureProjectDocsDir(projectID string) error {
	projectDir := filepath.Join(h.docsBasePath, "tasks", "projects", fmt.Sprintf("project-%s", projectID))
	return os.MkdirAll(projectDir, 0755)
}

// getDocumentPath 获取文档文件路径（向后兼容版本）
func (h *TaskDocumentHandler) getDocumentPath(taskID string) string {
	return filepath.Join(h.docsBasePath, fmt.Sprintf("%s.md", taskID))
}

// getProjectDocumentPath 获取项目结构的文档文件路径
func (h *TaskDocumentHandler) getProjectDocumentPath(projectID, taskID string) string {
	return filepath.Join(h.docsBasePath, "tasks", "projects", fmt.Sprintf("project-%s", projectID), fmt.Sprintf("task-%s.md", taskID))
}

// getBestDocumentPath 获取最佳文档路径（优先项目路径，回退到简单路径）
func (h *TaskDocumentHandler) getBestDocumentPath(projectID, taskID string) string {
	// 优先检查项目路径
	projectPath := h.getProjectDocumentPath(projectID, taskID)
	if _, err := os.Stat(projectPath); err == nil {
		return projectPath
	}

	// 回退到简单路径
	simplePath := h.getDocumentPath(taskID)
	if _, err := os.Stat(simplePath); err == nil {
		return simplePath
	}

	// 如果都不存在，返回项目路径（用于新文档）
	return projectPath
}

// 删除模板功能 - 防止覆盖用户内容
// generateDefaultTemplate 功能已删除，避免意外覆盖用户数据

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

	h.getDocumentGin(c, projectID, taskID)
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

	h.saveDocumentGin(c, projectID, taskID)
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

	h.checkDocumentGin(c, projectID, taskID)
}

// getDocumentGin 获取文档内容 (Gin版本)
func (h *TaskDocumentHandler) getDocumentGin(c *gin.Context, projectID, taskID string) {
	filePath := h.getBestDocumentPath(projectID, taskID)

	content, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			// 文件不存在，返回空内容而不是模板，避免覆盖用户数据
			c.JSON(http.StatusOK, DocumentResponse{Content: ""})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("读取文档失败: %v", err)})
		return
	}

	c.JSON(http.StatusOK, DocumentResponse{Content: string(content)})
}

// saveDocumentGin 保存文档内容 (Gin版本)
func (h *TaskDocumentHandler) saveDocumentGin(c *gin.Context, projectID, taskID string) {
	// 确保项目文档目录存在
	if err := h.ensureProjectDocsDir(projectID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("创建项目文档目录失败: %v", err)})
		return
	}

	var request DocumentRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("解析请求体失败: %v", err)})
		return
	}

	// 使用项目路径保存新文档
	filePath := h.getProjectDocumentPath(projectID, taskID)
	if err := os.WriteFile(filePath, []byte(request.Content), 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("保存文档失败: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// checkDocumentGin 检查文档是否存在 (Gin版本)
func (h *TaskDocumentHandler) checkDocumentGin(c *gin.Context, projectID, taskID string) {
	filePath := h.getBestDocumentPath(projectID, taskID)

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

// ===== New Upload/Download Functionality for Task 307 =====

// UploadDocumentRequest API上传请求结构
type UploadDocumentRequest struct {
	FileName    string `json:"file_name" binding:"required"`
	Content     string `json:"content" binding:"required"` // base64 encoded
	MimeType    string `json:"mime_type"`
	Description string `json:"description"`
}

// UploadedDocumentInfo 上传文档信息
type UploadedDocumentInfo struct {
	ID           uint      `json:"id"`
	FileName     string    `json:"file_name"`
	OriginalName string    `json:"original_name"`
	FileSize     int64     `json:"file_size"`
	MimeType     string    `json:"mime_type"`
	UploadType   string    `json:"upload_type"`
	UploadedAt   time.Time `json:"uploaded_at"`
	FilePath     string    `json:"file_path"`
}

// ManualUploadDocument 手工上传文档
func (h *TaskDocumentHandler) ManualUploadDocument(c *gin.Context) {
	projectID := c.Param("id")
	taskID := c.Param("taskId")

	// 验证参数
	if _, err := strconv.Atoi(projectID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid project ID"})
		return
	}
	if _, err := strconv.Atoi(taskID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid task ID"})
		return
	}

	// 获取用户ID (假设从中间件中获取)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "User not authenticated"})
		return
	}

	// 获取上传的文件
	fileHeader, err := c.FormFile("document")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "No file uploaded"})
		return
	}

	// 验证文件
	if err := h.validateUploadedFile(fileHeader); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	// 保存文件
	docInfo, err := h.saveUploadedFile(fileHeader, projectID, taskID, userID.(uint), "manual")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Document uploaded successfully",
		"data":    docInfo,
	})
}

// APIUploadDocument API上传文档
func (h *TaskDocumentHandler) APIUploadDocument(c *gin.Context) {
	projectID := c.Param("id")
	taskID := c.Param("taskId")

	// 验证参数
	if _, err := strconv.Atoi(projectID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid project ID"})
		return
	}
	if _, err := strconv.Atoi(taskID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid task ID"})
		return
	}

	// 获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "User not authenticated"})
		return
	}

	// 解析请求
	var req UploadDocumentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid request format"})
		return
	}

	// 解码base64内容
	content, err := base64.StdEncoding.DecodeString(req.Content)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid base64 content"})
		return
	}

	// 验证文件扩展名
	if err := h.validateFileExtension(req.FileName); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	// 保存API上传的文件
	docInfo, err := h.saveAPIUploadedFile(req.FileName, content, req.MimeType, projectID, taskID, userID.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Document uploaded successfully via API",
		"data":    docInfo,
	})
}

// GetTaskDocuments 获取任务的所有文档
func (h *TaskDocumentHandler) GetTaskDocuments(c *gin.Context) {
	projectID := c.Param("id")
	taskID := c.Param("taskId")

	// 验证参数
	if _, err := strconv.Atoi(projectID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid project ID"})
		return
	}
	if _, err := strconv.Atoi(taskID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid task ID"})
		return
	}

	// 获取任务的上传文档列表
	docs, err := h.getTaskUploadedDocuments(projectID, taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"documents": docs,
			"total":     len(docs),
		},
	})
}

// DownloadTaskMarkdown 下载任务的Markdown格式
func (h *TaskDocumentHandler) DownloadTaskMarkdown(c *gin.Context) {
	projectID := c.Param("id")
	taskID := c.Param("taskId")

	// 验证参数
	if _, err := strconv.Atoi(projectID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid project ID"})
		return
	}
	if _, err := strconv.Atoi(taskID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid task ID"})
		return
	}

	// 生成Markdown内容
	content, err := h.generateTaskMarkdown(projectID, taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	// 设置下载响应头
	fileName := fmt.Sprintf("task-%s-%s.md", taskID, time.Now().Format("20060102-150405"))
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", fileName))
	c.Header("Content-Type", "text/markdown")
	c.Data(http.StatusOK, "text/markdown", []byte(content))
}

// DownloadTaskPDF 下载任务的PDF格式
func (h *TaskDocumentHandler) DownloadTaskPDF(c *gin.Context) {
	projectID := c.Param("id")
	taskID := c.Param("taskId")

	// 验证参数
	if _, err := strconv.Atoi(projectID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid project ID"})
		return
	}
	if _, err := strconv.Atoi(taskID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid task ID"})
		return
	}

	// 先生成Markdown内容
	markdownContent, err := h.generateTaskMarkdown(projectID, taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	// 转换为PDF (这里是简化版本，实际应该用专门的PDF库)
	pdfContent, err := h.convertMarkdownToPDF(markdownContent, taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	// 设置下载响应头
	fileName := fmt.Sprintf("task-%s-%s.pdf", taskID, time.Now().Format("20060102-150405"))
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", fileName))
	c.Header("Content-Type", "application/pdf")
	c.Data(http.StatusOK, "application/pdf", pdfContent)
}

// Helper functions

// validateUploadedFile 验证上传的文件
func (h *TaskDocumentHandler) validateUploadedFile(fileHeader *multipart.FileHeader) error {
	// 检查文件大小 (10MB限制)
	maxSize := int64(10 * 1024 * 1024)
	if fileHeader.Size > maxSize {
		return fmt.Errorf("file size %d exceeds maximum allowed size %d", fileHeader.Size, maxSize)
	}

	// 检查文件扩展名
	return h.validateFileExtension(fileHeader.Filename)
}

// validateFileExtension 验证文件扩展名
func (h *TaskDocumentHandler) validateFileExtension(fileName string) error {
	ext := strings.ToLower(filepath.Ext(fileName))
	allowedExts := []string{".md", ".pdf", ".txt"}

	for _, allowedExt := range allowedExts {
		if ext == allowedExt {
			return nil
		}
	}

	return fmt.Errorf("file extension %s is not allowed. Allowed: %v", ext, allowedExts)
}

// saveUploadedFile 保存上传的文件
func (h *TaskDocumentHandler) saveUploadedFile(fileHeader *multipart.FileHeader, projectID, taskID string, userID uint, uploadType string) (*UploadedDocumentInfo, error) {
	// 确保上传目录存在
	uploadDir := filepath.Join(h.docsBasePath, "uploads", "projects", fmt.Sprintf("project-%s", projectID), fmt.Sprintf("task-%s", taskID))
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create upload directory: %w", err)
	}

	// 生成唯一文件名
	timestamp := time.Now().Format("20060102_150405")
	ext := filepath.Ext(fileHeader.Filename)
	baseName := strings.TrimSuffix(fileHeader.Filename, ext)
	fileName := fmt.Sprintf("%s_%s_%d%s", baseName, timestamp, time.Now().UnixNano()%10000, ext)
	filePath := filepath.Join(uploadDir, fileName)

	// 打开上传的文件
	src, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer src.Close()

	// 创建目标文件
	dst, err := os.Create(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to create destination file: %w", err)
	}
	defer dst.Close()

	// 复制文件内容
	if _, err := io.Copy(dst, src); err != nil {
		return nil, fmt.Errorf("failed to save file: %w", err)
	}

	// 创建文档信息记录
	docInfo := &UploadedDocumentInfo{
		FileName:     fileName,
		OriginalName: fileHeader.Filename,
		FileSize:     fileHeader.Size,
		MimeType:     h.getMimeType(fileHeader.Filename),
		UploadType:   uploadType,
		UploadedAt:   time.Now(),
		FilePath:     filePath,
	}

	return docInfo, nil
}

// saveAPIUploadedFile 保存API上传的文件
func (h *TaskDocumentHandler) saveAPIUploadedFile(fileName string, content []byte, mimeType, projectID, taskID string, userID uint) (*UploadedDocumentInfo, error) {
	// 确保上传目录存在
	uploadDir := filepath.Join(h.docsBasePath, "uploads", "projects", fmt.Sprintf("project-%s", projectID), fmt.Sprintf("task-%s", taskID))
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create upload directory: %w", err)
	}

	// 生成唯一文件名
	timestamp := time.Now().Format("20060102_150405")
	ext := filepath.Ext(fileName)
	baseName := strings.TrimSuffix(fileName, ext)
	uniqueFileName := fmt.Sprintf("%s_%s_%d%s", baseName, timestamp, time.Now().UnixNano()%10000, ext)
	filePath := filepath.Join(uploadDir, uniqueFileName)

	// 保存文件
	if err := os.WriteFile(filePath, content, 0644); err != nil {
		return nil, fmt.Errorf("failed to save file: %w", err)
	}

	// 创建文档信息记录
	docInfo := &UploadedDocumentInfo{
		FileName:     uniqueFileName,
		OriginalName: fileName,
		FileSize:     int64(len(content)),
		MimeType:     h.normalizeMimeType(mimeType, fileName),
		UploadType:   "api",
		UploadedAt:   time.Now(),
		FilePath:     filePath,
	}

	return docInfo, nil
}

// getTaskUploadedDocuments 获取任务的上传文档列表
func (h *TaskDocumentHandler) getTaskUploadedDocuments(projectID, taskID string) ([]UploadedDocumentInfo, error) {
	uploadDir := filepath.Join(h.docsBasePath, "uploads", "projects", fmt.Sprintf("project-%s", projectID), fmt.Sprintf("task-%s", taskID))

	var docs []UploadedDocumentInfo

	// 检查目录是否存在
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		return docs, nil // 返回空列表
	}

	// 读取目录中的文件
	entries, err := os.ReadDir(uploadDir)
	if err != nil {
		return nil, fmt.Errorf("failed to read upload directory: %w", err)
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		filePath := filepath.Join(uploadDir, entry.Name())
		info, err := entry.Info()
		if err != nil {
			continue
		}

		doc := UploadedDocumentInfo{
			FileName:     entry.Name(),
			OriginalName: entry.Name(), // 简化版本，实际应该从数据库获取
			FileSize:     info.Size(),
			MimeType:     h.getMimeType(entry.Name()),
			UploadType:   "manual", // 简化版本
			UploadedAt:   info.ModTime(),
			FilePath:     filePath,
		}

		docs = append(docs, doc)
	}

	return docs, nil
}

// generateTaskMarkdown 生成任务的Markdown导出内容
func (h *TaskDocumentHandler) generateTaskMarkdown(projectID, taskID string) (string, error) {
	var content strings.Builder

	// 读取原有任务文档
	existingDoc := h.getBestDocumentPath(projectID, taskID)
	if existingContent, err := os.ReadFile(existingDoc); err == nil {
		content.WriteString(string(existingContent))
		content.WriteString("\n\n")
	}

	// 添加上传文档信息
	docs, err := h.getTaskUploadedDocuments(projectID, taskID)
	if err != nil {
		return "", err
	}

	if len(docs) > 0 {
		content.WriteString("## 附件文档\n\n")

		for _, doc := range docs {
			content.WriteString(fmt.Sprintf("### %s\n\n", doc.OriginalName))
			content.WriteString(fmt.Sprintf("- **文件名**: %s\n", doc.FileName))
			content.WriteString(fmt.Sprintf("- **大小**: %d bytes\n", doc.FileSize))
			content.WriteString(fmt.Sprintf("- **类型**: %s\n", doc.MimeType))
			content.WriteString(fmt.Sprintf("- **上传时间**: %s\n", doc.UploadedAt.Format("2006-01-02 15:04:05")))
			content.WriteString(fmt.Sprintf("- **上传方式**: %s\n\n", doc.UploadType))

			// 如果是Markdown文件，包含内容
			if doc.MimeType == "text/markdown" {
				if fileContent, err := os.ReadFile(doc.FilePath); err == nil {
					content.WriteString("#### 内容:\n\n")
					content.WriteString("```markdown\n")
					content.WriteString(string(fileContent))
					content.WriteString("\n```\n\n")
				}
			}
		}
	}

	content.WriteString("---\n")
	content.WriteString(fmt.Sprintf("*导出时间: %s*\n", time.Now().Format("2006-01-02 15:04:05")))

	return content.String(), nil
}

// convertMarkdownToPDF 将Markdown转换为PDF (简化版本)
func (h *TaskDocumentHandler) convertMarkdownToPDF(markdownContent, taskID string) ([]byte, error) {
	// 这是一个简化的PDF生成实现
	// 在真实环境中，应该使用专门的PDF库如 wkhtmltopdf 或 chromedp

	pdfHeader := fmt.Sprintf("%%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n")
	pdfContent := fmt.Sprintf("Task #%s Export\n\nGenerated: %s\n\n%s",
		taskID,
		time.Now().Format("2006-01-02 15:04:05"),
		markdownContent)

	// 简化的PDF内容 (实际应该用专门的PDF生成库)
	fullPDF := pdfHeader + pdfContent

	return []byte(fullPDF), nil
}

// getMimeType 根据文件扩展名获取MIME类型
func (h *TaskDocumentHandler) getMimeType(fileName string) string {
	ext := strings.ToLower(filepath.Ext(fileName))
	switch ext {
	case ".md":
		return "text/markdown"
	case ".pdf":
		return "application/pdf"
	case ".txt":
		return "text/plain"
	default:
		return "application/octet-stream"
	}
}

// normalizeMimeType 标准化MIME类型
func (h *TaskDocumentHandler) normalizeMimeType(mimeType, fileName string) string {
	if mimeType != "" {
		return mimeType
	}
	return h.getMimeType(fileName)
}
