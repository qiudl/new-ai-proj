package tests

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"testing"

	"github.com/stretchr/testify/suite"
	"gopkg.in/yaml.v2"
)

// OpenAPIValidationSuite OpenAPI规范验证测试套件
type OpenAPIValidationSuite struct {
	ContractTestSuite
	openAPISpec map[string]interface{}
}

// SetupSuite 设置测试套件
func (suite *OpenAPIValidationSuite) SetupSuite() {
	suite.ContractTestSuite.SetupSuite()

	// 加载OpenAPI规范
	err := suite.loadOpenAPISpec()
	if err != nil {
		suite.T().Fatalf("Failed to load OpenAPI spec: %v", err)
	}
}

// TestOpenAPIValidation 运行OpenAPI验证测试
func TestOpenAPIValidation(t *testing.T) {
	suite.Run(t, new(OpenAPIValidationSuite))
}

// loadOpenAPISpec 加载OpenAPI规范文件
func (suite *OpenAPIValidationSuite) loadOpenAPISpec() error {
	specPath := "/Users/johnqiu/coding/www/projects/new-ai-proj/docs/api/openapi.yaml"

	data, err := ioutil.ReadFile(specPath)
	if err != nil {
		return fmt.Errorf("failed to read OpenAPI spec file: %v", err)
	}

	err = yaml.Unmarshal(data, &suite.openAPISpec)
	if err != nil {
		return fmt.Errorf("failed to parse OpenAPI spec: %v", err)
	}

	return nil
}

// TestHealthEndpointMatchesSpec 测试健康检查端点是否匹配规范
func (suite *OpenAPIValidationSuite) TestHealthEndpointMatchesSpec() {
	w, err := suite.makeRequest("GET", "/health", nil, nil)
	suite.Require().NoError(err)

	// 验证状态码
	suite.Equal(http.StatusOK, w.Code, "Health endpoint should return 200")

	// 解析响应
	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	// 验证响应结构符合OpenAPI规范
	suite.validateHealthResponse(response)
}

// TestVersionEndpointMatchesSpec 测试版本端点是否匹配规范
func (suite *OpenAPIValidationSuite) TestVersionEndpointMatchesSpec() {
	w, err := suite.makeRequest("GET", "/version", nil, nil)
	suite.Require().NoError(err)

	suite.Equal(http.StatusOK, w.Code, "Version endpoint should return 200")

	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	suite.Require().NoError(err)

	suite.validateVersionResponse(response)
}

// TestLoginEndpointMatchesSpec 测试登录端点是否匹配规范
func (suite *OpenAPIValidationSuite) TestLoginEndpointMatchesSpec() {
	// 测试成功登录响应
	suite.Run("SuccessfulLogin", func() {
		loginReq := map[string]interface{}{
			"username": "admin",
			"password": "password123",
		}

		w, err := suite.makeRequest("POST", "/api/v1/auth/login", loginReq, nil)
		suite.Require().NoError(err)

		if w.Code == http.StatusOK {
			var response map[string]interface{}
			err = json.Unmarshal(w.Body.Bytes(), &response)
			suite.Require().NoError(err)

			suite.validateLoginSuccessResponse(response)
		}
	})

	// 测试错误响应
	suite.Run("FailedLogin", func() {
		loginReq := map[string]interface{}{
			"username": "invalid",
			"password": "invalid",
		}

		w, err := suite.makeRequest("POST", "/api/v1/auth/login", loginReq, nil)
		suite.Require().NoError(err)

		suite.Equal(http.StatusUnauthorized, w.Code)

		var response map[string]interface{}
		err = json.Unmarshal(w.Body.Bytes(), &response)
		suite.Require().NoError(err)

		suite.validateErrorResponse(response)
	})
}

