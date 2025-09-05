package database

import (
	"database/sql"
	"fmt"
	"strings"

	_ "github.com/lib/pq"
)

// Department 部门模型（支持多租户）
type Department struct {
	ID            int            `db:"id" json:"id"`
	CompanyID     int            `db:"company_id" json:"company_id"`
	Name          string         `db:"name" json:"name"`
	ParentID      sql.NullInt64  `db:"parent_id" json:"-"`
	ManagerID     sql.NullInt64  `db:"manager_id" json:"-"`
	Description   sql.NullString `db:"description" json:"-"`
	Level         int            `db:"level" json:"level"`
	EmployeeCount int            `db:"employee_count" json:"employee_count"`
	Status        string         `db:"status" json:"status"`
	SortOrder     int            `db:"sort_order" json:"sort_order"`
	Path          string         `db:"path" json:"path"`
	CreatedAt     string         `db:"created_at" json:"created_at"`
	UpdatedAt     string         `db:"updated_at" json:"updated_at"`
	DeletedAt     sql.NullTime   `db:"deleted_at" json:"-"`
	
	// JSON字段
	ParentIDPtr     *int    `json:"parent_id"`
	ManagerIDPtr    *int    `json:"manager_id"`
	ManagerName     *string `json:"manager_name,omitempty"`
	DescriptionPtr  *string `json:"description"`
	Children        []Department `json:"children,omitempty"`
}

// DepartmentRepository 部门数据库操作
type DepartmentRepository struct {
	db *sql.DB
}

// NewDepartmentRepository 创建部门存储库实例
func NewDepartmentRepository(db *sql.DB) *DepartmentRepository {
	return &DepartmentRepository{db: db}
}

// GetAllByCompany 获取指定企业的所有部门（树形结构）
func (r *DepartmentRepository) GetAllByCompany(companyID int) ([]Department, error) {
	query := `
		SELECT 
			d.id, d.company_id, d.name, d.parent_id, d.manager_id, d.description, 
			d.level, d.employee_count, d.status, d.sort_order, d.path,
			d.created_at, d.updated_at,
			cu.name as manager_name
		FROM company_departments d
		LEFT JOIN company_users cu ON d.manager_id = cu.id
		WHERE d.company_id = $1 AND d.deleted_at IS NULL
		ORDER BY d.level, d.sort_order, d.id
	`

	rows, err := r.db.Query(query, companyID)
	if err != nil {
		return nil, fmt.Errorf("failed to query departments: %w", err)
	}
	defer rows.Close()

	var departments []Department
	departmentMap := make(map[int]*Department)

	for rows.Next() {
		var dept Department
		var managerName sql.NullString
		
		err := rows.Scan(
			&dept.ID, &dept.CompanyID, &dept.Name, &dept.ParentID, &dept.ManagerID, 
			&dept.Description, &dept.Level, &dept.EmployeeCount, 
			&dept.Status, &dept.SortOrder, &dept.Path,
			&dept.CreatedAt, &dept.UpdatedAt, &managerName,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan department: %w", err)
		}

		// 转换NULL值
		if dept.ParentID.Valid {
			parentID := int(dept.ParentID.Int64)
			dept.ParentIDPtr = &parentID
		}
		if dept.ManagerID.Valid {
			managerID := int(dept.ManagerID.Int64)
			dept.ManagerIDPtr = &managerID
		}
		if managerName.Valid {
			dept.ManagerName = &managerName.String
		}
		if dept.Description.Valid {
			dept.DescriptionPtr = &dept.Description.String
		}

		departmentMap[dept.ID] = &dept
		departments = append(departments, dept)
	}

	// 构建树形结构
	var roots []Department
	for i := range departments {
		dept := &departments[i]
		if dept.ParentIDPtr == nil {
			// 更新map中的指针
			departmentMap[dept.ID] = dept
		} else {
			parent := departmentMap[*dept.ParentIDPtr]
			if parent != nil {
				parent.Children = append(parent.Children, *dept)
			}
		}
	}

	// 收集根节点
	for _, dept := range departments {
		if dept.ParentIDPtr == nil {
			// 确保children已经填充
			if deptPtr := departmentMap[dept.ID]; deptPtr != nil {
				roots = append(roots, *deptPtr)
			}
		}
	}

	return roots, nil
}

