package services

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

// WorkNoteService 工作笔记服务（基于 documents 表实现）
type WorkNoteService struct {
	db *sql.DB
}

// NewWorkNoteService 创建工作笔记服务实例
// 注意：第二个参数目前未使用，仅为保持与工厂构造函数兼容
func NewWorkNoteService(db *sql.DB, _ *DocumentService) *WorkNoteService {
	return &WorkNoteService{db: db}
}

// =====================
// 基础 CRUD
// =====================

func (s *WorkNoteService) CreateWorkNote(ctx context.Context, req models.CreateWorkNoteRequest, userID int) (*models.WorkNote, error) {
	// 设置默认值
	if req.Priority == "" {
		req.Priority = models.WorkNotePriorityMedium
	}
	if req.WorkNoteType == "" {
		req.WorkNoteType = models.WorkNoteTypeGeneral
	}
	if req.Visibility == "" {
		req.Visibility = models.VisibilityPrivate
	}

	metadata := models.DocumentMetadata{
		"work_note_type": req.WorkNoteType,
		"priority":       req.Priority,
		"is_pinned":      req.IsPinned,
		"is_bookmarked":  req.IsBookmarked,
		"related_tasks":  req.RelatedTasks,
		"related_notes":  req.RelatedNotes,
	}
	if req.CustomFields != nil {
		metadata["custom_fields"] = req.CustomFields
	}

	// 插入 documents
	var (
		id        int
		createdAt sql.NullTime
		updatedAt sql.NullTime
	)
	query := `
		INSERT INTO documents (
			project_id, folder_id, title, content, type, status,
			description, tags, metadata, owner_id, visibility,
			version, is_template, created_by
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10, $11,
			$12, $13, $14
		) RETURNING id, created_at, updated_at`

	// 工作笔记不强制绑定项目，使用 NULL project_id
	var projectID *int = nil
	var content *string = req.Content
	var description *string = req.Description
	tags := pq.StringArray(req.Tags)

	err := s.db.QueryRowContext(ctx, query,
		projectID, req.WorkNoteFolderID, req.Title, content,
		models.DocumentTypeMarkdown, models.DocumentStatusDraft,
		description, tags, metadata, userID, req.Visibility,
		1, false, userID,
	).Scan(&id, &createdAt, &updatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create work note: %w", err)
	}

	// 构建 WorkNote
	wn := &models.WorkNote{
		Document: models.Document{
			ID:          id,
			ProjectID:   projectID,
			FolderID:    req.WorkNoteFolderID,
			Title:       req.Title,
			Content:     content,
			Type:        models.DocumentTypeMarkdown,
			Status:      models.DocumentStatusDraft,
			Description: description,
			Tags:        req.Tags,
			Metadata:    metadata,
			OwnerID:     userID,
			Visibility:  req.Visibility,
			Version:     1,
			IsTemplate:  false,
			CreatedBy:   userID,
			CreatedAt:   timeOrZeroTime(createdAt),
			UpdatedAt:   timeOrZeroTime(updatedAt),
		},
		WorkNoteType:     req.WorkNoteType,
		Priority:         req.Priority,
		IsPinned:         req.IsPinned,
		IsBookmarked:     req.IsBookmarked,
		RelatedTasks:     req.RelatedTasks,
		RelatedNotes:     req.RelatedNotes,
		WorkNoteFolderID: req.WorkNoteFolderID,
	}

	// 计算阅读时间与字数并更新 metadata（非阻塞失败）
	wn.CalculateReadTime()
	wn.UpdateMetadata()
	if wn.ReadTime != nil || wn.WordCount != nil {
		updMeta := wn.Document.Metadata
		if err := s.updateDocumentMetadata(ctx, id, updMeta); err != nil {
			// 记录但不阻断
			fmt.Printf("[WARN] failed to update work note calculated metadata: %v\n", err)
		}
	}

	return wn, nil
}

func (s *WorkNoteService) GetWorkNote(ctx context.Context, noteID, userID int) (*models.WorkNote, error) {
	doc, err := s.getDocumentByID(ctx, noteID)
	if err != nil {
		return nil, err
	}
	// 权限：简单限制为 owner
	if doc.OwnerID != userID {
		return nil, fmt.Errorf("not found")
	}
	if !models.IsWorkNote(*doc) {
		return nil, fmt.Errorf("not found")
	}
	wn := &models.WorkNote{}
	if err := wn.FromDocument(*doc); err != nil {
		return nil, err
	}
	// 记录阅读
	go s.recordView(context.Background(), noteID, userID)
	return wn, nil
}

