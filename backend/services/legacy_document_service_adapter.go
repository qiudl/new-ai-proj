package services

import (
	"ai-project-backend/interfaces"
	"context"
	"fmt"
	"gorm.io/gorm"
)

// LegacyDocumentServiceAdapter 传统文档服务适配器
// 将现有的DocumentService包装成DocumentServiceInterface
type LegacyDocumentServiceAdapter struct {
	legacyService *DocumentService
	db            *gorm.DB
}

// NewLegacyDocumentServiceAdapter 创建传统文档服务适配器
func NewLegacyDocumentServiceAdapter(db *gorm.DB, storagePath string) *LegacyDocumentServiceAdapter {
	return &LegacyDocumentServiceAdapter{
		legacyService: NewDocumentService(db, storagePath),
		db:            db,
	}
}

// CreateDocument 创建文档（适配器实现）
func (a *LegacyDocumentServiceAdapter) CreateDocument(ctx context.Context, req *interfaces.CreateDocumentRequest) error {
	// 传统服务主要用于文件上传，这里我们简化实现
	// 实际项目中可能需要更复杂的适配逻辑
	return fmt.Errorf("legacy service does not support direct document creation, use file upload instead")
}

// ReadDocument 读取文档（适配器实现）
func (a *LegacyDocumentServiceAdapter) ReadDocument(ctx context.Context, req *interfaces.ReadDocumentRequest) (*interfaces.DocumentResponse, error) {
	// 查询数据库中的文档记录
	documents, err := a.legacyService.GetTaskDocuments(uint(req.TaskID))
	if err != nil {
		return nil, fmt.Errorf("failed to get task documents: %w", err)
	}

	if len(documents) == 0 {
		return nil, fmt.Errorf("document not found")
	}

	// 取第一个文档
	doc := documents[0]

	// 读取文件内容
	content, err := a.legacyService.GetFileContent(doc.FilePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read file content: %w", err)
	}

	response := &interfaces.DocumentResponse{
		TaskID:      req.TaskID,
		ProjectID:   req.ProjectID,
		Content:     string(content),
		Format:      a.getMimeTypeFormat(doc.MimeType),
		Size:        doc.FileSize,
		LastUpdated: doc.UpdatedAt,
		CreatedAt:   doc.UploadedAt,
		Path:        doc.FilePath,
	}

	return response, nil
}

// UpdateDocument 更新文档（适配器实现）
func (a *LegacyDocumentServiceAdapter) UpdateDocument(ctx context.Context, req *interfaces.UpdateDocumentRequest) error {
	// 传统服务不支持直接更新内容
	return fmt.Errorf("legacy service does not support direct document update")
}

// DeleteDocument 删除文档（适配器实现）
func (a *LegacyDocumentServiceAdapter) DeleteDocument(ctx context.Context, req *interfaces.DeleteDocumentRequest) error {
	// 查询文档
	documents, err := a.legacyService.GetTaskDocuments(uint(req.TaskID))
	if err != nil {
		return fmt.Errorf("failed to get task documents: %w", err)
	}

	if len(documents) == 0 {
		return fmt.Errorf("document not found")
	}

	// 删除第一个文档
	return a.legacyService.DeleteDocument(documents[0].ID, uint(req.UserID))
}

// GetDocumentHistory 获取文档历史（适配器实现）
func (a *LegacyDocumentServiceAdapter) GetDocumentHistory(ctx context.Context, req *interfaces.HistoryRequest) ([]interfaces.GitCommit, error) {
	// 传统服务不支持Git历史
	return []interfaces.GitCommit{}, nil
}

// ArchiveDocument 归档文档（适配器实现）
func (a *LegacyDocumentServiceAdapter) ArchiveDocument(ctx context.Context, req *interfaces.ArchiveRequest) error {
	// 传统服务不支持归档
	return fmt.Errorf("legacy service does not support archiving")
}

// MigrateDocument 迁移文档（适配器实现）
func (a *LegacyDocumentServiceAdapter) MigrateDocument(ctx context.Context, req *interfaces.MigrateRequest) error {
	// 传统服务不支持迁移
	return fmt.Errorf("legacy service does not support migration")
}

// CompareVersions 比较版本（适配器实现）
func (a *LegacyDocumentServiceAdapter) CompareVersions(ctx context.Context, req *interfaces.CompareVersionsRequest) (*interfaces.VersionComparisonResponse, error) {
	// 传统服务不支持版本比较
	return nil, fmt.Errorf("legacy service does not support version comparison")
}

// GetDocumentAtVersion 获取特定版本文档（适配器实现）
func (a *LegacyDocumentServiceAdapter) GetDocumentAtVersion(ctx context.Context, req *interfaces.VersionRequest) (*interfaces.DocumentResponse, error) {
	// 传统服务不支持版本控制
	return nil, fmt.Errorf("legacy service does not support version control")
}

// ResolveConflict 解决冲突（适配器实现）
func (a *LegacyDocumentServiceAdapter) ResolveConflict(ctx context.Context, req *interfaces.ConflictResolutionRequest) error {
	// 传统服务不支持冲突解决
	return fmt.Errorf("legacy service does not support conflict resolution")
}

