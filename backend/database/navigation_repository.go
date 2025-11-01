package database

import (
	"database/sql"
	"fmt"

	"ai-project-backend/models"
	"github.com/jmoiron/sqlx"
)

// NavigationRepository 导航管理数据库操作接口
type NavigationRepository interface {
	// 菜单项管理
	GetAllMenuItems() ([]models.MenuItem, error)
	GetMenuItemByID(id int) (*models.MenuItem, error)
	CreateMenuItem(item *models.MenuItemRequest) (*models.MenuItem, error)
	UpdateMenuItem(id int, item *models.MenuItemRequest) (*models.MenuItem, error)
	DeleteMenuItem(id int) error
	ReorderMenuItems(items []struct {
		ID        int `json:"id"`
		SortOrder int `json:"sort_order"`
	}) error

	// 菜单分组管理
	GetAllMenuGroups() ([]models.MenuGroup, error)
	GetMenuGroupByID(id int) (*models.MenuGroup, error)
	CreateMenuGroup(group *models.MenuGroupRequest) (*models.MenuGroup, error)
	UpdateMenuGroup(id int, group *models.MenuGroupRequest) (*models.MenuGroup, error)
	DeleteMenuGroup(id int) error

	// 路由配置管理
	GetAllRoutes() ([]models.RouteConfig, error)
	GetRouteByID(id int) (*models.RouteConfig, error)
	CreateRoute(route *models.RouteConfigRequest) (*models.RouteConfig, error)
	UpdateRoute(id int, route *models.RouteConfigRequest) (*models.RouteConfig, error)
	DeleteRoute(id int) error

	// 统计信息
	GetNavigationStats() (*models.NavigationStats, error)
}

// navigationRepository 导航管理仓库实现
type navigationRepository struct {
	db *sqlx.DB
}

// NewNavigationRepository 创建导航管理仓库
func NewNavigationRepository(db *sqlx.DB) NavigationRepository {
	return &navigationRepository{db: db}
}

// ========== 菜单项管理 ==========

// GetAllMenuItems 获取所有菜单项
func (r *navigationRepository) GetAllMenuItems() ([]models.MenuItem, error) {
	var items []models.MenuItem
	query := `
		SELECT id, key, icon, label, path, parent_id, sort_order,
		       is_visible, is_enabled, permission, component,
		       created_at, updated_at
		FROM system_menu_items
		ORDER BY sort_order ASC, id ASC
	`
	err := r.db.Select(&items, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get menu items: %w", err)
	}
	return items, nil
}

// GetMenuItemByID 根据ID获取菜单项
func (r *navigationRepository) GetMenuItemByID(id int) (*models.MenuItem, error) {
	var item models.MenuItem
	query := `
		SELECT id, key, icon, label, path, parent_id, sort_order,
		       is_visible, is_enabled, permission, component,
		       created_at, updated_at
		FROM system_menu_items
		WHERE id = $1
	`
	err := r.db.Get(&item, query, id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get menu item: %w", err)
	}
	return &item, nil
}

// CreateMenuItem 创建菜单项
func (r *navigationRepository) CreateMenuItem(req *models.MenuItemRequest) (*models.MenuItem, error) {
	var item models.MenuItem
	query := `
		INSERT INTO system_menu_items (
			key, icon, label, path, parent_id, sort_order,
			is_visible, is_enabled, permission, component
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, key, icon, label, path, parent_id, sort_order,
		          is_visible, is_enabled, permission, component,
		          created_at, updated_at
	`
	err := r.db.QueryRowx(
		query,
		req.Key, req.Icon, req.Label, req.Path, req.ParentID, req.SortOrder,
		req.IsVisible, req.IsEnabled, req.Permission, req.Component,
	).StructScan(&item)

	if err != nil {
		return nil, fmt.Errorf("failed to create menu item: %w", err)
	}
	return &item, nil
}