func (s *WorkNoteService) UpdateWorkNote(ctx context.Context, noteID int, req models.UpdateWorkNoteRequest, userID int) (*models.WorkNote, error) {
	existing, err := s.getDocumentByID(ctx, noteID)
	if err != nil {
		return nil, err
	}
	if existing.OwnerID != userID {
		return nil, fmt.Errorf("not found")
	}
	if !models.IsWorkNote(*existing) {
		return nil, fmt.Errorf("not found")
	}

	// 构建更新请求
	u := &models.UpdateDocumentRequest{}
	if req.Title != nil {
		u.Title = req.Title
	}
	if req.Content != nil {
		u.Content = req.Content
	}
	if req.Description != nil {
		u.Description = req.Description
	}
	if req.WorkNoteFolderID != nil {
		u.FolderID = req.WorkNoteFolderID
	}
	if req.Visibility != nil {
		u.Visibility = req.Visibility
	}
	if len(req.Tags) > 0 {
		tmp := req.Tags
		u.Tags = &tmp
	}

	// 合并 metadata
	meta := existing.Metadata
	if meta == nil {
		meta = make(models.DocumentMetadata)
	}
	if req.WorkNoteType != nil {
		meta["work_note_type"] = *req.WorkNoteType
	}
	if req.Priority != nil {
		meta["priority"] = *req.Priority
	}
	if req.IsPinned != nil {
		meta["is_pinned"] = *req.IsPinned
	}
	if req.IsBookmarked != nil {
		meta["is_bookmarked"] = *req.IsBookmarked
	}
	if req.RelatedTasks != nil {
		meta["related_tasks"] = req.RelatedTasks
	}
	if req.RelatedNotes != nil {
		meta["related_notes"] = req.RelatedNotes
	}
	if req.CustomFields != nil {
		meta["custom_fields"] = req.CustomFields
	}
	u.Metadata = &meta

	updated, err := s.updateDocument(ctx, noteID, u)
	if err != nil {
		return nil, err
	}

	wn := &models.WorkNote{}
	if err := wn.FromDocument(*updated); err != nil {
		return nil, err
	}
	// 如果内容变化，重新计算阅读时间并更新 metadata
	if req.Content != nil {
		wn.CalculateReadTime()
		wn.UpdateMetadata()
		if err := s.updateDocumentMetadata(ctx, noteID, wn.Document.Metadata); err != nil {
			fmt.Printf("[WARN] failed to update work note calculated metadata: %v\n", err)
		}
	}
	return wn, nil
}

func (s *WorkNoteService) DeleteWorkNote(ctx context.Context, noteID, userID int) error {
	doc, err := s.getDocumentByID(ctx, noteID)
	if err != nil {
		return err
	}
	if doc.OwnerID != userID {
		return fmt.Errorf("not found")
	}
	_, err = s.db.ExecContext(ctx, `UPDATE documents SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL`, noteID)
	return err
}

// =====================
// 列表与搜索
// =====================

func (s *WorkNoteService) ListWorkNotes(ctx context.Context, filter models.WorkNoteFilter, userID int) (*models.WorkNoteListResponse, error) {
	where := []string{"d.deleted_at IS NULL", "d.owner_id = $1", "(d.metadata->>'work_note_type') IS NOT NULL"}
	args := []interface{}{userID}
	arg := 2

	if filter.WorkNoteFolderID != nil {
		where = append(where, fmt.Sprintf("d.folder_id = $%d", arg))
		args = append(args, *filter.WorkNoteFolderID)
		arg++
	}
	if filter.WorkNoteType != nil {
		where = append(where, fmt.Sprintf("d.metadata->>'work_note_type' = $%d", arg))
		args = append(args, string(*filter.WorkNoteType))
		arg++
	}
	if filter.Priority != nil {
		where = append(where, fmt.Sprintf("d.metadata->>'priority' = $%d", arg))
		args = append(args, string(*filter.Priority))
		arg++
	}
	if filter.Visibility != nil {
		where = append(where, fmt.Sprintf("d.visibility = $%d", arg))
		args = append(args, string(*filter.Visibility))
		arg++
	}
	if filter.Status != nil {
		where = append(where, fmt.Sprintf("d.status = $%d", arg))
		args = append(args, string(*filter.Status))
		arg++
	}
	if filter.IsPinned != nil {
		where = append(where, fmt.Sprintf("(d.metadata->>'is_pinned')::boolean = $%d", arg))
		args = append(args, *filter.IsPinned)
		arg++
	}
	if filter.IsBookmarked != nil {
		where = append(where, fmt.Sprintf("(d.metadata->>'is_bookmarked')::boolean = $%d", arg))
		args = append(args, *filter.IsBookmarked)
		arg++
	}
	if len(filter.Tags) > 0 {
		where = append(where, fmt.Sprintf("EXISTS (SELECT 1 FROM unnest(d.tags) t WHERE t = ANY($%d))", arg))
		args = append(args, pq.Array(filter.Tags))
		arg++
	}
	if strings.TrimSpace(filter.Search) != "" {
		where = append(where, fmt.Sprintf("(d.title ILIKE $%d OR d.description ILIKE $%d OR (d.content IS NOT NULL AND d.content ILIKE $%d))", arg, arg, arg))
		args = append(args, "%"+filter.Search+"%")
		arg++
	}

	whereClause := strings.Join(where, " AND ")

	// 计数
	countSQL := fmt.Sprintf("SELECT COUNT(*) FROM documents d WHERE %s", whereClause)
	var total int
	if err := s.db.QueryRowContext(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("failed to count work notes: %w", err)
	}

	// 排序
	orderBy := "d.updated_at DESC"
	if filter.SortBy != "" {
		order := "ASC"
		if strings.ToLower(filter.Order) == "desc" {
			order = "DESC"
		}
		orderBy = fmt.Sprintf("d.%s %s", filter.SortBy, order)
	}
	limit := filter.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	page := filter.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	// 查询
	selectSQL := fmt.Sprintf(`
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
		LIMIT $%d OFFSET $%d`, whereClause, orderBy, arg, arg+1)

	args = append(args, limit, offset)
	rows, err := s.db.QueryContext(ctx, selectSQL, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list work notes: %w", err)
	}
	defer rows.Close()

	notes := []models.WorkNote{}
	for rows.Next() {
		var doc models.Document
		var tags pq.StringArray
		var ownerName sql.NullString
		if err := rows.Scan(
			&doc.ID, &doc.ProjectID, &doc.Title, &doc.Content, &doc.Type, &doc.Status,
			&doc.FileURL, &doc.FileSize, &doc.MimeType, &doc.Description, &tags,
			&doc.Metadata, &doc.OwnerID, &doc.Visibility, &doc.Version, &doc.IsTemplate,
			&doc.CreatedBy, &doc.CreatedAt, &doc.UpdatedAt, &doc.DeletedAt,
			&doc.Archived, &doc.ArchivedAt, &doc.ArchivedBy, &doc.UnarchivedAt, &doc.UnarchivedBy,
			&ownerName,
		); err != nil {
			return nil, fmt.Errorf("failed to scan work note: %w", err)
		}
		doc.Tags = []string(tags)
		if ownerName.Valid {
			doc.OwnerName = &ownerName.String
		}
		if !models.IsWorkNote(doc) {
			continue
		}
		var wn models.WorkNote
		if err := wn.FromDocument(doc); err != nil {
			continue
		}
		notes = append(notes, wn)
	}

	return &models.WorkNoteListResponse{
		Notes: notes,
		Total: total,
		Page:  page,
		Limit: limit,
	}, nil
}

