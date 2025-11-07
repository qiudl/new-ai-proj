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

func TestRequirementCommentRepository_Create(t *testing.T) {
	// 创建mock数据库
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementCommentRepository(db)
	ctx := context.Background()

	mentionedIDs := []int{2, 3}
	comment := &models.RequirementComment{
		RequirementID:    1,
		UserID:           1,
		Content:          "测试评论内容",
		CommentType:      "comment",
		IsInternal:       false,
		MentionedUserIDs: mentionedIDs,
	}

	// 设置期望的SQL调用
	now := time.Now()
	mock.ExpectQuery(`INSERT INTO requirement_comments`).
		WithArgs(
			comment.RequirementID,
			comment.UserID,
			comment.ParentCommentID,
			comment.Content,
			comment.CommentType,
			comment.Attachments,
			comment.IsInternal,
			comment.MentionedUserIDs,
			models.RequirementCommentStatusActive,
		).
		WillReturnRows(sqlmock.NewRows([]string{"id", "created_at", "updated_at", "mentioned_count"}).
			AddRow(1, now, now, 2))

	// 执行测试
	err = repo.Create(ctx, comment)

	// 验证结果
	assert.NoError(t, err)
	assert.Equal(t, 1, comment.ID)
	assert.NotZero(t, comment.CreatedAt)
	assert.NotZero(t, comment.UpdatedAt)
	assert.Equal(t, 2, comment.MentionedCount)
	assert.Equal(t, string(models.RequirementCommentStatusActive), comment.Status)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementCommentRepository_GetByID(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementCommentRepository(db)
	ctx := context.Background()

	now := time.Now()
	commentID := 1

	// 设置期望的SQL调用
	rows := sqlmock.NewRows([]string{
		"id", "requirement_id", "user_id", "parent_comment_id",
		"content", "comment_type", "attachments",
		"is_internal", "is_pinned", "status",
		"created_at", "updated_at", "deleted_at", "deleted_by",
		"username", "email", "user_type",
	}).AddRow(
		commentID, 1, 1, nil, "测试评论", "comment", nil,
		false, false, models.RequirementCommentStatusActive,
		now, now, nil, nil,
		"testuser", "test@example.com", "regular",
	)

	mock.ExpectQuery(`SELECT (.+) FROM requirement_comments`).
		WithArgs(commentID).
		WillReturnRows(rows)

	// 执行测试
	comment, err := repo.GetByID(ctx, commentID)

	// 验证结果
	assert.NoError(t, err)
	assert.NotNil(t, comment)
	assert.Equal(t, commentID, comment.ID)
	assert.Equal(t, "测试评论", comment.Content)
	assert.NotNil(t, comment.Username)
	assert.Equal(t, "testuser", *comment.Username)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementCommentRepository_Update(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementCommentRepository(db)
	ctx := context.Background()

	comment := &models.RequirementComment{
		ID:          1,
		Content:     "更新后的内容",
		CommentType: "comment",
		IsInternal:  true,
	}

	// 设置期望的SQL调用
	mock.ExpectExec(`UPDATE requirement_comments`).
		WithArgs(
			comment.Content,
			comment.CommentType,
			comment.Attachments,
			comment.IsInternal,
			comment.ID,
			models.RequirementCommentStatusActive,
		).
		WillReturnResult(sqlmock.NewResult(0, 1))

	// 执行测试
	err = repo.Update(ctx, comment)

	// 验证结果
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementCommentRepository_SoftDelete(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementCommentRepository(db)
	ctx := context.Background()

	commentID := 1
	deletedBy := 1

	// 设置期望的SQL调用
	mock.ExpectExec(`UPDATE requirement_comments`).
		WithArgs(
			models.RequirementCommentStatusDeleted,
			sqlmock.AnyArg(), // deleted_at
			deletedBy,
			commentID,
			models.RequirementCommentStatusActive,
		).
		WillReturnResult(sqlmock.NewResult(0, 1))

	// 执行测试
	err = repo.SoftDelete(ctx, commentID, deletedBy)

	// 验证结果
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementCommentRepository_ListByRequirement(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementCommentRepository(db)
	ctx := context.Background()

	requirementID := 1
	page := 1
	pageSize := 20

	// 设置期望的总数查询
	mock.ExpectQuery(`SELECT COUNT`).
		WithArgs(requirementID, models.RequirementCommentStatusActive).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

	// 设置期望的列表查询
	now := time.Now()
	rows := sqlmock.NewRows([]string{
		"id", "requirement_id", "user_id", "parent_comment_id",
		"content", "comment_type", "attachments",
		"is_internal", "is_pinned", "status",
		"created_at", "updated_at",
		"username", "email", "user_type", "replies_count",
	}).
		AddRow(1, requirementID, 1, nil, "评论1", "comment", nil, false, false, models.RequirementCommentStatusActive, now, now, "user1", "user1@example.com", "regular", 0).
		AddRow(2, requirementID, 2, nil, "评论2", "comment", nil, false, true, models.RequirementCommentStatusActive, now, now, "user2", "user2@example.com", "regular", 2)

	mock.ExpectQuery(`SELECT (.+) FROM requirement_comments`).
		WithArgs(requirementID, models.RequirementCommentStatusActive, models.RequirementCommentStatusActive, pageSize, 0).
		WillReturnRows(rows)

	// 执行测试
	comments, total, err := repo.ListByRequirement(ctx, requirementID, page, pageSize)

	// 验证结果
	assert.NoError(t, err)
	assert.Equal(t, 2, total)
	assert.Len(t, comments, 2)
	assert.Equal(t, "评论1", comments[0].Content)
	assert.Equal(t, "评论2", comments[1].Content)
	assert.True(t, comments[1].IsPinned) // 第二条评论被置顶
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementCommentRepository_GetReplies(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementCommentRepository(db)
	ctx := context.Background()

	parentCommentID := 1
	now := time.Now()

	// 设置期望的SQL调用
	rows := sqlmock.NewRows([]string{
		"id", "requirement_id", "user_id", "parent_comment_id",
		"content", "comment_type", "attachments",
		"is_internal", "is_pinned", "status",
		"created_at", "updated_at",
		"username", "email", "user_type",
	}).
		AddRow(2, 1, 2, parentCommentID, "回复1", "comment", nil, false, false, models.RequirementCommentStatusActive, now, now, "user2", "user2@example.com", "regular").
		AddRow(3, 1, 3, parentCommentID, "回复2", "comment", nil, false, false, models.RequirementCommentStatusActive, now, now, "user3", "user3@example.com", "regular")

	mock.ExpectQuery(`SELECT (.+) FROM requirement_comments`).
		WithArgs(parentCommentID, models.RequirementCommentStatusActive).
		WillReturnRows(rows)

	// 执行测试
	replies, err := repo.GetReplies(ctx, parentCommentID)

	// 验证结果
	assert.NoError(t, err)
	assert.Len(t, replies, 2)
	assert.Equal(t, "回复1", replies[0].Content)
	assert.Equal(t, "回复2", replies[1].Content)
	assert.Equal(t, &parentCommentID, replies[0].ParentCommentID)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementCommentRepository_GetStats(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementCommentRepository(db)
	ctx := context.Background()

	requirementID := 1

	// 设置期望的统计查询
	rows := sqlmock.NewRows([]string{
		"total_comments", "active_participants", "active_comments", "deleted_comments",
		"internal_comments", "pinned_comments", "top_level_comments", "reply_comments",
		"todays_comments", "this_weeks_comments",
	}).AddRow(10, 5, 8, 2, 3, 1, 7, 3, 2, 5)

	mock.ExpectQuery(`SELECT (.+) FROM requirement_comments`).
		WithArgs(requirementID).
		WillReturnRows(rows)

	// 设置期望的评论类型统计查询
	typeRows := sqlmock.NewRows([]string{"comment_type", "count"}).
		AddRow("comment", 8).
		AddRow("question", 2)

	mock.ExpectQuery(`SELECT comment_type, COUNT`).
		WithArgs(requirementID, models.RequirementCommentStatusActive).
		WillReturnRows(typeRows)

	// 执行测试
	stats, err := repo.GetStats(ctx, requirementID)

	// 验证结果
	assert.NoError(t, err)
	assert.NotNil(t, stats)
	assert.Equal(t, 10, stats.TotalComments)
	assert.Equal(t, 8, stats.ActiveComments)
	assert.Equal(t, 2, stats.DeletedComments)
	assert.Equal(t, 3, stats.InternalComments)
	assert.Equal(t, 1, stats.PinnedComments)
	assert.Equal(t, 7, stats.TopLevelComments)
	assert.Equal(t, 3, stats.ReplyComments)
	assert.Equal(t, 2, stats.TodaysComments)
	assert.Equal(t, 5, stats.ThisWeeksComments)
	assert.Equal(t, 8, stats.ByCommentType["comment"])
	assert.Equal(t, 2, stats.ByCommentType["question"])
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementCommentRepository_GetStats_NoComments(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementCommentRepository(db)
	ctx := context.Background()

	requirementID := 1

	// 设置期望的SQL调用 - 返回空结果
	mock.ExpectQuery(`SELECT (.+) FROM requirement_comments`).
		WithArgs(requirementID).
		WillReturnError(sql.ErrNoRows)

	// 执行测试
	stats, err := repo.GetStats(ctx, requirementID)

	// 验证结果 - 应该返回默认值而不是错误
	assert.NoError(t, err)
	assert.NotNil(t, stats)
	assert.Equal(t, 0, stats.TotalComments)
	assert.Equal(t, 0, stats.ActiveComments)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementCommentRepository_TogglePin(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementCommentRepository(db)
	ctx := context.Background()

	commentID := 1
	isPinned := true

	// 设置期望的SQL调用
	mock.ExpectExec(`UPDATE requirement_comments`).
		WithArgs(isPinned, commentID, models.RequirementCommentStatusActive).
		WillReturnResult(sqlmock.NewResult(0, 1))

	// 执行测试
	err = repo.TogglePin(ctx, commentID, isPinned)

	// 验证结果
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementCommentRepository_UpdateInternal(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementCommentRepository(db)
	ctx := context.Background()

	commentID := 1
	isInternal := true

	// 设置期望的SQL调用
	mock.ExpectExec(`UPDATE requirement_comments`).
		WithArgs(isInternal, commentID, models.RequirementCommentStatusActive).
		WillReturnResult(sqlmock.NewResult(0, 1))

	// 执行测试
	err = repo.UpdateInternal(ctx, commentID, isInternal)

	// 验证结果
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementCommentRepository_GetCommentCounts(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementCommentRepository(db)
	ctx := context.Background()

	requirementIDs := []int{1, 2, 3}

	// 设置期望的SQL调用
	rows := sqlmock.NewRows([]string{"requirement_id", "comment_count"}).
		AddRow(1, 5).
		AddRow(2, 3)
	// 注意: requirement_id=3 没有评论，不会出现在结果中

	mock.ExpectQuery(`SELECT requirement_id, COUNT`).
		WithArgs(1, 2, 3, models.RequirementCommentStatusActive).
		WillReturnRows(rows)

	// 执行测试
	counts, err := repo.GetCommentCounts(ctx, requirementIDs)

	// 验证结果
	assert.NoError(t, err)
	assert.NotNil(t, counts)
	assert.Equal(t, 5, counts[1])
	assert.Equal(t, 3, counts[2])
	assert.Equal(t, 0, counts[3]) // 没有评论的需求应该返回0
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRequirementCommentRepository_GetByMentionedUser(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := NewRequirementCommentRepository(db)
	ctx := context.Background()

	userID := 5
	filters := &models.RequirementCommentFilters{
		Page:     1,
		PageSize: 20,
	}

	userIDJSON := "[5]"

	// 设置期望的总数查询
	mock.ExpectQuery(`SELECT COUNT`).
		WithArgs(userIDJSON, models.RequirementCommentStatusActive).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

	// 设置期望的列表查询
	now := time.Now()
	rows := sqlmock.NewRows([]string{
		"id", "requirement_id", "user_id", "parent_comment_id",
		"content", "comment_type", "attachments",
		"mentioned_user_ids", "mentioned_count",
		"is_internal", "is_pinned", "status",
		"created_at", "updated_at",
		"username", "user_type",
	}).
		AddRow(1, 1, 1, nil, "@user5 请查看", "comment", nil, nil, 1, false, false, models.RequirementCommentStatusActive, now, now, "user1", "regular").
		AddRow(2, 2, 2, nil, "@user5 需要你的意见", "comment", nil, nil, 2, false, false, models.RequirementCommentStatusActive, now, now, "user2", "regular")

	mock.ExpectQuery(`SELECT (.+) FROM requirement_comments`).
		WithArgs(userIDJSON, models.RequirementCommentStatusActive, filters.PageSize, 0).
		WillReturnRows(rows)

	// 执行测试
	result, err := repo.GetByMentionedUser(ctx, userID, filters)

	// 验证结果
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 2, result.Total)
	assert.Len(t, result.Data, 2)
	assert.Equal(t, 1, result.Data[0].MentionedCount)
	assert.Equal(t, 2, result.Data[1].MentionedCount)
	assert.NoError(t, mock.ExpectationsWereMet())
}
