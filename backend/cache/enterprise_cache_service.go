package cache

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"fmt"
	"log"
	"time"
)

// CacheableEnterpriseService provides cached enterprise operations
type CacheableEnterpriseService struct {
	repo         database.EnterpriseRepository
	cache        *EnterpriseCacheManager
	enableCache  bool
	writeThrough bool // Write to cache immediately after DB operations
}

// CacheableEnterpriseServiceConfig configures the cacheable enterprise service
type CacheableEnterpriseServiceConfig struct {
	Repository   database.EnterpriseRepository
	CacheManager *EnterpriseCacheManager
	EnableCache  bool
	WriteThrough bool
}

// NewCacheableEnterpriseService creates a new cacheable enterprise service
func NewCacheableEnterpriseService(config *CacheableEnterpriseServiceConfig) *CacheableEnterpriseService {
	return &CacheableEnterpriseService{
		repo:         config.Repository,
		cache:        config.CacheManager,
		enableCache:  config.EnableCache,
		writeThrough: config.WriteThrough,
	}
}

// Enterprise Operations with Caching

// GetByID retrieves enterprise by ID with caching
func (s *CacheableEnterpriseService) GetByID(ctx context.Context, id int) (*models.Enterprise, error) {
	// Try cache first if enabled
	if s.enableCache {
		if enterprise, found := s.cache.GetEnterprise(ctx, id); found {
			log.Printf("[ENTERPRISE_CACHE_SERVICE] Cache hit for enterprise %d", id)
			return enterprise, nil
		}
		log.Printf("[ENTERPRISE_CACHE_SERVICE] Cache miss for enterprise %d", id)
	}
	
	// Fetch from database
	enterprise, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	
	// Cache the result if write-through is enabled
	if s.enableCache && s.writeThrough && enterprise != nil {
		if err := s.cache.SetEnterprise(ctx, enterprise); err != nil {
			log.Printf("[ENTERPRISE_CACHE_SERVICE] Failed to cache enterprise %d: %v", id, err)
		}
	}
	
	return enterprise, nil
}

// List retrieves enterprises with caching support
func (s *CacheableEnterpriseService) List(ctx context.Context, limit, offset int, filters map[string]interface{}) ([]*models.Enterprise, int, error) {
	// For simplicity, we don't cache list operations with complex filters
	// In production, you might want to implement cache key generation for common filter combinations
	enterprises, total, err := s.repo.List(ctx, limit, offset, filters)
	if err != nil {
		return nil, 0, err
	}
	
	// Optionally cache individual enterprises from the list
	if s.enableCache && s.writeThrough {
		for _, enterprise := range enterprises {
			if err := s.cache.SetEnterprise(ctx, enterprise); err != nil {
				log.Printf("[ENTERPRISE_CACHE_SERVICE] Failed to cache enterprise %d from list: %v", enterprise.ID, err)
			}
		}
	}
	
	return enterprises, total, nil
}

// Create creates a new enterprise with cache invalidation
func (s *CacheableEnterpriseService) Create(ctx context.Context, enterprise *models.Enterprise) (*models.Enterprise, error) {
	// Create in database
	createdEnterprise, err := s.repo.Create(ctx, enterprise)
	if err != nil {
		return nil, err
	}
	
	// Cache the new enterprise if write-through is enabled
	if s.enableCache && s.writeThrough && createdEnterprise != nil {
		if err := s.cache.SetEnterprise(ctx, createdEnterprise); err != nil {
			log.Printf("[ENTERPRISE_CACHE_SERVICE] Failed to cache new enterprise %d: %v", createdEnterprise.ID, err)
		}
	}
	
	return createdEnterprise, nil
}

