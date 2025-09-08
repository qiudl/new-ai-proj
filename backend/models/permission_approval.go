package models

import (
	"time"
)

// ApprovalStatus represents the status of an approval request
type ApprovalStatus string

const (
	ApprovalStatusPending    ApprovalStatus = "pending"
	ApprovalStatusInReview   ApprovalStatus = "in_review"
	ApprovalStatusApproved   ApprovalStatus = "approved"
	ApprovalStatusRejected   ApprovalStatus = "rejected"
	ApprovalStatusWithdrawn  ApprovalStatus = "withdrawn"
	ApprovalStatusExpired    ApprovalStatus = "expired"
	ApprovalStatusDelegated  ApprovalStatus = "delegated"
	ApprovalStatusEscalated  ApprovalStatus = "escalated"
)

// ApprovalPriority represents the priority level of an approval request
type ApprovalPriority string

const (
	ApprovalPriorityLow       ApprovalPriority = "low"
	ApprovalPriorityNormal    ApprovalPriority = "normal"
	ApprovalPriorityHigh      ApprovalPriority = "high"
	ApprovalPriorityUrgent    ApprovalPriority = "urgent"
	ApprovalPriorityCritical  ApprovalPriority = "critical"
)

// ApprovalWorkflowType represents different types of approval workflows
type ApprovalWorkflowType string

const (
	WorkflowTypeSingleApproval     ApprovalWorkflowType = "single_approval"
	WorkflowTypeSequentialApproval ApprovalWorkflowType = "sequential_approval"
	WorkflowTypeParallelApproval   ApprovalWorkflowType = "parallel_approval"
	WorkflowTypeMajorityApproval   ApprovalWorkflowType = "majority_approval"
	WorkflowTypeConditionalApproval ApprovalWorkflowType = "conditional_approval"
)

// PermissionApprovalRequest represents an enhanced permission approval request
type PermissionApprovalRequest struct {
	ID                   int                        `json:"id" db:"id"`
	RequestID            string                     `json:"request_id" db:"request_id"` // 唯一请求标识
	RequesterID          int                        `json:"requester_id" db:"requester_id"`
	RequesterName        string                     `json:"requester_name" db:"requester_name"`
	RequesterDepartment  *string                    `json:"requester_department" db:"requester_department"`
	RequesterRole        *string                    `json:"requester_role" db:"requester_role"`
	
	// 权限详情
	PermissionCode       string                     `json:"permission_code" db:"permission_code"`
	ResourceType         string                     `json:"resource_type" db:"resource_type"`
	ResourceID           *int                       `json:"resource_id" db:"resource_id"`
	ResourceName         *string                    `json:"resource_name" db:"resource_name"`
	PermissionScope      CustomFields               `json:"permission_scope" db:"permission_scope"`
	
	// 请求详情
	RequestTitle         string                     `json:"request_title" db:"request_title"`
	Justification        string                     `json:"justification" db:"justification"`
	BusinessReason       string                     `json:"business_reason" db:"business_reason"`
	RequestedDuration    *int                       `json:"requested_duration_hours" db:"requested_duration_hours"` // 小时
	Priority             ApprovalPriority           `json:"priority" db:"priority"`
	IsTemporary          bool                       `json:"is_temporary" db:"is_temporary"`
	AutoRevokeAt         *time.Time                 `json:"auto_revoke_at" db:"auto_revoke_at"`
	
	// 审批状态
	Status               ApprovalStatus             `json:"status" db:"status"`
	WorkflowType         ApprovalWorkflowType       `json:"workflow_type" db:"workflow_type"`
	CurrentStepIndex     int                        `json:"current_step_index" db:"current_step_index"`
	TotalSteps           int                        `json:"total_steps" db:"total_steps"`
	
	// 审批结果
	FinalApproverID      *int                       `json:"final_approver_id" db:"final_approver_id"`
	FinalApproverName    *string                    `json:"final_approver_name" db:"final_approver_name"`
	ApprovedAt           *time.Time                 `json:"approved_at" db:"approved_at"`
	RejectedAt           *time.Time                 `json:"rejected_at" db:"rejected_at"`
	CompletedAt          *time.Time                 `json:"completed_at" db:"completed_at"`
	
	// 元数据
	Metadata             CustomFields               `json:"metadata" db:"metadata"`
	Tags                 []string                   `json:"tags" db:"tags"`
	ExternalRef          *string                    `json:"external_ref" db:"external_ref"`
	
	// 时间戳
	CreatedAt            time.Time                  `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time                  `json:"updated_at" db:"updated_at"`
	ExpiresAt            *time.Time                 `json:"expires_at" db:"expires_at"`
	DeletedAt            *time.Time                 `json:"deleted_at" db:"deleted_at"`
}

// PermissionApprovalStep represents a step in the approval workflow
type PermissionApprovalStep struct {
	ID                 int                  `json:"id" db:"id"`
	RequestID          int                  `json:"request_id" db:"request_id"`
	StepIndex          int                  `json:"step_index" db:"step_index"`
	StepName           string               `json:"step_name" db:"step_name"`
	StepType           string               `json:"step_type" db:"step_type"` // user, role, department, automatic
	
	// 审批人信息
	ApproverID         *int                 `json:"approver_id" db:"approver_id"`
	ApproverName       *string              `json:"approver_name" db:"approver_name"`
	ApproverType       string               `json:"approver_type" db:"approver_type"` // user, role, department
	BackupApproverID   *int                 `json:"backup_approver_id" db:"backup_approver_id"`
	BackupApproverName *string              `json:"backup_approver_name" db:"backup_approver_name"`
	
	// 审批状态
	Status             ApprovalStatus       `json:"status" db:"status"`
	Decision           *string              `json:"decision" db:"decision"` // approve, reject, delegate
	Comments           string               `json:"comments" db:"comments"`
	
	// 时间信息
	StartedAt          *time.Time           `json:"started_at" db:"started_at"`
	CompletedAt        *time.Time           `json:"completed_at" db:"completed_at"`
	DueAt              *time.Time           `json:"due_at" db:"due_at"`
	EscalatedAt        *time.Time           `json:"escalated_at" db:"escalated_at"`
	
	// 配置
	IsRequired         bool                 `json:"is_required" db:"is_required"`
	CanSkip            bool                 `json:"can_skip" db:"can_skip"`
	CanDelegate        bool                 `json:"can_delegate" db:"can_delegate"`
	AutoApproveRules   CustomFields         `json:"auto_approve_rules" db:"auto_approve_rules"`
	
	CreatedAt          time.Time            `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time            `json:"updated_at" db:"updated_at"`
}

