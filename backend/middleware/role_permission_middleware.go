package middleware

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/patrickmn/go-cache"
)

// RolePermissionMiddleware 角色权限验证中间件
// 提供基于角色的细粒度权限控制和缓存优化
type RolePermissionMiddleware struct {
	permissionRepo database.PermissionRepository
	cache          *cache.Cache
	cacheTTL       time.Duration
	mu             sync.RWMutex
	stats          RolePermissionStats
}

// RolePermissionStats 角色权限统计信息
type RolePermissionStats struct {
	TotalChecks    int64     `json:"total_checks"`
	CacheHits      int64     `json:"cache_hits"`
	CacheMisses    int64     `json:"cache_misses"`
	SuccessCount   int64     `json:"success_count"`
	FailureCount   int64     `json:"failure_count"`
	LastReset      time.Time `json:"last_reset"`
	AvgCheckTime   float64   `json:"avg_check_time_ms"`
	totalCheckTime time.Duration
}

// RoleContext 角色上下文信息
type RoleContext struct {
	UserID          int                    `json:"user_id"`
	CompanyUserID   int                    `json:"company_user_id"`
	RoleCode        string                 `json:"role_code"`
	RoleName        string                 `json:"role_name"`
	RoleLevel       int                    `json:"role_level"`
	IsSystemRole    bool                   `json:"is_system_role"`
	Permissions     []string               `json:"permissions"`
	CustomFields    map[string]interface{} `json:"custom_fields,omitempty"`
	CacheHit        bool                   `json:"cache_hit,omitempty"`
	CheckTime       time.Duration          `json:"check_time,omitempty"`
}

// RolePermissionConfig 角色权限配置
type RolePermissionConfig struct {
	CacheTTL           time.Duration `json:"cache_ttl"`
	EnableCache        bool          `json:"enable_cache"`
	EnableHierarchy    bool          `json:"enable_hierarchy"`
	EnableStats        bool          `json:"enable_stats"`
	StrictMode         bool          `json:"strict_mode"`
	SuperAdminBypass   bool          `json:"superadmin_bypass"`
	RoleHierarchyCheck bool          `json:"role_hierarchy_check"`
}

// NewRolePermissionMiddleware 创建新的角色权限中间件
func NewRolePermissionMiddleware(
	permissionRepo database.PermissionRepository,
	config *RolePermissionConfig,
) *RolePermissionMiddleware {
	if config == nil {
		config = &RolePermissionConfig{
			CacheTTL:           15 * time.Minute,
			EnableCache:        true,
			EnableHierarchy:    true,
			EnableStats:        true,
			StrictMode:         false,
			SuperAdminBypass:   true,
			RoleHierarchyCheck: true,
		}
	}

	var roleCache *cache.Cache
	if config.EnableCache {
		roleCache = cache.New(config.CacheTTL, config.CacheTTL*2)
	}

	return &RolePermissionMiddleware{
		permissionRepo: permissionRepo,
		cache:          roleCache,
		cacheTTL:       config.CacheTTL,
		stats: RolePermissionStats{
			LastReset: time.Now(),
		},
	}
}

// RequireSystemRole 要求特定系统角色
func (m *RolePermissionMiddleware) RequireSystemRole(roleCode string) gin.HandlerFunc {
	return m.RequireRoleWithConfig(RoleRequirement{
		RoleCode:     roleCode,
		IsSystemRole: true,
		StrictMatch:  true,
	})
}

// RequireMinimumRoleLevel 要求最低角色级别
func (m *RolePermissionMiddleware) RequireMinimumRoleLevel(minLevel int) gin.HandlerFunc {
	return m.RequireRoleWithConfig(RoleRequirement{
		MinimumLevel:    minLevel,
		UseHierarchy:    true,
		AllowHigherRole: true,
	})
}

// RequireAnySystemRole 要求任意系统角色
func (m *RolePermissionMiddleware) RequireAnySystemRole(roleCodes ...string) gin.HandlerFunc {
	return m.RequireRoleWithConfig(RoleRequirement{
		RoleCodes:    roleCodes,
		IsSystemRole: true,
		MatchAny:     true,
	})
}

// RequireRoleWithPermissions 要求角色并验证特定权限
func (m *RolePermissionMiddleware) RequireRoleWithPermissions(roleCode string, permissions []string) gin.HandlerFunc {
	return m.RequireRoleWithConfig(RoleRequirement{
		RoleCode:             roleCode,
		RequiredPermissions:  permissions,
		ValidatePermissions:  true,
		StrictPermissionMode: true,
	})
}

