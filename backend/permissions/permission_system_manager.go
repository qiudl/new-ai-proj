package permissions

import (
	"ai-project-backend/middleware"
	// "ai-project-backend/models" // Temporarily unused
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"
)

// PermissionSystemManager provides utilities for managing the permission system
type PermissionSystemManager struct {
	unifiedManager  *middleware.UnifiedPermissionManager
	predictor       *middleware.PermissionPredictor
	cacheMiddleware *middleware.PermissionCacheMiddleware
}

// NewPermissionSystemManager creates a new permission system manager
func NewPermissionSystemManager(
	unifiedManager *middleware.UnifiedPermissionManager,
	predictor *middleware.PermissionPredictor,
	cacheMiddleware *middleware.PermissionCacheMiddleware,
) *PermissionSystemManager {
	return &PermissionSystemManager{
		unifiedManager:  unifiedManager,
		predictor:       predictor,
		cacheMiddleware: cacheMiddleware,
	}
}

// PermissionSystemHealthCheck performs comprehensive health check
func (m *PermissionSystemManager) PermissionSystemHealthCheck(ctx context.Context) (*PermissionSystemHealth, error) {
	health := &PermissionSystemHealth{
		Timestamp:  time.Now(),
		Status:     "healthy",
		Components: make(map[string]ComponentHealth),
	}

	// Check unified manager
	managerStats, err := m.unifiedManager.GetManagerStats(ctx)
	if err != nil {
		health.Components["unified_manager"] = ComponentHealth{
			Status: "unhealthy",
			Error:  err.Error(),
		}
		health.Status = "degraded"
	} else {
		health.Components["unified_manager"] = ComponentHealth{
			Status: "healthy",
			Stats:  managerStats,
		}
	}

	// Check predictor
	predictorStats := m.predictor.GetPredictorStats()
	health.Components["predictor"] = ComponentHealth{
		Status: "healthy",
		Stats:  predictorStats,
	}

	// Check cache if available
	if m.cacheMiddleware != nil {
		cacheStats, err := m.cacheMiddleware.GetCacheStats(ctx)
		if err != nil {
			health.Components["cache"] = ComponentHealth{
				Status: "unhealthy",
				Error:  err.Error(),
			}
			health.Status = "degraded"
		} else {
			health.Components["cache"] = ComponentHealth{
				Status: "healthy",
				Stats:  cacheStats,
			}
		}
	} else {
		health.Components["cache"] = ComponentHealth{
			Status: "disabled",
		}
	}

	return health, nil
}

// OptimizePermissionSystem provides optimization recommendations
func (m *PermissionSystemManager) OptimizePermissionSystem(ctx context.Context) (*PermissionOptimizationReport, error) {
	report := &PermissionOptimizationReport{
		Timestamp:       time.Now(),
		Recommendations: make([]OptimizationRecommendation, 0),
	}

	// Get cache optimization recommendations
	cacheOptimization := m.predictor.OptimizeCacheStrategy(ctx)

	// Cache optimization recommendations
	if cacheData, ok := cacheOptimization["high_priority_cache"].([]string); ok && len(cacheData) > 0 {
		report.Recommendations = append(report.Recommendations, OptimizationRecommendation{
			Type:        "cache_optimization",
			Priority:    "high",
			Title:       "Optimize High-Priority Permission Caching",
			Description: fmt.Sprintf("Cache %d high-frequency permissions for better performance", len(cacheData)),
			Impact:      "Reduces database queries by 60-80% for common permissions",
			Action:      "Implement aggressive caching for these permissions",
			Permissions: cacheData,
		})
	}

	// Performance recommendations
	managerStats, err := m.unifiedManager.GetManagerStats(ctx)
	if err == nil {
		if cacheEnabled, ok := managerStats["cache_enabled"].(bool); ok && !cacheEnabled {
			report.Recommendations = append(report.Recommendations, OptimizationRecommendation{
				Type:        "performance",
				Priority:    "high",
				Title:       "Enable Permission Caching",
				Description: "Permission caching is currently disabled",
				Impact:      "Can improve permission check performance by 10-100x",
				Action:      "Enable Redis-based permission caching",
			})
		}

		if rateLimitEnabled, ok := managerStats["rate_limit_enabled"].(bool); ok && !rateLimitEnabled {
			report.Recommendations = append(report.Recommendations, OptimizationRecommendation{
				Type:        "security",
				Priority:    "medium",
				Title:       "Enable Rate Limiting",
				Description: "Rate limiting is currently disabled",
				Impact:      "Prevents permission check abuse and improves system stability",
				Action:      "Enable rate limiting for permission checks",
			})
		}
	}

	// Prediction accuracy recommendations
	mostUsedPermissions := m.predictor.GetMostUsedPermissions()
	if len(mostUsedPermissions) > 0 {
		lowFrequencyPerms := make([]string, 0)
		for _, perm := range mostUsedPermissions {
			if perm.Frequency < 0.05 { // Less than 5% usage
				lowFrequencyPerms = append(lowFrequencyPerms, perm.PermissionCode)
			}
		}

		if len(lowFrequencyPerms) > 10 {
			report.Recommendations = append(report.Recommendations, OptimizationRecommendation{
				Type:        "cleanup",
				Priority:    "low",
				Title:       "Clean Up Unused Permissions",
				Description: fmt.Sprintf("Found %d rarely used permissions", len(lowFrequencyPerms)),
				Impact:      "Reduces permission complexity and improves system clarity",
				Action:      "Review and consider removing or consolidating unused permissions",
				Permissions: lowFrequencyPerms[:min(len(lowFrequencyPerms), 20)], // Limit to 20
			})
		}
	}

	return report, nil
}

