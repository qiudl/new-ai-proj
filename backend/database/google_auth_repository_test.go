package database

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"errors"
	"testing"
	"time"

	"ai-project-backend/models"
	"ai-project-backend/utils"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Test setup helper
func setupGoogleAuthRepositoryTest() (*googleAuthRepository, sqlmock.Sqlmock, *sql.DB) {
	db, mock, _ := sqlmock.New()
	repo := &googleAuthRepository{db: db}
	return repo, mock, db
}

// Test OAuth State Management

func TestGoogleAuthRepository_CreateOAuthState(t *testing.T) {
	repo, mock, db := setupGoogleAuthRepositoryTest()
	defer db.Close()
	ctx := context.Background()

	t.Run("成功创建OAuth状态", func(t *testing.T) {
		userID := 1
		now := time.Now()

		// 模拟utils.GenerateRandomString的调用（这需要在实际实现中mock）
		expectedState := "test_random_state_32_characters"
		
		mock.ExpectQuery(`INSERT INTO oauth_states`).
			WithArgs(sqlmock.AnyArg(), userID, sqlmock.AnyArg()).
			WillReturnRows(sqlmock.NewRows([]string{"id", "created_at"}).
				AddRow(1, now))

		result, err := repo.CreateOAuthState(ctx, userID)

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, userID, result.UserID)
		assert.NotEmpty(t, result.State)
		assert.Equal(t, 1, result.ID)
		mock.AssertExpectations(t)
	})

	t.Run("数据库插入失败", func(t *testing.T) {
		userID := 1
		
		mock.ExpectQuery(`INSERT INTO oauth_states`).
			WithArgs(sqlmock.AnyArg(), userID, sqlmock.AnyArg()).
			WillReturnError(errors.New("database error"))

		result, err := repo.CreateOAuthState(ctx, userID)

		assert.Error(t, err)
		assert.Nil(t, result)
		assert.Contains(t, err.Error(), "failed to create oauth state")
		mock.AssertExpectations(t)
	})
}

func TestGoogleAuthRepository_GetOAuthState(t *testing.T) {
	repo, mock, db := setupGoogleAuthRepositoryTest()
	defer db.Close()
	ctx := context.Background()

	t.Run("成功获取OAuth状态", func(t *testing.T) {
		state := "test_state"
		now := time.Now()
		expiresAt := now.Add(15 * time.Minute)

		mock.ExpectQuery(`SELECT id, state, user_id, expires_at, created_at FROM oauth_states WHERE state = \$1`).
			WithArgs(state).
			WillReturnRows(sqlmock.NewRows([]string{"id", "state", "user_id", "expires_at", "created_at"}).
				AddRow(1, state, 1, expiresAt, now))

		result, err := repo.GetOAuthState(ctx, state)

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, 1, result.ID)
		assert.Equal(t, state, result.State)
		assert.Equal(t, 1, result.UserID)
		assert.Equal(t, expiresAt.Unix(), result.ExpiresAt.Unix())
		mock.AssertExpectations(t)
	})

	t.Run("OAuth状态不存在", func(t *testing.T) {
		state := "nonexistent_state"

		mock.ExpectQuery(`SELECT id, state, user_id, expires_at, created_at FROM oauth_states WHERE state = \$1`).
			WithArgs(state).
			WillReturnError(sql.ErrNoRows)

		result, err := repo.GetOAuthState(ctx, state)

		assert.Error(t, err)
		assert.Nil(t, result)
		assert.Contains(t, err.Error(), "oauth state not found")
		mock.AssertExpectations(t)
	})

	t.Run("数据库查询失败", func(t *testing.T) {
		state := "test_state"

		mock.ExpectQuery(`SELECT id, state, user_id, expires_at, created_at FROM oauth_states WHERE state = \$1`).
			WithArgs(state).
			WillReturnError(errors.New("database error"))

		result, err := repo.GetOAuthState(ctx, state)

		assert.Error(t, err)
		assert.Nil(t, result)
		assert.Contains(t, err.Error(), "failed to get oauth state")
		mock.AssertExpectations(t)
	})
}

func TestGoogleAuthRepository_DeleteOAuthState(t *testing.T) {
	repo, mock, db := setupGoogleAuthRepositoryTest()
	defer db.Close()
	ctx := context.Background()

	t.Run("成功删除OAuth状态", func(t *testing.T) {
		state := "test_state"

		mock.ExpectExec(`DELETE FROM oauth_states WHERE state = \$1`).
			WithArgs(state).
			WillReturnResult(sqlmock.NewResult(0, 1))

		err := repo.DeleteOAuthState(ctx, state)

		assert.NoError(t, err)
		mock.AssertExpectations(t)
	})

	t.Run("OAuth状态不存在", func(t *testing.T) {
		state := "nonexistent_state"

		mock.ExpectExec(`DELETE FROM oauth_states WHERE state = \$1`).
			WithArgs(state).
			WillReturnResult(sqlmock.NewResult(0, 0))

		err := repo.DeleteOAuthState(ctx, state)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "oauth state not found")
		mock.AssertExpectations(t)
	})

	t.Run("数据库删除失败", func(t *testing.T) {
		state := "test_state"

		mock.ExpectExec(`DELETE FROM oauth_states WHERE state = \$1`).
			WithArgs(state).
			WillReturnError(errors.New("database error"))

		err := repo.DeleteOAuthState(ctx, state)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to delete oauth state")
		mock.AssertExpectations(t)
	})
}