func (s *WorkNoteService) SearchWorkNotes(ctx context.Context, query string, tags []string, userID int, limit int) ([]models.WorkNoteSearchResult, error) {
	if limit <= 0 || limit > 50 {
		limit = 10
	}
	where := []string{
		"d.deleted_at IS NULL",
		"d.owner_id = $1",
		"(d.metadata->>'work_note_type') IS NOT NULL",
		"(d.title ILIKE $2 OR d.description ILIKE $2 OR (d.content IS NOT NULL AND d.content ILIKE $2))",
	}
	args := []interface{}{userID, "%" + query + "%"}
	arg := 3
	if len(tags) > 0 {
		where = append(where, fmt.Sprintf("EXISTS (SELECT 1 FROM unnest(d.tags) t WHERE t = ANY($%d))", arg))
		args = append(args, pq.Array(tags))
		arg++
	}
	sqlStr := fmt.Sprintf(`
		SELECT d.id, d.project_id, d.title, d.content, d.type, d.status,
		       d.file_url, d.file_size, d.mime_type, d.description, d.tags,
		       d.metadata, d.owner_id, d.visibility, d.version, d.is_template,
		       d.created_by, d.created_at, d.updated_at, d.deleted_at,
		       d.archived, d.archived_at, d.archived_by, d.unarchived_at, d.unarchived_by
		FROM documents d
		WHERE %s
		ORDER BY d.updated_at DESC
		LIMIT %d`, strings.Join(where, " AND "), limit)

	rows, err := s.db.QueryContext(ctx, sqlStr, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to search work notes: %w", err)
	}
	defer rows.Close()

	results := []models.WorkNoteSearchResult{}
	for rows.Next() {
		var doc models.Document
		var tagsArr pq.StringArray
		if err := rows.Scan(
			&doc.ID, &doc.ProjectID, &doc.Title, &doc.Content, &doc.Type, &doc.Status,
			&doc.FileURL, &doc.FileSize, &doc.MimeType, &doc.Description, &tagsArr,
			&doc.Metadata, &doc.OwnerID, &doc.Visibility, &doc.Version, &doc.IsTemplate,
			&doc.CreatedBy, &doc.CreatedAt, &doc.UpdatedAt, &doc.DeletedAt,
			&doc.Archived, &doc.ArchivedAt, &doc.ArchivedBy, &doc.UnarchivedAt, &doc.UnarchivedBy,
		); err != nil {
			continue
		}
		doc.Tags = []string(tagsArr)
		if !models.IsWorkNote(doc) {
			continue
		}
		var wn models.WorkNote
		if err := wn.FromDocument(doc); err != nil {
			continue
		}
		res := models.WorkNoteSearchResult{WorkNote: wn, MatchType: determineMatchType(query, &doc), MatchScore: 1.0}
		// 简单高亮
		lower := strings.ToLower(query)
		if strings.Contains(strings.ToLower(doc.Title), lower) {
			ht := highlight(doc.Title, query)
			res.HighlightedTitle = &ht
		}
		if doc.Content != nil && strings.Contains(strings.ToLower(*doc.Content), lower) {
			ex := excerpt(*doc.Content, query, 200)
			res.HighlightedExcerpt = &ex
		}
		results = append(results, res)
	}
	return results, nil
}

// =====================
// 统计与特定集合
// =====================

