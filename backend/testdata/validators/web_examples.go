package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
)

// WebExample 演示Web验证中间件的使用
func WebExample() {
	fmt.Println("\n=== Web验证中间件示例 ===")

	// 创建验证引擎
	engine := NewValidationEngine(*NewValidationConfig())

	// 创建一些基础验证规则
	requiredRule := CreateRequiredRule("user_required", "用户必填字段", []string{"username", "email"})
	lengthRule := CreateLengthRule("username_length", "用户名长度", "username")
	lengthRule.SetMin(3).SetMax(20)
	
	emailRule, err := CreateEmailRule("email_format", "邮箱格式", "email")
	if err != nil {
		log.Printf("创建邮箱规则失败: %v", err)
		return
	}

	// 注册规则到引擎
	engine.RegisterRule(requiredRule)
	engine.RegisterRule(lengthRule)
	engine.RegisterRule(emailRule)

	// 创建Web验证配置
	webConfig := NewDefaultWebValidationConfig()
	webConfig.ValidatedPaths = map[string][]string{
		"/api/users":     {"user_required", "username_length", "email_format"},
		"/api/register":  {"user_required", "username_length", "email_format"},
	}

	// 创建Web验证中间件
	middleware := NewWebValidationMiddleware(engine, webConfig)

	// 创建测试服务器
	mux := http.NewServeMux()
	
	// 添加处理器
	mux.HandleFunc("/api/users", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{
			"message": "User created successfully",
		})
	})
	
	mux.HandleFunc("/api/register", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{
			"message": "Registration successful",
		})
	})
	
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// 应用中间件
	handler := middleware.Handler(mux)

	// 演示不同的验证场景
	testWebValidation(handler)
}

