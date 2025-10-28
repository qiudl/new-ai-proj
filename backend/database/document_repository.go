package database

import (
	"context"
	"database/sql"
	"encoding/json"
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

	// 内容追加方法
	AppendContent(ctx context.Context, documentID int, appendContent string, userID int) (*models.Document, error)
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
// 自动在document_versions表中创建版本快照
func (r *documentRepository) Update(ctx context.Context, id int, updates *models.UpdateDocumentRequest) (*models.Document, error) {
	// Step 1: 获取更新前的文档状态（用于创建版本快照）
	oldDoc, err := r.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("获取文档失败: %w", err)
	}

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

	// Step 2: 在更新前创建版本快照（保存旧内容）
	// 使用documents.owner_id作为创建者（如果没有owner_id则使用0）
	createdBy := oldDoc.OwnerID
	if createdBy == 0 {
		createdBy = oldDoc.CreatedBy
	}

	// 准备新标题和新内容用于生成智能变更摘要
	newTitle := oldDoc.Title
	if updates.Title != nil {
		newTitle = *updates.Title
	}

	newContent := ""
	if oldDoc.Content != nil {
		newContent = *oldDoc.Content
	}
	if updates.Content != nil {
		newContent = *updates.Content
	}

	// 检查该版本快照是否已存在（避免重复创建）
	versionExists, _ := r.versionSnapshotExists(ctx, id, oldDoc.Version)
	if !versionExists {
		// 调用createVersionSnapshot保存当前版本到document_versions表，并传入新标题和新内容用于对比
		_, versionErr := r.createVersionSnapshot(ctx, id, oldDoc, createdBy, newTitle, newContent)
		if versionErr != nil {
			// 版本创建失败不阻止文档更新，只记录警告
			fmt.Printf("[WARNING] Failed to create version snapshot for document %d: %v\n", id, versionErr)
		} else {
			fmt.Printf("[INFO] Created version snapshot v%d for document %d\n", oldDoc.Version, id)
		}
	} else {
		fmt.Printf("[DEBUG] Version snapshot v%d for document %d already exists, skipping\n", oldDoc.Version, id)
	}

	// Step 3: 执行文档更新
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
	err = r.db.QueryRowContext(ctx, query, args...).Scan(&version, &updatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("文档不存在或已删除")
		}
		return nil, fmt.Errorf("更新文档失败: %w", err)
	}

	return r.GetByID(ctx, id)
}

// createVersionSnapshot 创建文档版本快照（内部方法）
// 在document_versions表中保存当前文档状态
// 注意：实际数据库表字段为 id, document_id, version_number, title, content,
//       changes_summary, metadata, created_by, created_at
// newTitle 和 newContent 用于对比生成智能变更摘要
func (r *documentRepository) createVersionSnapshot(ctx context.Context, documentID int, doc *models.Document, createdBy int, newTitle string, newContent string) (*models.DocumentVersion, error) {
	query := `
		INSERT INTO document_versions (
			document_id, version_number, title, content, changes_summary,
			metadata, created_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at`

	var id int
	var createdAt time.Time

	// 处理Content指针
	var content string
	if doc.Content != nil {
		content = *doc.Content
	} else {
		content = ""
	}

	// 生成智能变更摘要
	changeSummary := r.generateChangeSummary(doc.Title, newTitle, content, newContent)
	fmt.Printf("\n[DEBUG] ====== createVersionSnapshot ======\n")
	fmt.Printf("[DEBUG] documentID: %d\n", documentID)
	fmt.Printf("[DEBUG] version: %d\n", doc.Version)
	fmt.Printf("[DEBUG] Generated changeSummary: '%s'\n", changeSummary)
	fmt.Printf("[DEBUG] Will insert changeSummary into document_versions.changes_summary\n")
	fmt.Printf("[DEBUG] ===================================\n\n")

	// 转换metadata为JSON
	var metadataJSON []byte
	if doc.Metadata != nil {
		metadataJSON, _ = json.Marshal(doc.Metadata)
	} else {
		metadataJSON = []byte("{}")
	}

	err := r.db.QueryRowContext(ctx, query,
		documentID,
		doc.Version,
		doc.Title,
		content,
		changeSummary,
		metadataJSON,
		createdBy,
	).Scan(&id, &createdAt)

	if err != nil {
		return nil, fmt.Errorf("创建文档版本快照失败: %w", err)
	}

	return &models.DocumentVersion{
		ID:            id,
		DocumentID:    documentID,
		VersionNumber: doc.Version,
		Title:         doc.Title,
		Content:       &content,
		ChangeSummary: &changeSummary,
		FileSize:      0, // 表中没有此字段
		CreatedBy:     createdBy,
		CreatedAt:     createdAt,
	}, nil
}

