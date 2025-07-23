package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"
)

// PostgresDocumentRepository implements DocumentRepository using PostgreSQL
type PostgresDocumentRepository struct {
	db interface{}
}

// getExecer returns the appropriate execer (DB or Tx)
func (r *PostgresDocumentRepository) getExecer() execer {
	if tx, ok := r.db.(*sql.Tx); ok {
		return tx
	}
	return r.db.(*sql.DB)
}

// Create creates a new document
func (r *PostgresDocumentRepository) Create(ctx context.Context, document *models.Document) (*models.Document, error) {
	query := `
		INSERT INTO documents (project_id, title, content, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, project_id, title, content, created_by, created_at, updated_at
	`
	
	now := time.Now()
	document.CreatedAt = now
	document.UpdatedAt = now
	
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query,
		document.ProjectID,
		document.Title,
		document.Content,
		document.CreatedBy,
		document.CreatedAt,
		document.UpdatedAt,
	)
	
	var result models.Document
	err := row.Scan(
		&result.ID,
		&result.ProjectID,
		&result.Title,
		&result.Content,
		&result.CreatedBy,
		&result.CreatedAt,
		&result.UpdatedAt,
	)
	
	if err != nil {
		return nil, fmt.Errorf("failed to create document: %w", err)
	}
	
	return &result, nil
}

// GetByID retrieves a document by its ID
func (r *PostgresDocumentRepository) GetByID(ctx context.Context, id int) (*models.Document, error) {
	query := `
		SELECT id, project_id, title, content, created_by, created_at, updated_at
		FROM documents
		WHERE id = $1
	`
	
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query, id)
	
	var document models.Document
	err := row.Scan(
		&document.ID,
		&document.ProjectID,
		&document.Title,
		&document.Content,
		&document.CreatedBy,
		&document.CreatedAt,
		&document.UpdatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("document not found")
		}
		return nil, fmt.Errorf("failed to get document: %w", err)
	}
	
	return &document, nil
}

