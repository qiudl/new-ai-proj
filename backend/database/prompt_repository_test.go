package database

import (
	"testing"
	"time"

	"ai-project-backend/models"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
)

func TestGetActiveTemplates(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	repo := NewPromptRepository(db)

	rows := sqlmock.NewRows([]string{
		"id", "name", "description", "content", "category", "tags",
		"usage_count", "success_rate", "recommended_models",
		"is_system", "is_active", "created_by", "created_at", "updated_at",
	}).AddRow(
		1, "测试模板", "测试描述", "测试内容", "technical", "{开发,测试}",
		10, 85.5, "{openai,claude}",
		true, true, nil, time.Now(), time.Now(),
	)

	mock.ExpectQuery("SELECT (.+) FROM prompt_templates WHERE is_active = true").
		WillReturnRows(rows)

	templates, err := repo.GetActiveTemplates()
	assert.NoError(t, err)
	assert.Len(t, templates, 1)
	assert.Equal(t, "测试模板", templates[0].Name)
	assert.Equal(t, 10, templates[0].UsageCount)
	assert.Equal(t, 85.5, templates[0].SuccessRate)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGetTemplatesByCategory(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	repo := NewPromptRepository(db)

	rows := sqlmock.NewRows([]string{
		"id", "name", "description", "content", "category", "tags",
		"usage_count", "success_rate", "recommended_models",
		"is_system", "is_active", "created_by", "created_at", "updated_at",
	}).AddRow(
		1, "技术模板", "技术描述", "技术内容", "technical", "{开发}",
		5, 90.0, "{openai}",
		true, true, nil, time.Now(), time.Now(),
	)

	mock.ExpectQuery("SELECT (.+) FROM prompt_templates WHERE is_active = true AND category = \\$1").
		WithArgs("technical").
		WillReturnRows(rows)

	templates, err := repo.GetTemplatesByCategory("technical")
	assert.NoError(t, err)
	assert.Len(t, templates, 1)
	assert.Equal(t, "technical", templates[0].Category)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGetTemplateByID(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	repo := NewPromptRepository(db)

	rows := sqlmock.NewRows([]string{
		"id", "name", "description", "content", "category", "tags",
		"usage_count", "success_rate", "recommended_models",
		"is_system", "is_active", "created_by", "created_at", "updated_at",
	}).AddRow(
		1, "模板1", "描述1", "内容1", "general", "{通用}",
		3, 75.0, "{claude}",
		true, true, nil, time.Now(), time.Now(),
	)

	mock.ExpectQuery("SELECT (.+) FROM prompt_templates WHERE id = \\$1").
		WithArgs(1).
		WillReturnRows(rows)

	template, err := repo.GetTemplateByID(1)
	assert.NoError(t, err)
	assert.NotNil(t, template)
	assert.Equal(t, 1, template.ID)
	assert.Equal(t, "模板1", template.Name)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestIncrementTemplateUsage(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	repo := NewPromptRepository(db)

	mock.ExpectExec("UPDATE prompt_templates SET usage_count = usage_count \\+ 1").
		WithArgs(sqlmock.AnyArg(), 1).
		WillReturnResult(sqlmock.NewResult(0, 1))

	err = repo.IncrementTemplateUsage(1)
	assert.NoError(t, err)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestCreatePromptHistory(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	repo := NewPromptRepository(db)

	history := &models.UserPromptHistory{
		UserID:              1,
		ParentTaskID:        100,
		PromptText:          "测试提示词",
		TemplateID:          nil,
		AIProvider:          "openai",
		AIModel:             "gpt-4",
		SubtasksGenerated:   5,
		SubtasksAccepted:    0,
		TotalEstimatedHours: nil,
		IsSuccessful:        nil,
		UserRating:          nil,
		UserFeedback:        nil,
	}

	rows := sqlmock.NewRows([]string{"id", "created_at"}).
		AddRow(1, time.Now())

	mock.ExpectQuery("INSERT INTO user_prompt_history").
		WithArgs(
			history.UserID,
			history.ParentTaskID,
			history.PromptText,
			history.TemplateID,
			history.AIProvider,
			history.AIModel,
			history.SubtasksGenerated,
			history.SubtasksAccepted,
			history.TotalEstimatedHours,
			history.IsSuccessful,
			history.UserRating,
			history.UserFeedback,
		).
		WillReturnRows(rows)

	err = repo.CreatePromptHistory(history)
	assert.NoError(t, err)
	assert.Equal(t, 1, history.ID)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGetUserPromptHistory(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	repo := NewPromptRepository(db)

	rows := sqlmock.NewRows([]string{
		"id", "user_id", "parent_task_id", "prompt_text", "template_id",
		"ai_provider", "ai_model", "subtasks_generated", "subtasks_accepted",
		"total_estimated_hours", "is_successful", "user_rating", "user_feedback", "created_at",
	}).AddRow(
		1, 1, 100, "测试提示词", nil,
		"openai", "gpt-4", 5, 3,
		nil, true, 5, "很好", time.Now(),
	)

	mock.ExpectQuery("SELECT (.+) FROM user_prompt_history WHERE user_id = \\$1").
		WithArgs(1, 20).
		WillReturnRows(rows)

	histories, err := repo.GetUserPromptHistory(1, 20)
	assert.NoError(t, err)
	assert.Len(t, histories, 1)
	assert.Equal(t, "测试提示词", histories[0].PromptText)
	assert.Equal(t, 5, histories[0].SubtasksGenerated)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdatePromptHistoryResult(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	repo := NewPromptRepository(db)

	mock.ExpectExec("UPDATE user_prompt_history SET subtasks_accepted = \\$1, is_successful = \\$2").
		WithArgs(3, true, 1).
		WillReturnResult(sqlmock.NewResult(0, 1))

	err = repo.UpdatePromptHistoryResult(1, 3, true)
	assert.NoError(t, err)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdatePromptHistoryFeedback(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	repo := NewPromptRepository(db)

	t.Run("有效评分", func(t *testing.T) {
		mock.ExpectExec("UPDATE user_prompt_history SET user_rating = \\$1, user_feedback = \\$2").
			WithArgs(5, "非常好用", 1).
			WillReturnResult(sqlmock.NewResult(0, 1))

		err = repo.UpdatePromptHistoryFeedback(1, 5, "非常好用")
		assert.NoError(t, err)
	})

	t.Run("无效评分", func(t *testing.T) {
		err = repo.UpdatePromptHistoryFeedback(1, 6, "无效评分")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "评分必须在1-5之间")
	})

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdateTemplateSuccessRate(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	repo := NewPromptRepository(db)

	mock.ExpectExec("WITH stats AS").
		WithArgs(1, sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(0, 1))

	err = repo.UpdateTemplateSuccessRate(1)
	assert.NoError(t, err)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGetSuccessfulHistoryForUser(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	repo := NewPromptRepository(db)

	rows := sqlmock.NewRows([]string{
		"id", "user_id", "parent_task_id", "prompt_text", "template_id",
		"ai_provider", "ai_model", "subtasks_generated", "subtasks_accepted",
		"total_estimated_hours", "is_successful", "user_rating", "user_feedback", "created_at",
	}).AddRow(
		1, 1, 100, "成功提示词", 1,
		"claude", "claude-3-opus", 8, 7,
		nil, true, 5, "完美", time.Now(),
	)

	mock.ExpectQuery("SELECT (.+) FROM user_prompt_history WHERE user_id = \\$1 AND is_successful = true").
		WithArgs(1, 50).
		WillReturnRows(rows)

	histories, err := repo.GetSuccessfulHistoryForUser(1, 50)
	assert.NoError(t, err)
	assert.Len(t, histories, 1)
	assert.True(t, *histories[0].IsSuccessful)
	assert.Equal(t, 8, histories[0].SubtasksGenerated)

	assert.NoError(t, mock.ExpectationsWereMet())
}
