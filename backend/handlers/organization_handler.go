package handlers

import (
	"ai-project-backend/database"
	"database/sql"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// CreateDepartmentRequest 创建部门请求
type CreateDepartmentRequest struct {
	Name        string  `json:"name" binding:"required"`
	ParentID    *int    `json:"parent_id"`
	ManagerID   *int    `json:"manager_id"`
	Description *string `json:"description"`
	Status      string  `json:"status"`
}

// UpdateDepartmentRequest 更新部门请求
type UpdateDepartmentRequest struct {
	Name        *string `json:"name"`
	ParentID    *int    `json:"parent_id"`
	ManagerID   *int    `json:"manager_id"`
	Description *string `json:"description"`
	Status      *string `json:"status"`
}

// OrganizationHandler 组织管理处理器
type OrganizationHandler struct{
	deptRepo *database.DepartmentRepository
	db       database.DB
}

// NewOrganizationHandler 创建组织处理器实例
func NewOrganizationHandler(db database.DB) *OrganizationHandler {
	sqlDB := db.GetDB()
	return &OrganizationHandler{
		deptRepo: database.NewDepartmentRepository(sqlDB.(*sql.DB)),
		db:       db,
	}
}

// GetDepartments 获取部门列表（树形结构）
func (h *OrganizationHandler) GetDepartments(c *gin.Context) {
	// 获取company_id参数，用于多租户支持
	companyIDStr := c.Query("company_id")
	if companyIDStr == "" {
		companyIDStr = "2" // 默认使用测试企业ID
	}
	companyID, err := strconv.Atoi(companyIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid company ID",
		})
		return
	}

	departments, err := h.deptRepo.GetAllByCompany(companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "获取部门列表失败",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    departments,
	})
}

// GetDepartment 获取单个部门详情
func (h *OrganizationHandler) GetDepartment(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid department ID",
		})
		return
	}

	// 获取company_id参数
	companyIDStr := c.Query("company_id")
	if companyIDStr == "" {
		companyIDStr = "2" // 默认使用测试企业ID
	}
	companyID, err := strconv.Atoi(companyIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid company ID",
		})
		return
	}

	department, err := h.deptRepo.GetByID(id, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "获取部门信息失败",
		})
		return
	}
	
	if department == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "部门不存在",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    department,
	})
}

// CreateDepartment 创建部门
func (h *OrganizationHandler) CreateDepartment(c *gin.Context) {
	var req CreateDepartmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// 获取company_id参数
	companyIDStr := c.Query("company_id")
	if companyIDStr == "" {
		companyIDStr = "2" // 默认使用测试企业ID
	}
	companyID, err := strconv.Atoi(companyIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid company ID",
		})
		return
	}

	// 创建部门对象
	department := &database.Department{
		CompanyID:      companyID,
		Name:           req.Name,
		ParentIDPtr:    req.ParentID,
		ManagerIDPtr:   req.ManagerID,
		DescriptionPtr: req.Description,
		Status:         "active",
		EmployeeCount:  0,
	}

	if req.Status != "" {
		department.Status = req.Status
	}

	// 保存到数据库
	createdDept, err := h.deptRepo.Create(department)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "创建部门失败",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    createdDept,
		"message": "部门创建成功",
	})
}

// UpdateDepartment 更新部门
func (h *OrganizationHandler) UpdateDepartment(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid department ID",
		})
		return
	}

	var req UpdateDepartmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// 构建更新字段
	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.ParentID != nil {
		updates["parent_id"] = *req.ParentID
	}
	if req.ManagerID != nil {
		updates["manager_id"] = *req.ManagerID
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}

	// 获取company_id参数
	companyIDStr := c.Query("company_id")
	if companyIDStr == "" {
		companyIDStr = "2" // 默认使用测试企业ID
	}
	companyID, err := strconv.Atoi(companyIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid company ID",
		})
		return
	}

	// 更新数据库
	updatedDept, err := h.deptRepo.Update(id, companyID, updates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "更新部门失败",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    updatedDept,
		"message": "部门更新成功",
	})
}

// DeleteDepartment 删除部门
func (h *OrganizationHandler) DeleteDepartment(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid department ID",
		})
		return
	}

	// 获取company_id参数
	companyIDStr := c.Query("company_id")
	if companyIDStr == "" {
		companyIDStr = "2" // 默认使用测试企业ID
	}
	companyID, err := strconv.Atoi(companyIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid company ID",
		})
		return
	}

	// 删除部门
	err = h.deptRepo.Delete(id, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "删除部门失败",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "部门删除成功",
	})
}

// GetDepartmentEmployees 获取部门员工列表
func (h *OrganizationHandler) GetDepartmentEmployees(c *gin.Context) {
	idStr := c.Param("id")
	departmentID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid department ID",
		})
		return
	}

	// 从用户表获取部门员工
	// 注意：这里假设users表有department_id字段
	// 如果没有，需要创建员工表或修改用户表
	employees := []gin.H{}
	
	// TODO: 实现从数据库获取员工的逻辑
	// 这里返回空数组作为占位
	_ = departmentID

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    employees,
	})
}

// GetAllEmployees 获取所有员工列表
func (h *OrganizationHandler) GetAllEmployees(c *gin.Context) {
	// TODO: 实现获取所有员工的逻辑
	employees := []gin.H{}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    employees,
	})
}

// GetAvailableManagers 获取可用经理列表
func (h *OrganizationHandler) GetAvailableManagers(c *gin.Context) {
	// 暂时返回空数组，后续可以从用户表获取管理员用户
	managers := []gin.H{
		{
			"id":       1,
			"name":     "Admin",
			"email":    "admin@example.com",
			"position": "System Admin",
			"status":   "active",
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    managers,
	})
}

// GetOrganizationStats 获取组织统计信息
func (h *OrganizationHandler) GetOrganizationStats(c *gin.Context) {
	// 获取company_id参数
	companyIDStr := c.Query("company_id")
	if companyIDStr == "" {
		companyIDStr = "2" // 默认使用测试企业ID
	}
	companyID, err := strconv.Atoi(companyIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid company ID",
		})
		return
	}

	stats, err := h.deptRepo.GetStatsByCompany(companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "获取统计信息失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}