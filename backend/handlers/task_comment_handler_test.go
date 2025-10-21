package handlers

import (
	"ai-project-backend/models"
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockTaskCommentRepository 模拟评论Repository
type MockTaskCommentRepository struct {
	mock.Mock
}

func (m *MockTaskCommentRepository) Create(ctx context.Context, comment *models.TaskComment) error {
	args := m.Called(ctx, comment)
	if args.Get(0) != nil {
		return args.Error(0)
	}
	// 模拟数据库自动设置的字段
	comment.ID = 1
	comment.CreatedAt = time.Now()
	comment.UpdatedAt = time.Now()
	comment.Status = models.CommentStatusActive
	return nil
}

func (m *MockTaskCommentRepository) GetByID(ctx context.Context, id int) (*models.TaskComment, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.TaskComment), args.Error(1)
}

func (m *MockTaskCommentRepository) ListByTask(ctx context.Context, taskID int, page, pageSize int) ([]*models.TaskComment, int, error) {
	args := m.Called(ctx, taskID, page, pageSize)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*models.TaskComment), args.Int(1), args.Error(2)
}

func (m *MockTaskCommentRepository) SoftDelete(ctx context.Context, id int, deletedBy int) error {
	args := m.Called(ctx, id, deletedBy)
	return args.Error(0)
}

func (m *MockTaskCommentRepository) GetStats(ctx context.Context, taskID int) (*models.TaskCommentStats, error) {
	args := m.Called(ctx, taskID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.TaskCommentStats), args.Error(1)
}

func (m *MockTaskCommentRepository) GetCommentCounts(ctx context.Context, taskIDs []int) (map[int]int, error) {
	args := m.Called(ctx, taskIDs)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[int]int), args.Error(1)
}

// MockTaskRepository 模拟任务Repository
type MockTaskRepository struct {
	mock.Mock
}

func (m *MockTaskRepository) GetByID(ctx context.Context, taskID int) (*models.Task, error) {
	args := m.Called(ctx, taskID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Task), args.Error(1)
}

// 其他必需的方法(空实现)
func (m *MockTaskRepository) Create(ctx context.Context, task *models.Task) (*models.Task, error) {
	return nil, nil
}
func (m *MockTaskRepository) Update(ctx context.Context, task *models.Task) (*models.Task, error) {
	return nil, nil
}
func (m *MockTaskRepository) Delete(ctx context.Context, taskID int) error {
	return nil
}
func (m *MockTaskRepository) BulkCreate(ctx context.Context, tasks []*models.Task) ([]*models.Task, error) {
	return nil, nil
}
func (m *MockTaskRepository) BulkDelete(ctx context.Context, ids []int) error {
	return nil
}
func (m *MockTaskRepository) UpdateStatus(ctx context.Context, id int, status string) error {
	return nil
}
func (m *MockTaskRepository) GetByProjectID(ctx context.Context, projectID int, limit, offset int) ([]*models.Task, int, error) {
	return nil, 0, nil
}
func (m *MockTaskRepository) GetAll(ctx context.Context, limit, offset int) ([]*models.Task, int, error) {
	return nil, 0, nil
}
func (m *MockTaskRepository) GetAllFiltered(ctx context.Context, opts *models.TaskListOptions, limit, offset int) ([]*models.Task, int, error) {
	return nil, 0, nil
}
func (m *MockTaskRepository) GetByStatus(ctx context.Context, status string, limit, offset int) ([]*models.Task, int, error) {
	return nil, 0, nil
}
func (m *MockTaskRepository) GetChildren(ctx context.Context, parentID int) ([]*models.Task, error) {
	return nil, nil
}
func (m *MockTaskRepository) GetTaskTree(ctx context.Context, projectID int, sortBy, sortOrder string) ([]*models.HierarchicalTask, error) {
	return nil, nil
}
func (m *MockTaskRepository) GetRootTasks(ctx context.Context, projectID int, limit, offset int) ([]*models.Task, int, error) {
	return nil, 0, nil
}
func (m *MockTaskRepository) GetDescendants(ctx context.Context, rootTaskID int, depth, limit int) ([]*models.TaskDescendantNode, error) {
	return nil, nil
}
func (m *MockTaskRepository) GetDescendantsPaginated(ctx context.Context, rootTaskID int, depth, page, pageSize int) ([]*models.TaskDescendantNode, int, error) {
	return nil, 0, nil
}
func (m *MockTaskRepository) GetDescendantsWithFullDetails(ctx context.Context, rootTaskID int, depth, limit int) ([]*models.Task, error) {
	return nil, nil
}
func (m *MockTaskRepository) GetDescendantsWithFullDetailsPaginated(ctx context.Context, rootTaskID int, depth, page, pageSize int) ([]*models.Task, int, error) {
	return nil, 0, nil
}
func (m *MockTaskRepository) SearchParentTasks(ctx context.Context, projectID int, keyword string, excludeTaskIDs []int, maxLevel int, limit, offset int) ([]*models.Task, int, error) {
	return nil, 0, nil
}
func (m *MockTaskRepository) CheckCircularDependency(ctx context.Context, taskID int, potentialParentID int) (bool, error) {
	return false, nil
}
func (m *MockTaskRepository) CreateTaskUpdate(ctx context.Context, update *models.TaskUpdate) error {
	return nil
}
func (m *MockTaskRepository) GetTaskUpdates(ctx context.Context, taskID int, limit, offset int) ([]*models.TaskUpdate, int, error) {
	return nil, 0, nil
}
func (m *MockTaskRepository) UpdateTaskUpdateNotes(ctx context.Context, updateID int, notes string) error {
	return nil
}
func (m *MockTaskRepository) DeleteTaskUpdate(ctx context.Context, updateID int) error {
	return nil
}
func (m *MockTaskRepository) CreateTimelineEvent(ctx context.Context, event *models.TimelineEvent) error {
	return nil
}
func (m *MockTaskRepository) GetTaskTimeline(ctx context.Context, taskID int, limit, offset int) ([]*models.TimelineEvent, int, error) {
	return nil, 0, nil
}
func (m *MockTaskRepository) GetProjectTimeline(ctx context.Context, projectID int, limit, offset int) ([]*models.TimelineEvent, int, error) {
	return nil, 0, nil
}

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return gin.New()
}