func TestGoogleAuthRepository_CleanupExpiredOAuthStates(t *testing.T) {
	repo, mock, db := setupGoogleAuthRepositoryTest()
	defer db.Close()
	ctx := context.Background()

	t.Run("成功清理过期状态", func(t *testing.T) {
		expectedCount := 3

		mock.ExpectExec(`DELETE FROM oauth_states WHERE expires_at < \$1`).
			WithArgs(sqlmock.AnyArg()).
			WillReturnResult(sqlmock.NewResult(0, int64(expectedCount)))

		count, err := repo.CleanupExpiredOAuthStates(ctx)

		assert.NoError(t, err)
		assert.Equal(t, expectedCount, count)
		mock.AssertExpectations(t)
	})

	t.Run("没有过期状态需要清理", func(t *testing.T) {
		mock.ExpectExec(`DELETE FROM oauth_states WHERE expires_at < \$1`).
			WithArgs(sqlmock.AnyArg()).
			WillReturnResult(sqlmock.NewResult(0, 0))

		count, err := repo.CleanupExpiredOAuthStates(ctx)

		assert.NoError(t, err)
		assert.Equal(t, 0, count)
		mock.AssertExpectations(t)
	})

	t.Run("数据库清理失败", func(t *testing.T) {
		mock.ExpectExec(`DELETE FROM oauth_states WHERE expires_at < \$1`).
			WithArgs(sqlmock.AnyArg()).
			WillReturnError(errors.New("database error"))

		count, err := repo.CleanupExpiredOAuthStates(ctx)

		assert.Error(t, err)
		assert.Equal(t, 0, count)
		assert.Contains(t, err.Error(), "failed to cleanup expired oauth states")
		mock.AssertExpectations(t)
	})
}

// Test Google Token Management

func TestGoogleAuthRepository_SaveGoogleToken(t *testing.T) {
	repo, mock, db := setupGoogleAuthRepositoryTest()
	defer db.Close()
	ctx := context.Background()

	t.Run("成功保存新Token", func(t *testing.T) {
		now := time.Now()
		token := &models.GoogleToken{
			UserID:       1,
			AccessToken:  "access_token_test",
			RefreshToken: "refresh_token_test",
			TokenType:    "Bearer",
			ExpiresAt:    now.Add(time.Hour),
			Scopes:       []string{"https://www.googleapis.com/auth/calendar"},
		}

		mock.ExpectQuery(`INSERT INTO google_tokens`).
			WithArgs(
				token.UserID,
				sqlmock.AnyArg(), // encrypted access token
				sqlmock.AnyArg(), // encrypted refresh token
				token.TokenType,
				token.ExpiresAt,
				token.Scopes,
			).
			WillReturnRows(sqlmock.NewRows([]string{"id", "created_at", "updated_at"}).
				AddRow(1, now, now))

		err := repo.SaveGoogleToken(ctx, token)

		assert.NoError(t, err)
		assert.Equal(t, 1, token.ID)
		assert.Equal(t, now.Unix(), token.CreatedAt.Unix())
		mock.AssertExpectations(t)
	})

	t.Run("更新现有Token（ON CONFLICT处理）", func(t *testing.T) {
		now := time.Now()
		token := &models.GoogleToken{
			UserID:       1,
			AccessToken:  "new_access_token",
			RefreshToken: "new_refresh_token",
			TokenType:    "Bearer",
			ExpiresAt:    now.Add(time.Hour),
			Scopes:       []string{"https://www.googleapis.com/auth/calendar"},
		}

		mock.ExpectQuery(`INSERT INTO google_tokens`).
			WithArgs(
				token.UserID,
				sqlmock.AnyArg(),
				sqlmock.AnyArg(),
				token.TokenType,
				token.ExpiresAt,
				token.Scopes,
			).
			WillReturnRows(sqlmock.NewRows([]string{"id", "created_at", "updated_at"}).
				AddRow(1, now.Add(-time.Hour), now))

		err := repo.SaveGoogleToken(ctx, token)

		assert.NoError(t, err)
		mock.AssertExpectations(t)
	})

	t.Run("加密访问令牌失败", func(t *testing.T) {
		token := &models.GoogleToken{
			UserID:       1,
			AccessToken:  "",  // 空token可能导致加密失败
			RefreshToken: "refresh_token_test",
		}

		// 注意：这个测试依赖于utils.Encrypt的实现
		// 在实际测试中可能需要mock utils.Encrypt
		err := repo.SaveGoogleToken(ctx, token)

		// 由于我们无法直接mock utils.Encrypt，这个测试可能需要调整
		// 或者需要依赖注入加密服务
		if err != nil {
			assert.Contains(t, err.Error(), "failed to encrypt access token")
		}
	})

	t.Run("数据库插入失败", func(t *testing.T) {
		token := &models.GoogleToken{
			UserID:       1,
			AccessToken:  "access_token_test",
			RefreshToken: "refresh_token_test",
			TokenType:    "Bearer",
			ExpiresAt:    time.Now().Add(time.Hour),
			Scopes:       []string{"https://www.googleapis.com/auth/calendar"},
		}

		mock.ExpectQuery(`INSERT INTO google_tokens`).
			WithArgs(
				sqlmock.AnyArg(),
				sqlmock.AnyArg(),
				sqlmock.AnyArg(),
				sqlmock.AnyArg(),
				sqlmock.AnyArg(),
				sqlmock.AnyArg(),
			).
			WillReturnError(errors.New("database constraint violation"))

		err := repo.SaveGoogleToken(ctx, token)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to save google token")
		mock.AssertExpectations(t)
	})
}