// testWebValidation 测试Web验证功能
func testWebValidation(handler http.Handler) {
	fmt.Println("\n--- JSON请求验证演示 ---")
	
	// 测试1: 有效的JSON请求
	validJSON := `{"username": "john_doe", "email": "john@example.com", "age": 25}`
	req := httptest.NewRequest("POST", "/api/users", strings.NewReader(validJSON))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	
	handler.ServeHTTP(w, req)
	fmt.Printf("有效JSON请求 - 状态码: %d, 响应: %s\n", w.Code, w.Body.String())

	// 测试2: 缺少必填字段的JSON请求
	invalidJSON := `{"age": 25}`
	req = httptest.NewRequest("POST", "/api/users", strings.NewReader(invalidJSON))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	
	handler.ServeHTTP(w, req)
	fmt.Printf("缺少必填字段 - 状态码: %d, 响应: %s\n", w.Code, w.Body.String())

	// 测试3: 用户名长度不符合要求
	invalidLengthJSON := `{"username": "ab", "email": "john@example.com"}`
	req = httptest.NewRequest("POST", "/api/users", strings.NewReader(invalidLengthJSON))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	
	handler.ServeHTTP(w, req)
	fmt.Printf("用户名长度不符合 - 状态码: %d, 响应: %s\n", w.Code, w.Body.String())

	// 测试4: 邮箱格式错误
	invalidEmailJSON := `{"username": "john_doe", "email": "invalid-email"}`
	req = httptest.NewRequest("POST", "/api/users", strings.NewReader(invalidEmailJSON))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	
	handler.ServeHTTP(w, req)
	fmt.Printf("邮箱格式错误 - 状态码: %d, 响应: %s\n", w.Code, w.Body.String())

	fmt.Println("\n--- 表单数据验证演示 ---")
	
	// 测试5: 有效的表单数据
	formData := url.Values{}
	formData.Set("username", "john_doe")
	formData.Set("email", "john@example.com")
	formData.Set("age", "25")
	
	req = httptest.NewRequest("POST", "/api/register", strings.NewReader(formData.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	w = httptest.NewRecorder()
	
	handler.ServeHTTP(w, req)
	fmt.Printf("有效表单数据 - 状态码: %d, 响应: %s\n", w.Code, w.Body.String())

	// 测试6: 表单数据缺少邮箱
	formDataInvalid := url.Values{}
	formDataInvalid.Set("username", "john_doe")
	formDataInvalid.Set("age", "25")
	
	req = httptest.NewRequest("POST", "/api/register", strings.NewReader(formDataInvalid.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	w = httptest.NewRecorder()
	
	handler.ServeHTTP(w, req)
	fmt.Printf("表单缺少邮箱 - 状态码: %d, 响应: %s\n", w.Code, w.Body.String())

	fmt.Println("\n--- 跳过路径验证演示 ---")
	
	// 测试7: 健康检查路径（应该被跳过）
	req = httptest.NewRequest("GET", "/health", nil)
	w = httptest.NewRecorder()
	
	handler.ServeHTTP(w, req)
	fmt.Printf("健康检查路径 - 状态码: %d, 响应: %s\n", w.Code, w.Body.String())

	fmt.Println("\n--- 请求大小限制演示 ---")
	
	// 测试8: 超大请求（模拟）
	largeJSON := strings.Repeat(`{"data": "x"}`, 10000)
	req = httptest.NewRequest("POST", "/api/users", strings.NewReader(largeJSON))
	req.Header.Set("Content-Type", "application/json")
	// 模拟大请求
	req.ContentLength = int64(len(largeJSON))
	w = httptest.NewRecorder()
	
	handler.ServeHTTP(w, req)
	fmt.Printf("超大请求 - 状态码: %d, 响应长度: %d\n", w.Code, w.Body.Len())
}

// FileUploadExample 演示文件上传验证
func FileUploadExample() {
	fmt.Println("\n=== 文件上传验证示例 ===")

	// 创建验证引擎
	engine := NewValidationEngine(*NewValidationConfig())

	// 创建文件上传验证规则
	fileRule := CreateCustomRule("file_validation", "文件验证", func(ctx IValidationContext, result *ValidationResult) error {
		// 这里可以添加自定义文件验证逻辑
		return nil
	})
	engine.RegisterRule(fileRule)

	// 创建Web验证配置，启用文件验证
	webConfig := NewDefaultWebValidationConfig()
	webConfig.EnableFileValidation = true
	webConfig.ValidatedPaths = map[string][]string{
		"/api/upload": {"file_validation"},
	}

	// 创建Web验证中间件
	middleware := NewWebValidationMiddleware(engine, webConfig)

	// 创建测试服务器
	mux := http.NewServeMux()
	mux.HandleFunc("/api/upload", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{
			"message": "File uploaded successfully",
		})
	})

	handler := middleware.Handler(mux)

	// 创建模拟的multipart请求
	writer := bytes.NewBufferString(`--boundary123
Content-Disposition: form-data; name="file"; filename="test.txt"
Content-Type: text/plain

This is test file content
--boundary123
Content-Disposition: form-data; name="description"

Test file description
--boundary123--`)

	req := httptest.NewRequest("POST", "/api/upload", writer)
	req.Header.Set("Content-Type", "multipart/form-data; boundary=boundary123")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)
	fmt.Printf("文件上传请求 - 状态码: %d, 响应: %s\n", w.Code, w.Body.String())
}

// CustomErrorHandlerExample 演示自定义错误处理
func CustomErrorHandlerExample() {
	fmt.Println("\n=== 自定义错误处理示例 ===")

	// 创建验证引擎
	engine := NewValidationEngine(*NewValidationConfig())

	// 注册验证规则
	requiredRule := CreateRequiredRule("user_required", "用户必填字段", []string{"username"})
	engine.RegisterRule(requiredRule)

	// 创建Web验证配置with自定义错误处理器
	webConfig := NewDefaultWebValidationConfig()
	webConfig.ValidatedPaths = map[string][]string{
		"/api/custom": {"user_required"},
	}
	
	// 自定义错误处理器
	webConfig.CustomErrorHandler = func(w http.ResponseWriter, errors []ValidationError) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		
		customResponse := map[string]interface{}{
			"success": false,
			"message": "Validation failed",
			"errors":  len(errors),
			"details": errors,
			"timestamp": "2024-01-01T00:00:00Z",
		}
		
		json.NewEncoder(w).Encode(customResponse)
	}

	// 创建Web验证中间件
	middleware := NewWebValidationMiddleware(engine, webConfig)

	// 创建测试服务器
	mux := http.NewServeMux()
	mux.HandleFunc("/api/custom", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{
			"message": "Custom handler success",
		})
	})

	handler := middleware.Handler(mux)

	// 测试自定义错误处理
	invalidJSON := `{"email": "test@example.com"}`  // 缺少username
	req := httptest.NewRequest("POST", "/api/custom", strings.NewReader(invalidJSON))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)
	fmt.Printf("自定义错误处理 - 状态码: %d\n", w.Code)
	fmt.Printf("响应内容: %s\n", w.Body.String())
}

// MultiFormatErrorExample 演示多种错误格式
func MultiFormatErrorExample() {
	fmt.Println("\n=== 多种错误格式示例 ===")

	// 创建验证引擎
	engine := NewValidationEngine(*NewValidationConfig())
	requiredRule := CreateRequiredRule("user_required", "用户必填字段", []string{"username"})
	engine.RegisterRule(requiredRule)

	// 测试JSON格式错误响应
	testErrorFormat(engine, "json", "/api/json")
	
	// 测试XML格式错误响应
	testErrorFormat(engine, "xml", "/api/xml")
	
	// 测试文本格式错误响应
	testErrorFormat(engine, "text", "/api/text")
}

// testErrorFormat 测试指定格式的错误响应
func testErrorFormat(engine *ValidationEngine, format, path string) {
	webConfig := NewDefaultWebValidationConfig()
	webConfig.ErrorResponseFormat = format
	webConfig.ValidatedPaths = map[string][]string{
		path: {"user_required"},
	}

	middleware := NewWebValidationMiddleware(engine, webConfig)

	mux := http.NewServeMux()
	mux.HandleFunc(path, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Success"))
	})

	handler := middleware.Handler(mux)

	// 发送无效请求
	invalidJSON := `{"email": "test@example.com"}`
	req := httptest.NewRequest("POST", path, strings.NewReader(invalidJSON))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)
	
	fmt.Printf("%s格式错误响应:\n", strings.ToUpper(format))
	fmt.Printf("状态码: %d\n", w.Code)
	fmt.Printf("Content-Type: %s\n", w.Header().Get("Content-Type"))
	fmt.Printf("响应内容: %s\n", w.Body.String())
	fmt.Println("---")
}

