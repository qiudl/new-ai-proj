package database

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"ai-project-backend/models"
	"github.com/lib/pq"
)

// DocumentRepositoryNew 新的文档仓库接口
type DocumentRepositoryNew interface {
	Create(ctx context.Context, doc *models.Document) (*models.Document, error)
	GetByID(ctx context.Context, id int) (*models.Document, error)
	Update(ctx context.Context, id int, updates *models.UpdateDocumentRequest) (*models.Document, error)
	Delete(ctx context.Context, id int) error
	List(ctx context.Context, filter *models.DocumentFilter) ([]*models.Document, int, error)
	Search(ctx context.Context, req *models.DocumentSearchRequest) ([]*models.Document, int, error)

	// 任务文档关联方法
	AttachToTask(ctx context.Context, taskID, documentID int, relationshipType string, createdBy int) error
	DetachFromTask(ctx context.Context, taskID, documentID int) error
	GetTaskDocuments(ctx context.Context, taskID int) ([]*models.Document, error)

	// 版本控制方法
	GetVersions(ctx context.Context, documentID int) ([]*models.DocumentVersion, error)
	CreateVersion(ctx context.Context, documentID int, createdBy int) (*models.DocumentVersion, error)
}

// documentRepository 文档仓库实现
type documentRepository struct {
	db interface {
		QueryRowContext(ctx context.Context, query string, args ...interface{}) *sql.Row
		QueryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error)
		ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error)
	}
}

// NewDocumentRepository 创建新的文档仓库
func NewDocumentRepository(db *sql.DB) DocumentRepositoryNew {
	return &documentRepository{db: db}
}

// NewDocumentRepositoryWithTx 使用事务创建文档仓库
func NewDocumentRepositoryWithTx(tx *sql.Tx) DocumentRepositoryNew {
	return &documentRepository{db: tx}
}

// Create 创建文档
func (r *documentRepository) Create(ctx context.Context, doc *models.Document) (*models.Document, error) {
	query := `
		INSERT INTO documents (
			project_id, title, content, type, status, file_url, file_size, 
			mime_type, description, tags, metadata, owner_id, visibility, 
			version, is_template, created_by
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
		) RETURNING id, created_at, updated_at`

	var id int
	var createdAt, updatedAt time.Time

	err := r.db.QueryRowContext(ctx, query,
		doc.ProjectID, doc.Title, doc.Content, doc.Type, doc.Status,
		doc.FileURL, doc.FileSize, doc.MimeType, doc.Description,
		pq.Array(doc.Tags), doc.Metadata, doc.OwnerID, doc.Visibility,
		doc.Version, doc.IsTemplate, doc.CreatedBy,
	).Scan(&id, &createdAt, &updatedAt)

	if err != nil {
		return nil, fmt.Errorf("创建文档失败: %w", err)
	}

	doc.ID = id
	doc.CreatedAt = createdAt
	doc.UpdatedAt = updatedAt

	return doc, nil
}

// GetByID 根据ID获取文档
func (r *documentRepository) GetByID(ctx context.Context, id int) (*models.Document, error) {
	query := `
		SELECT d.id, d.project_id, d.title, d.content, d.type, d.status,
		       d.file_url, d.file_size, d.mime_type, d.description, d.tags,
		       d.metadata, d.owner_id, d.visibility, d.version, d.is_template,
		       d.created_by, d.created_at, d.updated_at, d.deleted_at,
		       d.archived, d.archived_at, d.archived_by, d.unarchived_at, d.unarchived_by,
		       u.username as owner_name
		FROM documents d
		LEFT JOIN users u ON d.owner_id = u.id
		WHERE d.id = $1 AND d.deleted_at IS NULL`

	doc := &models.Document{}
	var tags pq.StringArray
	var ownerName sql.NullString

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&doc.ID, &doc.ProjectID, &doc.Title, &doc.Content, &doc.Type, &doc.Status,
		&doc.FileURL, &doc.FileSize, &doc.MimeType, &doc.Description, &tags,
		&doc.Metadata, &doc.OwnerID, &doc.Visibility, &doc.Version, &doc.IsTemplate,
		&doc.CreatedBy, &doc.CreatedAt, &doc.UpdatedAt, &doc.DeletedAt,
		&doc.Archived, &doc.ArchivedAt, &doc.ArchivedBy, &doc.UnarchivedAt, &doc.UnarchivedBy,
		&ownerName,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("文档不存在")
		}
		return nil, fmt.Errorf("获取文档失败: %w", err)
	}

	doc.Tags = []string(tags)
	if ownerName.Valid {
		doc.OwnerName = &ownerName.String
	}

	return doc, nil
}

