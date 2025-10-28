# RBAC权限系统重构 - 原型设计文档

## 📋 文档信息

- **文档版本**: v1.0
- **创建日期**: 2025-10-28
- **作者**: Claude Code
- **状态**: 原型设计阶段
- **相关文档**: [RBAC_REFACTORING_PROPOSAL.md](./RBAC_REFACTORING_PROPOSAL.md)

---

## 🎯 原型设计目标

本原型旨在验证RBAC重构方案的技术可行性，通过实现核心功能的原型代码，确保：

1. ✅ 双层权限域架构可以正确实现
2. ✅ 权限检查性能满足要求（< 10ms）
3. ✅ 企业隔离机制有效
4. ✅ 代码可维护性和可扩展性良好

---

## 🏗️ 原型架构概览

```
┌─────────────────────────────────────────────────────┐
│                   API Layer (Gin)                    │
│  /api/v1/system/*     |    /api/v1/enterprise/*     │
└─────────────┬───────────────────────┬────────────────┘
              │                       │
┌─────────────▼───────────┐ ┌────────▼───────────────┐
│  System Middleware      │ │ Enterprise Middleware  │
│  - RequireSystemUser    │ │ - RequireEnterpriseUser│
│  - RequireSystemPerm    │ │ - RequireEnterprisePerm│
└─────────────┬───────────┘ └────────┬───────────────┘
              │                       │
┌─────────────▼───────────────────────▼────────────────┐
│           PermissionServiceV2 (Unified)              │
│  - CheckSystemPermission()                           │
│  - CheckEnterprisePermission()                       │
│  - CheckEnterpriseAccess()                           │
└─────────────┬────────────────────────────────────────┘
              │
┌─────────────▼────────────────────────────────────────┐
│                  Permission Checkers                  │
│  SystemPermissionChecker | EnterprisePermissionChecker│
└─────────────┬────────────────────────┬────────────────┘
              │                        │
┌─────────────▼────────────┐ ┌────────▼───────────────┐
│   System Domain Tables   │ │ Enterprise Domain Tables│
│  - system_roles          │ │ - enterprise_roles     │
│  - system_permissions    │ │ - enterprise_permissions│
│  - system_users          │ │ - enterprise_user_roles│
└──────────────────────────┘ └────────────────────────┘
```

---

## 💻 核心接口原型实现

### 1. UserIdentity接口族

#### 1.1 基础接口定义

**文件**: `models/user_identity_v2.go`

```go
package models

import "time"

// PermissionDomain 权限域枚举
type PermissionDomain string

const (
    DomainSystem     PermissionDomain = "system"     // 系统域
    DomainEnterprise PermissionDomain = "enterprise" // 企业域
)

// UserIdentity 统一的用户身份接口
type UserIdentity interface {
    // 基础信息
    GetUserID() uint
    GetDomain() PermissionDomain
    GetUsername() string

    // 角色信息
    GetRoleCode() string
    GetRoleCodes() []string // 支持多角色
    GetPrivilegeLevel() int // 权限级别（数字越小权限越高）

    // 企业信息
    GetEnterpriseID() *uint
    GetEnterpriseName() string

    // 类型判断
    IsSystemUser() bool
    IsEnterpriseUser() bool

    // 状态检查
    IsActive() bool
    GetCreatedAt() time.Time
    GetLastLoginAt() *time.Time

    // 序列化
    ToMap() map[string]interface{}
    ToJSON() ([]byte, error)
}

// BaseIdentity 基础身份信息（共享字段）
type BaseIdentity struct {
    UserID      uint       `json:"user_id"`
    Username    string     `json:"username"`
    Email       string     `json:"email"`
    IsActive    bool       `json:"is_active"`
    CreatedAt   time.Time  `json:"created_at"`
    LastLoginAt *time.Time `json:"last_login_at,omitempty"`
}

func (b *BaseIdentity) GetUserID() uint {
    return b.UserID
}

func (b *BaseIdentity) GetUsername() string {
    return b.Username
}

func (b *BaseIdentity) IsActive() bool {
    return b.IsActive
}

func (b *BaseIdentity) GetCreatedAt() time.Time {
    return b.CreatedAt
}

func (b *BaseIdentity) GetLastLoginAt() *time.Time {
    return b.LastLoginAt
}
```

#### 1.2 SystemUserIdentity实现

```go
// SystemUserIdentity 系统用户身份
type SystemUserIdentity struct {
    BaseIdentity
    SystemUserID   uint   `json:"system_user_id"`
    SystemRoleID   uint   `json:"system_role_id"`
    RoleCode       string `json:"role_code"`
    RoleName       string `json:"role_name"`
    PrivilegeLevel int    `json:"privilege_level"`
    Notes          string `json:"notes,omitempty"`
}

func (s *SystemUserIdentity) GetDomain() PermissionDomain {
    return DomainSystem
}

func (s *SystemUserIdentity) GetRoleCode() string {
    return s.RoleCode
}

func (s *SystemUserIdentity) GetRoleCodes() []string {
    return []string{s.RoleCode} // 系统用户只有一个角色
}

func (s *SystemUserIdentity) GetPrivilegeLevel() int {
    return s.PrivilegeLevel
}

func (s *SystemUserIdentity) GetEnterpriseID() *uint {
    return nil // 系统用户不属于任何企业
}

func (s *SystemUserIdentity) GetEnterpriseName() string {
    return ""
}

func (s *SystemUserIdentity) IsSystemUser() bool {
    return true
}

func (s *SystemUserIdentity) IsEnterpriseUser() bool {
    return false
}

func (s *SystemUserIdentity) ToMap() map[string]interface{} {
    return map[string]interface{}{
        "user_id":         s.UserID,
        "username":        s.Username,
        "domain":          string(DomainSystem),
        "system_user_id":  s.SystemUserID,
        "system_role_id":  s.SystemRoleID,
        "role_code":       s.RoleCode,
        "role_name":       s.RoleName,
        "privilege_level": s.PrivilegeLevel,
        "is_active":       s.IsActive,
    }
}

func (s *SystemUserIdentity) ToJSON() ([]byte, error) {
    return json.Marshal(s.ToMap())
}

// HasHigherPrivilegeThan 判断是否比另一个系统用户权限更高
func (s *SystemUserIdentity) HasHigherPrivilegeThan(other *SystemUserIdentity) bool {
    return s.PrivilegeLevel < other.PrivilegeLevel
}

// IsSuperAdmin 是否为超级管理员
func (s *SystemUserIdentity) IsSuperAdmin() bool {
    return s.RoleCode == "super_admin" && s.PrivilegeLevel == 1
}

// CanManageSystemUser 是否可以管理其他系统用户
func (s *SystemUserIdentity) CanManageSystemUser(targetUser *SystemUserIdentity) bool {
    // 只能管理权限级别更低的用户
    return s.HasHigherPrivilegeThan(targetUser)
}
```

#### 1.3 EnterpriseUserIdentity实现

```go
// EnterpriseUserIdentity 企业用户身份
type EnterpriseUserIdentity struct {
    BaseIdentity
    EnterpriseID     uint     `json:"enterprise_id"`
    EnterpriseName   string   `json:"enterprise_name"`
    EnterpriseUserID uint     `json:"enterprise_user_id"`
    PrimaryRoleID    uint     `json:"primary_role_id"`
    RoleCode         string   `json:"role_code"`        // 主角色代码
    RoleName         string   `json:"role_name"`        // 主角色名称
    RoleIDs          []uint   `json:"role_ids"`         // 所有角色ID
    RoleCodes        []string `json:"role_codes"`       // 所有角色代码
    DepartmentID     *uint    `json:"department_id,omitempty"`
    DepartmentName   string   `json:"department_name,omitempty"`
    PositionName     string   `json:"position_name,omitempty"`
}

func (e *EnterpriseUserIdentity) GetDomain() PermissionDomain {
    return DomainEnterprise
}

func (e *EnterpriseUserIdentity) GetRoleCode() string {
    return e.RoleCode
}

func (e *EnterpriseUserIdentity) GetRoleCodes() []string {
    return e.RoleCodes
}

func (e *EnterpriseUserIdentity) GetPrivilegeLevel() int {
    return 100 // 企业用户没有全局权限级别
}

func (e *EnterpriseUserIdentity) GetEnterpriseID() *uint {
    return &e.EnterpriseID
}

func (e *EnterpriseUserIdentity) GetEnterpriseName() string {
    return e.EnterpriseName
}

func (e *EnterpriseUserIdentity) IsSystemUser() bool {
    return false
}

func (e *EnterpriseUserIdentity) IsEnterpriseUser() bool {
    return true
}

func (e *EnterpriseUserIdentity) ToMap() map[string]interface{} {
    m := map[string]interface{}{
        "user_id":            e.UserID,
        "username":           e.Username,
        "domain":             string(DomainEnterprise),
        "enterprise_id":      e.EnterpriseID,
        "enterprise_name":    e.EnterpriseName,
        "enterprise_user_id": e.EnterpriseUserID,
        "primary_role_id":    e.PrimaryRoleID,
        "role_code":          e.RoleCode,
        "role_name":          e.RoleName,
        "role_ids":           e.RoleIDs,
        "role_codes":         e.RoleCodes,
        "is_active":          e.IsActive,
    }

    if e.DepartmentID != nil {
        m["department_id"] = *e.DepartmentID
        m["department_name"] = e.DepartmentName
    }

    if e.PositionName != "" {
        m["position_name"] = e.PositionName
    }

    return m
}

func (e *EnterpriseUserIdentity) ToJSON() ([]byte, error) {
    return json.Marshal(e.ToMap())
}

// IsEnterpriseAdmin 是否为企业管理员
func (e *EnterpriseUserIdentity) IsEnterpriseAdmin() bool {
    for _, code := range e.RoleCodes {
        if code == "enterprise_admin" {
            return true
        }
    }
    return false
}

// HasRole 是否拥有指定角色
func (e *EnterpriseUserIdentity) HasRole(roleCode string) bool {
    for _, code := range e.RoleCodes {
        if code == roleCode {
            return true
        }
    }
    return false
}

// HasAnyRole 是否拥有任一指定角色
func (e *EnterpriseUserIdentity) HasAnyRole(roleCodes []string) bool {
    for _, requiredRole := range roleCodes {
        if e.HasRole(requiredRole) {
            return true
        }
    }
    return false
}

// BelongsToEnterprise 是否属于指定企业
func (e *EnterpriseUserIdentity) BelongsToEnterprise(enterpriseID uint) bool {
    return e.EnterpriseID == enterpriseID
}
```

#### 1.4 IdentityProvider实现

