package database

import (
	"ai-project-backend/models"
	"context"
)

// UserService 提供用户管理的业务逻辑层接口
// 它在UserRepository之上提供更高级的业务功能，包括：
// - 复杂的用户查询和过滤
// - 批量操作
// - 统计和聚合
// - 业务规则验证
type UserService interface {
	// 基础CRUD操作
	CreateUser(ctx context.Context, user *models.User) (*models.User, error)
	GetUserByID(ctx context.Context, id int) (*models.User, error)
	UpdateUser(ctx context.Context, id int, req *models.UserUpdateRequest) (*models.User, error)
	DeleteUser(ctx context.Context, id int) error

	// 高级查询和列表
	ListUsers(ctx context.Context, params *models.UserListParams) ([]*models.User, int, error)

	// 密码和认证管理
	ResetPassword(ctx context.Context, userID int, passwordHash string) error
	UpdateLastLogin(ctx context.Context, userID int) error

	// 用户状态管理
	UpdateUserStatus(ctx context.Context, userID int, status string) (*models.User, error)

	// 批量操作
	BatchUpdateUsers(ctx context.Context, userIDs []int, action string) error

	// 统计和聚合
	GetUserStats(ctx context.Context) (*models.UserStats, error)
}
