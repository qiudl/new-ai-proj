package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"ai-project-backend/application"
	"ai-project-backend/models"
	"ai-project-backend/routes"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
)

// ContractTestSuite 契约测试套件
type ContractTestSuite struct {
	suite.Suite
	app    *application.Application
	router *gin.Engine
	client *http.Client
}

// SetupSuite 设置测试套件
func (suite *ContractTestSuite) SetupSuite() {
	// 设置 Gin 为测试模式
	gin.SetMode(gin.TestMode)

	// 创建应用实例
	app, err := application.NewApplication()
	if err != nil {
		suite.T().Fatalf("Failed to create application: %v", err)
	}

	suite.app = app
	suite.router = routes.SetupRouter(app)
	suite.client = &http.Client{
		Timeout: 30 * time.Second,
	}
}

// TearDownSuite 清理测试套件
func (suite *ContractTestSuite) TearDownSuite() {
	if suite.app != nil {
		suite.app.Close()
	}
}

// TestContractTestSuite 运行契约测试套件
func TestContractTestSuite(t *testing.T) {
	suite.Run(t, new(ContractTestSuite))
}

// makeRequest 发送HTTP请求的辅助方法
func (suite *ContractTestSuite) makeRequest(method, path string, body interface{}, headers map[string]string) (*httptest.ResponseRecorder, error) {
	var reqBody io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reqBody = bytes.NewBuffer(jsonBody)
	}

	req, err := http.NewRequest(method, path, reqBody)
	if err != nil {
		return nil, err
	}

	// 设置默认Content-Type
	if method == "POST" || method == "PUT" || method == "PATCH" {
		req.Header.Set("Content-Type", "application/json")
	}

	// 设置自定义headers
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	return w, nil
}

// 测试健康检查端点契约
func (suite *ContractTestSuite) TestHealthEndpointContract() {
	w, err := suite.makeRequest("GET", "/health", nil, nil)
	suite.Require().NoError(err)

	// 验证状态码
	suite.Equal(http.StatusOK, w.Code)

	// 验证响应结构
	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	// 验证必需字段
	suite.Contains(response, "status")
	suite.Contains(response, "timestamp")
	suite.Equal("ok", response["status"])

	// 验证时间戳格式
	timestampStr, ok := response["timestamp"].(string)
	suite.True(ok, "timestamp should be a string")

	_, err = time.Parse(time.RFC3339, timestampStr)
	suite.NoError(err, "timestamp should be in RFC3339 format")
}

// 测试版本端点契约
func (suite *ContractTestSuite) TestVersionEndpointContract() {
	w, err := suite.makeRequest("GET", "/version", nil, nil)
	suite.Require().NoError(err)

	// 验证状态码
	suite.Equal(http.StatusOK, w.Code)

	// 验证响应结构
	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	// 验证必需字段
	suite.Contains(response, "version")
}

// 测试登录端点契约
func (suite *ContractTestSuite) TestLoginEndpointContract() {
	// 测试成功登录契约
	suite.Run("ValidLogin", func() {
		loginReq := models.LoginRequest{
			Username: "admin",
			Password: "password123",
		}

		w, err := suite.makeRequest("POST", "/api/v1/auth/login", loginReq, nil)
		suite.Require().NoError(err)

		if w.Code == http.StatusOK {
			// 验证响应结构
			var response models.APIResponse
			err = json.Unmarshal(w.Body.Bytes(), &response)
			suite.Require().NoError(err)

			// 验证响应格式
			suite.True(response.Success)
			suite.NotNil(response.Data)
			suite.NotZero(response.Timestamp)

			// 验证登录响应数据结构
			loginData, ok := response.Data.(map[string]interface{})
			suite.True(ok, "login data should be an object")

			// 验证必需的登录响应字段
			suite.Contains(loginData, "access_token")
			suite.Contains(loginData, "token_type")
			suite.Contains(loginData, "user")

			// 验证token类型
			suite.Equal("Bearer", loginData["token_type"])

			// 验证用户信息结构
			user, ok := loginData["user"].(map[string]interface{})
			suite.True(ok, "user should be an object")
			suite.Contains(user, "id")
			suite.Contains(user, "username")
			suite.Contains(user, "email")
		}
	})

	// 测试无效登录契约
	suite.Run("InvalidLogin", func() {
		loginReq := models.LoginRequest{
			Username: "invalid",
			Password: "invalid",
		}

		w, err := suite.makeRequest("POST", "/api/v1/auth/login", loginReq, nil)
		suite.Require().NoError(err)

		// 验证错误响应
		suite.Equal(http.StatusUnauthorized, w.Code)

		var response models.APIResponse
		err = json.Unmarshal(w.Body.Bytes(), &response)
		suite.Require().NoError(err)

		// 验证错误响应结构
		suite.False(response.Success)
		suite.NotNil(response.Error)
		suite.NotZero(response.Timestamp)

		// 验证错误字段
		suite.NotEmpty(response.Error.Code)
		suite.NotEmpty(response.Error.Message)
	})

	// 测试缺少字段的登录请求
	suite.Run("MissingFields", func() {
		// 发送空请求体
		w, err := suite.makeRequest("POST", "/api/v1/auth/login", map[string]interface{}{}, nil)
		suite.Require().NoError(err)

		// 验证错误响应
		suite.Equal(http.StatusBadRequest, w.Code)

		var response models.APIResponse
		err = json.Unmarshal(w.Body.Bytes(), &response)
		suite.Require().NoError(err)

		suite.False(response.Success)
		suite.NotNil(response.Error)
		suite.Equal(models.ErrCodeValidation, response.Error.Code)
	})
}