func (s *WorkNoteService) GetWorkNoteStats(ctx context.Context, userID int) (*models.WorkNoteStats, error) {
	stats := &models.WorkNoteStats{
		NotesByType:     map[models.WorkNoteType]int{},
		NotesByPriority: map[models.WorkNotePriority]int{},
		NotesByFolder:   map[int]int{},
	}
	// 总数/置顶/收藏
	row := s.db.QueryRowContext(ctx, `
		SELECT 
			COUNT(*) AS total_notes,
			COUNT(CASE WHEN (metadata->>'is_pinned')::boolean = true THEN 1 END) AS pinned_count,
			COUNT(CASE WHEN (metadata->>'is_bookmarked')::boolean = true THEN 1 END) AS bookmarked_count
		FROM documents
		WHERE owner_id = $1 AND deleted_at IS NULL AND metadata->>'work_note_type' IS NOT NULL`, userID)
	if err := row.Scan(&stats.TotalNotes, &stats.PinnedCount, &stats.BookmarkedCount); err != nil {
		return nil, fmt.Errorf("failed to get base stats: %w", err)
	}
	// 按类型
	rows, err := s.db.QueryContext(ctx, `
		SELECT metadata->>'work_note_type' AS t, COUNT(*)
		FROM documents
		WHERE owner_id = $1 AND deleted_at IS NULL AND metadata->>'work_note_type' IS NOT NULL
		GROUP BY t`, userID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var t sql.NullString
			var c int
			if err := rows.Scan(&t, &c); err == nil && t.Valid {
				stats.NotesByType[models.WorkNoteType(t.String)] = c
			}
		}
	}
	// 按优先级
	rows2, err := s.db.QueryContext(ctx, `
		SELECT metadata->>'priority' AS p, COUNT(*)
		FROM documents
		WHERE owner_id = $1 AND deleted_at IS NULL AND metadata->>'work_note_type' IS NOT NULL
		GROUP BY p`, userID)
	if err == nil {
		defer rows2.Close()
		for rows2.Next() {
			var p sql.NullString
			var c int
			if err := rows2.Scan(&p, &c); err == nil && p.Valid {
				stats.NotesByPriority[models.WorkNotePriority(p.String)] = c
			}
		}
	}
	// 按文件夹
	rows3, err := s.db.QueryContext(ctx, `
		SELECT COALESCE(folder_id, 0) AS f, COUNT(*)
		FROM documents
		WHERE owner_id = $1 AND deleted_at IS NULL AND metadata->>'work_note_type' IS NOT NULL
		GROUP BY f`, userID)
	if err == nil {
		defer rows3.Close()
		for rows3.Next() {
			var f int
			var c int
			if err := rows3.Scan(&f, &c); err == nil {
				stats.NotesByFolder[f] = c
			}
		}
	}
	return stats, nil
}

