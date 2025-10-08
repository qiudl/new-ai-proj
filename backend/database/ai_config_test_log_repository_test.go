package database

import (
	"testing"

	"ai-project-backend/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAIConfigTestLogRepository_CreateTestLog(t *testing.T) {
	db := setupTestDB(t)
	defer cleanupTestDB(t, db)

	repo := NewAIConfigTestLogRepository(db)

	// 准备测试数据
	responseTime := 1500
	tokensUsed := 45
	temperature := 0.7
	modelUsed := "claude-3-5-sonnet-20241022"
	maxTokens := 4096
	testResponse := "Test response from AI"
	testIP := "192.168.1.1"
	userAgent := "Mozilla/5.0"

	req := &models.CreateTestLogRequest{
		ConfigID:       1,
		Provider:       "claude",
		TestPrompt:     "Hello, how are you?",
		TestResponse:   &testResponse,
		TestStatus:     models.TestStatusSuccess,
		ResponseTimeMs: &responseTime,
		TokensUsed:     &tokensUsed,
		ModelUsed:      &modelUsed,
		MaxTokens:      &maxTokens,
		Temperature:    &temperature,
		TestIP:         &testIP,
		UserAgent:      &userAgent,
	}

	// 执行创建
	log, err := repo.CreateTestLog(req, 1)
	require.NoError(t, err)
	require.NotNil(t, log)

	// 验证结果
	assert.Greater(t, log.ID, 0)
	assert.Equal(t, req.ConfigID, log.ConfigID)
	assert.Equal(t, req.Provider, log.Provider)
	assert.Equal(t, req.TestPrompt, log.TestPrompt)
	assert.Equal(t, req.TestStatus, log.TestStatus)
	assert.NotNil(t, log.CreatedAt)
}