// 测试项目端点契约
func (suite *ContractTestSuite) TestProjectsEndpointContract() {
	// 首先获取认证token
	token := suite.getAuthToken()

	// 测试获取项目列表
	suite.Run("GetProjects", func() {
		headers := map[string]string{
			"Authorization": "Bearer " + token,
		}

		w, err := suite.makeRequest("GET", "/api/v1/projects", nil, headers)
		suite.Require().NoError(err)

		if w.Code == http.StatusOK {
			var response models.APIResponse
			err = json.Unmarshal(w.Body.Bytes(), &response)
			suite.Require().NoError(err)

			suite.True(response.Success)
			suite.NotNil(response.Data)

			// 验证分页结构
			data, ok := response.Data.(map[string]interface{})
			suite.True(ok)

			if pagination, exists := data["pagination"]; exists {
				paginationObj, ok := pagination.(map[string]interface{})
				suite.True(ok)
				suite.Contains(paginationObj, "page")
				suite.Contains(paginationObj, "page_size")
				suite.Contains(paginationObj, "total")
			}
		}
	})

	// 测试创建项目
	suite.Run("CreateProject", func() {
		projectReq := map[string]interface{}{
			"name":        "Test Project",
			"description": "Test project description",
			"visibility":  "private",
		}

		headers := map[string]string{
			"Authorization": "Bearer " + token,
		}

		w, err := suite.makeRequest("POST", "/api/v1/projects", projectReq, headers)
		suite.Require().NoError(err)

		if w.Code == http.StatusCreated {
			var response models.APIResponse
			err = json.Unmarshal(w.Body.Bytes(), &response)
			suite.Require().NoError(err)

			suite.True(response.Success)
			suite.NotNil(response.Data)

			// 验证项目数据结构
			project, ok := response.Data.(map[string]interface{})
			suite.True(ok)
			suite.Contains(project, "id")
			suite.Contains(project, "name")
			suite.Contains(project, "created_at")
			suite.Equal("Test Project", project["name"])
		}
	})

	// 测试无效的项目创建请求
	suite.Run("CreateProjectInvalidData", func() {
		projectReq := map[string]interface{}{
			// 缺少必需的name字段
			"description": "Test project without name",
		}

		headers := map[string]string{
			"Authorization": "Bearer " + token,
		}

		w, err := suite.makeRequest("POST", "/api/v1/projects", projectReq, headers)
		suite.Require().NoError(err)

		suite.Equal(http.StatusBadRequest, w.Code)

		var response models.APIResponse
		err = json.Unmarshal(w.Body.Bytes(), &response)
		suite.Require().NoError(err)

		suite.False(response.Success)
		suite.NotNil(response.Error)
	})
}

// 辅助方法：获取认证token
func (suite *ContractTestSuite) getAuthToken() string {
	// 尝试使用开发环境快速登录
	loginReq := models.LoginRequest{
		Username: "admin",
		Password: "password123",
	}

	w, err := suite.makeRequest("POST", "/api/v1/auth/login", loginReq, nil)
	if err != nil {
		suite.T().Fatalf("Failed to login: %v", err)
	}

	if w.Code != http.StatusOK {
		suite.T().Fatalf("Login failed with status: %d, body: %s", w.Code, w.Body.String())
	}

	var response models.APIResponse
	err = json.Unmarshal(w.Body.Bytes(), &response)
	if err != nil {
		suite.T().Fatalf("Failed to parse login response: %v", err)
	}

	loginData, ok := response.Data.(map[string]interface{})
	if !ok {
		suite.T().Fatalf("Invalid login response data structure")
	}

	token, ok := loginData["access_token"].(string)
	if !ok {
		suite.T().Fatalf("No access token in login response")
	}

	return token
}

// 辅助方法：创建测试项目
func (suite *ContractTestSuite) createTestProject(token string) int {
	projectReq := map[string]interface{}{
		"name":        "Contract Test Project",
		"description": "Project created for contract testing",
		"visibility":  "private",
	}

	headers := map[string]string{
		"Authorization": "Bearer " + token,
	}

	w, err := suite.makeRequest("POST", "/api/v1/projects", projectReq, headers)
	if err != nil {
		suite.T().Fatalf("Failed to create test project: %v", err)
	}

	if w.Code != http.StatusCreated {
		suite.T().Fatalf("Project creation failed with status: %d, body: %s", w.Code, w.Body.String())
	}

	var response models.APIResponse
	err = json.Unmarshal(w.Body.Bytes(), &response)
	if err != nil {
		suite.T().Fatalf("Failed to parse project creation response: %v", err)
	}

	project, ok := response.Data.(map[string]interface{})
	if !ok {
		suite.T().Fatalf("Invalid project response data structure")
	}

	projectID, ok := project["id"].(float64)
	if !ok {
		suite.T().Fatalf("No project ID in creation response")
	}

	return int(projectID)
}
