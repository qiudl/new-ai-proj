// 企业更新问题修复方案

## 问题分析

根据调试结果，问题在于后端的 CompanyRequest 模型在更新操作中的验证逻辑不正确：

1. CompanyName 字段标记为 `required`，但更新时应该是可选的
2. 当前端发送部分更新数据时，验证失败或处理不当
3. 导致不必要的名称唯一性检查触发

## 修复方案

### 方案1: 创建专门的更新请求模型 (推荐)

在 `backend/models/company.go` 中添加：

```go
// CompanyUpdateRequest represents a request to update a company (all fields optional)
type CompanyUpdateRequest struct {
	CompanyName          *string    `json:"company_name" validate:"omitempty,min=1,max=255"`
	CompanyCode          *string    `json:"company_code"`
	Industry             *string    `json:"industry"`
	CompanyType          *string    `json:"company_type" validate:"omitempty,oneof=limited_company joint_stock individual partnership"`
	BusinessLicense      *string    `json:"business_license"`
	TaxNumber            *string    `json:"tax_number"`
	LegalRepresentative  *string    `json:"legal_representative"`
	
	Address              *string    `json:"address"`
	City                 *string    `json:"city"`
	Province             *string    `json:"province"`
	PostalCode           *string    `json:"postal_code"`
	Website              *string    `json:"website" validate:"omitempty,url"`
	MainPhone            *string    `json:"main_phone"`
	MainEmail            *string    `json:"main_email" validate:"omitempty,email"`
	
	Status               *string    `json:"status" validate:"omitempty,oneof=active inactive potential suspended"`
	Priority             *string    `json:"priority" validate:"omitempty,oneof=high medium low"`
	AnnualContractValue  *float64   `json:"annual_contract_value" validate:"omitempty,min=0"`
	StartDate            *time.Time `json:"start_date"`
	
	EmployeeCount        *int       `json:"employee_count" validate:"omitempty,min=0"`
	CompanySize          *string    `json:"company_size" validate:"omitempty,oneof=startup small medium large enterprise"`
}
```

然后修改 `backend/handlers/company_handlers.go` 中的 UpdateCompany 函数：

```go
func (h *CompanyHandler) UpdateCompany(c *gin.Context) {
	companyIDStr := c.Param("id")
	companyID, err := strconv.Atoi(companyIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid company ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req models.CompanyUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Printf("Error binding JSON request: %v", err)
		response := models.NewErrorResponse(models.ErrCodeBadRequest, fmt.Sprintf("Invalid request body: %v", err), nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get existing company
	existingCompany, err := h.db.Companies().GetByID(c.Request.Context(), companyID)
	if err != nil {
		if err.Error() == "company not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Company not found", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		h.logger.Printf("Error getting company: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve company", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Check if company name is being changed and if the new name already exists
	if req.CompanyName != nil && *req.CompanyName != existingCompany.CompanyName {
		// Check if the new company name already exists
		companies, _, err := h.db.Companies().List(c.Request.Context(), 1000, 0, map[string]interface{}{
			"company_name": *req.CompanyName,
		})
		if err != nil {
			h.logger.Printf("Error checking company name uniqueness: %v", err)
		} else if len(companies) > 0 {
			// Check if any of the found companies has a different ID
			for _, company := range companies {
				if company.ID != companyID {
					response := models.NewErrorResponse(models.ErrCodeBadRequest, 
						"Company name already exists. Please choose a different name.", nil)
					c.JSON(http.StatusBadRequest, response)
					return
				}
			}
		}
	}

	// Update company fields only if provided in request
	if req.CompanyName != nil {
		existingCompany.CompanyName = *req.CompanyName
	}
	if req.CompanyCode != nil {
		existingCompany.CompanyCode = req.CompanyCode
	}
	if req.Industry != nil {
		existingCompany.Industry = req.Industry
	}
	if req.CompanyType != nil {
		existingCompany.CompanyType = *req.CompanyType
	}
	// ... 继续处理其他字段

	userID := 1 // TODO: Get from authenticated user context
	existingCompany.UpdatedBy = &userID

	// Update company in database
	updatedCompany, err := h.db.Companies().Update(c.Request.Context(), existingCompany)
	if err != nil {
		h.logger.Printf("Error updating company: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update company", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(updatedCompany.ToResponse(), "Company updated successfully")
	c.JSON(http.StatusOK, response)
}
```

### 方案2: 修改验证逻辑 (简单修复)

如果不想添加新模型，可以在 UpdateCompany 函数中跳过验证，或者使用条件验证。

## 前端确认

确保前端 CompanyService 正确发送数据格式（已确认正确）。

## 测试

修复后应该能够：
1. 发送部分更新数据（如只更新industry）
2. 发送完整数据但保持名称不变
3. 正确处理名称修改的唯一性检查

## 实施步骤

1. 备份现有文件
2. 添加 CompanyUpdateRequest 模型
3. 修改 UpdateCompany 函数
4. 测试各种更新场景
5. 确认前端编辑页面正常工作