// GetByID 根据ID获取部门（支持多租户检查）
func (r *DepartmentRepository) GetByID(id int, companyID int) (*Department, error) {
	query := `
		SELECT 
			d.id, d.company_id, d.name, d.parent_id, d.manager_id, d.description, 
			d.level, d.employee_count, d.status, d.sort_order, d.path,
			d.created_at, d.updated_at,
			cu.name as manager_name
		FROM company_departments d
		LEFT JOIN company_users cu ON d.manager_id = cu.id
		WHERE d.id = $1 AND d.company_id = $2 AND d.deleted_at IS NULL
	`

	var dept Department
	var managerName sql.NullString
	
	err := r.db.QueryRow(query, id, companyID).Scan(
		&dept.ID, &dept.CompanyID, &dept.Name, &dept.ParentID, &dept.ManagerID,
		&dept.Description, &dept.Level, &dept.EmployeeCount,
		&dept.Status, &dept.SortOrder, &dept.Path,
		&dept.CreatedAt, &dept.UpdatedAt, &managerName,
	)
	
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get department: %w", err)
	}

	// 转换NULL值
	if dept.ParentID.Valid {
		parentID := int(dept.ParentID.Int64)
		dept.ParentIDPtr = &parentID
	}
	if dept.ManagerID.Valid {
		managerID := int(dept.ManagerID.Int64)
		dept.ManagerIDPtr = &managerID
	}
	if managerName.Valid {
		dept.ManagerName = &managerName.String
	}
	if dept.Description.Valid {
		dept.DescriptionPtr = &dept.Description.String
	}

	return &dept, nil
}

// Create 创建部门（支持多租户）
func (r *DepartmentRepository) Create(dept *Department) (*Department, error) {
	// 验证company_id是否提供
	if dept.CompanyID == 0 {
		return nil, fmt.Errorf("company_id is required")
	}
	
	// 计算level和path
	level := 1
	path := ""
	
	if dept.ParentIDPtr != nil {
		parent, err := r.GetByID(*dept.ParentIDPtr, dept.CompanyID)
		if err != nil {
			return nil, fmt.Errorf("failed to get parent department: %w", err)
		}
		if parent == nil {
			return nil, fmt.Errorf("parent department not found")
		}
		level = parent.Level + 1
		path = parent.Path
	}

	query := `
		INSERT INTO company_departments (company_id, name, parent_id, manager_id, description, level, status, path, sort_order)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at
	`

	var parentID, managerID sql.NullInt64
	var description sql.NullString
	
	if dept.ParentIDPtr != nil {
		parentID.Valid = true
		parentID.Int64 = int64(*dept.ParentIDPtr)
	}
	if dept.ManagerIDPtr != nil {
		managerID.Valid = true
		managerID.Int64 = int64(*dept.ManagerIDPtr)
	}
	if dept.DescriptionPtr != nil {
		description.Valid = true
		description.String = *dept.DescriptionPtr
	}

	// 获取同级最大sort_order
	sortOrder := 0
	if dept.ParentIDPtr != nil {
		var maxOrder sql.NullInt64
		err := r.db.QueryRow(`
			SELECT MAX(sort_order) FROM company_departments 
			WHERE parent_id = $1 AND company_id = $2 AND deleted_at IS NULL
		`, *dept.ParentIDPtr, dept.CompanyID).Scan(&maxOrder)
		if err == nil && maxOrder.Valid {
			sortOrder = int(maxOrder.Int64) + 1
		}
	}

	err := r.db.QueryRow(
		query, dept.CompanyID, dept.Name, parentID, managerID, description,
		level, dept.Status, "", sortOrder,
	).Scan(&dept.ID, &dept.CreatedAt, &dept.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create department: %w", err)
	}

	// 更新path
	if path == "" {
		path = fmt.Sprintf("%d", dept.ID)
	} else {
		path = fmt.Sprintf("%s.%d", path, dept.ID)
	}
	
	_, err = r.db.Exec("UPDATE company_departments SET path = $1 WHERE id = $2", path, dept.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to update department path: %w", err)
	}

	dept.Level = level
	dept.Path = path
	dept.SortOrder = sortOrder

	return dept, nil
}

// Update 更新部门（支持多租户）
func (r *DepartmentRepository) Update(id int, companyID int, updates map[string]interface{}) (*Department, error) {
	var setClauses []string
	var args []interface{}
	argIndex := 1

	for key, value := range updates {
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", key, argIndex))
		args = append(args, value)
		argIndex++
	}

	if len(setClauses) == 0 {
		return r.GetByID(id, companyID)
	}

	args = append(args, id, companyID)
	query := fmt.Sprintf(`
		UPDATE company_departments 
		SET %s, updated_at = CURRENT_TIMESTAMP
		WHERE id = $%d AND company_id = $%d AND deleted_at IS NULL
		RETURNING id, company_id, name, parent_id, manager_id, description, level, 
		          employee_count, status, sort_order, path, created_at, updated_at
	`, strings.Join(setClauses, ", "), argIndex, argIndex+1)

	var dept Department
	err := r.db.QueryRow(query, args...).Scan(
		&dept.ID, &dept.CompanyID, &dept.Name, &dept.ParentID, &dept.ManagerID,
		&dept.Description, &dept.Level, &dept.EmployeeCount,
		&dept.Status, &dept.SortOrder, &dept.Path,
		&dept.CreatedAt, &dept.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("department not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update department: %w", err)
	}

	// 转换NULL值
	if dept.ParentID.Valid {
		parentID := int(dept.ParentID.Int64)
		dept.ParentIDPtr = &parentID
	}
	if dept.ManagerID.Valid {
		managerID := int(dept.ManagerID.Int64)
		dept.ManagerIDPtr = &managerID
	}
	if dept.Description.Valid {
		dept.DescriptionPtr = &dept.Description.String
	}

	// 如果更新了parent_id，需要更新level和path
	if _, ok := updates["parent_id"]; ok {
		r.updateHierarchy(&dept, companyID)
	}

	return &dept, nil
}