// RoleRequirement 角色需求配置
type RoleRequirement struct {
	// 单个角色
	RoleCode string `json:"role_code"`
	
	// 多个角色（任选一）
	RoleCodes []string `json:"role_codes"`
	
	// 角色级别要求
	MinimumLevel    int  `json:"minimum_level"`
	MaximumLevel    int  `json:"maximum_level"`
	UseHierarchy    bool `json:"use_hierarchy"`
	AllowHigherRole bool `json:"allow_higher_role"`
	
	// 权限验证
	RequiredPermissions  []string `json:"required_permissions"`
	ValidatePermissions  bool     `json:"validate_permissions"`
	StrictPermissionMode bool     `json:"strict_permission_mode"`
	
	// 匹配模式
	MatchAny     bool `json:"match_any"`
	StrictMatch  bool `json:"strict_match"`
	IsSystemRole bool `json:"is_system_role"`
	
	// 自定义验证
	CustomValidator func(ctx *RoleContext) bool `json:"-"`
	
	// 错误响应自定义
	ErrorMessage    string `json:"error_message"`
	ErrorStatusCode int    `json:"error_status_code"`
}

// RequireRoleWithConfig 使用配置要求角色
func (m *RolePermissionMiddleware) RequireRoleWithConfig(req RoleRequirement) gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()
		ctx := c.Request.Context()
		
		// 更新统计
		m.updateStats(func(stats *RolePermissionStats) {
			stats.TotalChecks++
		})

		// 超级管理员检查
		if req.IsSystemRole && isSuperAdminCtx(c) {
			roleCtx := &RoleContext{
				RoleCode:      models.RoleCodeSuperAdmin,
				RoleName:      "超级管理员",
				RoleLevel:     1,
				IsSystemRole:  true,
				Permissions:   []string{"ALL_PERMISSIONS"},
				CustomFields:  map[string]interface{}{"superadmin_bypass": true},
				CheckTime:     time.Since(startTime),
			}
			c.Set("role_context", roleCtx)
			c.Next()
			return
		}

		// 获取用户角色上下文
		roleCtx, err := m.getRoleContext(ctx, c)
		if err != nil {
			m.handleRoleError(c, req, fmt.Sprintf("Failed to get role context: %v", err))
			return
		}

		// 验证角色需求
		if !m.validateRoleRequirement(roleCtx, req) {
			m.handleRoleError(c, req, "Role requirement not satisfied")
			return
		}

		// 更新成功统计
		m.updateStats(func(stats *RolePermissionStats) {
			stats.SuccessCount++
			stats.totalCheckTime += time.Since(startTime)
			stats.AvgCheckTime = float64(stats.totalCheckTime.Nanoseconds()) / float64(stats.TotalChecks) / 1000000
		})

		// 设置角色上下文并继续
		roleCtx.CheckTime = time.Since(startTime)
		c.Set("role_context", roleCtx)
		c.Next()
	}
}
// getRoleContext 获取用户角色上下文
func (m *RolePermissionMiddleware) getRoleContext(ctx context.Context, c *gin.Context) (*RoleContext, error) {
	// 获取company_user_id
	companyUserIDInterface, exists := c.Get("company_user_id")
	if !exists {
		return nil, fmt.Errorf("company user ID not found in context")
	}

	companyUserID, ok := companyUserIDInterface.(int)
	if !ok {
		return nil, fmt.Errorf("invalid company user ID type")
	}

	// 尝试从缓存获取
	cacheKey := fmt.Sprintf("role_context_%d", companyUserID)
	if m.cache != nil {
		if cached, found := m.cache.Get(cacheKey); found {
			if roleCtx, ok := cached.(*RoleContext); ok {
				roleCtx.CacheHit = true
				m.updateStats(func(stats *RolePermissionStats) {
					stats.CacheHits++
				})
				return roleCtx, nil
			}
		}
	}

	// 从数据库获取用户权限
	userPermissions, err := m.permissionRepo.GetUserPermissions(ctx, companyUserID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user permissions: %w", err)
	}

	// 构建角色上下文
	roleCtx := &RoleContext{
		CompanyUserID: companyUserID,
		Permissions:   make([]string, 0),
		CustomFields:  make(map[string]interface{}),
		CacheHit:      false,
	}

	// 获取用户ID
	if userID, exists := c.Get("user_id"); exists {
		if id, ok := userID.(int); ok {
			roleCtx.UserID = id
		}
	}

	// 设置角色信息
	if userPermissions.Role != nil {
		roleCtx.RoleCode = userPermissions.Role.RoleCode
		roleCtx.RoleName = userPermissions.Role.RoleName
		roleCtx.IsSystemRole = models.IsSystemRole(roleCtx.RoleCode)
		roleCtx.RoleLevel = models.GetSystemRoleLevel(roleCtx.RoleCode)
	}

	// 收集权限列表
	for _, perm := range userPermissions.EffectivePermissions {
		roleCtx.Permissions = append(roleCtx.Permissions, perm.PermissionCode)
	}

	// 添加系统角色权限
	if roleCtx.IsSystemRole {
		if systemPerms, exists := models.SystemRolePermissionLevels[roleCtx.RoleCode]; exists {
			for _, perm := range systemPerms {
				if !contains(roleCtx.Permissions, perm) {
					roleCtx.Permissions = append(roleCtx.Permissions, perm)
				}
			}
		}
	}

	// 缓存结果
	if m.cache != nil {
		m.cache.Set(cacheKey, roleCtx, m.cacheTTL)
		m.updateStats(func(stats *RolePermissionStats) {
			stats.CacheMisses++
		})
	}

	return roleCtx, nil
}