func TestCreateComment_Success(t *testing.T) {
	// 设置
	router := setupTestRouter()
	mockCommentRepo := new(MockTaskCommentRepository)
	mockTaskRepo := new(MockTaskRepository)
	handler := NewTaskCommentHandler(mockCommentRepo, mockTaskRepo)

	// Mock expectations
	mockTaskRepo.On("GetByID", mock.Anything, 1).Return(&models.Task{ID: 1}, nil)
	mockCommentRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.TaskComment")).Return(nil)
	mockCommentRepo.On("GetByID", mock.Anything, 1).Return(&models.TaskComment{
		ID:      1,
		TaskID:  1,
		UserID:  1,
		Content: "测试评论",
		Status:  models.CommentStatusActive,
		User: &models.CommentUser{
			ID:   1,
			Name: "测试用户",
		},
	}, nil)

	// 设置路由
	router.POST("/tasks/:taskId/comments", func(c *gin.Context) {
		c.Set("user_id", 1)
		handler.CreateComment(c)
	})

	// 准备请求
	reqBody := models.CreateTaskCommentRequest{
		Content: "测试评论",
	}
	bodyBytes, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", "/tasks/1/comments", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	// 执行请求
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// 验证
	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response["success"].(bool))

	mockCommentRepo.AssertExpectations(t)
	mockTaskRepo.AssertExpectations(t)
}

