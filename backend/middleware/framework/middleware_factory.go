package framework

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// MiddlewareFactory 中间件工厂
type MiddlewareFactory struct {
	framework *PermissionFramework
}

// NewMiddlewareFactory 创建中间件工厂
func NewMiddlewareFactory(framework *PermissionFramework) *MiddlewareFactory {
	return &MiddlewareFactory{
		framework: framework,
	}
}

// CreatePermissionMiddleware 创建单个权限检查中间件
func (f *MiddlewareFactory) CreatePermissionMiddleware(options *MiddlewareOptions) gin.HandlerFunc {
	if options == nil {
		panic("MiddlewareOptions cannot be nil")
	}
	
	if options.Permission == "" {
		panic("Permission code cannot be empty")
	}
	
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		startTime := time.Now()
		
		// 生成请求ID
		requestID := f.getRequestID(c)
		
		// 构建权限检查请求
		request, err := f.buildPermissionRequest(c, options.Permission, options, requestID)
		if err != nil {
			f.handleError(c, options, err)
			return
		}
		
		// 执行权限检查
		response, err := f.framework.CheckPermission(ctx, request)
		if err != nil {
			// 尝试降级处理
			if f.handleFallback(c, options, err) {
				return
			}
			
			f.handleError(c, options, err)
			return
		}
		
		// 检查权限结果
		if !response.HasPermission {
			f.handlePermissionDenied(c, options, response)
			return
		}
		
		// 设置响应上下文
		f.setResponseContext(c, request, response, time.Since(startTime))
		
		c.Next()
	}
}

// CreateAnyPermissionMiddleware 创建任一权限检查中间件
func (f *MiddlewareFactory) CreateAnyPermissionMiddleware(options *AnyPermissionOptions) gin.HandlerFunc {
	if options == nil {
		panic("AnyPermissionOptions cannot be nil")
	}
	
	if len(options.Permissions) == 0 {
		panic("At least one permission must be specified")
	}
	
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		startTime := time.Now()
		
		// 生成请求ID
		requestID := f.getRequestID(c)
		
		// 构建批量权限检查请求
		requests := make([]*PermissionRequest, len(options.Permissions))
		for i, permission := range options.Permissions {
			request, err := f.buildPermissionRequest(c, permission, &MiddlewareOptions{
				Strategy:         options.Strategy,
				EnableCache:      options.EnableCache,
				EnablePrediction: options.EnablePrediction,
				EnableAudit:      options.EnableAudit,
				ResourceExtractor: options.ResourceExtractor,
				Context:          options.Context,
			}, fmt.Sprintf("%s-%d", requestID, i))
			
			if err != nil {
				f.handleError(c, &MiddlewareOptions{
					ErrorHandler: options.ErrorHandler,
				}, err)
				return
			}
			requests[i] = request
		}
		
		// 执行批量权限检查
		responses, err := f.framework.CheckBatchPermissions(ctx, requests)
		if err != nil {
			// 尝试降级处理
			if f.handleFallback(c, &MiddlewareOptions{
				FallbackHandler: options.FallbackHandler,
			}, err) {
				return
			}
			
			f.handleError(c, &MiddlewareOptions{
				ErrorHandler: options.ErrorHandler,
			}, err)
			return
		}
		
		// 检查是否至少有一个权限通过
		hasAnyPermission := false
		var grantedPermissions []string
		for i, response := range responses {
			if response.HasPermission {
				hasAnyPermission = true
				grantedPermissions = append(grantedPermissions, options.Permissions[i])
			}
		}
		
		if !hasAnyPermission {
			f.handleBatchPermissionDenied(c, options.Permissions, responses)
			return
		}
		
		// 设置响应上下文
		c.Set("permission_results", responses)
		c.Set("granted_permissions", grantedPermissions)
		c.Set("permission_check_time", time.Since(startTime))
		
		c.Next()
	}
}					response, err = f.framework.CheckPermission(ctx, request)
				}
				
			case "role":
				// 角色检查逻辑
				userRole, exists := c.Get("user_role")
				if !exists {
					err = fmt.Errorf("user role not found")
				} else if userRoleStr, ok := userRole.(string); !ok {
					err = fmt.Errorf("invalid user role type")
				} else {
					response = &PermissionResponse{
						HasPermission: userRoleStr == rule.Role,
						Source:        "role_check",
						Reason:        fmt.Sprintf("Role check: required=%s, actual=%s", rule.Role, userRoleStr),
						CheckedAt:     time.Now(),
					}
				}
				
			case "resource":
				// 资源权限检查逻辑
				request, buildErr := f.buildPermissionRequest(c, rule.Permission, &MiddlewareOptions{
					Strategy:         options.Strategy,
					EnableCache:      options.EnableCache,
					EnablePrediction: options.EnablePrediction,
					EnableAudit:      options.EnableAudit,
					Context:          options.Context,
				}, fmt.Sprintf("%s-rule-%d", requestID, i))
				
				if buildErr != nil {
					err = buildErr
				} else {
					request.ResourceType = rule.ResourceType
					// 提取资源ID
					resourceID, _ := f.extractDefaultResource(c)
					request.ResourceID = resourceID
					response, err = f.framework.CheckPermission(ctx, request)
				}
				
			default:
				err = fmt.Errorf("unknown rule type: %s", rule.Type)
			}
			
			if err != nil {
				// 创建错误响应
				response = &PermissionResponse{
					HasPermission: false,
					Source:        "error",
					Reason:        fmt.Sprintf("Rule check failed: %v", err),
					CheckedAt:     time.Now(),
				}
			}
			
			ruleResponses[i] = response
		}
		
		// 应用逻辑规则
		var finalResult bool
		switch options.Logic {
		case "AND":
			finalResult = f.applyAndLogic(ruleResponses, options.Rules)
		case "OR":
			finalResult = f.applyOrLogic(ruleResponses, options.Rules)
		case "CUSTOM":
			finalResult = options.CustomLogic(ruleResponses)
		default:
			// 默认使用AND逻辑
			finalResult = f.applyAndLogic(ruleResponses, options.Rules)
		}
		
		if !finalResult {
			// 尝试降级处理
			if f.handleFallback(c, &MiddlewareOptions{
				FallbackHandler: options.FallbackHandler,
			}, fmt.Errorf("composite permission check failed")) {
				return
			}
			
			f.handleCompositePermissionDenied(c, options.Rules, ruleResponses)
			return
		}
		
		// 设置响应上下文
		c.Set("composite_permission_results", ruleResponses)
		c.Set("composite_logic", options.Logic)
		c.Set("permission_check_time", time.Since(startTime))
		
		c.Next()
	}
}