func (s *WorkNoteService) GetRecentNotes(ctx context.Context, userID, limit int) ([]models.WorkNote, error) {
	if limit <= 0 {
		limit = 10
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT d.id, d.project_id, d.title, d.content, d.type, d.status,
		       d.file_url, d.file_size, d.mime_type, d.description, d.tags,
		       d.metadata, d.owner_id, d.visibility, d.version, d.is_template,
		       d.created_by, d.created_at, d.updated_at, d.deleted_at,
		       d.archived, d.archived_at, d.archived_by, d.unarchived_at, d.unarchived_by
		FROM documents d
		WHERE d.deleted_at IS NULL AND d.owner_id = $1 AND d.metadata->>'work_note_type' IS NOT NULL
		ORDER BY d.updated_at DESC
		LIMIT $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.WorkNote
	for rows.Next() {
		var doc models.Document
		var tags pq.StringArray
		if err := rows.Scan(
			&doc.ID, &doc.ProjectID, &doc.Title, &doc.Content, &doc.Type, &doc.Status,
			&doc.FileURL, &doc.FileSize, &doc.MimeType, &doc.Description, &tags,
			&doc.Metadata, &doc.OwnerID, &doc.Visibility, &doc.Version, &doc.IsTemplate,
			&doc.CreatedBy, &doc.CreatedAt, &doc.UpdatedAt, &doc.DeletedAt,
			&doc.Archived, &doc.ArchivedAt, &doc.ArchivedBy, &doc.UnarchivedAt, &doc.UnarchivedBy,
		); err != nil {
			continue
		}
		doc.Tags = []string(tags)
		if !models.IsWorkNote(doc) {
			continue
		}
		var wn models.WorkNote
		if err := wn.FromDocument(doc); err != nil {
			continue
		}
		out = append(out, wn)
	}
	return out, nil
}

func (s *WorkNoteService) GetPinnedNotes(ctx context.Context, userID int) ([]models.WorkNote, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT d.id, d.project_id, d.title, d.content, d.type, d.status,
		       d.file_url, d.file_size, d.mime_type, d.description, d.tags,
		       d.metadata, d.owner_id, d.visibility, d.version, d.is_template,
		       d.created_by, d.created_at, d.updated_at, d.deleted_at,
		       d.archived, d.archived_at, d.archived_by, d.unarchived_at, d.unarchived_by
		FROM documents d
		WHERE d.deleted_at IS NULL AND d.owner_id = $1 AND d.metadata->>'work_note_type' IS NOT NULL
		  AND (d.metadata->>'is_pinned')::boolean = true
		ORDER BY d.updated_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.WorkNote
	for rows.Next() {
		var doc models.Document
		var tags pq.StringArray
		if err := rows.Scan(
			&doc.ID, &doc.ProjectID, &doc.Title, &doc.Content, &doc.Type, &doc.Status,
			&doc.FileURL, &doc.FileSize, &doc.MimeType, &doc.Description, &tags,
			&doc.Metadata, &doc.OwnerID, &doc.Visibility, &doc.Version, &doc.IsTemplate,
			&doc.CreatedBy, &doc.CreatedAt, &doc.UpdatedAt, &doc.DeletedAt,
			&doc.Archived, &doc.ArchivedAt, &doc.ArchivedBy, &doc.UnarchivedAt, &doc.UnarchivedBy,
		); err != nil {
			continue
		}
		doc.Tags = []string(tags)
		if !models.IsWorkNote(doc) {
			continue
		}
		var wn models.WorkNote
		if err := wn.FromDocument(doc); err != nil {
			continue
		}
		out = append(out, wn)
	}
	return out, nil
}

func (s *WorkNoteService) GetBookmarkedNotes(ctx context.Context, userID int) ([]models.WorkNote, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT d.id, d.project_id, d.title, d.content, d.type, d.status,
		       d.file_url, d.file_size, d.mime_type, d.description, d.tags,
		       d.metadata, d.owner_id, d.visibility, d.version, d.is_template,
		       d.created_by, d.created_at, d.updated_at, d.deleted_at,
		       d.archived, d.archived_at, d.archived_by, d.unarchived_at, d.unarchived_by
		FROM documents d
		WHERE d.deleted_at IS NULL AND d.owner_id = $1 AND d.metadata->>'work_note_type' IS NOT NULL
		  AND (d.metadata->>'is_bookmarked')::boolean = true
		ORDER BY d.updated_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.WorkNote
	for rows.Next() {
		var doc models.Document
		var tags pq.StringArray
		if err := rows.Scan(
			&doc.ID, &doc.ProjectID, &doc.Title, &doc.Content, &doc.Type, &doc.Status,
			&doc.FileURL, &doc.FileSize, &doc.MimeType, &doc.Description, &tags,
			&doc.Metadata, &doc.OwnerID, &doc.Visibility, &doc.Version, &doc.IsTemplate,
			&doc.CreatedBy, &doc.CreatedAt, &doc.UpdatedAt, &doc.DeletedAt,
			&doc.Archived, &doc.ArchivedAt, &doc.ArchivedBy, &doc.UnarchivedAt, &doc.UnarchivedBy,
		); err != nil {
			continue
		}
		doc.Tags = []string(tags)
		if !models.IsWorkNote(doc) {
			continue
		}
		var wn models.WorkNote
		if err := wn.FromDocument(doc); err != nil {
			continue
		}
		out = append(out, wn)
	}
	return out, nil
}

func (s *WorkNoteService) GetRelatedNotes(ctx context.Context, noteID, userID int) ([]models.WorkNote, error) {
	var relJSON sql.NullString
	err := s.db.QueryRowContext(ctx, `
		SELECT metadata->>'related_notes'
		FROM documents
		WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL AND metadata->>'work_note_type' IS NOT NULL`, noteID, userID).Scan(&relJSON)
	if err != nil {
		if err == sql.ErrNoRows {
			return []models.WorkNote{}, nil
		}
		return nil, fmt.Errorf("failed to load related notes: %w", err)
	}
	if !relJSON.Valid || relJSON.String == "" || relJSON.String == "null" {
		return []models.WorkNote{}, nil
	}
	var ids []int
	if err := json.Unmarshal([]byte(relJSON.String), &ids); err != nil {
		return []models.WorkNote{}, nil
	}
	if len(ids) == 0 {
		return []models.WorkNote{}, nil
	}

	q := `
		SELECT d.id, d.project_id, d.title, d.content, d.type, d.status,
		       d.file_url, d.file_size, d.mime_type, d.description, d.tags,
		       d.metadata, d.owner_id, d.visibility, d.version, d.is_template,
		       d.created_by, d.created_at, d.updated_at, d.deleted_at,
		       d.archived, d.archived_at, d.archived_by, d.unarchived_at, d.unarchived_by
		FROM documents d
		WHERE d.id = ANY($1) AND d.owner_id = $2 AND d.deleted_at IS NULL AND d.metadata->>'work_note_type' IS NOT NULL
		ORDER BY d.updated_at DESC`
	rows, err := s.db.QueryContext(ctx, q, pq.Array(ids), userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query related notes: %w", err)
	}
	defer rows.Close()

	var out []models.WorkNote
	for rows.Next() {
		var doc models.Document
		var tags pq.StringArray
		if err := rows.Scan(
			&doc.ID, &doc.ProjectID, &doc.Title, &doc.Content, &doc.Type, &doc.Status,
			&doc.FileURL, &doc.FileSize, &doc.MimeType, &doc.Description, &tags,
			&doc.Metadata, &doc.OwnerID, &doc.Visibility, &doc.Version, &doc.IsTemplate,
			&doc.CreatedBy, &doc.CreatedAt, &doc.UpdatedAt, &doc.DeletedAt,
			&doc.Archived, &doc.ArchivedAt, &doc.ArchivedBy, &doc.UnarchivedAt, &doc.UnarchivedBy,
		); err != nil {
			continue
		}
		doc.Tags = []string(tags)
		if !models.IsWorkNote(doc) {
			continue
		}
		var wn models.WorkNote
		if err := wn.FromDocument(doc); err != nil {
			continue
		}
		out = append(out, wn)
	}
	return out, nil
}

// =====================
// 批量操作
// =====================

func (s *WorkNoteService) BatchUpdateWorkNotes(ctx context.Context, operation models.BatchWorkNoteOperation, userID int) error {
	switch strings.ToLower(operation.Operation) {
	case "move":
		// data.target_folder_id: int or null
		var target *int
		if v, ok := operation.Data["target_folder_id"]; ok && v != nil {
			switch t := v.(type) {
			case float64:
				iv := int(t)
				target = &iv
			case int:
				iv := t
				target = &iv
			}
		}
		_, err := s.db.ExecContext(ctx, `UPDATE documents SET folder_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($2) AND owner_id = $3`, target, pq.Array(operation.NoteIDs), userID)
		return err
	case "tag":
		// data.tags: []string, data.action: add|set
		action := "add"
		if v, ok := operation.Data["action"].(string); ok && v != "" {
			action = strings.ToLower(v)
		}
		var newTags []string
		if raw, ok := operation.Data["tags"]; ok && raw != nil {
			switch ts := raw.(type) {
			case []interface{}:
				for _, it := range ts {
					if s, ok := it.(string); ok {
						newTags = append(newTags, s)
					}
				}
			case []string:
				newTags = ts
			}
		}
		for _, id := range operation.NoteIDs {
			// 读取现有
			var cur pq.StringArray
			if err := s.db.QueryRowContext(ctx, `SELECT tags FROM documents WHERE id = $1 AND owner_id = $2`, id, userID).Scan(&cur); err != nil {
				continue
			}
			set := map[string]bool{}
			if action != "set" {
				for _, t := range []string(cur) {
					set[t] = true
				}
			} else {
				for k := range set {
					delete(set, k)
				}
			}
			for _, t := range newTags {
				set[t] = true
			}
			merged := make([]string, 0, len(set))
			for k := range set {
				merged = append(merged, k)
			}
			_, _ = s.db.ExecContext(ctx, `UPDATE documents SET tags = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND owner_id = $3`, pq.Array(merged), id, userID)
		}
		return nil
	case "priority":
		// data.priority: string
		var prio string
		if v, ok := operation.Data["priority"].(string); ok {
			prio = v
		}
		if prio == "" {
			return fmt.Errorf("missing priority")
		}
		_, err := s.db.ExecContext(ctx, `UPDATE documents SET metadata = jsonb_set(COALESCE(metadata,'{}'::jsonb), '{priority}', to_jsonb($1::text), true), updated_at = CURRENT_TIMESTAMP WHERE id = ANY($2) AND owner_id = $3`, prio, pq.Array(operation.NoteIDs), userID)
		return err
	case "delete":
		_, err := s.db.ExecContext(ctx, `UPDATE documents SET deleted_at = CURRENT_TIMESTAMP WHERE id = ANY($1) AND owner_id = $2 AND deleted_at IS NULL`, pq.Array(operation.NoteIDs), userID)
		return err
	case "archive":
		_, err := s.db.ExecContext(ctx, `UPDATE documents SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ANY($1) AND owner_id = $2`, pq.Array(operation.NoteIDs), userID)
		return err
	default:
		return fmt.Errorf("unsupported batch operation: %s", operation.Operation)
	}
}

// =====================
// 任务关联功能
// =====================

// CreateAndAttachToTask 创建工作笔记并关联到指定任务
func (s *WorkNoteService) CreateAndAttachToTask(ctx context.Context, req models.CreateWorkNoteRequest, taskID int, userID int) (*models.WorkNote, error) {
	// 1. 验证任务是否存在且用户有权限访问
	var taskProjectID *int
	var taskTitle string
	err := s.db.QueryRowContext(ctx, `
		SELECT t.project_id, t.title 
		FROM tasks t 
		WHERE t.id = $1 AND t.deleted_at IS NULL`, taskID).Scan(&taskProjectID, &taskTitle)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("task not found or access denied")
		}
		return nil, fmt.Errorf("failed to validate task: %w", err)
	}

	// 2. 设置默认值并增强metadata
	if req.Priority == "" {
		req.Priority = models.WorkNotePriorityMedium
	}
	if req.WorkNoteType == "" {
		req.WorkNoteType = models.WorkNoteTypeGeneral
	}

	// 3. 构建增强的metadata，包含任务关联信息
	metadata := models.DocumentMetadata{
		"work_note_type":   req.WorkNoteType,
		"priority":         req.Priority,
		"is_pinned":        req.IsPinned,
		"is_bookmarked":    req.IsBookmarked,
		"related_tasks":    []int{taskID}, // 关联的任务ID列表
		"related_notes":    req.RelatedNotes,
		"attached_task_id": taskID,              // 主关联任务ID
		"source":           "create-and-attach", // 标记创建来源
	}
	if req.CustomFields != nil {
		metadata["custom_fields"] = req.CustomFields
	}

	// 4. 如果没有指定标题，使用任务标题生成默认标题
	title := req.Title
	if title == "" {
		title = fmt.Sprintf("%s - 工作笔记", taskTitle)
	}

	// 5. 如果没有指定内容，提供默认模板
	content := req.Content
	if content == nil || *content == "" {
		defaultContent := fmt.Sprintf("# %s\n\n## 任务关联\n- 任务ID: #%d\n- 任务标题: %s\n\n## 笔记内容\n\n", title, taskID, taskTitle)
		content = &defaultContent
	}

	// 6. 插入文档到数据库
	var (
		id        int
		createdAt sql.NullTime
		updatedAt sql.NullTime
	)
	query := `
		INSERT INTO documents (
			project_id, folder_id, title, content, type, status,
			description, tags, metadata, owner_id, visibility,
			version, is_template, created_by
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10, $11,
			$12, $13, $14
		) RETURNING id, created_at, updated_at`

	// 使用任务的项目ID（如果任务有项目）或使用传入的项目ID
	var projectID *int = taskProjectID
	var description *string
	if req.Description != nil {
		desc := fmt.Sprintf("关联任务 #%d 的工作笔记: %s", taskID, *req.Description)
		description = &desc
	} else {
		desc := fmt.Sprintf("关联任务 #%d 的工作笔记", taskID)
		description = &desc
	}

	// 添加任务关联标签
	tags := append(req.Tags, "task-attached", fmt.Sprintf("task-%d", taskID))

	err = s.db.QueryRowContext(ctx, query,
		projectID, req.WorkNoteFolderID, title, content,
		models.DocumentTypeMarkdown, models.DocumentStatusDraft,
		description, pq.StringArray(tags), metadata, userID, req.Visibility,
		1, false, userID,
	).Scan(&id, &createdAt, &updatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create and attach work note: %w", err)
	}

	// 7. 构建WorkNote对象
	wn := &models.WorkNote{
		Document: models.Document{
			ID:          id,
			ProjectID:   projectID,
			FolderID:    req.WorkNoteFolderID,
			Title:       title,
			Content:     content,
			Type:        models.DocumentTypeMarkdown,
			Status:      models.DocumentStatusDraft,
			Description: description,
			Tags:        tags,
			Metadata:    metadata,
			OwnerID:     userID,
			Visibility:  req.Visibility,
			Version:     1,
			IsTemplate:  false,
			CreatedBy:   userID,
			CreatedAt:   timeOrZeroTime(createdAt),
			UpdatedAt:   timeOrZeroTime(updatedAt),
		},
		WorkNoteType:     req.WorkNoteType,
		Priority:         req.Priority,
		IsPinned:         req.IsPinned,
		IsBookmarked:     req.IsBookmarked,
		RelatedTasks:     []int{taskID},
		RelatedNotes:     req.RelatedNotes,
		WorkNoteFolderID: req.WorkNoteFolderID,
	}

	// 8. 计算阅读时间与字数并更新metadata（非阻塞失败）
	wn.CalculateReadTime()
	wn.UpdateMetadata()
	if wn.ReadTime != nil || wn.WordCount != nil {
		updMeta := wn.Document.Metadata
		if err := s.updateDocumentMetadata(ctx, id, updMeta); err != nil {
			fmt.Printf("[WARN] failed to update work note calculated metadata: %v\n", err)
		}
	}

	return wn, nil
}

