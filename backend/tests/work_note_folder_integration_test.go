package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"ai-project-backend/application"
	"ai-project-backend/handlers"
	"ai-project-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
)

// WorkNoteFolderIntegrationTestSuite 工作笔记文件夹集成测试套件
type WorkNoteFolderIntegrationTestSuite struct {
	suite.Suite
	app    *application.Application
	router *gin.Engine
	client *http.Client

	// 测试数据
	testUserID     int
	testProjectID  int
	createdFolders []int // 记录创建的文件夹ID，用于清理
}

// SetupSuite 设置测试套件
func (suite *WorkNoteFolderIntegrationTestSuite) SetupSuite() {
	var err error

	// 初始化应用
	suite.app, err = application.NewApplication()
	if err != nil {
		suite.T().Fatalf("Failed to create application: %v", err)
	}

	// 设置测试路由
	gin.SetMode(gin.TestMode)
	suite.router = gin.New()

	// 添加认证中间件模拟
	suite.router.Use(func(c *gin.Context) {
		c.Set("user_id", suite.testUserID)
		c.Next()
	})

	// 注册工作笔记文件夹路由
	api := suite.router.Group("/api/v1")
	workNoteFolders := api.Group("/work-note-folders")
	{
		handler := suite.app.GetWorkNoteFolderHandler()
		workNoteFolders.POST("", handler.CreateWorkNoteFolder)
		workNoteFolders.GET("/:id", handler.GetWorkNoteFolder)
		workNoteFolders.PUT("/:id", handler.UpdateWorkNoteFolder)
		workNoteFolders.DELETE("/:id", handler.DeleteWorkNoteFolder)
		workNoteFolders.GET("", handler.ListWorkNoteFolders)
		workNoteFolders.GET("/search", handler.SearchWorkNoteFolders)
		workNoteFolders.GET("/tree", handler.GetWorkNoteFolderTree)
		workNoteFolders.POST("/:id/move", handler.MoveWorkNoteFolder)
	}

	suite.client = &http.Client{Timeout: 30 * time.Second}

	// 设置测试数据
	suite.setupTestData()
}

// TearDownSuite 清理测试套件
func (suite *WorkNoteFolderIntegrationTestSuite) TearDownSuite() {
	// 清理创建的测试数据
	suite.cleanupTestData()

	// 关闭数据库连接
	if suite.app != nil {
		// 假设Application有Close方法
		// suite.app.Close()
	}
}

// setupTestData 设置测试数据
func (suite *WorkNoteFolderIntegrationTestSuite) setupTestData() {
	suite.testUserID = 1    // 使用默认用户ID
	suite.testProjectID = 1 // 使用默认项目ID
}

// cleanupTestData 清理测试数据
func (suite *WorkNoteFolderIntegrationTestSuite) cleanupTestData() {
	// 删除测试中创建的文件夹（从子到父的顺序）
	for i := len(suite.createdFolders) - 1; i >= 0; i-- {
		folderID := suite.createdFolders[i]

		// 软删除文件夹
		query := `UPDATE work_note_folders SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`
		_, err := suite.app.GetDB().Exec(query, folderID)
		if err != nil {
			suite.T().Logf("Warning: Failed to cleanup folder %d: %v", folderID, err)
		}
	}
}

// makeRequest 辅助方法：执行HTTP请求
func (suite *WorkNoteFolderIntegrationTestSuite) makeRequest(method, url string, body interface{}) (*httptest.ResponseRecorder, error) {
	var reqBody bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&reqBody).Encode(body); err != nil {
			return nil, err
		}
	}

	req, err := http.NewRequest(method, url, &reqBody)
	if err != nil {
		return nil, err
	}

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	return w, nil
}