// TestProjectEndpointsMatchSpec 测试项目端点是否匹配规范
func (suite *OpenAPIValidationSuite) TestProjectEndpointsMatchSpec() {
	token := suite.getAuthToken()

	// 测试获取项目列表
	suite.Run("GetProjects", func() {
		headers := map[string]string{
			"Authorization": "Bearer " + token,
		}

		w, err := suite.makeRequest("GET", "/api/v1/projects", nil, headers)
		suite.Require().NoError(err)

		if w.Code == http.StatusOK {
			var response map[string]interface{}
			err = json.Unmarshal(w.Body.Bytes(), &response)
			suite.Require().NoError(err)

			suite.validateProjectListResponse(response)
		}
	})

	// 测试创建项目
	suite.Run("CreateProject", func() {
		projectReq := map[string]interface{}{
			"name":        "OpenAPI Test Project",
			"description": "Project created for OpenAPI validation",
			"visibility":  "private",
		}

		headers := map[string]string{
			"Authorization": "Bearer " + token,
		}

		w, err := suite.makeRequest("POST", "/api/v1/projects", projectReq, headers)
		suite.Require().NoError(err)

		if w.Code == http.StatusCreated {
			var response map[string]interface{}
			err = json.Unmarshal(w.Body.Bytes(), &response)
			suite.Require().NoError(err)

			suite.validateProjectCreateResponse(response)
		}
	})
}

// validateHealthResponse 验证健康检查响应结构
func (suite *OpenAPIValidationSuite) validateHealthResponse(response map[string]interface{}) {
	// 根据OpenAPI规范验证字段
	suite.Contains(response, "status", "Health response should contain status field")
	suite.Contains(response, "timestamp", "Health response should contain timestamp field")

	// 验证字段类型
	status, ok := response["status"].(string)
	suite.True(ok, "Status should be a string")
	suite.Equal("ok", status, "Status should be 'ok'")

	// 验证时间戳格式
	timestamp, ok := response["timestamp"].(string)
	suite.True(ok, "Timestamp should be a string")
	suite.NotEmpty(timestamp, "Timestamp should not be empty")
}

// validateVersionResponse 验证版本响应结构
func (suite *OpenAPIValidationSuite) validateVersionResponse(response map[string]interface{}) {
	suite.Contains(response, "version", "Version response should contain version field")

	version, ok := response["version"].(string)
	suite.True(ok, "Version should be a string")
	suite.NotEmpty(version, "Version should not be empty")
}

// validateLoginSuccessResponse 验证登录成功响应
func (suite *OpenAPIValidationSuite) validateLoginSuccessResponse(response map[string]interface{}) {
	// 验证APIResponse结构
	suite.Contains(response, "success")
	suite.Contains(response, "data")
	suite.Contains(response, "timestamp")

	success, ok := response["success"].(bool)
	suite.True(ok, "Success should be boolean")
	suite.True(success, "Success should be true")

	// 验证登录数据
	data, ok := response["data"].(map[string]interface{})
	suite.True(ok, "Data should be an object")

	// 验证登录响应字段
	suite.Contains(data, "access_token")
	suite.Contains(data, "token_type")
	suite.Contains(data, "user")

	// 验证token
	accessToken, ok := data["access_token"].(string)
	suite.True(ok, "Access token should be string")
	suite.NotEmpty(accessToken, "Access token should not be empty")

	tokenType, ok := data["token_type"].(string)
	suite.True(ok, "Token type should be string")
	suite.Equal("Bearer", tokenType, "Token type should be Bearer")

	// 验证用户对象
	user, ok := data["user"].(map[string]interface{})
	suite.True(ok, "User should be an object")
	suite.Contains(user, "id")
	suite.Contains(user, "username")
	suite.Contains(user, "email")
}

// validateErrorResponse 验证错误响应
func (suite *OpenAPIValidationSuite) validateErrorResponse(response map[string]interface{}) {
	// 验证错误响应结构
	suite.Contains(response, "success")
	suite.Contains(response, "error")
	suite.Contains(response, "timestamp")

	success, ok := response["success"].(bool)
	suite.True(ok, "Success should be boolean")
	suite.False(success, "Success should be false for error response")

	// 验证错误对象
	errorObj, ok := response["error"].(map[string]interface{})
	suite.True(ok, "Error should be an object")

	suite.Contains(errorObj, "code")
	suite.Contains(errorObj, "message")

	code, ok := errorObj["code"].(string)
	suite.True(ok, "Error code should be string")
	suite.NotEmpty(code, "Error code should not be empty")

	message, ok := errorObj["message"].(string)
	suite.True(ok, "Error message should be string")
	suite.NotEmpty(message, "Error message should not be empty")
}