// Update updates an enterprise with cache invalidation
func (s *CacheableEnterpriseService) Update(ctx context.Context, enterprise *models.Enterprise) (*models.Enterprise, error) {
	// Update in database
	updatedEnterprise, err := s.repo.Update(ctx, enterprise)
	if err != nil {
		return nil, err
	}
	
	// Invalidate cache and optionally re-cache
	if s.enableCache && updatedEnterprise != nil {
		if err := s.cache.InvalidateEnterprise(ctx, updatedEnterprise.ID); err != nil {
			log.Printf("[ENTERPRISE_CACHE_SERVICE] Failed to invalidate enterprise cache %d: %v", updatedEnterprise.ID, err)
		}
		
		// Re-cache if write-through is enabled
		if s.writeThrough {
			if err := s.cache.SetEnterprise(ctx, updatedEnterprise); err != nil {
				log.Printf("[ENTERPRISE_CACHE_SERVICE] Failed to re-cache updated enterprise %d: %v", updatedEnterprise.ID, err)
			}
		}
	}
	
	return updatedEnterprise, nil
}

// Delete deletes an enterprise with cache invalidation
func (s *CacheableEnterpriseService) Delete(ctx context.Context, id int) error {
	// Delete from database
	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}
	
	// Invalidate cache
	if s.enableCache {
		if err := s.cache.InvalidateEnterprise(ctx, id); err != nil {
			log.Printf("[ENTERPRISE_CACHE_SERVICE] Failed to invalidate enterprise cache %d: %v", id, err)
		}
	}
	
	return nil
}

// Enterprise User Operations with Caching

// GetUsers retrieves enterprise users with caching
func (s *CacheableEnterpriseService) GetUsers(ctx context.Context, enterpriseID int, limit, offset int) ([]*models.EnterpriseUser, int, error) {
	// Try cache first if enabled
	if s.enableCache {
		if users, found := s.cache.GetEnterpriseUsers(ctx, enterpriseID, limit, offset); found {
			log.Printf("[ENTERPRISE_CACHE_SERVICE] Cache hit for enterprise users %d (limit=%d, offset=%d)", enterpriseID, limit, offset)
			// For total count, we need to call the repository (or cache it separately)
			// This is a simplified version - in production you might want to cache the total separately
			_, total, err := s.repo.GetUsers(ctx, enterpriseID, 1, 0) // Get total count
			return users, total, err
		}
		log.Printf("[ENTERPRISE_CACHE_SERVICE] Cache miss for enterprise users %d", enterpriseID)
	}
	
	// Fetch from database
	users, total, err := s.repo.GetUsers(ctx, enterpriseID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	
	// Cache the result if write-through is enabled
	if s.enableCache && s.writeThrough && users != nil {
		if err := s.cache.SetEnterpriseUsers(ctx, enterpriseID, limit, offset, users); err != nil {
			log.Printf("[ENTERPRISE_CACHE_SERVICE] Failed to cache enterprise users %d: %v", enterpriseID, err)
		}
	}
	
	return users, total, nil
}

// CreateUser creates a new enterprise user with cache invalidation
func (s *CacheableEnterpriseService) CreateUser(ctx context.Context, user *models.EnterpriseUser) (*models.EnterpriseUser, error) {
	// Create in database
	createdUser, err := s.repo.CreateUser(ctx, user)
	if err != nil {
		return nil, err
	}
	
	// Invalidate enterprise users cache
	if s.enableCache && createdUser != nil {
		if err := s.cache.InvalidateEnterpriseUsers(ctx, createdUser.EnterpriseID); err != nil {
			log.Printf("[ENTERPRISE_CACHE_SERVICE] Failed to invalidate enterprise users cache %d: %v", createdUser.EnterpriseID, err)
		}
		
		// Also invalidate enterprise statistics (user count will change)
		s.invalidateEnterpriseStats(ctx, createdUser.EnterpriseID)
	}
	
	return createdUser, nil
}

// UpdateUser updates an enterprise user with cache invalidation
func (s *CacheableEnterpriseService) UpdateUser(ctx context.Context, user *models.EnterpriseUser) (*models.EnterpriseUser, error) {
	// Update in database
	updatedUser, err := s.repo.UpdateUser(ctx, user)
	if err != nil {
		return nil, err
	}
	
	// Invalidate enterprise users cache
	if s.enableCache && updatedUser != nil {
		if err := s.cache.InvalidateEnterpriseUsers(ctx, updatedUser.EnterpriseID); err != nil {
			log.Printf("[ENTERPRISE_CACHE_SERVICE] Failed to invalidate enterprise users cache %d: %v", updatedUser.EnterpriseID, err)
		}
	}
	
	return updatedUser, nil
}

// DeleteUser deletes an enterprise user with cache invalidation
func (s *CacheableEnterpriseService) DeleteUser(ctx context.Context, userID int) error {
	// First get the user to know which enterprise to invalidate
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return err
	}
	
	// Delete from database
	if err := s.repo.DeleteUser(ctx, userID); err != nil {
		return err
	}
	
	// Invalidate cache
	if s.enableCache && user != nil {
		if err := s.cache.InvalidateEnterpriseUsers(ctx, user.EnterpriseID); err != nil {
			log.Printf("[ENTERPRISE_CACHE_SERVICE] Failed to invalidate enterprise users cache %d: %v", user.EnterpriseID, err)
		}
		
		// Also invalidate enterprise statistics (user count will change)
		s.invalidateEnterpriseStats(ctx, user.EnterpriseID)
	}
	
	return nil
}