// TestCreateWorkNoteFolder_Integration 测试创建工作笔记文件夹的完整流程
func (suite *WorkNoteFolderIntegrationTestSuite) TestCreateWorkNoteFolder_Integration() {
	// 准备请求数据
	req := models.CreateWorkNoteFolderRequest{
		Name:        "Integration Test Folder",
		Description: "This is a test folder created by integration test",
		ProjectID:   suite.testProjectID,
		Visibility:  "private",
		Color:       "#4285F4",
		Icon:        "folder",
	}

	// 执行创建请求
	w, err := suite.makeRequest("POST", "/api/v1/work-note-folders", req)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusCreated, w.Code)

	// 解析响应
	var response handlers.StandardResponse
	err = json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), response.Success)
	assert.Equal(suite.T(), "Work note folder created successfully", response.Message)

	// 验证返回的文件夹数据
	folderData, ok := response.Data.(map[string]interface{})
	assert.True(suite.T(), ok)

	folderID := int(folderData["id"].(float64))
	assert.Greater(suite.T(), folderID, 0)
	assert.Equal(suite.T(), req.Name, folderData["name"])
	assert.Equal(suite.T(), req.Description, folderData["description"])
	assert.Equal(suite.T(), req.Visibility, folderData["visibility"])

	// 记录创建的文件夹ID用于清理
	suite.createdFolders = append(suite.createdFolders, folderID)

	// 验证数据库中是否正确保存
	var dbFolder models.WorkNoteFolder
	query := `
		SELECT id, name, description, owner_id, project_id, visibility, color, icon
		FROM work_note_folders 
		WHERE id = $1 AND deleted_at IS NULL
	`
	err = suite.app.GetDB().QueryRow(query, folderID).Scan(
		&dbFolder.ID, &dbFolder.Name, &dbFolder.Description,
		&dbFolder.OwnerID, &dbFolder.ProjectID, &dbFolder.Visibility,
		&dbFolder.Color, &dbFolder.Icon,
	)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), req.Name, dbFolder.Name)
	assert.Equal(suite.T(), req.Description, dbFolder.Description)
	assert.Equal(suite.T(), suite.testUserID, dbFolder.OwnerID)
}

// TestCreateWorkNoteFolder_DuplicateName 测试创建重名文件夹
func (suite *WorkNoteFolderIntegrationTestSuite) TestCreateWorkNoteFolder_DuplicateName() {
	folderName := "Duplicate Name Test Folder"

	// 创建第一个文件夹
	req1 := models.CreateWorkNoteFolderRequest{
		Name:       folderName,
		ProjectID:  suite.testProjectID,
		Visibility: "private",
	}

	w1, err := suite.makeRequest("POST", "/api/v1/work-note-folders", req1)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusCreated, w1.Code)

	// 解析第一个响应获取文件夹ID
	var response1 handlers.StandardResponse
	err = json.Unmarshal(w1.Body.Bytes(), &response1)
	assert.NoError(suite.T(), err)

	folderData := response1.Data.(map[string]interface{})
	folderID := int(folderData["id"].(float64))
	suite.createdFolders = append(suite.createdFolders, folderID)

	// 尝试创建同名文件夹（同一级别）
	req2 := models.CreateWorkNoteFolderRequest{
		Name:       folderName,
		ProjectID:  suite.testProjectID,
		Visibility: "private",
	}

	w2, err := suite.makeRequest("POST", "/api/v1/work-note-folders", req2)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusConflict, w2.Code)

	// 验证错误响应
	var response2 handlers.StandardResponse
	err = json.Unmarshal(w2.Body.Bytes(), &response2)
	assert.NoError(suite.T(), err)
	assert.False(suite.T(), response2.Success)
	assert.Equal(suite.T(), handlers.ErrCodeFolderNameExists, response2.Error.Code)
}