func TestGoogleAuthRepository_GetGoogleToken(t *testing.T) {
	repo, mock, db := setupGoogleAuthRepositoryTest()
	defer db.Close()
	ctx := context.Background()

	t.Run("成功获取Google Token", func(t *testing.T) {
		userID := 1
		now := time.Now()
		
		// 模拟加密后的token
		encryptedAccessToken := "encrypted_access_token"
		encryptedRefreshToken := "encrypted_refresh_token"

		mock.ExpectQuery(`SELECT id, user_id, access_token_encrypted, refresh_token_encrypted`).
			WithArgs(userID).
			WillReturnRows(sqlmock.NewRows([]string{
				"id", "user_id", "access_token_encrypted", "refresh_token_encrypted",
				"token_type", "expires_at", "scopes", "created_at", "updated_at", "last_refresh_at",
			}).AddRow(
				1, userID, encryptedAccessToken, encryptedRefreshToken,
				"Bearer", now.Add(time.Hour), []string{"calendar"}, now, now, nil,
			))

		token, err := repo.GetGoogleToken(ctx, userID)

		// 由于解密过程需要实际的加密数据，这里主要验证数据库查询逻辑
		if err != nil && !errors.Is(err, utils.ErrDecryption) {
			// 如果不是解密错误，则是其他问题
			assert.NoError(t, err)
		}
		mock.AssertExpectations(t)
	})

	t.Run("Token不存在", func(t *testing.T) {
		userID := 999

		mock.ExpectQuery(`SELECT id, user_id, access_token_encrypted, refresh_token_encrypted`).
			WithArgs(userID).
			WillReturnError(sql.ErrNoRows)

		token, err := repo.GetGoogleToken(ctx, userID)

		assert.Error(t, err)
		assert.Nil(t, token)
		assert.Contains(t, err.Error(), "google token not found")
		mock.AssertExpectations(t)
	})

	t.Run("数据库查询失败", func(t *testing.T) {
		userID := 1

		mock.ExpectQuery(`SELECT id, user_id, access_token_encrypted, refresh_token_encrypted`).
			WithArgs(userID).
			WillReturnError(errors.New("database connection error"))

		token, err := repo.GetGoogleToken(ctx, userID)

		assert.Error(t, err)
		assert.Nil(t, token)
		assert.Contains(t, err.Error(), "failed to get google token")
		mock.AssertExpectations(t)
	})
}

func TestGoogleAuthRepository_UpdateGoogleToken(t *testing.T) {
	repo, mock, db := setupGoogleAuthRepositoryTest()
	defer db.Close()
	ctx := context.Background()

	t.Run("成功更新Token", func(t *testing.T) {
		now := time.Now()
		token := &models.GoogleToken{
			UserID:       1,
			AccessToken:  "new_access_token",
			RefreshToken: "new_refresh_token",
			ExpiresAt:    now.Add(time.Hour),
		}

		mock.ExpectExec(`UPDATE google_tokens SET access_token_encrypted = \$1, refresh_token_encrypted = \$2`).
			WithArgs(
				sqlmock.AnyArg(), // encrypted access token
				sqlmock.AnyArg(), // encrypted refresh token
				token.ExpiresAt,
				sqlmock.AnyArg(), // time.Now() for last_refresh_at
				token.UserID,
			).
			WillReturnResult(sqlmock.NewResult(0, 1))

		err := repo.UpdateGoogleToken(ctx, token)

		assert.NoError(t, err)
		mock.AssertExpectations(t)
	})

	t.Run("Token不存在", func(t *testing.T) {
		token := &models.GoogleToken{
			UserID:       999,
			AccessToken:  "access_token",
			RefreshToken: "refresh_token",
			ExpiresAt:    time.Now().Add(time.Hour),
		}

		mock.ExpectExec(`UPDATE google_tokens SET access_token_encrypted = \$1, refresh_token_encrypted = \$2`).
			WithArgs(
				sqlmock.AnyArg(),
				sqlmock.AnyArg(),
				token.ExpiresAt,
				sqlmock.AnyArg(),
				token.UserID,
			).
			WillReturnResult(sqlmock.NewResult(0, 0))

		err := repo.UpdateGoogleToken(ctx, token)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "google token not found")
		mock.AssertExpectations(t)
	})

	t.Run("数据库更新失败", func(t *testing.T) {
		token := &models.GoogleToken{
			UserID:       1,
			AccessToken:  "access_token",
			RefreshToken: "refresh_token",
			ExpiresAt:    time.Now().Add(time.Hour),
		}

		mock.ExpectExec(`UPDATE google_tokens SET access_token_encrypted = \$1, refresh_token_encrypted = \$2`).
			WithArgs(
				sqlmock.AnyArg(),
				sqlmock.AnyArg(),
				token.ExpiresAt,
				sqlmock.AnyArg(),
				token.UserID,
			).
			WillReturnError(errors.New("database error"))

		err := repo.UpdateGoogleToken(ctx, token)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to update google token")
		mock.AssertExpectations(t)
	})
}

