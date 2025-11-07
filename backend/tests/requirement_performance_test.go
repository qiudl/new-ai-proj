package tests

import (
	"fmt"
	"net/http"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

// TestUserSearchPerformance 测试@用户搜索API性能
func TestUserSearchPerformance(t *testing.T) {
	testApp := SetupTestApp(t)
	defer TeardownTestApp(t, testApp)

	// 创建测试用户
	admin := CreateTestSystemUser(t, testApp, "perf_admin")

	t.Run("单次用户搜索响应时间", func(t *testing.T) {
		start := time.Now()

		// 搜索用户
		w := MakeAuthenticatedRequest(
			t,
			testApp,
			http.MethodGet,
			"/api/v1/users/search?q=admin",
			nil,
			admin,
		)

		responseTime := time.Since(start).Milliseconds()

		// 验证响应成功
		assert.Equal(t, http.StatusOK, w.Code)

		// 验证响应时间 (<200ms)
		t.Logf("用户搜索响应时间: %dms", responseTime)
		assert.Less(t, responseTime, int64(200), "用户搜索应该在200ms内完成")
	})

	t.Run("用户搜索并发性能测试", func(t *testing.T) {
		concurrentRequests := 20
		var wg sync.WaitGroup
		responseTimes := make([]int64, concurrentRequests)
		errors := make([]error, concurrentRequests)

		start := time.Now()

		// 并发执行搜索请求
		for i := 0; i < concurrentRequests; i++ {
			wg.Add(1)
			go func(index int) {
				defer wg.Done()

				reqStart := time.Now()

				w := MakeAuthenticatedRequest(
					t,
					testApp,
					http.MethodGet,
					"/api/v1/users/search?q=test",
					nil,
					admin,
				)

				responseTimes[index] = time.Since(reqStart).Milliseconds()

				if w.Code != http.StatusOK {
					errors[index] = fmt.Errorf("request %d failed with status %d", index, w.Code)
				}
			}(i)
		}

		wg.Wait()
		totalTime := time.Since(start).Milliseconds()

		// 计算统计数据
		var totalResponseTime int64
		var maxResponseTime int64
		var minResponseTime int64 = responseTimes[0]
		errorCount := 0

		for i, rt := range responseTimes {
			totalResponseTime += rt
			if rt > maxResponseTime {
				maxResponseTime = rt
			}
			if rt < minResponseTime {
				minResponseTime = rt
			}
			if errors[i] != nil {
				errorCount++
				t.Logf("请求 %d 错误: %v", i, errors[i])
			}
		}

		avgResponseTime := totalResponseTime / int64(concurrentRequests)

		t.Logf("并发性能统计:")
		t.Logf("- 并发请求数: %d", concurrentRequests)
		t.Logf("- 总耗时: %dms", totalTime)
		t.Logf("- 平均响应时间: %dms", avgResponseTime)
		t.Logf("- 最小响应时间: %dms", minResponseTime)
		t.Logf("- 最大响应时间: %dms", maxResponseTime)
		t.Logf("- 错误数: %d", errorCount)

		// 验证性能指标
		assert.Equal(t, 0, errorCount, "不应该有失败的请求")
		assert.Less(t, avgResponseTime, int64(500), "平均响应时间应该在500ms内")
		assert.Less(t, maxResponseTime, int64(1000), "最大响应时间应该在1秒内")
	})

	t.Run("用户搜索防抖效果验证", func(t *testing.T) {
		// 模拟快速连续搜索（防抖应该在客户端实现，但我们测试服务器能否处理）
		searches := []string{"a", "ad", "adm", "admi", "admin"}

		start := time.Now()

		for _, query := range searches {
			w := MakeAuthenticatedRequest(
				t,
				testApp,
				http.MethodGet,
				fmt.Sprintf("/api/v1/users/search?q=%s", query),
				nil,
				admin,
			)

			assert.Equal(t, http.StatusOK, w.Code)
		}

		totalTime := time.Since(start).Milliseconds()
		avgTime := totalTime / int64(len(searches))

		t.Logf("连续搜索统计:")
		t.Logf("- 搜索次数: %d", len(searches))
		t.Logf("- 总耗时: %dms", totalTime)
		t.Logf("- 平均单次耗时: %dms", avgTime)

		// 验证每次搜索都能快速响应
		assert.Less(t, avgTime, int64(200), "平均搜索时间应该在200ms内")
	})

	t.Run("用户搜索大数据量性能", func(t *testing.T) {
		// 创建多个测试用户
		userCount := 100
		for i := 0; i < userCount; i++ {
			CreateTestSystemUser(t, testApp, fmt.Sprintf("perfuser%d", i))
		}

		start := time.Now()

		// 搜索所有用户
		w := MakeAuthenticatedRequest(
			t,
			testApp,
			http.MethodGet,
			"/api/v1/users/search?q=perfuser&limit=50",
			nil,
			admin,
		)

		responseTime := time.Since(start).Milliseconds()

		assert.Equal(t, http.StatusOK, w.Code)

		t.Logf("大数据量搜索响应时间: %dms (100个用户，返回50个结果)", responseTime)

		// 即使有大量用户，响应时间也应该合理
		assert.Less(t, responseTime, int64(500), "大数据量搜索应该在500ms内完成")
	})
}

// TestCommentLoadingPerformance 测试评论加载性能
func TestCommentLoadingPerformance(t *testing.T) {
	testApp := SetupTestApp(t)
	defer TeardownTestApp(t, testApp)

	// 创建测试用户和企业
	admin := CreateTestSystemUser(t, testApp, "comment_admin")
	_ = CreateTestEnterprise(t, testApp, "性能测试企业") // 创建企业用于完整的测试环境

	// 创建测试需求（需要实际的API或数据库操作）
	// 这里简化处理，假设需求ID为1
	requirementID := 1

	t.Run("评论列表初始加载性能", func(t *testing.T) {
		// 创建10条评论
		for i := 1; i <= 10; i++ {
			MakeAuthenticatedRequest(
				t,
				testApp,
				http.MethodPost,
				fmt.Sprintf("/api/v1/requirements/%d/comments", requirementID),
				map[string]interface{}{
					"content": fmt.Sprintf("测试评论 #%d", i),
				},
				admin,
			)
		}

		// 测试加载评论列表
		start := time.Now()

		w := MakeAuthenticatedRequest(
			t,
			testApp,
			http.MethodGet,
			fmt.Sprintf("/api/v1/requirements/%d/comments?page=1&page_size=10", requirementID),
			nil,
			admin,
		)

		responseTime := time.Since(start).Milliseconds()

		assert.Equal(t, http.StatusOK, w.Code)

		t.Logf("加载10条评论响应时间: %dms", responseTime)
		assert.Less(t, responseTime, int64(300), "评论加载应该在300ms内完成")
	})

	t.Run("评论分页性能", func(t *testing.T) {
		// 创建大量评论
		commentCount := 50
		for i := 1; i <= commentCount; i++ {
			MakeAuthenticatedRequest(
				t,
				testApp,
				http.MethodPost,
				fmt.Sprintf("/api/v1/requirements/%d/comments", requirementID),
				map[string]interface{}{
					"content": fmt.Sprintf("分页测试评论 #%d", i),
				},
				admin,
			)
		}

		// 测试不同页的加载性能
		pages := []int{1, 2, 3}
		responseTimes := make(map[int]int64)

		for _, page := range pages {
			start := time.Now()

			w := MakeAuthenticatedRequest(
				t,
				testApp,
				http.MethodGet,
				fmt.Sprintf("/api/v1/requirements/%d/comments?page=%d&page_size=20", requirementID, page),
				nil,
				admin,
			)

			responseTime := time.Since(start).Milliseconds()
			responseTimes[page] = responseTime

			assert.Equal(t, http.StatusOK, w.Code)
			t.Logf("第%d页评论加载时间: %dms", page, responseTime)
		}

		// 验证所有分页响应时间都合理
		for page, rt := range responseTimes {
			assert.Less(t, rt, int64(400), fmt.Sprintf("第%d页加载应该在400ms内完成", page))
		}
	})

	t.Run("评论并发加载性能", func(t *testing.T) {
		concurrentRequests := 10
		var wg sync.WaitGroup
		responseTimes := make([]int64, concurrentRequests)

		start := time.Now()

		for i := 0; i < concurrentRequests; i++ {
			wg.Add(1)
			go func(index int) {
				defer wg.Done()

				reqStart := time.Now()

				w := MakeAuthenticatedRequest(
					t,
					testApp,
					http.MethodGet,
					fmt.Sprintf("/api/v1/requirements/%d/comments?page=1&page_size=10", requirementID),
					nil,
					admin,
				)

				responseTimes[index] = time.Since(reqStart).Milliseconds()
				assert.Equal(t, http.StatusOK, w.Code)
			}(i)
		}

		wg.Wait()
		totalTime := time.Since(start).Milliseconds()

		// 统计
		var totalResponseTime int64
		for _, rt := range responseTimes {
			totalResponseTime += rt
		}
		avgResponseTime := totalResponseTime / int64(concurrentRequests)

		t.Logf("评论并发加载统计:")
		t.Logf("- 并发请求数: %d", concurrentRequests)
		t.Logf("- 总耗时: %dms", totalTime)
		t.Logf("- 平均响应时间: %dms", avgResponseTime)

		assert.Less(t, avgResponseTime, int64(500), "并发平均响应时间应该在500ms内")
	})

	t.Run("包含@提及的评论加载性能", func(t *testing.T) {
		// 创建包含多个@提及的评论
		MakeAuthenticatedRequest(
			t,
			testApp,
			http.MethodPost,
			fmt.Sprintf("/api/v1/requirements/%d/comments", requirementID),
			map[string]interface{}{
				"content":        "请@admin @user1 @user2 @user3 协助审查",
				"mentioned_users": []string{"admin", "user1", "user2", "user3"},
			},
			admin,
		)

		start := time.Now()

		w := MakeAuthenticatedRequest(
			t,
			testApp,
			http.MethodGet,
			fmt.Sprintf("/api/v1/requirements/%d/comments?page=1&page_size=10", requirementID),
			nil,
			admin,
		)

		responseTime := time.Since(start).Milliseconds()

		assert.Equal(t, http.StatusOK, w.Code)

		t.Logf("包含@提及的评论加载时间: %dms", responseTime)
		assert.Less(t, responseTime, int64(400), "包含@提及的评论加载应该在400ms内完成")
	})

	t.Run("评论创建性能", func(t *testing.T) {
		start := time.Now()

		w := MakeAuthenticatedRequest(
			t,
			testApp,
			http.MethodPost,
			fmt.Sprintf("/api/v1/requirements/%d/comments", requirementID),
			map[string]interface{}{
				"content": "这是一条性能测试评论，包含较长的文本内容用于测试创建性能。" +
					"Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
			},
			admin,
		)

		responseTime := time.Since(start).Milliseconds()

		assert.Equal(t, http.StatusCreated, w.Code)

		t.Logf("评论创建响应时间: %dms", responseTime)
		assert.Less(t, responseTime, int64(300), "评论创建应该在300ms内完成")
	})

	t.Run("评论更新性能", func(t *testing.T) {
		// 先创建一条评论
		createResp := MakeAuthenticatedRequest(
			t,
			testApp,
			http.MethodPost,
			fmt.Sprintf("/api/v1/requirements/%d/comments", requirementID),
			map[string]interface{}{
				"content": "原始评论内容",
			},
			admin,
		)

		createData := AssertSuccessResponse(t, createResp)
		commentID := int(createData["data"].(map[string]interface{})["id"].(float64))

		// 测试更新性能
		start := time.Now()

		w := MakeAuthenticatedRequest(
			t,
			testApp,
			http.MethodPut,
			fmt.Sprintf("/api/v1/requirements/%d/comments/%d", requirementID, commentID),
			map[string]interface{}{
				"content": "更新后的评论内容，包含更多详细信息和测试数据。",
			},
			admin,
		)

		responseTime := time.Since(start).Milliseconds()

		assert.Equal(t, http.StatusOK, w.Code)

		t.Logf("评论更新响应时间: %dms", responseTime)
		assert.Less(t, responseTime, int64(300), "评论更新应该在300ms内完成")
	})

	t.Run("评论删除性能", func(t *testing.T) {
		// 先创建一条评论
		createResp := MakeAuthenticatedRequest(
			t,
			testApp,
			http.MethodPost,
			fmt.Sprintf("/api/v1/requirements/%d/comments", requirementID),
			map[string]interface{}{
				"content": "待删除的评论",
			},
			admin,
		)

		createData := AssertSuccessResponse(t, createResp)
		commentID := int(createData["data"].(map[string]interface{})["id"].(float64))

		// 测试删除性能
		start := time.Now()

		w := MakeAuthenticatedRequest(
			t,
			testApp,
			http.MethodDelete,
			fmt.Sprintf("/api/v1/requirements/%d/comments/%d", requirementID, commentID),
			nil,
			admin,
		)

		responseTime := time.Since(start).Milliseconds()

		assert.Equal(t, http.StatusOK, w.Code)

		t.Logf("评论删除响应时间: %dms", responseTime)
		assert.Less(t, responseTime, int64(200), "评论删除应该在200ms内完成")
	})
}

// BenchmarkUserSearch 基准测试用户搜索
func BenchmarkUserSearch(b *testing.B) {
	testApp := SetupTestApp(&testing.T{})

	// 创建测试用户
	admin := CreateTestSystemUser(&testing.T{}, testApp, "bench_admin")

	// 创建100个用户用于搜索
	for i := 0; i < 100; i++ {
		CreateTestSystemUser(&testing.T{}, testApp, fmt.Sprintf("benchuser%d", i))
	}

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		MakeAuthenticatedRequest(
			&testing.T{},
			testApp,
			http.MethodGet,
			"/api/v1/users/search?q=benchuser",
			nil,
			admin,
		)
	}
}

// BenchmarkCommentLoading 基准测试评论加载
func BenchmarkCommentLoading(b *testing.B) {
	testApp := SetupTestApp(&testing.T{})

	// 创建测试用户
	admin := CreateTestSystemUser(&testing.T{}, testApp, "bench_admin")

	requirementID := 1

	// 创建50条评论
	for i := 0; i < 50; i++ {
		MakeAuthenticatedRequest(
			&testing.T{},
			testApp,
			http.MethodPost,
			fmt.Sprintf("/api/v1/requirements/%d/comments", requirementID),
			map[string]interface{}{
				"content": fmt.Sprintf("Benchmark评论 #%d", i),
			},
			admin,
		)
	}

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		MakeAuthenticatedRequest(
			&testing.T{},
			testApp,
			http.MethodGet,
			fmt.Sprintf("/api/v1/requirements/%d/comments?page=1&page_size=20", requirementID),
			nil,
			admin,
		)
	}
}
