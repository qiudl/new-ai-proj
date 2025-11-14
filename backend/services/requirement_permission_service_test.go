package services

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRequirementPermissionService_GetRequirementAccess(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	// Create mock permission repository
	mockRepo := new(MockPermissionRepository)
	permService := NewPermissionService(mockRepo, db)
	reqPermService := NewRequirementPermissionService(permService, db)
	ctx := context.Background()

	userID := 1
	requirementID := 1

	// Mock requirement query
	requirementRows := sqlmock.NewRows([]string{
		"id", "enterprise_id", "submitter_id", "reviewer_id", "status",
	}).AddRow(
		requirementID, 1, userID, nil, models.RequirementStatusDraft,
	)

	mock.ExpectQuery(`SELECT id, enterprise_id, submitter_id, reviewer_id, status`).
		WithArgs(requirementID).
		WillReturnRows(requirementRows)

	// Mock user info query
	userRows := sqlmock.NewRows([]string{
		"id", "username", "role", "company_id",
	}).AddRow(
		userID, "testuser", "company_user", 1,
	)

	mock.ExpectQuery(`SELECT id, username, role, company_id`).
		WithArgs(userID).
		WillReturnRows(userRows)

	// Execute test
	access, err := reqPermService.GetRequirementAccess(ctx, userID, requirementID)

	// Verify results
	assert.NoError(t, err)
	assert.NotNil(t, access)
	assert.True(t, access.CanAccess, "Submitter should have access")
	assert.True(t, access.CanUpdate, "Submitter should be able to update draft")
	assert.True(t, access.CanDelete, "Submitter should be able to delete draft")
	assert.True(t, access.IsSubmitter, "User should be identified as submitter")
	assert.Equal(t, "submitter", access.Reason)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementPermissionService_GetRequirementAccess_SystemAdmin(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	mockRepo := new(MockPermissionRepository)
	permService := NewPermissionService(mockRepo, db)
	reqPermService := NewRequirementPermissionService(permService, db)
	ctx := context.Background()

	adminUserID := 1
	requirementID := 1

	// Mock requirement query
	requirementRows := sqlmock.NewRows([]string{
		"id", "enterprise_id", "submitter_id", "reviewer_id", "status",
	}).AddRow(
		requirementID, 1, 2, nil, models.RequirementStatusPending,
	)

	mock.ExpectQuery(`SELECT id, enterprise_id, submitter_id, reviewer_id, status`).
		WithArgs(requirementID).
		WillReturnRows(requirementRows)

	// Mock user info query - admin user
	userRows := sqlmock.NewRows([]string{
		"id", "username", "role", "company_id",
	}).AddRow(
		adminUserID, "admin", "admin", sql.NullInt64{},
	)

	mock.ExpectQuery(`SELECT id, username, role, company_id`).
		WithArgs(adminUserID).
		WillReturnRows(userRows)

	// Execute test
	access, err := reqPermService.GetRequirementAccess(ctx, adminUserID, requirementID)

	// Verify results
	assert.NoError(t, err)
	assert.NotNil(t, access)
	assert.True(t, access.CanAccess, "Admin should have access")
	assert.True(t, access.CanUpdate, "Admin should be able to update")
	assert.True(t, access.CanDelete, "Admin should be able to delete")
	assert.True(t, access.CanApprove, "Admin should be able to approve")
	assert.True(t, access.CanReject, "Admin should be able to reject")
	assert.Equal(t, "system admin", access.Reason)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementPermissionService_GetRequirementAccess_Reviewer(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	mockRepo := new(MockPermissionRepository)
	permService := NewPermissionService(mockRepo, db)
	reqPermService := NewRequirementPermissionService(permService, db)
	ctx := context.Background()

	reviewerUserID := 2
	requirementID := 1

	// Mock requirement query with reviewer
	requirementRows := sqlmock.NewRows([]string{
		"id", "enterprise_id", "submitter_id", "reviewer_id", "status",
	}).AddRow(
		requirementID, 1, 1, reviewerUserID, models.RequirementStatusPending,
	)

	mock.ExpectQuery(`SELECT id, enterprise_id, submitter_id, reviewer_id, status`).
		WithArgs(requirementID).
		WillReturnRows(requirementRows)

	// Mock user info query
	userRows := sqlmock.NewRows([]string{
		"id", "username", "role", "company_id",
	}).AddRow(
		reviewerUserID, "reviewer", "company_user", 1,
	)

	mock.ExpectQuery(`SELECT id, username, role, company_id`).
		WithArgs(reviewerUserID).
		WillReturnRows(userRows)

	// Execute test
	access, err := reqPermService.GetRequirementAccess(ctx, reviewerUserID, requirementID)

	// Verify results
	assert.NoError(t, err)
	assert.NotNil(t, access)
	assert.True(t, access.CanAccess, "Reviewer should have access")
	assert.True(t, access.IsReviewer, "User should be identified as reviewer")
	assert.True(t, access.CanApprove, "Reviewer should be able to approve pending requirement")
	assert.True(t, access.CanReject, "Reviewer should be able to reject pending requirement")
	assert.False(t, access.CanUpdate, "Reviewer should not be able to update")
	assert.False(t, access.CanDelete, "Reviewer should not be able to delete")
	assert.Equal(t, "reviewer", access.Reason)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementPermissionService_GetRequirementAccess_EnterpriseUser(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	mockRepo := new(MockPermissionRepository)
	permService := NewPermissionService(mockRepo, db)
	reqPermService := NewRequirementPermissionService(permService, db)
	ctx := context.Background()

	userID := 3
	requirementID := 1
	enterpriseID := 1

	// Mock requirement query
	requirementRows := sqlmock.NewRows([]string{
		"id", "enterprise_id", "submitter_id", "reviewer_id", "status",
	}).AddRow(
		requirementID, enterpriseID, 1, nil, models.RequirementStatusPending,
	)

	mock.ExpectQuery(`SELECT id, enterprise_id, submitter_id, reviewer_id, status`).
		WithArgs(requirementID).
		WillReturnRows(requirementRows)

	// Mock user info query - same enterprise
	userRows := sqlmock.NewRows([]string{
		"id", "username", "role", "company_id",
	}).AddRow(
		userID, "user", "company_user", enterpriseID,
	)

	mock.ExpectQuery(`SELECT id, username, role, company_id`).
		WithArgs(userID).
		WillReturnRows(userRows)

	// Execute test
	access, err := reqPermService.GetRequirementAccess(ctx, userID, requirementID)

	// Verify results
	assert.NoError(t, err)
	assert.NotNil(t, access)
	assert.True(t, access.CanAccess, "Enterprise member should have access")
	assert.True(t, access.IsEnterpriseUser, "User should be identified as enterprise member")
	assert.True(t, access.CanComment, "Enterprise member should be able to comment")
	assert.False(t, access.CanUpdate, "Enterprise member should not be able to update")
	assert.False(t, access.CanDelete, "Enterprise member should not be able to delete")
	assert.False(t, access.CanApprove, "Regular enterprise member should not be able to approve")
	assert.Equal(t, "enterprise member", access.Reason)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementPermissionService_GetRequirementAccess_NoAccess(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	mockRepo := new(MockPermissionRepository)
	permService := NewPermissionService(mockRepo, db)
	reqPermService := NewRequirementPermissionService(permService, db)
	ctx := context.Background()

	userID := 3
	requirementID := 1

	// Mock requirement query
	requirementRows := sqlmock.NewRows([]string{
		"id", "enterprise_id", "submitter_id", "reviewer_id", "status",
	}).AddRow(
		requirementID, 1, 1, nil, models.RequirementStatusPending,
	)

	mock.ExpectQuery(`SELECT id, enterprise_id, submitter_id, reviewer_id, status`).
		WithArgs(requirementID).
		WillReturnRows(requirementRows)

	// Mock user info query - different enterprise
	userRows := sqlmock.NewRows([]string{
		"id", "username", "role", "company_id",
	}).AddRow(
		userID, "user", "company_user", 2, // Different enterprise
	)

	mock.ExpectQuery(`SELECT id, username, role, company_id`).
		WithArgs(userID).
		WillReturnRows(userRows)

	// Execute test
	access, err := reqPermService.GetRequirementAccess(ctx, userID, requirementID)

	// Verify results
	assert.NoError(t, err)
	assert.NotNil(t, access)
	assert.False(t, access.CanAccess, "User from different enterprise should not have access")
	assert.False(t, access.CanUpdate)
	assert.False(t, access.CanDelete)
	assert.False(t, access.CanApprove)
	assert.False(t, access.IsSubmitter)
	assert.False(t, access.IsReviewer)
	assert.False(t, access.IsEnterpriseUser)
	assert.Equal(t, "no access", access.Reason)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementPermissionService_CheckRequirementStatusTransition(t *testing.T) {
	tests := []struct {
		name           string
		currentStatus  string
		newStatus      string
		isSubmitter    bool
		canApprove     bool
		expectedResult bool
		expectedReason string
	}{
		{
			name:           "Submitter: Draft to Pending",
			currentStatus:  string(models.RequirementStatusDraft),
			newStatus:      string(models.RequirementStatusPending),
			isSubmitter:    true,
			canApprove:     false,
			expectedResult: true,
			expectedReason: "transition allowed",
		},
		{
			name:           "Submitter: Pending to Draft",
			currentStatus:  string(models.RequirementStatusPending),
			newStatus:      string(models.RequirementStatusDraft),
			isSubmitter:    true,
			canApprove:     false,
			expectedResult: true,
			expectedReason: "transition allowed",
		},
		{
			name:           "Reviewer: Pending to Approved",
			currentStatus:  string(models.RequirementStatusPending),
			newStatus:      string(models.RequirementStatusApproved),
			isSubmitter:    false,
			canApprove:     true,
			expectedResult: true,
			expectedReason: "transition allowed",
		},
		{
			name:           "Reviewer: Pending to Rejected",
			currentStatus:  string(models.RequirementStatusPending),
			newStatus:      string(models.RequirementStatusRejected),
			isSubmitter:    false,
			canApprove:     true,
			expectedResult: true,
			expectedReason: "transition allowed",
		},
		{
			name:           "Invalid: Draft to Approved (requires approval)",
			currentStatus:  string(models.RequirementStatusDraft),
			newStatus:      string(models.RequirementStatusApproved),
			isSubmitter:    true,
			canApprove:     false,
			expectedResult: false,
			expectedReason: "invalid status transition",
		},
		{
			name:           "Non-submitter cannot transition to pending",
			currentStatus:  string(models.RequirementStatusDraft),
			newStatus:      string(models.RequirementStatusPending),
			isSubmitter:    false,
			canApprove:     false,
			expectedResult: false,
			expectedReason: "only submitter can perform this transition",
		},
		{
			name:           "Non-approver cannot approve",
			currentStatus:  string(models.RequirementStatusPending),
			newStatus:      string(models.RequirementStatusApproved),
			isSubmitter:    false,
			canApprove:     false,
			expectedResult: false,
			expectedReason: "user cannot approve requirements",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, mock, err := sqlmock.New()
			require.NoError(t, err)
			defer db.Close()

			mockRepo := new(MockPermissionRepository)
	permService := NewPermissionService(mockRepo, db)
			reqPermService := NewRequirementPermissionService(permService, db)
			ctx := context.Background()

			userID := 1
			requirementID := 1

			// Mock requirement query
			reviewerID := sql.NullInt64{}
			submitterID := userID

			if !tt.isSubmitter {
				submitterID = 2
				// Only set user as reviewer if they can approve
				if tt.canApprove {
					reviewerID = sql.NullInt64{Int64: int64(userID), Valid: true}
				}
			}

			requirementRows := sqlmock.NewRows([]string{
				"id", "enterprise_id", "submitter_id", "reviewer_id", "status",
			}).AddRow(
				requirementID, 1, submitterID, reviewerID, tt.currentStatus,
			)

			mock.ExpectQuery(`SELECT id, enterprise_id, submitter_id, reviewer_id, status`).
				WithArgs(requirementID).
				WillReturnRows(requirementRows)

			// Mock user info query
			role := "company_user"
			if tt.canApprove {
				role = "project_manager"
			}
			userRows := sqlmock.NewRows([]string{
				"id", "username", "role", "company_id",
			}).AddRow(
				userID, "user", role, 1,
			)

			mock.ExpectQuery(`SELECT id, username, role, company_id`).
				WithArgs(userID).
				WillReturnRows(userRows)

			// Execute test
			canTransition, reason, err := reqPermService.CheckRequirementStatusTransition(
				ctx, userID, requirementID, tt.currentStatus, tt.newStatus)

			// Verify results
			assert.NoError(t, err)
			assert.Equal(t, tt.expectedResult, canTransition, "Transition result mismatch")
			if !tt.expectedResult {
				assert.Contains(t, reason, tt.expectedReason, "Reason should contain expected text")
			} else {
				assert.Equal(t, tt.expectedReason, reason, "Reason mismatch")
			}
			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

func TestRequirementPermissionService_FilterRequirementsByAccess(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	mockRepo := new(MockPermissionRepository)
	permService := NewPermissionService(mockRepo, db)
	reqPermService := NewRequirementPermissionService(permService, db)
	ctx := context.Background()

	userID := 1
	userCompanyID := 1

	// Mock user info query
	userRows := sqlmock.NewRows([]string{
		"id", "username", "role", "company_id",
	}).AddRow(
		userID, "user", "company_user", userCompanyID,
	)

	mock.ExpectQuery(`SELECT id, username, role, company_id`).
		WithArgs(userID).
		WillReturnRows(userRows)

	// Create test requirements
	requirements := []*models.Requirement{
		{
			ID:           1,
			Title:        "My Requirement",
			EnterpriseID: userCompanyID,
			SubmitterID:  userID, // User is submitter
			Status:       string(models.RequirementStatusDraft),
		},
		{
			ID:           2,
			Title:        "Team Requirement",
			EnterpriseID: userCompanyID, // Same enterprise
			SubmitterID:  2,             // Different submitter
			Status:       string(models.RequirementStatusPending),
		},
		{
			ID:           3,
			Title:        "Other Enterprise Requirement",
			EnterpriseID: 2, // Different enterprise
			SubmitterID:  3,
			Status:       string(models.RequirementStatusPending),
		},
	}

	// Execute test
	filtered, err := reqPermService.FilterRequirementsByAccess(ctx, userID, requirements)

	// Verify results
	assert.NoError(t, err)
	assert.Len(t, filtered, 2, "Should filter to 2 accessible requirements")
	assert.Equal(t, 1, filtered[0].ID, "Should include user's own requirement")
	assert.Equal(t, 2, filtered[1].ID, "Should include requirement from same enterprise")
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementPermissionService_FilterRequirementsByAccess_SystemAdmin(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	mockRepo := new(MockPermissionRepository)
	permService := NewPermissionService(mockRepo, db)
	reqPermService := NewRequirementPermissionService(permService, db)
	ctx := context.Background()

	adminUserID := 1

	// Mock user info query - admin user
	userRows := sqlmock.NewRows([]string{
		"id", "username", "role", "company_id",
	}).AddRow(
		adminUserID, "admin", "admin", sql.NullInt64{},
	)

	mock.ExpectQuery(`SELECT id, username, role, company_id`).
		WithArgs(adminUserID).
		WillReturnRows(userRows)

	// Create test requirements from different enterprises
	requirements := []*models.Requirement{
		{
			ID:           1,
			Title:        "Requirement 1",
			EnterpriseID: 1,
			SubmitterID:  2,
			Status:       string(models.RequirementStatusDraft),
		},
		{
			ID:           2,
			Title:        "Requirement 2",
			EnterpriseID: 2,
			SubmitterID:  3,
			Status:       string(models.RequirementStatusPending),
		},
	}

	// Execute test
	filtered, err := reqPermService.FilterRequirementsByAccess(ctx, adminUserID, requirements)

	// Verify results
	assert.NoError(t, err)
	assert.Len(t, filtered, 2, "Admin should see all requirements")
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementPermissionService_CanUserApproveRequirement(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	mockRepo := new(MockPermissionRepository)
	permService := NewPermissionService(mockRepo, db)
	reqPermService := NewRequirementPermissionService(permService, db)
	ctx := context.Background()

	userID := 1
	requirementID := 1

	// Mock requirement query
	requirementRows := sqlmock.NewRows([]string{
		"id", "enterprise_id", "submitter_id", "reviewer_id", "status",
	}).AddRow(
		requirementID, 1, 2, userID, models.RequirementStatusPending,
	)

	mock.ExpectQuery(`SELECT id, enterprise_id, submitter_id, reviewer_id, status`).
		WithArgs(requirementID).
		WillReturnRows(requirementRows)

	// Mock user info query
	userRows := sqlmock.NewRows([]string{
		"id", "username", "role", "company_id",
	}).AddRow(
		userID, "reviewer", "company_user", 1,
	)

	mock.ExpectQuery(`SELECT id, username, role, company_id`).
		WithArgs(userID).
		WillReturnRows(userRows)

	// Execute test
	canApprove, err := reqPermService.CanUserApproveRequirement(ctx, userID, requirementID)

	// Verify results
	assert.NoError(t, err)
	assert.True(t, canApprove, "Reviewer should be able to approve pending requirement")
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementPermissionService_CanUserUpdateRequirement(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	mockRepo := new(MockPermissionRepository)
	permService := NewPermissionService(mockRepo, db)
	reqPermService := NewRequirementPermissionService(permService, db)
	ctx := context.Background()

	userID := 1
	requirementID := 1

	// Mock requirement query - user is submitter, status is draft
	requirementRows := sqlmock.NewRows([]string{
		"id", "enterprise_id", "submitter_id", "reviewer_id", "status",
	}).AddRow(
		requirementID, 1, userID, nil, models.RequirementStatusDraft,
	)

	mock.ExpectQuery(`SELECT id, enterprise_id, submitter_id, reviewer_id, status`).
		WithArgs(requirementID).
		WillReturnRows(requirementRows)

	// Mock user info query
	userRows := sqlmock.NewRows([]string{
		"id", "username", "role", "company_id",
	}).AddRow(
		userID, "user", "company_user", 1,
	)

	mock.ExpectQuery(`SELECT id, username, role, company_id`).
		WithArgs(userID).
		WillReturnRows(userRows)

	// Execute test
	canUpdate, err := reqPermService.CanUserUpdateRequirement(ctx, userID, requirementID)

	// Verify results
	assert.NoError(t, err)
	assert.True(t, canUpdate, "Submitter should be able to update draft requirement")
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementPermissionService_CanUserUpdateRequirement_Approved(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	mockRepo := new(MockPermissionRepository)
	permService := NewPermissionService(mockRepo, db)
	reqPermService := NewRequirementPermissionService(permService, db)
	ctx := context.Background()

	userID := 1
	requirementID := 1

	// Mock requirement query - user is submitter, but status is approved
	requirementRows := sqlmock.NewRows([]string{
		"id", "enterprise_id", "submitter_id", "reviewer_id", "status",
	}).AddRow(
		requirementID, 1, userID, nil, models.RequirementStatusApproved,
	)

	mock.ExpectQuery(`SELECT id, enterprise_id, submitter_id, reviewer_id, status`).
		WithArgs(requirementID).
		WillReturnRows(requirementRows)

	// Mock user info query
	userRows := sqlmock.NewRows([]string{
		"id", "username", "role", "company_id",
	}).AddRow(
		userID, "user", "company_user", 1,
	)

	mock.ExpectQuery(`SELECT id, username, role, company_id`).
		WithArgs(userID).
		WillReturnRows(userRows)

	// Execute test
	canUpdate, err := reqPermService.CanUserUpdateRequirement(ctx, userID, requirementID)

	// Verify results
	assert.NoError(t, err)
	assert.False(t, canUpdate, "Submitter should not be able to update approved requirement")
	assert.NoError(t, mock.ExpectationsWereMet())
}