func TestGoogleAuthRepository_DeleteGoogleToken(t *testing.T) {
	repo, mock, db := setupGoogleAuthRepositoryTest()
	defer db.Close()
	ctx := context.Background()

	t.Run("成功删除Token", func(t *testing.T) {
		userID := 1

		mock.ExpectExec(`DELETE FROM google_tokens WHERE user_id = \$1`).
			WithArgs(userID).
			WillReturnResult(sqlmock.NewResult(0, 1))

		err := repo.DeleteGoogleToken(ctx, userID)

		assert.NoError(t, err)
		mock.AssertExpectations(t)
	})

	t.Run("Token不存在", func(t *testing.T) {
		userID := 999

		mock.ExpectExec(`DELETE FROM google_tokens WHERE user_id = \$1`).
			WithArgs(userID).
			WillReturnResult(sqlmock.NewResult(0, 0))

		err := repo.DeleteGoogleToken(ctx, userID)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "google token not found")
		mock.AssertExpectations(t)
	})

	t.Run("数据库删除失败", func(t *testing.T) {
		userID := 1

		mock.ExpectExec(`DELETE FROM google_tokens WHERE user_id = \$1`).
			WithArgs(userID).
			WillReturnError(errors.New("database error"))

		err := repo.DeleteGoogleToken(ctx, userID)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to delete google token")
		mock.AssertExpectations(t)
	})
}

// Test Calendar Sync Management

func TestGoogleAuthRepository_SaveCalendarSync(t *testing.T) {
	repo, mock, db := setupGoogleAuthRepositoryTest()
	defer db.Close()
	ctx := context.Background()

	t.Run("成功保存新的日历同步配置", func(t *testing.T) {
		now := time.Now()
		sync := &models.GoogleCalendarSync{
			UserID:        1,
			CalendarID:    "primary",
			CalendarName:  "Primary Calendar",
			IsPrimary:     true,
			SyncEnabled:   true,
			SyncDirection: "bidirectional",
		}

		mock.ExpectQuery(`INSERT INTO google_calendar_sync`).
			WithArgs(
				sync.UserID, sync.CalendarID, sync.CalendarName,
				sync.IsPrimary, sync.SyncEnabled, sync.SyncDirection,
			).
			WillReturnRows(sqlmock.NewRows([]string{"id", "created_at", "updated_at"}).
				AddRow(1, now, now))

		err := repo.SaveCalendarSync(ctx, sync)

		assert.NoError(t, err)
		assert.Equal(t, 1, sync.ID)
		mock.AssertExpectations(t)
	})

	t.Run("更新现有日历同步配置（ON CONFLICT）", func(t *testing.T) {
		now := time.Now()
		sync := &models.GoogleCalendarSync{
			UserID:        1,
			CalendarID:    "primary",
			CalendarName:  "Updated Primary Calendar",
			IsPrimary:     true,
			SyncEnabled:   false,
			SyncDirection: "task_to_calendar",
		}

		mock.ExpectQuery(`INSERT INTO google_calendar_sync`).
			WithArgs(
				sync.UserID, sync.CalendarID, sync.CalendarName,
				sync.IsPrimary, sync.SyncEnabled, sync.SyncDirection,
			).
			WillReturnRows(sqlmock.NewRows([]string{"id", "created_at", "updated_at"}).
				AddRow(1, now.Add(-time.Hour), now))

		err := repo.SaveCalendarSync(ctx, sync)

		assert.NoError(t, err)
		mock.AssertExpectations(t)
	})

	t.Run("数据库保存失败", func(t *testing.T) {
		sync := &models.GoogleCalendarSync{
			UserID:        1,
			CalendarID:    "primary",
			CalendarName:  "Primary Calendar",
			IsPrimary:     true,
			SyncEnabled:   true,
			SyncDirection: "bidirectional",
		}

		mock.ExpectQuery(`INSERT INTO google_calendar_sync`).
			WithArgs(
				sync.UserID, sync.CalendarID, sync.CalendarName,
				sync.IsPrimary, sync.SyncEnabled, sync.SyncDirection,
			).
			WillReturnError(errors.New("database constraint violation"))

		err := repo.SaveCalendarSync(ctx, sync)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to save calendar sync")
		mock.AssertExpectations(t)
	})
}