// validateRoleRequirement 验证角色需求
func (m *RolePermissionMiddleware) validateRoleRequirement(roleCtx *RoleContext, req RoleRequirement) bool {
	// 自定义验证器优先
	if req.CustomValidator != nil {
		return req.CustomValidator(roleCtx)
	}

	// 单个角色验证
	if req.RoleCode != "" {
		if req.StrictMatch {
			return roleCtx.RoleCode == req.RoleCode
		}
		// 层级验证
		if req.UseHierarchy && req.AllowHigherRole {
			return models.CanAccessRole(roleCtx.RoleCode, req.RoleCode)
		}
		return roleCtx.RoleCode == req.RoleCode
	}

	// 多角色验证
	if len(req.RoleCodes) > 0 {
		hasRole := false
		for _, code := range req.RoleCodes {
			if req.StrictMatch {
				if roleCtx.RoleCode == code {
					hasRole = true
					break
				}
			} else if req.UseHierarchy && req.AllowHigherRole {
				if models.CanAccessRole(roleCtx.RoleCode, code) {
					hasRole = true
					break
				}
			} else {
				if roleCtx.RoleCode == code {
					hasRole = true
					break
				}
			}
		}
		if req.MatchAny && hasRole {
			return m.validateAdditionalRequirements(roleCtx, req)
		}
		if !req.MatchAny && !hasRole {
			return false
		}
	}

	// 角色级别验证
	if req.MinimumLevel > 0 || req.MaximumLevel > 0 {
		if req.MinimumLevel > 0 && roleCtx.RoleLevel > req.MinimumLevel {
			return false
		}
		if req.MaximumLevel > 0 && roleCtx.RoleLevel < req.MaximumLevel {
			return false
		}
	}

	// 系统角色验证
	if req.IsSystemRole && !roleCtx.IsSystemRole {
		return false
	}

	return m.validateAdditionalRequirements(roleCtx, req)
}

// validateAdditionalRequirements 验证附加需求
func (m *RolePermissionMiddleware) validateAdditionalRequirements(roleCtx *RoleContext, req RoleRequirement) bool {
	// 权限验证
	if req.ValidatePermissions && len(req.RequiredPermissions) > 0 {
		if roleCtx.RoleCode == models.RoleCodeSuperAdmin {
			return true // 超级管理员拥有所有权限
		}

		for _, requiredPerm := range req.RequiredPermissions {
			hasPermission := false
			
			// 检查精确匹配
			if contains(roleCtx.Permissions, requiredPerm) {
				hasPermission = true
			} else if !req.StrictPermissionMode {
				// 检查通配符匹配
				for _, userPerm := range roleCtx.Permissions {
					if matchesWildcard(userPerm, requiredPerm) {
						hasPermission = true
						break
					}
				}
			}

			if !hasPermission {
				return false
			}
		}
	}

	return true
}

// handleRoleError 处理角色验证错误
func (m *RolePermissionMiddleware) handleRoleError(c *gin.Context, req RoleRequirement, defaultMessage string) {
	m.updateStats(func(stats *RolePermissionStats) {
		stats.FailureCount++
	})

	statusCode := http.StatusForbidden
	if req.ErrorStatusCode > 0 {
		statusCode = req.ErrorStatusCode
	}

	message := defaultMessage
	if req.ErrorMessage != "" {
		message = req.ErrorMessage
	}

	c.JSON(statusCode, gin.H{
		"error":  "Role permission denied",
		"reason": message,
	})
	c.Abort()
}