// 辅助方法

// getRequestID 获取或生成请求ID
func (f *MiddlewareFactory) getRequestID(c *gin.Context) string {
	if requestID := c.GetHeader("X-Request-ID"); requestID != "" {
		return requestID
	}
	
	if requestID, exists := c.Get("request_id"); exists {
		if id, ok := requestID.(string); ok {
			return id
		}
	}
	
	// 生成新的请求ID
	requestID := uuid.New().String()
	c.Set("request_id", requestID)
	return requestID
}

// buildPermissionRequest 构建权限检查请求
func (f *MiddlewareFactory) buildPermissionRequest(c *gin.Context, permissionCode string, options *MiddlewareOptions, requestID string) (*PermissionRequest, error) {
	// 提取公司用户ID
	companyUserID, err := f.extractCompanyUserID(c)
	if err != nil {
		return nil, err
	}
	
	// 提取资源信息
	var resourceID *int
	var resourceType string
	
	if options.ResourceExtractor != nil {
		resourceID, resourceType = options.ResourceExtractor(c)
	} else {
		resourceID, resourceType = f.extractDefaultResource(c)
	}
	
	// 构建请求上下文
	requestContext := make(map[string]interface{})
	
	// 添加用户信息
	if username, exists := c.Get("username"); exists {
		requestContext["username"] = username
	}
	if userID, exists := c.Get("user_id"); exists {
		requestContext["user_id"] = userID
	}
	if userRole, exists := c.Get("user_role"); exists {
		requestContext["user_role"] = userRole
	}
	
	// 添加自定义上下文
	if options.Context != nil {
		for k, v := range options.Context {
			requestContext[k] = v
		}
	}
	
	request := &PermissionRequest{
		CompanyUserID:    companyUserID,
		PermissionCode:   permissionCode,
		ResourceID:       resourceID,
		ResourceType:     resourceType,
		RequestContext:   requestContext,
		IPAddress:        c.ClientIP(),
		UserAgent:        c.GetHeader("User-Agent"),
		RequestID:        requestID,
		EnableOverrides:  true,
		EnableCache:      options.EnableCache,
		EnablePrediction: options.EnablePrediction,
		Strategy:         options.Strategy,
		Timestamp:        time.Now(),
	}
	
	return request, nil
}