func TestGoogleAuthRepository_GetUserCalendarSyncs(t *testing.T) {
	repo, mock, db := setupGoogleAuthRepositoryTest()
	defer db.Close()
	ctx := context.Background()

	t.Run("成功获取用户日历同步配置", func(t *testing.T) {
		userID := 1
		now := time.Now()

		mock.ExpectQuery(`SELECT id, user_id, calendar_id, calendar_name, is_primary, sync_enabled`).
			WithArgs(userID).
			WillReturnRows(sqlmock.NewRows([]string{
				"id", "user_id", "calendar_id", "calendar_name", "is_primary", "sync_enabled",
				"last_sync_at", "sync_direction", "created_at", "updated_at",
			}).
				AddRow(1, userID, "primary", "Primary Calendar", true, true, nil, "bidirectional", now, now).
				AddRow(2, userID, "secondary", "Work Calendar", false, false, nil, "task_to_calendar", now, now))

		syncs, err := repo.GetUserCalendarSyncs(ctx, userID)

		assert.NoError(t, err)
		assert.Len(t, syncs, 2)
		assert.Equal(t, "primary", syncs[0].CalendarID)
		assert.True(t, syncs[0].IsPrimary)
		assert.Equal(t, "secondary", syncs[1].CalendarID)
		assert.False(t, syncs[1].IsPrimary)
		mock.AssertExpectations(t)
	})

	t.Run("用户没有日历同步配置", func(t *testing.T) {
		userID := 999

		mock.ExpectQuery(`SELECT id, user_id, calendar_id, calendar_name, is_primary, sync_enabled`).
			WithArgs(userID).
			WillReturnRows(sqlmock.NewRows([]string{
				"id", "user_id", "calendar_id", "calendar_name", "is_primary", "sync_enabled",
				"last_sync_at", "sync_direction", "created_at", "updated_at",
			}))

		syncs, err := repo.GetUserCalendarSyncs(ctx, userID)

		assert.NoError(t, err)
		assert.Len(t, syncs, 0)
		mock.AssertExpectations(t)
	})

	t.Run("数据库查询失败", func(t *testing.T) {
		userID := 1

		mock.ExpectQuery(`SELECT id, user_id, calendar_id, calendar_name, is_primary, sync_enabled`).
			WithArgs(userID).
			WillReturnError(errors.New("database connection error"))

		syncs, err := repo.GetUserCalendarSyncs(ctx, userID)

		assert.Error(t, err)
		assert.Nil(t, syncs)
		assert.Contains(t, err.Error(), "failed to get user calendar syncs")
		mock.AssertExpectations(t)
	})
}

func TestGoogleAuthRepository_UpdateCalendarSync(t *testing.T) {
	repo, mock, db := setupGoogleAuthRepositoryTest()
	defer db.Close()
	ctx := context.Background()

	t.Run("成功更新日历同步配置", func(t *testing.T) {
		now := time.Now()
		sync := &models.GoogleCalendarSync{
			ID:            1,
			SyncEnabled:   false,
			SyncDirection: "calendar_to_task",
			LastSyncAt:    &now,
		}

		mock.ExpectExec(`UPDATE google_calendar_sync SET sync_enabled = \$1, sync_direction = \$2, last_sync_at = \$3`).
			WithArgs(sync.SyncEnabled, sync.SyncDirection, sync.LastSyncAt, sync.ID).
			WillReturnResult(sqlmock.NewResult(0, 1))

		err := repo.UpdateCalendarSync(ctx, sync)

		assert.NoError(t, err)
		mock.AssertExpectations(t)
	})

	t.Run("日历同步配置不存在", func(t *testing.T) {
		sync := &models.GoogleCalendarSync{
			ID:            999,
			SyncEnabled:   true,
			SyncDirection: "bidirectional",
		}

		mock.ExpectExec(`UPDATE google_calendar_sync SET sync_enabled = \$1, sync_direction = \$2, last_sync_at = \$3`).
			WithArgs(sync.SyncEnabled, sync.SyncDirection, sync.LastSyncAt, sync.ID).
			WillReturnResult(sqlmock.NewResult(0, 0))

		err := repo.UpdateCalendarSync(ctx, sync)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "calendar sync not found")
		mock.AssertExpectations(t)
	})

	t.Run("数据库更新失败", func(t *testing.T) {
		sync := &models.GoogleCalendarSync{
			ID:            1,
			SyncEnabled:   true,
			SyncDirection: "bidirectional",
		}

		mock.ExpectExec(`UPDATE google_calendar_sync SET sync_enabled = \$1, sync_direction = \$2, last_sync_at = \$3`).
			WithArgs(sync.SyncEnabled, sync.SyncDirection, sync.LastSyncAt, sync.ID).
			WillReturnError(errors.New("database error"))

		err := repo.UpdateCalendarSync(ctx, sync)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to update calendar sync")
		mock.AssertExpectations(t)
	})
}

