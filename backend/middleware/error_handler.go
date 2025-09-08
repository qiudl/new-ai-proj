package middleware

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"runtime"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// 错误类型枚举
type ErrorType string

const (
	ValidationError  ErrorType = "VALIDATION_ERROR"
	DatabaseError    ErrorType = "DATABASE_ERROR"
	AuthError        ErrorType = "AUTH_ERROR"
	PermissionError  ErrorType = "PERMISSION_ERROR"
	NotFoundError    ErrorType = "NOT_FOUND_ERROR"
	DuplicateError   ErrorType = "DUPLICATE_ERROR"
	BusinessError    ErrorType = "BUSINESS_ERROR"
	InternalError    ErrorType = "INTERNAL_ERROR"
	ExternalError    ErrorType = "EXTERNAL_ERROR"
	TimeoutError     ErrorType = "TIMEOUT_ERROR"
)

// 应用错误结构
type AppError struct {
	Type      ErrorType              `json:"type"`
	Code      string                 `json:"code"`
	Message   string                 `json:"message"`
	Details   string                 `json:"details,omitempty"`
	Field     string                 `json:"field,omitempty"`
	Context   map[string]interface{} `json:"context,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
	RequestID string                 `json:"request_id,omitempty"`
}

// 实现error接口
func (e *AppError) Error() string {
	return fmt.Sprintf("[%s] %s: %s", e.Code, e.Type, e.Message)
}

// API错误响应结构
type ErrorResponse struct {
	Error             string                    `json:"error"`
	Message           string                    `json:"message"`
	Code              string                    `json:"code,omitempty"`
	Details           string                    `json:"details,omitempty"`
	Field             string                    `json:"field,omitempty"`
	ValidationErrors  map[string][]string       `json:"validation_errors,omitempty"`
	Context           map[string]interface{}    `json:"context,omitempty"`
	Timestamp         string                    `json:"timestamp"`
	RequestID         string                    `json:"request_id,omitempty"`
}

// 错误代码映射
var errorCodeMap = map[ErrorType]string{
	ValidationError: "VALIDATION_ERROR",
	DatabaseError:   "DATABASE_ERROR",
	AuthError:       "UNAUTHORIZED",
	PermissionError: "FORBIDDEN",
	NotFoundError:   "NOT_FOUND",
	DuplicateError:  "DUPLICATE_VALUE",
	BusinessError:   "BUSINESS_ERROR",
	InternalError:   "INTERNAL_SERVER_ERROR",
	ExternalError:   "EXTERNAL_SERVICE_ERROR",
	TimeoutError:    "TIMEOUT_ERROR",
}

// HTTP状态码映射
var statusCodeMap = map[ErrorType]int{
	ValidationError: http.StatusBadRequest,
	DatabaseError:   http.StatusInternalServerError,
	AuthError:       http.StatusUnauthorized,
	PermissionError: http.StatusForbidden,
	NotFoundError:   http.StatusNotFound,
	DuplicateError:  http.StatusConflict,
	BusinessError:   http.StatusUnprocessableEntity,
	InternalError:   http.StatusInternalServerError,
	ExternalError:   http.StatusBadGateway,
	TimeoutError:    http.StatusGatewayTimeout,
}

// 用户友好的错误消息映射
var userMessageMap = map[string]string{
	"VALIDATION_ERROR":           "输入数据格式不正确",
	"DATABASE_ERROR":             "数据库操作失败",
	"UNAUTHORIZED":               "登录凭证无效或已过期",
	"FORBIDDEN":                  "权限不足，无法执行此操作",
	"NOT_FOUND":                  "请求的资源不存在",
	"DUPLICATE_VALUE":            "数据已存在，请检查后重试",
	"BUSINESS_ERROR":             "业务规则验证失败",
	"INTERNAL_SERVER_ERROR":      "服务器内部错误，请稍后重试",
	"EXTERNAL_SERVICE_ERROR":     "外部服务暂时不可用",
	"TIMEOUT_ERROR":              "操作超时，请稍后重试",
	"TASK_NOT_FOUND":             "任务不存在或已被删除",
	"PROJECT_NOT_FOUND":          "项目不存在或已被删除",
	"USER_NOT_FOUND":             "用户不存在",
	"DEPARTMENT_NOT_FOUND":       "部门不存在",
	"ENTERPRISE_NOT_FOUND":       "企业不存在",
	"INVALID_TOKEN":              "登录凭证无效",
	"TOKEN_EXPIRED":              "登录凭证已过期",
	"INSUFFICIENT_PERMISSIONS":   "权限不足",
	"DUPLICATE_USERNAME":         "用户名已存在",
	"DUPLICATE_EMAIL":            "邮箱已存在",
	"DUPLICATE_ENTERPRISE_CODE":  "企业代码已存在",
	"INVALID_FILE_TYPE":          "不支持的文件类型",
	"FILE_TOO_LARGE":             "文件大小超过限制",
	"UPLOAD_FAILED":              "文件上传失败",
}

// 错误构造函数
func NewAppError(errorType ErrorType, message string) *AppError {
	return &AppError{
		Type:      errorType,
		Code:      errorCodeMap[errorType],
		Message:   message,
		Timestamp: time.Now(),
	}
}

func NewAppErrorWithCode(errorType ErrorType, code string, message string) *AppError {
	return &AppError{
		Type:      errorType,
		Code:      code,
		Message:   message,
		Timestamp: time.Now(),
	}
}

func NewValidationError(field string, message string) *AppError {
	return &AppError{
		Type:      ValidationError,
		Code:      "VALIDATION_ERROR",
		Message:   message,
		Field:     field,
		Timestamp: time.Now(),
	}
}

func NewNotFoundError(resource string) *AppError {
	code := fmt.Sprintf("%s_NOT_FOUND", strings.ToUpper(resource))
	userMsg := userMessageMap[code]
	if userMsg == "" {
		userMsg = fmt.Sprintf("%s不存在", resource)
	}
	
	return &AppError{
		Type:      NotFoundError,
		Code:      code,
		Message:   userMsg,
		Details:   fmt.Sprintf("%s not found", resource),
		Timestamp: time.Now(),
	}
}

func NewDuplicateError(field string, value string) *AppError {
	code := fmt.Sprintf("DUPLICATE_%s", strings.ToUpper(field))
	userMsg := userMessageMap[code]
	if userMsg == "" {
		userMsg = fmt.Sprintf("%s已存在", field)
	}
	
	return &AppError{
		Type:      DuplicateError,
		Code:      code,
		Message:   userMsg,
		Field:     field,
		Details:   fmt.Sprintf("Value '%s' already exists for field '%s'", value, field),
		Timestamp: time.Now(),
	}
}

// 获取堆栈跟踪信息
func getStackTrace() string {
	const size = 64 << 10
	buf := make([]byte, size)
	buf = buf[:runtime.Stack(buf, false)]
	return string(buf)
}

// 从gin context获取请求ID
func getRequestID(c *gin.Context) string {
	if requestID, exists := c.Get("X-Request-ID"); exists {
		if id, ok := requestID.(string); ok {
			return id
		}
	}
	return ""
}

// 解析validator错误
func parseValidatorErrors(err error) map[string][]string {
	validationErrors := make(map[string][]string)
	
	var ve validator.ValidationErrors
	if errors.As(err, &ve) {
		for _, fe := range ve {
			field := fe.Field()
			var message string
			
			// 根据验证标签生成中文错误消息
			switch fe.Tag() {
			case "required":
				message = "此字段为必填项"
			case "email":
				message = "请输入正确的邮箱格式"
			case "min":
				message = fmt.Sprintf("长度不能少于%s个字符", fe.Param())
			case "max":
				message = fmt.Sprintf("长度不能超过%s个字符", fe.Param())
			case "len":
				message = fmt.Sprintf("长度必须为%s个字符", fe.Param())
			case "numeric":
				message = "必须为数字"
			case "alpha":
				message = "只能包含字母"
			case "alphanum":
				message = "只能包含字母和数字"
			case "url":
				message = "请输入正确的URL格式"
			case "oneof":
				message = fmt.Sprintf("必须是以下值之一: %s", fe.Param())
			case "task_status":
				message = "无效的任务状态"
			case "task_priority":
				message = "无效的任务优先级"
			case "enterprise_code":
				message = "企业代码格式不正确，只能包含大写字母、数字和下划线"
			case "chinese_name":
				message = "请输入正确的中文姓名"
			case "phone_number":
				message = "请输入正确的手机号码"
			case "id_card":
				message = "请输入正确的身份证号码"
			default:
				message = fmt.Sprintf("字段验证失败: %s", fe.Tag())
			}
			
			validationErrors[field] = append(validationErrors[field], message)
		}
	}
	
	return validationErrors
}

// 错误处理中间件
func ErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 执行后续的处理器
		c.Next()
		
		// 检查是否有错误
		if len(c.Errors) == 0 {
			return
		}
		
		// 获取最后一个错误
		err := c.Errors.Last().Err
		requestID := getRequestID(c)
		
		var response ErrorResponse
		var statusCode int
		
		// 检查是否是自定义的AppError
		var appErr *AppError
		if errors.As(err, &appErr) {
			// 处理自定义错误
			appErr.RequestID = requestID
			statusCode = statusCodeMap[appErr.Type]
			
			response = ErrorResponse{
				Error:     string(appErr.Type),
				Code:      appErr.Code,
				Message:   appErr.Message,
				Details:   appErr.Details,
				Field:     appErr.Field,
				Context:   appErr.Context,
				Timestamp: appErr.Timestamp.Format(time.RFC3339),
				RequestID: requestID,
			}
			
		} else {
			// 处理其他类型的错误
			statusCode = http.StatusInternalServerError
			errorType := InternalError
			code := errorCodeMap[errorType]
			message := userMessageMap[code]
			
			// 检查是否是验证错误
			var ve validator.ValidationErrors
			if errors.As(err, &ve) {
				statusCode = http.StatusBadRequest
				errorType = ValidationError
				code = errorCodeMap[errorType]
				message = userMessageMap[code]
				response.ValidationErrors = parseValidatorErrors(err)
			}
			
			response = ErrorResponse{
				Error:     string(errorType),
				Code:      code,
				Message:   message,
				Details:   err.Error(),
				Timestamp: time.Now().Format(time.RFC3339),
				RequestID: requestID,
			}
			
			// 记录内部错误的详细信息
			if errorType == InternalError {
				log.Printf("Internal error: %v\nStack trace:\n%s", err, getStackTrace())
			}
		}
		
		// 记录错误日志
		logError(c, err, statusCode, response)
		
		// 返回错误响应
		c.JSON(statusCode, response)
		c.Abort()
	}
}

// 记录错误日志
func logError(c *gin.Context, err error, statusCode int, response ErrorResponse) {
	// 构建日志信息
	logData := map[string]interface{}{
		"method":      c.Request.Method,
		"path":        c.Request.URL.Path,
		"status_code": statusCode,
		"error_type":  response.Error,
		"error_code":  response.Code,
		"message":     response.Message,
		"request_id":  response.RequestID,
		"user_agent":  c.Request.UserAgent(),
		"remote_ip":   c.ClientIP(),
	}
	
	// 根据错误严重程度选择日志级别
	if statusCode >= 500 {
		log.Printf("ERROR: %+v | Error: %v", logData, err)
	} else if statusCode >= 400 {
		log.Printf("WARN: %+v | Error: %v", logData, err)
	}
}

// Panic恢复中间件
func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				// 记录panic信息
				log.Printf("PANIC: %v\nStack trace:\n%s", r, getStackTrace())
				
				// 创建内部错误响应
				response := ErrorResponse{
					Error:     string(InternalError),
					Code:      errorCodeMap[InternalError],
					Message:   userMessageMap[errorCodeMap[InternalError]],
					Details:   "服务器遇到了意外错误",
					Timestamp: time.Now().Format(time.RFC3339),
					RequestID: getRequestID(c),
				}
				
				c.JSON(http.StatusInternalServerError, response)
				c.Abort()
			}
		}()
		
		c.Next()
	}
}

// 辅助函数：在处理器中抛出错误
func AbortWithError(c *gin.Context, err *AppError) {
	c.Error(err)
	c.Abort()
}

func AbortWithValidationError(c *gin.Context, field string, message string) {
	AbortWithError(c, NewValidationError(field, message))
}

func AbortWithNotFoundError(c *gin.Context, resource string) {
	AbortWithError(c, NewNotFoundError(resource))
}

func AbortWithDuplicateError(c *gin.Context, field string, value string) {
	AbortWithError(c, NewDuplicateError(field, value))
}

func AbortWithBusinessError(c *gin.Context, message string) {
	AbortWithError(c, NewAppError(BusinessError, message))
}

func AbortWithInternalError(c *gin.Context, message string) {
	AbortWithError(c, NewAppError(InternalError, message))
}