// Update 更新文档
func (r *documentRepository) Update(ctx context.Context, id int, updates *models.UpdateDocumentRequest) (*models.Document, error) {
	// 构建动态更新查询
	setParts := []string{}
	args := []interface{}{}
	argIndex := 1

	if updates.Title != nil {
		setParts = append(setParts, fmt.Sprintf("title = $%d", argIndex))
		args = append(args, *updates.Title)
		argIndex++
	}
	if updates.Content != nil {
		setParts = append(setParts, fmt.Sprintf("content = $%d", argIndex))
		args = append(args, *updates.Content)
		argIndex++
	}
	if updates.Status != nil {
		setParts = append(setParts, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, *updates.Status)
		argIndex++
	}
	if updates.Description != nil {
		setParts = append(setParts, fmt.Sprintf("description = $%d", argIndex))
		args = append(args, *updates.Description)
		argIndex++
	}
	if updates.Tags != nil {
		setParts = append(setParts, fmt.Sprintf("tags = $%d", argIndex))
		args = append(args, pq.Array(*updates.Tags))
		argIndex++
	}
	if updates.Visibility != nil {
		setParts = append(setParts, fmt.Sprintf("visibility = $%d", argIndex))
		args = append(args, *updates.Visibility)
		argIndex++
	}
	if updates.Metadata != nil {
		setParts = append(setParts, fmt.Sprintf("metadata = $%d", argIndex))
		args = append(args, *updates.Metadata)
		argIndex++
	}

	if len(setParts) == 0 {
		return r.GetByID(ctx, id) // 没有更新，直接返回原文档
	}

	// 自动更新版本号和时间
	setParts = append(setParts, fmt.Sprintf("version = version + 1, updated_at = CURRENT_TIMESTAMP"))

	query := fmt.Sprintf(`
		UPDATE documents 
		SET %s 
		WHERE id = $%d AND deleted_at IS NULL 
		RETURNING version, updated_at`,
		strings.Join(setParts, ", "), argIndex)

	args = append(args, id)

	var version int
	var updatedAt time.Time
	err := r.db.QueryRowContext(ctx, query, args...).Scan(&version, &updatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("文档不存在或已删除")
		}
		return nil, fmt.Errorf("更新文档失败: %w", err)
	}

	return r.GetByID(ctx, id)
}