```go
// IdentityProvider 身份提供者接口
type IdentityProvider interface {
    GetSystemUserIdentity(userID uint) (*SystemUserIdentity, error)
    GetEnterpriseUserIdentity(userID uint, enterpriseID uint) (*EnterpriseUserIdentity, error)
    GetUserIdentity(userID uint) (UserIdentity, error) // 自动识别用户类型
    RefreshIdentity(identity UserIdentity) (UserIdentity, error)
}

// identityProviderImpl 身份提供者实现
type identityProviderImpl struct {
    db    *gorm.DB
    cache *sync.Map // 简单的内存缓存，生产环境应使用Redis
}

func NewIdentityProvider(db *gorm.DB) IdentityProvider {
    return &identityProviderImpl{
        db:    db,
        cache: &sync.Map{},
    }
}

// GetSystemUserIdentity 获取系统用户身份
func (p *identityProviderImpl) GetSystemUserIdentity(userID uint) (*SystemUserIdentity, error) {
    // 1. 检查缓存
    cacheKey := fmt.Sprintf("sys_identity:%d", userID)
    if cached, ok := p.cache.Load(cacheKey); ok {
        if identity, ok := cached.(*SystemUserIdentity); ok {
            return identity, nil
        }
    }

    // 2. 从数据库查询
    var identity SystemUserIdentity
    err := p.db.Table("system_users su").
        Select(`
            u.id as user_id,
            u.username,
            u.email,
            su.id as system_user_id,
            su.system_role_id,
            sr.role_code,
            sr.role_name,
            sr.privilege_level,
            su.is_active,
            su.notes,
            u.created_at,
            u.last_login_at
        `).
        Joins("JOIN users u ON su.user_id = u.id").
        Joins("JOIN system_roles sr ON su.system_role_id = sr.id").
        Where("su.user_id = ?", userID).
        Where("su.is_active = TRUE").
        Where("u.deleted_at IS NULL").
        First(&identity).Error

    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, fmt.Errorf("系统用户不存在或已禁用")
        }
        return nil, fmt.Errorf("查询系统用户失败: %w", err)
    }

    // 3. 缓存身份信息（5分钟）
    p.cache.Store(cacheKey, &identity)
    time.AfterFunc(5*time.Minute, func() {
        p.cache.Delete(cacheKey)
    })

    return &identity, nil
}

// GetEnterpriseUserIdentity 获取企业用户身份
func (p *identityProviderImpl) GetEnterpriseUserIdentity(
    userID uint,
    enterpriseID uint,
) (*EnterpriseUserIdentity, error) {
    // 1. 检查缓存
    cacheKey := fmt.Sprintf("ent_identity:%d:%d", enterpriseID, userID)
    if cached, ok := p.cache.Load(cacheKey); ok {
        if identity, ok := cached.(*EnterpriseUserIdentity); ok {
            return identity, nil
        }
    }

    // 2. 查询基础信息和主角色
    var identity EnterpriseUserIdentity
    err := p.db.Table("enterprise_users eu").
        Select(`
            u.id as user_id,
            u.username,
            u.email,
            eu.id as enterprise_user_id,
            eu.enterprise_id,
            e.name as enterprise_name,
            eu.primary_role_id,
            er.role_code,
            er.role_name,
            eu.department_id,
            d.name as department_name,
            p.name as position_name,
            eu.is_active,
            u.created_at,
            u.last_login_at
        `).
        Joins("JOIN users u ON eu.user_id = u.id").
        Joins("JOIN enterprises e ON eu.enterprise_id = e.id").
        Joins("JOIN enterprise_roles er ON eu.primary_role_id = er.id").
        Joins("LEFT JOIN enterprise_departments d ON eu.department_id = d.id").
        Joins("LEFT JOIN enterprise_positions p ON eu.position_id = p.id").
        Where("eu.user_id = ?", userID).
        Where("eu.enterprise_id = ?", enterpriseID).
        Where("eu.is_active = TRUE").
        Where("u.deleted_at IS NULL").
        Where("e.deleted_at IS NULL").
        First(&identity).Error

    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, fmt.Errorf("企业用户不存在或已禁用")
        }
        return nil, fmt.Errorf("查询企业用户失败: %w", err)
    }

    // 3. 查询所有角色
    var roles []struct {
        RoleID   uint   `gorm:"column:role_id"`
        RoleCode string `gorm:"column:role_code"`
    }

    p.db.Table("enterprise_user_roles eur").
        Select("eur.enterprise_role_id as role_id, er.role_code").
        Joins("JOIN enterprise_roles er ON eur.enterprise_role_id = er.id").
        Where("eur.enterprise_user_id = ?", identity.EnterpriseUserID).
        Where("eur.expires_at IS NULL OR eur.expires_at > NOW()").
        Find(&roles)

    identity.RoleIDs = make([]uint, len(roles))
    identity.RoleCodes = make([]string, len(roles))
    for i, role := range roles {
        identity.RoleIDs[i] = role.RoleID
        identity.RoleCodes[i] = role.RoleCode
    }

    // 4. 缓存身份信息（5分钟）
    p.cache.Store(cacheKey, &identity)
    time.AfterFunc(5*time.Minute, func() {
        p.cache.Delete(cacheKey)
    })

    return &identity, nil
}

// GetUserIdentity 自动识别用户类型并返回身份
func (p *identityProviderImpl) GetUserIdentity(userID uint) (UserIdentity, error) {
    // 1. 先尝试获取系统用户身份
    sysIdentity, sysErr := p.GetSystemUserIdentity(userID)
    if sysErr == nil {
        return sysIdentity, nil
    }

    // 2. 如果不是系统用户，查询用户的企业关联
    var enterpriseID uint
    err := p.db.Table("enterprise_users").
        Select("enterprise_id").
        Where("user_id = ?", userID).
        Where("is_active = TRUE").
        Order("id DESC"). // 如果用户属于多个企业，取最新的
        Limit(1).
        Pluck("enterprise_id", &enterpriseID).Error

    if err != nil || enterpriseID == 0 {
        return nil, fmt.Errorf("用户既不是系统用户也不是企业用户")
    }

    // 3. 获取企业用户身份
    return p.GetEnterpriseUserIdentity(userID, enterpriseID)
}

// RefreshIdentity 刷新身份信息（清除缓存重新查询）
func (p *identityProviderImpl) RefreshIdentity(identity UserIdentity) (UserIdentity, error) {
    userID := identity.GetUserID()

    if identity.IsSystemUser() {
        cacheKey := fmt.Sprintf("sys_identity:%d", userID)
        p.cache.Delete(cacheKey)
        return p.GetSystemUserIdentity(userID)
    }

    if identity.IsEnterpriseUser() {
        enterpriseID := identity.GetEnterpriseID()
        if enterpriseID == nil {
            return nil, fmt.Errorf("企业用户缺少enterprise_id")
        }
        cacheKey := fmt.Sprintf("ent_identity:%d:%d", *enterpriseID, userID)
        p.cache.Delete(cacheKey)
        return p.GetEnterpriseUserIdentity(userID, *enterpriseID)
    }

    return nil, fmt.Errorf("未知的用户类型")
}
```

---

### 2. 权限检查服务原型

#### 2.1 PermissionServiceV2接口

**文件**: `services/permission_service_v2_proto.go`

