package handlers

import (
	"archive/zip"
	"context"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// DocumentDownloadHandler 文档下载处理器
type DocumentDownloadHandler struct {
	db             *gorm.DB
	storageAdapter StorageAdapter
}

// NewDocumentDownloadHandler 创建文档下载处理器
func NewDocumentDownloadHandler(db *gorm.DB, storageAdapter StorageAdapter) *DocumentDownloadHandler {
	return &DocumentDownloadHandler{
		db:             db,
		storageAdapter: storageAdapter,
	}
}

// DownloadDocument 下载单个文档
func (h *DocumentDownloadHandler) DownloadDocument(c *gin.Context) {
	projectID, err := strconv.ParseInt(c.Param("project_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的项目ID",
			"error":   err.Error(),
		})
		return
	}

	taskID, err := strconv.ParseInt(c.Param("task_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的任务ID",
			"error":   err.Error(),
		})
		return
	}

	documentID, err := strconv.ParseInt(c.Param("document_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的文档ID",
			"error":   err.Error(),
		})
		return
	}

	// 查询文档信息
	var document Document
	if err := h.db.Where("id = ? AND project_id = ? AND task_id = ? AND deleted_at IS NULL", 
		documentID, projectID, taskID).First(&document).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "文档不存在",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "查询文档失败",
				"error":   err.Error(),
			})
		}
		return
	}

	// 检查权限（这里简化处理，实际应根据文档可见性和用户权限判断）
	if document.Visibility == "private" {
		userID := c.GetInt64("user_id")
		if document.UploadedBy != userID {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": "无权限访问此文档",
			})
			return
		}
	}

	// 从存储中获取文件
	reader, err := h.storageAdapter.Retrieve(c.Request.Context(), document.StoragePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "获取文件失败",
			"error":   err.Error(),
		})
		return
	}
	defer reader.Close()

	// 设置响应头
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", document.FileName))
	c.Header("Content-Type", h.getContentType(document.FileType))
	c.Header("Content-Length", strconv.FormatInt(document.FileSize, 10))
	c.Header("Cache-Control", "public, max-age=86400") // 缓存1天

	// 流式传输文件内容
	_, err = io.Copy(c.Writer, reader)
	if err != nil {
		// 如果已经开始写入响应，就不能再返回JSON错误了
		return
	}

	// 更新下载计数
	go h.updateDownloadCount(documentID)
}

// DownloadDocumentVersion 下载指定版本的文档
func (h *DocumentDownloadHandler) DownloadDocumentVersion(c *gin.Context) {
	projectID, err := strconv.ParseInt(c.Param("project_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的项目ID",
			"error":   err.Error(),
		})
		return
	}

	taskID, err := strconv.ParseInt(c.Param("task_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的任务ID",
			"error":   err.Error(),
		})
		return
	}

	documentID, err := strconv.ParseInt(c.Param("document_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的文档ID",
			"error":   err.Error(),
		})
		return
	}

	versionID, err := strconv.ParseInt(c.Param("version_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的版本ID",
			"error":   err.Error(),
		})
		return
	}

	// 查询文档版本信息
	var version DocumentVersion
	if err := h.db.Where("id = ? AND document_id = ?", versionID, documentID).
		First(&version).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "文档版本不存在",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "查询版本失败",
				"error":   err.Error(),
			})
		}
		return
	}

	// 查询主文档以检查权限
	var document Document
	if err := h.db.Where("id = ? AND project_id = ? AND task_id = ?", 
		documentID, projectID, taskID).First(&document).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "文档不存在",
		})
		return
	}

	// 检查权限
	if document.Visibility == "private" {
		userID := c.GetInt64("user_id")
		if document.UploadedBy != userID {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": "无权限访问此文档",
			})
			return
		}
	}

	// 从存储中获取版本文件
	reader, err := h.storageAdapter.Retrieve(c.Request.Context(), version.StoragePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "获取版本文件失败",
			"error":   err.Error(),
		})
		return
	}
	defer reader.Close()

	// 生成版本文件名
	ext := filepath.Ext(version.FileName)
	name := strings.TrimSuffix(version.FileName, ext)
	versionFileName := fmt.Sprintf("%s_v%d%s", name, version.VersionNumber, ext)

	// 设置响应头
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", versionFileName))
	c.Header("Content-Type", h.getContentType(version.FileType))
	c.Header("Content-Length", strconv.FormatInt(version.FileSize, 10))

	// 流式传输文件内容
	io.Copy(c.Writer, reader)

	// 记录版本下载
	go h.recordVersionDownload(versionID)
}

