package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"ai-project-backend/models"
)

func setupTemplateTestRouter(handler *MCPTemplateHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/generate-document-from-template", handler.GenerateDocumentFromTemplate)
	return router
}

func TestGenerateDocumentFromTemplate_Success(t *testing.T) {
	// 使用nil数据库进行简单测试（不触发autoCreate）
	handler := NewMCPTemplateHandler(nil)
	router := setupTemplateTestRouter(handler)

	title := "测试Bug报告"
	requirements := "测试需求"

	request := models.GenerateDocumentRequest{
		TemplateType: "bug_report",
		Context: models.TemplateContext{
			Title:        &title,
			Requirements: &requirements,
		},
		AutoCreate: false,
	}

	jsonData, _ := json.Marshal(request)
	req, _ := http.NewRequest("POST", "/generate-document-from-template", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status code 200, got %d", w.Code)
	}

	var response models.APIResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if !response.Success {
		t.Error("Expected success to be true")
	}

	if response.Message != "文档生成成功" {
		t.Errorf("Expected message '文档生成成功', got '%s'", response.Message)
	}
}

func TestGenerateDocumentFromTemplate_InvalidJSON(t *testing.T) {
	handler := NewMCPTemplateHandler(nil)
	router := setupTemplateTestRouter(handler)

	req, _ := http.NewRequest("POST", "/generate-document-from-template", bytes.NewBuffer([]byte("invalid json")))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status code 400, got %d", w.Code)
	}

	var response models.APIResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse error response: %v", err)
	}

	if response.Error == nil || response.Error.Code != models.ErrCodeBadRequest {
		t.Errorf("Expected error code %s", models.ErrCodeBadRequest)
	}
}

func TestGenerateDocumentFromTemplate_InvalidTemplateType(t *testing.T) {
	handler := NewMCPTemplateHandler(nil)
	router := setupTemplateTestRouter(handler)

	request := models.GenerateDocumentRequest{
		TemplateType: "invalid_type",
		Context:      models.TemplateContext{},
		AutoCreate:   false,
	}

	jsonData, _ := json.Marshal(request)
	req, _ := http.NewRequest("POST", "/generate-document-from-template", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status code 400, got %d", w.Code)
	}

	var response models.APIResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse error response: %v", err)
	}

	if response.Error == nil || response.Error.Code != models.ErrCodeBadRequest {
		t.Errorf("Expected error code %s", models.ErrCodeBadRequest)
	}

	if response.Message != "不支持的模板类型: invalid_type" {
		t.Errorf("Unexpected error message: %s", response.Message)
	}
}

func TestGenerateDocumentFromTemplate_AllTemplateTypes(t *testing.T) {
	handler := NewMCPTemplateHandler(nil)
	router := setupTemplateTestRouter(handler)

	title := "测试文档"

	templateTypes := []string{
		"bug_report",
		"feature_spec",
		"meeting_notes",
		"project_plan",
		"api_documentation",
		"test_plan",
		"user_story",
		"technical_design",
	}

	for _, templateType := range templateTypes {
		t.Run(templateType, func(t *testing.T) {
			request := models.GenerateDocumentRequest{
				TemplateType: templateType,
				Context: models.TemplateContext{
					Title: &title,
				},
				AutoCreate: false,
			}

			jsonData, _ := json.Marshal(request)
			req, _ := http.NewRequest("POST", "/generate-document-from-template", bytes.NewBuffer(jsonData))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != http.StatusOK {
				t.Errorf("Expected status code 200 for %s, got %d", templateType, w.Code)
			}

			var response map[string]interface{}
			if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
				t.Fatalf("Failed to parse response for %s: %v", templateType, err)
			}

			if success, ok := response["success"].(bool); !ok || !success {
				t.Errorf("Expected success for %s", templateType)
			}

			data, ok := response["data"].(map[string]interface{})
			if !ok {
				t.Fatalf("Expected data object for %s", templateType)
			}

			if _, ok := data["content"]; !ok {
				t.Errorf("Expected content field for %s", templateType)
			}

			if _, ok := data["metadata"]; !ok {
				t.Errorf("Expected metadata field for %s", templateType)
			}
		})
	}
}

