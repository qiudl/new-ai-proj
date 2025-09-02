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
	Query          string     `json:"query"`
	Type           string     `json:"type"` // document, task, project, user
	Categories     []string   `json:"categories"`
	Tags           []string   `json:"tags"`
	DateFrom       *time.Time `json:"date_from"`
	DateTo         *time.Time `json:"date_to"`
	CreatedBy      []int      `json:"created_by"`
	AssignedTo     []int      `json:"assigned_to"`
	ProjectIDs     []int      `json:"project_ids"`
	Status         []string   `json:"status"`
	Priority       []string   `json:"priority"`
	FileTypes      []string   `json:"file_types"`
	SizeMin        *int64     `json:"size_min"`
	SizeMax        *int64     `json:"size_max"`
	IncludeContent bool       `json:"include_content"`
	SortBy         string     `json:"sort_by"`    // relevance, date, size, title
	SortOrder      string     `json:"sort_order"` // asc, desc
	Page           int        `json:"page"`
	Limit          int        `json:"limit"`
}

// PrefixSearchFilter represents search filter for name/path prefix matching
type PrefixSearchFilter struct {
	Prefix      string `json:"prefix"`       // The prefix to search for
	Type        string `json:"type"`         // Content type filter
	IncludePath bool   `json:"include_path"` // Include path-based search
	IncludeName bool   `json:"include_name"` // Include name-based search
	SortBy      string `json:"sort_by"`      // name, path, date, relevance
	SortOrder   string `json:"sort_order"`   // asc, desc
	Limit       int    `json:"limit"`        // Maximum results
}

// PrefixSearchResult represents a prefix search result
type PrefixSearchResult struct {
	ID            int       `json:"id"`
	Type          string    `json:"type"`       // document, task, project, user
	Name          string    `json:"name"`       // The actual name (title/filename)
	Path          string    `json:"path"`       // Full path if available
	URL           string    `json:"url"`        // Access URL
	MatchType     string    `json:"match_type"` // "name" or "path"
	Score         float64   `json:"score"`      // Match score
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
	CreatedBy     int       `json:"created_by"`
	CreatedByName string    `json:"created_by_name"`
	ProjectID     *int      `json:"project_id,omitempty"`
	ProjectName   string    `json:"project_name,omitempty"`
	Status        string    `json:"status,omitempty"`
}

// PrefixSearchResponse represents the prefix search response
type PrefixSearchResponse struct {
	Results     []PrefixSearchResult `json:"results"`
	TotalCount  int                  `json:"total_count"`
	SearchTime  time.Duration        `json:"search_time"`
	SearchType  string               `json:"search_type"` // "prefix"
	SearchQuery string               `json:"search_query"`
}

// SearchResult represents a unified search result
type SearchResult struct {
	ID            int                    `json:"id"`
	Type          string                 `json:"type"` // document, task, project, user
	Title         string                 `json:"title"`
	Description   string                 `json:"description"`
	Content       string                 `json:"content,omitempty"`
	URL           string                 `json:"url"`
	Thumbnail     string                 `json:"thumbnail,omitempty"`
	Score         float64                `json:"score"`
	Highlights    []string               `json:"highlights"`
	Metadata      map[string]interface{} `json:"metadata"`
	CreatedAt     time.Time              `json:"created_at"`
	UpdatedAt     time.Time              `json:"updated_at"`
	CreatedBy     int                    `json:"created_by"`
	CreatedByName string                 `json:"created_by_name"`
	Tags          []string               `json:"tags"`
	Category      string                 `json:"category"`
	Status        string                 `json:"status"`
	FileSize      *int64                 `json:"file_size,omitempty"`
	FileType      string                 `json:"file_type,omitempty"`
	ProjectID     *int                   `json:"project_id,omitempty"`
	ProjectName   string                 `json:"project_name,omitempty"`
}

