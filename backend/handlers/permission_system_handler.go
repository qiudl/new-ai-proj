package handlers

import (
	"ai-project-backend/models"
	"ai-project-backend/services"
	"context"
	"database/sql"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// PermissionSystemHandler 权限系统管理处理器
type PermissionSystemHandler struct {
	permissionService *services.PermissionSystemService
	logger            *log.Logger
	validator         *validator.Validate
}

// NewPermissionSystemHandler 创建新的权限系统处理器
func NewPermissionSystemHandler(db *sql.DB, logger *log.Logger, validator *validator.Validate) *PermissionSystemHandler {
	return &PermissionSystemHandler{
		permissionService: services.NewPermissionSystemService(db, logger),
		logger:            logger,
		validator:         validator,
	}
}

// InitializePermissionSystemRequest 初始化权限系统请求
type InitializePermissionSystemRequest struct {
	ForceReinit bool `json:"force_reinit" validate:"omitempty"` // 是否强制重新初始化
}

// InitializePermissionSystem 初始化权限系统基础数据
// @Summary 初始化权限系统基础数据
// @Description 初始化所有系统权限点，包括核心模块权限
// @Tags 权限系统管理
// @Accept json
// @Produce json
// @Param request body InitializePermissionSystemRequest true "初始化请求"
// @Success 200 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/system/permissions/initialize [post]
func (h *PermissionSystemHandler) InitializePermissionSystem(c *gin.Context) {
	var req InitializePermissionSystemRequest
	
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "请求参数错误", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	if err := h.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeValidation, "参数验证失败", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 60*time.Second)
	defer cancel()

	// 执行权限系统初始化
	if err := h.permissionService.InitializePermissionSystem(ctx); err != nil {
		h.logger.Printf("权限系统初始化失败: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "权限系统初始化失败", err.Error())
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// 获取初始化结果统计
	stats, err := h.permissionService.GetPermissionStatistics(ctx)
	if err != nil {
		h.logger.Printf("获取权限统计失败: %v", err)
		stats = map[string]interface{}{
			"note": "统计信息获取失败，但初始化已完成",
		}
	}

	result := map[string]interface{}{
		"message": "权限系统基础数据初始化完成",
		"statistics": stats,
		"initialized_at": time.Now(),
	}

	response := models.NewSuccessResponse(result, "权限系统初始化成功")
	c.JSON(http.StatusOK, response)
}

// GetPermissionModules 获取权限模块列表
// @Summary 获取权限模块列表
// @Description 获取所有权限模块的定义信息
// @Tags 权限系统管理
// @Accept json
// @Produce json
// @Success 200 {object} models.SuccessResponse
// @Router /api/v1/system/permissions/modules [get]
func (h *PermissionSystemHandler) GetPermissionModules(c *gin.Context) {
	modules := h.permissionService.GetPermissionModules()
	
	result := map[string]interface{}{
		"modules": modules,
		"total_count": len(modules),
	}

	response := models.NewSuccessResponse(result, "获取权限模块列表成功")
	c.JSON(http.StatusOK, response)
}

// GetPermissionOperationTypes 获取权限操作类型列表
// @Summary 获取权限操作类型列表
// @Description 获取所有权限操作类型的定义信息
// @Tags 权限系统管理
// @Accept json
// @Produce json
// @Success 200 {object} models.SuccessResponse
// @Router /api/v1/system/permissions/operation-types [get]
func (h *PermissionSystemHandler) GetPermissionOperationTypes(c *gin.Context) {
	operationTypes := h.permissionService.GetPermissionOperationTypes()
	
	result := map[string]interface{}{
		"operation_types": operationTypes,
		"total_count": len(operationTypes),
	}

	response := models.NewSuccessResponse(result, "获取权限操作类型列表成功")
	c.JSON(http.StatusOK, response)
}

// GetPermissionCodeRules 获取权限编码规范
// @Summary 获取权限编码规范
// @Description 获取权限编码的规范和示例
// @Tags 权限系统管理
// @Accept json
// @Produce json
// @Success 200 {object} models.SuccessResponse
// @Router /api/v1/system/permissions/code-rules [get]
func (h *PermissionSystemHandler) GetPermissionCodeRules(c *gin.Context) {
	codeRules := h.permissionService.GetPermissionCodeRules()
	
	result := map[string]interface{}{
		"code_rules": codeRules,
		"total_count": len(codeRules),
	}

	response := models.NewSuccessResponse(result, "获取权限编码规范成功")
	c.JSON(http.StatusOK, response)
}

// GetPermissionsByCategory 根据分类获取权限列表
// @Summary 根据分类获取权限列表
// @Description 获取指定分类的权限列表
// @Tags 权限系统管理
// @Accept json
// @Produce json
// @Param category path string true "权限分类"
// @Success 200 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/system/permissions/category/{category} [get]
func (h *PermissionSystemHandler) GetPermissionsByCategory(c *gin.Context) {
	category := c.Param("category")
	if category == "" {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "权限分类参数不能为空", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	permissions, err := h.permissionService.GetPermissionsByCategory(ctx, category)
	if err != nil {
		h.logger.Printf("获取权限列表失败: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "获取权限列表失败", err.Error())
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	result := map[string]interface{}{
		"category": category,
		"permissions": permissions,
		"total_count": len(permissions),
	}

	response := models.NewSuccessResponse(result, "获取权限列表成功")
	c.JSON(http.StatusOK, response)
}

// GetAllPermissions 获取所有权限列表
// @Summary 获取所有权限列表
// @Description 获取系统中所有活跃权限的列表
// @Tags 权限系统管理
// @Accept json
// @Produce json
// @Param page query int false "页码" default(1)
// @Param limit query int false "每页数量" default(50)
// @Param category query string false "权限分类过滤"
// @Param risk_level query string false "风险级别过滤"
// @Success 200 {object} models.SuccessResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/system/permissions [get]
func (h *PermissionSystemHandler) GetAllPermissions(c *gin.Context) {
	// 解析查询参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	category := c.Query("category")
	riskLevel := c.Query("risk_level")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	var permissions []models.Permission
	var err error

	if category != "" {
		permissions, err = h.permissionService.GetPermissionsByCategory(ctx, category)
	} else {
		permissions, err = h.permissionService.GetAllPermissions(ctx)
	}

	if err != nil {
		h.logger.Printf("获取权限列表失败: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "获取权限列表失败", err.Error())
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// 按风险级别过滤
	if riskLevel != "" {
		filtered := []models.Permission{}
		for _, perm := range permissions {
			if perm.RiskLevel == riskLevel {
				filtered = append(filtered, perm)
			}
		}
		permissions = filtered
	}

	// 简单分页处理
	totalCount := len(permissions)
	startIdx := (page - 1) * limit
	endIdx := startIdx + limit

	if startIdx >= totalCount {
		permissions = []models.Permission{}
	} else {
		if endIdx > totalCount {
			endIdx = totalCount
		}
		permissions = permissions[startIdx:endIdx]
	}

	result := map[string]interface{}{
		"permissions": permissions,
		"pagination": map[string]interface{}{
			"page":        page,
			"limit":       limit,
			"total_count": totalCount,
			"total_pages": (totalCount + limit - 1) / limit,
		},
		"filters": map[string]interface{}{
			"category":   category,
			"risk_level": riskLevel,
		},
	}

	response := models.NewSuccessResponse(result, "获取权限列表成功")
	c.JSON(http.StatusOK, response)
}

// ValidatePermissionCodeRequest 验证权限编码请求
type ValidatePermissionCodeRequest struct {
	Code string `json:"code" validate:"required,min=3,max=100"`
}

// ValidatePermissionCode 验证权限编码
// @Summary 验证权限编码
// @Description 验证权限编码是否符合规范
// @Tags 权限系统管理
// @Accept json
// @Produce json
// @Param request body ValidatePermissionCodeRequest true "权限编码验证请求"
// @Success 200 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Router /api/v1/system/permissions/validate-code [post]
func (h *PermissionSystemHandler) ValidatePermissionCode(c *gin.Context) {
	var req ValidatePermissionCodeRequest
	
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "请求参数错误", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	if err := h.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeValidation, "参数验证失败", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// 验证权限编码
	err := h.permissionService.ValidatePermissionCode(req.Code)
	
	result := map[string]interface{}{
		"code": req.Code,
		"valid": err == nil,
	}

	if err != nil {
		result["error"] = err.Error()
		result["suggestions"] = []string{
			"确保格式为: MODULE_RESOURCE_ACTION(_SCOPE?)",
			"使用标准模块前缀: SYSTEM, USER, ROLE, PROJECT, TASK, FINANCE 等",
			"使用标准操作类型: CREATE, READ, UPDATE, DELETE, MANAGE 等",
			"权限编码长度应在3-100个字符之间",
		}
	}

	var message string
	if err == nil {
		message = "权限编码验证通过"
	} else {
		message = "权限编码验证失败"
	}

	response := models.NewSuccessResponse(result, message)
	c.JSON(http.StatusOK, response)
}

// GetPermissionStatistics 获取权限统计信息
// @Summary 获取权限统计信息
// @Description 获取权限系统的统计信息，包括总数、分布等
// @Tags 权限系统管理
// @Accept json
// @Produce json
// @Success 200 {object} models.SuccessResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/system/permissions/statistics [get]
func (h *PermissionSystemHandler) GetPermissionStatistics(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	statistics, err := h.permissionService.GetPermissionStatistics(ctx)
	if err != nil {
		h.logger.Printf("获取权限统计信息失败: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "获取权限统计信息失败", err.Error())
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	result := map[string]interface{}{
		"statistics": statistics,
		"generated_at": time.Now(),
	}

	response := models.NewSuccessResponse(result, "获取权限统计信息成功")
	c.JSON(http.StatusOK, response)
}

// PermissionSystemStatus 权限系统状态
type PermissionSystemStatus struct {
	IsInitialized      bool                   `json:"is_initialized"`
	TotalPermissions   int                    `json:"total_permissions"`
	SystemPermissions  int                    `json:"system_permissions"`
	CustomPermissions  int                    `json:"custom_permissions"`
	LastInitialized    *time.Time             `json:"last_initialized,omitempty"`
	ModuleDistribution map[string]int         `json:"module_distribution"`
	RiskDistribution   map[string]int         `json:"risk_distribution"`
}

// GetPermissionSystemStatus 获取权限系统状态
// @Summary 获取权限系统状态
// @Description 获取权限系统的初始化状态和基本信息
// @Tags 权限系统管理
// @Accept json
// @Produce json
// @Success 200 {object} models.SuccessResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/system/permissions/status [get]
func (h *PermissionSystemHandler) GetPermissionSystemStatus(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	statistics, err := h.permissionService.GetPermissionStatistics(ctx)
	if err != nil {
		h.logger.Printf("获取权限统计信息失败: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "获取权限系统状态失败", err.Error())
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// 构建权限系统状态
	status := PermissionSystemStatus{
		IsInitialized:     statistics["total_permissions"].(int) > 0,
		TotalPermissions:  statistics["total_permissions"].(int),
		SystemPermissions: statistics["system_permissions"].(int),
		CustomPermissions: statistics["total_permissions"].(int) - statistics["system_permissions"].(int),
	}

	if lastUpdated, ok := statistics["last_updated"].(time.Time); ok {
		status.LastInitialized = &lastUpdated
	}

	if riskDist, ok := statistics["risk_level_distribution"].(map[string]int); ok {
		status.RiskDistribution = riskDist
	}

	if categoryDist, ok := statistics["category_distribution"].(map[string]int); ok {
		status.ModuleDistribution = categoryDist
	}

	result := map[string]interface{}{
		"status": status,
		"check_time": time.Now(),
	}

	response := models.NewSuccessResponse(result, "获取权限系统状态成功")
	c.JSON(http.StatusOK, response)
}

// PermissionBatchValidationRequest 批量权限验证请求
type PermissionBatchValidationRequest struct {
	Codes []string `json:"codes" validate:"required,min=1,max=100,dive,required"`
}

// BatchValidatePermissionCodes 批量验证权限编码
// @Summary 批量验证权限编码
// @Description 批量验证多个权限编码是否符合规范
// @Tags 权限系统管理
// @Accept json
// @Produce json
// @Param request body PermissionBatchValidationRequest true "批量权限编码验证请求"
// @Success 200 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Router /api/v1/system/permissions/batch-validate-codes [post]
func (h *PermissionSystemHandler) BatchValidatePermissionCodes(c *gin.Context) {
	var req PermissionBatchValidationRequest
	
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "请求参数错误", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	if err := h.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeValidation, "参数验证失败", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// 批量验证权限编码
	results := make([]map[string]interface{}, 0, len(req.Codes))
	validCount := 0
	
	for _, code := range req.Codes {
		err := h.permissionService.ValidatePermissionCode(code)
		result := map[string]interface{}{
			"code":  code,
			"valid": err == nil,
		}
		
		if err != nil {
			result["error"] = err.Error()
		} else {
			validCount++
		}
		
		results = append(results, result)
	}

	summary := map[string]interface{}{
		"total_codes":   len(req.Codes),
		"valid_codes":   validCount,
		"invalid_codes": len(req.Codes) - validCount,
		"success_rate":  float64(validCount) / float64(len(req.Codes)) * 100,
	}

	result := map[string]interface{}{
		"results": results,
		"summary": summary,
	}

	response := models.NewSuccessResponse(result, "批量权限编码验证完成")
	c.JSON(http.StatusOK, response)
}

// ExportPermissions 导出权限数据
// @Summary 导出权限数据
// @Description 导出系统权限数据为JSON格式
// @Tags 权限系统管理
// @Accept json
// @Produce json
// @Param format query string false "导出格式" default(json) Enums(json,csv)
// @Param category query string false "权限分类过滤"
// @Success 200 {object} models.SuccessResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/system/permissions/export [get]
func (h *PermissionSystemHandler) ExportPermissions(c *gin.Context) {
	format := c.DefaultQuery("format", "json")
	category := c.Query("category")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	var permissions []models.Permission
	var err error

	if category != "" {
		permissions, err = h.permissionService.GetPermissionsByCategory(ctx, category)
	} else {
		permissions, err = h.permissionService.GetAllPermissions(ctx)
	}

	if err != nil {
		h.logger.Printf("获取权限数据失败: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "获取权限数据失败", err.Error())
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	exportData := map[string]interface{}{
		"exported_at":     time.Now(),
		"total_count":     len(permissions),
		"export_format":   format,
		"category_filter": category,
		"permissions":     permissions,
		"metadata": map[string]interface{}{
			"version": "1.0",
			"schema":  "ai-project-permission-system",
			"modules": h.permissionService.GetPermissionModules(),
		},
	}

	// 设置下载文件头
	filename := "permissions_export"
	if category != "" {
		filename += "_" + category
	}
	filename += "_" + time.Now().Format("20060102_150405")

	switch format {
	case "json":
		c.Header("Content-Disposition", "attachment; filename="+filename+".json")
		c.Header("Content-Type", "application/json")
		response := models.NewSuccessResponse(exportData, "权限数据导出成功")
		c.JSON(http.StatusOK, response)
	default:
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "不支持的导出格式", format)
		c.JSON(http.StatusBadRequest, response)
	}
}