// CSRFValidationExample 演示CSRF验证
func CSRFValidationExample() {
	fmt.Println("\n=== CSRF验证示例 ===")

	// 创建验证引擎
	engine := NewValidationEngine(*NewValidationConfig())

	// 创建Web验证配置，启用CSRF验证
	webConfig := NewDefaultWebValidationConfig()
	webConfig.EnableCSRFValidation = true
	webConfig.ValidatedPaths = map[string][]string{
		"/api/secure": {},
	}

	middleware := NewWebValidationMiddleware(engine, webConfig)

	mux := http.NewServeMux()
	mux.HandleFunc("/api/secure", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{
			"message": "Secure operation successful",
		})
	})

	handler := middleware.Handler(mux)

	// 测试没有CSRF令牌的POST请求
	formData := url.Values{}
	formData.Set("action", "delete")
	
	req := httptest.NewRequest("POST", "/api/secure", strings.NewReader(formData.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)
	fmt.Printf("没有CSRF令牌 - 状态码: %d, 响应: %s\n", w.Code, w.Body.String())

	// 测试带有CSRF令牌的POST请求
	formDataWithCSRF := url.Values{}
	formDataWithCSRF.Set("action", "delete")
	formDataWithCSRF.Set("_csrf_token", "valid_token_123")
	
	req = httptest.NewRequest("POST", "/api/secure", strings.NewReader(formDataWithCSRF.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	w = httptest.NewRecorder()

	handler.ServeHTTP(w, req)
	fmt.Printf("带有CSRF令牌 - 状态码: %d, 响应: %s\n", w.Code, w.Body.String())

	// 测试通过HTTP头提供CSRF令牌
	req = httptest.NewRequest("POST", "/api/secure", strings.NewReader(`{"action": "delete"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Csrf-Token", "header_token_456")
	w = httptest.NewRecorder()

	handler.ServeHTTP(w, req)
	fmt.Printf("HTTP头CSRF令牌 - 状态码: %d, 响应: %s\n", w.Code, w.Body.String())
}

// StandaloneValidationExample 演示独立验证功能
func StandaloneValidationExample() {
	fmt.Println("\n=== 独立验证功能示例 ===")

	// 创建验证引擎
	engine := NewValidationEngine(*NewValidationConfig())
	
	// 注册验证规则
	requiredRule := CreateRequiredRule("user_required", "用户必填字段", []string{"username", "email"})
	lengthRule := CreateLengthRule("username_length", "用户名长度", "username")
	lengthRule.SetMin(3).SetMax(20)
	emailRule, _ := CreateEmailRule("email_format", "邮箱格式", "email")
	
	engine.RegisterRule(requiredRule)
	engine.RegisterRule(lengthRule)
	engine.RegisterRule(emailRule)

	// 创建Web验证中间件
	webConfig := NewDefaultWebValidationConfig()
	middleware := NewWebValidationMiddleware(engine, webConfig)

	// 测试JSON验证
	fmt.Println("\n--- 独立JSON验证 ---")
	validJSON := `{"username": "john_doe", "email": "john@example.com"}`
	ruleIDs := []string{"user_required", "username_length", "email_format"}
	
	result := middleware.ValidateJSON([]byte(validJSON), ruleIDs)
	fmt.Printf("有效JSON - 结果: %v, 错误数: %d\n", result.IsValid(), len(result.GetErrors()))
	
	invalidJSON := `{"username": "ab", "email": "invalid-email"}`
	result = middleware.ValidateJSON([]byte(invalidJSON), ruleIDs)
	fmt.Printf("无效JSON - 结果: %v, 错误数: %d\n", result.IsValid(), len(result.GetErrors()))
	for i, err := range result.GetErrors() {
		fmt.Printf("  错误 %d: %s - %s\n", i+1, err.Field, err.Message)
	}

	// 测试表单验证
	fmt.Println("\n--- 独立表单验证 ---")
	validForm := url.Values{}
	validForm.Set("username", "john_doe")
	validForm.Set("email", "john@example.com")
	
	result = middleware.ValidateForm(validForm, ruleIDs)
	fmt.Printf("有效表单 - 结果: %v, 错误数: %d\n", result.IsValid(), len(result.GetErrors()))
	
	invalidForm := url.Values{}
	invalidForm.Set("username", "a")
	
	result = middleware.ValidateForm(invalidForm, ruleIDs)
	fmt.Printf("无效表单 - 结果: %v, 错误数: %d\n", result.IsValid(), len(result.GetErrors()))
	for i, err := range result.GetErrors() {
		fmt.Printf("  错误 %d: %s - %s\n", i+1, err.Field, err.Message)
	}
}