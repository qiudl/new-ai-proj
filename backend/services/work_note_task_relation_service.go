package services

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// WorkNoteTaskRelation 工作笔记任务关联关系
type WorkNoteTaskRelation struct {
	ID           int       `json:"id"`
	WorkNoteID   int       `json:"work_note_id"`
	TaskID       int       `json:"task_id"`
	RelationType string    `json:"relation_type"`
	CreatedBy    int       `json:"created_by"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	DeletedAt    *time.Time `json:"deleted_at"`
}

// WorkNoteTaskRelationService 工作笔记任务关联服务
type WorkNoteTaskRelationService struct {
	db *sql.DB
}

// NewWorkNoteTaskRelationService 创建工作笔记任务关联服务
func NewWorkNoteTaskRelationService(db *sql.DB) *WorkNoteTaskRelationService {
	return &WorkNoteTaskRelationService{db: db}
}

// AttachWorkNoteToTask 将工作笔记关联到任务
func (s *WorkNoteTaskRelationService) AttachWorkNoteToTask(
	ctx context.Context, 
	workNoteID, taskID, createdBy int, 
	relationType string,
) (*WorkNoteTaskRelation, error) {
	if relationType == "" {
		relationType = "reference"
	}

	query := `
		INSERT INTO work_note_task_relations (work_note_id, task_id, relation_type, created_by)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (work_note_id, task_id, relation_type) 
		DO UPDATE SET updated_at = CURRENT_TIMESTAMP, deleted_at = NULL
		RETURNING id, work_note_id, task_id, relation_type, created_by, created_at, updated_at, deleted_at`

	var relation WorkNoteTaskRelation
	err := s.db.QueryRowContext(ctx, query, workNoteID, taskID, relationType, createdBy).Scan(
		&relation.ID,
		&relation.WorkNoteID,
		&relation.TaskID,
		&relation.RelationType,
		&relation.CreatedBy,
		&relation.CreatedAt,
		&relation.UpdatedAt,
		&relation.DeletedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("关联工作笔记到任务失败: %w", err)
	}

	return &relation, nil
}

// DetachWorkNoteFromTask 将工作笔记从任务中移除
func (s *WorkNoteTaskRelationService) DetachWorkNoteFromTask(
	ctx context.Context, 
	workNoteID, taskID int, 
	relationType string,
) error {
	if relationType == "" {
		relationType = "reference"
	}

	query := `
		UPDATE work_note_task_relations 
		SET deleted_at = CURRENT_TIMESTAMP
		WHERE work_note_id = $1 AND task_id = $2 AND relation_type = $3 AND deleted_at IS NULL`

	_, err := s.db.ExecContext(ctx, query, workNoteID, taskID, relationType)
	if err != nil {
		return fmt.Errorf("移除工作笔记任务关联失败: %w", err)
	}

	return nil
}

// GetWorkNotesByTask 获取任务关联的工作笔记
func (s *WorkNoteTaskRelationService) GetWorkNotesByTask(ctx context.Context, taskID int) ([]WorkNoteTaskRelation, error) {
	query := `
		SELECT r.id, r.work_note_id, r.task_id, r.relation_type, r.created_by, r.created_at, r.updated_at, r.deleted_at
		FROM work_note_task_relations r
		WHERE r.task_id = $1 AND r.deleted_at IS NULL
		ORDER BY r.created_at DESC`

	rows, err := s.db.QueryContext(ctx, query, taskID)
	if err != nil {
		return nil, fmt.Errorf("获取任务工作笔记失败: %w", err)
	}
	defer rows.Close()

	var relations []WorkNoteTaskRelation
	for rows.Next() {
		var relation WorkNoteTaskRelation
		err := rows.Scan(
			&relation.ID,
			&relation.WorkNoteID,
			&relation.TaskID,
			&relation.RelationType,
			&relation.CreatedBy,
			&relation.CreatedAt,
			&relation.UpdatedAt,
			&relation.DeletedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("扫描工作笔记关联记录失败: %w", err)
		}
		relations = append(relations, relation)
	}

	return relations, nil
}

// GetTasksByWorkNote 获取工作笔记关联的任务
func (s *WorkNoteTaskRelationService) GetTasksByWorkNote(ctx context.Context, workNoteID int) ([]WorkNoteTaskRelation, error) {
	query := `
		SELECT r.id, r.work_note_id, r.task_id, r.relation_type, r.created_by, r.created_at, r.updated_at, r.deleted_at
		FROM work_note_task_relations r
		WHERE r.work_note_id = $1 AND r.deleted_at IS NULL
		ORDER BY r.created_at DESC`

	rows, err := s.db.QueryContext(ctx, query, workNoteID)
	if err != nil {
		return nil, fmt.Errorf("获取工作笔记任务失败: %w", err)
	}
	defer rows.Close()

	var relations []WorkNoteTaskRelation
	for rows.Next() {
		var relation WorkNoteTaskRelation
		err := rows.Scan(
			&relation.ID,
			&relation.WorkNoteID,
			&relation.TaskID,
			&relation.RelationType,
			&relation.CreatedBy,
			&relation.CreatedAt,
			&relation.UpdatedAt,
			&relation.DeletedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("扫描任务关联记录失败: %w", err)
		}
		relations = append(relations, relation)
	}

	return relations, nil
}

// GetRelationStats 获取关联统计信息
func (s *WorkNoteTaskRelationService) GetRelationStats(ctx context.Context) (map[string]interface{}, error) {
	query := `
		SELECT 
			COUNT(*) as total_relations,
			COUNT(DISTINCT work_note_id) as unique_work_notes,
			COUNT(DISTINCT task_id) as unique_tasks,
			COUNT(CASE WHEN relation_type = 'reference' THEN 1 END) as reference_count,
			COUNT(CASE WHEN relation_type = 'attached' THEN 1 END) as attached_count,
			COUNT(CASE WHEN relation_type = 'mentioned' THEN 1 END) as mentioned_count,
			COUNT(CASE WHEN relation_type = 'related' THEN 1 END) as related_count
		FROM work_note_task_relations 
		WHERE deleted_at IS NULL`

	var stats struct {
		TotalRelations   int `json:"total_relations"`
		UniqueWorkNotes  int `json:"unique_work_notes"`
		UniqueTasks      int `json:"unique_tasks"`
		ReferenceCount   int `json:"reference_count"`
		AttachedCount    int `json:"attached_count"`
		MentionedCount   int `json:"mentioned_count"`
		RelatedCount     int `json:"related_count"`
	}

	err := s.db.QueryRowContext(ctx, query).Scan(
		&stats.TotalRelations,
		&stats.UniqueWorkNotes,
		&stats.UniqueTasks,
		&stats.ReferenceCount,
		&stats.AttachedCount,
		&stats.MentionedCount,
		&stats.RelatedCount,
	)

	if err != nil {
		return nil, fmt.Errorf("获取关联统计失败: %w", err)
	}

	return map[string]interface{}{
		"total_relations":   stats.TotalRelations,
		"unique_work_notes": stats.UniqueWorkNotes,
		"unique_tasks":      stats.UniqueTasks,
		"relation_types": map[string]int{
			"reference": stats.ReferenceCount,
			"attached":  stats.AttachedCount,
			"mentioned": stats.MentionedCount,
			"related":   stats.RelatedCount,
		},
	}, nil
}