// SearchResponse represents the complete search response
type SearchResponse struct {
	Results     []SearchResult         `json:"results"`
	TotalCount  int                    `json:"total_count"`
	Page        int                    `json:"page"`
	Limit       int                    `json:"limit"`
	HasNext     bool                   `json:"has_next"`
	HasPrevious bool                   `json:"has_previous"`
	SearchTime  time.Duration          `json:"search_time"`
	Facets      map[string]interface{} `json:"facets"`
	Suggestions []string               `json:"suggestions"`
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

// SearchByPrefix performs prefix-based search on names and paths
func (s *EnhancedSearchService) SearchByPrefix(ctx context.Context, filter *PrefixSearchFilter) (*PrefixSearchResponse, error) {
	startTime := time.Now()

	// Default values
	if filter.Limit < 1 {
		filter.Limit = 20
	}
	if filter.SortBy == "" {
		filter.SortBy = "name"
	}
	if filter.SortOrder == "" {
		filter.SortOrder = "asc"
	}

	var results []PrefixSearchResult
	var totalCount int
	var err error

	// Perform search based on type
	switch filter.Type {
	case "document":
		results, totalCount, err = s.searchDocumentsByPrefix(ctx, filter)
	case "task":
		results, totalCount, err = s.searchTasksByPrefix(ctx, filter)
	case "project":
		results, totalCount, err = s.searchProjectsByPrefix(ctx, filter)
	case "user":
		results, totalCount, err = s.searchUsersByPrefix(ctx, filter)
	default:
		// Search all types
		results, totalCount, err = s.searchAllByPrefix(ctx, filter)
	}

	if err != nil {
		return nil, fmt.Errorf("prefix search failed: %w", err)
	}

	searchTime := time.Since(startTime)

	return &PrefixSearchResponse{
		Results:     results,
		TotalCount:  totalCount,
		SearchTime:  searchTime,
		SearchType:  "prefix",
		SearchQuery: filter.Prefix,
	}, nil
}

// searchDocumentsByPrefix searches documents by name/path prefix
func (s *EnhancedSearchService) searchDocumentsByPrefix(ctx context.Context, filter *PrefixSearchFilter) ([]PrefixSearchResult, int, error) {
	var whereConditions []string
	var args []interface{}
	argIndex := 1

	// Base condition
	whereConditions = append(whereConditions, "d.deleted_at IS NULL")

	// Build prefix search conditions
	var prefixConditions []string

	if filter.IncludeName {
		prefixConditions = append(prefixConditions, fmt.Sprintf("LOWER(d.title) LIKE LOWER($%d)", argIndex))
		args = append(args, filter.Prefix+"%")
		argIndex++
	}

	if filter.IncludePath {
		// Assume documents have a path field or we construct it
		prefixConditions = append(prefixConditions, fmt.Sprintf("LOWER(COALESCE(d.file_path, '')) LIKE LOWER($%d)", argIndex))
		args = append(args, "%"+filter.Prefix+"%")
		argIndex++
	}

	if len(prefixConditions) > 0 {
		whereConditions = append(whereConditions, "("+strings.Join(prefixConditions, " OR ")+")")
	}

	whereClause := strings.Join(whereConditions, " AND ")

	// Build ORDER BY clause
	orderClause := "d.title ASC"
	switch filter.SortBy {
	case "name":
		orderClause = "d.title " + filter.SortOrder
	case "path":
		orderClause = "COALESCE(d.file_path, d.title) " + filter.SortOrder
	case "date":
		orderClause = "d.updated_at " + filter.SortOrder
	case "relevance":
		// For prefix search, shorter matches are more relevant
		orderClause = "LENGTH(d.title) ASC, d.title " + filter.SortOrder
	}

	// Count query
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM documents d
		WHERE %s`, whereClause)

	var totalCount int
	err := s.db.QueryRowContext(ctx, countQuery, args...).Scan(&totalCount)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count documents: %w", err)
	}

	// Main query
	query := fmt.Sprintf(`
		SELECT 
			d.id, d.title, COALESCE(d.file_path, '') as file_path,
			d.created_at, d.updated_at, d.created_by, d.project_id, d.status,
			u.username as created_by_name,
			p.name as project_name
		FROM documents d
		LEFT JOIN users u ON d.created_by = u.id
		LEFT JOIN projects p ON d.project_id = p.id
		WHERE %s
		ORDER BY %s
		LIMIT $%d`, whereClause, orderClause, argIndex)

	args = append(args, filter.Limit)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query documents: %w", err)
	}
	defer rows.Close()

	var results []PrefixSearchResult
	for rows.Next() {
		var result PrefixSearchResult
		var filePath sql.NullString
		var projectID sql.NullInt64
		var projectName sql.NullString

		err := rows.Scan(
			&result.ID, &result.Name, &filePath,
			&result.CreatedAt, &result.UpdatedAt, &result.CreatedBy,
			&projectID, &result.Status, &result.CreatedByName, &projectName,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan document row: %w", err)
		}

		result.Type = "document"
		result.URL = fmt.Sprintf("/documents/%d", result.ID)

		if filePath.Valid {
			result.Path = filePath.String
		}

		if projectID.Valid {
			pid := int(projectID.Int64)
			result.ProjectID = &pid
			result.ProjectName = projectName.String
		}

		// Determine match type and calculate score
		lowerName := strings.ToLower(result.Name)
		lowerPath := strings.ToLower(result.Path)
		lowerPrefix := strings.ToLower(filter.Prefix)

		if strings.HasPrefix(lowerName, lowerPrefix) {
			result.MatchType = "name"
			result.Score = 1.0 / (1.0 + float64(len(result.Name)-len(filter.Prefix))) // Higher score for closer matches
		} else if strings.Contains(lowerPath, lowerPrefix) {
			result.MatchType = "path"
			result.Score = 0.8 / (1.0 + float64(len(result.Path)-len(filter.Prefix)))
		} else {
			result.Score = 0.5
		}

		results = append(results, result)
	}

	return results, totalCount, nil
}

// searchTasksByPrefix searches tasks by name/path prefix
func (s *EnhancedSearchService) searchTasksByPrefix(ctx context.Context, filter *PrefixSearchFilter) ([]PrefixSearchResult, int, error) {
	var whereConditions []string
	var args []interface{}
	argIndex := 1

	// Base condition
	whereConditions = append(whereConditions, "t.deleted_at IS NULL")

	// Build prefix search conditions
	var prefixConditions []string

	if filter.IncludeName {
		prefixConditions = append(prefixConditions, fmt.Sprintf("LOWER(t.title) LIKE LOWER($%d)", argIndex))
		args = append(args, filter.Prefix+"%")
		argIndex++
	}

	if filter.IncludePath {
		// For tasks, we might consider the hierarchy path
		prefixConditions = append(prefixConditions, fmt.Sprintf("LOWER(t.path) LIKE LOWER($%d)", argIndex))
		args = append(args, "%"+filter.Prefix+"%")
		argIndex++
	}

	if len(prefixConditions) > 0 {
		whereConditions = append(whereConditions, "("+strings.Join(prefixConditions, " OR ")+")")
	}

	whereClause := strings.Join(whereConditions, " AND ")

	// Build ORDER BY clause
	orderClause := "t.title ASC"
	switch filter.SortBy {
	case "name":
		orderClause = "t.title " + filter.SortOrder
	case "path":
		orderClause = "COALESCE(t.path, t.title) " + filter.SortOrder
	case "date":
		orderClause = "t.updated_at " + filter.SortOrder
	case "relevance":
		orderClause = "LENGTH(t.title) ASC, t.title " + filter.SortOrder
	}

	// Count query
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM tasks t
		WHERE %s`, whereClause)

	var totalCount int
	err := s.db.QueryRowContext(ctx, countQuery, args...).Scan(&totalCount)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count tasks: %w", err)
	}

	// Main query
	query := fmt.Sprintf(`
		SELECT 
			t.id, t.title, COALESCE(t.path, '') as task_path,
			t.created_at, t.updated_at, t.created_by, t.project_id, t.status,
			u.username as created_by_name,
			p.name as project_name
		FROM tasks t
		LEFT JOIN users u ON t.created_by = u.id
		LEFT JOIN projects p ON t.project_id = p.id
		WHERE %s
		ORDER BY %s
		LIMIT $%d`, whereClause, orderClause, argIndex)

	args = append(args, filter.Limit)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query tasks: %w", err)
	}
	defer rows.Close()

	var results []PrefixSearchResult
	for rows.Next() {
		var result PrefixSearchResult
		var taskPath sql.NullString
		var projectID sql.NullInt64
		var projectName sql.NullString

		err := rows.Scan(
			&result.ID, &result.Name, &taskPath,
			&result.CreatedAt, &result.UpdatedAt, &result.CreatedBy,
			&projectID, &result.Status, &result.CreatedByName, &projectName,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan task row: %w", err)
		}

		result.Type = "task"
		result.URL = fmt.Sprintf("/tasks/%d", result.ID)

		if taskPath.Valid {
			result.Path = taskPath.String
		}

		if projectID.Valid {
			pid := int(projectID.Int64)
			result.ProjectID = &pid
			result.ProjectName = projectName.String
		}

		// Determine match type and calculate score
		lowerName := strings.ToLower(result.Name)
		lowerPath := strings.ToLower(result.Path)
		lowerPrefix := strings.ToLower(filter.Prefix)

		if strings.HasPrefix(lowerName, lowerPrefix) {
			result.MatchType = "name"
			result.Score = 1.0 / (1.0 + float64(len(result.Name)-len(filter.Prefix)))
		} else if strings.Contains(lowerPath, lowerPrefix) {
			result.MatchType = "path"
			result.Score = 0.8 / (1.0 + float64(len(result.Path)-len(filter.Prefix)))
		} else {
			result.Score = 0.5
		}

		results = append(results, result)
	}

	return results, totalCount, nil
}