// GetWorkNotesByTask 获取关联到指定任务的所有工作笔记
func (s *WorkNoteService) GetWorkNotesByTask(ctx context.Context, taskID int, userID int) ([]models.WorkNote, error) {
	query := `
		SELECT d.id, d.project_id, d.title, d.content, d.type, d.status,
		       d.file_url, d.file_size, d.mime_type, d.description, d.tags,
		       d.metadata, d.owner_id, d.visibility, d.version, d.is_template,
		       d.created_by, d.created_at, d.updated_at, d.deleted_at,
		       d.archived, d.archived_at, d.archived_by, d.unarchived_at, d.unarchived_by
		FROM documents d
		WHERE d.deleted_at IS NULL 
		  AND d.owner_id = $1 
		  AND d.metadata->>'work_note_type' IS NOT NULL
		  AND (
		    (d.metadata->>'attached_task_id')::int = $2
		    OR d.metadata->'related_tasks' @> $3::jsonb
		  )
		ORDER BY d.updated_at DESC`

	rows, err := s.db.QueryContext(ctx, query, userID, taskID, fmt.Sprintf("[%d]", taskID))
	if err != nil {
		return nil, fmt.Errorf("failed to get work notes by task: %w", err)
	}
	defer rows.Close()

	var notes []models.WorkNote
	for rows.Next() {
		var doc models.Document
		var tags pq.StringArray
		if err := rows.Scan(
			&doc.ID, &doc.ProjectID, &doc.Title, &doc.Content, &doc.Type, &doc.Status,
			&doc.FileURL, &doc.FileSize, &doc.MimeType, &doc.Description, &tags,
			&doc.Metadata, &doc.OwnerID, &doc.Visibility, &doc.Version, &doc.IsTemplate,
			&doc.CreatedBy, &doc.CreatedAt, &doc.UpdatedAt, &doc.DeletedAt,
			&doc.Archived, &doc.ArchivedAt, &doc.ArchivedBy, &doc.UnarchivedAt, &doc.UnarchivedBy,
		); err != nil {
			continue
		}
		doc.Tags = []string(tags)
		if !models.IsWorkNote(doc) {
			continue
		}
		var wn models.WorkNote
		if err := wn.FromDocument(doc); err != nil {
			continue
		}
		notes = append(notes, wn)
	}
	return notes, nil
}

