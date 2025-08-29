package services

import (
	"context"
	"database/sql"

	"ai-project-backend/database"
	"ai-project-backend/models"
)

// WorkNoteServiceAdapter 适配器，将完整的WorkNoteService适配到database.DB接口
type WorkNoteServiceAdapter struct {
	*WorkNoteService
	db database.DB
}

// NewWorkNoteServiceAdapter 创建适配器实例
func NewWorkNoteServiceAdapter(db database.DB) *WorkNoteServiceAdapter {
	// 获取底层的 *sql.DB 实例
	sqlDB := db.GetDB().(*sql.DB)
	
	// 直接创建完整的工作笔记服务（DocumentService参数为nil，根据注释不使用）
	workNoteService := NewWorkNoteService(sqlDB, nil)
	
	return &WorkNoteServiceAdapter{
		WorkNoteService: workNoteService,
		db:             db,
	}
}

// 确保适配器实现了工作笔记服务接口
var _ WorkNoteServiceInterface = (*WorkNoteServiceAdapter)(nil)

// 以下方法直接委托给内部的WorkNoteService，确保接口兼容性

func (a *WorkNoteServiceAdapter) CreateWorkNote(ctx context.Context, req models.CreateWorkNoteRequest, userID int) (*models.WorkNote, error) {
	return a.WorkNoteService.CreateWorkNote(ctx, req, userID)
}

func (a *WorkNoteServiceAdapter) GetWorkNote(ctx context.Context, noteID, userID int) (*models.WorkNote, error) {
	return a.WorkNoteService.GetWorkNote(ctx, noteID, userID)
}

func (a *WorkNoteServiceAdapter) UpdateWorkNote(ctx context.Context, noteID int, req models.UpdateWorkNoteRequest, userID int) (*models.WorkNote, error) {
	return a.WorkNoteService.UpdateWorkNote(ctx, noteID, req, userID)
}

func (a *WorkNoteServiceAdapter) DeleteWorkNote(ctx context.Context, noteID, userID int) error {
	return a.WorkNoteService.DeleteWorkNote(ctx, noteID, userID)
}

func (a *WorkNoteServiceAdapter) ListWorkNotes(ctx context.Context, filter models.WorkNoteFilter, userID int) (*models.WorkNoteListResponse, error) {
	return a.WorkNoteService.ListWorkNotes(ctx, filter, userID)
}

func (a *WorkNoteServiceAdapter) SearchWorkNotes(ctx context.Context, query string, tags []string, userID int, limit int) ([]models.WorkNoteSearchResult, error) {
	return a.WorkNoteService.SearchWorkNotes(ctx, query, tags, userID, limit)
}

func (a *WorkNoteServiceAdapter) GetWorkNoteStats(ctx context.Context, userID int) (*models.WorkNoteStats, error) {
	return a.WorkNoteService.GetWorkNoteStats(ctx, userID)
}

func (a *WorkNoteServiceAdapter) GetRecentNotes(ctx context.Context, userID, limit int) ([]models.WorkNote, error) {
	return a.WorkNoteService.GetRecentNotes(ctx, userID, limit)
}

func (a *WorkNoteServiceAdapter) GetPinnedNotes(ctx context.Context, userID int) ([]models.WorkNote, error) {
	return a.WorkNoteService.GetPinnedNotes(ctx, userID)
}

func (a *WorkNoteServiceAdapter) GetBookmarkedNotes(ctx context.Context, userID int) ([]models.WorkNote, error) {
	return a.WorkNoteService.GetBookmarkedNotes(ctx, userID)
}

func (a *WorkNoteServiceAdapter) GetRelatedNotes(ctx context.Context, noteID, userID int) ([]models.WorkNote, error) {
	return a.WorkNoteService.GetRelatedNotes(ctx, noteID, userID)
}

func (a *WorkNoteServiceAdapter) BatchUpdateWorkNotes(ctx context.Context, operation models.BatchWorkNoteOperation, userID int) error {
	return a.WorkNoteService.BatchUpdateWorkNotes(ctx, operation, userID)
}