// TestGetWorkNoteFolder_Integration 测试获取工作笔记文件夹
func (suite *WorkNoteFolderIntegrationTestSuite) TestGetWorkNoteFolder_Integration() {
	// 先创建一个文件夹
	createReq := models.CreateWorkNoteFolderRequest{
		Name:        "Get Test Folder",
		Description: "Test folder for get operation",
		ProjectID:   suite.testProjectID,
		Visibility:  "private",
		Color:       "#FF5722",
		Icon:        "description",
	}

	createW, err := suite.makeRequest("POST", "/api/v1/work-note-folders", createReq)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusCreated, createW.Code)

	// 获取创建的文件夹ID
	var createResponse handlers.StandardResponse
	err = json.Unmarshal(createW.Body.Bytes(), &createResponse)
	assert.NoError(suite.T(), err)

	folderData := createResponse.Data.(map[string]interface{})
	folderID := int(folderData["id"].(float64))
	suite.createdFolders = append(suite.createdFolders, folderID)

	// 测试获取文件夹
	getW, err := suite.makeRequest("GET", fmt.Sprintf("/api/v1/work-note-folders/%d", folderID), nil)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusOK, getW.Code)

	// 验证响应
	var getResponse handlers.StandardResponse
	err = json.Unmarshal(getW.Body.Bytes(), &getResponse)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), getResponse.Success)
	assert.Equal(suite.T(), "Work note folder retrieved successfully", getResponse.Message)

	// 验证文件夹数据
	getFolderData := getResponse.Data.(map[string]interface{})
	assert.Equal(suite.T(), float64(folderID), getFolderData["id"])
	assert.Equal(suite.T(), createReq.Name, getFolderData["name"])
	assert.Equal(suite.T(), createReq.Description, getFolderData["description"])
	assert.Equal(suite.T(), createReq.Visibility, getFolderData["visibility"])
}

// TestUpdateWorkNoteFolder_Integration 测试更新工作笔记文件夹
func (suite *WorkNoteFolderIntegrationTestSuite) TestUpdateWorkNoteFolder_Integration() {
	// 创建一个文件夹用于更新
	createReq := models.CreateWorkNoteFolderRequest{
		Name:        "Update Test Folder",
		Description: "Original description",
		ProjectID:   suite.testProjectID,
		Visibility:  "private",
	}

	createW, err := suite.makeRequest("POST", "/api/v1/work-note-folders", createReq)
	assert.NoError(suite.T(), err)

	var createResponse handlers.StandardResponse
	err = json.Unmarshal(createW.Body.Bytes(), &createResponse)
	assert.NoError(suite.T(), err)

	folderData := createResponse.Data.(map[string]interface{})
	folderID := int(folderData["id"].(float64))
	suite.createdFolders = append(suite.createdFolders, folderID)

	// 更新文件夹
	newName := "Updated Folder Name"
	newDescription := "Updated description"
	newVisibility := "team"

	updateReq := models.UpdateWorkNoteFolderRequest{
		Name:        &newName,
		Description: &newDescription,
		Visibility:  &newVisibility,
	}

	updateW, err := suite.makeRequest("PUT", fmt.Sprintf("/api/v1/work-note-folders/%d", folderID), updateReq)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusOK, updateW.Code)

	// 验证更新响应
	var updateResponse handlers.StandardResponse
	err = json.Unmarshal(updateW.Body.Bytes(), &updateResponse)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), updateResponse.Success)

	// 验证数据库中的更新
	var updatedFolder models.WorkNoteFolder
	query := `
		SELECT name, description, visibility 
		FROM work_note_folders 
		WHERE id = $1 AND deleted_at IS NULL
	`
	err = suite.app.GetDB().QueryRow(query, folderID).Scan(
		&updatedFolder.Name, &updatedFolder.Description, &updatedFolder.Visibility,
	)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), newName, updatedFolder.Name)
	assert.Equal(suite.T(), newDescription, updatedFolder.Description)
	assert.Equal(suite.T(), newVisibility, updatedFolder.Visibility)
}