// =====================
// 内部辅助
// =====================

func (s *WorkNoteService) getDocumentByID(ctx context.Context, id int) (*models.Document, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT d.id, d.project_id, d.title, d.content, d.type, d.status,
		       d.file_url, d.file_size, d.mime_type, d.description, d.tags,
		       d.metadata, d.owner_id, d.visibility, d.version, d.is_template,
		       d.created_by, d.created_at, d.updated_at, d.deleted_at,
		       d.archived, d.archived_at, d.archived_by, d.unarchived_at, d.unarchived_by
		FROM documents d
		WHERE d.id = $1 AND d.deleted_at IS NULL`, id)
	var doc models.Document
	var tags pq.StringArray
	if err := row.Scan(
		&doc.ID, &doc.ProjectID, &doc.Title, &doc.Content, &doc.Type, &doc.Status,
		&doc.FileURL, &doc.FileSize, &doc.MimeType, &doc.Description, &tags,
		&doc.Metadata, &doc.OwnerID, &doc.Visibility, &doc.Version, &doc.IsTemplate,
		&doc.CreatedBy, &doc.CreatedAt, &doc.UpdatedAt, &doc.DeletedAt,
		&doc.Archived, &doc.ArchivedAt, &doc.ArchivedBy, &doc.UnarchivedAt, &doc.UnarchivedBy,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("document not found")
		}
		return nil, err
	}
	doc.Tags = []string(tags)
	return &doc, nil
}

func (s *WorkNoteService) updateDocument(ctx context.Context, id int, upd *models.UpdateDocumentRequest) (*models.Document, error) {
	// 动态构建更新语句，参考 repository.Update 实现
	setParts := []string{}
	args := []interface{}{}
	idx := 1
	if upd.Title != nil {
		setParts = append(setParts, fmt.Sprintf("title = $%d", idx))
		args = append(args, *upd.Title)
		idx++
	}
	if upd.Content != nil {
		setParts = append(setParts, fmt.Sprintf("content = $%d", idx))
		args = append(args, *upd.Content)
		idx++
	}
	if upd.Status != nil {
		setParts = append(setParts, fmt.Sprintf("status = $%d", idx))
		args = append(args, *upd.Status)
		idx++
	}
	if upd.Description != nil {
		setParts = append(setParts, fmt.Sprintf("description = $%d", idx))
		args = append(args, *upd.Description)
		idx++
	}
	if upd.Tags != nil {
		setParts = append(setParts, fmt.Sprintf("tags = $%d", idx))
		args = append(args, pq.Array(*upd.Tags))
		idx++
	}
	if upd.Visibility != nil {
		setParts = append(setParts, fmt.Sprintf("visibility = $%d", idx))
		args = append(args, *upd.Visibility)
		idx++
	}
	if upd.Metadata != nil {
		setParts = append(setParts, fmt.Sprintf("metadata = $%d", idx))
		args = append(args, *upd.Metadata)
		idx++
	}
	if upd.FolderID != nil {
		setParts = append(setParts, fmt.Sprintf("folder_id = $%d", idx))
		args = append(args, *upd.FolderID)
		idx++
	}
	if len(setParts) == 0 {
		return s.getDocumentByID(ctx, id)
	}
	setParts = append(setParts, "version = version + 1, updated_at = CURRENT_TIMESTAMP")
	q := fmt.Sprintf("UPDATE documents SET %s WHERE id = $%d AND deleted_at IS NULL", strings.Join(setParts, ", "), idx)
	args = append(args, id)
	var version int
	var updatedAt sql.NullTime
	// 有些数据库不支持 RETURNING version, updated_at；尝试更新后再读取
	if _, err := s.db.ExecContext(ctx, q, args...); err != nil {
		return nil, err
	}
	_ = version
	_ = updatedAt
	return s.getDocumentByID(ctx, id)
}

func (s *WorkNoteService) updateDocumentMetadata(ctx context.Context, id int, meta models.DocumentMetadata) error {
	_, err := s.db.ExecContext(ctx, `UPDATE documents SET metadata = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND deleted_at IS NULL`, meta, id)
	return err
}

// 记录查看次数与最后阅读时间
func (s *WorkNoteService) recordView(ctx context.Context, noteID, userID int) {
	_, err := s.db.ExecContext(ctx, `
		UPDATE documents
		SET metadata = jsonb_set(
			jsonb_set(COALESCE(metadata,'{}'::jsonb), '{view_count}', to_jsonb(COALESCE((metadata->>'view_count')::int,0) + 1), true),
			'{last_read_at}', to_jsonb(NOW())
		), updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND owner_id = $2`, noteID, userID)
	if err != nil {
		fmt.Printf("[WARN] failed to record view for note %d: %v\n", noteID, err)
	}
}

// 简单匹配类型
func determineMatchType(query string, doc *models.Document) string {
	q := strings.ToLower(query)
	if strings.Contains(strings.ToLower(doc.Title), q) {
		return "title"
	}
	if doc.Content != nil && strings.Contains(strings.ToLower(*doc.Content), q) {
		return "content"
	}
	if doc.Description != nil && strings.Contains(strings.ToLower(*doc.Description), q) {
		return "description"
	}
	for _, t := range doc.Tags {
		if strings.Contains(strings.ToLower(t), q) {
			return "tags"
		}
	}
	return "metadata"
}

func highlight(text, query string) string {
	return strings.ReplaceAll(text, query, fmt.Sprintf("<mark>%s</mark>", query))
}

func excerpt(content, query string, maxLen int) string {
	lc := strings.ToLower(content)
	lq := strings.ToLower(query)
	idx := strings.Index(lc, lq)
	if idx == -1 {
		if len(content) <= maxLen {
			return content
		}
		return content[:maxLen] + "..."
	}
	start := idx - maxLen/4
	if start < 0 {
		start = 0
	}
	end := start + maxLen
	if end > len(content) {
		end = len(content)
	}
	out := content[start:end]
	if start > 0 {
		out = "..." + out
	}
	if end < len(content) {
		out = out + "..."
	}
	return out
}

func timeOrZeroTime(nt sql.NullTime) time.Time {
	if nt.Valid {
		return nt.Time
	}
	return time.Time{}
}