// searchProjectsByPrefix searches projects by name prefix
func (s *EnhancedSearchService) searchProjectsByPrefix(ctx context.Context, filter *PrefixSearchFilter) ([]PrefixSearchResult, int, error) {
	var whereConditions []string
	var args []interface{}
	argIndex := 1

	// Base condition - assuming projects table doesn't have deleted_at or it uses a different field
	whereConditions = append(whereConditions, "1=1") // placeholder

	// Build prefix search conditions (projects mainly match by name)
	if filter.IncludeName {
		whereConditions = append(whereConditions, fmt.Sprintf("LOWER(p.name) LIKE LOWER($%d)", argIndex))
		args = append(args, filter.Prefix+"%")
		argIndex++
	}

	whereClause := strings.Join(whereConditions, " AND ")

	// Build ORDER BY clause
	orderClause := "p.name ASC"
	switch filter.SortBy {
	case "name":
		orderClause = "p.name " + filter.SortOrder
	case "date":
		orderClause = "p.updated_at " + filter.SortOrder
	case "relevance":
		orderClause = "LENGTH(p.name) ASC, p.name " + filter.SortOrder
	}

	// Count query
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM projects p
		WHERE %s`, whereClause)

	var totalCount int
	err := s.db.QueryRowContext(ctx, countQuery, args...).Scan(&totalCount)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count projects: %w", err)
	}

	// Main query
	query := fmt.Sprintf(`
		SELECT 
			p.id, p.name, p.created_at, p.updated_at, 
			COALESCE(p.created_by, 0) as created_by,
			COALESCE(u.username, '') as created_by_name
		FROM projects p
		LEFT JOIN users u ON p.created_by = u.id
		WHERE %s
		ORDER BY %s
		LIMIT $%d`, whereClause, orderClause, argIndex)

	args = append(args, filter.Limit)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query projects: %w", err)
	}
	defer rows.Close()

	var results []PrefixSearchResult
	for rows.Next() {
		var result PrefixSearchResult

		err := rows.Scan(
			&result.ID, &result.Name, &result.CreatedAt, &result.UpdatedAt,
			&result.CreatedBy, &result.CreatedByName,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan project row: %w", err)
		}

		result.Type = "project"
		result.URL = fmt.Sprintf("/projects/%d", result.ID)
		result.MatchType = "name"

		// Calculate score
		lowerName := strings.ToLower(result.Name)
		lowerPrefix := strings.ToLower(filter.Prefix)

		if strings.HasPrefix(lowerName, lowerPrefix) {
			result.Score = 1.0 / (1.0 + float64(len(result.Name)-len(filter.Prefix)))
		} else {
			result.Score = 0.5
		}

		results = append(results, result)
	}

	return results, totalCount, nil
}

// searchUsersByPrefix searches users by name/username prefix
func (s *EnhancedSearchService) searchUsersByPrefix(ctx context.Context, filter *PrefixSearchFilter) ([]PrefixSearchResult, int, error) {
	var whereConditions []string
	var args []interface{}
	argIndex := 1

	// Base condition
	whereConditions = append(whereConditions, "u.deleted_at IS NULL")

	// Build prefix search conditions
	var prefixConditions []string

	if filter.IncludeName {
		// Search both username and display name
		prefixConditions = append(prefixConditions, fmt.Sprintf("LOWER(u.username) LIKE LOWER($%d)", argIndex))
		args = append(args, filter.Prefix+"%")
		argIndex++

		prefixConditions = append(prefixConditions, fmt.Sprintf("LOWER(COALESCE(u.display_name, '')) LIKE LOWER($%d)", argIndex))
		args = append(args, filter.Prefix+"%")
		argIndex++
	}

	if len(prefixConditions) > 0 {
		whereConditions = append(whereConditions, "("+strings.Join(prefixConditions, " OR ")+")")
	}

	whereClause := strings.Join(whereConditions, " AND ")

	// Build ORDER BY clause
	orderClause := "u.username ASC"
	switch filter.SortBy {
	case "name":
		orderClause = "u.username " + filter.SortOrder
	case "date":
		orderClause = "u.updated_at " + filter.SortOrder
	case "relevance":
		orderClause = "LENGTH(u.username) ASC, u.username " + filter.SortOrder
	}

	// Count query
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM users u
		WHERE %s`, whereClause)

	var totalCount int
	err := s.db.QueryRowContext(ctx, countQuery, args...).Scan(&totalCount)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count users: %w", err)
	}

	// Main query
	query := fmt.Sprintf(`
		SELECT 
			u.id, u.username, COALESCE(u.display_name, '') as display_name,
			u.created_at, u.updated_at
		FROM users u
		WHERE %s
		ORDER BY %s
		LIMIT $%d`, whereClause, orderClause, argIndex)

	args = append(args, filter.Limit)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query users: %w", err)
	}
	defer rows.Close()

	var results []PrefixSearchResult
	for rows.Next() {
		var result PrefixSearchResult
		var displayName sql.NullString

		err := rows.Scan(
			&result.ID, &result.Name, &displayName,
			&result.CreatedAt, &result.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan user row: %w", err)
		}

		result.Type = "user"
		result.URL = fmt.Sprintf("/users/%d", result.ID)
		result.CreatedBy = result.ID // Self-reference for users
		result.CreatedByName = result.Name

		// Determine match type and calculate score
		lowerName := strings.ToLower(result.Name)
		lowerDisplayName := strings.ToLower(displayName.String)
		lowerPrefix := strings.ToLower(filter.Prefix)

		if strings.HasPrefix(lowerName, lowerPrefix) {
			result.MatchType = "name"
			result.Score = 1.0 / (1.0 + float64(len(result.Name)-len(filter.Prefix)))
		} else if displayName.Valid && strings.HasPrefix(lowerDisplayName, lowerPrefix) {
			result.MatchType = "name"
			result.Score = 0.9 / (1.0 + float64(len(displayName.String)-len(filter.Prefix)))
		} else {
			result.Score = 0.5
		}

		results = append(results, result)
	}

	return results, totalCount, nil
}