```go
package services

import (
    "context"
    "fmt"
    "time"

    "gorm.io/gorm"
    "new-ai-proj/models"
)

// PermissionCheckResult 权限检查结果
type PermissionCheckResult struct {
    HasPermission bool                   `json:"has_permission"`
    PermissionCode string                `json:"permission_code"`
    ScopeData     map[string]interface{} `json:"scope_data,omitempty"`
    CheckedAt     time.Time              `json:"checked_at"`
    CacheHit      bool                   `json:"cache_hit"`
}

// PermissionServiceV2 权限检查服务接口
type PermissionServiceV2 interface {
    // 系统域权限检查
    CheckSystemPermission(ctx context.Context, userID uint, permissionCode string) (*PermissionCheckResult, error)

    // 企业域权限检查
    CheckEnterprisePermission(ctx context.Context, userID uint, enterpriseID uint, permissionCode string) (*PermissionCheckResult, error)

    // 批量权限检查
    CheckPermissions(ctx context.Context, identity models.UserIdentity, permissionCodes []string) (map[string]*PermissionCheckResult, error)

    // 获取用户所有权限列表
    GetUserPermissions(ctx context.Context, identity models.UserIdentity) ([]string, error)

    // 企业访问权限检查
    CheckEnterpriseAccess(ctx context.Context, userID uint, resourceEnterpriseID uint) (bool, error)

    // 缓存管理
    InvalidateCache(ctx context.Context, identity models.UserIdentity) error
    InvalidateUserCache(ctx context.Context, userID uint) error
    InvalidateEnterpriseCache(ctx context.Context, enterpriseID uint) error
}

// permissionServiceV2Impl 权限服务实现
type permissionServiceV2Impl struct {
    db                    *gorm.DB
    systemChecker         *SystemPermissionChecker
    enterpriseChecker     *EnterprisePermissionChecker
    cache                 PermissionCache
    identityProvider      models.IdentityProvider
    basePermissionsCache  map[string]bool // 基础权限缓存
}

// NewPermissionServiceV2 创建权限服务实例
func NewPermissionServiceV2(
    db *gorm.DB,
    cache PermissionCache,
    identityProvider models.IdentityProvider,
) PermissionServiceV2 {
    return &permissionServiceV2Impl{
        db:                   db,
        systemChecker:        NewSystemPermissionChecker(db),
        enterpriseChecker:    NewEnterprisePermissionChecker(db),
        cache:                cache,
        identityProvider:     identityProvider,
        basePermissionsCache: make(map[string]bool),
    }
}

// CheckSystemPermission 检查系统域权限
func (s *permissionServiceV2Impl) CheckSystemPermission(
    ctx context.Context,
    userID uint,
    permissionCode string,
) (*PermissionCheckResult, error) {
    startTime := time.Now()
    result := &PermissionCheckResult{
        PermissionCode: permissionCode,
        CheckedAt:      startTime,
    }

    // 1. 构建缓存key
    cacheKey := fmt.Sprintf("sys:%d:%s", userID, permissionCode)

    // 2. 检查缓存
    if cachedResult, found := s.cache.Get(ctx, cacheKey); found {
        result.HasPermission = cachedResult
        result.CacheHit = true
        return result, nil
    }

    // 3. 获取系统用户身份
    identity, err := s.identityProvider.GetSystemUserIdentity(userID)
    if err != nil {
        return nil, fmt.Errorf("获取系统用户身份失败: %w", err)
    }

    if !identity.IsActive() {
        return nil, fmt.Errorf("系统用户已禁用")
    }

    // 4. Super Admin拥有所有权限
    if identity.IsSuperAdmin() {
        result.HasPermission = true
        s.cache.Set(ctx, cacheKey, true, 15*time.Minute)
        return result, nil
    }

    // 5. 检查角色权限
    hasPermission, err := s.systemChecker.CheckRolePermission(
        ctx,
        identity.SystemRoleID,
        permissionCode,
    )
    if err != nil {
        return nil, fmt.Errorf("检查系统权限失败: %w", err)
    }

    result.HasPermission = hasPermission

    // 6. 缓存结果
    s.cache.Set(ctx, cacheKey, hasPermission, 15*time.Minute)

    return result, nil
}

// CheckEnterprisePermission 检查企业域权限
func (s *permissionServiceV2Impl) CheckEnterprisePermission(
    ctx context.Context,
    userID uint,
    enterpriseID uint,
    permissionCode string,
) (*PermissionCheckResult, error) {
    startTime := time.Now()
    result := &PermissionCheckResult{
        PermissionCode: permissionCode,
        CheckedAt:      startTime,
    }

    // 1. 构建缓存key
    cacheKey := fmt.Sprintf("ent:%d:%d:%s", enterpriseID, userID, permissionCode)

    // 2. 检查缓存
    if cachedResult, found := s.cache.Get(ctx, cacheKey); found {
        result.HasPermission = cachedResult
        result.CacheHit = true
        return result, nil
    }

    // 3. 获取企业用户身份
    identity, err := s.identityProvider.GetEnterpriseUserIdentity(userID, enterpriseID)
    if err != nil {
        return nil, fmt.Errorf("获取企业用户身份失败: %w", err)
    }

    if !identity.IsActive() {
        return nil, fmt.Errorf("企业用户已禁用")
    }

    // 4. 检查是否为基础权限
    if s.isBasePermission(ctx, permissionCode) {
        result.HasPermission = true
        s.cache.Set(ctx, cacheKey, true, 1*time.Hour)
        return result, nil
    }

    // 5. Enterprise Admin拥有所有企业权限
    if identity.IsEnterpriseAdmin() {
        result.HasPermission = true
        s.cache.Set(ctx, cacheKey, true, 15*time.Minute)
        return result, nil
    }

    // 6. 检查用户自定义权限（优先级最高）
    if customPerm, found := s.enterpriseChecker.GetCustomPermission(
        ctx,
        identity.EnterpriseUserID,
        permissionCode,
    ); found {
        result.HasPermission = customPerm.IsGranted
        result.ScopeData = customPerm.ScopeConstraint
        s.cache.Set(ctx, cacheKey, customPerm.IsGranted, 15*time.Minute)
        return result, nil
    }

    // 7. 检查角色权限（合并多个角色）
    hasPermission, err := s.enterpriseChecker.CheckRolesPermission(
        ctx,
        identity.RoleIDs,
        permissionCode,
    )
    if err != nil {
        return nil, fmt.Errorf("检查企业权限失败: %w", err)
    }

    result.HasPermission = hasPermission

    // 8. 缓存结果
    s.cache.Set(ctx, cacheKey, hasPermission, 15*time.Minute)

    return result, nil
}

// CheckEnterpriseAccess 检查用户是否可以访问指定企业的资源
func (s *permissionServiceV2Impl) CheckEnterpriseAccess(
    ctx context.Context,
    userID uint,
    resourceEnterpriseID uint,
) (bool, error) {
    // 1. 获取用户身份
    identity, err := s.identityProvider.GetUserIdentity(userID)
    if err != nil {
        return false, fmt.Errorf("获取用户身份失败: %w", err)
    }

    // 2. 系统用户不能直接访问企业数据
    if identity.IsSystemUser() {
        return false, fmt.Errorf("系统管理员不能直接访问企业数据，请通过企业管理门户操作")
    }

    // 3. 企业用户只能访问自己企业的数据
    if identity.IsEnterpriseUser() {
        userEnterpriseID := identity.GetEnterpriseID()
        if userEnterpriseID == nil {
            return false, fmt.Errorf("企业用户缺少enterprise_id")
        }

        if *userEnterpriseID != resourceEnterpriseID {
            return false, fmt.Errorf("无权访问其他企业的数据")
        }

        return true, nil
    }

    return false, fmt.Errorf("未知的用户类型")
}

// CheckPermissions 批量权限检查
func (s *permissionServiceV2Impl) CheckPermissions(
    ctx context.Context,
    identity models.UserIdentity,
    permissionCodes []string,
) (map[string]*PermissionCheckResult, error) {
    results := make(map[string]*PermissionCheckResult)

    for _, code := range permissionCodes {
        var result *PermissionCheckResult
        var err error

        if identity.IsSystemUser() {
            result, err = s.CheckSystemPermission(ctx, identity.GetUserID(), code)
        } else if identity.IsEnterpriseUser() {
            enterpriseID := identity.GetEnterpriseID()
            if enterpriseID == nil {
                results[code] = &PermissionCheckResult{
                    HasPermission:  false,
                    PermissionCode: code,
                    CheckedAt:      time.Now(),
                }
                continue
            }
            result, err = s.CheckEnterprisePermission(ctx, identity.GetUserID(), *enterpriseID, code)
        }

        if err != nil {
            results[code] = &PermissionCheckResult{
                HasPermission:  false,
                PermissionCode: code,
                CheckedAt:      time.Now(),
            }
        } else {
            results[code] = result
        }
    }

    return results, nil
}

// GetUserPermissions 获取用户的所有权限列表
func (s *permissionServiceV2Impl) GetUserPermissions(
    ctx context.Context,
    identity models.UserIdentity,
) ([]string, error) {
    if identity.IsSystemUser() {
        sysIdentity := identity.(*models.SystemUserIdentity)
        return s.systemChecker.GetRolePermissions(ctx, sysIdentity.SystemRoleID)
    } else if identity.IsEnterpriseUser() {
        entIdentity := identity.(*models.EnterpriseUserIdentity)
        return s.enterpriseChecker.GetUserPermissions(ctx, entIdentity.EnterpriseUserID)
    }

    return nil, fmt.Errorf("未知的用户类型")
}

// InvalidateCache 清除用户的权限缓存
func (s *permissionServiceV2Impl) InvalidateCache(
    ctx context.Context,
    identity models.UserIdentity,
) error {
    pattern := ""
    if identity.IsSystemUser() {
        pattern = fmt.Sprintf("sys:%d:*", identity.GetUserID())
    } else if identity.IsEnterpriseUser() {
        enterpriseID := identity.GetEnterpriseID()
        if enterpriseID == nil {
            return fmt.Errorf("企业用户缺少enterprise_id")
        }
        pattern = fmt.Sprintf("ent:%d:%d:*", *enterpriseID, identity.GetUserID())
    }

    return s.cache.DeletePattern(ctx, pattern)
}

// InvalidateUserCache 清除指定用户的所有权限缓存
func (s *permissionServiceV2Impl) InvalidateUserCache(
    ctx context.Context,
    userID uint,
) error {
    // 清除系统域缓存
    s.cache.DeletePattern(ctx, fmt.Sprintf("sys:%d:*", userID))

    // 清除企业域缓存（所有企业）
    s.cache.DeletePattern(ctx, fmt.Sprintf("ent:*:%d:*", userID))

    return nil
}

// InvalidateEnterpriseCache 清除指定企业的所有权限缓存
func (s *permissionServiceV2Impl) InvalidateEnterpriseCache(
    ctx context.Context,
    enterpriseID uint,
) error {
    return s.cache.DeletePattern(ctx, fmt.Sprintf("ent:%d:*:*", enterpriseID))
}

// isBasePermission 检查是否为基础权限（内部方法）
func (s *permissionServiceV2Impl) isBasePermission(ctx context.Context, permissionCode string) bool {
    // 检查内存缓存
    if isBase, ok := s.basePermissionsCache[permissionCode]; ok {
        return isBase
    }

    // 查询数据库
    isBase := s.enterpriseChecker.IsBasePermission(ctx, permissionCode)

    // 缓存结果
    s.basePermissionsCache[permissionCode] = isBase

    return isBase
}
```

#### 2.2 PermissionCache接口

```go
// PermissionCache 权限缓存接口
type PermissionCache interface {
    Get(ctx context.Context, key string) (bool, bool)
    Set(ctx context.Context, key string, value bool, ttl time.Duration) error
    Delete(ctx context.Context, key string) error
    DeletePattern(ctx context.Context, pattern string) error
    Clear(ctx context.Context) error
}

// redisPermissionCache Redis实现的权限缓存
type redisPermissionCache struct {
    client *redis.Client
    prefix string
}

func NewRedisPermissionCache(client *redis.Client, prefix string) PermissionCache {
    return &redisPermissionCache{
        client: client,
        prefix: prefix,
    }
}

func (c *redisPermissionCache) buildKey(key string) string {
    return fmt.Sprintf("%s:%s", c.prefix, key)
}

func (c *redisPermissionCache) Get(ctx context.Context, key string) (bool, bool) {
    fullKey := c.buildKey(key)
    val, err := c.client.Get(ctx, fullKey).Result()
    if err != nil {
        return false, false
    }
    return val == "1", true
}

func (c *redisPermissionCache) Set(ctx context.Context, key string, value bool, ttl time.Duration) error {
    fullKey := c.buildKey(key)
    val := "0"
    if value {
        val = "1"
    }
    return c.client.Set(ctx, fullKey, val, ttl).Err()
}

func (c *redisPermissionCache) Delete(ctx context.Context, key string) error {
    fullKey := c.buildKey(key)
    return c.client.Del(ctx, fullKey).Err()
}

func (c *redisPermissionCache) DeletePattern(ctx context.Context, pattern string) error {
    fullPattern := c.buildKey(pattern)

    // 使用SCAN命令遍历匹配的key
    var cursor uint64
    for {
        keys, nextCursor, err := c.client.Scan(ctx, cursor, fullPattern, 100).Result()
        if err != nil {
            return err
        }

        if len(keys) > 0 {
            if err := c.client.Del(ctx, keys...).Err(); err != nil {
                return err
            }
        }

        cursor = nextCursor
        if cursor == 0 {
            break
        }
    }

    return nil
}

func (c *redisPermissionCache) Clear(ctx context.Context) error {
    return c.DeletePattern(ctx, "*")
}

// memoryPermissionCache 内存实现的权限缓存（用于测试）
type memoryPermissionCache struct {
    data sync.Map
}

func NewMemoryPermissionCache() PermissionCache {
    return &memoryPermissionCache{}
}

func (c *memoryPermissionCache) Get(ctx context.Context, key string) (bool, bool) {
    val, ok := c.data.Load(key)
    if !ok {
        return false, false
    }

    entry := val.(*cacheEntry)
    if time.Now().After(entry.expiresAt) {
        c.data.Delete(key)
        return false, false
    }

    return entry.value, true
}

func (c *memoryPermissionCache) Set(ctx context.Context, key string, value bool, ttl time.Duration) error {
    entry := &cacheEntry{
        value:     value,
        expiresAt: time.Now().Add(ttl),
    }
    c.data.Store(key, entry)
    return nil
}

func (c *memoryPermissionCache) Delete(ctx context.Context, key string) error {
    c.data.Delete(key)
    return nil
}

func (c *memoryPermissionCache) DeletePattern(ctx context.Context, pattern string) error {
    // 简单实现：遍历所有key
    c.data.Range(func(key, value interface{}) bool {
        keyStr := key.(string)
        if strings.Contains(keyStr, strings.TrimSuffix(pattern, "*")) {
            c.data.Delete(key)
        }
        return true
    })
    return nil
}

func (c *memoryPermissionCache) Clear(ctx context.Context) error {
    c.data = sync.Map{}
    return nil
}

type cacheEntry struct {
    value     bool
    expiresAt time.Time
}
```

---

### 3. 中间件原型

#### 3.1 权限检查中间件

**文件**: `middleware/permission_middleware_v2_proto.go`

