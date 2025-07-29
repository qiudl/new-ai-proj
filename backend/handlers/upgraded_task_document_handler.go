package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	// "database/sql"
	// "context" // 临时注释掉未使用的import
	
	"github.com/gin-gonic/gin"
	"ai-project-backend/models"
	"ai-project-backend/services" // 替换为实际项目路径
)

// UpgradedTaskDocumentHandler 升级版任务文档处理器
// 支持向后兼容和自动转发到统一文档系统
type UpgradedTaskDocumentHandler struct {
	// 文件系统兼容性
	docsBasePath string
	
	// 新的统一服务
	taskDocService       *services.TaskDocumentService
	unifiedHandler       *UnifiedTaskDocumentHandler
	
	// 配置选项
	useUnifiedSystem     bool  // 是否使用统一系统
	enableAutoMigration  bool  // 是否启用自动迁移
}

// NewUpgradedTaskDocumentHandler 创建升级版任务文档处理器实例
func NewUpgradedTaskDocumentHandler(
	docsBasePath string,
	taskDocService *services.TaskDocumentService,
	unifiedHandler *UnifiedTaskDocumentHandler,
	useUnifiedSystem, enableAutoMigration bool,
) *UpgradedTaskDocumentHandler {
	return &UpgradedTaskDocumentHandler{
		docsBasePath:        docsBasePath,
		taskDocService:      taskDocService,
		unifiedHandler:      unifiedHandler,
		useUnifiedSystem:    useUnifiedSystem,
		enableAutoMigration: enableAutoMigration,
	}
}

// GetTaskDocument 获取任务文档 (向后兼容)
func (h *UpgradedTaskDocumentHandler) GetTaskDocument(c *gin.Context) {
	if h.useUnifiedSystem {
		// 使用新的统一系统
		h.unifiedHandler.GetTaskDocument(c)
		return
	}
	
	// 使用传统文件系统，但尝试自动迁移
	projectID := c.Param("id")
	taskID := c.Param("taskID")
	
	// 验证参数
	if _, err := strconv.Atoi(projectID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}
	if _, err := strconv.Atoi(taskID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}
	
	// 如果启用自动迁移，检查是否应该迁移到新系统
	if h.enableAutoMigration {
		if migrated, err := h.tryAutoMigration(c, projectID, taskID); err == nil && migrated {
			// 迁移成功，使用新系统
			h.unifiedHandler.GetTaskDocument(c)
			return
		}
	}
	
	// 回退到文件系统
	h.getDocumentFromFile(c, taskID)
}

// SaveTaskDocument 保存任务文档 (向后兼容)
func (h *UpgradedTaskDocumentHandler) SaveTaskDocument(c *gin.Context) {
	if h.useUnifiedSystem {
		// 使用新的统一系统
		h.unifiedHandler.SaveTaskDocument(c)
		return
	}
	
	// 使用传统文件系统，但尝试自动迁移
	projectID := c.Param("id")
	taskID := c.Param("taskID")
	
	// 验证参数
	if _, err := strconv.Atoi(projectID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}
	if _, err := strconv.Atoi(taskID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}
	
	// 如果启用自动迁移，尝试将保存操作迁移到新系统
	if h.enableAutoMigration {
		if migrated, err := h.tryAutoMigrationWithSave(c, projectID, taskID); err == nil && migrated {
			return // 已通过新系统保存
		}
	}
	
	// 回退到文件系统
	h.saveDocumentToFile(c, taskID)
}

// CheckTaskDocument 检查任务文档是否存在 (向后兼容)
func (h *UpgradedTaskDocumentHandler) CheckTaskDocument(c *gin.Context) {
	if h.useUnifiedSystem {
		// 使用新的统一系统
		h.unifiedHandler.CheckTaskDocument(c)
		return
	}
	
	// 检查文件系统和新系统
	projectID := c.Param("id")
	taskID := c.Param("taskID")
	
	// 验证参数
	if _, err := strconv.Atoi(projectID); err != nil {
		c.Status(http.StatusBadRequest)
		return
	}
	if _, err := strconv.Atoi(taskID); err != nil {
		c.Status(http.StatusBadRequest)
		return
	}
	
	// 先检查新系统
	if h.taskDocService != nil {
		projID, _ := strconv.Atoi(projectID)
		taskIDInt, _ := strconv.Atoi(taskID)
		
		if exists, err := h.taskDocService.CheckTaskDocumentExists(c.Request.Context(), projID, taskIDInt); err == nil && exists {
			c.Status(http.StatusOK)
			return
		}
	}
	
	// 检查文件系统
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

// ====================
// 自动迁移功能
// ====================

// tryAutoMigration 尝试自动迁移单个任务文档
func (h *UpgradedTaskDocumentHandler) tryAutoMigration(c *gin.Context, projectID, taskID string) (bool, error) {
	if h.taskDocService == nil {
		return false, fmt.Errorf("task document service not available")
	}
	
	projID, _ := strconv.Atoi(projectID)
	taskIDInt, _ := strconv.Atoi(taskID)
	
	// 检查新系统中是否已存在
	exists, err := h.taskDocService.CheckTaskDocumentExists(c.Request.Context(), projID, taskIDInt)
	if err != nil {
		return false, err
	}
	if exists {
		return true, nil // 已存在，迁移完成
	}
	
	// 检查文件系统中是否有文档
	filePath := h.getDocumentPath(taskID)
	content, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return false, nil // 文件不存在，无需迁移
		}
		return false, err
	}
	
	// 执行迁移
	userID := getUserIDFromContext(c)
	if userID == 0 {
		userID = 1 // 默认用户ID
	}
	
	updateRequest := models.UpdateTaskDocumentRequest{
		Content: stringPtr(string(content)),
	}
	
	_, err = h.taskDocService.CreateOrUpdateTaskDocument(c.Request.Context(), projID, taskIDInt, updateRequest, userID)
	if err != nil {
		return false, err
	}
	
	// 迁移成功，可选择删除原文件（暂不删除，保留备份）
	return true, nil
}