// updateStats 线程安全的统计更新
func (m *RolePermissionMiddleware) updateStats(updater func(*RolePermissionStats)) {
	m.mu.Lock()
	defer m.mu.Unlock()
	updater(&m.stats)
}

// GetStats 获取统计信息
func (m *RolePermissionMiddleware) GetStats() RolePermissionStats {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.stats
}

// ResetStats 重置统计信息
func (m *RolePermissionMiddleware) ResetStats() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.stats = RolePermissionStats{
		LastReset: time.Now(),
	}
}

// ClearCache 清空缓存
func (m *RolePermissionMiddleware) ClearCache() {
	if m.cache != nil {
		m.cache.Flush()
	}
}

// 辅助函数

// contains 检查切片是否包含元素
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// matchesWildcard 检查通配符匹配
func matchesWildcard(pattern, text string) bool {
	// 简单通配符实现：支持 * 匹配
	if pattern == "*" {
		return true
	}
	
	if strings.HasSuffix(pattern, "*") {
		prefix := strings.TrimSuffix(pattern, "*")
		return strings.HasPrefix(text, prefix)
	}
	
	if strings.HasPrefix(pattern, "*") {
		suffix := strings.TrimPrefix(pattern, "*")
		return strings.HasSuffix(text, suffix)
	}
	
	// 中间通配符处理
	if strings.Contains(pattern, "*") {
		parts := strings.Split(pattern, "*")
		if len(parts) == 2 {
			return strings.HasPrefix(text, parts[0]) && strings.HasSuffix(text, parts[1])
		}
	}
	
	return pattern == text
}
// ==================== 便捷的角色验证方法 ====================

// RequireCompanyAdmin 要求公司管理员角色
func (m *RolePermissionMiddleware) RequireCompanyAdmin() gin.HandlerFunc {
	return m.RequireSystemRole("company_admin")
}

// RequireProjectManager 要求项目经理或更高权限
func (m *RolePermissionMiddleware) RequireProjectManager() gin.HandlerFunc {
	return m.RequireRoleWithConfig(RoleRequirement{
		RoleCodes:       []string{"project_manager", "company_admin", "system_admin", "superadmin"},
		MatchAny:        true,
		UseHierarchy:    true,
		AllowHigherRole: true,
	})
}

// RequireTeamLead 要求团队负责人或更高权限
func (m *RolePermissionMiddleware) RequireTeamLead() gin.HandlerFunc {
	return m.RequireMinimumRoleLevel(4) // 假设团队负责人级别为4
}

// RequireTaskAssignee 要求任务分配权限
func (m *RolePermissionMiddleware) RequireTaskAssignee() gin.HandlerFunc {
	return m.RequireRoleWithPermissions("", []string{"task.assign", "task.update"})
}

// RequireFinanceAccess 要求财务访问权限
func (m *RolePermissionMiddleware) RequireFinanceAccess() gin.HandlerFunc {
	return m.RequireRoleWithConfig(RoleRequirement{
		RequiredPermissions:  []string{"finance.contracts.read"},
		ValidatePermissions:  true,
		StrictPermissionMode: false,
		ErrorMessage:        "Access to financial data requires proper authorization",
	})
}

// RequireSystemOperatorPlus 要求系统操作员及以上权限
func (m *RolePermissionMiddleware) RequireSystemOperatorPlus() gin.HandlerFunc {
	return m.RequireRoleWithConfig(RoleRequirement{
		RoleCodes:       []string{models.RoleCodeSystemOperator, models.RoleCodeSystemAdmin, models.RoleCodeSuperAdmin},
		MatchAny:        true,
		IsSystemRole:    true,
		UseHierarchy:    true,
		AllowHigherRole: true,
	})
}

// RequireAuditAccess 要求审计访问权限
func (m *RolePermissionMiddleware) RequireAuditAccess() gin.HandlerFunc {
	return m.RequireRoleWithConfig(RoleRequirement{
		RoleCodes: []string{
			models.RoleCodeSystemAuditor,
			models.RoleCodeSystemAdmin,
			models.RoleCodeSuperAdmin,
		},
		MatchAny:            true,
		IsSystemRole:        true,
		RequiredPermissions: []string{"system.audit.read"},
		ValidatePermissions: true,
	})
}

// ==================== 高级验证方法 ====================

// RequireRoleWithContext 根据上下文要求角色
func (m *RolePermissionMiddleware) RequireRoleWithContext(
	contextChecker func(*gin.Context) RoleRequirement,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		req := contextChecker(c)
		handler := m.RequireRoleWithConfig(req)
		handler(c)
	}
}