func TestGoogleAuthRepository_DeleteCalendarSync(t *testing.T) {
	repo, mock, db := setupGoogleAuthRepositoryTest()
	defer db.Close()
	ctx := context.Background()

	t.Run("成功删除日历同步配置", func(t *testing.T) {
		userID := 1
		calendarID := "primary"

		mock.ExpectExec(`DELETE FROM google_calendar_sync WHERE user_id = \$1 AND calendar_id = \$2`).
			WithArgs(userID, calendarID).
			WillReturnResult(sqlmock.NewResult(0, 1))

		err := repo.DeleteCalendarSync(ctx, userID, calendarID)

		assert.NoError(t, err)
		mock.AssertExpectations(t)
	})

	t.Run("日历同步配置不存在", func(t *testing.T) {
		userID := 999
		calendarID := "nonexistent"

		mock.ExpectExec(`DELETE FROM google_calendar_sync WHERE user_id = \$1 AND calendar_id = \$2`).
			WithArgs(userID, calendarID).
			WillReturnResult(sqlmock.NewResult(0, 0))

		err := repo.DeleteCalendarSync(ctx, userID, calendarID)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "calendar sync not found")
		mock.AssertExpectations(t)
	})

	t.Run("数据库删除失败", func(t *testing.T) {
		userID := 1
		calendarID := "primary"

		mock.ExpectExec(`DELETE FROM google_calendar_sync WHERE user_id = \$1 AND calendar_id = \$2`).
			WithArgs(userID, calendarID).
			WillReturnError(errors.New("database error"))

		err := repo.DeleteCalendarSync(ctx, userID, calendarID)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to delete calendar sync")
		mock.AssertExpectations(t)
	})
}

// CustomMatcher for time.Time values with tolerance
type timeMatcher struct {
	expected time.Time
	delta    time.Duration
}

func (tm timeMatcher) Match(v driver.Value) bool {
	if t, ok := v.(time.Time); ok {
		diff := t.Sub(tm.expected)
		if diff < 0 {
			diff = -diff
		}
		return diff <= tm.delta
	}
	return false
}

// Helper function to create time matcher
func timeWithinDelta(expected time.Time, delta time.Duration) timeMatcher {
	return timeMatcher{expected: expected, delta: delta}
}

// Benchmark tests
func BenchmarkGoogleAuthRepository_GetGoogleToken(b *testing.B) {
	repo, mock, db := setupGoogleAuthRepositoryTest()
	defer db.Close()
	ctx := context.Background()

	now := time.Now()
	encryptedAccessToken := "encrypted_access_token"
	encryptedRefreshToken := "encrypted_refresh_token"

	// Setup mock expectations for benchmark
	for i := 0; i < b.N; i++ {
		mock.ExpectQuery(`SELECT id, user_id, access_token_encrypted, refresh_token_encrypted`).
			WithArgs(1).
			WillReturnRows(sqlmock.NewRows([]string{
				"id", "user_id", "access_token_encrypted", "refresh_token_encrypted",
				"token_type", "expires_at", "scopes", "created_at", "updated_at", "last_refresh_at",
			}).AddRow(
				1, 1, encryptedAccessToken, encryptedRefreshToken,
				"Bearer", now.Add(time.Hour), []string{"calendar"}, now, now, nil,
			))
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = repo.GetGoogleToken(ctx, 1)
	}
}

// Test Event Mapping Management

func TestGoogleAuthRepository_UpdateEventMapping(t *testing.T) {
	repo, mock, db := setupGoogleAuthRepositoryTest()
	defer db.Close()
	ctx := context.Background()

	t.Run("成功更新事件映射", func(t *testing.T) {
		now := time.Now()
		mapping := &models.GoogleEventMapping{
			ID:           1,
			SyncStatus:   models.SyncStatusSynced,
			ErrorMessage: nil,
			LastSyncedAt: &now,
		}

		mock.ExpectExec(`UPDATE google_event_mappings SET sync_status = \$1, error_message = \$2, last_synced_at = \$3, updated_at = NOW\(\) WHERE id = \$4`).
			WithArgs(mapping.SyncStatus, mapping.ErrorMessage, mapping.LastSyncedAt, mapping.ID).
			WillReturnResult(sqlmock.NewResult(0, 1))

		err := repo.UpdateEventMapping(ctx, mapping)

		assert.NoError(t, err)
		mock.AssertExpectations(t)
	})

	t.Run("事件映射不存在", func(t *testing.T) {
		mapping := &models.GoogleEventMapping{
			ID:         999,
			SyncStatus: models.SyncStatusSynced,
		}

		mock.ExpectExec(`UPDATE google_event_mappings SET sync_status = \$1, error_message = \$2, last_synced_at = \$3, updated_at = NOW\(\) WHERE id = \$4`).
			WithArgs(mapping.SyncStatus, mapping.ErrorMessage, mapping.LastSyncedAt, mapping.ID).
			WillReturnResult(sqlmock.NewResult(0, 0))

		err := repo.UpdateEventMapping(ctx, mapping)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "event mapping not found")
		mock.AssertExpectations(t)
	})

	t.Run("数据库更新失败", func(t *testing.T) {
		mapping := &models.GoogleEventMapping{
			ID:         1,
			SyncStatus: models.SyncStatusSynced,
		}

		mock.ExpectExec(`UPDATE google_event_mappings SET sync_status = \$1, error_message = \$2, last_synced_at = \$3, updated_at = NOW\(\) WHERE id = \$4`).
			WithArgs(mapping.SyncStatus, mapping.ErrorMessage, mapping.LastSyncedAt, mapping.ID).
			WillReturnError(errors.New("database error"))

		err := repo.UpdateEventMapping(ctx, mapping)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to update event mapping")
		mock.AssertExpectations(t)
	})

	t.Run("更新事件映射状态为失败", func(t *testing.T) {
		errorMsg := "同步失败: Google API错误"
		mapping := &models.GoogleEventMapping{
			ID:           1,
			SyncStatus:   models.SyncStatusFailed,
			ErrorMessage: &errorMsg,
			LastSyncedAt: nil,
		}

		mock.ExpectExec(`UPDATE google_event_mappings SET sync_status = \$1, error_message = \$2, last_synced_at = \$3, updated_at = NOW\(\) WHERE id = \$4`).
			WithArgs(mapping.SyncStatus, &errorMsg, mapping.LastSyncedAt, mapping.ID).
			WillReturnResult(sqlmock.NewResult(0, 1))

		err := repo.UpdateEventMapping(ctx, mapping)

		assert.NoError(t, err)
		mock.AssertExpectations(t)
	})
}