func TestAIConfigTestLogRepository_CreateTestLog_ValidationError(t *testing.T) {
	db := setupTestDB(t)
	defer cleanupTestDB(t, db)

	repo := NewAIConfigTestLogRepository(db)

	tests := []struct {
		name    string
		req     *models.CreateTestLogRequest
		wantErr bool
	}{
		{
			name: "invalid config_id",
			req: &models.CreateTestLogRequest{
				ConfigID:   0,
				Provider:   "claude",
				TestPrompt: "test",
				TestStatus: models.TestStatusSuccess,
			},
			wantErr: true,
		},
		{
			name: "empty provider",
			req: &models.CreateTestLogRequest{
				ConfigID:   1,
				Provider:   "",
				TestPrompt: "test",
				TestStatus: models.TestStatusSuccess,
			},
			wantErr: true,
		},
		{
			name: "empty test_prompt",
			req: &models.CreateTestLogRequest{
				ConfigID:   1,
				Provider:   "claude",
				TestPrompt: "",
				TestStatus: models.TestStatusSuccess,
			},
			wantErr: true,
		},
		{
			name: "invalid test_status",
			req: &models.CreateTestLogRequest{
				ConfigID:   1,
				Provider:   "claude",
				TestPrompt: "test",
				TestStatus: "invalid",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := repo.CreateTestLog(tt.req, 1)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestAIConfigTestLogRepository_GetTestLogByID(t *testing.T) {
	db := setupTestDB(t)
	defer cleanupTestDB(t, db)

	repo := NewAIConfigTestLogRepository(db)

	// 创建测试日志
	responseTime := 1000
	req := &models.CreateTestLogRequest{
		ConfigID:       1,
		Provider:       "claude",
		TestPrompt:     "Test prompt",
		TestStatus:     models.TestStatusSuccess,
		ResponseTimeMs: &responseTime,
	}

	created, err := repo.CreateTestLog(req, 1)
	require.NoError(t, err)

	// 测试获取
	log, err := repo.GetTestLogByID(created.ID)
	require.NoError(t, err)
	assert.Equal(t, created.ID, log.ID)
	assert.Equal(t, req.TestPrompt, log.TestPrompt)

	// 测试不存在的ID
	_, err = repo.GetTestLogByID(99999)
	assert.Error(t, err)
}

func TestAIConfigTestLogRepository_GetTestLogs(t *testing.T) {
	db := setupTestDB(t)
	defer cleanupTestDB(t, db)

	repo := NewAIConfigTestLogRepository(db)

	// 创建多条测试日志
	for i := 0; i < 15; i++ {
		status := models.TestStatusSuccess
		if i%3 == 0 {
			status = models.TestStatusFailed
		}

		req := &models.CreateTestLogRequest{
			ConfigID:   1,
			Provider:   "claude",
			TestPrompt: "Test prompt",
			TestStatus: status,
		}
		_, err := repo.CreateTestLog(req, 1)
		require.NoError(t, err)
	}

	// 测试查询所有
	params := &models.TestLogQueryParams{
		Limit: 20,
	}
	logs, err := repo.GetTestLogs(params)
	require.NoError(t, err)
	assert.Len(t, logs, 15)

	// 测试分页
	params = &models.TestLogQueryParams{
		Limit:  5,
		Offset: 0,
	}
	logs, err = repo.GetTestLogs(params)
	require.NoError(t, err)
	assert.Len(t, logs, 5)

	// 测试按状态过滤
	successStatus := models.TestStatusSuccess
	params = &models.TestLogQueryParams{
		TestStatus: &successStatus,
		Limit:      20,
	}
	logs, err = repo.GetTestLogs(params)
	require.NoError(t, err)
	for _, log := range logs {
		assert.Equal(t, models.TestStatusSuccess, log.TestStatus)
	}

	// 测试按配置ID过滤
	configID := 1
	params = &models.TestLogQueryParams{
		ConfigID: &configID,
		Limit:    20,
	}
	logs, err = repo.GetTestLogs(params)
	require.NoError(t, err)
	for _, log := range logs {
		assert.Equal(t, 1, log.ConfigID)
	}
}

func TestAIConfigTestLogRepository_GetTestLogCount(t *testing.T) {
	db := setupTestDB(t)
	defer cleanupTestDB(t, db)

	repo := NewAIConfigTestLogRepository(db)

	// 创建测试日志
	for i := 0; i < 10; i++ {
		req := &models.CreateTestLogRequest{
			ConfigID:   1,
			Provider:   "claude",
			TestPrompt: "Test",
			TestStatus: models.TestStatusSuccess,
		}
		_, err := repo.CreateTestLog(req, 1)
		require.NoError(t, err)
	}

	// 测试总数
	params := &models.TestLogQueryParams{}
	count, err := repo.GetTestLogCount(params)
	require.NoError(t, err)
	assert.Equal(t, 10, count)

	// 测试带过滤条件
	configID := 1
	params = &models.TestLogQueryParams{
		ConfigID: &configID,
	}
	count, err = repo.GetTestLogCount(params)
	require.NoError(t, err)
	assert.Equal(t, 10, count)
}

func TestAIConfigTestLogRepository_DeleteTestLog(t *testing.T) {
	db := setupTestDB(t)
	defer cleanupTestDB(t, db)

	repo := NewAIConfigTestLogRepository(db)

	// 创建测试日志
	req := &models.CreateTestLogRequest{
		ConfigID:   1,
		Provider:   "claude",
		TestPrompt: "Test",
		TestStatus: models.TestStatusSuccess,
	}
	created, err := repo.CreateTestLog(req, 1)
	require.NoError(t, err)

	// 删除
	err = repo.DeleteTestLog(created.ID)
	assert.NoError(t, err)

	// 验证已删除
	_, err = repo.GetTestLogByID(created.ID)
	assert.Error(t, err)

	// 测试删除不存在的记录
	err = repo.DeleteTestLog(99999)
	assert.Error(t, err)
}

func TestAIConfigTestLogRepository_GetTestLogStats(t *testing.T) {
	db := setupTestDB(t)
	defer cleanupTestDB(t, db)

	repo := NewAIConfigTestLogRepository(db)

	// 创建多条不同状态的测试日志
	for i := 0; i < 10; i++ {
		status := models.TestStatusSuccess
		if i < 2 {
			status = models.TestStatusFailed
		} else if i < 4 {
			status = models.TestStatusError
		}

		responseTime := (i + 1) * 100
		tokensUsed := (i + 1) * 10

		req := &models.CreateTestLogRequest{
			ConfigID:       1,
			Provider:       "claude",
			TestPrompt:     "Test",
			TestStatus:     status,
			ResponseTimeMs: &responseTime,
			TokensUsed:     &tokensUsed,
		}
		_, err := repo.CreateTestLog(req, 1)
		require.NoError(t, err)
	}

	// 获取统计
	stats, err := repo.GetTestLogStats(1)
	require.NoError(t, err)
	assert.Equal(t, 10, stats.TotalTests)
	assert.Equal(t, 6, stats.SuccessfulTests)
	assert.Equal(t, 2, stats.FailedTests)
	assert.Equal(t, 2, stats.ErrorTests)
	assert.NotNil(t, stats.AvgResponseTimeMs)
}

func TestAIConfigTestLogRepository_GetRecentTestLogs(t *testing.T) {
	db := setupTestDB(t)
	defer cleanupTestDB(t, db)

	repo := NewAIConfigTestLogRepository(db)

	// 创建测试日志
	for i := 0; i < 20; i++ {
		req := &models.CreateTestLogRequest{
			ConfigID:   1,
			Provider:   "claude",
			TestPrompt: "Test",
			TestStatus: models.TestStatusSuccess,
		}
		_, err := repo.CreateTestLog(req, 1)
		require.NoError(t, err)
	}

	// 获取最近10条
	logs, err := repo.GetRecentTestLogs(1, 10)
	require.NoError(t, err)
	assert.Len(t, logs, 10)

	// 验证顺序（应该是最新的在前）
	if len(logs) > 1 {
		assert.True(t, logs[0].CreatedAt.After(logs[1].CreatedAt) || logs[0].CreatedAt.Equal(logs[1].CreatedAt))
	}
}

func TestAIConfigTestLogRepository_CleanupOldTestLogs(t *testing.T) {
	db := setupTestDB(t)
	defer cleanupTestDB(t, db)

	repo := NewAIConfigTestLogRepository(db)

	// 注意：这个测试需要实际的数据库函数支持
	// 这里只测试函数调用不报错
	deletedCount, err := repo.CleanupOldTestLogs(90)
	assert.NoError(t, err)
	assert.GreaterOrEqual(t, deletedCount, 0)
}
