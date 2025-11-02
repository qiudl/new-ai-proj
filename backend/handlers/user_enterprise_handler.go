package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// UserEnterpriseHandler 用户企业管理Handler
type UserEnterpriseHandler struct {
	db database.DB
}

// NewUserEnterpriseHandler 创建用户企业管理Handler
func NewUserEnterpriseHandler(db database.DB) *UserEnterpriseHandler {
	return &UserEnterpriseHandler{db: db}
}

// UpdateUserEnterpriseRequest 更新用户企业信息请求
type UpdateUserEnterpriseRequest struct {
	CompanyID        *int    `json:"company_id"`         // 旧模型 company_id
	EnterpriseID     *int    `json:"enterprise_id"`      // 新模型 enterprise_id
	DepartmentID     *int    `json:"department_id"`      // 部门ID
	Position         *string `json:"position"`           // 职位
	SyncToEnterprise bool    `json:"sync_to_enterprise"` // 是否同步到enterprise_users表
}

// UpdateUserEnterprise 更新用户企业信息
// @Summary 更新用户企业归属
// @Description 超级管理员可以修改任何用户的企业归属，企业管理员只能管理本企业用户
// @Tags 用户管理
// @Accept json
// @Produce json
// @Param id path int true "用户ID"
// @Param request body UpdateUserEnterpriseRequest true "企业信息"
// @Success 200 {object} models.Response
// @Failure 403 {object} models.Response "权限不足"
// @Failure 404 {object} models.Response "用户不存在"
// @Router /api/v1/users/{id}/enterprise [put]
func (h *UserEnterpriseHandler) UpdateUserEnterprise(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrCodeBadRequest,
			"Invalid user ID",
			err.Error(),
		))
		return
	}

	// 解析请求
	var req UpdateUserEnterpriseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrCodeBadRequest,
			"Invalid request body",
			err.Error(),
		))
		return
	}

	// 权限检查
	currentUserID := c.GetInt("user_id")
	currentUserType := c.GetString("user_type")
	currentRole := c.GetString("user_role")

	// 检查是否为超级管理员
	isSuperAdmin := currentUserType == "system" && currentRole == "admin"

	if !isSuperAdmin {
		// 非超级管理员不能修改用户企业信息
		c.JSON(http.StatusForbidden, models.NewErrorResponse(
			models.ErrCodeAuthorization,
			"Permission denied",
			"Only super admin can modify user enterprise information",
		))
		return
	}

	// 验证用户是否存在
	var existingUser models.User
	err = h.db.QueryRow(`
		SELECT id, username, email, user_type
		FROM users
		WHERE id = $1 AND deleted_at IS NULL
	`, userID).Scan(&existingUser.ID, &existingUser.Username, &existingUser.Email, &existingUser.UserType)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrCodeNotFound,
			"User not found",
			"User does not exist",
		))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrCodeInternal,
			"Failed to query user",
			err.Error(),
		))
		return
	}

	// 开启事务
	tx, err := h.db.GetDB().(*sql.DB).Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrCodeInternal,
			"Failed to start transaction",
			err.Error(),
		))
		return
	}
	defer tx.Rollback()

	updatedFields := []string{}

	// 1. 更新 users 表的 company_id (兼容旧模型)
	if req.CompanyID != nil {
		_, err = tx.Exec(`
			UPDATE users
			SET company_id = $1, updated_at = NOW()
			WHERE id = $2
		`, req.CompanyID, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
				models.ErrCodeInternal,
				"Failed to update user company_id",
				err.Error(),
			))
			return
		}
		updatedFields = append(updatedFields, "company_id")
		log.Printf("[UserEnterprise] Updated company_id=%d for user_id=%d", *req.CompanyID, userID)
	}

	// 2. 处理 enterprise_users 表
	if req.SyncToEnterprise && req.EnterpriseID != nil {
		// 查询是否已存在 enterprise_users 记录
		var existingEUID sql.NullInt64
		err = tx.QueryRow(`
			SELECT id FROM enterprise_users
			WHERE user_id = $1 AND deleted_at IS NULL
		`, userID).Scan(&existingEUID)

		if err == sql.ErrNoRows || !existingEUID.Valid {
			// 创建新记录
			var newEUID int
			err = tx.QueryRow(`
				INSERT INTO enterprise_users (
					enterprise_id, user_id, username, email, name,
					department_id, position, status, created_at, updated_at
				)
				SELECT
					$1, u.id, u.username, u.email,
					COALESCE(u.profile->>'name', u.username),
					$2, $3, 'active', NOW(), NOW()
				FROM users u
				WHERE u.id = $4
				RETURNING id
			`, req.EnterpriseID, req.DepartmentID, req.Position, userID).Scan(&newEUID)

			if err != nil {
				c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
					models.ErrCodeInternal,
					"Failed to create enterprise_users record",
					err.Error(),
				))
				return
			}
			updatedFields = append(updatedFields, "enterprise_users(created)")
			log.Printf("[UserEnterprise] Created enterprise_users record id=%d for user_id=%d", newEUID, userID)
		} else if err == nil {
			// 更新现有记录
			_, err = tx.Exec(`
				UPDATE enterprise_users
				SET enterprise_id = $1,
					department_id = $2,
					position = $3,
					updated_at = NOW()
				WHERE user_id = $4 AND deleted_at IS NULL
			`, req.EnterpriseID, req.DepartmentID, req.Position, userID)

			if err != nil {
				c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
					models.ErrCodeInternal,
					"Failed to update enterprise_users record",
					err.Error(),
				))
				return
			}
			updatedFields = append(updatedFields, "enterprise_users(updated)")
			log.Printf("[UserEnterprise] Updated enterprise_users for user_id=%d", userID)
		} else {
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
				models.ErrCodeInternal,
				"Failed to query enterprise_users",
				err.Error(),
			))
			return
		}
	}

	// 3. 记录审计日志
	auditDetails := fmt.Sprintf("Updated enterprise info for user %s (id=%d): company_id=%v, enterprise_id=%v, department_id=%v, position=%v",
		existingUser.Username, userID, req.CompanyID, req.EnterpriseID, req.DepartmentID, req.Position)

	_, err = tx.Exec(`
		INSERT INTO audit_logs (
			user_id, action, resource_type, resource_id,
			details, ip_address, user_agent, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
	`, currentUserID, "update_user_enterprise", "user", userID,
		auditDetails, c.ClientIP(), c.GetHeader("User-Agent"))

	if err != nil {
		// 审计日志失败不影响主流程，但需要记录
		log.Printf("[WARNING] Failed to create audit log: %v", err)
	}

	// 提交事务
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrCodeInternal,
			"Failed to commit transaction",
			err.Error(),
		))
		return
	}

	log.Printf("[UserEnterprise] Successfully updated enterprise info for user_id=%d, fields=%v", userID, updatedFields)

	c.JSON(http.StatusOK, models.NewSuccessResponse(
		map[string]interface{}{
			"user_id":        userID,
			"company_id":     req.CompanyID,
			"enterprise_id":  req.EnterpriseID,
			"department_id":  req.DepartmentID,
			"position":       req.Position,
			"updated_fields": updatedFields,
		},
		"User enterprise information updated successfully",
	))
}