```go
package middleware

import (
    "net/http"
    "strings"

    "github.com/gin-gonic/gin"
    "new-ai-proj/models"
    "new-ai-proj/services"
)

// PermissionMiddlewareV2 权限中间件V2
type PermissionMiddlewareV2 struct {
    permService      services.PermissionServiceV2
    identityProvider models.IdentityProvider
}

func NewPermissionMiddlewareV2(
    permService services.PermissionServiceV2,
    identityProvider models.IdentityProvider,
) *PermissionMiddlewareV2 {
    return &PermissionMiddlewareV2{
        permService:      permService,
        identityProvider: identityProvider,
    }
}

// RequireSystemPermission 要求系统域权限
func (m *PermissionMiddlewareV2) RequireSystemPermission(permissionCode string) gin.HandlerFunc {
    return func(c *gin.Context) {
        // 1. 获取用户ID（由JWT中间件设置）
        userID, exists := c.Get("user_id")
        if !exists {
            m.respondUnauthorized(c, "未认证")
            return
        }

        // 2. 获取系统用户身份
        identity, err := m.identityProvider.GetSystemUserIdentity(userID.(uint))
        if err != nil {
            m.respondForbidden(c, "需要系统管理员权限", err.Error())
            return
        }

        // 3. 检查权限
        result, err := m.permService.CheckSystemPermission(
            c.Request.Context(),
            identity.GetUserID(),
            permissionCode,
        )
        if err != nil {
            m.respondForbidden(c, "权限检查失败", err.Error())
            return
        }

        if !result.HasPermission {
            m.respondForbidden(c, "权限不足", permissionCode)
            return
        }

        // 4. 将身份信息和权限检查结果存入context
        c.Set("user_identity", identity)
        c.Set("permission_check_result", result)
        c.Next()
    }
}

// RequireEnterprisePermission 要求企业域权限
func (m *PermissionMiddlewareV2) RequireEnterprisePermission(permissionCode string) gin.HandlerFunc {
    return func(c *gin.Context) {
        // 1. 获取用户ID
        userID, exists := c.Get("user_id")
        if !exists {
            m.respondUnauthorized(c, "未认证")
            return
        }

        // 2. 获取企业ID（可能来自多个来源）
        enterpriseID := m.extractEnterpriseID(c)
        if enterpriseID == 0 {
            m.respondForbidden(c, "缺少企业身份", "")
            return
        }

        // 3. 获取企业用户身份
        identity, err := m.identityProvider.GetEnterpriseUserIdentity(
            userID.(uint),
            enterpriseID,
        )
        if err != nil {
            m.respondForbidden(c, "需要企业用户身份", err.Error())
            return
        }

        // 4. 检查权限
        result, err := m.permService.CheckEnterprisePermission(
            c.Request.Context(),
            identity.GetUserID(),
            *identity.GetEnterpriseID(),
            permissionCode,
        )
        if err != nil {
            m.respondForbidden(c, "权限检查失败", err.Error())
            return
        }

        if !result.HasPermission {
            m.respondForbidden(c, "权限不足", permissionCode)
            return
        }

        // 5. 将身份信息和权限检查结果存入context
        c.Set("user_identity", identity)
        c.Set("permission_check_result", result)
        c.Set("enterprise_id", enterpriseID)
        c.Next()
    }
}

// RequireAnyEnterprisePermission 要求任一企业权限（OR逻辑）
func (m *PermissionMiddlewareV2) RequireAnyEnterprisePermission(permissionCodes ...string) gin.HandlerFunc {
    return func(c *gin.Context) {
        userID, exists := c.Get("user_id")
        if !exists {
            m.respondUnauthorized(c, "未认证")
            return
        }

        enterpriseID := m.extractEnterpriseID(c)
        if enterpriseID == 0 {
            m.respondForbidden(c, "缺少企业身份", "")
            return
        }

        identity, err := m.identityProvider.GetEnterpriseUserIdentity(
            userID.(uint),
            enterpriseID,
        )
        if err != nil {
            m.respondForbidden(c, "需要企业用户身份", err.Error())
            return
        }

        // 检查是否拥有任一权限
        for _, permCode := range permissionCodes {
            result, err := m.permService.CheckEnterprisePermission(
                c.Request.Context(),
                identity.GetUserID(),
                *identity.GetEnterpriseID(),
                permCode,
            )
            if err == nil && result.HasPermission {
                c.Set("user_identity", identity)
                c.Set("permission_check_result", result)
                c.Set("enterprise_id", enterpriseID)
                c.Next()
                return
            }
        }

        m.respondForbidden(c, "权限不足", strings.Join(permissionCodes, " OR "))
    }
}

// RequireSystemUser 要求系统用户身份（不检查具体权限）
func (m *PermissionMiddlewareV2) RequireSystemUser() gin.HandlerFunc {
    return func(c *gin.Context) {
        userID, exists := c.Get("user_id")
        if !exists {
            m.respondUnauthorized(c, "未认证")
            return
        }

        identity, err := m.identityProvider.GetSystemUserIdentity(userID.(uint))
        if err != nil {
            m.respondForbidden(c, "需要系统管理员身份", err.Error())
            return
        }

        c.Set("user_identity", identity)
        c.Next()
    }
}

// RequireEnterpriseUser 要求企业用户身份（不检查具体权限）
func (m *PermissionMiddlewareV2) RequireEnterpriseUser() gin.HandlerFunc {
    return func(c *gin.Context) {
        userID, exists := c.Get("user_id")
        if !exists {
            m.respondUnauthorized(c, "未认证")
            return
        }

        enterpriseID := m.extractEnterpriseID(c)
        if enterpriseID == 0 {
            m.respondForbidden(c, "缺少企业身份", "")
            return
        }

        identity, err := m.identityProvider.GetEnterpriseUserIdentity(
            userID.(uint),
            enterpriseID,
        )
        if err != nil {
            m.respondForbidden(c, "需要企业用户身份", err.Error())
            return
        }

        c.Set("user_identity", identity)
        c.Set("enterprise_id", enterpriseID)
        c.Next()
    }
}

// EnforceEnterpriseIsolation 强制企业隔离
func (m *PermissionMiddlewareV2) EnforceEnterpriseIsolation() gin.HandlerFunc {
    return func(c *gin.Context) {
        userID, exists := c.Get("user_id")
        if !exists {
            m.respondUnauthorized(c, "未认证")
            return
        }

        // 获取用户身份
        identity, err := m.identityProvider.GetUserIdentity(userID.(uint))
        if err != nil {
            m.respondForbidden(c, "无法识别用户身份", err.Error())
            return
        }

        // 系统用户不能直接访问企业数据
        if identity.IsSystemUser() {
            m.respondForbidden(c, "系统管理员不能直接访问企业数据", "请通过企业管理门户进行操作")
            return
        }

        // 企业用户只能访问自己企业的数据
        if identity.IsEnterpriseUser() {
            resourceEnterpriseID := m.extractResourceEnterpriseID(c)
            userEnterpriseID := identity.GetEnterpriseID()

            // 资源有enterprise_id时，必须匹配用户的enterprise_id
            if resourceEnterpriseID != 0 && userEnterpriseID != nil {
                canAccess, err := m.permService.CheckEnterpriseAccess(
                    c.Request.Context(),
                    userID.(uint),
                    resourceEnterpriseID,
                )
                if err != nil || !canAccess {
                    m.respondForbidden(c, "无权访问其他企业的数据", "")
                    return
                }
            }
        }

        c.Set("user_identity", identity)
        c.Next()
    }
}

// extractEnterpriseID 提取企业ID（用户的企业ID）
func (m *PermissionMiddlewareV2) extractEnterpriseID(c *gin.Context) uint {
    // 1. 从context提取（可能由其他中间件设置）
    if eid, exists := c.Get("enterprise_id"); exists {
        if enterpriseID, ok := eid.(uint); ok {
            return enterpriseID
        }
    }

    // 2. 从JWT claims提取
    if eid, exists := c.Get("jwt_enterprise_id"); exists {
        if enterpriseID, ok := eid.(uint); ok {
            return enterpriseID
        }
    }

    // 3. 从Header提取
    if eidStr := c.GetHeader("X-Enterprise-ID"); eidStr != "" {
        var enterpriseID uint
        if _, err := fmt.Sscanf(eidStr, "%d", &enterpriseID); err == nil {
            return enterpriseID
        }
    }

    return 0
}

// extractResourceEnterpriseID 从资源中提取enterprise_id
func (m *PermissionMiddlewareV2) extractResourceEnterpriseID(c *gin.Context) uint {
    // 1. 从路径参数提取
    if eidStr := c.Param("enterprise_id"); eidStr != "" {
        var enterpriseID uint
        if _, err := fmt.Sscanf(eidStr, "%d", &enterpriseID); err == nil {
            return enterpriseID
        }
    }

    // 2. 从查询参数提取
    if eidStr := c.Query("enterprise_id"); eidStr != "" {
        var enterpriseID uint
        if _, err := fmt.Sscanf(eidStr, "%d", &enterpriseID); err == nil {
            return enterpriseID
        }
    }

    // 3. 从context提取（handler可能已设置）
    if eid, exists := c.Get("resource_enterprise_id"); exists {
        if enterpriseID, ok := eid.(uint); ok {
            return enterpriseID
        }
    }

    return 0
}

// 响应辅助方法
func (m *PermissionMiddlewareV2) respondUnauthorized(c *gin.Context, message string) {
    c.JSON(http.StatusUnauthorized, gin.H{
        "success": false,
        "error": gin.H{
            "code":    "UNAUTHORIZED",
            "message": message,
        },
    })
    c.Abort()
}

func (m *PermissionMiddlewareV2) respondForbidden(c *gin.Context, message string, detail string) {
    response := gin.H{
        "success": false,
        "error": gin.H{
            "code":    "FORBIDDEN",
            "message": message,
        },
    }

    if detail != "" {
        response["error"].(gin.H)["detail"] = detail
    }

    c.JSON(http.StatusForbidden, response)
    c.Abort()
}
```

---

## 📊 数据库原型

### 1. 测试环境表结构

**文件**: `migrations/prototype/001_create_test_tables.sql`

