package database

// DEPRECATED: This file is kept for backwards compatibility only.
// Use user_service.go and user_service_impl.go instead.
//
// UserManagementRepository has been refactored to DefaultUserService
// to better reflect its role in the layered architecture.
//
// All methods previously on UserManagementRepository are now implemented
// by DefaultUserService in user_service_impl.go

// UserManagementRepository is a deprecated alias for DefaultUserService
// Deprecated: Use UserService interface and DefaultUserService instead
type UserManagementRepository = DefaultUserService

// NewUserManagementRepository creates a new user service (backwards compatibility wrapper)
// Deprecated: Use NewUserServiceWithDB instead
//
// This function maintains backwards compatibility with existing code that uses
// UserManagementRepository. It internally creates a DefaultUserService.
func NewUserManagementRepository(db interface{}) UserService {
	return NewUserServiceWithDB(db)
}
