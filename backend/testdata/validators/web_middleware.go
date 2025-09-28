package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// WebValidationMiddleware Web验证中间件
type WebValidationMiddleware struct {
	engine     *ValidationEngine
	config     WebValidationConfig
	errorCodes map[ErrorType]int
}

// WebValidationConfig Web验证配置
type WebValidationConfig struct {
	// 验证配置
	EnableRequestValidation  bool                   `json:"enable_request_validation"`
	EnableResponseValidation bool                   `json:"enable_response_validation"`
	EnableFormValidation     bool                   `json:"enable_form_validation"`
	EnableJSONValidation     bool                   `json:"enable_json_validation"`
	EnableFileValidation     bool                   `json:"enable_file_validation"`
	
	// 错误处理
	ReturnValidationErrors   bool                   `json:"return_validation_errors"`
	CustomErrorHandler       func(w http.ResponseWriter, errors []ValidationError) `json:"-"`
	ErrorResponseFormat      string                 `json:"error_response_format"` // "json", "xml", "text"
	
	// 性能配置
	MaxRequestSize          int64                  `json:"max_request_size"`
	MaxFormMemory           int64                  `json:"max_form_memory"`
	RequestTimeout          time.Duration          `json:"request_timeout"`
	
	// 路径配置
	SkipPaths               []string               `json:"skip_paths"`
	ValidatedPaths          map[string][]string    `json:"validated_paths"` // path -> rule_ids
	
	// 安全配置
	EnableCSRFValidation    bool                   `json:"enable_csrf_validation"`
	CSRFTokenField          string                 `json:"csrf_token_field"`
	EnableRateLimitValidation bool                 `json:"enable_rate_limit_validation"`
}

// ValidationRequest 验证请求结构
type ValidationRequest struct {
	Method      string                 `json:"method"`
	URL         string                 `json:"url"`
	Path        string                 `json:"path"`
	Headers     map[string][]string    `json:"headers"`
	Query       map[string][]string    `json:"query"`
	Form        map[string][]string    `json:"form"`
	PostForm    map[string][]string    `json:"post_form"`
	Body        interface{}            `json:"body"`
	Files       map[string]*FileInfo   `json:"files"`
	ContentType string                 `json:"content_type"`
	Size        int64                  `json:"size"`
	RemoteAddr  string                 `json:"remote_addr"`
	UserAgent   string                 `json:"user_agent"`
	Cookies     map[string]string      `json:"cookies"`
}

// FileInfo 文件信息
type FileInfo struct {
	Filename    string            `json:"filename"`
	Header      map[string][]string `json:"header"`
	Size        int64             `json:"size"`
	ContentType string            `json:"content_type"`
	Data        []byte            `json:"data,omitempty"`
}

// ValidationResponse 验证响应结构
type ValidationResponse struct {
	Valid       bool                   `json:"valid"`
	Errors      []ValidationError      `json:"errors,omitempty"`
	Warnings    []ValidationWarning    `json:"warnings,omitempty"`
	ProcessedAt time.Time              `json:"processed_at"`
	Duration    time.Duration          `json:"duration"`
	RequestID   string                 `json:"request_id,omitempty"`
}

// NewWebValidationMiddleware 创建Web验证中间件
func NewWebValidationMiddleware(engine *ValidationEngine, config WebValidationConfig) *WebValidationMiddleware {
	middleware := &WebValidationMiddleware{
		engine: engine,
		config: config,
		errorCodes: map[ErrorType]int{
			ErrorTypeRequired:   http.StatusBadRequest,
			ErrorTypeFormat:     http.StatusBadRequest,
			ErrorTypeRange:      http.StatusBadRequest,
			ErrorTypeLength:     http.StatusBadRequest,
			ErrorTypeUnique:     http.StatusConflict,
			ErrorTypeReference:  http.StatusBadRequest,
			ErrorTypeBusiness:   http.StatusUnprocessableEntity,
			ErrorTypeCustom:     http.StatusBadRequest,
			ErrorTypeSystem:     http.StatusInternalServerError,
			ErrorTypeEnum:       http.StatusBadRequest,
		},
	}
	
	// 设置默认配置
	middleware.setDefaultConfig()
	
	return middleware
}