// searchAllByPrefix performs prefix search across all entity types
func (s *EnhancedSearchService) searchAllByPrefix(ctx context.Context, filter *PrefixSearchFilter) ([]PrefixSearchResult, int, error) {
	var allResults []PrefixSearchResult
	var totalCount int

	// Search documents
	docResults, docCount, err := s.searchDocumentsByPrefix(ctx, filter)
	if err == nil {
		allResults = append(allResults, docResults...)
		totalCount += docCount
	}

	// Search tasks
	taskResults, taskCount, err := s.searchTasksByPrefix(ctx, filter)
	if err == nil {
		allResults = append(allResults, taskResults...)
		totalCount += taskCount
	}

	// Search projects
	projectResults, projectCount, err := s.searchProjectsByPrefix(ctx, filter)
	if err == nil {
		allResults = append(allResults, projectResults...)
		totalCount += projectCount
	}

	// Search users
	userResults, userCount, err := s.searchUsersByPrefix(ctx, filter)
	if err == nil {
		allResults = append(allResults, userResults...)
		totalCount += userCount
	}

	// Sort by score (descending) and then by name
	// Implementation would sort allResults by Score field and then by Name

	// Apply limit to combined results
	if len(allResults) > filter.Limit {
		allResults = allResults[:filter.Limit]
	}

	return allResults, totalCount, nil
}