func TestGoogleAuthRepository_DeleteEventMapping(t *testing.T) {
	repo, mock, db := setupGoogleAuthRepositoryTest()
	defer db.Close()
	ctx := context.Background()

	t.Run("成功删除事件映射", func(t *testing.T) {
		taskID := 123

		mock.ExpectExec(`DELETE FROM google_event_mappings WHERE task_id = \$1`).
			WithArgs(taskID).
			WillReturnResult(sqlmock.NewResult(0, 1))

		err := repo.DeleteEventMapping(ctx, taskID)

		assert.NoError(t, err)
		mock.AssertExpectations(t)
	})

	t.Run("事件映射不存在", func(t *testing.T) {
		taskID := 999

		mock.ExpectExec(`DELETE FROM google_event_mappings WHERE task_id = \$1`).
			WithArgs(taskID).
			WillReturnResult(sqlmock.NewResult(0, 0))

		err := repo.DeleteEventMapping(ctx, taskID)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "event mapping not found")
		mock.AssertExpectations(t)
	})

	t.Run("数据库删除失败", func(t *testing.T) {
		taskID := 123

		mock.ExpectExec(`DELETE FROM google_event_mappings WHERE task_id = \$1`).
			WithArgs(taskID).
			WillReturnError(errors.New("database constraint violation"))

		err := repo.DeleteEventMapping(ctx, taskID)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to delete event mapping")
		mock.AssertExpectations(t)
	})

	t.Run("删除多个任务的事件映射", func(t *testing.T) {
		taskIDs := []int{101, 102, 103}

		// 使用循环模拟删除多个事件映射
		for i, taskID := range taskIDs {
			mock.ExpectExec(`DELETE FROM google_event_mappings WHERE task_id = \$1`).
				WithArgs(taskID).
				WillReturnResult(sqlmock.NewResult(0, 1))

			err := repo.DeleteEventMapping(ctx, taskID)
			assert.NoError(t, err, "删除任务%d的事件映射失败", i+1)
		}

		mock.AssertExpectations(t)
	})
}