```sql
-- ============================================
-- RBAC V2 原型测试表
-- ============================================

BEGIN;

-- 1. 系统角色表
CREATE TABLE IF NOT EXISTS system_roles_proto (
    id SERIAL PRIMARY KEY,
    role_code VARCHAR(50) UNIQUE NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    privilege_level INT NOT NULL CHECK (privilege_level BETWEEN 1 AND 100),
    is_active BOOLEAN DEFAULT TRUE,
    is_deletable BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 系统权限表
CREATE TABLE IF NOT EXISTS system_permissions_proto (
    id SERIAL PRIMARY KEY,
    permission_code VARCHAR(100) UNIQUE NOT NULL,
    permission_name VARCHAR(200) NOT NULL,
    module VARCHAR(50) NOT NULL,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_sys_perm_code (permission_code),
    INDEX idx_sys_perm_module (module)
);

-- 3. 系统角色权限映射表
CREATE TABLE IF NOT EXISTS system_role_permissions_proto (
    id SERIAL PRIMARY KEY,
    system_role_id INT NOT NULL REFERENCES system_roles_proto(id) ON DELETE CASCADE,
    system_permission_id INT NOT NULL REFERENCES system_permissions_proto(id) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INT,

    UNIQUE(system_role_id, system_permission_id),
    INDEX idx_sys_role_perm (system_role_id)
);

-- 4. 系统用户表
CREATE TABLE IF NOT EXISTS system_users_proto (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    system_role_id INT NOT NULL REFERENCES system_roles_proto(id),
    is_active BOOLEAN DEFAULT TRUE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INT,
    notes TEXT,

    INDEX idx_sys_user_role (system_role_id)
);

-- 5. 企业角色表
CREATE TABLE IF NOT EXISTS enterprise_roles_proto (
    id SERIAL PRIMARY KEY,
    enterprise_id INT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    role_code VARCHAR(50) NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_preset BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,

    UNIQUE(enterprise_id, role_code),
    INDEX idx_ent_role_enterprise (enterprise_id),
    INDEX idx_ent_role_code (enterprise_id, role_code)
);

-- 6. 企业权限表
CREATE TABLE IF NOT EXISTS enterprise_permissions_proto (
    id SERIAL PRIMARY KEY,
    permission_code VARCHAR(100) UNIQUE NOT NULL,
    permission_name VARCHAR(200) NOT NULL,
    module VARCHAR(50) NOT NULL,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    scope VARCHAR(50) DEFAULT 'enterprise',
    description TEXT,
    is_base_permission BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_ent_perm_code (permission_code),
    INDEX idx_ent_perm_module (module),
    INDEX idx_ent_perm_base (is_base_permission)
);

-- 7. 企业角色权限映射表
CREATE TABLE IF NOT EXISTS enterprise_role_permissions_proto (
    id SERIAL PRIMARY KEY,
    enterprise_role_id INT NOT NULL REFERENCES enterprise_roles_proto(id) ON DELETE CASCADE,
    enterprise_permission_id INT NOT NULL REFERENCES enterprise_permissions_proto(id) ON DELETE CASCADE,
    scope_constraint JSONB,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INT,

    UNIQUE(enterprise_role_id, enterprise_permission_id),
    INDEX idx_ent_role_perm (enterprise_role_id)
);

-- 8. 企业用户角色映射表
CREATE TABLE IF NOT EXISTS enterprise_user_roles_proto (
    id SERIAL PRIMARY KEY,
    enterprise_user_id INT NOT NULL REFERENCES enterprise_users(id) ON DELETE CASCADE,
    enterprise_role_id INT NOT NULL REFERENCES enterprise_roles_proto(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INT,
    expires_at TIMESTAMP,

    UNIQUE(enterprise_user_id, enterprise_role_id),
    INDEX idx_ent_user_role (enterprise_user_id),
    INDEX idx_ent_role_user (enterprise_role_id)
);

-- 9. 企业用户自定义权限表
CREATE TABLE IF NOT EXISTS enterprise_user_custom_permissions_proto (
    id SERIAL PRIMARY KEY,
    enterprise_user_id INT NOT NULL REFERENCES enterprise_users(id) ON DELETE CASCADE,
    enterprise_permission_id INT NOT NULL REFERENCES enterprise_permissions_proto(id) ON DELETE CASCADE,
    is_granted BOOLEAN NOT NULL,
    scope_constraint JSONB,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INT,
    expires_at TIMESTAMP,
    reason TEXT,

    UNIQUE(enterprise_user_id, enterprise_permission_id),
    INDEX idx_ent_user_custom_perm (enterprise_user_id)
);

COMMIT;
```

### 2. 种子数据

**文件**: `migrations/prototype/002_seed_test_data.sql`

```sql
-- ============================================
-- 原型测试种子数据
-- ============================================

BEGIN;

-- 1. 插入系统角色
INSERT INTO system_roles_proto (role_code, role_name, description, privilege_level, is_deletable) VALUES
    ('super_admin', '超级管理员', '拥有所有系统权限', 1, FALSE),
    ('system_admin', '系统管理员', '企业管理、配置管理', 10, FALSE),
    ('system_auditor', '系统审计员', '审计日志查看', 30, FALSE);

-- 2. 插入系统权限
INSERT INTO system_permissions_proto (permission_code, permission_name, module, resource, action, description) VALUES
    ('system.enterprise.create', '创建企业', 'system', 'enterprise', 'create', '创建新的企业租户'),
    ('system.enterprise.read', '查看企业', 'system', 'enterprise', 'read', '查看企业信息'),
    ('system.enterprise.update', '编辑企业', 'system', 'enterprise', 'update', '编辑企业信息'),
    ('system.enterprise.delete', '删除企业', 'system', 'enterprise', 'delete', '删除企业'),
    ('system.enterprise.list', '企业列表', 'system', 'enterprise', 'list', '查看所有企业列表'),
    ('system.user.create', '创建系统用户', 'system', 'user', 'create', '创建系统管理员'),
    ('system.user.read', '查看系统用户', 'system', 'user', 'read', '查看系统用户信息'),
    ('system.config.read', '查看系统配置', 'system', 'config', 'read', '查看系统配置'),
    ('system.config.update', '修改系统配置', 'system', 'config', 'update', '修改系统配置'),
    ('system.monitoring.view', '系统监控', 'system', 'monitoring', 'view', '查看系统监控数据'),
    ('system.audit.view', '审计日志', 'system', 'audit', 'view', '查看审计日志');

-- 3. 分配super_admin所有权限
INSERT INTO system_role_permissions_proto (system_role_id, system_permission_id)
SELECT sr.id, sp.id
FROM system_roles_proto sr
CROSS JOIN system_permissions_proto sp
WHERE sr.role_code = 'super_admin';

-- 4. 分配system_admin企业管理权限
INSERT INTO system_role_permissions_proto (system_role_id, system_permission_id)
SELECT sr.id, sp.id
FROM system_roles_proto sr
CROSS JOIN system_permissions_proto sp
WHERE sr.role_code = 'system_admin'
  AND sp.module = 'system'
  AND sp.resource IN ('enterprise', 'user', 'config');

-- 5. 分配system_auditor只读权限
INSERT INTO system_role_permissions_proto (system_role_id, system_permission_id)
SELECT sr.id, sp.id
FROM system_roles_proto sr
CROSS JOIN system_permissions_proto sp
WHERE sr.role_code = 'system_auditor'
  AND sp.action IN ('read', 'view', 'list');

-- 6. 插入企业权限
INSERT INTO enterprise_permissions_proto (permission_code, permission_name, module, resource, action, scope, is_base_permission) VALUES
    -- 基础权限
    ('enterprise.dashboard.read', '查看仪表盘', 'dashboard', 'dashboard', 'read', 'enterprise', TRUE),
    ('enterprise.profile.read', '查看个人资料', 'profile', 'profile', 'read', 'own', TRUE),
    ('enterprise.profile.update', '编辑个人资料', 'profile', 'profile', 'update', 'own', TRUE),

    -- 用户管理权限
    ('enterprise.user.create', '创建用户', 'user', 'user', 'create', 'enterprise', FALSE),
    ('enterprise.user.read', '查看用户', 'user', 'user', 'read', 'enterprise', FALSE),
    ('enterprise.user.update', '编辑用户', 'user', 'user', 'update', 'enterprise', FALSE),
    ('enterprise.user.delete', '删除用户', 'user', 'user', 'delete', 'enterprise', FALSE),

    -- 项目管理权限
    ('enterprise.project.create', '创建项目', 'project', 'project', 'create', 'enterprise', FALSE),
    ('enterprise.project.read', '查看项目', 'project', 'project', 'read', 'enterprise', TRUE),
    ('enterprise.project.update', '编辑项目', 'project', 'project', 'update', 'project', FALSE),
    ('enterprise.project.delete', '删除项目', 'project', 'project', 'delete', 'project', FALSE),

    -- 任务管理权限
    ('enterprise.task.create', '创建任务', 'task', 'task', 'create', 'project', TRUE),
    ('enterprise.task.read', '查看任务', 'task', 'task', 'read', 'enterprise', TRUE),
    ('enterprise.task.update', '编辑任务', 'task', 'task', 'update', 'task', FALSE),
    ('enterprise.task.delete', '删除任务', 'task', 'task', 'delete', 'task', FALSE);

-- 7. 为测试企业创建角色（假设企业ID=1）
INSERT INTO enterprise_roles_proto (enterprise_id, role_code, role_name, description, is_system_preset) VALUES
    (1, 'enterprise_admin', '企业管理员', '企业内所有权限', TRUE),
    (1, 'project_manager', '项目经理', '项目和任务管理权限', TRUE),
    (1, 'team_member', '团队成员', '基础权限', TRUE);

-- 8. 为enterprise_admin分配所有权限
INSERT INTO enterprise_role_permissions_proto (enterprise_role_id, enterprise_permission_id)
SELECT er.id, ep.id
FROM enterprise_roles_proto er
CROSS JOIN enterprise_permissions_proto ep
WHERE er.role_code = 'enterprise_admin'
  AND er.enterprise_id = 1;

-- 9. 为project_manager分配项目和任务权限
INSERT INTO enterprise_role_permissions_proto (enterprise_role_id, enterprise_permission_id)
SELECT er.id, ep.id
FROM enterprise_roles_proto er
CROSS JOIN enterprise_permissions_proto ep
WHERE er.role_code = 'project_manager'
  AND er.enterprise_id = 1
  AND (ep.is_base_permission = TRUE OR ep.module IN ('project', 'task'));

-- 10. 为team_member分配基础权限
INSERT INTO enterprise_role_permissions_proto (enterprise_role_id, enterprise_permission_id)
SELECT er.id, ep.id
FROM enterprise_roles_proto er
CROSS JOIN enterprise_permissions_proto ep
WHERE er.role_code = 'team_member'
  AND er.enterprise_id = 1
  AND ep.is_base_permission = TRUE;

COMMIT;
```

### 3. 性能测试查询

**文件**: `migrations/prototype/003_performance_test_queries.sql`