// ApprovalWorkflow represents a reusable approval workflow template
type ApprovalWorkflow struct {
	ID                 int                  `json:"id" db:"id"`
	Name               string               `json:"name" db:"name"`
	Description        string               `json:"description" db:"description"`
	WorkflowType       ApprovalWorkflowType `json:"workflow_type" db:"workflow_type"`
	
	// 适用范围
	PermissionCodes    []string             `json:"permission_codes" db:"permission_codes"`
	ResourceTypes      []string             `json:"resource_types" db:"resource_types"`
	DepartmentIDs      []int                `json:"department_ids" db:"department_ids"`
	PriorityLevels     []ApprovalPriority   `json:"priority_levels" db:"priority_levels"`
	
	// 工作流配置
	Steps              []ApprovalWorkflowStep `json:"steps" db:"steps"`
	MaxDurationHours   *int                 `json:"max_duration_hours" db:"max_duration_hours"`
	EscalationHours    *int                 `json:"escalation_hours" db:"escalation_hours"`
	AutoApproveRules   CustomFields         `json:"auto_approve_rules" db:"auto_approve_rules"`
	
	// 元数据
	IsActive           bool                 `json:"is_active" db:"is_active"`
	IsDefault          bool                 `json:"is_default" db:"is_default"`
	CreatedBy          int                  `json:"created_by" db:"created_by"`
	
	CreatedAt          time.Time            `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time            `json:"updated_at" db:"updated_at"`
	DeletedAt          *time.Time           `json:"deleted_at" db:"deleted_at"`
}

// ApprovalWorkflowStep represents a step in a workflow template
type ApprovalWorkflowStep struct {
	StepIndex          int                  `json:"step_index"`
	StepName           string               `json:"step_name"`
	StepType           string               `json:"step_type"`
	ApproverType       string               `json:"approver_type"`
	ApproverID         *int                 `json:"approver_id,omitempty"`
	RoleID             *int                 `json:"role_id,omitempty"`
	DepartmentID       *int                 `json:"department_id,omitempty"`
	IsRequired         bool                 `json:"is_required"`
	CanSkip            bool                 `json:"can_skip"`
	CanDelegate        bool                 `json:"can_delegate"`
	DueDurationHours   *int                 `json:"due_duration_hours"`
	AutoApproveRules   map[string]interface{} `json:"auto_approve_rules,omitempty"`
}

// ApprovalComment represents comments in the approval process
type ApprovalComment struct {
	ID                 int                  `json:"id" db:"id"`
	RequestID          int                  `json:"request_id" db:"request_id"`
	StepID             *int                 `json:"step_id" db:"step_id"`
	CommentType        string               `json:"comment_type" db:"comment_type"` // note, question, decision, system
	AuthorID           int                  `json:"author_id" db:"author_id"`
	AuthorName         string               `json:"author_name" db:"author_name"`
	Content            string               `json:"content" db:"content"`
	IsInternal         bool                 `json:"is_internal" db:"is_internal"`
	ReplyToID          *int                 `json:"reply_to_id" db:"reply_to_id"`
	Attachments        []string             `json:"attachments" db:"attachments"`
	
	CreatedAt          time.Time            `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time            `json:"updated_at" db:"updated_at"`
	DeletedAt          *time.Time           `json:"deleted_at" db:"deleted_at"`
}

