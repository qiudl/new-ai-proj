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

func TestRequirementTaskRepository_Create(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementTaskRepository(db)
	ctx := context.Background()

	link := &models.RequirementTask{
		RequirementID: 1,
		TaskID:        1,
		LinkType:      "converted",
		LinkedBy:      1,
		LinkComment:   stringPtr("通过需求转换创建"),
	}

	// 先检查是否存在
	mock.ExpectQuery(`SELECT EXISTS`).
		WithArgs(link.RequirementID, link.TaskID).
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(false))

	// 设置期望的插入调用
	now := time.Now()
	mock.ExpectQuery(`INSERT INTO requirement_tasks`).
		WithArgs(
			link.RequirementID,
			link.TaskID,
			link.LinkType,
			link.LinkedBy,
			link.LinkComment,
		).
		WillReturnRows(sqlmock.NewRows([]string{"id", "created_at", "updated_at"}).
			AddRow(1, now, now))

	// 执行测试
	result, err := repo.Create(ctx, link)

	// 验证结果
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 1, result.ID)
	assert.NotZero(t, result.CreatedAt)
	assert.NotZero(t, result.UpdatedAt)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementTaskRepository_Create_AlreadyExists(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementTaskRepository(db)
	ctx := context.Background()

	link := &models.RequirementTask{
		RequirementID: 1,
		TaskID:        1,
		LinkType:      "manual",
		LinkedBy:      1,
	}

	// 模拟已存在的情况
	mock.ExpectQuery(`SELECT EXISTS`).
		WithArgs(link.RequirementID, link.TaskID).
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(true))

	// 执行测试
	result, err := repo.Create(ctx, link)

	// 验证结果 - 应该返回错误
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "已存在关联关系")
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementTaskRepository_GetByID(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementTaskRepository(db)
	ctx := context.Background()

	linkID := 1
	now := time.Now()

	// 设置期望的SQL调用
	rows := sqlmock.NewRows([]string{
		"id", "requirement_id", "task_id", "link_type",
		"linked_by", "link_comment", "created_at", "updated_at",
		"requirement_title", "requirement_display_id", "requirement_status",
		"task_title", "task_status", "linker_username",
	}).AddRow(
		linkID, 1, 1, "converted",
		1, "通过需求转换创建", now, now,
		"需求标题", "REQ-001", "approved",
		"任务标题", "todo", "admin",
	)

	mock.ExpectQuery(`SELECT (.+) FROM requirement_tasks`).
		WithArgs(linkID).
		WillReturnRows(rows)

	// 执行测试
	link, err := repo.GetByID(ctx, linkID)

	// 验证结果
	assert.NoError(t, err)
	assert.NotNil(t, link)
	assert.Equal(t, linkID, link.ID)
	assert.Equal(t, "converted", link.LinkType)
	assert.Equal(t, "需求标题", *link.RequirementTitle)
	assert.Equal(t, "任务标题", *link.TaskTitle)
	assert.Equal(t, "admin", *link.LinkerUsername)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementTaskRepository_Delete(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementTaskRepository(db)
	ctx := context.Background()

	linkID := 1

	// 设置期望的SQL调用
	mock.ExpectExec(`DELETE FROM requirement_tasks`).
		WithArgs(linkID).
		WillReturnResult(sqlmock.NewResult(0, 1))

	// 执行测试
	err = repo.Delete(ctx, linkID)

	// 验证结果
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementTaskRepository_DeleteByRequirementAndTask(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementTaskRepository(db)
	ctx := context.Background()

	requirementID := 1
	taskID := 1

	// 设置期望的SQL调用
	mock.ExpectExec(`DELETE FROM requirement_tasks`).
		WithArgs(requirementID, taskID).
		WillReturnResult(sqlmock.NewResult(0, 1))

	// 执行测试
	err = repo.DeleteByRequirementAndTask(ctx, requirementID, taskID)

	// 验证结果
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementTaskRepository_GetByRequirementID(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementTaskRepository(db)
	ctx := context.Background()

	requirementID := 1
	now := time.Now()

	// 设置期望的SQL调用
	rows := sqlmock.NewRows([]string{
		"id", "requirement_id", "task_id", "link_type",
		"linked_by", "link_comment", "created_at", "updated_at",
		"requirement_title", "requirement_display_id", "requirement_status",
		"task_title", "task_status", "linker_username",
	}).
		AddRow(1, requirementID, 1, "converted", 1, "转换创建", now, now, "需求1", "REQ-001", "approved", "任务1", "todo", "admin").
		AddRow(2, requirementID, 2, "manual", 1, "手动关联", now, now, "需求1", "REQ-001", "approved", "任务2", "in_progress", "admin")

	mock.ExpectQuery(`SELECT (.+) FROM requirement_tasks`).
		WithArgs(requirementID).
		WillReturnRows(rows)

	// 执行测试
	links, err := repo.GetByRequirementID(ctx, requirementID)

	// 验证结果
	assert.NoError(t, err)
	assert.Len(t, links, 2)
	assert.Equal(t, "converted", links[0].LinkType)
	assert.Equal(t, "manual", links[1].LinkType)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementTaskRepository_GetByTaskID(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementTaskRepository(db)
	ctx := context.Background()

	taskID := 1
	now := time.Now()

	// 设置期望的SQL调用
	rows := sqlmock.NewRows([]string{
		"id", "requirement_id", "task_id", "link_type",
		"linked_by", "link_comment", "created_at", "updated_at",
		"requirement_title", "requirement_display_id", "requirement_status",
		"task_title", "task_status", "linker_username",
	}).
		AddRow(1, 1, taskID, "converted", 1, "转换创建", now, now, "需求1", "REQ-001", "approved", "任务1", "todo", "admin").
		AddRow(2, 2, taskID, "related", 1, "相关任务", now, now, "需求2", "REQ-002", "reviewing", "任务1", "todo", "admin")

	mock.ExpectQuery(`SELECT (.+) FROM requirement_tasks`).
		WithArgs(taskID).
		WillReturnRows(rows)

	// 执行测试
	links, err := repo.GetByTaskID(ctx, taskID)

	// 验证结果
	assert.NoError(t, err)
	assert.Len(t, links, 2)
	assert.Equal(t, "converted", links[0].LinkType)
	assert.Equal(t, "related", links[1].LinkType)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementTaskRepository_GetByRequirementAndTask(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementTaskRepository(db)
	ctx := context.Background()

	requirementID := 1
	taskID := 1
	now := time.Now()

	// 设置期望的SQL调用
	rows := sqlmock.NewRows([]string{
		"id", "requirement_id", "task_id", "link_type",
		"linked_by", "link_comment", "created_at", "updated_at",
		"requirement_title", "requirement_display_id", "requirement_status",
		"task_title", "task_status", "linker_username",
	}).AddRow(
		1, requirementID, taskID, "converted",
		1, "转换创建", now, now,
		"需求标题", "REQ-001", "approved",
		"任务标题", "todo", "admin",
	)

	mock.ExpectQuery(`SELECT (.+) FROM requirement_tasks`).
		WithArgs(requirementID, taskID).
		WillReturnRows(rows)

	// 执行测试
	link, err := repo.GetByRequirementAndTask(ctx, requirementID, taskID)

	// 验证结果
	assert.NoError(t, err)
	assert.NotNil(t, link)
	assert.Equal(t, "converted", link.LinkType)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementTaskRepository_GetByRequirementAndTask_NotFound(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementTaskRepository(db)
	ctx := context.Background()

	requirementID := 1
	taskID := 999

	// 设置期望的SQL调用 - 返回空结果
	mock.ExpectQuery(`SELECT (.+) FROM requirement_tasks`).
		WithArgs(requirementID, taskID).
		WillReturnError(sql.ErrNoRows)

	// 执行测试
	link, err := repo.GetByRequirementAndTask(ctx, requirementID, taskID)

	// 验证结果 - 不存在不算错误，返回nil
	assert.NoError(t, err)
	assert.Nil(t, link)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementTaskRepository_Exists(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementTaskRepository(db)
	ctx := context.Background()

	requirementID := 1
	taskID := 1

	// 设置期望的SQL调用 - 存在
	mock.ExpectQuery(`SELECT EXISTS`).
		WithArgs(requirementID, taskID).
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(true))

	// 执行测试
	exists, err := repo.Exists(ctx, requirementID, taskID)

	// 验证结果
	assert.NoError(t, err)
	assert.True(t, exists)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementTaskRepository_Exists_NotFound(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementTaskRepository(db)
	ctx := context.Background()

	requirementID := 1
	taskID := 999

	// 设置期望的SQL调用 - 不存在
	mock.ExpectQuery(`SELECT EXISTS`).
		WithArgs(requirementID, taskID).
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(false))

	// 执行测试
	exists, err := repo.Exists(ctx, requirementID, taskID)

	// 验证结果
	assert.NoError(t, err)
	assert.False(t, exists)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementTaskRepository_CountByRequirement(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementTaskRepository(db)
	ctx := context.Background()

	requirementID := 1

	// 设置期望的SQL调用
	mock.ExpectQuery(`SELECT COUNT`).
		WithArgs(requirementID).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(5))

	// 执行测试
	count, err := repo.CountByRequirement(ctx, requirementID)

	// 验证结果
	assert.NoError(t, err)
	assert.Equal(t, 5, count)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementTaskRepository_CountByTask(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementTaskRepository(db)
	ctx := context.Background()

	taskID := 1

	// 设置期望的SQL调用
	mock.ExpectQuery(`SELECT COUNT`).
		WithArgs(taskID).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(3))

	// 执行测试
	count, err := repo.CountByTask(ctx, taskID)

	// 验证结果
	assert.NoError(t, err)
	assert.Equal(t, 3, count)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementTaskRepository_List(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementTaskRepository(db)
	ctx := context.Background()

	filters := &models.RequirementTaskFilters{
		Page:      1,
		PageSize:  20,
		SortBy:    "created_at",
		SortOrder: "desc",
	}

	// 设置期望的总数查询
	mock.ExpectQuery(`SELECT COUNT`).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

	// 设置期望的列表查询
	now := time.Now()
	rows := sqlmock.NewRows([]string{
		"id", "requirement_id", "task_id", "link_type",
		"linked_by", "link_comment", "created_at", "updated_at",
		"requirement_title", "requirement_display_id", "requirement_status",
		"task_title", "task_status", "linker_username",
	}).
		AddRow(1, 1, 1, "converted", 1, "转换创建", now, now, "需求1", "REQ-001", "approved", "任务1", "todo", "admin").
		AddRow(2, 2, 2, "manual", 1, "手动关联", now, now, "需求2", "REQ-002", "reviewing", "任务2", "in_progress", "user1")

	mock.ExpectQuery(`SELECT (.+) FROM requirement_tasks`).
		WillReturnRows(rows)

	// 执行测试
	result, err := repo.List(ctx, filters)

	// 验证结果
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 2, result.Total)
	assert.Len(t, result.Data, 2)
	assert.Equal(t, "converted", result.Data[0].LinkType)
	assert.Equal(t, "manual", result.Data[1].LinkType)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementTaskRepository_List_WithFilters(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementTaskRepository(db)
	ctx := context.Background()

	requirementID := 1
	filters := &models.RequirementTaskFilters{
		RequirementID: &requirementID,
		Page:          1,
		PageSize:      20,
		SortBy:        "created_at",
		SortOrder:     "desc",
	}

	// 设置期望的总数查询
	mock.ExpectQuery(`SELECT COUNT`).
		WithArgs(requirementID).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

	// 设置期望的列表查询
	now := time.Now()
	rows := sqlmock.NewRows([]string{
		"id", "requirement_id", "task_id", "link_type",
		"linked_by", "link_comment", "created_at", "updated_at",
		"requirement_title", "requirement_display_id", "requirement_status",
		"task_title", "task_status", "linker_username",
	}).AddRow(1, 1, 1, "converted", 1, "转换创建", now, now, "需求1", "REQ-001", "approved", "任务1", "todo", "admin")

	mock.ExpectQuery(`SELECT (.+) FROM requirement_tasks`).
		WithArgs(requirementID, filters.PageSize, 0).
		WillReturnRows(rows)

	// 执行测试
	result, err := repo.List(ctx, filters)

	// 验证结果
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 1, result.Total)
	assert.Len(t, result.Data, 1)
	assert.Equal(t, "converted", result.Data[0].LinkType)
	assert.NoError(t, mock.ExpectationsWereMet())
}