func TestCreateComment_EmptyContent(t *testing.T) {
	router := setupTestRouter()
	mockCommentRepo := new(MockTaskCommentRepository)
	mockTaskRepo := new(MockTaskRepository)
	handler := NewTaskCommentHandler(mockCommentRepo, mockTaskRepo)

	router.POST("/tasks/:taskId/comments", func(c *gin.Context) {
		c.Set("user_id", 1)
		handler.CreateComment(c)
	})

	// 空内容请求
	reqBody := models.CreateTaskCommentRequest{
		Content: "   ", // 空白字符
	}
	bodyBytes, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", "/tasks/1/comments", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// 验证应该返回400错误
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestListComments_Success(t *testing.T) {
	router := setupTestRouter()
	mockCommentRepo := new(MockTaskCommentRepository)
	mockTaskRepo := new(MockTaskRepository)
	handler := NewTaskCommentHandler(mockCommentRepo, mockTaskRepo)

	// Mock数据
	comments := []*models.TaskComment{
		{
			ID:      1,
			TaskID:  1,
			Content: "评论1",
			User:    &models.CommentUser{ID: 1, Name: "用户1"},
		},
		{
			ID:      2,
			TaskID:  1,
			Content: "评论2",
			User:    &models.CommentUser{ID: 2, Name: "用户2"},
		},
	}

	mockCommentRepo.On("ListByTask", mock.Anything, 1, 1, 20).Return(comments, 2, nil)

	router.GET("/tasks/:taskId/comments", func(c *gin.Context) {
		c.Set("user_id", 1)
		c.Set("user_permissions", []string{})
		handler.ListComments(c)
	})

	req, _ := http.NewRequest("GET", "/tasks/1/comments?page=1&limit=20", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response["success"].(bool))

	data := response["data"].(map[string]interface{})
	assert.Equal(t, float64(2), data["total"])

	mockCommentRepo.AssertExpectations(t)
}

func TestDeleteComment_Success(t *testing.T) {
	router := setupTestRouter()
	mockCommentRepo := new(MockTaskCommentRepository)
	mockTaskRepo := new(MockTaskRepository)
	handler := NewTaskCommentHandler(mockCommentRepo, mockTaskRepo)

	// Mock评论(当前用户是作者)
	comment := &models.TaskComment{
		ID:     1,
		TaskID: 1,
		UserID: 1, // 与当前用户ID相同
	}

	mockCommentRepo.On("GetByID", mock.Anything, 1).Return(comment, nil)
	mockCommentRepo.On("SoftDelete", mock.Anything, 1, 1).Return(nil)

	router.DELETE("/tasks/:taskId/comments/:commentId", func(c *gin.Context) {
		c.Set("user_id", 1)
		c.Set("user_permissions", []string{})
		handler.DeleteComment(c)
	})

	req, _ := http.NewRequest("DELETE", "/tasks/1/comments/1", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response["success"].(bool))

	mockCommentRepo.AssertExpectations(t)
}

func TestDeleteComment_Forbidden(t *testing.T) {
	router := setupTestRouter()
	mockCommentRepo := new(MockTaskCommentRepository)
	mockTaskRepo := new(MockTaskRepository)
	handler := NewTaskCommentHandler(mockCommentRepo, mockTaskRepo)

	// Mock评论(不是当前用户创建的)
	comment := &models.TaskComment{
		ID:     1,
		TaskID: 1,
		UserID: 2, // 不同的用户ID
	}

	mockCommentRepo.On("GetByID", mock.Anything, 1).Return(comment, nil)

	router.DELETE("/tasks/:taskId/comments/:commentId", func(c *gin.Context) {
		c.Set("user_id", 1) // 当前用户ID=1
		c.Set("user_permissions", []string{}) // 没有管理员权限
		handler.DeleteComment(c)
	})

	req, _ := http.NewRequest("DELETE", "/tasks/1/comments/1", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// 应该返回403 Forbidden
	assert.Equal(t, http.StatusForbidden, w.Code)

	mockCommentRepo.AssertExpectations(t)
}

func TestGetCommentStats_Success(t *testing.T) {
	router := setupTestRouter()
	mockCommentRepo := new(MockTaskCommentRepository)
	mockTaskRepo := new(MockTaskRepository)
	handler := NewTaskCommentHandler(mockCommentRepo, mockTaskRepo)

	now := time.Now()
	stats := &models.TaskCommentStats{
		TaskID:        1,
		TotalComments: 5,
		Participants:  3,
		LastCommentAt: &now,
	}

	mockCommentRepo.On("GetStats", mock.Anything, 1).Return(stats, nil)

	router.GET("/tasks/:taskId/comments/stats", handler.GetCommentStats)

	req, _ := http.NewRequest("GET", "/tasks/1/comments/stats", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response["success"].(bool))

	data := response["data"].(map[string]interface{})
	assert.Equal(t, float64(1), data["task_id"])
	assert.Equal(t, float64(5), data["total_comments"])
	assert.Equal(t, float64(3), data["participants"])

	mockCommentRepo.AssertExpectations(t)
}