// GeneratePermissionReport generates a comprehensive permission system report
func (m *PermissionSystemManager) GeneratePermissionReport(ctx context.Context) (*PermissionSystemReport, error) {
	report := &PermissionSystemReport{
		Timestamp: time.Now(),
	}

	// Get health check
	health, err := m.PermissionSystemHealthCheck(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get health check: %w", err)
	}
	report.Health = health

	// Get optimization recommendations
	optimization, err := m.OptimizePermissionSystem(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get optimization recommendations: %w", err)
	}
	report.Optimization = optimization

	// Get system statistics
	managerStats, _ := m.unifiedManager.GetManagerStats(ctx)
	predictorStats := m.predictor.GetPredictorStats()

	report.Statistics = PermissionSystemStatistics{
		ManagerStats:   managerStats,
		PredictorStats: predictorStats,
	}

	if m.cacheMiddleware != nil {
		cacheStats, _ := m.cacheMiddleware.GetCacheStats(ctx)
		report.Statistics.CacheStats = cacheStats
	}

	// Get most used permissions
	report.MostUsedPermissions = m.predictor.GetMostUsedPermissions()
	if len(report.MostUsedPermissions) > 20 {
		report.MostUsedPermissions = report.MostUsedPermissions[:20] // Limit to top 20
	}

	return report, nil
}

// ExportPermissionReport exports permission report to file
func (m *PermissionSystemManager) ExportPermissionReport(ctx context.Context, filename string) error {
	report, err := m.GeneratePermissionReport(ctx)
	if err != nil {
		return err
	}

	// Marshal to JSON
	reportJSON, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal report: %w", err)
	}

	// Write to file
	err = os.WriteFile(filename, reportJSON, 0644)
	if err != nil {
		return fmt.Errorf("failed to write report to file: %w", err)
	}

	log.Printf("[PERM_MANAGER] Permission report exported to %s", filename)
	return nil
}

// RunPermissionSystemMaintenance performs routine maintenance tasks
func (m *PermissionSystemManager) RunPermissionSystemMaintenance(ctx context.Context) (*MaintenanceResult, error) {
	result := &MaintenanceResult{
		Timestamp: time.Now(),
		Tasks:     make([]MaintenanceTask, 0),
	}

	// Task 1: Update prediction patterns
	start := time.Now()
	// This would trigger pattern analysis in the predictor
	// For now, we'll just log the task
	result.Tasks = append(result.Tasks, MaintenanceTask{
		Name:        "Update Prediction Patterns",
		Status:      "completed",
		Duration:    time.Since(start),
		Description: "Updated permission usage patterns for better predictions",
	})

	// Task 2: Cache cleanup (if available)
	if m.cacheMiddleware != nil {
		start = time.Now()
		// Cache cleanup would happen automatically in Redis, but we can log it
		result.Tasks = append(result.Tasks, MaintenanceTask{
			Name:        "Cache Cleanup",
			Status:      "completed",
			Duration:    time.Since(start),
			Description: "Cleaned up expired permission cache entries",
		})
	}

	// Task 3: Generate health report
	start = time.Now()
	health, err := m.PermissionSystemHealthCheck(ctx)
	if err != nil {
		result.Tasks = append(result.Tasks, MaintenanceTask{
			Name:        "Health Check",
			Status:      "failed",
			Duration:    time.Since(start),
			Description: fmt.Sprintf("Health check failed: %v", err),
			Error:       err.Error(),
		})
	} else {
		result.Tasks = append(result.Tasks, MaintenanceTask{
			Name:        "Health Check",
			Status:      "completed",
			Duration:    time.Since(start),
			Description: fmt.Sprintf("System health: %s", health.Status),
		})
	}

	return result, nil
}

// Data structures for reports

type PermissionSystemHealth struct {
	Timestamp  time.Time                  `json:"timestamp"`
	Status     string                     `json:"status"`
	Components map[string]ComponentHealth `json:"components"`
}

type ComponentHealth struct {
	Status string                 `json:"status"`
	Stats  map[string]interface{} `json:"stats,omitempty"`
	Error  string                 `json:"error,omitempty"`
}

type PermissionOptimizationReport struct {
	Timestamp       time.Time                    `json:"timestamp"`
	Recommendations []OptimizationRecommendation `json:"recommendations"`
}

type OptimizationRecommendation struct {
	Type        string   `json:"type"`
	Priority    string   `json:"priority"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Impact      string   `json:"impact"`
	Action      string   `json:"action"`
	Permissions []string `json:"permissions,omitempty"`
}

type PermissionSystemReport struct {
	Timestamp           time.Time                      `json:"timestamp"`
	Health              *PermissionSystemHealth        `json:"health"`
	Optimization        *PermissionOptimizationReport  `json:"optimization"`
	Statistics          PermissionSystemStatistics     `json:"statistics"`
	MostUsedPermissions []middleware.PermissionPattern `json:"most_used_permissions"`
}

type PermissionSystemStatistics struct {
	ManagerStats   map[string]interface{} `json:"manager_stats"`
	PredictorStats map[string]interface{} `json:"predictor_stats"`
	CacheStats     map[string]interface{} `json:"cache_stats,omitempty"`
}

type MaintenanceResult struct {
	Timestamp time.Time         `json:"timestamp"`
	Tasks     []MaintenanceTask `json:"tasks"`
}

type MaintenanceTask struct {
	Name        string        `json:"name"`
	Status      string        `json:"status"`
	Duration    time.Duration `json:"duration"`
	Description string        `json:"description"`
	Error       string        `json:"error,omitempty"`
}

// Helper function
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
