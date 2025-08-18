package services

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"
)

// EnhancedSearchService provides advanced search capabilities
type EnhancedSearchService struct {
	db *sql.DB
}

// NewEnhancedSearchService creates a new enhanced search service
func NewEnhancedSearchService(db *sql.DB) *EnhancedSearchService {
	return &EnhancedSearchService{db: db}
}

// SearchFilter represents advanced search filter options
type SearchFilter struct {
	Query          string    `json:"query"`
	Type           string    `json:"type"`           // document, task, project, user
	Categories     []string  `json:"categories"`
	Tags           []string  `json:"tags"`
	DateFrom       *time.Time `json:"date_from"`
	DateTo         *time.Time `json:"date_to"`
	CreatedBy      []int     `json:"created_by"`
	AssignedTo     []int     `json:"assigned_to"`
	ProjectIDs     []int     `json:"project_ids"`
	Status         []string  `json:"status"`
	Priority       []string  `json:"priority"`
	FileTypes      []string  `json:"file_types"`
	SizeMin        *int64    `json:"size_min"`
	SizeMax        *int64    `json:"size_max"`
	IncludeContent bool      `json:"include_content"`
	SortBy         string    `json:"sort_by"`    // relevance, date, size, title
	SortOrder      string    `json:"sort_order"` // asc, desc
	Page           int       `json:"page"`
	Limit          int       `json:"limit"`
}