```sql
-- ============================================
-- 性能测试查询
-- ============================================

-- 1. 系统用户权限检查（目标: <5ms）
EXPLAIN ANALYZE
SELECT COUNT(*) > 0 as has_permission
FROM system_role_permissions_proto srp
JOIN system_permissions_proto sp ON srp.system_permission_id = sp.id
WHERE srp.system_role_id = 1
  AND sp.permission_code = 'system.enterprise.create'
  AND sp.is_active = TRUE;

-- 2. 企业用户权限检查 - 基础权限（目标: <3ms）
EXPLAIN ANALYZE
SELECT COUNT(*) > 0 as has_permission
FROM enterprise_permissions_proto
WHERE permission_code = 'enterprise.dashboard.read'
  AND is_base_permission = TRUE
  AND is_active = TRUE;

-- 3. 企业用户权限检查 - 角色权限（目标: <10ms）
EXPLAIN ANALYZE
SELECT COUNT(*) > 0 as has_permission
FROM enterprise_user_roles_proto eur
JOIN enterprise_role_permissions_proto erp ON eur.enterprise_role_id = erp.enterprise_role_id
JOIN enterprise_permissions_proto ep ON erp.enterprise_permission_id = ep.id
WHERE eur.enterprise_user_id = 1
  AND ep.permission_code = 'enterprise.project.create'
  AND ep.is_active = TRUE
  AND (eur.expires_at IS NULL OR eur.expires_at > NOW());

-- 4. 企业用户权限检查 - 包含自定义权限（目标: <15ms）
EXPLAIN ANALYZE
WITH custom_perm AS (
    SELECT eucp.is_granted
    FROM enterprise_user_custom_permissions_proto eucp
    JOIN enterprise_permissions_proto ep ON eucp.enterprise_permission_id = ep.id
    WHERE eucp.enterprise_user_id = 1
      AND ep.permission_code = 'enterprise.project.delete'
      AND (eucp.expires_at IS NULL OR eucp.expires_at > NOW())
    LIMIT 1
),
role_perm AS (
    SELECT COUNT(*) > 0 as has_permission
    FROM enterprise_user_roles_proto eur
    JOIN enterprise_role_permissions_proto erp ON eur.enterprise_role_id = erp.enterprise_role_id
    JOIN enterprise_permissions_proto ep ON erp.enterprise_permission_id = ep.id
    WHERE eur.enterprise_user_id = 1
      AND ep.permission_code = 'enterprise.project.delete'
      AND ep.is_active = TRUE
      AND (eur.expires_at IS NULL OR eur.expires_at > NOW())
)
SELECT COALESCE(
    (SELECT is_granted FROM custom_perm),
    (SELECT has_permission FROM role_perm),
    FALSE
) as final_permission;

-- 5. 获取用户所有权限（目标: <50ms）
EXPLAIN ANALYZE
WITH base_perms AS (
    SELECT permission_code
    FROM enterprise_permissions_proto
    WHERE is_base_permission = TRUE
      AND is_active = TRUE
),
role_perms AS (
    SELECT DISTINCT ep.permission_code
    FROM enterprise_user_roles_proto eur
    JOIN enterprise_role_permissions_proto erp ON eur.enterprise_role_id = erp.enterprise_role_id
    JOIN enterprise_permissions_proto ep ON erp.enterprise_permission_id = ep.id
    WHERE eur.enterprise_user_id = 1
      AND ep.is_active = TRUE
      AND (eur.expires_at IS NULL OR eur.expires_at > NOW())
),
custom_granted AS (
    SELECT ep.permission_code
    FROM enterprise_user_custom_permissions_proto eucp
    JOIN enterprise_permissions_proto ep ON eucp.enterprise_permission_id = ep.id
    WHERE eucp.enterprise_user_id = 1
      AND eucp.is_granted = TRUE
      AND (eucp.expires_at IS NULL OR eucp.expires_at > NOW())
),
custom_revoked AS (
    SELECT ep.permission_code
    FROM enterprise_user_custom_permissions_proto eucp
    JOIN enterprise_permissions_proto ep ON eucp.enterprise_permission_id = ep.id
    WHERE eucp.enterprise_user_id = 1
      AND eucp.is_granted = FALSE
      AND (eucp.expires_at IS NULL OR eucp.expires_at > NOW())
)
SELECT DISTINCT permission_code
FROM (
    SELECT permission_code FROM base_perms
    UNION
    SELECT permission_code FROM role_perms
    UNION
    SELECT permission_code FROM custom_granted
    EXCEPT
    SELECT permission_code FROM custom_revoked
) all_perms
ORDER BY permission_code;

-- 6. 企业隔离检查（目标: <5ms）
EXPLAIN ANALYZE
SELECT eu.enterprise_id = 1 as can_access
FROM enterprise_users eu
WHERE eu.user_id = 123
  AND eu.is_active = TRUE
LIMIT 1;
```

---

## 🔄 权限检查流程图

### 1. 系统用户权限检查流程

```
[开始] 用户请求系统API
   ↓
[JWT中间件] 验证Token，提取user_id
   ↓
[RequireSystemPermission中间件]
   ↓
[IdentityProvider] 获取SystemUserIdentity
   ├─ 查询system_users表
   ├─ JOIN system_roles获取角色信息
   └─ 缓存5分钟
   ↓
[检查用户状态] is_active = TRUE?
   ├─ NO → [403 Forbidden]
   └─ YES
       ↓
[Super Admin?] privilege_level = 1?
   ├─ YES → [授权通过] ✅
   └─ NO
       ↓
[PermissionServiceV2] CheckSystemPermission()
   ↓
[检查Redis缓存] Key: sys:{user_id}:{permission}
   ├─ HIT → [返回缓存结果]
   └─ MISS
       ↓
[SystemPermissionChecker] CheckRolePermission()
   ├─ 查询system_role_permissions
   ├─ JOIN system_permissions
   └─ WHERE role_id AND permission_code
       ↓
[缓存结果] TTL: 15分钟
   ↓
[has_permission?]
   ├─ YES → [授权通过] ✅ → [调用Handler]
   └─ NO → [403 Forbidden] ❌
```

### 2. 企业用户权限检查流程

```
[开始] 用户请求企业API
   ↓
[JWT中间件] 验证Token，提取user_id + enterprise_id
   ↓
[RequireEnterprisePermission中间件]
   ↓
[IdentityProvider] 获取EnterpriseUserIdentity
   ├─ 查询enterprise_users表
   ├─ JOIN enterprises, enterprise_roles
   ├─ 查询所有enterprise_user_roles
   └─ 缓存5分钟
   ↓
[检查用户状态] is_active = TRUE?
   ├─ NO → [403 Forbidden]
   └─ YES
       ↓
[PermissionServiceV2] CheckEnterprisePermission()
   ↓
[检查Redis缓存] Key: ent:{ent_id}:{user_id}:{perm}
   ├─ HIT → [返回缓存结果]
   └─ MISS
       ↓
[检查基础权限] is_base_permission = TRUE?
   ├─ YES → [授权通过] ✅ (缓存1小时)
   └─ NO
       ↓
[Enterprise Admin?] role_code = 'enterprise_admin'?
   ├─ YES → [授权通过] ✅
   └─ NO
       ↓
[检查自定义权限] enterprise_user_custom_permissions
   ├─ FOUND → [返回is_granted值]
   └─ NOT FOUND
       ↓
[EnterprisePermissionChecker] CheckRolesPermission()
   ├─ 获取用户所有role_ids
   ├─ 查询enterprise_role_permissions
   ├─ JOIN enterprise_permissions
   └─ WHERE role_id IN (...) AND permission_code
       ↓
[缓存结果] TTL: 15分钟
   ↓
[has_permission?]
   ├─ YES → [授权通过] ✅ → [调用Handler]
   └─ NO → [403 Forbidden] ❌
```

### 3. 企业隔离验证流程

```
[开始] 企业用户请求资源
   ↓
[EnforceEnterpriseIsolation中间件]
   ↓
[获取用户身份] GetUserIdentity(user_id)
   ↓
[用户类型判断]
   ├─ 系统用户 → [拒绝访问] "系统管理员不能直接访问企业数据"
   └─ 企业用户
       ↓
[提取资源的enterprise_id]
   ├─ 从路径参数: /enterprises/:enterprise_id/...
   ├─ 从查询参数: ?enterprise_id=...
   └─ 从context: resource_enterprise_id
       ↓
[资源有enterprise_id?]
   ├─ NO → [允许访问] (资源不限企业)
   └─ YES
       ↓
[比对enterprise_id]
   ├─ user.enterprise_id = resource.enterprise_id?
   │  ├─ YES → [授权通过] ✅
   │  └─ NO → [403 Forbidden] "无权访问其他企业的数据"
   └─
```

### 4. 缓存策略流程

```
[权限检查请求]
   ↓
[构建缓存Key]
   ├─ 系统域: sys:{user_id}:{permission_code}
   └─ 企业域: ent:{enterprise_id}:{user_id}:{permission_code}
   ↓
[Redis GET]
   ├─ Key存在 → [返回缓存值] ✅
   └─ Key不存在
       ↓
[数据库查询]
   ├─ 系统权限查询
   └─ 企业权限查询
       ↓
[Redis SET]
   ├─ 基础权限: TTL = 1小时
   ├─ 普通权限: TTL = 15分钟
   └─ 临时权限: TTL = 5分钟
       ↓
[返回结果]

[缓存失效触发器]
   ├─ 用户角色变更 → DeletePattern("sys:{user_id}:*")
   ├─ 角色权限变更 → DeletePattern("ent:{enterprise_id}:*:*")
   ├─ 用户自定义权限变更 → DeletePattern("ent:*:{user_id}:*")
   └─ 企业删除/禁用 → DeletePattern("ent:{enterprise_id}:*:*")
```

---

## 🧪 原型验证计划

### 1. 单元测试场景

#### 测试文件: `services/permission_service_v2_test.go`