// TestListWorkNoteFolders_Integration 测试列出工作笔记文件夹
func (suite *WorkNoteFolderIntegrationTestSuite) TestListWorkNoteFolders_Integration() {
	// 创建多个测试文件夹
	folderNames := []string{"List Test Folder 1", "List Test Folder 2", "List Test Folder 3"}

	for _, name := range folderNames {
		createReq := models.CreateWorkNoteFolderRequest{
			Name:       name,
			ProjectID:  suite.testProjectID,
			Visibility: "private",
		}

		createW, err := suite.makeRequest("POST", "/api/v1/work-note-folders", createReq)
		assert.NoError(suite.T(), err)

		var createResponse handlers.StandardResponse
		err = json.Unmarshal(createW.Body.Bytes(), &createResponse)
		assert.NoError(suite.T(), err)

		folderData := createResponse.Data.(map[string]interface{})
		folderID := int(folderData["id"].(float64))
		suite.createdFolders = append(suite.createdFolders, folderID)
	}

	// 测试列出文件夹
	listW, err := suite.makeRequest("GET", "/api/v1/work-note-folders", nil)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusOK, listW.Code)

	// 验证响应
	var listResponse handlers.StandardResponse
	err = json.Unmarshal(listW.Body.Bytes(), &listResponse)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), listResponse.Success)

	// 验证分页响应结构
	paginatedData := listResponse.Data.(map[string]interface{})
	assert.Contains(suite.T(), paginatedData, "items")
	assert.Contains(suite.T(), paginatedData, "pagination")

	items := paginatedData["items"].([]interface{})
	assert.GreaterOrEqual(suite.T(), len(items), len(folderNames))

	pagination := paginatedData["pagination"].(map[string]interface{})
	assert.Equal(suite.T(), float64(1), pagination["page"])
	assert.Greater(suite.T(), pagination["total"], float64(0))
}

// TestDeleteWorkNoteFolder_Integration 测试删除工作笔记文件夹
func (suite *WorkNoteFolderIntegrationTestSuite) TestDeleteWorkNoteFolder_Integration() {
	// 创建一个文件夹用于删除
	createReq := models.CreateWorkNoteFolderRequest{
		Name:       "Delete Test Folder",
		ProjectID:  suite.testProjectID,
		Visibility: "private",
	}

	createW, err := suite.makeRequest("POST", "/api/v1/work-note-folders", createReq)
	assert.NoError(suite.T(), err)

	var createResponse handlers.StandardResponse
	err = json.Unmarshal(createW.Body.Bytes(), &createResponse)
	assert.NoError(suite.T(), err)

	folderData := createResponse.Data.(map[string]interface{})
	folderID := int(folderData["id"].(float64))

	// 删除文件夹
	deleteW, err := suite.makeRequest("DELETE", fmt.Sprintf("/api/v1/work-note-folders/%d", folderID), nil)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusOK, deleteW.Code)

	// 验证删除响应
	var deleteResponse map[string]interface{}
	err = json.Unmarshal(deleteW.Body.Bytes(), &deleteResponse)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), deleteResponse["success"].(bool))
	assert.Contains(suite.T(), deleteResponse["message"].(string), "deleted successfully")

	// 验证文件夹已被软删除
	var deletedAt *time.Time
	query := `SELECT deleted_at FROM work_note_folders WHERE id = $1`
	err = suite.app.GetDB().QueryRow(query, folderID).Scan(&deletedAt)
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), deletedAt)

	// 验证删除后无法获取
	getW, err := suite.makeRequest("GET", fmt.Sprintf("/api/v1/work-note-folders/%d", folderID), nil)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusNotFound, getW.Code)
}