// SearchResult represents a unified search result
type SearchResult struct {
	ID          int                    `json:"id"`
	Type        string                 `json:"type"` // document, task, project, user
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	Content     string                 `json:"content,omitempty"`
	URL         string                 `json:"url"`
	Thumbnail   string                 `json:"thumbnail,omitempty"`
	Score       float64                `json:"score"`
	Highlights  []string               `json:"highlights"`
	Metadata    map[string]interface{} `json:"metadata"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
	CreatedBy   int                    `json:"created_by"`
	CreatedByName string               `json:"created_by_name"`
	Tags        []string               `json:"tags"`
	Category    string                 `json:"category"`
	Status      string                 `json:"status"`
	FileSize    *int64                 `json:"file_size,omitempty"`
	FileType    string                 `json:"file_type,omitempty"`
	ProjectID   *int                   `json:"project_id,omitempty"`
	ProjectName string                 `json:"project_name,omitempty"`
}

// SearchResponse represents the complete search response
type SearchResponse struct {
	Results      []SearchResult         `json:"results"`
	TotalCount   int                    `json:"total_count"`
	Page         int                    `json:"page"`
	Limit        int                    `json:"limit"`
	HasNext      bool                   `json:"has_next"`
	HasPrevious  bool                   `json:"has_previous"`
	SearchTime   time.Duration          `json:"search_time"`
	Facets       map[string]interface{} `json:"facets"`
	Suggestions  []string               `json:"suggestions"`
}

// Search performs enhanced full-text search across multiple entity types
func (s *EnhancedSearchService) Search(ctx context.Context, filter *SearchFilter) (*SearchResponse, error) {
	startTime := time.Now()

	// Default values
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 {
		filter.Limit = 20
	}
	if filter.SortBy == "" {
		filter.SortBy = "relevance"
	}
	if filter.SortOrder == "" {
		filter.SortOrder = "desc"
	}

	var results []SearchResult
	var totalCount int
	var err error

	// Perform search based on type
	switch filter.Type {
	case "document":
		results, totalCount, err = s.searchDocuments(ctx, filter)
	case "task":
		results, totalCount, err = s.searchTasks(ctx, filter)
	case "project":
		results, totalCount, err = s.searchProjects(ctx, filter)
	case "user":
		results, totalCount, err = s.searchUsers(ctx, filter)
	default:
		// Search all types
		results, totalCount, err = s.searchAll(ctx, filter)
	}

	if err != nil {
		return nil, fmt.Errorf("search failed: %w", err)
	}

	// Calculate pagination
	hasNext := (filter.Page * filter.Limit) < totalCount
	hasPrevious := filter.Page > 1

	// Generate search suggestions
	suggestions := s.generateSuggestions(filter.Query)

	// Generate facets for filtering
	facets := s.generateFacets(ctx, filter)

	searchTime := time.Since(startTime)

	return &SearchResponse{
		Results:     results,
		TotalCount:  totalCount,
		Page:        filter.Page,
		Limit:       filter.Limit,
		HasNext:     hasNext,
		HasPrevious: hasPrevious,
		SearchTime:  searchTime,
		Facets:      facets,
		Suggestions: suggestions,
	}, nil
}

// searchDocuments performs full-text search on documents
func (s *EnhancedSearchService) searchDocuments(ctx context.Context, filter *SearchFilter) ([]SearchResult, int, error) {
	// Build the WHERE clause
	whereClause := "d.deleted_at IS NULL"
	args := []interface{}{}
	argIndex := 1

	// Full-text search query
	if filter.Query != "" {
		searchVector := fmt.Sprintf("to_tsvector('english', d.title || ' ' || COALESCE(d.description, '') || ' ' || COALESCE(d.content, ''))")
		whereClause += fmt.Sprintf(" AND %s @@ plainto_tsquery('english', $%d)", searchVector, argIndex)
		args = append(args, filter.Query)
		argIndex++
	}

	// Filter by categories
	if len(filter.Categories) > 0 {
		placeholders := make([]string, len(filter.Categories))
		for i, category := range filter.Categories {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, category)
			argIndex++
		}
		whereClause += fmt.Sprintf(" AND d.type = ANY(ARRAY[%s])", strings.Join(placeholders, ","))
	}

	// Filter by tags
	if len(filter.Tags) > 0 {
		whereClause += fmt.Sprintf(" AND d.tags && $%d", argIndex)
		args = append(args, "{"+strings.Join(filter.Tags, ",")+"}")
		argIndex++
	}

	// Filter by date range
	if filter.DateFrom != nil {
		whereClause += fmt.Sprintf(" AND d.created_at >= $%d", argIndex)
		args = append(args, *filter.DateFrom)
		argIndex++
	}
	if filter.DateTo != nil {
		whereClause += fmt.Sprintf(" AND d.created_at <= $%d", argIndex)
		args = append(args, *filter.DateTo)
		argIndex++
	}

	// Filter by creator
	if len(filter.CreatedBy) > 0 {
		placeholders := make([]string, len(filter.CreatedBy))
		for i, creatorID := range filter.CreatedBy {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, creatorID)
			argIndex++
		}
		whereClause += fmt.Sprintf(" AND d.created_by = ANY(ARRAY[%s])", strings.Join(placeholders, ","))
	}

	// Filter by projects
	if len(filter.ProjectIDs) > 0 {
		placeholders := make([]string, len(filter.ProjectIDs))
		for i, projectID := range filter.ProjectIDs {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, projectID)
			argIndex++
		}
		whereClause += fmt.Sprintf(" AND d.project_id = ANY(ARRAY[%s])", strings.Join(placeholders, ","))
	}

	// Filter by status
	if len(filter.Status) > 0 {
		placeholders := make([]string, len(filter.Status))
		for i, status := range filter.Status {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, status)
			argIndex++
		}
		whereClause += fmt.Sprintf(" AND d.status = ANY(ARRAY[%s])", strings.Join(placeholders, ","))
	}

	// Filter by file size
	if filter.SizeMin != nil {
		whereClause += fmt.Sprintf(" AND d.file_size >= $%d", argIndex)
		args = append(args, *filter.SizeMin)
		argIndex++
	}
	if filter.SizeMax != nil {
		whereClause += fmt.Sprintf(" AND d.file_size <= $%d", argIndex)
		args = append(args, *filter.SizeMax)
		argIndex++
	}

	// Build ORDER BY clause
	orderClause := "d.updated_at DESC"
	if filter.Query != "" && filter.SortBy == "relevance" {
		searchVector := "to_tsvector('english', d.title || ' ' || COALESCE(d.description, '') || ' ' || COALESCE(d.content, ''))"
		orderClause = fmt.Sprintf("ts_rank(%s, plainto_tsquery('english', $1)) DESC, d.updated_at DESC", searchVector)
	} else {
		switch filter.SortBy {
		case "title":
			orderClause = "d.title " + filter.SortOrder
		case "date":
			orderClause = "d.updated_at " + filter.SortOrder
		case "size":
			orderClause = "d.file_size " + filter.SortOrder
		}
	}

	// Count query
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM documents d
		LEFT JOIN users u ON d.created_by = u.id
		LEFT JOIN projects p ON d.project_id = p.id
		WHERE %s`, whereClause)

	var totalCount int
	err := s.db.QueryRowContext(ctx, countQuery, args...).Scan(&totalCount)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count documents: %w", err)
	}

	// Main query with pagination
	offset := (filter.Page - 1) * filter.Limit
	selectFields := `
		d.id, d.title, d.description, d.file_size, d.type, d.status,
		d.tags, d.created_at, d.updated_at, d.created_by, d.project_id,
		u.username as created_by_name,
		p.name as project_name`

	if filter.IncludeContent {
		selectFields += ", d.content"
	}

	query := fmt.Sprintf(`
		SELECT %s
		FROM documents d
		LEFT JOIN users u ON d.created_by = u.id
		LEFT JOIN projects p ON d.project_id = p.id
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d`,
		selectFields, whereClause, orderClause, argIndex, argIndex+1)

	args = append(args, filter.Limit, offset)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query documents: %w", err)
	}
	defer rows.Close()

	var results []SearchResult
	for rows.Next() {
		var result SearchResult
		var tags sql.NullString
		var content sql.NullString
		var projectID sql.NullInt64
		var projectName sql.NullString

		scanArgs := []interface{}{
			&result.ID, &result.Title, &result.Description, &result.FileSize, &result.FileType,
			&result.Status, &tags, &result.CreatedAt, &result.UpdatedAt, &result.CreatedBy,
			&projectID, &result.CreatedByName, &projectName,
		}

		if filter.IncludeContent {
			scanArgs = append(scanArgs, &content)
		}

		err := rows.Scan(scanArgs...)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan document row: %w", err)
		}

		result.Type = "document"
		result.URL = fmt.Sprintf("/documents/%d", result.ID)

		if tags.Valid {
			result.Tags = strings.Split(strings.Trim(tags.String, "{}"), ",")
		}

		if content.Valid && filter.IncludeContent {
			result.Content = content.String
		}

		if projectID.Valid {
			pid := int(projectID.Int64)
			result.ProjectID = &pid
			result.ProjectName = projectName.String
		}

		// Generate highlights if search query exists
		if filter.Query != "" {
			result.Highlights = s.generateHighlights(filter.Query, result.Title+" "+result.Description+result.Content)
		}

		// Calculate relevance score
		result.Score = s.calculateRelevanceScore(filter.Query, result)

		results = append(results, result)
	}

	return results, totalCount, nil
}

