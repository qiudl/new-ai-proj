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

func TestTaskCommentRepository_Create(t *testing.T) {
	// 创建mock数据库
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewTaskCommentRepository(db)
	ctx := context.Background()

	comment := &models.TaskComment{
		TaskID:  1,
		UserID:  1,
		Content: "测试评论内容",
	}

	// 设置期望的SQL调用
	now := time.Now()
	mock.ExpectQuery(`INSERT INTO task_comments`).
		WithArgs(comment.TaskID, comment.UserID, comment.Content, models.CommentStatusActive).
		WillReturnRows(sqlmock.NewRows([]string{"id", "created_at", "updated_at"}).
			AddRow(1, now, now))

	// 执行测试
	err = repo.Create(ctx, comment)

	// 验证结果
	assert.NoError(t, err)
	assert.Equal(t, 1, comment.ID)
	assert.NotZero(t, comment.CreatedAt)
	assert.NotZero(t, comment.UpdatedAt)
	assert.Equal(t, models.CommentStatusActive, comment.Status)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestTaskCommentRepository_GetByID(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewTaskCommentRepository(db)
	ctx := context.Background()

	now := time.Now()
	commentID := 1

	// 设置期望的SQL调用
	rows := sqlmock.NewRows([]string{
		"id", "task_id", "user_id", "content", "status",
		"created_at", "updated_at", "deleted_at", "deleted_by",
		"user_id", "user_name", "user_avatar",
	}).AddRow(
		commentID, 1, 1, "测试评论", models.CommentStatusActive,
		now, now, nil, nil,
		1, "测试用户", "",
	)

	mock.ExpectQuery(`SELECT (.+) FROM task_comments`).
		WithArgs(commentID).
		WillReturnRows(rows)

	// 执行测试
	comment, err := repo.GetByID(ctx, commentID)

	// 验证结果
	assert.NoError(t, err)
	assert.NotNil(t, comment)
	assert.Equal(t, commentID, comment.ID)
	assert.Equal(t, "测试评论", comment.Content)
	assert.NotNil(t, comment.User)
	assert.Equal(t, "测试用户", comment.User.Name)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestTaskCommentRepository_ListByTask(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewTaskCommentRepository(db)
	ctx := context.Background()

	taskID := 1
	page := 1
	pageSize := 20

	// 设置期望的总数查询
	mock.ExpectQuery(`SELECT COUNT`).
		WithArgs(taskID, models.CommentStatusActive).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

	// 设置期望的列表查询
	now := time.Now()
	rows := sqlmock.NewRows([]string{
		"id", "task_id", "user_id", "content", "status",
		"created_at", "updated_at",
		"user_id", "user_name", "user_avatar",
	}).
		AddRow(1, taskID, 1, "评论1", models.CommentStatusActive, now, now, 1, "用户1", "").
		AddRow(2, taskID, 2, "评论2", models.CommentStatusActive, now, now, 2, "用户2", "")

	mock.ExpectQuery(`SELECT (.+) FROM task_comments`).
		WithArgs(taskID, models.CommentStatusActive, pageSize, 0).
		WillReturnRows(rows)

	// 执行测试
	comments, total, err := repo.ListByTask(ctx, taskID, page, pageSize)

	// 验证结果
	assert.NoError(t, err)
	assert.Equal(t, 2, total)
	assert.Len(t, comments, 2)
	assert.Equal(t, "评论1", comments[0].Content)
	assert.Equal(t, "评论2", comments[1].Content)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestTaskCommentRepository_SoftDelete(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewTaskCommentRepository(db)
	ctx := context.Background()

	commentID := 1
	deletedBy := 1

	// 设置期望的SQL调用
	mock.ExpectExec(`UPDATE task_comments`).
		WithArgs(models.CommentStatusDeleted, sqlmock.AnyArg(), deletedBy, commentID, models.CommentStatusActive).
		WillReturnResult(sqlmock.NewResult(0, 1))

	// 执行测试
	err = repo.SoftDelete(ctx, commentID, deletedBy)

	// 验证结果
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestTaskCommentRepository_GetStats(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewTaskCommentRepository(db)
	ctx := context.Background()

	taskID := 1
	lastCommentAt := time.Now()

	// 设置期望的SQL调用
	rows := sqlmock.NewRows([]string{
		"task_id", "total_comments", "participants", "last_comment_at",
	}).AddRow(taskID, 5, 3, lastCommentAt)

	mock.ExpectQuery(`SELECT (.+) FROM task_comments`).
		WithArgs(taskID, models.CommentStatusActive).
		WillReturnRows(rows)

	// 执行测试
	stats, err := repo.GetStats(ctx, taskID)

	// 验证结果
	assert.NoError(t, err)
	assert.NotNil(t, stats)
	assert.Equal(t, taskID, stats.TaskID)
	assert.Equal(t, 5, stats.TotalComments)
	assert.Equal(t, 3, stats.Participants)
	assert.NotNil(t, stats.LastCommentAt)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestTaskCommentRepository_GetStats_NoComments(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewTaskCommentRepository(db)
	ctx := context.Background()

	taskID := 1

	// 设置期望的SQL调用 - 返回空结果
	mock.ExpectQuery(`SELECT (.+) FROM task_comments`).
		WithArgs(taskID, models.CommentStatusActive).
		WillReturnError(sql.ErrNoRows)

	// 执行测试
	stats, err := repo.GetStats(ctx, taskID)

	// 验证结果 - 应该返回默认值而不是错误
	assert.NoError(t, err)
	assert.NotNil(t, stats)
	assert.Equal(t, taskID, stats.TaskID)
	assert.Equal(t, 0, stats.TotalComments)
	assert.Equal(t, 0, stats.Participants)
	assert.NoError(t, mock.ExpectationsWereMet())
}