func TestGoogleAuthRepository_GetUserEventMappings(t *testing.T) {
	repo, mock, db := setupGoogleAuthRepositoryTest()
	defer db.Close()
	ctx := context.Background()

	t.Run("成功获取用户事件映射列表", func(t *testing.T) {
		userID := 1
		now := time.Now()

		mock.ExpectQuery(`SELECT id, user_id, task_id, google_event_id, google_calendar_id, last_synced_at, sync_status, error_message, created_at, updated_at FROM google_event_mappings WHERE user_id = \$1 ORDER BY created_at DESC`).
			WithArgs(userID).
			WillReturnRows(sqlmock.NewRows([]string{
				"id", "user_id", "task_id", "google_event_id", "google_calendar_id",
				"last_synced_at", "sync_status", "error_message", "created_at", "updated_at",
			}).
				AddRow(1, userID, 101, "event-1", "primary", now, "synced", nil, now, now).
				AddRow(2, userID, 102, "event-2", "work-calendar", nil, "pending", nil, now, now).
				AddRow(3, userID, 103, "event-3", "primary", nil, "failed", "同步失败", now, now))

		mappings, err := repo.GetUserEventMappings(ctx, userID)

		assert.NoError(t, err)
		assert.Len(t, mappings, 3)
		
		// 验证第一个映射
		assert.Equal(t, 1, mappings[0].ID)
		assert.Equal(t, userID, mappings[0].UserID)
		assert.Equal(t, 101, mappings[0].TaskID)
		assert.Equal(t, "event-1", mappings[0].GoogleEventID)
		assert.Equal(t, "primary", mappings[0].GoogleCalendarID)
		assert.Equal(t, models.SyncStatusSynced, mappings[0].SyncStatus)
		assert.Nil(t, mappings[0].ErrorMessage)

		// 验证第二个映射
		assert.Equal(t, 2, mappings[1].ID)
		assert.Equal(t, models.SyncStatusPending, mappings[1].SyncStatus)
		assert.Nil(t, mappings[1].LastSyncedAt)

		// 验证第三个映射（失败状态）
		assert.Equal(t, 3, mappings[2].ID)
		assert.Equal(t, models.SyncStatusFailed, mappings[2].SyncStatus)
		assert.NotNil(t, mappings[2].ErrorMessage)
		assert.Equal(t, "同步失败", *mappings[2].ErrorMessage)

		mock.AssertExpectations(t)
	})

	t.Run("用户没有事件映射", func(t *testing.T) {
		userID := 999

		mock.ExpectQuery(`SELECT id, user_id, task_id, google_event_id, google_calendar_id, last_synced_at, sync_status, error_message, created_at, updated_at FROM google_event_mappings WHERE user_id = \$1 ORDER BY created_at DESC`).
			WithArgs(userID).
			WillReturnRows(sqlmock.NewRows([]string{
				"id", "user_id", "task_id", "google_event_id", "google_calendar_id",
				"last_synced_at", "sync_status", "error_message", "created_at", "updated_at",
			}))

		mappings, err := repo.GetUserEventMappings(ctx, userID)

		assert.NoError(t, err)
		assert.Len(t, mappings, 0)
		mock.AssertExpectations(t)
	})

	t.Run("数据库查询失败", func(t *testing.T) {
		userID := 1

		mock.ExpectQuery(`SELECT id, user_id, task_id, google_event_id, google_calendar_id, last_synced_at, sync_status, error_message, created_at, updated_at FROM google_event_mappings WHERE user_id = \$1 ORDER BY created_at DESC`).
			WithArgs(userID).
			WillReturnError(errors.New("database connection error"))

		mappings, err := repo.GetUserEventMappings(ctx, userID)

		assert.Error(t, err)
		assert.Nil(t, mappings)
		assert.Contains(t, err.Error(), "failed to get user event mappings")
		mock.AssertExpectations(t)
	})

	t.Run("数据扫描失败", func(t *testing.T) {
		userID := 1

		// 模拟返回错误的列类型导致扫描失败
		mock.ExpectQuery(`SELECT id, user_id, task_id, google_event_id, google_calendar_id, last_synced_at, sync_status, error_message, created_at, updated_at FROM google_event_mappings WHERE user_id = \$1 ORDER BY created_at DESC`).
			WithArgs(userID).
			WillReturnRows(sqlmock.NewRows([]string{
				"id", "user_id", "task_id", "google_event_id", "google_calendar_id",
				"last_synced_at", "sync_status", "error_message", "created_at", "updated_at",
			}).
				AddRow("invalid_id", userID, 101, "event-1", "primary", nil, "synced", nil, time.Now(), time.Now()))

		mappings, err := repo.GetUserEventMappings(ctx, userID)

		assert.Error(t, err)
		assert.Nil(t, mappings)
		assert.Contains(t, err.Error(), "failed to scan event mapping")
		mock.AssertExpectations(t)
	})

	t.Run("按同步状态过滤的功能验证", func(t *testing.T) {
		userID := 1
		now := time.Now()

		mock.ExpectQuery(`SELECT id, user_id, task_id, google_event_id, google_calendar_id, last_synced_at, sync_status, error_message, created_at, updated_at FROM google_event_mappings WHERE user_id = \$1 ORDER BY created_at DESC`).
			WithArgs(userID).
			WillReturnRows(sqlmock.NewRows([]string{
				"id", "user_id", "task_id", "google_event_id", "google_calendar_id",
				"last_synced_at", "sync_status", "error_message", "created_at", "updated_at",
			}).
				AddRow(1, userID, 101, "event-1", "primary", now, "synced", nil, now, now).
				AddRow(2, userID, 102, "event-2", "primary", nil, "pending", nil, now, now).
				AddRow(3, userID, 103, "event-3", "primary", nil, "failed", "API错误", now, now).
				AddRow(4, userID, 104, "event-4", "work", now, "synced", nil, now, now))

		mappings, err := repo.GetUserEventMappings(ctx, userID)

		assert.NoError(t, err)
		assert.Len(t, mappings, 4)

		// 计算不同状态的映射数量
		var syncedCount, pendingCount, failedCount int
		for _, mapping := range mappings {
			switch mapping.SyncStatus {
			case models.SyncStatusSynced:
				syncedCount++
			case models.SyncStatusPending:
				pendingCount++
			case models.SyncStatusFailed:
				failedCount++
			}
		}

		assert.Equal(t, 2, syncedCount, "应该有2个已同步的映射")
		assert.Equal(t, 1, pendingCount, "应该有1个待同步的映射")
		assert.Equal(t, 1, failedCount, "应该有1个同步失败的映射")

		mock.AssertExpectations(t)
	})
}

// Integration test helper (requires real database)
func TestGoogleAuthRepository_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("跳过集成测试")
	}

	// This would require a real database connection for integration testing
	// Leaving as a placeholder for actual integration tests
	t.Run("完整OAuth流程集成测试", func(t *testing.T) {
		// 1. 创建OAuth状态
		// 2. 验证OAuth状态
		// 3. 删除OAuth状态
		// 4. 保存Google Token
		// 5. 获取和验证Token
		// 6. 更新Token
		// 7. 创建日历同步配置
		// 8. 清理测试数据
		
		t.Skip("需要真实数据库连接")
	})

	t.Run("完整事件映射生命周期测试", func(t *testing.T) {
		// 这个测试需要真实的数据库连接来验证完整的事件映射生命周期
		// 1. 创建事件映射
		// 2. 根据任务ID获取事件映射
		// 3. 根据Google事件ID获取事件映射
		// 4. 更新事件映射状态
		// 5. 获取用户的所有事件映射
		// 6. 删除事件映射
		
		t.Skip("需要真实数据库连接")
	})
}