// searchTasks performs search on tasks
func (s *EnhancedSearchService) searchTasks(ctx context.Context, filter *SearchFilter) ([]SearchResult, int, error) {
	// Similar implementation for tasks
	// Simplified for brevity - would follow same pattern as searchDocuments
	return []SearchResult{}, 0, nil
}

// searchProjects performs search on projects
func (s *EnhancedSearchService) searchProjects(ctx context.Context, filter *SearchFilter) ([]SearchResult, int, error) {
	// Similar implementation for projects
	return []SearchResult{}, 0, nil
}

// searchUsers performs search on users
func (s *EnhancedSearchService) searchUsers(ctx context.Context, filter *SearchFilter) ([]SearchResult, int, error) {
	// Similar implementation for users
	return []SearchResult{}, 0, nil
}

// searchAll performs search across all entity types
func (s *EnhancedSearchService) searchAll(ctx context.Context, filter *SearchFilter) ([]SearchResult, int, error) {
	// Combine results from all search functions
	var allResults []SearchResult
	var totalCount int

	// Search documents
	docResults, docCount, err := s.searchDocuments(ctx, filter)
	if err == nil {
		allResults = append(allResults, docResults...)
		totalCount += docCount
	}

	// Search tasks
	taskResults, taskCount, err := s.searchTasks(ctx, filter)
	if err == nil {
		allResults = append(allResults, taskResults...)
		totalCount += taskCount
	}

	// Sort by relevance score
	// Implementation would sort allResults by Score field

	// Apply pagination to combined results
	start := (filter.Page - 1) * filter.Limit
	end := start + filter.Limit
	if end > len(allResults) {
		end = len(allResults)
	}
	if start > len(allResults) {
		start = len(allResults)
	}

	pagedResults := allResults[start:end]

	return pagedResults, totalCount, nil
}