// ApprovalDelegation represents delegation of approval authority
type ApprovalDelegation struct {
	ID                 int                  `json:"id" db:"id"`
	DelegatorID        int                  `json:"delegator_id" db:"delegator_id"`
	DelegatorName      string               `json:"delegator_name" db:"delegator_name"`
	DelegateID         int                  `json:"delegate_id" db:"delegate_id"`
	DelegateName       string               `json:"delegate_name" db:"delegate_name"`
	
	// 委托范围
	PermissionCodes    []string             `json:"permission_codes" db:"permission_codes"`
	ResourceTypes      []string             `json:"resource_types" db:"resource_types"`
	DepartmentIDs      []int                `json:"department_ids" db:"department_ids"`
	MaxAmount          *float64             `json:"max_amount" db:"max_amount"`
	
	// 委托设置
	Reason             string               `json:"reason" db:"reason"`
	IsActive           bool                 `json:"is_active" db:"is_active"`
	IsTemporary        bool                 `json:"is_temporary" db:"is_temporary"`
	StartDate          time.Time            `json:"start_date" db:"start_date"`
	EndDate            *time.Time           `json:"end_date" db:"end_date"`
	
	CreatedAt          time.Time            `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time            `json:"updated_at" db:"updated_at"`
	DeletedAt          *time.Time           `json:"deleted_at" db:"deleted_at"`
}

// ApprovalNotification represents notification settings and history
type ApprovalNotification struct {
	ID                 int                  `json:"id" db:"id"`
	RequestID          int                  `json:"request_id" db:"request_id"`
	RecipientID        int                  `json:"recipient_id" db:"recipient_id"`
	RecipientEmail     string               `json:"recipient_email" db:"recipient_email"`
	NotificationType   string               `json:"notification_type" db:"notification_type"` // request_created, approval_needed, approved, rejected, escalated
	Channel            string               `json:"channel" db:"channel"` // email, sms, push, in_app
	Subject            string               `json:"subject" db:"subject"`
	Content            string               `json:"content" db:"content"`
	
	// 状态
	Status             string               `json:"status" db:"status"` // pending, sent, failed, read
	SentAt             *time.Time           `json:"sent_at" db:"sent_at"`
	ReadAt             *time.Time           `json:"read_at" db:"read_at"`
	FailureReason      *string              `json:"failure_reason" db:"failure_reason"`
	RetryCount         int                  `json:"retry_count" db:"retry_count"`
	
	CreatedAt          time.Time            `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time            `json:"updated_at" db:"updated_at"`
}