// setDefaultConfig 设置默认配置
func (m *WebValidationMiddleware) setDefaultConfig() {
	if m.config.MaxRequestSize <= 0 {
		m.config.MaxRequestSize = 32 << 20 // 32MB
	}
	if m.config.MaxFormMemory <= 0 {
		m.config.MaxFormMemory = 32 << 20 // 32MB
	}
	if m.config.RequestTimeout <= 0 {
		m.config.RequestTimeout = 30 * time.Second
	}
	if m.config.ErrorResponseFormat == "" {
		m.config.ErrorResponseFormat = "json"
	}
	if m.config.CSRFTokenField == "" {
		m.config.CSRFTokenField = "_csrf_token"
	}
}

// Handler 中间件处理函数
func (m *WebValidationMiddleware) Handler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 检查是否跳过验证
		if m.shouldSkipPath(r.URL.Path) {
			next.ServeHTTP(w, r)
			return
		}
		
		// 请求大小检查
		if r.ContentLength > m.config.MaxRequestSize {
			m.handleError(w, r, []ValidationError{{
				Type:    ErrorTypeRange,
				Code:    "REQUEST_TOO_LARGE",
				Message: fmt.Sprintf("Request size %d exceeds maximum allowed size %d", r.ContentLength, m.config.MaxRequestSize),
				Field:   "content-length",
			}})
			return
		}
		
		// 解析请求
		validationRequest, err := m.parseRequest(r)
		if err != nil {
			m.handleError(w, r, []ValidationError{{
				Type:    ErrorTypeFormat,
				Code:    "REQUEST_PARSE_ERROR",
				Message: fmt.Sprintf("Failed to parse request: %v", err),
				Field:   "request",
			}})
			return
		}
		
		// 执行验证
		if m.config.EnableRequestValidation {
			result := m.validateRequest(validationRequest, r.URL.Path)
			if !result.IsValid() {
				m.handleValidationResult(w, r, result)
				return
			}
		}
		
		// 继续处理请求
		next.ServeHTTP(w, r)
	})
}

// shouldSkipPath 检查是否跳过路径验证
func (m *WebValidationMiddleware) shouldSkipPath(path string) bool {
	for _, skipPath := range m.config.SkipPaths {
		if strings.HasPrefix(path, skipPath) {
			return true
		}
	}
	return false
}

// parseRequest 解析HTTP请求
func (m *WebValidationMiddleware) parseRequest(r *http.Request) (*ValidationRequest, error) {
	req := &ValidationRequest{
		Method:      r.Method,
		URL:         r.URL.String(),
		Path:        r.URL.Path,
		Headers:     r.Header,
		Query:       r.URL.Query(),
		ContentType: r.Header.Get("Content-Type"),
		Size:        r.ContentLength,
		RemoteAddr:  r.RemoteAddr,
		UserAgent:   r.UserAgent(),
		Cookies:     make(map[string]string),
	}
	
	// 解析Cookies
	for _, cookie := range r.Cookies() {
		req.Cookies[cookie.Name] = cookie.Value
	}
	
	// 解析表单数据
	if strings.Contains(req.ContentType, "application/x-www-form-urlencoded") {
		if err := r.ParseForm(); err != nil {
			return nil, fmt.Errorf("failed to parse form: %w", err)
		}
		req.Form = r.Form
		req.PostForm = r.PostForm
	}
	
	// 解析multipart表单数据
	if strings.Contains(req.ContentType, "multipart/form-data") {
		if err := r.ParseMultipartForm(m.config.MaxFormMemory); err != nil {
			return nil, fmt.Errorf("failed to parse multipart form: %w", err)
		}
		req.Form = r.Form
		req.PostForm = r.PostForm
		
		// 解析文件
		if r.MultipartForm != nil && r.MultipartForm.File != nil {
			req.Files = make(map[string]*FileInfo)
			for fieldName, files := range r.MultipartForm.File {
				if len(files) > 0 {
					fileHeader := files[0]
					fileInfo := &FileInfo{
						Filename:    fileHeader.Filename,
						Header:      fileHeader.Header,
						Size:        fileHeader.Size,
						ContentType: fileHeader.Header.Get("Content-Type"),
					}
					
					// 读取文件数据（可选）
					if m.config.EnableFileValidation {
						file, err := fileHeader.Open()
						if err == nil {
							defer file.Close()
							data, err := io.ReadAll(file)
							if err == nil {
								fileInfo.Data = data
							}
						}
					}
					
					req.Files[fieldName] = fileInfo
				}
			}
		}
	}
	
	// 解析JSON数据
	if strings.Contains(req.ContentType, "application/json") && m.config.EnableJSONValidation {
		if r.Body != nil {
			body, err := io.ReadAll(r.Body)
			if err != nil {
				return nil, fmt.Errorf("failed to read request body: %w", err)
			}
			
			// 重新设置Body供后续处理
			r.Body = io.NopCloser(bytes.NewReader(body))
			
			if len(body) > 0 {
				var jsonData interface{}
				if err := json.Unmarshal(body, &jsonData); err != nil {
					return nil, fmt.Errorf("failed to parse JSON body: %w", err)
				}
				req.Body = jsonData
			}
		}
	}
	
	return req, nil
}