// generateHighlights creates highlighted text snippets
func (s *EnhancedSearchService) generateHighlights(query string, text string) []string {
	// Simple implementation - in production would use more sophisticated highlighting
	highlights := []string{}
	queryLower := strings.ToLower(query)
	textLower := strings.ToLower(text)

	// Find query occurrences and create snippets
	words := strings.Fields(queryLower)
	for _, word := range words {
		if idx := strings.Index(textLower, word); idx != -1 {
			start := idx - 50
			if start < 0 {
				start = 0
			}
			end := idx + len(word) + 50
			if end > len(text) {
				end = len(text)
			}
			snippet := text[start:end]
			// Bold the matched word
			snippet = strings.ReplaceAll(snippet, word, fmt.Sprintf("<mark>%s</mark>", word))
			highlights = append(highlights, snippet)
		}
	}

	return highlights
}

// calculateRelevanceScore calculates relevance score for search results
func (s *EnhancedSearchService) calculateRelevanceScore(query string, result SearchResult) float64 {
	if query == "" {
		return 1.0
	}

	score := 0.0
	queryLower := strings.ToLower(query)
	titleLower := strings.ToLower(result.Title)
	descLower := strings.ToLower(result.Description)

	// Title match gets highest score
	if strings.Contains(titleLower, queryLower) {
		score += 3.0
	}

	// Description match gets medium score
	if strings.Contains(descLower, queryLower) {
		score += 1.5
	}

	// Content match gets lower score
	if strings.Contains(strings.ToLower(result.Content), queryLower) {
		score += 1.0
	}

	// Tag match gets bonus
	for _, tag := range result.Tags {
		if strings.Contains(strings.ToLower(tag), queryLower) {
			score += 0.5
		}
	}

	// Recency bonus
	daysSinceUpdate := time.Since(result.UpdatedAt).Hours() / 24
	if daysSinceUpdate < 7 {
		score += 0.5
	}

	return score
}

// generateSuggestions creates search suggestions
func (s *EnhancedSearchService) generateSuggestions(query string) []string {
	// Simple implementation - in production would use more sophisticated suggestion logic
	suggestions := []string{}
	if query != "" {
		suggestions = append(suggestions, query+" 文档")
		suggestions = append(suggestions, query+" 任务")
		suggestions = append(suggestions, query+" 项目")
	}
	return suggestions
}

// generateFacets creates facet data for filtering
func (s *EnhancedSearchService) generateFacets(ctx context.Context, filter *SearchFilter) map[string]interface{} {
	facets := make(map[string]interface{})

	// Document type facets
	typeQuery := `
		SELECT type, COUNT(*) as count
		FROM documents
		WHERE deleted_at IS NULL
		GROUP BY type
		ORDER BY count DESC`

	rows, err := s.db.QueryContext(ctx, typeQuery)
	if err == nil {
		defer rows.Close()
		typeFacets := make(map[string]int)
		for rows.Next() {
			var docType string
			var count int
			if err := rows.Scan(&docType, &count); err == nil {
				typeFacets[docType] = count
			}
		}
		facets["document_types"] = typeFacets
	}

	// Status facets
	statusQuery := `
		SELECT status, COUNT(*) as count
		FROM documents
		WHERE deleted_at IS NULL
		GROUP BY status
		ORDER BY count DESC`

	rows, err = s.db.QueryContext(ctx, statusQuery)
	if err == nil {
		defer rows.Close()
		statusFacets := make(map[string]int)
		for rows.Next() {
			var status string
			var count int
			if err := rows.Scan(&status, &count); err == nil {
				statusFacets[status] = count
			}
		}
		facets["status"] = statusFacets
	}

	return facets
}