// GetByProjectID retrieves documents by project ID with optional filtering
func (r *PostgresDocumentRepository) GetByProjectID(ctx context.Context, projectID int, filter *models.DocumentFilter) ([]*models.Document, int, error) {
	conditions := []string{"project_id = $1"}
	args := []interface{}{projectID}
	argIndex := 2

	// Add search condition
	if filter != nil && filter.Search != "" {
		conditions = append(conditions, fmt.Sprintf("title ILIKE $%d", argIndex))
		args = append(args, "%"+filter.Search+"%")
		argIndex++
	}

	// Build WHERE clause
	whereClause := strings.Join(conditions, " AND ")

	// Count query
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM documents WHERE %s", whereClause)
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, countQuery, args...)
	
	var total int
	err := row.Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count documents: %w", err)
	}

	// Build ORDER BY clause
	orderBy := "updated_at DESC"
	if filter != nil && filter.SortBy != "" {
		switch filter.SortBy {
		case "created_at", "updated_at", "title":
			orderBy = filter.SortBy
			if filter.Order == "asc" {
				orderBy += " ASC"
			} else {
				orderBy += " DESC"
			}
		}
	}

	// Build pagination
	limit := 20
	offset := 0
	if filter != nil {
		if filter.Limit > 0 {
			limit = filter.Limit
		}
		if filter.Page > 0 {
			offset = (filter.Page - 1) * limit
		}
	}

	// Main query
	query := fmt.Sprintf(`
		SELECT id, project_id, title, content, created_by, created_at, updated_at
		FROM documents
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, whereClause, orderBy, argIndex, argIndex+1)

	args = append(args, limit, offset)

	rows, err := exec.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query documents: %w", err)
	}
	defer rows.Close()

	var documents []*models.Document
	for rows.Next() {
		var doc models.Document
		err := rows.Scan(
			&doc.ID,
			&doc.ProjectID,
			&doc.Title,
			&doc.Content,
			&doc.CreatedBy,
			&doc.CreatedAt,
			&doc.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan document row: %w", err)
		}
		documents = append(documents, &doc)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("failed to iterate documents: %w", err)
	}

	return documents, total, nil
}

// Update updates a document
func (r *PostgresDocumentRepository) Update(ctx context.Context, document *models.Document) (*models.Document, error) {
	query := `
		UPDATE documents
		SET title = $1, content = $2, updated_at = $3
		WHERE id = $4
		RETURNING id, project_id, title, content, created_by, created_at, updated_at
	`
	
	document.UpdatedAt = time.Now()
	
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query,
		document.Title,
		document.Content,
		document.UpdatedAt,
		document.ID,
	)
	
	var result models.Document
	err := row.Scan(
		&result.ID,
		&result.ProjectID,
		&result.Title,
		&result.Content,
		&result.CreatedBy,
		&result.CreatedAt,
		&result.UpdatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("document not found")
		}
		return nil, fmt.Errorf("failed to update document: %w", err)
	}
	
	return &result, nil
}

// Delete deletes a document
func (r *PostgresDocumentRepository) Delete(ctx context.Context, id int) error {
	query := `DELETE FROM documents WHERE id = $1`
	
	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete document: %w", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	
	if rowsAffected == 0 {
		return fmt.Errorf("document not found")
	}
	
	return nil
}

// GetWithRelations retrieves a document with related project and user information
func (r *PostgresDocumentRepository) GetWithRelations(ctx context.Context, id int) (*models.DocumentResponse, error) {
	query := `
		SELECT 
			d.id, d.project_id, d.title, d.content, d.created_by, d.created_at, d.updated_at,
			p.name as project_name,
			u.username as creator_name
		FROM documents d
		LEFT JOIN projects p ON d.project_id = p.id
		LEFT JOIN users u ON d.created_by = u.id
		WHERE d.id = $1
	`
	
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query, id)
	
	var document models.Document
	var projectName sql.NullString
	var creatorName sql.NullString
	
	err := row.Scan(
		&document.ID,
		&document.ProjectID,
		&document.Title,
		&document.Content,
		&document.CreatedBy,
		&document.CreatedAt,
		&document.UpdatedAt,
		&projectName,
		&creatorName,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("document not found")
		}
		return nil, fmt.Errorf("failed to get document with relations: %w", err)
	}
	
	response := document.ToResponse()
	if projectName.Valid {
		response.ProjectName = projectName.String
	}
	if creatorName.Valid {
		response.CreatorName = creatorName.String
	}
	
	return &response, nil
}

// GetListWithRelations retrieves documents with related information for list view
func (r *PostgresDocumentRepository) GetListWithRelations(ctx context.Context, projectID int, filter *models.DocumentFilter) ([]*models.DocumentListResponse, int, error) {
	conditions := []string{"d.project_id = $1"}
	args := []interface{}{projectID}
	argIndex := 2

	// Add search condition
	if filter != nil && filter.Search != "" {
		conditions = append(conditions, fmt.Sprintf("d.title ILIKE $%d", argIndex))
		args = append(args, "%"+filter.Search+"%")
		argIndex++
	}

	// Build WHERE clause
	whereClause := strings.Join(conditions, " AND ")

	// Count query
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM documents d WHERE %s", whereClause)
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, countQuery, args...)
	
	var total int
	err := row.Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count documents: %w", err)
	}

	// Build ORDER BY clause
	orderBy := "d.updated_at DESC"
	if filter != nil && filter.SortBy != "" {
		switch filter.SortBy {
		case "created_at", "updated_at", "title":
			orderBy = "d." + filter.SortBy
			if filter.Order == "asc" {
				orderBy += " ASC"
			} else {
				orderBy += " DESC"
			}
		}
	}

	// Build pagination
	limit := 20
	offset := 0
	if filter != nil {
		if filter.Limit > 0 {
			limit = filter.Limit
		}
		if filter.Page > 0 {
			offset = (filter.Page - 1) * limit
		}
	}

	// Main query
	query := fmt.Sprintf(`
		SELECT 
			d.id, d.project_id, d.title, d.content, d.created_by, d.created_at, d.updated_at,
			p.name as project_name,
			u.username as creator_name
		FROM documents d
		LEFT JOIN projects p ON d.project_id = p.id
		LEFT JOIN users u ON d.created_by = u.id
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, whereClause, orderBy, argIndex, argIndex+1)

	args = append(args, limit, offset)

	rows, err := exec.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query documents with relations: %w", err)
	}
	defer rows.Close()

	var responses []*models.DocumentListResponse
	for rows.Next() {
		var document models.Document
		var projectName sql.NullString
		var creatorName sql.NullString
		
		err := rows.Scan(
			&document.ID,
			&document.ProjectID,
			&document.Title,
			&document.Content,
			&document.CreatedBy,
			&document.CreatedAt,
			&document.UpdatedAt,
			&projectName,
			&creatorName,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan document row: %w", err)
		}
		
		response := document.ToListResponse()
		if projectName.Valid {
			response.ProjectName = projectName.String
		}
		if creatorName.Valid {
			response.CreatorName = creatorName.String
		}
		responses = append(responses, &response)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("failed to iterate documents: %w", err)
	}

	return responses, total, nil
}

