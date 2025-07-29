package services

import (
	"context"
	"database/sql"
	"fmt"
	// "time"

	"ai-project-backend/models" // 替换为实际项目路径
)

// TaskDocumentService 任务文档服务
type TaskDocumentService struct {
	db              *sql.DB
	documentService *DocumentService
}

// NewTaskDocumentService 创建任务文档服务实例
func NewTaskDocumentService(db *sql.DB, documentService *DocumentService) *TaskDocumentService {
	return &TaskDocumentService{
		db:              db,
		documentService: documentService,
	}
}

// ====================
// 任务文档管理
// ====================

// GetTaskDocument 获取任务文档
func (s *TaskDocumentService) GetTaskDocument(ctx context.Context, projectID, taskID int, userID int) (*models.TaskDocumentResponse, error) {
	// 1. 检查任务是否存在及权限
	var task models.Task
	err := s.db.QueryRowContext(ctx, `
		SELECT t.id, t.title, t.status, t.project_id, t.assignee_id
		FROM tasks t
		WHERE t.id = $1 AND t.project_id = $2 AND t.deleted_at IS NULL
	`, taskID, projectID).Scan(
		&task.ID, &task.Title, &task.Status, &task.ProjectID, 
		&task.AssigneeID,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("task not found")
		}
		return nil, err
	}

	// 2. 查找关联的文档
	var taskDoc models.TaskDocument
	var documentExists bool
	
	err = s.db.QueryRowContext(ctx, `
		SELECT 
			d.id, d.title, d.content, d.type, d.status, d.version, d.metadata,
			d.owner_id, d.created_by, d.created_at, d.updated_at,
			t.title as task_title, p.name as project_name,
			u1.username as owner_name, u2.username as creator_name,
			true as document_exists
		FROM documents d
		JOIN document_task_relations dtr ON d.id = dtr.document_id
		JOIN tasks t ON dtr.task_id = t.id
		JOIN projects p ON t.project_id = p.id
		LEFT JOIN users u1 ON d.owner_id = u1.id
		LEFT JOIN users u2 ON d.created_by = u2.id
		WHERE dtr.task_id = $1 AND dtr.relation_type = 'specification'
		  AND d.deleted_at IS NULL
		ORDER BY d.updated_at DESC
		LIMIT 1
	`, taskID).Scan(
		&taskDoc.DocumentID, &taskDoc.Title, &taskDoc.Content, &taskDoc.Type,
		&taskDoc.Status, &taskDoc.Version, &taskDoc.Metadata,
		&taskDoc.OwnerID, &taskDoc.CreatedBy, &taskDoc.CreatedAt, &taskDoc.UpdatedAt,
		&taskDoc.TaskTitle, &taskDoc.ProjectName,
		&taskDoc.OwnerName, &taskDoc.CreatorName, &documentExists,
	)

	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	// 3. 如果没有文档，返回默认模板
	if err == sql.ErrNoRows {
		defaultContent := models.GetTaskDocumentDefaultTemplate(task.Title, task.Status)
		taskDoc = models.TaskDocument{
			TaskID:         taskID,
			ProjectID:      projectID,
			Title:          task.Title + " - 文档",
			Content:        &defaultContent,
			Type:           "markdown",
			Status:         "draft",
			Version:        0,
			TaskTitle:      task.Title,
			DocumentExists: false,
		}
	} else {
		taskDoc.TaskID = taskID
		taskDoc.ProjectID = projectID
		taskDoc.DocumentExists = true
	}

	// 4. 检查权限
	canEdit := s.canEditTaskDocument(&task, userID)
	canDelete := s.canDeleteTaskDocument(&task, userID)

	// 5. 获取关联关系（如果文档存在）
	var relations []models.DocumentRelation
	if documentExists {
		// relations, _ = s.documentService.GetDocumentRelations(ctx, taskDoc.DocumentID) // 暂时注释
	}

	response := &models.TaskDocumentResponse{
		TaskDocument: taskDoc,
		CanEdit:      canEdit,
		CanDelete:    canDelete,
		Relations:    relations,
	}

	if documentExists {
		response.LastModified = &taskDoc.UpdatedAt
	}

	return response, nil
}

