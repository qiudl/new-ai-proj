package services

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"ai-project-backend/models"
)

// EnhancedPermissionService provides advanced permission management capabilities
type EnhancedPermissionService struct {
	db *sql.DB
}

// NewEnhancedPermissionService creates a new enhanced permission service
func NewEnhancedPermissionService(db *sql.DB) *EnhancedPermissionService {
	return &EnhancedPermissionService{db: db}
}

// RoleTemplate represents a predefined role template
type RoleTemplate struct {
	ID                  int       `json:"id"`
	Name                string    `json:"name"`
	Description         string    `json:"description"`
	Category            string    `json:"category"` // e.g., "management", "development", "support"
	DefaultPermissions  []string  `json:"default_permissions"`
	RequiredPermissions []string  `json:"required_permissions"`
	ConflictingRoles    []string  `json:"conflicting_roles"`
	RecommendedFor      []string  `json:"recommended_for"`
	IsBuiltIn           bool      `json:"is_built_in"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

// PermissionTemplate represents a permission template for quick setup
type PermissionTemplate struct {
	ID          int             `json:"id"`
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Permissions map[string]bool `json:"permissions"` // permission_code -> granted
	UseCases    []string        `json:"use_cases"`
	IsBuiltIn   bool            `json:"is_built_in"`
}

// DynamicPermission represents a permission that can be granted based on context
type DynamicPermission struct {
	ID             int                    `json:"id"`
	PermissionCode string                 `json:"permission_code"`
	ResourceType   string                 `json:"resource_type"`
	Conditions     map[string]interface{} `json:"conditions"`
	ValidFrom      *time.Time             `json:"valid_from"`
	ValidUntil     *time.Time             `json:"valid_until"`
	GrantedBy      int                    `json:"granted_by"`
	Reason         string                 `json:"reason"`
	IsActive       bool                   `json:"is_active"`
	CreatedAt      time.Time              `json:"created_at"`
}

// PermissionRequest represents a request for temporary permissions
type PermissionRequest struct {
	ID                int           `json:"id"`
	RequesterID       int           `json:"requester_id"`
	RequesterName     string        `json:"requester_name"`
	PermissionCode    string        `json:"permission_code"`
	ResourceType      string        `json:"resource_type"`
	ResourceID        *int          `json:"resource_id"`
	Justification     string        `json:"justification"`
	RequestedDuration time.Duration `json:"requested_duration"`
	Status            string        `json:"status"` // pending, approved, rejected, expired
	ApproverID        *int          `json:"approver_id"`
	ApproverName      *string       `json:"approver_name"`
	ApprovedAt        *time.Time    `json:"approved_at"`
	ExpiresAt         *time.Time    `json:"expires_at"`
	Comments          string        `json:"comments"`
	CreatedAt         time.Time     `json:"created_at"`
	UpdatedAt         time.Time     `json:"updated_at"`
}

// Permission delegation
type PermissionDelegation struct {
	ID              int        `json:"id"`
	DelegatorID     int        `json:"delegator_id"`
	DelegatorName   string     `json:"delegator_name"`
	DelegateID      int        `json:"delegate_id"`
	DelegateName    string     `json:"delegate_name"`
	PermissionCodes []string   `json:"permission_codes"`
	ResourceType    string     `json:"resource_type"`
	ResourceID      *int       `json:"resource_id"`
	ValidFrom       time.Time  `json:"valid_from"`
	ValidUntil      time.Time  `json:"valid_until"`
	CanDelegate     bool       `json:"can_delegate"` // Can the delegate further delegate
	IsActive        bool       `json:"is_active"`
	Reason          string     `json:"reason"`
	CreatedAt       time.Time  `json:"created_at"`
	RevokedAt       *time.Time `json:"revoked_at"`
	RevokedBy       *int       `json:"revoked_by"`
}

// GetBuiltInRoleTemplates returns predefined role templates
func (s *EnhancedPermissionService) GetBuiltInRoleTemplates() []RoleTemplate {
	return []RoleTemplate{
		{
			ID:          1,
			Name:        "项目经理",
			Description: "负责项目整体管理，具有项目的完整控制权",
			Category:    "management",
			DefaultPermissions: []string{
				"project.read", "project.update", "project.delete",
				"task.read", "task.create", "task.update", "task.delete", "task.assign",
				"document.read", "document.create", "document.update",
				"member.read", "member.invite", "member.remove",
				"report.read", "report.generate",
			},
			RequiredPermissions: []string{"project.read", "task.read"},
			ConflictingRoles:    []string{},
			RecommendedFor:      []string{"experienced_manager", "team_lead"},
			IsBuiltIn:           true,
		},
		{
			ID:          2,
			Name:        "开发人员",
			Description: "参与项目开发，负责任务执行和代码提交",
			Category:    "development",
			DefaultPermissions: []string{
				"project.read",
				"task.read", "task.update", "task.comment",
				"document.read", "document.create", "document.update",
				"code.read", "code.write", "code.review",
			},
			RequiredPermissions: []string{"project.read", "task.read"},
			ConflictingRoles:    []string{},
			RecommendedFor:      []string{"developer", "engineer"},
			IsBuiltIn:           true,
		},
		{
			ID:          3,
			Name:        "产品经理",
			Description: "负责产品规划和需求管理",
			Category:    "product",
			DefaultPermissions: []string{
				"project.read", "project.update",
				"task.read", "task.create", "task.update", "task.assign",
				"document.read", "document.create", "document.update",
				"requirement.read", "requirement.create", "requirement.update",
				"report.read", "report.generate",
			},
			RequiredPermissions: []string{"project.read", "requirement.read"},
			ConflictingRoles:    []string{},
			RecommendedFor:      []string{"product_manager", "business_analyst"},
			IsBuiltIn:           true,
		},
		{
			ID:          4,
			Name:        "测试人员",
			Description: "负责质量保证和测试工作",
			Category:    "qa",
			DefaultPermissions: []string{
				"project.read",
				"task.read", "task.update", "task.comment",
				"document.read", "document.create",
				"test.read", "test.create", "test.execute",
				"bug.read", "bug.create", "bug.update",
			},
			RequiredPermissions: []string{"project.read", "test.read"},
			ConflictingRoles:    []string{},
			RecommendedFor:      []string{"qa_engineer", "tester"},
			IsBuiltIn:           true,
		},
		{
			ID:          5,
			Name:        "观察者",
			Description: "只读权限，可以查看项目进展但不能修改",
			Category:    "viewer",
			DefaultPermissions: []string{
				"project.read",
				"task.read",
				"document.read",
				"report.read",
			},
			RequiredPermissions: []string{"project.read"},
			ConflictingRoles:    []string{},
			RecommendedFor:      []string{"stakeholder", "client", "auditor"},
			IsBuiltIn:           true,
		},
	}
}

// GetPermissionTemplates returns predefined permission templates
func (s *EnhancedPermissionService) GetPermissionTemplates() []PermissionTemplate {
	return []PermissionTemplate{
		{
			ID:          1,
			Name:        "基础项目访问",
			Description: "查看项目和任务的基本权限",
			Permissions: map[string]bool{
				"project.read":  true,
				"task.read":     true,
				"document.read": true,
			},
			UseCases:  []string{"新员工入职", "临时访问", "外部顾问"},
			IsBuiltIn: true,
		},
		{
			ID:          2,
			Name:        "内容创建者",
			Description: "可以创建和编辑内容的权限",
			Permissions: map[string]bool{
				"project.read":    true,
				"task.read":       true,
				"task.create":     true,
				"task.update":     true,
				"document.read":   true,
				"document.create": true,
				"document.update": true,
			},
			UseCases:  []string{"内容编辑", "文档管理", "任务创建"},
			IsBuiltIn: true,
		},
		{
			ID:          3,
			Name:        "团队协调者",
			Description: "协调团队工作的权限",
			Permissions: map[string]bool{
				"project.read":    true,
				"task.read":       true,
				"task.assign":     true,
				"member.read":     true,
				"member.invite":   true,
				"report.read":     true,
				"report.generate": true,
			},
			UseCases:  []string{"团队管理", "进度跟踪", "资源分配"},
			IsBuiltIn: true,
		},
	}
}

// CreateRoleFromTemplate creates a new role based on a template
func (s *EnhancedPermissionService) CreateRoleFromTemplate(ctx context.Context, templateID int, roleName string, customizations map[string]bool) (*models.CompanyRole, error) {
	templates := s.GetBuiltInRoleTemplates()

	var template *RoleTemplate
	for _, t := range templates {
		if t.ID == templateID {
			template = &t
			break
		}
	}

	if template == nil {
		return nil, fmt.Errorf("template not found")
	}

	// Create the role
	role := &models.CompanyRole{
		RoleCode:        fmt.Sprintf("%s_%d", template.Name, time.Now().Unix()),
		RoleName:        roleName,
		RoleDescription: &template.Description,
		IsSystemRole:    false,
		IsActive:        true,
	}

	// In a real implementation, this would insert into the database
	// For now, we'll return a mock response
	role.ID = int(time.Now().Unix())
	role.CreatedAt = time.Now()
	role.UpdatedAt = time.Now()

	return role, nil
}

// RequestPermission creates a new permission request
func (s *EnhancedPermissionService) RequestPermission(ctx context.Context, requesterID int, permissionCode string, resourceType string, resourceID *int, justification string, duration time.Duration) (*PermissionRequest, error) {
	request := &PermissionRequest{
		ID:                int(time.Now().Unix()),
		RequesterID:       requesterID,
		PermissionCode:    permissionCode,
		ResourceType:      resourceType,
		ResourceID:        resourceID,
		Justification:     justification,
		RequestedDuration: duration,
		Status:            "pending",
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	// In a real implementation, this would be stored in the database
	return request, nil
}

// ApprovePermissionRequest approves a permission request
func (s *EnhancedPermissionService) ApprovePermissionRequest(ctx context.Context, requestID int, approverID int, comments string) error {
	// In a real implementation, this would:
	// 1. Update the request status to "approved"
	// 2. Create a dynamic permission entry
	// 3. Set expiration time
	// 4. Send notification to requester

	return nil
}

// RejectPermissionRequest rejects a permission request
func (s *EnhancedPermissionService) RejectPermissionRequest(ctx context.Context, requestID int, approverID int, reason string) error {
	// In a real implementation, this would:
	// 1. Update the request status to "rejected"
	// 2. Store rejection reason
	// 3. Send notification to requester

	return nil
}

// DelegatePermissions delegates permissions to another user temporarily
func (s *EnhancedPermissionService) DelegatePermissions(ctx context.Context, delegatorID int, delegateID int, permissionCodes []string, resourceType string, resourceID *int, validUntil time.Time, reason string) (*PermissionDelegation, error) {
	delegation := &PermissionDelegation{
		ID:              int(time.Now().Unix()),
		DelegatorID:     delegatorID,
		DelegateID:      delegateID,
		PermissionCodes: permissionCodes,
		ResourceType:    resourceType,
		ResourceID:      resourceID,
		ValidFrom:       time.Now(),
		ValidUntil:      validUntil,
		CanDelegate:     false, // Default to false for security
		IsActive:        true,
		Reason:          reason,
		CreatedAt:       time.Now(),
	}

	// In a real implementation, this would be stored in the database
	return delegation, nil
}

// RevokeDelegation revokes a permission delegation
func (s *EnhancedPermissionService) RevokeDelegation(ctx context.Context, delegationID int, revokerID int, reason string) error {
	// In a real implementation, this would:
	// 1. Set delegation as inactive
	// 2. Set revoked_at timestamp
	// 3. Record who revoked it and why
	// 4. Send notification to affected parties

	return nil
}

// GetUserDelegations returns all delegations for a user (both as delegator and delegate)
func (s *EnhancedPermissionService) GetUserDelegations(ctx context.Context, userID int) ([]PermissionDelegation, error) {
	// Mock data for demonstration
	delegations := []PermissionDelegation{
		{
			ID:              1,
			DelegatorID:     123,
			DelegatorName:   "张三",
			DelegateID:      userID,
			DelegateName:    "李四",
			PermissionCodes: []string{"project.update", "task.assign"},
			ResourceType:    "project",
			ResourceID:      &[]int{456}[0],
			ValidFrom:       time.Now().Add(-24 * time.Hour),
			ValidUntil:      time.Now().Add(7 * 24 * time.Hour),
			CanDelegate:     false,
			IsActive:        true,
			Reason:          "出差期间代理项目管理权限",
			CreatedAt:       time.Now().Add(-24 * time.Hour),
		},
	}

	return delegations, nil
}

// CheckDynamicPermission checks if a user has a dynamic permission
func (s *EnhancedPermissionService) CheckDynamicPermission(ctx context.Context, userID int, permissionCode string, resourceType string, resourceID *int, context map[string]interface{}) (bool, string, error) {
	// Check for active delegations
	delegations, err := s.GetUserDelegations(ctx, userID)
	if err != nil {
		return false, "", err
	}

	for _, delegation := range delegations {
		if !delegation.IsActive || time.Now().After(delegation.ValidUntil) {
			continue
		}

		// Check if the permission is delegated
		for _, code := range delegation.PermissionCodes {
			if code == permissionCode {
				// Check resource match
				if delegation.ResourceType == resourceType {
					if delegation.ResourceID == nil || resourceID == nil || *delegation.ResourceID == *resourceID {
						return true, fmt.Sprintf("delegated by %s", delegation.DelegatorName), nil
					}
				}
			}
		}
	}

	// Check for temporary permissions from requests
	// This would query the database for approved permission requests

	return false, "no dynamic permission found", nil
}

// GetPermissionRequests returns permission requests with filtering
func (s *EnhancedPermissionService) GetPermissionRequests(ctx context.Context, filter map[string]interface{}) ([]PermissionRequest, error) {
	// Mock data for demonstration
	requests := []PermissionRequest{
		{
			ID:                1,
			RequesterID:       101,
			RequesterName:     "王五",
			PermissionCode:    "project.delete",
			ResourceType:      "project",
			ResourceID:        &[]int{789}[0],
			Justification:     "需要清理测试项目",
			RequestedDuration: 24 * time.Hour,
			Status:            "pending",
			CreatedAt:         time.Now().Add(-2 * time.Hour),
			UpdatedAt:         time.Now().Add(-2 * time.Hour),
		},
		{
			ID:                2,
			RequesterID:       102,
			RequesterName:     "赵六",
			PermissionCode:    "financial.read",
			ResourceType:      "project",
			ResourceID:        &[]int{456}[0],
			Justification:     "准备项目预算报告",
			RequestedDuration: 7 * 24 * time.Hour,
			Status:            "approved",
			ApproverID:        &[]int{201}[0],
			ApproverName:      &[]string{"管理员"}[0],
			ApprovedAt:        &[]time.Time{time.Now().Add(-1 * time.Hour)}[0],
			ExpiresAt:         &[]time.Time{time.Now().Add(6 * 24 * time.Hour)}[0],
			Comments:          "已批准，请按时完成报告",
			CreatedAt:         time.Now().Add(-3 * time.Hour),
			UpdatedAt:         time.Now().Add(-1 * time.Hour),
		},
	}

	// Apply filters
	if status, ok := filter["status"].(string); ok && status != "" {
		var filtered []PermissionRequest
		for _, req := range requests {
			if req.Status == status {
				filtered = append(filtered, req)
			}
		}
		requests = filtered
	}

	return requests, nil
}

// AnalyzePermissionUsage analyzes permission usage patterns
func (s *EnhancedPermissionService) AnalyzePermissionUsage(ctx context.Context, userID int, timeRange string) (map[string]interface{}, error) {
	// Mock analysis data
	analysis := map[string]interface{}{
		"user_id":    userID,
		"time_range": timeRange,
		"most_used_permissions": []map[string]interface{}{
			{"permission": "project.read", "count": 45, "last_used": time.Now().Add(-1 * time.Hour)},
			{"permission": "task.update", "count": 32, "last_used": time.Now().Add(-2 * time.Hour)},
			{"permission": "document.read", "count": 28, "last_used": time.Now().Add(-30 * time.Minute)},
		},
		"unused_permissions": []string{
			"project.delete", "financial.manage", "system.admin",
		},
		"permission_requests": map[string]int{
			"total":    5,
			"approved": 3,
			"rejected": 1,
			"pending":  1,
		},
		"delegations": map[string]int{
			"given":    2,
			"received": 1,
			"active":   1,
		},
		"recommendations": []string{
			"考虑移除未使用的高级权限以提高安全性",
			"建议为常用操作设置快捷权限",
			"可以将部分权限委派给团队成员",
		},
	}

	return analysis, nil
}

// SuggestRoleOptimization suggests role optimizations based on usage patterns
func (s *EnhancedPermissionService) SuggestRoleOptimization(ctx context.Context, userID int) (map[string]interface{}, error) {
	// Mock optimization suggestions
	suggestions := map[string]interface{}{
		"user_id": userID,
		"current_role": map[string]interface{}{
			"id":                5,
			"name":              "开发人员",
			"permissions_count": 12,
		},
		"usage_analysis": map[string]interface{}{
			"used_permissions":   8,
			"unused_permissions": 4,
			"usage_rate":         "67%",
		},
		"suggestions": []map[string]interface{}{
			{
				"type":        "role_change",
				"title":       "建议更换为高级开发人员角色",
				"description": "基于您的权限使用模式，高级开发人员角色更适合您的工作需要",
				"new_role":    "高级开发人员",
				"benefits":    []string{"获得代码审查权限", "可以管理分支", "可以部署到测试环境"},
				"confidence":  85,
			},
			{
				"type":        "permission_removal",
				"title":       "移除未使用的权限",
				"description": "以下权限在过去30天内未被使用，建议移除以提高安全性",
				"permissions": []string{"financial.read", "system.config"},
				"confidence":  92,
			},
			{
				"type":        "permission_addition",
				"title":       "添加常用权限",
				"description": "基于您的工作模式，建议添加以下权限",
				"permissions": []string{"code.deploy", "test.run"},
				"confidence":  78,
			},
		},
		"security_score":         88,
		"optimization_potential": "中等",
	}

	return suggestions, nil
}

// CreatePermissionPolicy creates a policy-based permission rule
func (s *EnhancedPermissionService) CreatePermissionPolicy(ctx context.Context, policy map[string]interface{}) error {
	// In a real implementation, this would store policy rules that can automatically
	// grant or deny permissions based on conditions like:
	// - Time of day
	// - Location
	// - Resource sensitivity
	// - User attributes
	// - Previous behavior patterns

	return nil
}

// EvaluatePermissionPolicy evaluates if a permission should be granted based on policies
func (s *EnhancedPermissionService) EvaluatePermissionPolicy(ctx context.Context, userID int, permissionCode string, context map[string]interface{}) (bool, string, error) {
	// Mock policy evaluation
	// This would evaluate various policies like:
	// - Time-based restrictions
	// - Location-based access
	// - Risk-based decisions
	// - Compliance requirements

	return true, "granted by policy", nil
}