// validateProjectListResponse 验证项目列表响应
func (suite *OpenAPIValidationSuite) validateProjectListResponse(response map[string]interface{}) {
	// 验证APIResponse结构
	suite.Contains(response, "success")
	suite.Contains(response, "data")

	success, ok := response["success"].(bool)
	suite.True(ok && success, "Success should be true")

	// 数据可以是数组或包含分页信息的对象
	data := response["data"]
	suite.NotNil(data, "Data should not be nil")

	// 如果数据是对象，可能包含分页信息
	if dataObj, ok := data.(map[string]interface{}); ok {
		// 检查是否有分页信息
		if pagination, exists := dataObj["pagination"]; exists {
			suite.validatePaginationResponse(pagination)
		}
	}
}

// validateProjectCreateResponse 验证项目创建响应
func (suite *OpenAPIValidationSuite) validateProjectCreateResponse(response map[string]interface{}) {
	// 验证APIResponse结构
	suite.Contains(response, "success")
	suite.Contains(response, "data")

	success, ok := response["success"].(bool)
	suite.True(ok && success, "Success should be true")

	// 验证项目数据
	data, ok := response["data"].(map[string]interface{})
	suite.True(ok, "Data should be a project object")

	// 验证项目字段
	suite.Contains(data, "id")
	suite.Contains(data, "name")
	suite.Contains(data, "created_at")

	// 验证字段类型
	id, ok := data["id"].(float64)
	suite.True(ok && id > 0, "ID should be a positive number")

	name, ok := data["name"].(string)
	suite.True(ok, "Name should be string")
	suite.NotEmpty(name, "Name should not be empty")
}

// validatePaginationResponse 验证分页响应
func (suite *OpenAPIValidationSuite) validatePaginationResponse(pagination interface{}) {
	paginationObj, ok := pagination.(map[string]interface{})
	suite.True(ok, "Pagination should be an object")

	// 验证分页字段
	requiredFields := []string{"page", "page_size", "total", "total_pages", "has_next", "has_prev"}
	for _, field := range requiredFields {
		suite.Contains(paginationObj, field, fmt.Sprintf("Pagination should contain %s field", field))
	}

	// 验证数值字段
	page, ok := paginationObj["page"].(float64)
	suite.True(ok && page >= 1, "Page should be a number >= 1")

	pageSize, ok := paginationObj["page_size"].(float64)
	suite.True(ok && pageSize >= 1, "Page size should be a number >= 1")

	total, ok := paginationObj["total"].(float64)
	suite.True(ok && total >= 0, "Total should be a number >= 0")

	// 验证布尔字段
	hasNext, ok := paginationObj["has_next"].(bool)
	suite.True(ok, "Has next should be boolean")

	hasPrev, ok := paginationObj["has_prev"].(bool)
	suite.True(ok, "Has prev should be boolean")

	// 逻辑验证
	if page == 1 {
		suite.False(hasPrev, "First page should not have previous")
	}
}

// TestSchemaValidation 测试模式验证
func (suite *OpenAPIValidationSuite) TestSchemaValidation() {
	suite.Run("ValidateOpenAPIStructure", func() {
		// 验证OpenAPI规范本身的结构
		suite.Contains(suite.openAPISpec, "openapi")
		suite.Contains(suite.openAPISpec, "info")
		suite.Contains(suite.openAPISpec, "paths")
		suite.Contains(suite.openAPISpec, "components")

		// 验证info部分
		info, ok := suite.openAPISpec["info"].(map[interface{}]interface{})
		suite.True(ok, "Info should be an object")
		suite.Contains(info, "title")
		suite.Contains(info, "version")
		suite.Contains(info, "description")

		// 验证paths部分
		paths, ok := suite.openAPISpec["paths"].(map[interface{}]interface{})
		suite.True(ok, "Paths should be an object")
		suite.NotEmpty(paths, "Should have at least one path defined")

		// 验证components部分
		components, ok := suite.openAPISpec["components"].(map[interface{}]interface{})
		suite.True(ok, "Components should be an object")
		suite.Contains(components, "schemas")
		suite.Contains(components, "securitySchemes")
	})
}