// Statistics Operations with Caching

// GetEnterpriseStatistics retrieves enterprise statistics with caching
func (s *CacheableEnterpriseService) GetEnterpriseStatistics(ctx context.Context, enterpriseID int) (*EnterpriseStatistics, error) {
	// Try cache first if enabled
	if s.enableCache {
		if stats, found := s.cache.GetEnterpriseStatistics(ctx, enterpriseID); found {
			log.Printf("[ENTERPRISE_CACHE_SERVICE] Cache hit for enterprise statistics %d", enterpriseID)
			return stats, nil
		}
		log.Printf("[ENTERPRISE_CACHE_SERVICE] Cache miss for enterprise statistics %d", enterpriseID)
	}
	
	// Fetch from database
	userCount, departmentCount, err := s.repo.GetEnterpriseStatistics(ctx, enterpriseID)
	if err != nil {
		return nil, err
	}
	
	// Get additional statistics (active counts)
	// This could be expanded to include more detailed statistics
	stats := &EnterpriseStatistics{
		UserCount:         userCount,
		DepartmentCount:   departmentCount,
		ActiveUsers:       userCount, // Simplified - could query for active users only
		ActiveDepartments: departmentCount, // Simplified - could query for active departments only
		LastUpdated:       time.Now(),
	}
	
	// Cache the result if write-through is enabled
	if s.enableCache && s.writeThrough {
		if err := s.cache.SetEnterpriseStatistics(ctx, enterpriseID, stats); err != nil {
			log.Printf("[ENTERPRISE_CACHE_SERVICE] Failed to cache enterprise statistics %d: %v", enterpriseID, err)
		}
	}
	
	return stats, nil
}

// RefreshEnterpriseStatistics forces a refresh of enterprise statistics cache
func (s *CacheableEnterpriseService) RefreshEnterpriseStatistics(ctx context.Context, enterpriseID int) error {
	if !s.enableCache {
		return nil
	}
	
	// Invalidate current cache
	s.invalidateEnterpriseStats(ctx, enterpriseID)
	
	// Fetch fresh data
	_, err := s.GetEnterpriseStatistics(ctx, enterpriseID)
	return err
}

// Cache Management Operations

// InvalidateEnterpriseCache invalidates all cache data for a specific enterprise
func (s *CacheableEnterpriseService) InvalidateEnterpriseCache(ctx context.Context, enterpriseID int) error {
	if !s.enableCache {
		return nil
	}
	
	// Invalidate enterprise data
	if err := s.cache.InvalidateEnterprise(ctx, enterpriseID); err != nil {
		log.Printf("[ENTERPRISE_CACHE_SERVICE] Failed to invalidate enterprise cache %d: %v", enterpriseID, err)
		return err
	}
	
	// Invalidate enterprise users
	if err := s.cache.InvalidateEnterpriseUsers(ctx, enterpriseID); err != nil {
		log.Printf("[ENTERPRISE_CACHE_SERVICE] Failed to invalidate enterprise users cache %d: %v", enterpriseID, err)
		return err
	}
	
	// Invalidate enterprise statistics
	s.invalidateEnterpriseStats(ctx, enterpriseID)
	
	return nil
}