// ApprovalAuditLog represents audit trail for approval actions
type ApprovalAuditLog struct {
	ID                 int                  `json:"id" db:"id"`
	RequestID          int                  `json:"request_id" db:"request_id"`
	Action             string               `json:"action" db:"action"` // created, submitted, approved, rejected, delegated, escalated, withdrawn
	ActorID            int                  `json:"actor_id" db:"actor_id"`
	ActorName          string               `json:"actor_name" db:"actor_name"`
	ActorType          string               `json:"actor_type" db:"actor_type"` // user, system, api
	
	// 操作详情
	Details            CustomFields         `json:"details" db:"details"`
	OldValue           CustomFields         `json:"old_value" db:"old_value"`
	NewValue           CustomFields         `json:"new_value" db:"new_value"`
	IPAddress          *string              `json:"ip_address" db:"ip_address"`
	UserAgent          *string              `json:"user_agent" db:"user_agent"`
	
	CreatedAt          time.Time            `json:"created_at" db:"created_at"`
}

// API Request/Response Models

// CreateApprovalRequestRequest represents a request to create an approval request
type CreateApprovalRequestRequest struct {
	PermissionCode      string             `json:"permission_code" binding:"required"`
	ResourceType        string             `json:"resource_type" binding:"required"`
	ResourceID          *int               `json:"resource_id"`
	RequestTitle        string             `json:"request_title" binding:"required"`
	Justification       string             `json:"justification" binding:"required"`
	BusinessReason      string             `json:"business_reason"`
	RequestedDuration   *int               `json:"requested_duration_hours"`
	Priority            ApprovalPriority   `json:"priority"`
	IsTemporary         bool               `json:"is_temporary"`
	AutoRevokeAt        *time.Time         `json:"auto_revoke_at"`
	WorkflowID          *int               `json:"workflow_id"`
	Tags                []string           `json:"tags"`
	Metadata            map[string]interface{} `json:"metadata"`
}

// ApprovalDecisionRequest represents an approval decision
type ApprovalDecisionRequest struct {
	Decision      string `json:"decision" binding:"required,oneof=approve reject delegate"`
	Comments      string `json:"comments"`
	DelegateToID  *int   `json:"delegate_to_id"`
}

// ApprovalRequestResponse represents the response for approval requests
type ApprovalRequestResponse struct {
	Request     *PermissionApprovalRequest `json:"request"`
	Steps       []PermissionApprovalStep   `json:"steps,omitempty"`
	Comments    []ApprovalComment          `json:"comments,omitempty"`
	AuditLog    []ApprovalAuditLog         `json:"audit_log,omitempty"`
	Workflow    *ApprovalWorkflow          `json:"workflow,omitempty"`
}

// ApprovalRequestsListResponse represents a paginated list of approval requests
type ApprovalRequestsListResponse struct {
	Requests    []*PermissionApprovalRequest `json:"requests"`
	Total       int                          `json:"total"`
	Page        int                          `json:"page"`
	PageSize    int                          `json:"page_size"`
	HasNext     bool                         `json:"has_next"`
	HasPrev     bool                         `json:"has_prev"`
}

// ApprovalStatistics represents approval system statistics
type ApprovalStatistics struct {
	TotalRequests       int                `json:"total_requests"`
	PendingRequests     int                `json:"pending_requests"`
	ApprovedRequests    int                `json:"approved_requests"`
	RejectedRequests    int                `json:"rejected_requests"`
	AverageApprovalTime float64            `json:"average_approval_time_hours"`
	ApprovalsByPriority map[string]int     `json:"approvals_by_priority"`
	TopApprovers        []ApproverStats    `json:"top_approvers"`
	RecentActivity      []ApprovalActivity `json:"recent_activity"`
}

// ApproverStats represents statistics for an approver
type ApproverStats struct {
	ApproverID   int     `json:"approver_id"`
	ApproverName string  `json:"approver_name"`
	TotalCount   int     `json:"total_count"`
	ApprovedCount int    `json:"approved_count"`
	RejectedCount int    `json:"rejected_count"`
	AvgTimeHours float64 `json:"average_time_hours"`
}

// ApprovalActivity represents recent approval activity
type ApprovalActivity struct {
	RequestID    int        `json:"request_id"`
	RequestTitle string     `json:"request_title"`
	Action       string     `json:"action"`
	ActorName    string     `json:"actor_name"`
	Timestamp    time.Time  `json:"timestamp"`
}