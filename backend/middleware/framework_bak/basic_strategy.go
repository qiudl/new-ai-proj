package framework

import (
	"ai-project-backend/models"
	"context"
	"fmt"
	"log"
	"time"
)

// BasicStrategy 基础权限检查策略
type BasicStrategy struct {
	config *FrameworkConfig
	name   string
}

// NewBasicStrategy 创建基础策略
func NewBasicStrategy(config *FrameworkConfig) *BasicStrategy {
	return &BasicStrategy{
		config: config,
		name:   "basic",
	}
}

// CheckPermission 执行权限检查
func (s *BasicStrategy) CheckPermission(ctx context.Context, request *PermissionRequest) (*PermissionResponse, error) {
	startTime := time.Now()
	
	response := &PermissionResponse{
		CheckedAt:    startTime,
		Source:       s.name,
		CacheHit:     false,
		Metadata:     make(map[string]interface{}),
	}
	
	// 检查速率限制
	if s.config.EnableRateLimit && s.config.RateLimiter != nil {
		if !s.checkRateLimit(request, response) {
			response.ResponseTime = time.Since(startTime)
			return response, nil
		}
	}
	
	// 检查超级管理员权限
	if request.EnableOverrides && s.checkSuperAdmin(request, response) {
		response.ResponseTime = time.Since(startTime)
		return response, nil
	}
	
	// 执行数据库权限检查
	result, err := s.config.PermissionRepo.CheckUserPermission(
		ctx,
		request.CompanyUserID,
		request.PermissionCode,
		request.ResourceID,
	)
	
	if err != nil {
		response.HasPermission = false
		response.Reason = fmt.Sprintf("Database error: %v", err)
		response.Source = "error"
		response.ResponseTime = time.Since(startTime)
		
		log.Printf("[BASIC_STRATEGY] Permission check error for user %d, permission %s: %v",
			request.CompanyUserID, request.PermissionCode, err)
		
		return response, err
	}
	
	// 构建响应
	response.HasPermission = result.HasPermission
	response.Reason = result.Reason
	response.Source = result.Source
	response.ResponseTime = time.Since(startTime)
	
	// 设置元数据
	response.Metadata["permission_code"] = request.PermissionCode
	response.Metadata["resource_id"] = request.ResourceID
	response.Metadata["resource_type"] = request.ResourceType
	response.Metadata["company_user_id"] = request.CompanyUserID
	response.Metadata["database_hit"] = true
	
	return response, nil
}