// BatchDownloadDocuments 批量下载文档（生成ZIP）
func (h *DocumentDownloadHandler) BatchDownloadDocuments(c *gin.Context) {
	projectID, err := strconv.ParseInt(c.Param("project_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的项目ID",
			"error":   err.Error(),
		})
		return
	}

	taskID, err := strconv.ParseInt(c.Param("task_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的任务ID",
			"error":   err.Error(),
		})
		return
	}

	// 解析请求体，获取文档ID列表
	var request struct {
		DocumentIDs []int64 `json:"document_ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数错误",
			"error":   err.Error(),
		})
		return
	}

	if len(request.DocumentIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "文档ID列表不能为空",
		})
		return
	}

	if len(request.DocumentIDs) > 50 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "批量下载文档数量不能超过50个",
		})
		return
	}

	// 查询文档列表
	var documents []Document
	if err := h.db.Where("id IN ? AND project_id = ? AND task_id = ? AND deleted_at IS NULL", 
		request.DocumentIDs, projectID, taskID).Find(&documents).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "查询文档失败",
			"error":   err.Error(),
		})
		return
	}

	if len(documents) == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "未找到可下载的文档",
		})
		return
	}

	// 创建ZIP压缩包
	zipFileName := fmt.Sprintf("documents_project_%d_task_%d_%s.zip", 
		projectID, taskID, time.Now().Format("20060102_150405"))
	
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", zipFileName))
	c.Header("Content-Type", "application/zip")

	// 使用ZIP writer直接写入响应
	err = h.createZipArchive(c.Writer, documents)
	if err != nil {
		// 如果ZIP创建失败，尝试返回错误（如果还没开始写响应的话）
		return
	}

	// 批量更新下载计数
	go h.batchUpdateDownloadCount(request.DocumentIDs)
}

// ConvertToPDF 将文档转换为PDF格式下载
func (h *DocumentDownloadHandler) ConvertToPDF(c *gin.Context) {
	projectID, err := strconv.ParseInt(c.Param("project_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的项目ID",
			"error":   err.Error(),
		})
		return
	}

	taskID, err := strconv.ParseInt(c.Param("task_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的任务ID",
			"error":   err.Error(),
		})
		return
	}

	documentID, err := strconv.ParseInt(c.Param("document_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的文档ID",
			"error":   err.Error(),
		})
		return
	}

	// 查询文档信息
	var document Document
	if err := h.db.Where("id = ? AND project_id = ? AND task_id = ? AND deleted_at IS NULL", 
		documentID, projectID, taskID).First(&document).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "文档不存在",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "查询文档失败",
				"error":   err.Error(),
			})
		}
		return
	}

	// 检查是否支持PDF转换
	if !h.supportsPDFConversion(document.FileType) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": fmt.Sprintf("文件类型 '%s' 不支持PDF转换", document.FileType),
		})
		return
	}

	// 获取文档内容
	reader, err := h.storageAdapter.Retrieve(c.Request.Context(), document.StoragePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "获取文件失败",
			"error":   err.Error(),
		})
		return
	}
	defer reader.Close()

	// 转换为PDF
	pdfContent, err := h.convertToPDF(document, reader)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "PDF转换失败",
			"error":   err.Error(),
		})
		return
	}

	// 生成PDF文件名
	pdfFileName := strings.TrimSuffix(document.FileName, filepath.Ext(document.FileName)) + ".pdf"

	// 设置响应头
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", pdfFileName))
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Length", strconv.Itoa(len(pdfContent)))

	// 输出PDF内容
	c.Data(http.StatusOK, "application/pdf", pdfContent)

	// 更新下载计数
	go h.updateDownloadCount(documentID)
}

// PreviewDocument 预览文档（在线查看，不下载）
func (h *DocumentDownloadHandler) PreviewDocument(c *gin.Context) {
	projectID, err := strconv.ParseInt(c.Param("project_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的项目ID",
			"error":   err.Error(),
		})
		return
	}

	taskID, err := strconv.ParseInt(c.Param("task_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的任务ID",
			"error":   err.Error(),
		})
		return
	}

	documentID, err := strconv.ParseInt(c.Param("document_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的文档ID",
			"error":   err.Error(),
		})
		return
	}

	// 查询文档信息
	var document Document
	if err := h.db.Where("id = ? AND project_id = ? AND task_id = ? AND deleted_at IS NULL", 
		documentID, projectID, taskID).First(&document).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "文档不存在",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "查询文档失败",
				"error":   err.Error(),
			})
		}
		return
	}

	// 检查权限
	if document.Visibility == "private" {
		userID := c.GetInt64("user_id")
		if document.UploadedBy != userID {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": "无权限访问此文档",
			})
			return
		}
	}

	// 获取文件内容
	reader, err := h.storageAdapter.Retrieve(c.Request.Context(), document.StoragePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "获取文件失败",
			"error":   err.Error(),
		})
		return
	}
	defer reader.Close()

	// 设置响应头为在线查看
	c.Header("Content-Type", h.getContentType(document.FileType))
	c.Header("Cache-Control", "public, max-age=3600") // 缓存1小时
	
	// 对于可预览的文件类型，设置inline；否则强制下载
	if h.supportsInlinePreview(document.FileType) {
		c.Header("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", document.FileName))
	} else {
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", document.FileName))
	}

	// 流式传输文件内容
	io.Copy(c.Writer, reader)

	// 记录预览（不增加下载计数）
	go h.recordDocumentPreview(documentID)
}

// 辅助方法

// getContentType 根据文件类型获取MIME类型
func (h *DocumentDownloadHandler) getContentType(fileType string) string {
	contentTypes := map[string]string{
		"markdown": "text/markdown",
		"pdf":      "application/pdf",
		"text":     "text/plain",
		"html":     "text/html",
		"json":     "application/json",
		"xml":      "application/xml",
		"docx":     "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		"image":    "image/jpeg", // 默认，实际应根据具体图片类型
	}

	if contentType, exists := contentTypes[fileType]; exists {
		return contentType
	}
	return "application/octet-stream" // 默认二进制类型
}

// supportsInlinePreview 检查文件类型是否支持在线预览
func (h *DocumentDownloadHandler) supportsInlinePreview(fileType string) bool {
	inlineTypes := map[string]bool{
		"pdf":      true,
		"text":     true,
		"html":     true,
		"json":     true,
		"xml":      true,
		"markdown": true,
		"image":    true,
	}
	return inlineTypes[fileType]
}

// supportsPDFConversion 检查文件类型是否支持PDF转换
func (h *DocumentDownloadHandler) supportsPDFConversion(fileType string) bool {
	convertibleTypes := map[string]bool{
		"markdown": true,
		"html":     true,
		"text":     true,
	}
	return convertibleTypes[fileType]
}

// updateDownloadCount 更新文档下载计数
func (h *DocumentDownloadHandler) updateDownloadCount(documentID int64) {
	h.db.Model(&Document{}).Where("id = ?", documentID).
		UpdateColumn("download_count", gorm.Expr("download_count + 1"))
}

// batchUpdateDownloadCount 批量更新下载计数
func (h *DocumentDownloadHandler) batchUpdateDownloadCount(documentIDs []int64) {
	for _, id := range documentIDs {
		h.updateDownloadCount(id)
	}
}

// recordVersionDownload 记录版本下载
func (h *DocumentDownloadHandler) recordVersionDownload(versionID int64) {
	// 这里可以记录版本下载日志到document_operations表
	operation := DocumentOperation{
		DocumentID:  versionID, // 这里应该是document_id，需要查询获取
		OperationType: "version_download",
		IPAddress:   "system", // 实际应从请求中获取
		UserAgent:   "system",
		IsSuccess:   true,
		CreatedAt:   time.Now(),
	}
	h.db.Create(&operation)
}

// recordDocumentPreview 记录文档预览
func (h *DocumentDownloadHandler) recordDocumentPreview(documentID int64) {
	operation := DocumentOperation{
		DocumentID:    documentID,
		OperationType: "preview",
		IPAddress:     "system",
		UserAgent:     "system", 
		IsSuccess:     true,
		CreatedAt:     time.Now(),
	}
	h.db.Create(&operation)
}

// createZipArchive 创建ZIP压缩包
func (h *DocumentDownloadHandler) createZipArchive(writer io.Writer, documents []Document) error {
	zipWriter := zip.NewWriter(writer)
	defer zipWriter.Close()

	for _, doc := range documents {
		// 获取文档内容
		reader, err := h.storageAdapter.Retrieve(context.Background(), doc.StoragePath)
		if err != nil {
			continue // 跳过无法获取的文档
		}

		// 创建ZIP条目
		zipEntry, err := zipWriter.Create(doc.FileName)
		if err != nil {
			reader.Close()
			continue
		}

		// 复制文件内容到ZIP
		_, err = io.Copy(zipEntry, reader)
		reader.Close()
		if err != nil {
			continue
		}
	}

	return nil
}

// convertToPDF 将文档转换为PDF
func (h *DocumentDownloadHandler) convertToPDF(document Document, reader io.Reader) ([]byte, error) {
	// 读取文档内容
	content, err := io.ReadAll(reader)
	if err != nil {
		return nil, fmt.Errorf("读取文档内容失败: %w", err)
	}

	switch document.FileType {
	case "markdown":
		return h.convertMarkdownToPDF(string(content))
	case "html":
		return h.convertHTMLToPDF(string(content))
	case "text":
		return h.convertTextToPDF(string(content))
	default:
		return nil, fmt.Errorf("不支持的文件类型: %s", document.FileType)
	}
}

// convertMarkdownToPDF 将Markdown转换为PDF
func (h *DocumentDownloadHandler) convertMarkdownToPDF(markdown string) ([]byte, error) {
	// 这里应该使用实际的Markdown到PDF转换库
	// 简化实现：生成简单的HTML然后转换为PDF
	html := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Markdown Document</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1, h2, h3 { color: #333; }
        pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
        code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
    </style>
</head>
<body>
    <pre>%s</pre>
</body>
</html>`, markdown)

	return h.convertHTMLToPDF(html)
}