// TestSearchWorkNoteFolders_Integration 测试搜索工作笔记文件夹
func (suite *WorkNoteFolderIntegrationTestSuite) TestSearchWorkNoteFolders_Integration() {
	// 创建带有特定名称的文件夹
	searchableNames := []string{
		"Searchable Folder Alpha",
		"Searchable Folder Beta",
		"Different Name Gamma",
	}

	for _, name := range searchableNames {
		createReq := models.CreateWorkNoteFolderRequest{
			Name:       name,
			ProjectID:  suite.testProjectID,
			Visibility: "private",
		}

		createW, err := suite.makeRequest("POST", "/api/v1/work-note-folders", createReq)
		assert.NoError(suite.T(), err)

		var createResponse handlers.StandardResponse
		err = json.Unmarshal(createW.Body.Bytes(), &createResponse)
		assert.NoError(suite.T(), err)

		folderData := createResponse.Data.(map[string]interface{})
		folderID := int(folderData["id"].(float64))
		suite.createdFolders = append(suite.createdFolders, folderID)
	}

	// 搜索包含"Searchable"的文件夹
	searchW, err := suite.makeRequest("GET", "/api/v1/work-note-folders/search?q=Searchable", nil)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusOK, searchW.Code)

	// 验证搜索响应
	var searchResponse handlers.StandardResponse
	err = json.Unmarshal(searchW.Body.Bytes(), &searchResponse)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), searchResponse.Success)
	assert.Contains(suite.T(), searchResponse.Message, "Found")

	// 验证搜索结果
	searchData := searchResponse.Data.(map[string]interface{})
	folders := searchData["folders"].([]interface{})

	// 应该找到2个包含"Searchable"的文件夹
	foundSearchable := 0
	for _, item := range folders {
		folder := item.(map[string]interface{})
		name := folder["name"].(string)
		if name == "Searchable Folder Alpha" || name == "Searchable Folder Beta" {
			foundSearchable++
		}
	}
	assert.Equal(suite.T(), 2, foundSearchable)
}

// TestHierarchicalOperations_Integration 测试层级结构操作
func (suite *WorkNoteFolderIntegrationTestSuite) TestHierarchicalOperations_Integration() {
	// 创建父文件夹
	parentReq := models.CreateWorkNoteFolderRequest{
		Name:       "Parent Folder",
		ProjectID:  suite.testProjectID,
		Visibility: "private",
	}

	parentW, err := suite.makeRequest("POST", "/api/v1/work-note-folders", parentReq)
	assert.NoError(suite.T(), err)

	var parentResponse handlers.StandardResponse
	err = json.Unmarshal(parentW.Body.Bytes(), &parentResponse)
	assert.NoError(suite.T(), err)

	parentData := parentResponse.Data.(map[string]interface{})
	parentID := int(parentData["id"].(float64))
	suite.createdFolders = append(suite.createdFolders, parentID)

	// 创建子文件夹
	childReq := models.CreateWorkNoteFolderRequest{
		Name:       "Child Folder",
		ParentID:   &parentID,
		ProjectID:  suite.testProjectID,
		Visibility: "private",
	}

	childW, err := suite.makeRequest("POST", "/api/v1/work-note-folders", childReq)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusCreated, childW.Code)

	var childResponse handlers.StandardResponse
	err = json.Unmarshal(childW.Body.Bytes(), &childResponse)
	assert.NoError(suite.T(), err)

	childData := childResponse.Data.(map[string]interface{})
	childID := int(childData["id"].(float64))
	suite.createdFolders = append(suite.createdFolders, childID)

	// 验证层级关系
	assert.Equal(suite.T(), float64(parentID), childData["parent_id"])

	// 测试获取文件夹树
	treeW, err := suite.makeRequest("GET", "/api/v1/work-note-folders/tree", nil)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusOK, treeW.Code)

	var treeResponse map[string]interface{}
	err = json.Unmarshal(treeW.Body.Bytes(), &treeResponse)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), treeResponse["success"].(bool))
}