// Delete 删除部门（软删除，支持多租户）
func (r *DepartmentRepository) Delete(id int, companyID int) error {
	// 检查是否有子部门
	var count int
	err := r.db.QueryRow(`
		SELECT COUNT(*) FROM company_departments 
		WHERE parent_id = $1 AND company_id = $2 AND deleted_at IS NULL
	`, id, companyID).Scan(&count)
	
	if err != nil {
		return fmt.Errorf("failed to check child departments: %w", err)
	}
	
	if count > 0 {
		return fmt.Errorf("cannot delete department with child departments")
	}

	// 软删除
	_, err = r.db.Exec(`
		UPDATE company_departments 
		SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
	`, id, companyID)

	if err != nil {
		return fmt.Errorf("failed to delete department: %w", err)
	}

	return nil
}

// updateHierarchy 更新部门层级信息（支持多租户）
func (r *DepartmentRepository) updateHierarchy(dept *Department, companyID int) error {
	level := 1
	path := fmt.Sprintf("%d", dept.ID)

	if dept.ParentIDPtr != nil {
		parent, err := r.GetByID(*dept.ParentIDPtr, companyID)
		if err != nil {
			return fmt.Errorf("failed to get parent: %w", err)
		}
		if parent != nil {
			level = parent.Level + 1
			path = fmt.Sprintf("%s.%d", parent.Path, dept.ID)
		}
	}

	_, err := r.db.Exec(`
		UPDATE company_departments 
		SET level = $1, path = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3 AND company_id = $4
	`, level, path, dept.ID, companyID)

	if err != nil {
		return fmt.Errorf("failed to update hierarchy: %w", err)
	}

	dept.Level = level
	dept.Path = path

	// 递归更新子部门
	rows, err := r.db.Query(`
		SELECT id FROM company_departments 
		WHERE parent_id = $1 AND company_id = $2 AND deleted_at IS NULL
	`, dept.ID, companyID)
	
	if err != nil {
		return fmt.Errorf("failed to get child departments: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var childID int
		if err := rows.Scan(&childID); err != nil {
			continue
		}
		
		child, _ := r.GetByID(childID, companyID)
		if child != nil {
			r.updateHierarchy(child, companyID)
		}
	}

	return nil
}

// GetStatsByCompany 获取指定企业的部门统计信息
func (r *DepartmentRepository) GetStatsByCompany(companyID int) (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// 总部门数
	var totalDepartments int
	err := r.db.QueryRow(`
		SELECT COUNT(*) FROM company_departments WHERE company_id = $1 AND deleted_at IS NULL
	`, companyID).Scan(&totalDepartments)
	if err != nil {
		return nil, err
	}
	stats["totalDepartments"] = totalDepartments

	// 活跃部门数
	var activeDepartments int
	err = r.db.QueryRow(`
		SELECT COUNT(*) FROM company_departments 
		WHERE company_id = $1 AND status = 'active' AND deleted_at IS NULL
	`, companyID).Scan(&activeDepartments)
	if err != nil {
		return nil, err
	}
	stats["activeDepartments"] = activeDepartments

	// 最大层级
	var maxLevel int
	err = r.db.QueryRow(`
		SELECT COALESCE(MAX(level), 0) FROM company_departments 
		WHERE company_id = $1 AND deleted_at IS NULL
	`, companyID).Scan(&maxLevel)
	if err != nil {
		return nil, err
	}
	stats["maxLevel"] = maxLevel

	// 总员工数（所有部门员工数之和）
	var totalEmployees int
	err = r.db.QueryRow(`
		SELECT COALESCE(SUM(employee_count), 0) FROM company_departments 
		WHERE company_id = $1 AND deleted_at IS NULL
	`, companyID).Scan(&totalEmployees)
	if err != nil {
		return nil, err
	}
	stats["totalEmployees"] = totalEmployees

	return stats, nil
}

// GetAll 保持向后兼容性的方法（返回空列表）
func (r *DepartmentRepository) GetAll() ([]Department, error) {
	// 旧版本兼容，返回空列表并警告
	return []Department{}, fmt.Errorf("GetAll is deprecated, use GetAllByCompany instead")
}