// RequireConditionalRole 条件角色验证
func (m *RolePermissionMiddleware) RequireConditionalRole(
	condition func(*gin.Context) bool,
	trueReq RoleRequirement,
	falseReq RoleRequirement,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req RoleRequirement
		if condition(c) {
			req = trueReq
		} else {
			req = falseReq
		}
		handler := m.RequireRoleWithConfig(req)
		handler(c)
	}
}

// RequireResourceOwnershipOrRole 要求资源所有权或特定角色
func (m *RolePermissionMiddleware) RequireResourceOwnershipOrRole(
	resourceType string,
	adminRoles []string,
) gin.HandlerFunc {
	return m.RequireRoleWithConfig(RoleRequirement{
		CustomValidator: func(ctx *RoleContext) bool {
			// 检查管理员角色
			for _, role := range adminRoles {
				if ctx.RoleCode == role {
					return true
				}
			}
			
			// 这里可以扩展实现资源所有权检查
			// 例如：检查用户是否是项目的创建者或分配人
			return false
		},
		ErrorMessage: fmt.Sprintf("Access denied: requires %s ownership or admin privileges", resourceType),
	})
}

// ==================== 批量验证方法 ====================

// RequireRoleChain 要求角色链验证（必须依次满足所有条件）
func (m *RolePermissionMiddleware) RequireRoleChain(requirements ...RoleRequirement) gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()
		ctx := c.Request.Context()

		// 获取角色上下文
		roleCtx, err := m.getRoleContext(ctx, c)
		if err != nil {
			m.handleRoleError(c, RoleRequirement{}, fmt.Sprintf("Failed to get role context: %v", err))
			return
		}

		// 依次验证所有要求
		for i, req := range requirements {
			if !m.validateRoleRequirement(roleCtx, req) {
				m.handleRoleError(c, req, fmt.Sprintf("Role chain validation failed at step %d", i+1))
				return
			}
		}

		// 所有验证通过
		roleCtx.CheckTime = time.Since(startTime)
		c.Set("role_context", roleCtx)
		c.Next()
	}
}

// ==================== 性能优化方法 ====================

// WarmUpCache 预热缓存
func (m *RolePermissionMiddleware) WarmUpCache(ctx context.Context, companyUserIDs []int) error {
	if m.cache == nil {
		return fmt.Errorf("cache is disabled")
	}

	for _, id := range companyUserIDs {
		cacheKey := fmt.Sprintf("role_context_%d", id)
		
		// 检查是否已缓存
		if _, found := m.cache.Get(cacheKey); found {
			continue
		}

		// 获取用户权限并缓存
		userPermissions, err := m.permissionRepo.GetUserPermissions(ctx, id)
		if err != nil {
			continue // 忽略单个用户的错误，继续处理其他用户
		}

		roleCtx := &RoleContext{
			CompanyUserID: id,
			Permissions:   make([]string, 0),
			CustomFields:  make(map[string]interface{}),
		}

		if userPermissions.Role != nil {
			roleCtx.RoleCode = userPermissions.Role.RoleCode
			roleCtx.RoleName = userPermissions.Role.RoleName
			roleCtx.IsSystemRole = models.IsSystemRole(roleCtx.RoleCode)
			roleCtx.RoleLevel = models.GetSystemRoleLevel(roleCtx.RoleCode)
		}

		for _, perm := range userPermissions.EffectivePermissions {
			roleCtx.Permissions = append(roleCtx.Permissions, perm.PermissionCode)
		}

		m.cache.Set(cacheKey, roleCtx, m.cacheTTL)
	}

	return nil
}

// ==================== 健康检查和监控方法 ====================

// HealthCheck 健康检查
func (m *RolePermissionMiddleware) HealthCheck() map[string]interface{} {
	stats := m.GetStats()
	
	health := map[string]interface{}{
		"status":           "healthy",
		"cache_enabled":    m.cache != nil,
		"total_checks":     stats.TotalChecks,
		"success_rate":     float64(stats.SuccessCount) / float64(max(stats.TotalChecks, 1)) * 100,
		"cache_hit_rate":   float64(stats.CacheHits) / float64(max(stats.CacheHits+stats.CacheMisses, 1)) * 100,
		"avg_check_time":   stats.AvgCheckTime,
		"last_reset":       stats.LastReset,
	}

	if m.cache != nil {
		health["cache_items"] = m.cache.ItemCount()
	}

	return health
}

// max 辅助函数
func max(a, b int64) int64 {
	if a > b {
		return a
	}
	return b
}