func TestGenerateDocumentFromTemplate_AutoCreateMissingParams(t *testing.T) {
	handler := NewMCPTemplateHandler(nil)
	router := setupTemplateTestRouter(handler)

	title := "测试文档"

	request := models.GenerateDocumentRequest{
		TemplateType: "bug_report",
		Context: models.TemplateContext{
			Title: &title,
			// Missing both TaskID and ProjectID
		},
		AutoCreate: true,
	}

	jsonData, _ := json.Marshal(request)
	req, _ := http.NewRequest("POST", "/generate-document-from-template", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status code 400, got %d", w.Code)
	}

	var response models.ErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse error response: %v", err)
	}

	if response.Message != "autoCreate功能需要提供taskId或projectId" {
		t.Errorf("Unexpected error message: %s", response.Message)
	}
}

func TestGenerateDocumentFromTemplate_AutoCreateNotAuthenticated(t *testing.T) {
	handler := NewMCPTemplateHandler(nil)
	router := setupTemplateTestRouter(handler)

	title := "测试文档"
	taskID := 123

	request := models.GenerateDocumentRequest{
		TemplateType: "bug_report",
		Context: models.TemplateContext{
			Title:  &title,
			TaskID: &taskID,
		},
		AutoCreate: true,
	}

	jsonData, _ := json.Marshal(request)
	req, _ := http.NewRequest("POST", "/generate-document-from-template", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status code 401, got %d", w.Code)
	}

	var response models.APIResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse error response: %v", err)
	}

	if response.Error == nil || response.Error.Code != models.ErrCodeUnauthorized {
		t.Errorf("Expected error code %s", models.ErrCodeUnauthorized)
	}
}

func TestGenerateDocumentFromTemplate_EmptyContext(t *testing.T) {
	handler := NewMCPTemplateHandler(nil)
	router := setupTemplateTestRouter(handler)

	request := models.GenerateDocumentRequest{
		TemplateType: "bug_report",
		Context:      models.TemplateContext{}, // Empty context
		AutoCreate:   false,
	}

	jsonData, _ := json.Marshal(request)
	req, _ := http.NewRequest("POST", "/generate-document-from-template", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status code 200, got %d", w.Code)
	}

	var response models.APIResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if !response.Success {
		t.Error("Expected success even with empty context")
	}
}

func TestGenerateDocumentFromTemplate_ResponseStructure(t *testing.T) {
	handler := NewMCPTemplateHandler(nil)
	router := setupTemplateTestRouter(handler)

	title := "测试响应结构"
	priority := "high"

	request := models.GenerateDocumentRequest{
		TemplateType: "bug_report",
		Context: models.TemplateContext{
			Title:    &title,
			Priority: &priority,
		},
		AutoCreate: false,
	}

	jsonData, _ := json.Marshal(request)
	req, _ := http.NewRequest("POST", "/generate-document-from-template", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status code 200, got %d", w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	// 检查响应结构
	if _, ok := response["success"]; !ok {
		t.Error("Response missing 'success' field")
	}

	if _, ok := response["message"]; !ok {
		t.Error("Response missing 'message' field")
	}

	if _, ok := response["data"]; !ok {
		t.Error("Response missing 'data' field")
	}

	if _, ok := response["timestamp"]; !ok {
		t.Error("Response missing 'timestamp' field")
	}

	// 检查data结构
	data, ok := response["data"].(map[string]interface{})
	if !ok {
		t.Fatal("Data field is not an object")
	}

	if _, ok := data["content"]; !ok {
		t.Error("Data missing 'content' field")
	}

	if _, ok := data["metadata"]; !ok {
		t.Error("Data missing 'metadata' field")
	}

	// 检查metadata结构
	metadata, ok := data["metadata"].(map[string]interface{})
	if !ok {
		t.Fatal("Metadata field is not an object")
	}

	if _, ok := metadata["template_type"]; !ok {
		t.Error("Metadata missing 'template_type' field")
	}

	if _, ok := metadata["generated_at"]; !ok {
		t.Error("Metadata missing 'generated_at' field")
	}

	if _, ok := metadata["title"]; !ok {
		t.Error("Metadata missing 'title' field")
	}
}

func TestNewMCPTemplateHandler(t *testing.T) {
	handler := NewMCPTemplateHandler(nil)

	if handler == nil {
		t.Fatal("NewMCPTemplateHandler returned nil")
	}

	if handler.generator == nil {
		t.Error("Handler generator is nil")
	}

	if handler.db == nil {
		t.Error("Handler db is nil")
	}
}
