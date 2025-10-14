package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRequirementRepository_Create(t *testing.T) {
	// 创建mock数据库
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementRepository(db)
	ctx := context.Background()

	requirement := &models.Requirement{
		Title:        "测试需求",
		EnterpriseID: 1,
		SubmitterID:  1,
		Status:       string(models.RequirementStatusDraft),
		Priority:     string(models.RequirementPriorityMedium),
	}

	// 设置期望的DisplayID生成查询
	mock.ExpectQuery(`SELECT COUNT`).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(5))

	// 设置期望的INSERT调用
	now := time.Now()
	mock.ExpectQuery(`INSERT INTO requirement`).
		WithArgs(
			sqlmock.AnyArg(), // display_id
			requirement.Title,
			nil, // description
			nil, // project_id
			requirement.EnterpriseID,
			requirement.SubmitterID,
			nil, // reviewer_id
			requirement.Status,
			requirement.Priority,
			nil,              // category
			nil,              // business_value
			nil,              // expected_outcome
			nil,              // acceptance_criteria
			sqlmock.AnyArg(), // attachments
			nil,              // review_status
			nil,              // review_comment
			nil,              // review_score
			nil,              // reviewed_at
			nil,              // estimated_hours
			nil,              // estimated_cost
			nil,              // complexity
			nil,              // converted_task_id
			nil,              // converted_at
			nil,              // converted_by
			nil,              // submitted_at
			nil,              // due_date
		).
		WillReturnRows(sqlmock.NewRows([]string{"id", "display_id", "created_at", "updated_at"}).
			AddRow(1, "REQ-2025-0006", now, now))

	// 执行测试
	created, err := repo.Create(ctx, requirement)

	// 验证结果
	assert.NoError(t, err)
	assert.NotNil(t, created)
	assert.Equal(t, 1, created.ID)
	assert.Equal(t, "REQ-2025-0006", created.DisplayID)
	assert.NotZero(t, created.CreatedAt)
	assert.NotZero(t, created.UpdatedAt)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementRepository_GetByID(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementRepository(db)
	ctx := context.Background()

	now := time.Now()
	requirementID := 1

	// 设置期望的SELECT调用
	rows := sqlmock.NewRows([]string{
		"id", "display_id", "title", "description", "project_id",
		"enterprise_id", "submitter_id", "reviewer_id", "status", "priority",
		"category", "business_value", "expected_outcome", "acceptance_criteria",
		"attachments", "review_status", "review_comment", "review_score",
		"reviewed_at", "estimated_hours", "estimated_cost", "complexity",
		"converted_task_id", "converted_at", "converted_by",
		"submitted_at", "due_date", "created_at", "updated_at",
		"project_name", "enterprise_name", "submitter_name", "reviewer_name",
	}).AddRow(
		requirementID, "REQ-2025-0001", "测试需求", "需求描述", 1,
		1, 1, nil, models.RequirementStatusDraft, models.RequirementPriorityMedium,
		"功能", "业务价值", "预期结果", "验收标准",
		"[]", nil, nil, nil,
		nil, nil, nil, nil,
		nil, nil, nil,
		nil, nil, now, now,
		"测试项目", "测试企业", "提交人", nil,
	)

	mock.ExpectQuery(`SELECT (.+) FROM requirement`).
		WithArgs(requirementID).
		WillReturnRows(rows)

	// 执行测试
	requirement, err := repo.GetByID(ctx, requirementID)

	// 验证结果
	assert.NoError(t, err)
	assert.NotNil(t, requirement)
	assert.Equal(t, requirementID, requirement.ID)
	assert.Equal(t, "测试需求", requirement.Title)
	assert.Equal(t, "REQ-2025-0001", requirement.DisplayID)
	assert.Equal(t, string(models.RequirementStatusDraft), requirement.Status)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementRepository_List(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementRepository(db)
	ctx := context.Background()

	filters := &models.RequirementFilters{
		Page:      1,
		PageSize:  20,
		SortBy:    "created_at",
		SortOrder: "desc",
	}

	// 设置期望的COUNT查询
	mock.ExpectQuery(`SELECT COUNT`).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

	// 设置期望的SELECT查询
	now := time.Now()
	rows := sqlmock.NewRows([]string{
		"id", "display_id", "title", "description", "project_id",
		"enterprise_id", "submitter_id", "reviewer_id", "status", "priority",
		"category", "business_value", "expected_outcome", "acceptance_criteria",
		"attachments", "review_status", "review_comment", "review_score",
		"reviewed_at", "estimated_hours", "estimated_cost", "complexity",
		"converted_task_id", "converted_at", "converted_by",
		"submitted_at", "due_date", "created_at", "updated_at",
		"project_name", "enterprise_name", "submitter_name", "reviewer_name",
	}).
		AddRow(1, "REQ-2025-0001", "需求1", nil, nil,
			1, 1, nil, models.RequirementStatusDraft, models.RequirementPriorityMedium,
			nil, nil, nil, nil,
			"[]", nil, nil, nil,
			nil, nil, nil, nil,
			nil, nil, nil,
			nil, nil, now, now,
			nil, "企业1", "用户1", nil).
		AddRow(2, "REQ-2025-0002", "需求2", nil, nil,
			1, 1, nil, models.RequirementStatusPending, models.RequirementPriorityHigh,
			nil, nil, nil, nil,
			"[]", nil, nil, nil,
			nil, nil, nil, nil,
			nil, nil, nil,
			nil, nil, now, now,
			nil, "企业1", "用户1", nil)

	mock.ExpectQuery(`SELECT (.+) FROM requirement`).
		WillReturnRows(rows)

	// 执行测试
	response, err := repo.List(ctx, filters)

	// 验证结果
	assert.NoError(t, err)
	assert.NotNil(t, response)
	assert.Equal(t, 2, response.Total)
	assert.Len(t, response.Data, 2)
	assert.Equal(t, "需求1", response.Data[0].Title)
	assert.Equal(t, "需求2", response.Data[1].Title)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementRepository_Update(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementRepository(db)
	ctx := context.Background()

	now := time.Now()
	requirement := &models.Requirement{
		ID:           1,
		Title:        "更新后的标题",
		EnterpriseID: 1,
		SubmitterID:  1,
		Status:       string(models.RequirementStatusDraft),
		Priority:     string(models.RequirementPriorityMedium),
	}

	// 设置期望的UPDATE调用
	mock.ExpectQuery(`UPDATE requirements`).
		WithArgs(
			requirement.Title,
			requirement.Description,
			requirement.ProjectID,
			requirement.Priority,
			requirement.Category,
			requirement.BusinessValue,
			requirement.ExpectedOutcome,
			requirement.AcceptanceCriteria,
			requirement.Attachments,
			requirement.DueDate,
			requirement.ID,
		).
		WillReturnRows(sqlmock.NewRows([]string{"updated_at"}).AddRow(now))

	// Mock GetByID after update
	rows := sqlmock.NewRows([]string{
		"id", "display_id", "title", "description", "project_id",
		"enterprise_id", "submitter_id", "reviewer_id", "status", "priority",
		"category", "business_value", "expected_outcome", "acceptance_criteria",
		"attachments", "review_status", "review_comment", "review_score",
		"reviewed_at", "estimated_hours", "estimated_cost", "complexity",
		"converted_task_id", "converted_at", "converted_by",
		"submitted_at", "due_date", "created_at", "updated_at",
		"project_name", "enterprise_name", "submitter_name", "reviewer_name",
	}).AddRow(
		requirement.ID, "REQ-2025-0001", requirement.Title, nil, nil,
		requirement.EnterpriseID, requirement.SubmitterID, nil, requirement.Status, requirement.Priority,
		nil, nil, nil, nil,
		"[]", nil, nil, nil,
		nil, nil, nil, nil,
		nil, nil, nil,
		nil, nil, now, now,
		nil, "企业1", "用户1", nil,
	)

	mock.ExpectQuery(`SELECT (.+) FROM requirement`).
		WithArgs(requirement.ID).
		WillReturnRows(rows)

	// 执行测试
	updated, err := repo.Update(ctx, requirement)

	// 验证结果
	assert.NoError(t, err)
	assert.NotNil(t, updated)
	assert.Equal(t, requirement.ID, updated.ID)
	assert.Equal(t, requirement.Title, updated.Title)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementRepository_Delete(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementRepository(db)
	ctx := context.Background()

	requirementID := 1

	// 设置期望的DELETE调用
	mock.ExpectExec(`DELETE FROM requirement`).
		WithArgs(requirementID).
		WillReturnResult(sqlmock.NewResult(0, 1))

	// 执行测试
	err = repo.Delete(ctx, requirementID)

	// 验证结果
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementRepository_UpdateStatus(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementRepository(db)
	ctx := context.Background()

	requirementID := 1
	newStatus := string(models.RequirementStatusApproved)
	userID := 1

	// 设置期望的UPDATE调用
	mock.ExpectExec(`UPDATE requirement`).
		WithArgs(newStatus, sqlmock.AnyArg(), requirementID). // status, updated_at, id
		WillReturnResult(sqlmock.NewResult(0, 1))

	// 执行测试
	err = repo.UpdateStatus(ctx, requirementID, newStatus, userID)

	// 验证结果
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementRepository_GetStats(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementRepository(db)
	ctx := context.Background()

	enterpriseID := 1

	// 设置期望的统计查询
	mock.ExpectQuery(`SELECT`).
		WithArgs(enterpriseID).
		WillReturnRows(sqlmock.NewRows([]string{
			"total_requirements", "pending_review", "approved_this_month",
			"converted_this_month", "average_review_time_hours", "conversion_rate",
		}).AddRow(10, 3, 5, 2, 24.5, 0.5))

	// Mock status counts
	statusRows := sqlmock.NewRows([]string{"status", "count"}).
		AddRow(models.RequirementStatusDraft, 2).
		AddRow(models.RequirementStatusPending, 3).
		AddRow(models.RequirementStatusApproved, 5)

	mock.ExpectQuery(`SELECT status, COUNT`).
		WithArgs(enterpriseID).
		WillReturnRows(statusRows)

	// Mock priority counts
	priorityRows := sqlmock.NewRows([]string{"priority", "count"}).
		AddRow(models.RequirementPriorityLow, 3).
		AddRow(models.RequirementPriorityMedium, 4).
		AddRow(models.RequirementPriorityHigh, 3)

	mock.ExpectQuery(`SELECT priority, COUNT`).
		WithArgs(enterpriseID).
		WillReturnRows(priorityRows)

	// 执行测试
	stats, err := repo.GetStats(ctx, &enterpriseID)

	// 验证结果
	assert.NoError(t, err)
	assert.NotNil(t, stats)
	assert.Equal(t, 10, stats.TotalRequirements)
	assert.Equal(t, 3, stats.PendingReview)
	assert.Equal(t, 5, stats.ApprovedThisMonth)
	assert.Equal(t, 24.5, stats.AverageReviewTime)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementRepository_GetByID_NotFound(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementRepository(db)
	ctx := context.Background()

	requirementID := 999

	// 设置期望的SELECT调用 - 返回无结果
	mock.ExpectQuery(`SELECT (.+) FROM requirement`).
		WithArgs(requirementID).
		WillReturnError(sql.ErrNoRows)

	// 执行测试
	requirement, err := repo.GetByID(ctx, requirementID)

	// 验证结果 - 应该返回错误
	assert.Error(t, err)
	assert.Nil(t, requirement)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementRepository_List_WithFilters(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementRepository(db)
	ctx := context.Background()

	enterpriseID := 1
	submitterID := 2
	filters := &models.RequirementFilters{
		Page:         1,
		PageSize:     10,
		Status:       []string{string(models.RequirementStatusPending)},
		Priority:     []string{string(models.RequirementPriorityHigh)},
		EnterpriseID: &enterpriseID,
		SubmitterID:  &submitterID,
		Search:       "测试",
		SortBy:       "created_at",
		SortOrder:    "desc",
	}

	// 设置期望的COUNT查询
	mock.ExpectQuery(`SELECT COUNT`).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

	// 设置期望的SELECT查询
	now := time.Now()
	rows := sqlmock.NewRows([]string{
		"id", "display_id", "title", "description", "project_id",
		"enterprise_id", "submitter_id", "reviewer_id", "status", "priority",
		"category", "business_value", "expected_outcome", "acceptance_criteria",
		"attachments", "review_status", "review_comment", "review_score",
		"reviewed_at", "estimated_hours", "estimated_cost", "complexity",
		"converted_task_id", "converted_at", "converted_by",
		"submitted_at", "due_date", "created_at", "updated_at",
		"project_name", "enterprise_name", "submitter_name", "reviewer_name",
	}).AddRow(
		1, "REQ-2025-0001", "测试需求", nil, nil,
		enterpriseID, submitterID, nil, models.RequirementStatusPending, models.RequirementPriorityHigh,
		nil, nil, nil, nil,
		"[]", nil, nil, nil,
		nil, nil, nil, nil,
		nil, nil, nil,
		nil, nil, now, now,
		nil, "企业1", "用户2", nil,
	)

	mock.ExpectQuery(`SELECT (.+) FROM requirement`).
		WillReturnRows(rows)

	// 执行测试
	response, err := repo.List(ctx, filters)

	// 验证结果
	assert.NoError(t, err)
	assert.NotNil(t, response)
	assert.Equal(t, 1, response.Total)
	assert.Len(t, response.Data, 1)
	assert.Equal(t, "测试需求", response.Data[0].Title)
	assert.Equal(t, string(models.RequirementStatusPending), response.Data[0].Status)
	assert.Equal(t, string(models.RequirementPriorityHigh), response.Data[0].Priority)
	assert.NoError(t, mock.ExpectationsWereMet())
}