// convertHTMLToPDF 将HTML转换为PDF
func (h *DocumentDownloadHandler) convertHTMLToPDF(html string) ([]byte, error) {
	// 这里应该使用实际的HTML到PDF转换库，如wkhtmltopdf或chromedp
	// 简化实现：返回模拟的PDF内容
	pdfContent := fmt.Sprintf("%%PDF-1.4\n%%Simplified PDF content for: %s", html[:min(100, len(html))])
	return []byte(pdfContent), nil
}

// convertTextToPDF 将纯文本转换为PDF
func (h *DocumentDownloadHandler) convertTextToPDF(text string) ([]byte, error) {
	html := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Text Document</title>
    <style>
        body { font-family: monospace; margin: 40px; line-height: 1.4; }
        pre { white-space: pre-wrap; word-wrap: break-word; }
    </style>
</head>
<body>
    <pre>%s</pre>
</body>
</html>`, text)

	return h.convertHTMLToPDF(html)
}

// StorageAdapter 存储适配器接口
type StorageAdapter interface {
	Retrieve(ctx context.Context, path string) (io.ReadCloser, error)
	Store(ctx context.Context, path string, content io.Reader) error
	Delete(ctx context.Context, path string) error
	Exists(ctx context.Context, path string) (bool, error)
}

// Document 文档模型 (DocumentDownloadHandler specific)
type Document struct {
	ID             int64     `gorm:"primaryKey" json:"id"`
	Title          string    `gorm:"not null" json:"title"`
	Description    string    `json:"description"`
	FileName       string    `gorm:"not null" json:"file_name"`
	FileType       string    `gorm:"not null" json:"file_type"`
	FileSize       int64     `gorm:"not null" json:"file_size"`
	StoragePath    string    `gorm:"not null" json:"storage_path"`
	Status         string    `gorm:"default:'draft'" json:"status"`
	Visibility     string    `gorm:"default:'private'" json:"visibility"`
	ProjectID      int64     `gorm:"not null;index" json:"project_id"`
	TaskID         int64     `gorm:"not null;index" json:"task_id"`
	CurrentVersion int       `gorm:"default:1" json:"current_version"`
	TotalVersions  int       `gorm:"default:1" json:"total_versions"`
	DownloadCount  int       `gorm:"default:0" json:"download_count"`
	Checksum       string    `json:"checksum"`
	UploadedBy     int64     `gorm:"not null;index" json:"uploaded_by"`
	UpdatedBy      *int64    `gorm:"index" json:"updated_by"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
	PublishedAt    *time.Time `json:"published_at"`
	DeletedAt      *time.Time `gorm:"index" json:"deleted_at"`
}