// validateRequest 验证请求
func (m *WebValidationMiddleware) validateRequest(req *ValidationRequest, path string) *ValidationResult {
	result := NewValidationResult()
	ctx := NewValidationContext(req)
	
	// 获取路径对应的验证规则
	ruleIDs, exists := m.config.ValidatedPaths[path]
	if !exists {
		// 使用默认规则或全部规则
		ruleIDs = m.getDefaultRuleIDs()
	}
	
	// 执行验证规则
	for _, ruleID := range ruleIDs {
		if rule, exists := m.engine.GetRule(ruleID); exists {
			err := rule.Validate(ctx, result)
			if err != nil {
				result.AddError(ValidationError{
					Type:    ErrorTypeSystem,
					Code:    "RULE_EXECUTION_ERROR",
					Message: fmt.Sprintf("Rule execution failed: %v", err),
					RuleID:  ruleID,
				})
			}
		}
	}
	
	// 执行内置Web验证
	m.executeBuiltinValidations(req, result)
	
	return result
}

// executeBuiltinValidations 执行内置Web验证
func (m *WebValidationMiddleware) executeBuiltinValidations(req *ValidationRequest, result *ValidationResult) {
	// CSRF验证
	if m.config.EnableCSRFValidation {
		m.validateCSRF(req, result)
	}
	
	// Content-Type验证
	m.validateContentType(req, result)
	
	// 文件上传验证
	if m.config.EnableFileValidation && len(req.Files) > 0 {
		m.validateFiles(req, result)
	}
	
	// 请求头验证
	m.validateHeaders(req, result)
}

// validateCSRF 验证CSRF令牌
func (m *WebValidationMiddleware) validateCSRF(req *ValidationRequest, result *ValidationResult) {
	if req.Method == "POST" || req.Method == "PUT" || req.Method == "PATCH" || req.Method == "DELETE" {
		token := ""
		
		// 从表单中获取CSRF令牌
		if req.Form != nil {
			if values, exists := req.Form[m.config.CSRFTokenField]; exists && len(values) > 0 {
				token = values[0]
			}
		}
		
		// 从头部获取CSRF令牌
		if token == "" {
			if values, exists := req.Headers["X-Csrf-Token"]; exists && len(values) > 0 {
				token = values[0]
			}
		}
		
		if token == "" {
			result.AddError(ValidationError{
				Type:    ErrorTypeRequired,
				Code:    "CSRF_TOKEN_MISSING",
				Message: "CSRF token is required",
				Field:   m.config.CSRFTokenField,
			})
		}
		// TODO: 验证CSRF令牌的有效性
	}
}

// validateContentType 验证Content-Type
func (m *WebValidationMiddleware) validateContentType(req *ValidationRequest, result *ValidationResult) {
	if req.Method == "POST" || req.Method == "PUT" || req.Method == "PATCH" {
		if req.ContentType == "" {
			result.AddError(ValidationError{
				Type:    ErrorTypeRequired,
				Code:    "CONTENT_TYPE_MISSING",
				Message: "Content-Type header is required for " + req.Method + " requests",
				Field:   "content-type",
			})
		}
	}
}

