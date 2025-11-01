package models

import (
	"time"
)

// MenuItem 菜单项模型
type MenuItem struct {
	ID          int        `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	Key         string     `gorm:"column:key;type:varchar(100);not null;uniqueIndex" json:"key"`
	Icon        *string    `gorm:"column:icon;type:varchar(50)" json:"icon,omitempty"`
	Label       string     `gorm:"column:label;type:varchar(200);not null" json:"label"`
	Path        *string    `gorm:"column:path;type:varchar(500)" json:"path,omitempty"`
	ParentID    *int       `gorm:"column:parent_id;index" json:"parent_id,omitempty"`
	SortOrder   int        `gorm:"column:sort_order;default:0" json:"sort_order"`
	IsVisible   bool       `gorm:"column:is_visible;default:true" json:"is_visible"`
	IsEnabled   bool       `gorm:"column:is_enabled;default:true" json:"is_enabled"`
	Permission  *string    `gorm:"column:permission;type:varchar(100)" json:"permission,omitempty"`
	Component   *string    `gorm:"column:component;type:varchar(200)" json:"component,omitempty"`
	CreatedAt   time.Time  `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time  `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`

	// 关联
	Children    []MenuItem `gorm:"foreignKey:ParentID" json:"children,omitempty"`
}

// TableName 指定表名
func (MenuItem) TableName() string {
	return "system_menu_items"
}

// MenuItemRequest 菜单项创建/更新请求
type MenuItemRequest struct {
	Key        string  `json:"key" binding:"required"`
	Icon       *string `json:"icon"`
	Label      string  `json:"label" binding:"required"`
	Path       *string `json:"path"`
	ParentID   *int    `json:"parent_id"`
	SortOrder  int     `json:"sort_order"`
	IsVisible  bool    `json:"is_visible"`
	IsEnabled  bool    `json:"is_enabled"`
	Permission *string `json:"permission"`
	Component  *string `json:"component"`
}

// ToModel 转换为MenuItem模型
func (req *MenuItemRequest) ToModel() *MenuItem {
	return &MenuItem{
		Key:        req.Key,
		Icon:       req.Icon,
		Label:      req.Label,
		Path:       req.Path,
		ParentID:   req.ParentID,
		SortOrder:  req.SortOrder,
		IsVisible:  req.IsVisible,
		IsEnabled:  req.IsEnabled,
		Permission: req.Permission,
		Component:  req.Component,
	}
}

// MenuGroup 菜单分组模型
type MenuGroup struct {
	ID          int        `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	Name        string     `gorm:"column:name;type:varchar(100);not null" json:"name"`
	Description *string    `gorm:"column:description;type:text" json:"description,omitempty"`
	SortOrder   int        `gorm:"column:sort_order;default:0" json:"sort_order"`
	IsActive    bool       `gorm:"column:is_active;default:true" json:"is_active"`
	CreatedAt   time.Time  `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time  `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`

	// 关联 - 可选，根据需要
	MenuItems   []MenuItem `gorm:"-" json:"menu_items,omitempty"`
}

// TableName 指定表名
func (MenuGroup) TableName() string {
	return "system_menu_groups"
}

// MenuGroupRequest 菜单分组创建/更新请求
type MenuGroupRequest struct {
	Name        string  `json:"name" binding:"required"`
	Description *string `json:"description"`
	SortOrder   int     `json:"sort_order"`
	IsActive    bool    `json:"is_active"`
}

// ToModel 转换为MenuGroup模型
func (req *MenuGroupRequest) ToModel() *MenuGroup {
	return &MenuGroup{
		Name:        req.Name,
		Description: req.Description,
		SortOrder:   req.SortOrder,
		IsActive:    req.IsActive,
	}
}

// RouteConfig 路由配置模型
type RouteConfig struct {
	ID          int        `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	Path        string     `gorm:"column:path;type:varchar(500);not null;index" json:"path"`
	Component   string     `gorm:"column:component;type:varchar(200);not null" json:"component"`
	Exact       *bool      `gorm:"column:exact;default:false" json:"exact,omitempty"`
	MenuItemID  *int       `gorm:"column:menu_item_id;index" json:"menu_item_id,omitempty"`
	IsProtected bool       `gorm:"column:is_protected;default:true" json:"is_protected"`
	Permission  *string    `gorm:"column:permission;type:varchar(100)" json:"permission,omitempty"`
	Redirect    *string    `gorm:"column:redirect;type:varchar(500)" json:"redirect,omitempty"`
	Meta        *RouteMeta `gorm:"column:meta;type:jsonb" json:"meta,omitempty"`
	CreatedAt   time.Time  `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time  `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
}

// TableName 指定表名
func (RouteConfig) TableName() string {
	return "system_routes"
}

// RouteMeta 路由元数据
type RouteMeta struct {
	Title       *string `json:"title,omitempty"`
	Description *string `json:"description,omitempty"`
	Keywords    *string `json:"keywords,omitempty"`
}

// RouteConfigRequest 路由配置创建/更新请求
type RouteConfigRequest struct {
	Path        string     `json:"path" binding:"required"`
	Component   string     `json:"component" binding:"required"`
	Exact       *bool      `json:"exact"`
	MenuItemID  *int       `json:"menu_item_id"`
	IsProtected bool       `json:"is_protected"`
	Permission  *string    `json:"permission"`
	Redirect    *string    `json:"redirect"`
	Meta        *RouteMeta `json:"meta"`
}

// ToModel 转换为RouteConfig模型
func (req *RouteConfigRequest) ToModel() *RouteConfig {
	return &RouteConfig{
		Path:        req.Path,
		Component:   req.Component,
		Exact:       req.Exact,
		MenuItemID:  req.MenuItemID,
		IsProtected: req.IsProtected,
		Permission:  req.Permission,
		Redirect:    req.Redirect,
		Meta:        req.Meta,
	}
}

// MenuPermission 菜单权限模型
type MenuPermission struct {
	ID         int       `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	MenuItemID int       `gorm:"column:menu_item_id;not null;index" json:"menu_item_id"`
	Role       string    `gorm:"column:role;type:varchar(50);not null" json:"role"`
	CanView    bool      `gorm:"column:can_view;default:false" json:"can_view"`
	CanEdit    bool      `gorm:"column:can_edit;default:false" json:"can_edit"`
	CanDelete  bool      `gorm:"column:can_delete;default:false" json:"can_delete"`
	CreatedAt  time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt  time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
}

// TableName 指定表名
func (MenuPermission) TableName() string {
	return "system_menu_permissions"
}

// NavigationStats 导航统计信息
type NavigationStats struct {
	TotalItems   int64 `json:"total_items"`
	VisibleItems int64 `json:"visible_items"`
	EnabledItems int64 `json:"enabled_items"`
	TotalGroups  int64 `json:"total_groups"`
	TotalRoutes  int64 `json:"total_routes"`
}

// NavigationConfig 完整导航配置
type NavigationConfig struct {
	Menus       []MenuGroup      `json:"menus"`
	Routes      []RouteConfig    `json:"routes"`
	Permissions []MenuPermission `json:"permissions"`
}