```go
package services_test

import (
    "context"
    "testing"
    "time"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
    "new-ai-proj/models"
    "new-ai-proj/services"
)

// Test 1: 系统用户权限检查 - Super Admin
func TestCheckSystemPermission_SuperAdmin(t *testing.T) {
    // Setup
    mockDB := setupMockDB()
    mockCache := services.NewMemoryPermissionCache()
    identityProvider := setupMockIdentityProvider()

    permService := services.NewPermissionServiceV2(mockDB, mockCache, identityProvider)

    // Mock Super Admin身份
    identityProvider.On("GetSystemUserIdentity", uint(1)).Return(&models.SystemUserIdentity{
        UserID:         1,
        SystemRoleID:   1,
        RoleCode:       "super_admin",
        PrivilegeLevel: 1,
        BaseIdentity: models.BaseIdentity{
            IsActive: true,
        },
    }, nil)

    // Execute
    result, err := permService.CheckSystemPermission(
        context.Background(),
        1,
        "system.enterprise.delete",
    )

    // Assert
    assert.NoError(t, err)
    assert.True(t, result.HasPermission)
    assert.Equal(t, "system.enterprise.delete", result.PermissionCode)
}

// Test 2: 系统用户权限检查 - 普通管理员有权限
func TestCheckSystemPermission_AdminWithPermission(t *testing.T) {
    // Setup
    mockDB := setupMockDB()
    mockCache := services.NewMemoryPermissionCache()
    identityProvider := setupMockIdentityProvider()

    permService := services.NewPermissionServiceV2(mockDB, mockCache, identityProvider)

    // Mock System Admin身份
    identityProvider.On("GetSystemUserIdentity", uint(2)).Return(&models.SystemUserIdentity{
        UserID:         2,
        SystemRoleID:   2,
        RoleCode:       "system_admin",
        PrivilegeLevel: 10,
        BaseIdentity: models.BaseIdentity{
            IsActive: true,
        },
    }, nil)

    // Mock数据库查询结果 - 有权限
    mockDB.On("QueryRolePermission", uint(2), "system.enterprise.create").Return(true, nil)

    // Execute
    result, err := permService.CheckSystemPermission(
        context.Background(),
        2,
        "system.enterprise.create",
    )

    // Assert
    assert.NoError(t, err)
    assert.True(t, result.HasPermission)
}

// Test 3: 系统用户权限检查 - 无权限
func TestCheckSystemPermission_AdminWithoutPermission(t *testing.T) {
    // Setup
    mockDB := setupMockDB()
    mockCache := services.NewMemoryPermissionCache()
    identityProvider := setupMockIdentityProvider()

    permService := services.NewPermissionServiceV2(mockDB, mockCache, identityProvider)

    // Mock System Auditor身份
    identityProvider.On("GetSystemUserIdentity", uint(3)).Return(&models.SystemUserIdentity{
        UserID:         3,
        SystemRoleID:   3,
        RoleCode:       "system_auditor",
        PrivilegeLevel: 30,
        BaseIdentity: models.BaseIdentity{
            IsActive: true,
        },
    }, nil)

    // Mock数据库查询结果 - 无权限
    mockDB.On("QueryRolePermission", uint(3), "system.enterprise.delete").Return(false, nil)

    // Execute
    result, err := permService.CheckSystemPermission(
        context.Background(),
        3,
        "system.enterprise.delete",
    )

    // Assert
    assert.NoError(t, err)
    assert.False(t, result.HasPermission)
}

// Test 4: 企业用户权限检查 - 基础权限
func TestCheckEnterprisePermission_BasePermission(t *testing.T) {
    // Setup
    mockDB := setupMockDB()
    mockCache := services.NewMemoryPermissionCache()
    identityProvider := setupMockIdentityProvider()

    permService := services.NewPermissionServiceV2(mockDB, mockCache, identityProvider)

    // Mock企业用户身份
    identityProvider.On("GetEnterpriseUserIdentity", uint(10), uint(1)).Return(&models.EnterpriseUserIdentity{
        UserID:           10,
        EnterpriseID:     1,
        EnterpriseUserID: 5,
        RoleCode:         "team_member",
        BaseIdentity: models.BaseIdentity{
            IsActive: true,
        },
    }, nil)

    // Mock基础权限检查
    mockDB.On("IsBasePermission", "enterprise.dashboard.read").Return(true)

    // Execute
    result, err := permService.CheckEnterprisePermission(
        context.Background(),
        10,
        1,
        "enterprise.dashboard.read",
    )

    // Assert
    assert.NoError(t, err)
    assert.True(t, result.HasPermission)
}

// Test 5: 企业用户权限检查 - Enterprise Admin
func TestCheckEnterprisePermission_EnterpriseAdmin(t *testing.T) {
    // Setup
    mockDB := setupMockDB()
    mockCache := services.NewMemoryPermissionCache()
    identityProvider := setupMockIdentityProvider()

    permService := services.NewPermissionServiceV2(mockDB, mockCache, identityProvider)

    // Mock企业管理员身份
    identityProvider.On("GetEnterpriseUserIdentity", uint(11), uint(1)).Return(&models.EnterpriseUserIdentity{
        UserID:           11,
        EnterpriseID:     1,
        EnterpriseUserID: 6,
        RoleCode:         "enterprise_admin",
        RoleCodes:        []string{"enterprise_admin"},
        BaseIdentity: models.BaseIdentity{
            IsActive: true,
        },
    }, nil)

    // Execute - 任何权限都应该通过
    result, err := permService.CheckEnterprisePermission(
        context.Background(),
        11,
        1,
        "enterprise.user.delete",
    )

    // Assert
    assert.NoError(t, err)
    assert.True(t, result.HasPermission)
}

// Test 6: 企业用户权限检查 - 自定义权限覆盖
func TestCheckEnterprisePermission_CustomPermissionOverride(t *testing.T) {
    // Setup
    mockDB := setupMockDB()
    mockCache := services.NewMemoryPermissionCache()
    identityProvider := setupMockIdentityProvider()

    permService := services.NewPermissionServiceV2(mockDB, mockCache, identityProvider)

    // Mock企业用户身份
    identityProvider.On("GetEnterpriseUserIdentity", uint(12), uint(1)).Return(&models.EnterpriseUserIdentity{
        UserID:           12,
        EnterpriseID:     1,
        EnterpriseUserID: 7,
        RoleCode:         "team_member",
        RoleIDs:          []uint{3},
        BaseIdentity: models.BaseIdentity{
            IsActive: true,
        },
    }, nil)

    // Mock自定义权限 - 撤销
    mockDB.On("GetCustomPermission", uint(7), "enterprise.project.delete").Return(&services.CustomPermission{
        IsGranted: false,
    }, true)

    // Execute
    result, err := permService.CheckEnterprisePermission(
        context.Background(),
        12,
        1,
        "enterprise.project.delete",
    )

    // Assert
    assert.NoError(t, err)
    assert.False(t, result.HasPermission) // 自定义权限撤销
}

// Test 7: 企业用户权限检查 - 角色权限
func TestCheckEnterprisePermission_RolePermission(t *testing.T) {
    // Setup
    mockDB := setupMockDB()
    mockCache := services.NewMemoryPermissionCache()
    identityProvider := setupMockIdentityProvider()

    permService := services.NewPermissionServiceV2(mockDB, mockCache, identityProvider)

    // Mock项目经理身份
    identityProvider.On("GetEnterpriseUserIdentity", uint(13), uint(1)).Return(&models.EnterpriseUserIdentity{
        UserID:           13,
        EnterpriseID:     1,
        EnterpriseUserID: 8,
        RoleCode:         "project_manager",
        RoleIDs:          []uint{2},
        BaseIdentity: models.BaseIdentity{
            IsActive: true,
        },
    }, nil)

    // Mock数据库查询 - 有权限
    mockDB.On("CheckRolesPermission", []uint{2}, "enterprise.project.create").Return(true, nil)

    // Execute
    result, err := permService.CheckEnterprisePermission(
        context.Background(),
        13,
        1,
        "enterprise.project.create",
    )

    // Assert
    assert.NoError(t, err)
    assert.True(t, result.HasPermission)
}

// Test 8: 企业隔离检查 - 系统用户拒绝
func TestCheckEnterpriseAccess_SystemUserDenied(t *testing.T) {
    // Setup
    mockDB := setupMockDB()
    mockCache := services.NewMemoryPermissionCache()
    identityProvider := setupMockIdentityProvider()

    permService := services.NewPermissionServiceV2(mockDB, mockCache, identityProvider)

    // Mock系统用户身份
    identityProvider.On("GetUserIdentity", uint(1)).Return(&models.SystemUserIdentity{
        UserID:         1,
        SystemRoleID:   1,
        RoleCode:       "super_admin",
        BaseIdentity: models.BaseIdentity{
            IsActive: true,
        },
    }, nil)

    // Execute
    canAccess, err := permService.CheckEnterpriseAccess(
        context.Background(),
        1,
        1, // 尝试访问企业1的资源
    )

    // Assert
    assert.Error(t, err)
    assert.False(t, canAccess)
    assert.Contains(t, err.Error(), "系统管理员不能直接访问企业数据")
}

// Test 9: 企业隔离检查 - 跨企业拒绝
func TestCheckEnterpriseAccess_CrossEnterpriseDenied(t *testing.T) {
    // Setup
    mockDB := setupMockDB()
    mockCache := services.NewMemoryPermissionCache()
    identityProvider := setupMockIdentityProvider()

    permService := services.NewPermissionServiceV2(mockDB, mockCache, identityProvider)

    // Mock企业1的用户
    identityProvider.On("GetUserIdentity", uint(10)).Return(&models.EnterpriseUserIdentity{
        UserID:       10,
        EnterpriseID: 1,
        BaseIdentity: models.BaseIdentity{
            IsActive: true,
        },
    }, nil)

    // Execute - 尝试访问企业2的资源
    canAccess, err := permService.CheckEnterpriseAccess(
        context.Background(),
        10,
        2,
    )

    // Assert
    assert.Error(t, err)
    assert.False(t, canAccess)
    assert.Contains(t, err.Error(), "无权访问其他企业的数据")
}

// Test 10: 缓存功能测试
func TestPermissionCache_HitAndMiss(t *testing.T) {
    // Setup
    mockDB := setupMockDB()
    mockCache := services.NewMemoryPermissionCache()
    identityProvider := setupMockIdentityProvider()

    permService := services.NewPermissionServiceV2(mockDB, mockCache, identityProvider)

    // Mock身份
    identityProvider.On("GetSystemUserIdentity", uint(2)).Return(&models.SystemUserIdentity{
        UserID:         2,
        SystemRoleID:   2,
        RoleCode:       "system_admin",
        PrivilegeLevel: 10,
        BaseIdentity: models.BaseIdentity{
            IsActive: true,
        },
    }, nil)

    // Mock数据库查询
    mockDB.On("QueryRolePermission", uint(2), "system.enterprise.read").Return(true, nil)

    // First call - cache miss
    result1, err := permService.CheckSystemPermission(
        context.Background(),
        2,
        "system.enterprise.read",
    )
    assert.NoError(t, err)
    assert.True(t, result1.HasPermission)
    assert.False(t, result1.CacheHit) // 第一次调用，缓存未命中

    // Second call - cache hit
    result2, err := permService.CheckSystemPermission(
        context.Background(),
        2,
        "system.enterprise.read",
    )
    assert.NoError(t, err)
    assert.True(t, result2.HasPermission)
    assert.True(t, result2.CacheHit) // 第二次调用，缓存命中

    // 验证数据库只查询了一次
    mockDB.AssertNumberOfCalls(t, "QueryRolePermission", 1)
}
```

### 2. 集成测试场景

#### 测试文件: `integration_tests/rbac_v2_integration_test.go`