// UpdateMenuItem 更新菜单项
func (r *navigationRepository) UpdateMenuItem(id int, req *models.MenuItemRequest) (*models.MenuItem, error) {
	var item models.MenuItem
	query := `
		UPDATE system_menu_items
		SET key = $2, icon = $3, label = $4, path = $5, parent_id = $6,
		    sort_order = $7, is_visible = $8, is_enabled = $9,
		    permission = $10, component = $11, updated_at = NOW()
		WHERE id = $1
		RETURNING id, key, icon, label, path, parent_id, sort_order,
		          is_visible, is_enabled, permission, component,
		          created_at, updated_at
	`
	err := r.db.QueryRowx(
		query,
		id, req.Key, req.Icon, req.Label, req.Path, req.ParentID,
		req.SortOrder, req.IsVisible, req.IsEnabled, req.Permission, req.Component,
	).StructScan(&item)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("menu item not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update menu item: %w", err)
	}
	return &item, nil
}

// DeleteMenuItem 删除菜单项
func (r *navigationRepository) DeleteMenuItem(id int) error {
	query := `DELETE FROM system_menu_items WHERE id = $1`
	result, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete menu item: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("menu item not found")
	}

	return nil
}

// ReorderMenuItems 重新排序菜单项
func (r *navigationRepository) ReorderMenuItems(items []struct {
	ID        int `json:"id"`
	SortOrder int `json:"sort_order"`
}) error {
	tx, err := r.db.Beginx()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	query := `UPDATE system_menu_items SET sort_order = $2, updated_at = NOW() WHERE id = $1`
	for _, item := range items {
		_, err := tx.Exec(query, item.ID, item.SortOrder)
		if err != nil {
			return fmt.Errorf("failed to update sort order for item %d: %w", item.ID, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// ========== 菜单分组管理 ==========

// GetAllMenuGroups 获取所有菜单分组
func (r *navigationRepository) GetAllMenuGroups() ([]models.MenuGroup, error) {
	var groups []models.MenuGroup
	query := `
		SELECT id, name, description, sort_order, is_active, created_at, updated_at
		FROM system_menu_groups
		ORDER BY sort_order ASC, id ASC
	`
	err := r.db.Select(&groups, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get menu groups: %w", err)
	}
	return groups, nil
}

// GetMenuGroupByID 根据ID获取菜单分组
func (r *navigationRepository) GetMenuGroupByID(id int) (*models.MenuGroup, error) {
	var group models.MenuGroup
	query := `
		SELECT id, name, description, sort_order, is_active, created_at, updated_at
		FROM system_menu_groups
		WHERE id = $1
	`
	err := r.db.Get(&group, query, id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get menu group: %w", err)
	}
	return &group, nil
}

// CreateMenuGroup 创建菜单分组
func (r *navigationRepository) CreateMenuGroup(req *models.MenuGroupRequest) (*models.MenuGroup, error) {
	var group models.MenuGroup
	query := `
		INSERT INTO system_menu_groups (name, description, sort_order, is_active)
		VALUES ($1, $2, $3, $4)
		RETURNING id, name, description, sort_order, is_active, created_at, updated_at
	`
	err := r.db.QueryRowx(query, req.Name, req.Description, req.SortOrder, req.IsActive).StructScan(&group)
	if err != nil {
		return nil, fmt.Errorf("failed to create menu group: %w", err)
	}
	return &group, nil
}

// UpdateMenuGroup 更新菜单分组
func (r *navigationRepository) UpdateMenuGroup(id int, req *models.MenuGroupRequest) (*models.MenuGroup, error) {
	var group models.MenuGroup
	query := `
		UPDATE system_menu_groups
		SET name = $2, description = $3, sort_order = $4, is_active = $5, updated_at = NOW()
		WHERE id = $1
		RETURNING id, name, description, sort_order, is_active, created_at, updated_at
	`
	err := r.db.QueryRowx(query, id, req.Name, req.Description, req.SortOrder, req.IsActive).StructScan(&group)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("menu group not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update menu group: %w", err)
	}
	return &group, nil
}

// DeleteMenuGroup 删除菜单分组
func (r *navigationRepository) DeleteMenuGroup(id int) error {
	query := `DELETE FROM system_menu_groups WHERE id = $1`
	result, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete menu group: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("menu group not found")
	}

	return nil
}

// ========== 路由配置管理 ==========

// GetAllRoutes 获取所有路由配置
func (r *navigationRepository) GetAllRoutes() ([]models.RouteConfig, error) {
	var routes []models.RouteConfig
	query := `
		SELECT id, path, component, exact, menu_item_id, is_protected,
		       permission, redirect, meta, created_at, updated_at
		FROM system_routes
		ORDER BY id ASC
	`
	err := r.db.Select(&routes, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get routes: %w", err)
	}
	return routes, nil
}

// GetRouteByID 根据ID获取路由配置
func (r *navigationRepository) GetRouteByID(id int) (*models.RouteConfig, error) {
	var route models.RouteConfig
	query := `
		SELECT id, path, component, exact, menu_item_id, is_protected,
		       permission, redirect, meta, created_at, updated_at
		FROM system_routes
		WHERE id = $1
	`
	err := r.db.Get(&route, query, id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get route: %w", err)
	}
	return &route, nil
}

// CreateRoute 创建路由配置
func (r *navigationRepository) CreateRoute(req *models.RouteConfigRequest) (*models.RouteConfig, error) {
	var route models.RouteConfig
	query := `
		INSERT INTO system_routes (
			path, component, exact, menu_item_id, is_protected,
			permission, redirect, meta
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, path, component, exact, menu_item_id, is_protected,
		          permission, redirect, meta, created_at, updated_at
	`
	err := r.db.QueryRowx(
		query,
		req.Path, req.Component, req.Exact, req.MenuItemID, req.IsProtected,
		req.Permission, req.Redirect, req.Meta,
	).StructScan(&route)

	if err != nil {
		return nil, fmt.Errorf("failed to create route: %w", err)
	}
	return &route, nil
}

// UpdateRoute 更新路由配置
func (r *navigationRepository) UpdateRoute(id int, req *models.RouteConfigRequest) (*models.RouteConfig, error) {
	var route models.RouteConfig
	query := `
		UPDATE system_routes
		SET path = $2, component = $3, exact = $4, menu_item_id = $5,
		    is_protected = $6, permission = $7, redirect = $8, meta = $9,
		    updated_at = NOW()
		WHERE id = $1
		RETURNING id, path, component, exact, menu_item_id, is_protected,
		          permission, redirect, meta, created_at, updated_at
	`
	err := r.db.QueryRowx(
		query,
		id, req.Path, req.Component, req.Exact, req.MenuItemID,
		req.IsProtected, req.Permission, req.Redirect, req.Meta,
	).StructScan(&route)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("route not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update route: %w", err)
	}
	return &route, nil
}

// DeleteRoute 删除路由配置
func (r *navigationRepository) DeleteRoute(id int) error {
	query := `DELETE FROM system_routes WHERE id = $1`
	result, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete route: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("route not found")
	}

	return nil
}