// extractCompanyUserID 提取公司用户ID
func (f *MiddlewareFactory) extractCompanyUserID(c *gin.Context) (int, error) {
	companyUserIDInterface, exists := c.Get("company_user_id")
	if !exists {
		return 0, fmt.Errorf("company user ID not found in context")
	}
	
	companyUserID, ok := companyUserIDInterface.(int)
	if !ok {
		return 0, fmt.Errorf("invalid company user ID type")
	}
	
	return companyUserID, nil
}

// extractDefaultResource 默认资源提取逻辑
func (f *MiddlewareFactory) extractDefaultResource(c *gin.Context) (*int, string) {
	// 尝试从URL参数提取资源ID
	if idStr := c.Param("id"); idStr != "" {
		if id, err := strconv.Atoi(idStr); err == nil {
			return &id, f.inferResourceType(c)
		}
	}
	
	// 尝试从project_id参数提取
	if idStr := c.Param("project_id"); idStr != "" {
		if id, err := strconv.Atoi(idStr); err == nil {
			return &id, "project"
		}
	}
	
	// 尝试从task_id参数提取
	if idStr := c.Param("task_id"); idStr != "" {
		if id, err := strconv.Atoi(idStr); err == nil {
			return &id, "task"
		}
	}
	
	// 尝试从taskId参数提取
	if idStr := c.Param("taskId"); idStr != "" {
		if id, err := strconv.Atoi(idStr); err == nil {
			return &id, "task"
		}
	}
	
	return nil, ""
}

// inferResourceType 根据URL路径推断资源类型
func (f *MiddlewareFactory) inferResourceType(c *gin.Context) string {
	path := c.Request.URL.Path
	
	if strings.Contains(path, "/projects") {
		if strings.Contains(path, "/tasks") {
			return "task"
		}
		return "project"
	}
	
	if strings.Contains(path, "/tasks") {
		return "task"
	}
	
	if strings.Contains(path, "/documents") {
		return "document"
	}
	
	if strings.Contains(path, "/users") {
		return "user"
	}
	
	return "unknown"
}

// handleError 处理错误
func (f *MiddlewareFactory) handleError(c *gin.Context, options *MiddlewareOptions, err error) {
	if options.ErrorHandler != nil {
		options.ErrorHandler(c, err)
		return
	}
	
	log.Printf("[PERMISSION_FRAMEWORK] Error: %v", err)
	
	c.JSON(http.StatusInternalServerError, gin.H{
		"error": "Permission check failed",
		"details": err.Error(),
	})
	c.Abort()
}

// handleFallback 处理降级逻辑
func (f *MiddlewareFactory) handleFallback(c *gin.Context, options *MiddlewareOptions, err error) bool {
	if options.FallbackHandler != nil {
		return options.FallbackHandler(c)
	}
	
	// 检查框架级别的降级配置
	if f.framework.config.FallbackConfig.EnableFallback {
		strategy := f.framework.config.FallbackConfig.FallbackStrategy
		defaultResult := f.framework.config.FallbackConfig.DefaultPermissionResult
		
		switch strategy {
		case "allow":
			log.Printf("[PERMISSION_FRAMEWORK] Fallback: allowing due to error: %v", err)
			c.Next()
			return true
		case "deny":
			log.Printf("[PERMISSION_FRAMEWORK] Fallback: denying due to error: %v", err)
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Permission denied (fallback)",
				"reason": "System error - access denied for safety",
			})
			c.Abort()
			return true
		case "default":
			if defaultResult {
				log.Printf("[PERMISSION_FRAMEWORK] Fallback: allowing due to default: %v", err)
				c.Next()
				return true
			} else {
				log.Printf("[PERMISSION_FRAMEWORK] Fallback: denying due to default: %v", err)
				c.JSON(http.StatusForbidden, gin.H{
					"error": "Permission denied (fallback)",
					"reason": "System error - access denied by default",
				})
				c.Abort()
				return true
			}
		}
	}
	
	return false
}

