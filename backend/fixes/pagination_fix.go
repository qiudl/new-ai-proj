package fixes

// This file contains fixes for the pagination issue causing divide by zero errors

import (
	"ai-project-backend/models"
)

// SetPaginationDefaults sets default values for pagination parameters
func SetPaginationDefaults(pagination *models.PaginationParams) {
	if pagination.Page <= 0 {
		pagination.Page = 1
	}
	if pagination.PageSize <= 0 {
		pagination.PageSize = 20 // Default page size
	}
	// Ensure page size is not too large
	if pagination.PageSize > 100 {
		pagination.PageSize = 100
	}
}

// CalculateTotalPages safely calculates total pages avoiding divide by zero
func CalculateTotalPages(total int, pageSize int) int {
	if pageSize <= 0 {
		return 0
	}
	return (total + pageSize - 1) / pageSize
}
