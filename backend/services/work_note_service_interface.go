package services

import (
	"ai-project-backend/models"
	"context"
)

// WorkNoteServiceInterface 工作笔记服务接口
type WorkNoteServiceInterface interface {
	CreateWorkNote(ctx context.Context, req models.CreateWorkNoteRequest, userID int) (*models.WorkNote, error)
	ListWorkNotes(ctx context.Context, filter models.WorkNoteFilter, userID int) (*models.WorkNoteListResponse, error)
	SearchWorkNotes(ctx context.Context, query string, tags []string, userID int, limit int) ([]models.WorkNoteSearchResult, error)
	GetWorkNote(ctx context.Context, noteID, userID int) (*models.WorkNote, error)
	UpdateWorkNote(ctx context.Context, noteID int, req models.UpdateWorkNoteRequest, userID int) (*models.WorkNote, error)
	DeleteWorkNote(ctx context.Context, noteID, userID int) error
	BatchUpdateWorkNotes(ctx context.Context, op models.BatchWorkNoteOperation, userID int) error
	GetWorkNoteStats(ctx context.Context, userID int) (*models.WorkNoteStats, error)
	GetRecentNotes(ctx context.Context, userID, limit int) ([]models.WorkNote, error)
	GetPinnedNotes(ctx context.Context, userID int) ([]models.WorkNote, error)
	GetBookmarkedNotes(ctx context.Context, userID int) ([]models.WorkNote, error)
	GetRelatedNotes(ctx context.Context, noteID, userID int) ([]models.WorkNote, error)
	
	// 任务关联功能
	CreateAndAttachToTask(ctx context.Context, req models.CreateWorkNoteRequest, taskID int, userID int) (*models.WorkNote, error)
	GetWorkNotesByTask(ctx context.Context, taskID int, userID int) ([]models.WorkNote, error)
}
