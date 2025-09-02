package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"database/sql"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// DocumentUtilityHandler 文档工具处理器
type DocumentUtilityHandler struct {
	db        database.DB
	logger    *log.Logger
	validator *validator.Validate
}

// NewDocumentUtilityHandler 创建文档工具处理器
func NewDocumentUtilityHandler(db database.DB, logger *log.Logger, validator *validator.Validate) *DocumentUtilityHandler {
	return &DocumentUtilityHandler{
		db:        db,
		logger:    logger,
		validator: validator,
	}
}

// GetDocumentCustomers 获取文档可关联的客户列表
func (h *DocumentUtilityHandler) GetDocumentCustomers(c *gin.Context) {
	sqlDB := h.db.GetDB().(*sql.DB)

	query := `
		SELECT id, name, company_name, type, industry, description 
		FROM customers 
		WHERE deleted_at IS NULL 
		ORDER BY name ASC
	`

	rows, err := sqlDB.Query(query)
	if err != nil {
		h.logger.Printf("Error querying customers: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to query customers", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}
	defer rows.Close()

	var customers []map[string]interface{}

	for rows.Next() {
		var id int
		var name, companyName, customerType, industry, description sql.NullString

		err := rows.Scan(&id, &name, &companyName, &customerType, &industry, &description)
		if err != nil {
			h.logger.Printf("Error scanning customer row: %v", err)
			continue
		}

		customer := map[string]interface{}{
			"id":   id,
			"name": name.String,
		}

		if companyName.Valid {
			customer["company_name"] = companyName.String
		}
		if customerType.Valid {
			customer["type"] = customerType.String
		}
		if industry.Valid {
			customer["industry"] = industry.String
		}
		if description.Valid {
			customer["description"] = description.String
		}

		customers = append(customers, customer)
	}

	response := models.NewSuccessResponse(customers, "Document customers retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetDocumentCategories 获取文档分类列表
func (h *DocumentUtilityHandler) GetDocumentCategories(c *gin.Context) {
	// For now, return a predefined list of categories
	// In production, this might come from a database table
	categories := []map[string]interface{}{
		{
			"id":          1,
			"name":        "合同文件",
			"description": "客户合同、协议等法律文件",
			"color":       "#FF6B35",
		},
		{
			"id":          2,
			"name":        "项目文档",
			"description": "项目相关的技术文档、需求文档",
			"color":       "#4ECDC4",
		},
		{
			"id":          3,
			"name":        "设计稿",
			"description": "UI/UX设计稿、原型图",
			"color":       "#45B7D1",
		},
		{
			"id":          4,
			"name":        "测试报告",
			"description": "软件测试、质量评估报告",
			"color":       "#96CEB4",
		},
		{
			"id":          5,
			"name":        "会议纪要",
			"description": "项目会议、客户沟通记录",
			"color":       "#FFEAA7",
		},
		{
			"id":          6,
			"name":        "财务文件",
			"description": "发票、报价单、财务报表",
			"color":       "#DDA0DD",
		},
		{
			"id":          7,
			"name":        "技术文档",
			"description": "API文档、技术规范、部署文档",
			"color":       "#98D8C8",
		},
		{
			"id":          8,
			"name":        "用户手册",
			"description": "产品使用说明、培训资料",
			"color":       "#F7DC6F",
		},
		{
			"id":          9,
			"name":        "其他",
			"description": "其他类型的文档资料",
			"color":       "#AED6F1",
		},
	}

	response := models.NewSuccessResponse(categories, "Document categories retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetDocumentProjects 获取文档可关联的项目列表 (委托给ProjectHandler)
func (h *DocumentUtilityHandler) GetDocumentProjects(c *gin.Context) {
	// This functionality is already handled by ProjectHandler.GetDocumentProjects
	// This is a placeholder that could redirect or delegate
	response := models.NewErrorResponse(models.ErrCodeNotFound, "This endpoint is handled by ProjectHandler", nil)
	c.JSON(http.StatusNotFound, response)
}

// ValidateDocumentAssociation 验证文档关联关系
func (h *DocumentUtilityHandler) ValidateDocumentAssociation(c *gin.Context) {
	var req struct {
		DocumentID int `json:"document_id" validate:"required"`
		ProjectID  int `json:"project_id,omitempty"`
		CustomerID int `json:"customer_id,omitempty"`
		TaskID     int `json:"task_id,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	if err := h.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Validate that at least one association is provided
	if req.ProjectID == 0 && req.CustomerID == 0 && req.TaskID == 0 {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "At least one association (project, customer, or task) is required", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	validationResult := map[string]interface{}{
		"valid":        true,
		"document_id":  req.DocumentID,
		"associations": map[string]interface{}{},
	}

	associations := validationResult["associations"].(map[string]interface{})

	// Validate project association
	if req.ProjectID > 0 {
		project, err := h.db.Projects().GetByID(c.Request.Context(), req.ProjectID)
		if err != nil {
			associations["project"] = map[string]interface{}{
				"valid": false,
				"error": "Project not found",
			}
		} else {
			associations["project"] = map[string]interface{}{
				"valid": true,
				"name":  project.Name,
			}
		}
	}

	// Validate customer association
	if req.CustomerID > 0 {
		customer, err := h.db.Customers().GetByID(c.Request.Context(), req.CustomerID)
		if err != nil {
			associations["customer"] = map[string]interface{}{
				"valid": false,
				"error": "Customer not found",
			}
		} else {
			associations["customer"] = map[string]interface{}{
				"valid": true,
				"name":  customer.Name,
			}
		}
	}

	// Validate task association
	if req.TaskID > 0 {
		task, err := h.db.Tasks().GetByID(c.Request.Context(), req.TaskID)
		if err != nil {
			associations["task"] = map[string]interface{}{
				"valid": false,
				"error": "Task not found",
			}
		} else {
			associations["task"] = map[string]interface{}{
				"valid": true,
				"title": task.Title,
			}
		}
	}

	response := models.NewSuccessResponse(validationResult, "Document association validation completed")
	c.JSON(http.StatusOK, response)
}