// ========== 统计信息 ==========

// GetNavigationStats 获取导航统计信息
func (r *navigationRepository) GetNavigationStats() (*models.NavigationStats, error) {
	var stats models.NavigationStats

	// 获取各项统计
	err := r.db.QueryRow(`SELECT COUNT(*) FROM system_menu_items`).Scan(&stats.TotalItems)
	if err != nil {
		return nil, fmt.Errorf("failed to count total items: %w", err)
	}

	err = r.db.QueryRow(`SELECT COUNT(*) FROM system_menu_items WHERE is_visible = true`).Scan(&stats.VisibleItems)
	if err != nil {
		return nil, fmt.Errorf("failed to count visible items: %w", err)
	}

	err = r.db.QueryRow(`SELECT COUNT(*) FROM system_menu_items WHERE is_enabled = true`).Scan(&stats.EnabledItems)
	if err != nil {
		return nil, fmt.Errorf("failed to count enabled items: %w", err)
	}

	err = r.db.QueryRow(`SELECT COUNT(*) FROM system_menu_groups`).Scan(&stats.TotalGroups)
	if err != nil {
		return nil, fmt.Errorf("failed to count groups: %w", err)
	}

	err = r.db.QueryRow(`SELECT COUNT(*) FROM system_routes`).Scan(&stats.TotalRoutes)
	if err != nil {
		return nil, fmt.Errorf("failed to count routes: %w", err)
	}

	return &stats, nil
}