// validateFiles 验证文件上传
func (m *WebValidationMiddleware) validateFiles(req *ValidationRequest, result *ValidationResult) {
	for fieldName, fileInfo := range req.Files {
		// 文件大小验证
		if fileInfo.Size > m.config.MaxRequestSize {
			result.AddError(ValidationError{
				Type:    ErrorTypeRange,
				Code:    "FILE_TOO_LARGE",
				Message: fmt.Sprintf("File %s size %d exceeds maximum allowed size %d", 
					fileInfo.Filename, fileInfo.Size, m.config.MaxRequestSize),
				Field:   fieldName,
			})
		}
		
		// 文件名验证
		if fileInfo.Filename == "" {
			result.AddError(ValidationError{
				Type:    ErrorTypeRequired,
				Code:    "FILENAME_REQUIRED",
				Message: "Filename is required",
				Field:   fieldName,
			})
		}
		
		// 文件类型验证
		if fileInfo.ContentType == "" {
			result.AddWarning(ValidationWarning{
				Field:   fieldName,
				Code:    "CONTENT_TYPE_UNKNOWN",
				Message: "File content type is unknown",
			})
		}
	}
}

// validateHeaders 验证请求头
func (m *WebValidationMiddleware) validateHeaders(req *ValidationRequest, result *ValidationResult) {
	// User-Agent验证
	if req.UserAgent == "" {
		result.AddWarning(ValidationWarning{
			Field:   "user-agent",
			Code:    "USER_AGENT_MISSING",
			Message: "User-Agent header is missing",
		})
	}
	
	// Accept验证
	if req.Method == "GET" {
		if accept, exists := req.Headers["Accept"]; !exists || len(accept) == 0 {
			result.AddWarning(ValidationWarning{
				Field:   "accept",
				Code:    "ACCEPT_HEADER_MISSING",
				Message: "Accept header is recommended for GET requests",
			})
		}
	}
}

// getDefaultRuleIDs 获取默认规则ID列表
func (m *WebValidationMiddleware) getDefaultRuleIDs() []string {
	// 返回基础Web验证规则ID
	return []string{"web_basic_validation"}
}

// handleValidationResult 处理验证结果
func (m *WebValidationMiddleware) handleValidationResult(w http.ResponseWriter, r *http.Request, result *ValidationResult) {
	if !result.IsValid() {
		errors := result.GetErrors()
		m.handleError(w, r, errors)
	}
}

// handleError 处理验证错误
func (m *WebValidationMiddleware) handleError(w http.ResponseWriter, r *http.Request, errors []ValidationError) {
	// 使用自定义错误处理器
	if m.config.CustomErrorHandler != nil {
		m.config.CustomErrorHandler(w, errors)
		return
	}
	
	// 确定HTTP状态码
	statusCode := http.StatusBadRequest
	if len(errors) > 0 {
		if code, exists := m.errorCodes[errors[0].Type]; exists {
			statusCode = code
		}
	}
	
	// 生成验证响应
	response := ValidationResponse{
		Valid:       false,
		Errors:      errors,
		ProcessedAt: time.Now(),
	}
	
	// 根据配置格式返回错误响应
	switch m.config.ErrorResponseFormat {
	case "json":
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(statusCode)
		json.NewEncoder(w).Encode(response)
		
	case "xml":
		w.Header().Set("Content-Type", "application/xml")
		w.WriteHeader(statusCode)
		fmt.Fprintf(w, `<?xml version="1.0" encoding="UTF-8"?>
<validation_response>
    <valid>false</valid>
    <errors>
        %s
    </errors>
    <processed_at>%s</processed_at>
</validation_response>`, m.errorsToXML(errors), response.ProcessedAt.Format(time.RFC3339))
		
	case "text":
		w.Header().Set("Content-Type", "text/plain")
		w.WriteHeader(statusCode)
		fmt.Fprintf(w, "Validation failed with %d errors:\n", len(errors))
		for i, err := range errors {
			fmt.Fprintf(w, "%d. [%s] %s: %s\n", i+1, err.Type.String(), err.Field, err.Message)
		}
		
	default:
		// 默认JSON格式
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(statusCode)
		json.NewEncoder(w).Encode(response)
	}
}