// handlePermissionDenied 处理权限拒绝
func (f *MiddlewareFactory) handlePermissionDenied(c *gin.Context, options *MiddlewareOptions, response *PermissionResponse) {
	c.JSON(http.StatusForbidden, gin.H{
		"error":        "Permission denied",
		"permission":   response.Metadata["permission_code"],
		"reason":       response.Reason,
		"source":       response.Source,
		"checked_at":   response.CheckedAt,
		"response_time": response.ResponseTime.Milliseconds(),
	})
	c.Abort()
}

// handleBatchPermissionDenied 处理批量权限拒绝
func (f *MiddlewareFactory) handleBatchPermissionDenied(c *gin.Context, permissions []string, responses []*PermissionResponse) {
	var deniedReasons []string
	for _, response := range responses {
		if !response.HasPermission {
			deniedReasons = append(deniedReasons, response.Reason)
		}
	}
	
	c.JSON(http.StatusForbidden, gin.H{
		"error":            "Permission denied",
		"permissions":      permissions,
		"denied_reasons":   deniedReasons,
		"check_type":       "any_permission",
	})
	c.Abort()
}

// handleAllPermissionDenied 处理所有权限拒绝
func (f *MiddlewareFactory) handleAllPermissionDenied(c *gin.Context, deniedPermissions []string, responses []*PermissionResponse) {
	c.JSON(http.StatusForbidden, gin.H{
		"error":               "Permission denied",
		"denied_permissions":  deniedPermissions,
		"check_type":          "all_permissions",
		"total_checks":        len(responses),
		"denied_count":        len(deniedPermissions),
	})
	c.Abort()
}

// handleResourcePermissionDenied 处理资源权限拒绝
func (f *MiddlewareFactory) handleResourcePermissionDenied(c *gin.Context, request *PermissionRequest, response *PermissionResponse) {
	c.JSON(http.StatusForbidden, gin.H{
		"error":         "Resource permission denied",
		"permission":    request.PermissionCode,
		"resource_id":   request.ResourceID,
		"resource_type": request.ResourceType,
		"reason":        response.Reason,
		"source":        response.Source,
	})
	c.Abort()
}

// handleCompositePermissionDenied 处理组合权限拒绝
func (f *MiddlewareFactory) handleCompositePermissionDenied(c *gin.Context, rules []PermissionRule, responses []*PermissionResponse) {
	failedRules := make([]map[string]interface{}, 0)
	
	for i, response := range responses {
		if !response.HasPermission {
			failedRules = append(failedRules, map[string]interface{}{
				"rule":   rules[i],
				"reason": response.Reason,
			})
		}
	}
	
	c.JSON(http.StatusForbidden, gin.H{
		"error":        "Composite permission denied",
		"failed_rules": failedRules,
		"check_type":   "composite",
	})
	c.Abort()
}

// getRoleRequirement 获取角色要求描述
func (f *MiddlewareFactory) getRoleRequirement(options *RoleOptions) interface{} {
	if options.Role != "" {
		return options.Role
	}
	return options.AllowedRoles
}

// setResponseContext 设置响应上下文
func (f *MiddlewareFactory) setResponseContext(c *gin.Context, request *PermissionRequest, response *PermissionResponse, duration time.Duration) {
	c.Set("permission_result", response)
	c.Set("permission_request", request)
	c.Set("permission_check_time", duration)
	
	// 设置扩展信息
	if response.Metadata != nil {
		c.Set("permission_metadata", response.Metadata)
	}
	
	if response.Debug != nil {
		c.Set("permission_debug", response.Debug)
	}
}

// applyAndLogic 应用AND逻辑
func (f *MiddlewareFactory) applyAndLogic(responses []*PermissionResponse, rules []PermissionRule) bool {
	for i, response := range responses {
		if rules[i].Required && !response.HasPermission {
			return false
		}
	}
	return true
}

// applyOrLogic 应用OR逻辑
func (f *MiddlewareFactory) applyOrLogic(responses []*PermissionResponse, rules []PermissionRule) bool {
	for _, response := range responses {
		if response.HasPermission {
			return true
		}
	}
	return false
}