// CheckBatchPermissions 批量权限检查
func (s *BasicStrategy) CheckBatchPermissions(ctx context.Context, requests []*PermissionRequest) ([]*PermissionResponse, error) {
	if len(requests) == 0 {
		return []*PermissionResponse{}, nil
	}
	
	startTime := time.Now()
	responses := make([]*PermissionResponse, len(requests))
	
	// 检查速率限制（批量）
	if s.config.EnableRateLimit && s.config.RateLimiter != nil {
		// 使用较低的速率限制
		rateLimitResult := s.config.RateLimiter.CheckRateLimitByUser(
			requests[0].CompanyUserID,
			100, // 批量操作的速率限制
			"minute",
		)
		
		if !rateLimitResult.Allowed {
			// 所有请求都返回速率限制错误
			for i := range requests {
				responses[i] = &PermissionResponse{
					HasPermission: false,
					Reason:        "Rate limit exceeded for batch operation",
					Source:        "rate_limiter",
					CheckedAt:     startTime,
					ResponseTime:  time.Since(startTime),
				}
			}
			return responses, nil
		}
	}
	
	// 提取权限代码列表
	permissionCodes := make([]string, len(requests))
	for i, req := range requests {
		permissionCodes[i] = req.PermissionCode
	}
	
	// 使用数据库的批量检查方法
	var results map[string]*models.PermissionResult
	var err error
	
	// 假设第一个请求的资源信息代表整个批次
	firstRequest := requests[0]
	
	// 检查超级管理员权限
	isSuperAdmin := firstRequest.EnableOverrides && s.isSuperAdminFromContext(firstRequest.RequestContext)
	
	if isSuperAdmin {
		// 超级管理员跳过数据库检查
		results = make(map[string]*models.PermissionResult)
		for _, code := range permissionCodes {
			results[code] = &models.PermissionResult{
				HasPermission: true,
				Source:        "admin_override",
				Reason:        "Superadmin bypass",
			}
		}
	} else {
		// 执行数据库批量检查
		results, err = s.config.PermissionRepo.CheckMultiplePermissions(
			ctx,
			firstRequest.CompanyUserID,
			permissionCodes,
			firstRequest.ResourceID,
		)
		
		if err != nil {
			// 返回错误响应
			for i := range requests {
				responses[i] = &PermissionResponse{
					HasPermission: false,
					Reason:        fmt.Sprintf("Database error: %v", err),
					Source:        "error",
					CheckedAt:     startTime,
					ResponseTime:  time.Since(startTime),
				}
			}
			return responses, err
		}
	}
	
	// 构建响应
	for i, req := range requests {
		result := results[req.PermissionCode]
		if result == nil {
			result = &models.PermissionResult{
				HasPermission: false,
				Reason:        "Permission not found in results",
				Source:        "error",
			}
		}
		
		responses[i] = &PermissionResponse{
			HasPermission: result.HasPermission,
			Reason:        result.Reason,
			Source:        result.Source,
			CheckedAt:     startTime,
			ResponseTime:  time.Since(startTime),
			CacheHit:      false,
			Metadata: map[string]interface{}{
				"permission_code":   req.PermissionCode,
				"resource_id":       req.ResourceID,
				"resource_type":     req.ResourceType,
				"company_user_id":   req.CompanyUserID,
				"database_hit":      !isSuperAdmin,
				"admin_override":    isSuperAdmin,
			},
		}
	}
	
	return responses, nil
}

// GetPriority 获取策略优先级
func (s *BasicStrategy) GetPriority() int {
	return 1 // 最低优先级
}

// GetName 获取策略名称
func (s *BasicStrategy) GetName() string {
	return s.name
}

// IsEnabled 检查策略是否启用
func (s *BasicStrategy) IsEnabled() bool {
	return s.config.PermissionRepo != nil
}

// checkRateLimit 检查速率限制
func (s *BasicStrategy) checkRateLimit(request *PermissionRequest, response *PermissionResponse) bool {
	rateLimitResult := s.config.RateLimiter.CheckRateLimitByUser(
		request.CompanyUserID,
		s.config.PerformanceConfig.RateLimitPerUser,
		"minute",
	)
	
	if !rateLimitResult.Allowed {
		response.HasPermission = false
		response.Reason = "Rate limit exceeded"
		response.Source = "rate_limiter"
		response.Metadata["rate_limit_hit"] = true
		response.Metadata["rate_limit_remaining"] = rateLimitResult.Remaining
		response.Metadata["rate_limit_reset"] = rateLimitResult.ResetTime
		return false
	}
	
	response.Metadata["rate_limit_remaining"] = rateLimitResult.Remaining
	return true
}

// checkSuperAdmin 检查超级管理员权限
func (s *BasicStrategy) checkSuperAdmin(request *PermissionRequest, response *PermissionResponse) bool {
	if !s.isSuperAdminFromContext(request.RequestContext) {
		return false
	}
	
	response.HasPermission = true
	response.Reason = "Superadmin bypass"
	response.Source = "admin_override"
	response.Metadata["admin_override"] = true
	
	return true
}

// isSuperAdminFromContext 从请求上下文检查超级管理员
func (s *BasicStrategy) isSuperAdminFromContext(requestContext map[string]interface{}) bool {
	if requestContext == nil {
		return false
	}
	
	// 检查用户名
	if username, ok := requestContext["username"]; ok {
		if usernameStr, ok := username.(string); ok && usernameStr == "admin" {
			return true
		}
	}
	
	// 检查用户角色
	if userRole, ok := requestContext["user_role"]; ok {
		if roleStr, ok := userRole.(string); ok && roleStr == "superadmin" {
			return true
		}
	}
	
	// 这里可以添加更多的超级管理员检查逻辑
	// 例如检查特定的用户ID或其他标识符
	
	return false
}