// GetUserEnterpriseDetails 获取用户企业详细信息
// @Summary 获取用户企业详细信息
// @Description 获取用户的企业、部门等详细信息，支持新旧两种模型
// @Tags 用户管理
// @Accept json
// @Produce json
// @Param id path int true "用户ID"
// @Success 200 {object} models.Response
// @Failure 404 {object} models.Response "用户不存在"
// @Router /api/v1/users/{id}/enterprise-details [get]
func (h *UserEnterpriseHandler) GetUserEnterpriseDetails(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrCodeBadRequest,
			"Invalid user ID",
			err.Error(),
		))
		return
	}

	// 查询用户基本信息 + 企业信息
	query := `
		SELECT
			u.id, u.username, u.email, u.user_type, u.role, u.company_id,
			c.id as c_id, c.company_name, c.company_code,
			eu.id as eu_id, eu.enterprise_id, eu.department_id, eu.position,
			e.id as e_id, e.name as enterprise_name, e.code as enterprise_code,
			ed.id as dept_id, ed.name as dept_name, ed.path as dept_path, ed.level as dept_level
		FROM users u
		LEFT JOIN companies c ON u.company_id = c.id AND c.deleted_at IS NULL
		LEFT JOIN enterprise_users eu ON u.id = eu.user_id AND eu.deleted_at IS NULL
		LEFT JOIN enterprises e ON eu.enterprise_id = e.id AND e.deleted_at IS NULL
		LEFT JOIN enterprise_departments ed ON eu.department_id = ed.id AND ed.deleted_at IS NULL
		WHERE u.id = $1 AND u.deleted_at IS NULL
	`

	var (
		// User info
		userIDVal      int
		username       string
		email          string
		userType       string
		role           string
		companyID      sql.NullInt64
		// Company info
		cID            sql.NullInt64
		companyName    sql.NullString
		companyCode    sql.NullString
		// Enterprise user info
		euID           sql.NullInt64
		enterpriseID   sql.NullInt64
		departmentID   sql.NullInt64
		position       sql.NullString
		// Enterprise info
		eID            sql.NullInt64
		enterpriseName sql.NullString
		enterpriseCode sql.NullString
		// Department info
		deptID         sql.NullInt64
		deptName       sql.NullString
		deptPath       sql.NullString
		deptLevel      sql.NullInt64
	)

	err = h.db.QueryRow(query, userID).Scan(
		&userIDVal, &username, &email, &userType, &role, &companyID,
		&cID, &companyName, &companyCode,
		&euID, &enterpriseID, &departmentID, &position,
		&eID, &enterpriseName, &enterpriseCode,
		&deptID, &deptName, &deptPath, &deptLevel,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrCodeNotFound,
			"User not found",
			"User does not exist",
		))
		return
	}
	if err != nil {
		log.Printf("[UserEnterprise] Failed to query user enterprise details: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrCodeInternal,
			"Failed to query user enterprise details",
			err.Error(),
		))
		return
	}

	// 构建响应
	response := map[string]interface{}{
		"user": map[string]interface{}{
			"id":        userIDVal,
			"username":  username,
			"email":     email,
			"user_type": userType,
			"role":      role,
		},
	}

	// 添加 company_id 到 user 对象
	if companyID.Valid {
		response["user"].(map[string]interface{})["company_id"] = companyID.Int64
	}

	// 添加 company 信息（旧模型）
	if cID.Valid {
		response["company"] = map[string]interface{}{
			"id":   cID.Int64,
			"name": companyName.String,
			"code": companyCode.String,
		}
	}

	// 添加 enterprise_user 信息（新模型）
	if euID.Valid {
		euData := map[string]interface{}{
			"id": euID.Int64,
		}
		if enterpriseID.Valid {
			euData["enterprise_id"] = enterpriseID.Int64
		}
		if departmentID.Valid {
			euData["department_id"] = departmentID.Int64
		}
		if position.Valid {
			euData["position"] = position.String
		}
		response["enterprise_user"] = euData

		// 添加 enterprise 信息
		if eID.Valid {
			response["enterprise"] = map[string]interface{}{
				"id":   eID.Int64,
				"name": enterpriseName.String,
				"code": enterpriseCode.String,
			}
		}

		// 添加 department 信息
		if deptID.Valid {
			response["department"] = map[string]interface{}{
				"id":    deptID.Int64,
				"name":  deptName.String,
				"path":  deptPath.String,
				"level": deptLevel.Int64,
			}
		}
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(
		response,
		"User enterprise details retrieved successfully",
	))
}