// SearchDocuments 搜索文档（适配器实现）
func (a *LegacyDocumentServiceAdapter) SearchDocuments(ctx context.Context, req *interfaces.SearchRequest) (*interfaces.SearchResponse, error) {
	// 简化的搜索实现
	response := &interfaces.SearchResponse{
		Results:   []interfaces.SearchResult{},
		Total:     0,
		Page:      1,
		PageSize:  req.Limit,
		QueryTime: 0.0,
	}

	return response, nil
}

// IndexDocument 索引文档（适配器实现）
func (a *LegacyDocumentServiceAdapter) IndexDocument(ctx context.Context, req *interfaces.IndexRequest) error {
	// 传统服务不支持索引
	return nil
}

// BatchCreateDocuments 批量创建文档（适配器实现）
func (a *LegacyDocumentServiceAdapter) BatchCreateDocuments(ctx context.Context, req *interfaces.BatchCreateRequest) (*interfaces.BatchOperationResponse, error) {
	// 传统服务不支持批量操作
	response := &interfaces.BatchOperationResponse{
		Total:   len(req.Documents),
		Success: 0,
		Failed:  len(req.Documents),
		Results: make([]interfaces.BatchOperationResult, len(req.Documents)),
	}

	for i, doc := range req.Documents {
		response.Results[i] = interfaces.BatchOperationResult{
			ProjectID: doc.ProjectID,
			TaskID:    doc.TaskID,
			Success:   false,
			Error:     "Legacy service does not support batch create",
		}
	}

	return response, nil
}

// BatchUpdateDocuments 批量更新文档（适配器实现）
func (a *LegacyDocumentServiceAdapter) BatchUpdateDocuments(ctx context.Context, req *interfaces.BatchUpdateRequest) (*interfaces.BatchOperationResponse, error) {
	// 传统服务不支持批量操作
	response := &interfaces.BatchOperationResponse{
		Total:   len(req.Documents),
		Success: 0,
		Failed:  len(req.Documents),
		Results: make([]interfaces.BatchOperationResult, len(req.Documents)),
	}

	for i, doc := range req.Documents {
		response.Results[i] = interfaces.BatchOperationResult{
			ProjectID: doc.ProjectID,
			TaskID:    doc.TaskID,
			Success:   false,
			Error:     "Legacy service does not support batch update",
		}
	}

	return response, nil
}

// BatchDeleteDocuments 批量删除文档（适配器实现）
func (a *LegacyDocumentServiceAdapter) BatchDeleteDocuments(ctx context.Context, req *interfaces.BatchDeleteRequest) (*interfaces.BatchOperationResponse, error) {
	// 传统服务不支持批量操作
	response := &interfaces.BatchOperationResponse{
		Total:   len(req.Documents),
		Success: 0,
		Failed:  len(req.Documents),
		Results: make([]interfaces.BatchOperationResult, len(req.Documents)),
	}

	for i, doc := range req.Documents {
		response.Results[i] = interfaces.BatchOperationResult{
			ProjectID: doc.ProjectID,
			TaskID:    doc.TaskID,
			Success:   false,
			Error:     "Legacy service does not support batch delete",
		}
	}

	return response, nil
}

// ExportDocuments 导出文档（适配器实现）
func (a *LegacyDocumentServiceAdapter) ExportDocuments(ctx context.Context, req *interfaces.ExportRequest) (*interfaces.ExportResponse, error) {
	// 传统服务不支持导出
	return nil, fmt.Errorf("legacy service does not support export")
}

// ImportDocuments 导入文档（适配器实现）
func (a *LegacyDocumentServiceAdapter) ImportDocuments(ctx context.Context, req *interfaces.ImportRequest) (*interfaces.ImportResponse, error) {
	// 传统服务不支持导入
	return nil, fmt.Errorf("legacy service does not support import")
}

// LockDocument 锁定文档（适配器实现）
func (a *LegacyDocumentServiceAdapter) LockDocument(ctx context.Context, req *interfaces.DocumentLockRequest) error {
	// 传统服务不支持文档锁定
	return fmt.Errorf("legacy service does not support document locking")
}

// UnlockDocument 解锁文档（适配器实现）
func (a *LegacyDocumentServiceAdapter) UnlockDocument(ctx context.Context, req *interfaces.DocumentLockRequest) error {
	// 传统服务不支持文档锁定
	return fmt.Errorf("legacy service does not support document unlocking")
}

// GetDocumentLockStatus 获取文档锁定状态（适配器实现）
func (a *LegacyDocumentServiceAdapter) GetDocumentLockStatus(ctx context.Context, req *interfaces.LockStatusRequest) (*interfaces.LockStatusResponse, error) {
	// 传统服务不支持文档锁定，总是返回未锁定
	response := &interfaces.LockStatusResponse{
		IsLocked: false,
		CanEdit:  true,
	}

	return response, nil
}

// HealthCheck 健康检查（适配器实现）
func (a *LegacyDocumentServiceAdapter) HealthCheck(ctx context.Context) error {
	// 检查数据库连接
	if a.db != nil {
		if sqlDB, err := a.db.DB(); err == nil {
			return sqlDB.Ping()
		}
	}

	return fmt.Errorf("database connection not available")
}

// 辅助方法

// getMimeTypeFormat 根据MIME类型获取格式
func (a *LegacyDocumentServiceAdapter) getMimeTypeFormat(mimeType string) string {
	switch mimeType {
	case "text/markdown":
		return "markdown"
	case "text/plain":
		return "text"
	default:
		return "text"
	}
}