// WarmUpCache pre-loads frequently accessed data into cache
func (s *CacheableEnterpriseService) WarmUpCache(ctx context.Context, enterpriseIDs []int) error {
	if !s.enableCache {
		return nil
	}
	
	for _, enterpriseID := range enterpriseIDs {
		// Pre-load enterprise data
		if _, err := s.GetByID(ctx, enterpriseID); err != nil {
			log.Printf("[ENTERPRISE_CACHE_SERVICE] Failed to warm up enterprise cache %d: %v", enterpriseID, err)
		}
		
		// Pre-load enterprise statistics
		if _, err := s.GetEnterpriseStatistics(ctx, enterpriseID); err != nil {
			log.Printf("[ENTERPRISE_CACHE_SERVICE] Failed to warm up enterprise stats cache %d: %v", enterpriseID, err)
		}
		
		// Pre-load enterprise users (first page)
		if _, _, err := s.GetUsers(ctx, enterpriseID, 20, 0); err != nil {
			log.Printf("[ENTERPRISE_CACHE_SERVICE] Failed to warm up enterprise users cache %d: %v", enterpriseID, err)
		}
	}
	
	return nil
}

// GetCacheMetrics returns cache performance metrics
func (s *CacheableEnterpriseService) GetCacheMetrics() *CacheMetrics {
	if !s.enableCache {
		return nil
	}
	
	return s.cache.GetMetrics()
}

// GetCacheHitRatio returns cache hit ratios
func (s *CacheableEnterpriseService) GetCacheHitRatio() map[string]float64 {
	if !s.enableCache {
		return make(map[string]float64)
	}
	
	return s.cache.GetHitRatio()
}

// Helper methods

func (s *CacheableEnterpriseService) invalidateEnterpriseStats(ctx context.Context, enterpriseID int) {
	// Use a separate goroutine for non-critical cache invalidation
	go func() {
		statsCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		
		// Create a temporary stats key for invalidation
		key := fmt.Sprintf("enterprise_stats:%d", enterpriseID)
		if s.cache.memory != nil {
			s.cache.deleteFromMemory(key)
		}
		if s.cache.redis != nil {
			s.cache.deleteFromRedis(statsCtx, key)
		}
	}()
}

// Enterprise Response Helper with Statistics

// GetEnterpriseWithStats retrieves enterprise data with statistics for response
func (s *CacheableEnterpriseService) GetEnterpriseWithStats(ctx context.Context, enterpriseID int) (*models.EnterpriseResponse, error) {
	// Get basic enterprise data
	enterprise, err := s.GetByID(ctx, enterpriseID)
	if err != nil {
		return nil, err
	}
	
	if enterprise == nil {
		return nil, fmt.Errorf("enterprise not found")
	}
	
	// Convert to response format
	response := enterprise.ToResponse()
	
	// Get statistics
	stats, err := s.GetEnterpriseStatistics(ctx, enterpriseID)
	if err != nil {
		log.Printf("[ENTERPRISE_CACHE_SERVICE] Failed to get statistics for enterprise %d: %v", enterpriseID, err)
		// Continue without statistics rather than failing the entire request
		stats = &EnterpriseStatistics{}
	}
	
	// Add statistics to response
	response.UserCount = stats.UserCount
	response.DepartmentCount = stats.DepartmentCount
	
	return &response, nil
}

// BatchGetEnterprisesWithStats retrieves multiple enterprises with statistics
func (s *CacheableEnterpriseService) BatchGetEnterprisesWithStats(ctx context.Context, enterpriseIDs []int) ([]*models.EnterpriseResponse, error) {
	responses := make([]*models.EnterpriseResponse, 0, len(enterpriseIDs))
	
	for _, enterpriseID := range enterpriseIDs {
		response, err := s.GetEnterpriseWithStats(ctx, enterpriseID)
		if err != nil {
			log.Printf("[ENTERPRISE_CACHE_SERVICE] Failed to get enterprise with stats %d: %v", enterpriseID, err)
			continue // Skip failed enterprises rather than failing the entire batch
		}
		responses = append(responses, response)
	}
	
	return responses, nil
}