// DocumentVersion 文档版本模型 (DocumentDownloadHandler specific)
type DocumentVersion struct {
	ID            int64     `gorm:"primaryKey" json:"id"`
	DocumentID    int64     `gorm:"not null;index" json:"document_id"`
	VersionNumber int       `gorm:"not null" json:"version_number"`
	FileName      string    `gorm:"not null" json:"file_name"`
	FileType      string    `gorm:"not null" json:"file_type"`
	FileSize      int64     `gorm:"not null" json:"file_size"`
	StoragePath   string    `gorm:"not null" json:"storage_path"`
	Checksum      string    `json:"checksum"`
	ChangeSummary string    `json:"change_summary"`
	IsCurrent     bool      `gorm:"default:false" json:"is_current"`
	CreatedBy     int64     `gorm:"not null;index" json:"created_by"`
	CreatedAt     time.Time `json:"created_at"`
}

// DocumentOperation 文档操作记录模型 (DocumentDownloadHandler specific)
type DocumentOperation struct {
	ID            int64     `gorm:"primaryKey" json:"id"`
	DocumentID    int64     `gorm:"not null;index" json:"document_id"`
	OperationType string    `gorm:"not null" json:"operation_type"` // download, preview, edit, delete
	IPAddress     string    `json:"ip_address"`
	UserAgent     string    `json:"user_agent"`
	UserID        *int64    `gorm:"index" json:"user_id"`
	IsSuccess     bool      `gorm:"default:true" json:"is_success"`
	ErrorMessage  string    `json:"error_message"`
	CreatedAt     time.Time `json:"created_at"`
}