// Search searches documents by title within a project
func (r *PostgresDocumentRepository) Search(ctx context.Context, projectID int, searchTerm string, limit, offset int) ([]*models.Document, int, error) {
	// Count query
	countQuery := `
		SELECT COUNT(*)
		FROM documents
		WHERE project_id = $1 AND title ILIKE $2
	`
	
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, countQuery, projectID, "%"+searchTerm+"%")
	
	var total int
	err := row.Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count search results: %w", err)
	}

	// Main query
	query := `
		SELECT id, project_id, title, content, created_by, created_at, updated_at
		FROM documents
		WHERE project_id = $1 AND title ILIKE $2
		ORDER BY updated_at DESC
		LIMIT $3 OFFSET $4
	`
	
	rows, err := exec.QueryContext(ctx, query, projectID, "%"+searchTerm+"%", limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to search documents: %w", err)
	}
	defer rows.Close()

	var documents []*models.Document
	for rows.Next() {
		var doc models.Document
		err := rows.Scan(
			&doc.ID,
			&doc.ProjectID,
			&doc.Title,
			&doc.Content,
			&doc.CreatedBy,
			&doc.CreatedAt,
			&doc.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan document row: %w", err)
		}
		documents = append(documents, &doc)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("failed to iterate search results: %w", err)
	}

	return documents, total, nil
}

// GetAllDocumentsWithRelations retrieves all documents across projects with related information
func (r *PostgresDocumentRepository) GetAllDocumentsWithRelations(ctx context.Context, filter *models.DocumentFilter) ([]*models.DocumentListResponse, int, error) {
	conditions := []string{}
	args := []interface{}{}
	argIndex := 1

	// Add search condition
	if filter != nil && filter.Search != "" {
		conditions = append(conditions, fmt.Sprintf("d.title ILIKE $%d", argIndex))
		args = append(args, "%"+filter.Search+"%")
		argIndex++
	}

	// Build WHERE clause
	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count query
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM documents d %s", whereClause)
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, countQuery, args...)
	
	var total int
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count documents: %w", err)
	}

	// Set defaults
	page, limit := 1, 20
	if filter != nil {
		if filter.Page > 0 {
			page = filter.Page
		}
		if filter.Limit > 0 {
			limit = filter.Limit
		}
	}

	// Calculate offset
	offset := (page - 1) * limit

	// Build ORDER BY clause
	orderBy := "d.updated_at DESC"
	if filter != nil && filter.SortBy != "" {
		validSort := map[string]string{
			"title":      "d.title",
			"created_at": "d.created_at",
			"updated_at": "d.updated_at",
		}
		if sortField, exists := validSort[filter.SortBy]; exists {
			order := "DESC"
			if filter.Order == "asc" {
				order = "ASC"
			}
			orderBy = fmt.Sprintf("%s %s", sortField, order)
		}
	}

	// Main query with joins
	query := fmt.Sprintf(`
		SELECT 
			d.id,
			d.project_id,
			p.name as project_name,
			d.title,
			d.created_by,
			u.username as creator_name,
			d.created_at,
			d.updated_at,
			LENGTH(COALESCE(d.content, '')) as content_size
		FROM documents d
		JOIN projects p ON d.project_id = p.id
		JOIN users u ON d.created_by = u.id
		%s
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, whereClause, orderBy, argIndex, argIndex+1)

	args = append(args, limit, offset)

	rows, err := exec.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query documents: %w", err)
	}
	defer rows.Close()

	var documents []*models.DocumentListResponse
	for rows.Next() {
		doc := &models.DocumentListResponse{}
		err := rows.Scan(
			&doc.ID,
			&doc.ProjectID,
			&doc.ProjectName,
			&doc.Title,
			&doc.CreatedBy,
			&doc.CreatorName,
			&doc.CreatedAt,
			&doc.UpdatedAt,
			&doc.ContentSize,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan document: %w", err)
		}
		documents = append(documents, doc)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating documents: %w", err)
	}

	return documents, total, nil
}