// CreateOrUpdateTaskDocument 创建或更新任务文档
func (s *TaskDocumentService) CreateOrUpdateTaskDocument(ctx context.Context, projectID, taskID int, req models.UpdateTaskDocumentRequest, userID int) (*models.TaskDocumentResponse, error) {
	// 1. 检查任务权限
	var task models.Task
	err := s.db.QueryRowContext(ctx, `
		SELECT t.id, t.title, t.status, t.project_id, t.assignee_id
		FROM tasks t
		WHERE t.id = $1 AND t.project_id = $2 AND t.deleted_at IS NULL
	`, taskID, projectID).Scan(
		&task.ID, &task.Title, &task.Status, &task.ProjectID,
		&task.AssigneeID,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("task not found")
		}
		return nil, err
	}

	// 2. 检查编辑权限
	if !s.canEditTaskDocument(&task, userID) {
		return nil, fmt.Errorf("permission denied")
	}

	// 3. 查找现有文档
	var existingDocID *int
	err = s.db.QueryRowContext(ctx, `
		SELECT d.id
		FROM documents d
		JOIN document_task_relations dtr ON d.id = dtr.document_id
		WHERE dtr.task_id = $1 AND dtr.relation_type = 'specification'
		  AND d.deleted_at IS NULL
		ORDER BY d.updated_at DESC
		LIMIT 1
	`, taskID).Scan(&existingDocID)

	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	var documentID int
	
	// 4. 更新或创建文档
	if existingDocID != nil {
		// 更新现有文档
		documentID = *existingDocID
		
		updateQuery := `UPDATE documents SET updated_at = CURRENT_TIMESTAMP`
		args := []interface{}{documentID}
		argCount := 1
		
		if req.Content != nil {
			argCount++
			updateQuery += fmt.Sprintf(`, content = $%d`, argCount)
			args = append(args, *req.Content)
		}
		
		if req.Title != nil {
			argCount++
			updateQuery += fmt.Sprintf(`, title = $%d`, argCount)
			args = append(args, *req.Title)
		}
		
		if req.Status != nil {
			argCount++
			updateQuery += fmt.Sprintf(`, status = $%d`, argCount)
			args = append(args, *req.Status)
		}
		
		if req.Metadata != nil {
			argCount++
			updateQuery += fmt.Sprintf(`, metadata = $%d`, argCount)
			args = append(args, *req.Metadata)
		}
		
		updateQuery += ` WHERE id = $1`
		
		_, err = s.db.ExecContext(ctx, updateQuery, args...)
		if err != nil {
			return nil, err
		}
	} else {
		// 创建新文档
		title := task.Title + " - 文档"
		if req.Title != nil {
			title = *req.Title
		}
		
		content := models.GetTaskDocumentDefaultTemplate(task.Title, task.Status)
		if req.Content != nil {
			content = *req.Content
		}
		
		status := "draft"
		if req.Status != nil {
			status = *req.Status
		}
		
		metadata := models.DocumentMetadata{}
		if req.Metadata != nil {
			metadata = models.DocumentMetadata(*req.Metadata)
		}
		
		// 创建文档
		err = s.db.QueryRowContext(ctx, `
			INSERT INTO documents (title, content, type, status, metadata, owner_id, created_by)
			VALUES ($1, $2, 'markdown', $3, $4, $5, $6)
			RETURNING id
		`, title, content, status, metadata, userID, userID).Scan(&documentID)
		
		if err != nil {
			return nil, err
		}
		
		// 创建任务关联关系
		_, err = s.db.ExecContext(ctx, `
			INSERT INTO document_task_relations (document_id, task_id, relation_type, created_by)
			VALUES ($1, $2, 'specification', $3)
		`, documentID, taskID, userID)
		
		if err != nil {
			return nil, err
		}
	}

	// 5. 返回更新后的文档
	return s.GetTaskDocument(ctx, projectID, taskID, userID)
}

// GetTaskDocumentList 获取任务文档列表
func (s *TaskDocumentService) GetTaskDocumentList(ctx context.Context, userID int, projectID *int) ([]models.TaskDocumentListItem, error) {
	query := `
		SELECT 
			t.id as task_id, t.project_id, t.title as task_title, t.status as task_status, t.created_at,
			p.name as project_name,
			d.id as document_id, d.updated_at as last_modified,
			LENGTH(d.content) as content_size,
			CASE WHEN d.id IS NOT NULL THEN true ELSE false END as document_exists
		FROM tasks t
		JOIN projects p ON t.project_id = p.id
		LEFT JOIN document_task_relations dtr ON t.id = dtr.task_id AND dtr.relation_type = 'specification'
		LEFT JOIN documents d ON dtr.document_id = d.id AND d.deleted_at IS NULL
		WHERE t.deleted_at IS NULL
	`
	
	args := []interface{}{}
	argCount := 0
	
	if projectID != nil {
		argCount++
		query += fmt.Sprintf(` AND t.project_id = $%d`, argCount)
		args = append(args, *projectID)
	}
	
	// 添加权限检查 - 用户只能看到自己相关的任务
	argCount++
	query += fmt.Sprintf(` AND (t.assignee_id = $%d OR t.created_by = $%d OR p.owner_id = $%d)`, argCount, argCount, argCount)
	args = append(args, userID)
	
	query += ` ORDER BY t.updated_at DESC`
	
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var items []models.TaskDocumentListItem
	for rows.Next() {
		var item models.TaskDocumentListItem
		var lastModified sql.NullTime
		var contentSize sql.NullInt64
		var documentID sql.NullInt32
		
		err := rows.Scan(
			&item.TaskID, &item.ProjectID, &item.TaskTitle, &item.TaskStatus, &item.CreatedAt,
			&item.ProjectName, &documentID, &lastModified, &contentSize, &item.DocumentExists,
		)
		if err != nil {
			return nil, err
		}
		
		if documentID.Valid {
			docID := int(documentID.Int32)
			item.DocumentID = &docID
		}
		
		if lastModified.Valid {
			item.LastModified = &lastModified.Time
		}
		
		if contentSize.Valid {
			item.ContentSize = &contentSize.Int64
		}
		
		items = append(items, item)
	}
	
	return items, nil
}