// versionSnapshotExists 检查指定版本的快照是否已存在
func (r *documentRepository) versionSnapshotExists(ctx context.Context, documentID int, version int) (bool, error) {
	var count int
	query := `SELECT COUNT(*) FROM document_versions WHERE document_id = $1 AND version_number = $2`
	err := r.db.QueryRowContext(ctx, query, documentID, version).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
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

// generateChangeSummary 生成智能变更摘要
// 对比新旧标题和内容，生成详细的变更说明
func (r *documentRepository) generateChangeSummary(oldTitle, newTitle, oldContent, newContent string) string {
	// DEBUG: 记录输入参数
	fmt.Printf("\n[DEBUG] ====== generateChangeSummary called ======\n")
	fmt.Printf("[DEBUG] oldTitle: '%s'\n", oldTitle)
	fmt.Printf("[DEBUG] newTitle: '%s'\n", newTitle)
	fmt.Printf("[DEBUG] oldContent length: %d\n", len(oldContent))
	fmt.Printf("[DEBUG] newContent length: %d\n", len(newContent))

	changes := []string{}

	// 1. 检测标题变更
	if oldTitle != newTitle {
		fmt.Printf("[DEBUG] Title changed detected!\n")
		if oldTitle == "" {
			changes = append(changes, fmt.Sprintf("📝 标题: 新建「%s」", newTitle))
		} else if newTitle == "" {
			changes = append(changes, "📝 标题: 已删除")
		} else {
			// 检测标题的具体变化
			titleChange := r.detectTitleChange(oldTitle, newTitle)
			fmt.Printf("[DEBUG] Title change result: %s\n", titleChange)
			changes = append(changes, titleChange)
		}
	} else {
		fmt.Printf("[DEBUG] No title change detected\n")
	}

	// 2. 检测内容变更
	if oldContent != newContent {
		fmt.Printf("[DEBUG] Content changed detected!\n")
		oldLines := len(strings.Split(oldContent, "\n"))
		newLines := len(strings.Split(newContent, "\n"))
		lineDiff := newLines - oldLines

		if lineDiff > 0 {
			changes = append(changes, fmt.Sprintf("📄 内容: +%d行", lineDiff))
		} else if lineDiff < 0 {
			changes = append(changes, fmt.Sprintf("📄 内容: -%d行", -lineDiff))
		} else {
			changes = append(changes, "📄 内容: 已修改")
		}
	}

	// 3. 如果没有任何变更
	if len(changes) == 0 {
		result := "无变更"
		fmt.Printf("[DEBUG] Final result: '%s'\n", result)
		fmt.Printf("[DEBUG] ======================================\n\n")
		return result
	}

	// 返回变更摘要（用 | 分隔）
	result := strings.Join(changes, " | ")
	fmt.Printf("[DEBUG] Final result: '%s'\n", result)
	fmt.Printf("[DEBUG] ======================================\n\n")
	return result
}

// detectTitleChange 检测标题的具体变化类型
func (r *documentRepository) detectTitleChange(oldTitle, newTitle string) string {
	// 检测是否是简单的添加/删除文字
	if strings.Contains(newTitle, oldTitle) {
		// 新标题包含旧标题，说明是添加内容
		added := strings.ReplaceAll(newTitle, oldTitle, "")
		added = strings.TrimSpace(added)
		if added != "" {
			return fmt.Sprintf("📝 标题: 添加了「%s」", added)
		}
	} else if strings.Contains(oldTitle, newTitle) {
		// 旧标题包含新标题，说明是删除内容
		removed := strings.ReplaceAll(oldTitle, newTitle, "")
		removed = strings.TrimSpace(removed)
		if removed != "" {
			return fmt.Sprintf("📝 标题: 删除了「%s」", removed)
		}
	}

	// 复杂变更，显示完整的新旧对比
	// 如果标题太长，截断显示
	const maxLen = 30
	oldDisplay := oldTitle
	newDisplay := newTitle

	if len(oldTitle) > maxLen {
		oldDisplay = oldTitle[:maxLen] + "..."
	}
	if len(newTitle) > maxLen {
		newDisplay = newTitle[:maxLen] + "..."
	}

	return fmt.Sprintf("📝 标题:「%s」→「%s」", oldDisplay, newDisplay)
}

// AppendContent 向文档追加内容
// 此方法会：
// 1. 验证文档存在性
// 2. 在追加前创建版本快照
// 3. 追加内容到documents表
// 4. 更新version和updated_at
func (r *documentRepository) AppendContent(ctx context.Context, documentID int, appendContent string, userID int) (*models.Document, error) {
	// Step 1: 获取当前文档状态
	oldDoc, err := r.GetByID(ctx, documentID)
	if err != nil {
		return nil, fmt.Errorf("获取文档失败: %w", err)
	}

	// Step 2: 准备新内容（原内容 + 分隔符 + 追加内容）
	oldContent := ""
	if oldDoc.Content != nil {
		oldContent = *oldDoc.Content
	}

	// 使用双换行作为分隔符
	separator := "\n\n"
	newContent := oldContent + separator + appendContent

	// Step 3: 在追加前创建版本快照（保存旧内容）
	versionExists, _ := r.versionSnapshotExists(ctx, documentID, oldDoc.Version)
	if !versionExists {
		_, versionErr := r.createVersionSnapshot(ctx, documentID, oldDoc, userID, oldDoc.Title, newContent)
		if versionErr != nil {
			fmt.Printf("[WARNING] Failed to create version snapshot for document %d: %v\n", documentID, versionErr)
		} else {
			fmt.Printf("[INFO] Created version snapshot v%d for document %d before appending\n", oldDoc.Version, documentID)
		}
	}

	// Step 4: 执行内容追加（使用乐观锁）
	query := `
		UPDATE documents
		SET
			content = content || $1,
			version = version + 1,
			updated_at = CURRENT_TIMESTAMP
		WHERE
			id = $2
			AND deleted_at IS NULL
			AND version = $3
		RETURNING version, updated_at`

	var newVersion int
	var updatedAt time.Time

	err = r.db.QueryRowContext(ctx, query, separator+appendContent, documentID, oldDoc.Version).Scan(&newVersion, &updatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			// 可能是并发冲突或文档已删除
			return nil, fmt.Errorf("文档不存在、已删除或版本冲突（可能被其他操作修改）")
		}
		return nil, fmt.Errorf("追加文档内容失败: %w", err)
	}

	fmt.Printf("[INFO] Successfully appended content to document %d (v%d -> v%d, added %d chars)\n",
		documentID, oldDoc.Version, newVersion, len(appendContent))

	// Step 5: 返回更新后的文档
	return r.GetByID(ctx, documentID)
}

// 辅助函数
func stringPtr(s string) *string {
	return &s
}