// errorsToXML 将错误转换为XML格式
func (m *WebValidationMiddleware) errorsToXML(errors []ValidationError) string {
	var xmlErrors strings.Builder
	for _, err := range errors {
		xmlErrors.WriteString(fmt.Sprintf(`
        <error>
            <type>%s</type>
            <code>%s</code>
            <message>%s</message>
            <field>%s</field>
        </error>`, err.Type.String(), err.Code, err.Message, err.Field))
	}
	return xmlErrors.String()
}

// ValidateJSON 验证JSON数据（独立函数）
func (m *WebValidationMiddleware) ValidateJSON(data []byte, ruleIDs []string) *ValidationResult {
	var jsonData interface{}
	if err := json.Unmarshal(data, &jsonData); err != nil {
		result := NewValidationResult()
		result.AddError(ValidationError{
			Type:    ErrorTypeFormat,
			Code:    "INVALID_JSON",
			Message: fmt.Sprintf("Invalid JSON format: %v", err),
			Field:   "body",
		})
		return result
	}
	
	result := NewValidationResult()
	ctx := NewValidationContext(jsonData)
	
	for _, ruleID := range ruleIDs {
		if rule, exists := m.engine.GetRule(ruleID); exists {
			err := rule.Validate(ctx, result)
			if err != nil {
				result.AddError(ValidationError{
					Type:    ErrorTypeSystem,
					Code:    "RULE_EXECUTION_ERROR",
					Message: fmt.Sprintf("Rule execution failed: %v", err),
					RuleID:  ruleID,
				})
			}
		}
	}
	
	return result
}

// ValidateForm 验证表单数据（独立函数）
func (m *WebValidationMiddleware) ValidateForm(form url.Values, ruleIDs []string) *ValidationResult {
	// 将表单数据转换为map[string]interface{}
	formData := make(map[string]interface{})
	for key, values := range form {
		if len(values) == 1 {
			// 尝试转换为数字
			if intVal, err := strconv.Atoi(values[0]); err == nil {
				formData[key] = intVal
			} else if floatVal, err := strconv.ParseFloat(values[0], 64); err == nil {
				formData[key] = floatVal
			} else if boolVal, err := strconv.ParseBool(values[0]); err == nil {
				formData[key] = boolVal
			} else {
				formData[key] = values[0]
			}
		} else {
			formData[key] = values
		}
	}
	
	result := NewValidationResult()
	ctx := NewValidationContext(formData)
	
	for _, ruleID := range ruleIDs {
		if rule, exists := m.engine.GetRule(ruleID); exists {
			err := rule.Validate(ctx, result)
			if err != nil {
				result.AddError(ValidationError{
					Type:    ErrorTypeSystem,
					Code:    "RULE_EXECUTION_ERROR",
					Message: fmt.Sprintf("Rule execution failed: %v", err),
					RuleID:  ruleID,
				})
			}
		}
	}
	
	return result
}

// GetRule 获取验证规则（从引擎委托）
func (m *WebValidationMiddleware) GetRule(ruleID string) (IValidationRule, bool) {
	return m.engine.GetRule(ruleID)
}

// RegisterRule 注册验证规则（从引擎委托）
func (m *WebValidationMiddleware) RegisterRule(rule IValidationRule) error {
	return m.engine.RegisterRule(rule)
}

// NewDefaultWebValidationConfig 创建默认Web验证配置
func NewDefaultWebValidationConfig() WebValidationConfig {
	return WebValidationConfig{
		EnableRequestValidation:   true,
		EnableResponseValidation:  false,
		EnableFormValidation:      true,
		EnableJSONValidation:      true,
		EnableFileValidation:      true,
		ReturnValidationErrors:    true,
		ErrorResponseFormat:       "json",
		MaxRequestSize:           32 << 20, // 32MB
		MaxFormMemory:            32 << 20, // 32MB
		RequestTimeout:           30 * time.Second,
		SkipPaths:                []string{"/health", "/metrics", "/favicon.ico"},
		ValidatedPaths:           make(map[string][]string),
		EnableCSRFValidation:     false,
		CSRFTokenField:           "_csrf_token",
		EnableRateLimitValidation: false,
	}
}