// GetTaskDocumentStats 获取任务文档统计
func (s *TaskDocumentService) GetTaskDocumentStats(ctx context.Context, userID int, projectID *int) (*models.TaskDocumentStats, error) {
	query := `
		SELECT 
			COUNT(t.id) as total_tasks,
			COUNT(d.id) as with_document,
			COUNT(t.id) - COUNT(d.id) as without_document,
			COUNT(CASE WHEN d.updated_at > CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 1 END) as recently_updated
		FROM tasks t
		JOIN projects p ON t.project_id = p.id
		LEFT JOIN document_task_relations dtr ON t.id = dtr.task_id AND dtr.relation_type = 'specification'
		LEFT JOIN documents d ON dtr.document_id = d.id AND d.deleted_at IS NULL
		WHERE t.deleted_at IS NULL
	`
	
	args := []interface{}{}
	argCount := 0
	
	if projectID != nil {
		argCount++
		query += fmt.Sprintf(` AND t.project_id = $%d`, argCount)
		args = append(args, *projectID)
	}
	
	// 添加权限检查
	argCount++
	query += fmt.Sprintf(` AND (t.assignee_id = $%d OR t.created_by = $%d OR p.owner_id = $%d)`, argCount, argCount, argCount)
	args = append(args, userID)
	
	var stats models.TaskDocumentStats
	err := s.db.QueryRowContext(ctx, query, args...).Scan(
		&stats.TotalTasks, &stats.WithDocument, &stats.WithoutDocument, &stats.RecentlyUpdated,
	)
	if err != nil {
		return nil, err
	}
	
	return &stats, nil
}

// DeleteTaskDocument 删除任务文档
func (s *TaskDocumentService) DeleteTaskDocument(ctx context.Context, projectID, taskID int, userID int) error {
	// 1. 检查任务权限
	var task models.Task
	err := s.db.QueryRowContext(ctx, `
		SELECT t.id, t.title, t.project_id, t.assignee_id
		FROM tasks t
		WHERE t.id = $1 AND t.project_id = $2 AND t.deleted_at IS NULL
	`, taskID, projectID).Scan(
		&task.ID, &task.Title, &task.ProjectID, &task.AssigneeID,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("task not found")
		}
		return err
	}

	// 2. 检查删除权限
	if !s.canDeleteTaskDocument(&task, userID) {
		return fmt.Errorf("permission denied")
	}

	// 3. 软删除文档
	_, err = s.db.ExecContext(ctx, `
		UPDATE documents 
		SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		WHERE id IN (
			SELECT d.id FROM documents d
			JOIN document_task_relations dtr ON d.id = dtr.document_id
			WHERE dtr.task_id = $1 AND dtr.relation_type = 'specification'
		)
	`, taskID)
	
	return err
}

// ====================
// 权限检查
// ====================

// canEditTaskDocument 检查是否可以编辑任务文档
func (s *TaskDocumentService) canEditTaskDocument(task *models.Task, userID int) bool {
	// 任务分配者或项目所有者可以编辑（简化版本）
	return (task.AssigneeID != nil && *task.AssigneeID == userID) || true // 简化权限检查
}

// canDeleteTaskDocument 检查是否可以删除任务文档
func (s *TaskDocumentService) canDeleteTaskDocument(task *models.Task, userID int) bool {
	// 简化权限检查
	return true
}

// ====================
// 辅助方法
// ====================

// CheckTaskDocumentExists 检查任务文档是否存在
func (s *TaskDocumentService) CheckTaskDocumentExists(ctx context.Context, projectID, taskID int) (bool, error) {
	var exists bool
	err := s.db.QueryRowContext(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM documents d
			JOIN document_task_relations dtr ON d.id = dtr.document_id
			JOIN tasks t ON dtr.task_id = t.id
			WHERE t.id = $1 AND t.project_id = $2 
			  AND dtr.relation_type = 'specification'
			  AND d.deleted_at IS NULL AND t.deleted_at IS NULL
		)
	`, taskID, projectID).Scan(&exists)
	
	return exists, err
}