// tryAutoMigrationWithSave 尝试自动迁移并保存
func (h *UpgradedTaskDocumentHandler) tryAutoMigrationWithSave(c *gin.Context, projectID, taskID string) (bool, error) {
	if h.taskDocService == nil {
		return false, fmt.Errorf("task document service not available")
	}
	
	projID, _ := strconv.Atoi(projectID)
	taskIDInt, _ := strconv.Atoi(taskID)
	
	// 解析请求内容
	var request DocumentRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		return false, err
	}
	
	// 获取用户ID
	userID := getUserIDFromContext(c)
	if userID == 0 {
		userID = 1 // 默认用户ID
	}
	
	// 直接保存到新系统
	updateRequest := models.UpdateTaskDocumentRequest{
		Content: &request.Content,
	}
	
	document, err := h.taskDocService.CreateOrUpdateTaskDocument(c.Request.Context(), projID, taskIDInt, updateRequest, userID)
	if err != nil {
		return false, err
	}
	
	// 返回成功响应
	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"document_id": document.DocumentID,
		"migrated":    true,
	})
	
	return true, nil
}

// ====================
// 文件系统兼容功能
// ====================

// getDocumentFromFile 从文件系统获取文档
func (h *UpgradedTaskDocumentHandler) getDocumentFromFile(c *gin.Context, taskID string) {
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

// saveDocumentToFile 保存文档到文件系统
func (h *UpgradedTaskDocumentHandler) saveDocumentToFile(c *gin.Context, taskID string) {
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

// ====================
// 管理功能
// ====================

// GetMigrationStatus 获取迁移状态 (新增API)
func (h *UpgradedTaskDocumentHandler) GetMigrationStatus(c *gin.Context) {
	// 统计文件系统文档数量
	fileCount := 0
	if h.docsBasePath != "" {
		if files, err := filepath.Glob(filepath.Join(h.docsBasePath, "*.md")); err == nil {
			fileCount = len(files)
		}
	}
	
	// 统计新系统文档数量
	unifiedCount := 0
	if h.taskDocService != nil {
		// 这里需要实现统计逻辑，暂时返回0
	}
	
	c.JSON(http.StatusOK, gin.H{
		"file_system_documents": fileCount,
		"unified_system_documents": unifiedCount,
		"migration_progress": float64(unifiedCount) / float64(fileCount+unifiedCount) * 100,
		"use_unified_system": h.useUnifiedSystem,
		"enable_auto_migration": h.enableAutoMigration,
	})
}

// SwitchToUnifiedSystem 切换到统一系统 (新增API)
func (h *UpgradedTaskDocumentHandler) SwitchToUnifiedSystem(c *gin.Context) {
	h.useUnifiedSystem = true
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "已切换到统一文档系统",
	})
}

// ====================
// 辅助方法
// ====================

// ensureDocsDir 确保文档目录存在
func (h *UpgradedTaskDocumentHandler) ensureDocsDir() error {
	return os.MkdirAll(h.docsBasePath, 0755)
}

// getDocumentPath 获取文档文件路径
func (h *UpgradedTaskDocumentHandler) getDocumentPath(taskID string) string {
	return filepath.Join(h.docsBasePath, fmt.Sprintf("%s.md", taskID))
}

// generateDefaultTemplate 生成默认文档模板
func (h *UpgradedTaskDocumentHandler) generateDefaultTemplate(taskID string) string {
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

// stringPtr 返回字符串指针
// stringPtr 在 simple_document_folder_handler.go 中已定义
// func stringPtr(s string) *string {
//     return &s
// }

// 注意：DocumentRequest 和 DocumentResponse 在 task_document_handler.go 中已定义