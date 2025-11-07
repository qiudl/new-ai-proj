package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"fmt"
)

// DefaultUserService implements UserService interface, providing user management business logic
// It delegates to UserRepository for data access operations
type DefaultUserService struct {
	db       interface{}
	userRepo UserRepository
}

// NewUserService creates a new user service with a given UserRepository
// This constructor allows for better testability by accepting a UserRepository interface
func NewUserService(userRepo UserRepository) UserService {
	return &DefaultUserService{
		userRepo: userRepo,
		db:       nil,
	}
}

// NewUserServiceWithDB creates a new user service from a database connection
// This is a convenience constructor that creates the UserRepository internally
// Deprecated: Prefer NewUserService with explicit UserRepository for better testability
func NewUserServiceWithDB(db interface{}) UserService {
	var userRepo UserRepository
	if sqlDB, ok := db.(*sql.DB); ok {
		userRepo = &PostgresUserRepository{db: sqlDB}
	} else if tx, ok := db.(*sql.Tx); ok {
		userRepo = &PostgresUserRepository{db: tx}
	}

	return &DefaultUserService{
		db:       db,
		userRepo: userRepo,
	}
}

// getExecer returns the appropriate execer (DB or Tx)
func (s *DefaultUserService) getExecer() execer {
	if tx, ok := s.db.(*sql.Tx); ok {
		return tx
	}
	return s.db.(*sql.DB)
}

// CreateUser creates a new user with enhanced fields
func (s *DefaultUserService) CreateUser(ctx context.Context, user *models.User) (*models.User, error) {
	// Delegate to the main UserRepository which handles enterprise routing
	return s.userRepo.Create(ctx, user)
}

// GetUserByID gets a user by ID with all fields
func (s *DefaultUserService) GetUserByID(ctx context.Context, id int) (*models.User, error) {
	// Delegate to the main UserRepository which handles enterprise routing
	return s.userRepo.GetByID(ctx, id)
}

// UpdateUser updates a user with partial updates
func (s *DefaultUserService) UpdateUser(ctx context.Context, id int, req *models.UserUpdateRequest) (*models.User, error) {
	// First get the existing user
	user, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Apply the partial updates to the user object
	if req.Username != nil {
		user.Username = *req.Username
	}
	if req.Email != nil {
		user.Email = *req.Email
	}
	if req.UserType != nil {
		user.UserType = *req.UserType
	}
	if req.CompanyID != nil {
		user.CompanyID = req.CompanyID
	}
	if req.Role != nil {
		user.Role = *req.Role
	}
	if req.Status != nil {
		user.Status = *req.Status
	}
	if req.Profile != nil {
		user.Profile = *req.Profile
	}

	// Update enterprise user specific fields
	if req.ContactPersonName != nil {
		user.ContactPersonName = req.ContactPersonName
	}
	if req.ContactPhone != nil {
		user.ContactPhone = req.ContactPhone
	}
	if req.DepartmentTitle != nil {
		user.DepartmentTitle = req.DepartmentTitle
	}
	if req.Notes != nil {
		user.Notes = req.Notes
	}

	// Update using the main UserRepository which handles enterprise routing
	return s.userRepo.Update(ctx, user)
}

// DeleteUser soft deletes a user (or hard delete based on preference)
func (s *DefaultUserService) DeleteUser(ctx context.Context, id int) error {
	// Delegate to the main UserRepository which handles enterprise routing
	return s.userRepo.Delete(ctx, id)
}

// ListUsers gets users with advanced filtering and pagination
func (s *DefaultUserService) ListUsers(ctx context.Context, params *models.UserListParams) ([]*models.User, int, error) {
	// Delegate to repository layer for data access
	return s.userRepo.ListUsers(ctx, params)
}


// ResetPassword resets a user's password
func (s *DefaultUserService) ResetPassword(ctx context.Context, userID int, passwordHash string) error {
	// Delegate to UserRepository which handles the database access
	return s.userRepo.UpdatePassword(ctx, userID, passwordHash)
}

// UpdateUserStatus updates a user's status
func (s *DefaultUserService) UpdateUserStatus(ctx context.Context, userID int, status string) (*models.User, error) {
	// Get the existing user first
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Update the status
	user.Status = status

	// Update using the main UserRepository which handles enterprise routing
	return s.userRepo.Update(ctx, user)
}

// BatchUpdateUsers performs batch operations on users
func (s *DefaultUserService) BatchUpdateUsers(ctx context.Context, userIDs []int, action string) error {
	if len(userIDs) == 0 {
		return fmt.Errorf("no user IDs provided")
	}

	// Process each user individually to handle hybrid storage
	for _, userID := range userIDs {
		switch action {
		case "activate":
			_, err := s.UpdateUserStatus(ctx, userID, "active")
			if err != nil {
				return fmt.Errorf("failed to activate user %d: %w", userID, err)
			}
		case "suspend":
			_, err := s.UpdateUserStatus(ctx, userID, "suspended")
			if err != nil {
				return fmt.Errorf("failed to suspend user %d: %w", userID, err)
			}
		case "delete":
			err := s.DeleteUser(ctx, userID)
			if err != nil {
				return fmt.Errorf("failed to delete user %d: %w", userID, err)
			}
		default:
			return fmt.Errorf("invalid action: %s", action)
		}
	}

	return nil
}

// GetUserStats gets user statistics
func (s *DefaultUserService) GetUserStats(ctx context.Context) (*models.UserStats, error) {
	// Delegate to repository layer for data access
	return s.userRepo.GetUserStats(ctx)
}

// UpdateLastLogin updates the last login timestamp
func (s *DefaultUserService) UpdateLastLogin(ctx context.Context, userID int) error {
	// Delegate to UserRepository which handles the database access
	return s.userRepo.UpdateLastLogin(ctx, userID)
}