```go
package integration_tests

import (
    "context"
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/gin-gonic/gin"
    "github.com/stretchr/testify/assert"
    "new-ai-proj/routes"
)

// Test 1: 完整的系统API请求流程
func TestSystemAPI_CreateEnterprise_FullFlow(t *testing.T) {
    // Setup测试环境
    testEnv := setupIntegrationTestEnv(t)
    defer testEnv.Teardown()

    router := gin.New()
    routes.SetupSystemRoutesV2(router, testEnv.App)

    // 创建测试用户和Token
    testUser := testEnv.CreateSystemUser("system_admin")
    token := testEnv.GenerateJWT(testUser.ID)

    // 准备请求
    req, _ := http.NewRequest("POST", "/api/v1/system/enterprises", strings.NewReader(`{
        "name": "测试企业",
        "description": "集成测试创建的企业"
    }`))
    req.Header.Set("Authorization", "Bearer "+token)
    req.Header.Set("Content-Type", "application/json")

    // 执行请求
    w := httptest.NewRecorder()
    router.ServeHTTP(w, req)

    // 验证响应
    assert.Equal(t, http.StatusOK, w.Code)

    var response map[string]interface{}
    json.Unmarshal(w.Body.Bytes(), &response)
    assert.True(t, response["success"].(bool))
    assert.NotNil(t, response["data"])
}

// Test 2: 企业API请求流程 - 企业隔离验证
func TestEnterpriseAPI_ProjectList_EnterpriseIsolation(t *testing.T) {
    // Setup
    testEnv := setupIntegrationTestEnv(t)
    defer testEnv.Teardown()

    router := gin.New()
    routes.SetupEnterpriseRoutesV2(router, testEnv.App)

    // 创建两个企业和用户
    enterprise1 := testEnv.CreateEnterprise("企业A")
    enterprise2 := testEnv.CreateEnterprise("企业B")

    user1 := testEnv.CreateEnterpriseUser(enterprise1.ID, "project_manager")
    token1 := testEnv.GenerateJWT(user1.ID, enterprise1.ID)

    // 在企业2中创建项目
    project2 := testEnv.CreateProject(enterprise2.ID, "企业B的项目")

    // 用企业1的用户尝试访问企业2的项目
    req, _ := http.NewRequest("GET", fmt.Sprintf("/api/v1/enterprise/projects/%d", project2.ID), nil)
    req.Header.Set("Authorization", "Bearer "+token1)

    w := httptest.NewRecorder()
    router.ServeHTTP(w, req)

    // 应该被拒绝
    assert.Equal(t, http.StatusForbidden, w.Code)

    var response map[string]interface{}
    json.Unmarshal(w.Body.Bytes(), &response)
    assert.False(t, response["success"].(bool))
    assert.Contains(t, response["error"].(map[string]interface{})["message"], "无权访问其他企业")
}

// Test 3: 权限检查 - Enterprise Admin所有权限
func TestEnterpriseAPI_EnterpriseAdmin_HasAllPermissions(t *testing.T) {
    // Setup
    testEnv := setupIntegrationTestEnv(t)
    defer testEnv.Teardown()

    router := gin.New()
    routes.SetupEnterpriseRoutesV2(router, testEnv.App)

    enterprise := testEnv.CreateEnterprise("测试企业")
    admin := testEnv.CreateEnterpriseUser(enterprise.ID, "enterprise_admin")
    token := testEnv.GenerateJWT(admin.ID, enterprise.ID)

    // 测试多个需要不同权限的API
    testCases := []struct {
        method   string
        path     string
        expected int
    }{
        {"GET", "/api/v1/enterprise/users", http.StatusOK},
        {"POST", "/api/v1/enterprise/users", http.StatusOK},
        {"GET", "/api/v1/enterprise/projects", http.StatusOK},
        {"POST", "/api/v1/enterprise/projects", http.StatusOK},
        {"POST", "/api/v1/enterprise/roles", http.StatusOK},
    }

    for _, tc := range testCases {
        req, _ := http.NewRequest(tc.method, tc.path, nil)
        req.Header.Set("Authorization", "Bearer "+token)

        w := httptest.NewRecorder()
        router.ServeHTTP(w, req)

        assert.Equal(t, tc.expected, w.Code, "API: %s %s", tc.method, tc.path)
    }
}

// Test 4: 权限检查 - Team Member受限权限
func TestEnterpriseAPI_TeamMember_LimitedPermissions(t *testing.T) {
    // Setup
    testEnv := setupIntegrationTestEnv(t)
    defer testEnv.Teardown()

    router := gin.New()
    routes.SetupEnterpriseRoutesV2(router, testEnv.App)

    enterprise := testEnv.CreateEnterprise("测试企业")
    member := testEnv.CreateEnterpriseUser(enterprise.ID, "team_member")
    token := testEnv.GenerateJWT(member.ID, enterprise.ID)

    // 测试应该被拒绝的操作
    forbiddenAPIs := []struct {
        method string
        path   string
    }{
        {"POST", "/api/v1/enterprise/users"},      // 不能创建用户
        {"DELETE", "/api/v1/enterprise/users/1"},  // 不能删除用户
        {"POST", "/api/v1/enterprise/roles"},      // 不能创建角色
    }

    for _, api := range forbiddenAPIs {
        req, _ := http.NewRequest(api.method, api.path, nil)
        req.Header.Set("Authorization", "Bearer "+token)

        w := httptest.NewRecorder()
        router.ServeHTTP(w, req)

        assert.Equal(t, http.StatusForbidden, w.Code, "API: %s %s", api.method, api.path)
    }

    // 测试应该被允许的操作
    allowedAPIs := []struct {
        method string
        path   string
    }{
        {"GET", "/api/v1/enterprise/projects"},    // 可以查看项目
        {"GET", "/api/v1/enterprise/tasks"},       // 可以查看任务
    }

    for _, api := range allowedAPIs {
        req, _ := http.NewRequest(api.method, api.path, nil)
        req.Header.Set("Authorization", "Bearer "+token)

        w := httptest.NewRecorder()
        router.ServeHTTP(w, req)

        assert.Equal(t, http.StatusOK, w.Code, "API: %s %s", api.method, api.path)
    }
}

// Test 5: 自定义权限覆盖测试
func TestEnterpriseAPI_CustomPermissionOverride(t *testing.T) {
    // Setup
    testEnv := setupIntegrationTestEnv(t)
    defer testEnv.Teardown()

    router := gin.New()
    routes.SetupEnterpriseRoutesV2(router, testEnv.App)

    enterprise := testEnv.CreateEnterprise("测试企业")
    member := testEnv.CreateEnterpriseUser(enterprise.ID, "team_member")

    // 授予team_member额外的项目创建权限
    testEnv.GrantCustomPermission(member.ID, "enterprise.project.create", true)

    token := testEnv.GenerateJWT(member.ID, enterprise.ID)

    // 尝试创建项目（通常team_member没有这个权限）
    req, _ := http.NewRequest("POST", "/api/v1/enterprise/projects", strings.NewReader(`{
        "name": "测试项目"
    }`))
    req.Header.Set("Authorization", "Bearer "+token)
    req.Header.Set("Content-Type", "application/json")

    w := httptest.NewRecorder()
    router.ServeHTTP(w, req)

    // 应该成功（因为自定义权限授予了）
    assert.Equal(t, http.StatusOK, w.Code)
}
```

### 3. 性能基准测试

#### 测试文件: `benchmarks/permission_benchmark_test.go`

```go
package benchmarks

import (
    "context"
    "testing"
)

// Benchmark 1: 系统权限检查性能
func BenchmarkSystemPermissionCheck(b *testing.B) {
    testEnv := setupBenchmarkEnv()
    defer testEnv.Teardown()

    permService := testEnv.PermissionService
    ctx := context.Background()

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        _, _ = permService.CheckSystemPermission(ctx, 1, "system.enterprise.read")
    }
}

// Benchmark 2: 企业权限检查性能（基础权限）
func BenchmarkEnterprisePermissionCheck_BasePermission(b *testing.B) {
    testEnv := setupBenchmarkEnv()
    defer testEnv.Teardown()

    permService := testEnv.PermissionService
    ctx := context.Background()

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        _, _ = permService.CheckEnterprisePermission(ctx, 10, 1, "enterprise.dashboard.read")
    }
}

// Benchmark 3: 企业权限检查性能（角色权限）
func BenchmarkEnterprisePermissionCheck_RolePermission(b *testing.B) {
    testEnv := setupBenchmarkEnv()
    defer testEnv.Teardown()

    permService := testEnv.PermissionService
    ctx := context.Background()

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        _, _ = permService.CheckEnterprisePermission(ctx, 10, 1, "enterprise.project.create")
    }
}

// Benchmark 4: 批量权限检查性能
func BenchmarkBatchPermissionCheck(b *testing.B) {
    testEnv := setupBenchmarkEnv()
    defer testEnv.Teardown()

    permService := testEnv.PermissionService
    ctx := context.Background()
    identity := testEnv.GetEnterpriseUserIdentity(10, 1)

    permissions := []string{
        "enterprise.project.read",
        "enterprise.project.create",
        "enterprise.task.read",
        "enterprise.task.create",
        "enterprise.document.read",
    }

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        _, _ = permService.CheckPermissions(ctx, identity, permissions)
    }
}

// Benchmark 5: 缓存性能对比
func BenchmarkCachePerformance(b *testing.B) {
    testEnv := setupBenchmarkEnv()
    defer testEnv.Teardown()

    permService := testEnv.PermissionService
    ctx := context.Background()

    // 预热缓存
    permService.CheckSystemPermission(ctx, 1, "system.enterprise.read")

    b.Run("WithCache", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            _, _ = permService.CheckSystemPermission(ctx, 1, "system.enterprise.read")
        }
    })

    b.Run("WithoutCache", func(b *testing.B) {
        testEnv.ClearCache()
        for i := 0; i < b.N; i++ {
            _, _ = permService.CheckSystemPermission(ctx, 1, "system.enterprise.read")
            testEnv.ClearCache() // 每次清除缓存
        }
    })
}
```

**性能目标:**
- 系统权限检查: < 5ms (无缓存), < 0.5ms (有缓存)
- 企业基础权限检查: < 3ms (无缓存), < 0.5ms (有缓存)
- 企业角色权限检查: < 10ms (无缓存), < 0.5ms (有缓存)
- 批量权限检查 (5个权限): < 30ms (无缓存), < 2ms (有缓存)

---

## 🎯 原型验证总结

### 原型实现的核心价值

1. **验证技术可行性**: 双层权限域架构可以用Go和PostgreSQL实现
2. **性能验证**: 缓存策略可以将权限检查降低到<1ms
3. **安全性验证**: 企业隔离机制可以有效防止跨租户访问
4. **可维护性验证**: 代码结构清晰，易于扩展和维护

### 原型发现的风险点

1. **Redis缓存依赖**: 需要确保Redis高可用，否则影响性能
2. **数据库索引**: 必须正确创建索引，否则性能会大幅下降
3. **多角色用户**: 需要仔细处理多角色权限合并逻辑
4. **自定义权限**: 需要UI界面配合，否则功能无法被使用

### 下一步建议

1. **在测试环境部署原型**: 验证真实场景下的性能和稳定性
2. **压力测试**: 模拟1000并发用户进行压测
3. **安全审计**: 邀请安全专家审查代码和架构
4. **用户测试**: 邀请真实用户测试权限管理界面

---

## 📚 附录

### A. 完整的Go接口清单

```
models/
├── user_identity_v2.go          (已实现)
└── identity_provider.go         (已实现)

services/
├── permission_service_v2.go     (已实现)
├── system_permission_checker.go (待实现，参考方案文档)
├── enterprise_permission_checker.go (待实现，参考方案文档)
└── permission_cache.go          (已实现)

middleware/
└── permission_middleware_v2.go  (已实现)
```

### B. 数据库脚本清单

```
migrations/prototype/
├── 001_create_test_tables.sql   (已提供)
├── 002_seed_test_data.sql       (已提供)
└── 003_performance_test_queries.sql (已提供)
```

### C. 测试文件清单

```
tests/
├── services/permission_service_v2_test.go      (已提供)
├── integration_tests/rbac_v2_integration_test.go (已提供)
└── benchmarks/permission_benchmark_test.go     (已提供)
```

---

**原型设计完成日期**: 2025-10-28
**预计原型开发时间**: 2周
**原型验证周期**: 1周

---

**下一步行动:**
1. Review原型设计，确认技术方案
2. 在测试环境创建proto表
3. 实现核心代码（3-5天）
4. 运行单元测试和性能测试
5. 基于测试结果调整方案