// Delete 软删除文档
func (r *documentRepository) Delete(ctx context.Context, id int) error {
	query := `UPDATE documents SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("删除文档失败: %w", err)
	}

	affected, _ := result.RowsAffected()
	if affected == 0 {
		return fmt.Errorf("文档不存在或已删除")
	}

	return nil
}

// List 获取文档列表
func (r *documentRepository) List(ctx context.Context, filter *models.DocumentFilter) ([]*models.Document, int, error) {
	whereParts := []string{"d.deleted_at IS NULL"}
	if filter.Archived != nil {
		if *filter.Archived {
			whereParts = append(whereParts, "d.archived = TRUE")
		} else {
			whereParts = append(whereParts, "d.archived = FALSE")
		}
	}
	args := []interface{}{}
	argIndex := 1

	if filter.ProjectID != nil {
		whereParts = append(whereParts, fmt.Sprintf("d.project_id = $%d", argIndex))
		args = append(args, *filter.ProjectID)
		argIndex++
	}
	if filter.OwnerID != nil {
		whereParts = append(whereParts, fmt.Sprintf("d.owner_id = $%d", argIndex))
		args = append(args, *filter.OwnerID)
		argIndex++
	}
	if filter.Type != "" {
		whereParts = append(whereParts, fmt.Sprintf("d.type = $%d", argIndex))
		args = append(args, filter.Type)
		argIndex++
	}
	if filter.Status != "" {
		whereParts = append(whereParts, fmt.Sprintf("d.status = $%d", argIndex))
		args = append(args, filter.Status)
		argIndex++
	}
	if filter.Search != "" {
		whereParts = append(whereParts, fmt.Sprintf("(d.title ILIKE $%d OR d.description ILIKE $%d)", argIndex, argIndex))
		args = append(args, "%"+filter.Search+"%")
		argIndex++
	}

	whereClause := strings.Join(whereParts, " AND ")

	// 计算总数
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM documents d WHERE %s", whereClause)
	var total int
	err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("计算文档总数失败: %w", err)
	}

	// 构建排序和分页
	orderBy := "d.updated_at DESC"
	if filter.SortBy != "" {
		order := "ASC"
		if filter.Order == "desc" {
			order = "DESC"
		}
		orderBy = fmt.Sprintf("d.%s %s", filter.SortBy, order)
	}

	limit := 20
	if filter.Limit > 0 {
		limit = filter.Limit
	}
	offset := 0
	if filter.Page > 0 {
		offset = (filter.Page - 1) * limit
	}

	// 添加调试日志
	fmt.Printf("[DEBUG] document_repository.List: limit=%d, offset=%d, total=%d, whereClause=%s\n", limit, offset, total, whereClause)

	query := fmt.Sprintf(`
		SELECT d.id, d.project_id, d.title, d.content, d.type, d.status,
		       d.file_url, d.file_size, d.mime_type, d.description, d.tags,
		       d.metadata, d.owner_id, d.visibility, d.version, d.is_template,
		       d.created_by, d.created_at, d.updated_at, d.deleted_at,
		       d.archived, d.archived_at, d.archived_by, d.unarchived_at, d.unarchived_by,
		       u.username as owner_name
		FROM documents d
		LEFT JOIN users u ON d.owner_id = u.id
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d`,
		whereClause, orderBy, argIndex, argIndex+1)

	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("查询文档列表失败: %w", err)
	}
	defer rows.Close()

	documents := []*models.Document{}
	for rows.Next() {
		doc := &models.Document{}
		var tags pq.StringArray
		var ownerName sql.NullString

		err := rows.Scan(
			&doc.ID, &doc.ProjectID, &doc.Title, &doc.Content, &doc.Type, &doc.Status,
			&doc.FileURL, &doc.FileSize, &doc.MimeType, &doc.Description, &tags,
			&doc.Metadata, &doc.OwnerID, &doc.Visibility, &doc.Version, &doc.IsTemplate,
			&doc.CreatedBy, &doc.CreatedAt, &doc.UpdatedAt, &doc.DeletedAt,
			&doc.Archived, &doc.ArchivedAt, &doc.ArchivedBy, &doc.UnarchivedAt, &doc.UnarchivedBy,
			&ownerName,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("扫描文档数据失败: %w", err)
		}

		doc.Tags = []string(tags)
		if ownerName.Valid {
			doc.OwnerName = &ownerName.String
		}

		documents = append(documents, doc)
	}

	fmt.Printf("[DEBUG] document_repository.List: found %d documents\n", len(documents))

	return documents, total, nil
}

// Search 搜索文档
func (r *documentRepository) Search(ctx context.Context, req *models.DocumentSearchRequest) ([]*models.Document, int, error) {
	filter := &models.DocumentFilter{
		Search:  req.Query,
		OwnerID: req.OwnerID,
		SortBy:  req.SortBy,
		Order:   req.Order,
		Page:    req.Page,
		Limit:   req.Limit,
	}
	if req.Type != nil {
		filter.Type = string(*req.Type)
	}
	if req.Status != nil {
		filter.Status = string(*req.Status)
	}
	return r.List(ctx, filter)
}

// AttachToTask 将文档关联到任务
func (r *documentRepository) AttachToTask(ctx context.Context, taskID, documentID int, relationshipType string, createdBy int) error {
	query := `
		INSERT INTO task_documents (task_id, document_id, relationship_type, created_by)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (task_id, document_id) 
		DO UPDATE SET relationship_type = $3, updated_at = CURRENT_TIMESTAMP`

	_, err := r.db.ExecContext(ctx, query, taskID, documentID, relationshipType, createdBy)
	if err != nil {
		return fmt.Errorf("关联文档到任务失败: %w", err)
	}

	return nil
}

// DetachFromTask 将文档从任务中移除
func (r *documentRepository) DetachFromTask(ctx context.Context, taskID, documentID int) error {
	query := `DELETE FROM task_documents WHERE task_id = $1 AND document_id = $2`

	_, err := r.db.ExecContext(ctx, query, taskID, documentID)
	if err != nil {
		return fmt.Errorf("移除任务文档关联失败: %w", err)
	}

	return nil
}

// GetTaskDocuments 获取任务相关的文档
func (r *documentRepository) GetTaskDocuments(ctx context.Context, taskID int) ([]*models.Document, error) {
	query := `
		SELECT d.id, d.project_id, d.title, d.content, d.type, d.status,
		       d.file_url, d.file_size, d.mime_type, d.description, d.tags,
		       d.metadata, d.owner_id, d.visibility, d.version, d.is_template,
		       d.created_by, d.created_at, d.updated_at, d.deleted_at,
		       d.archived, d.archived_at, d.archived_by, d.unarchived_at, d.unarchived_by,
		       u.username as owner_name, td.relationship_type
		FROM documents d
		INNER JOIN task_documents td ON d.id = td.document_id
		LEFT JOIN users u ON d.owner_id = u.id
		WHERE td.task_id = $1 AND d.deleted_at IS NULL AND td.deleted_at IS NULL
		ORDER BY td.sort_order, td.created_at`

	rows, err := r.db.QueryContext(ctx, query, taskID)
	if err != nil {
		return nil, fmt.Errorf("获取任务文档失败: %w", err)
	}
	defer rows.Close()

	documents := []*models.Document{}
	for rows.Next() {
		doc := &models.Document{}
		var tags pq.StringArray
		var ownerName sql.NullString
		var relationshipType string

		err := rows.Scan(
			&doc.ID, &doc.ProjectID, &doc.Title, &doc.Content, &doc.Type, &doc.Status,
			&doc.FileURL, &doc.FileSize, &doc.MimeType, &doc.Description, &tags,
			&doc.Metadata, &doc.OwnerID, &doc.Visibility, &doc.Version, &doc.IsTemplate,
			&doc.CreatedBy, &doc.CreatedAt, &doc.UpdatedAt, &doc.DeletedAt,
			&doc.Archived, &doc.ArchivedAt, &doc.ArchivedBy, &doc.UnarchivedAt, &doc.UnarchivedBy,
			&ownerName, &relationshipType,
		)
		if err != nil {
			return nil, fmt.Errorf("扫描任务文档数据失败: %w", err)
		}

		doc.Tags = []string(tags)
		if ownerName.Valid {
			doc.OwnerName = &ownerName.String
		}

		// 可以将relationshipType存储在metadata中或单独处理
		if doc.Metadata == nil {
			doc.Metadata = make(models.DocumentMetadata)
		}
		doc.Metadata["relationship_type"] = relationshipType

		documents = append(documents, doc)
	}

	return documents, nil
}

// GetVersions 获取文档版本历史
func (r *documentRepository) GetVersions(ctx context.Context, documentID int) ([]*models.DocumentVersion, error) {
	query := `
		SELECT id, document_id, version_number, title, content, changes_summary,
		       metadata, created_by, created_at
		FROM document_versions 
		WHERE document_id = $1 
		ORDER BY version_number DESC`

	rows, err := r.db.QueryContext(ctx, query, documentID)
	if err != nil {
		return nil, fmt.Errorf("获取文档版本失败: %w", err)
	}
	defer rows.Close()

	versions := []*models.DocumentVersion{}
	for rows.Next() {
		version := &models.DocumentVersion{}
		err := rows.Scan(
			&version.ID, &version.DocumentID, &version.VersionNumber,
			&version.Title, &version.Content, &version.ChangeSummary,
			&version.Metadata, &version.CreatedBy, &version.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("扫描版本数据失败: %w", err)
		}

		versions = append(versions, version)
	}

	return versions, nil
}

// CreateVersion 手动创建文档版本
func (r *documentRepository) CreateVersion(ctx context.Context, documentID int, createdBy int) (*models.DocumentVersion, error) {
	// 获取当前文档信息
	doc, err := r.GetByID(ctx, documentID)
	if err != nil {
		return nil, err
	}

	query := `
		INSERT INTO document_versions (
			document_id, version_number, title, content, changes_summary, 
			metadata, created_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at`

	var id int
	var createdAt time.Time

	err = r.db.QueryRowContext(ctx, query,
		documentID, doc.Version, doc.Title, doc.Content,
		"手动创建版本", doc.Metadata, createdBy,
	).Scan(&id, &createdAt)

	if err != nil {
		return nil, fmt.Errorf("创建文档版本失败: %w", err)
	}

	return &models.DocumentVersion{
		ID:            id,
		DocumentID:    documentID,
		VersionNumber: doc.Version,
		Title:         doc.Title,
		Content:       doc.Content,
		ChangeSummary: stringPtr("手动创建版本"),
		CreatedBy:     createdBy,
		CreatedAt:     createdAt,
	}, nil
}

// 辅助函数
func stringPtr(s string) *string {
	return &s
}