// TestErrorHandling_Integration 测试错误处理
func (suite *WorkNoteFolderIntegrationTestSuite) TestErrorHandling_Integration() {
	// 测试获取不存在的文件夹
	getW, err := suite.makeRequest("GET", "/api/v1/work-note-folders/99999", nil)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusNotFound, getW.Code)

	var response handlers.StandardResponse
	err = json.Unmarshal(getW.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.False(suite.T(), response.Success)
	assert.Equal(suite.T(), handlers.ErrCodeFolderNotFound, response.Error.Code)

	// 测试无效的文件夹ID
	getW2, err := suite.makeRequest("GET", "/api/v1/work-note-folders/invalid", nil)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusBadRequest, getW2.Code)

	var response2 handlers.StandardResponse
	err = json.Unmarshal(getW2.Body.Bytes(), &response2)
	assert.NoError(suite.T(), err)
	assert.False(suite.T(), response2.Success)
	assert.Equal(suite.T(), handlers.ErrCodeInvalidRequest, response2.Error.Code)

	// 测试无效的JSON数据
	invalidJSON := bytes.NewBufferString(`{"name": invalid json}`)
	req, _ := http.NewRequest("POST", "/api/v1/work-note-folders", invalidJSON)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)

	var response3 handlers.StandardResponse
	err = json.Unmarshal(w.Body.Bytes(), &response3)
	assert.NoError(suite.T(), err)
	assert.False(suite.T(), response3.Success)
	assert.Equal(suite.T(), handlers.ErrCodeInvalidRequest, response3.Error.Code)
}

// TestPerformance_Integration 测试性能相关功能
func (suite *WorkNoteFolderIntegrationTestSuite) TestPerformance_Integration() {
	// 创建多个文件夹测试分页
	folderCount := 55 // 超过默认分页大小50

	for i := 0; i < folderCount; i++ {
		createReq := models.CreateWorkNoteFolderRequest{
			Name:       fmt.Sprintf("Performance Test Folder %d", i+1),
			ProjectID:  suite.testProjectID,
			Visibility: "private",
		}

		createW, err := suite.makeRequest("POST", "/api/v1/work-note-folders", createReq)
		if !assert.NoError(suite.T(), err) {
			continue
		}

		var createResponse handlers.StandardResponse
		err = json.Unmarshal(createW.Body.Bytes(), &createResponse)
		if !assert.NoError(suite.T(), err) {
			continue
		}

		folderData := createResponse.Data.(map[string]interface{})
		folderID := int(folderData["id"].(float64))
		suite.createdFolders = append(suite.createdFolders, folderID)
	}

	// 测试第一页
	listW1, err := suite.makeRequest("GET", "/api/v1/work-note-folders?page=1&page_size=20", nil)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusOK, listW1.Code)

	var response1 handlers.StandardResponse
	err = json.Unmarshal(listW1.Body.Bytes(), &response1)
	assert.NoError(suite.T(), err)

	paginatedData1 := response1.Data.(map[string]interface{})
	items1 := paginatedData1["items"].([]interface{})
	pagination1 := paginatedData1["pagination"].(map[string]interface{})

	assert.LessOrEqual(suite.T(), len(items1), 20) // 页面大小限制
	assert.Equal(suite.T(), float64(1), pagination1["page"])
	assert.GreaterOrEqual(suite.T(), pagination1["total"], float64(folderCount))

	// 测试第二页
	listW2, err := suite.makeRequest("GET", "/api/v1/work-note-folders?page=2&page_size=20", nil)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusOK, listW2.Code)

	var response2 handlers.StandardResponse
	err = json.Unmarshal(listW2.Body.Bytes(), &response2)
	assert.NoError(suite.T(), err)

	paginatedData2 := response2.Data.(map[string]interface{})
	pagination2 := paginatedData2["pagination"].(map[string]interface{})

	assert.Equal(suite.T(), float64(2), pagination2["page"])
}

// 运行集成测试套件
func TestWorkNoteFolderIntegrationSuite(t *testing.T) {
	// 跳过集成测试，除非明确设置了环境变量
	if testing.Short() {
		t.Skip("Skipping integration tests in short mode")
	}

	suite.Run(t, new(WorkNoteFolderIntegrationTestSuite))
}
