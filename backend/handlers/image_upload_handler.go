package handlers

import (
	"ai-project-backend/models"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// ImageUploadHandler 图片上传处理器
type ImageUploadHandler struct {
	logger *log.Logger
}

// NewImageUploadHandler 创建图片上传处理器
func NewImageUploadHandler(logger *log.Logger) *ImageUploadHandler {
	return &ImageUploadHandler{
		logger: logger,
	}
}

// UploadImage godoc
// @Summary 上传图片
// @Description 上传图片文件，支持富文本编辑器图片上传
// @Tags 文件上传
// @Accept multipart/form-data
// @Produce json
// @Param image formData file true "图片文件"
// @Success 200 {object} models.APIResponse{data=map[string]interface{}} "上传成功，返回图片URL"
// @Failure 400 {object} models.APIResponse "无效的请求"
// @Failure 413 {object} models.APIResponse "文件过大"
// @Failure 500 {object} models.APIResponse "服务器错误"
// @Router /api/v1/upload/image [post]
// @Security BearerAuth
func (h *ImageUploadHandler) UploadImage(c *gin.Context) {
	// 获取上传的文件
	file, header, err := c.Request.FormFile("image")
	if err != nil {
		h.logger.Printf("Error getting uploaded file: %v", err)
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "No file uploaded", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}
	defer file.Close()

	// 验证文件类型
	if !isValidImage(header) {
		response := models.NewErrorResponse(
			models.ErrCodeBadRequest,
			"Invalid file type",
			"Only image files (jpg, jpeg, png, gif, webp, svg) are allowed",
		)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// 验证文件大小 (最大 10MB)
	const maxSize = 10 * 1024 * 1024 // 10MB
	if header.Size > maxSize {
		response := models.NewErrorResponse(
			models.ErrCodeBadRequest,
			"File too large",
			fmt.Sprintf("File size must be less than %dMB", maxSize/(1024*1024)),
		)
		c.JSON(http.StatusRequestEntityTooLarge, response)
		return
	}

	// 创建上传目录
	uploadDir := "uploads/images"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		h.logger.Printf("Error creating upload directory: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to create upload directory", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// 生成唯一文件名
	ext := filepath.Ext(header.Filename)
	filename := fmt.Sprintf("img_%d_%s%s", time.Now().Unix(), generateRandomString(8), ext)
	filePath := filepath.Join(uploadDir, filename)

	// 保存文件
	dst, err := os.Create(filePath)
	if err != nil {
		h.logger.Printf("Error creating file: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to create file", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		h.logger.Printf("Error copying file: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to save file", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// 生成访问URL
	imageURL := fmt.Sprintf("/api/v1/uploads/images/%s", filename)

	h.logger.Printf("Image uploaded successfully: %s (size: %d bytes)", filename, header.Size)

	response := models.NewSuccessResponse(map[string]interface{}{
		"url":      imageURL,
		"filename": filename,
		"size":     header.Size,
		"type":     header.Header.Get("Content-Type"),
	}, "Image uploaded successfully")
	c.JSON(http.StatusOK, response)
}

// isValidImage 验证是否为有效的图片文件
func isValidImage(header *multipart.FileHeader) bool {
	allowedTypes := []string{".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"}
	ext := strings.ToLower(filepath.Ext(header.Filename))

	for _, allowedType := range allowedTypes {
		if ext == allowedType {
			return true
		}
	}
	return false
}

// generateRandomString 生成随机字符串
func generateRandomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}
	return string(b)
}

// ServeUploadedImage godoc
// @Summary 获取上传的图片
// @Description 通过文件名获取上传的图片
// @Tags 文件上传
// @Produce image/jpeg,image/png,image/gif,image/webp,image/svg+xml
// @Param filename path string true "文件名"
// @Success 200 {file} binary "图片文件"
// @Failure 404 {object} models.APIResponse "文件不存在"
// @Router /api/v1/uploads/images/{filename} [get]
func (h *ImageUploadHandler) ServeUploadedImage(c *gin.Context) {
	filename := c.Param("filename")

	// 安全检查：防止目录遍历攻击
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") || strings.Contains(filename, "\\") {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid filename", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	filePath := filepath.Join("uploads/images", filename)

	// 检查文件是否存在
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "File not found", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	// 提供文件
	c.File(filePath)
}
