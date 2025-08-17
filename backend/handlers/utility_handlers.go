package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"database/sql"
	"log"

	"github.com/go-playground/validator/v10"
)

// UtilityHandler 通用工具处理器
type UtilityHandler struct {
	db        database.DB
	logger    *log.Logger
	validator *validator.Validate
}

// NewUtilityHandler 创建通用工具处理器
func NewUtilityHandler(db database.DB, logger *log.Logger, validator *validator.Validate) *UtilityHandler {
	return &UtilityHandler{
		db:        db,
		logger:    logger,
		validator: validator,
	}
}

// CalculateTaskDepth 计算任务深度
func (h *UtilityHandler) CalculateTaskDepth(ctx context.Context, task *models.Task) int {
	if task.ParentID == nil {
		return 0
	}
	
	depth := 0
	currentParentID := *task.ParentID
	
	// Traverse up the parent chain to calculate depth
	for currentParentID != 0 && depth < 10 { // Prevent infinite loops
		parent, err := h.db.Tasks().GetByID(ctx, currentParentID)
		if err != nil {
			h.logger.Printf("Error getting parent task %d: %v", currentParentID, err)
			break
		}
		
		depth++
		if parent.ParentID == nil {
			break
		}
		currentParentID = *parent.ParentID
	}
	
	return depth
}

// CreateProjectCompanyAssociation 创建项目-公司关联
func (h *UtilityHandler) CreateProjectCompanyAssociation(ctx context.Context, projectID, companyID int, isPrimary bool) error {
	query := `
		INSERT INTO project_companies (project_id, company_id, is_primary, created_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW())
		ON CONFLICT (project_id, company_id) 
		DO UPDATE SET is_primary = $3, updated_at = NOW()
	`
	
	db := h.db.GetDB().(*sql.DB)
	_, err := db.ExecContext(ctx, query, projectID, companyID, isPrimary)
	if err != nil {
		h.logger.Printf("Error creating project-company association: %v", err)
		return err
	}
	
	return nil
}

// CreateProjectUserAssignment 创建项目-用户分配
func (h *UtilityHandler) CreateProjectUserAssignment(ctx context.Context, projectID, userID int, role string, isPrimary bool) error {
	query := `
		INSERT INTO project_users (project_id, user_id, role, is_primary, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
		ON CONFLICT (project_id, user_id)
		DO UPDATE SET role = $3, is_primary = $4, updated_at = NOW()
	`
	
	db := h.db.GetDB().(*sql.DB)
	_, err := db.ExecContext(ctx, query, projectID, userID, role, isPrimary)
	if err != nil {
		h.logger.Printf("Error creating project-user assignment: %v", err)
		return err
	}
	
	return nil
}