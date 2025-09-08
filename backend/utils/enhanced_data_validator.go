package utils

import (
	"encoding/json"
	"fmt"
	"net/mail"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode"
)

// ValidationResult represents the result of a validation operation
type ValidationResult struct {
	IsValid         bool        `json:"is_valid"`
	Message         string      `json:"message,omitempty"`
	NormalizedValue interface{} `json:"normalized_value,omitempty"`
}

// ValidationRule represents a single validation rule
type ValidationRule func(interface{}) ValidationResult

// FieldValidationConfig contains validation configuration for a field
type FieldValidationConfig struct {
	Required bool                        `json:"required"`
	Rules    []ValidationRule            `json:"-"`
	Custom   map[string]ValidationRule   `json:"-"`
}

// EnhancedDataValidator provides comprehensive data validation
type EnhancedDataValidator struct {
	configs map[string]FieldValidationConfig
}

// NewEnhancedDataValidator creates a new enhanced data validator
func NewEnhancedDataValidator() *EnhancedDataValidator {
	return &EnhancedDataValidator{
		configs: make(map[string]FieldValidationConfig),
	}
}

// Basic Data Type Validators

// ValidateString validates string values with various options
func ValidateString(value interface{}, required bool, minLength, maxLength int, pattern *regexp.Regexp) ValidationResult {
	if value == nil {
		if required {
			return ValidationResult{IsValid: false, Message: "此字段为必填项"}
		}
		return ValidationResult{IsValid: true}
	}

	str, ok := value.(string)
	if !ok {
		return ValidationResult{IsValid: false, Message: "必须是字符串类型"}
	}

	str = strings.TrimSpace(str)

	if required && str == "" {
		return ValidationResult{IsValid: false, Message: "此字段不能为空"}
	}

	if minLength > 0 && len(str) < minLength {
		return ValidationResult{IsValid: false, Message: fmt.Sprintf("最少需要%d个字符", minLength)}
	}

	if maxLength > 0 && len(str) > maxLength {
		return ValidationResult{IsValid: false, Message: fmt.Sprintf("最多允许%d个字符", maxLength)}
	}

	if pattern != nil && str != "" && !pattern.MatchString(str) {
		return ValidationResult{IsValid: false, Message: "格式不正确"}
	}

	return ValidationResult{IsValid: true, NormalizedValue: str}
}

// ValidateNumber validates numeric values
func ValidateNumber(value interface{}, required bool, min, max *float64, integer, positive bool) ValidationResult {
	if value == nil {
		if required {
			return ValidationResult{IsValid: false, Message: "此字段为必填项"}
		}
		return ValidationResult{IsValid: true}
	}

	var numValue float64
	var err error

	switch v := value.(type) {
	case float64:
		numValue = v
	case float32:
		numValue = float64(v)
	case int:
		numValue = float64(v)
	case int64:
		numValue = float64(v)
	case string:
		numValue, err = strconv.ParseFloat(v, 64)
		if err != nil {
			return ValidationResult{IsValid: false, Message: "必须是有效数字"}
		}
	default:
		return ValidationResult{IsValid: false, Message: "必须是数字类型"}
	}

	if integer && numValue != float64(int64(numValue)) {
		return ValidationResult{IsValid: false, Message: "必须是整数"}
	}

	if positive && numValue <= 0 {
		return ValidationResult{IsValid: false, Message: "必须是正数"}
	}

	if min != nil && numValue < *min {
		return ValidationResult{IsValid: false, Message: fmt.Sprintf("不能小于%.2f", *min)}
	}

	if max != nil && numValue > *max {
		return ValidationResult{IsValid: false, Message: fmt.Sprintf("不能大于%.2f", *max)}
	}

	return ValidationResult{IsValid: true, NormalizedValue: numValue}
}

// ValidateDate validates date values
func ValidateDate(value interface{}, required bool, minDate, maxDate *time.Time, futureOnly, pastOnly bool) ValidationResult {
	if value == nil {
		if required {
			return ValidationResult{IsValid: false, Message: "此字段为必填项"}
		}
		return ValidationResult{IsValid: true}
	}

	var dateValue time.Time
	var err error

	switch v := value.(type) {
	case time.Time:
		dateValue = v
	case string:
		// Try multiple date formats
		formats := []string{
			time.RFC3339,
			"2006-01-02T15:04:05Z",
			"2006-01-02 15:04:05",
			"2006-01-02",
		}
		
		for _, format := range formats {
			dateValue, err = time.Parse(format, v)
			if err == nil {
				break
			}
		}
		
		if err != nil {
			return ValidationResult{IsValid: false, Message: "无效的日期格式"}
		}
	default:
		return ValidationResult{IsValid: false, Message: "无效的日期类型"}
	}

	now := time.Now()

	if futureOnly && !dateValue.After(now) {
		return ValidationResult{IsValid: false, Message: "日期必须是未来时间"}
	}

	if pastOnly && !dateValue.Before(now) {
		return ValidationResult{IsValid: false, Message: "日期必须是过去时间"}
	}

	if minDate != nil && dateValue.Before(*minDate) {
		return ValidationResult{IsValid: false, Message: fmt.Sprintf("日期不能早于%s", minDate.Format("2006-01-02"))}
	}

	if maxDate != nil && dateValue.After(*maxDate) {
		return ValidationResult{IsValid: false, Message: fmt.Sprintf("日期不能晚于%s", maxDate.Format("2006-01-02"))}
	}

	return ValidationResult{IsValid: true, NormalizedValue: dateValue}
}

// ValidateArray validates array/slice values
func ValidateArray(value interface{}, required bool, minLength, maxLength int, itemValidator ValidationRule) ValidationResult {
	if value == nil {
		if required {
			return ValidationResult{IsValid: false, Message: "此字段为必填项"}
		}
		return ValidationResult{IsValid: true}
	}

	// Convert to slice of interface{}
	var items []interface{}
	
	switch v := value.(type) {
	case []interface{}:
		items = v
	case []string:
		for _, item := range v {
			items = append(items, item)
		}
	case []int:
		for _, item := range v {
			items = append(items, item)
		}
	default:
		return ValidationResult{IsValid: false, Message: "必须是数组类型"}
	}

	if minLength > 0 && len(items) < minLength {
		return ValidationResult{IsValid: false, Message: fmt.Sprintf("至少需要%d个项目", minLength)}
	}

	if maxLength > 0 && len(items) > maxLength {
		return ValidationResult{IsValid: false, Message: fmt.Sprintf("最多允许%d个项目", maxLength)}
	}

	if itemValidator != nil {
		for i, item := range items {
			result := itemValidator(item)
			if !result.IsValid {
				return ValidationResult{IsValid: false, Message: fmt.Sprintf("第%d项：%s", i+1, result.Message)}
			}
		}
	}

	return ValidationResult{IsValid: true, NormalizedValue: items}
}

// Business-specific Format Validators

// ValidateEmail validates email addresses
func ValidateEmail(value interface{}) ValidationResult {
	if value == nil {
		return ValidationResult{IsValid: false, Message: "邮箱地址不能为空"}
	}

	str, ok := value.(string)
	if !ok {
		return ValidationResult{IsValid: false, Message: "邮箱地址必须是字符串类型"}
	}

	str = strings.TrimSpace(str)
	if str == "" {
		return ValidationResult{IsValid: false, Message: "邮箱地址不能为空"}
	}

	_, err := mail.ParseAddress(str)
	if err != nil {
		return ValidationResult{IsValid: false, Message: "邮箱格式不正确"}
	}

	return ValidationResult{IsValid: true, NormalizedValue: strings.ToLower(str)}
}

// ValidatePhoneNumber validates Chinese phone numbers
func ValidatePhoneNumber(value interface{}) ValidationResult {
	if value == nil {
		return ValidationResult{IsValid: true}
	}

	str, ok := value.(string)
	if !ok {
		return ValidationResult{IsValid: false, Message: "手机号码必须是字符串类型"}
	}

	str = strings.TrimSpace(str)
	if str == "" {
		return ValidationResult{IsValid: true}
	}

	phoneRegex := regexp.MustCompile(`^1[3-9]\d{9}$`)
	if !phoneRegex.MatchString(str) {
		return ValidationResult{IsValid: false, Message: "手机号码格式不正确"}
	}

	return ValidationResult{IsValid: true, NormalizedValue: str}
}

// ValidateURL validates URLs
func ValidateURL(value interface{}) ValidationResult {
	if value == nil {
		return ValidationResult{IsValid: true}
	}

	str, ok := value.(string)
	if !ok {
		return ValidationResult{IsValid: false, Message: "URL必须是字符串类型"}
	}

	str = strings.TrimSpace(str)
	if str == "" {
		return ValidationResult{IsValid: true}
	}

	urlRegex := regexp.MustCompile(`^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$`)
	if !urlRegex.MatchString(str) {
		return ValidationResult{IsValid: false, Message: "URL格式不正确"}
	}

	return ValidationResult{IsValid: true, NormalizedValue: str}
}

// ValidateIDCard validates Chinese ID cards
func ValidateIDCard(value interface{}) ValidationResult {
	if value == nil {
		return ValidationResult{IsValid: true}
	}

	str, ok := value.(string)
	if !ok {
		return ValidationResult{IsValid: false, Message: "身份证号码必须是字符串类型"}
	}

	str = strings.TrimSpace(strings.ToUpper(str))
	if str == "" {
		return ValidationResult{IsValid: true}
	}

	idCardRegex := regexp.MustCompile(`^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dX]$`)
	if !idCardRegex.MatchString(str) {
		return ValidationResult{IsValid: false, Message: "身份证号码格式不正确"}
	}

	// Validate check digit
	factors := []int{7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2}
	checkCodes := []string{"1", "0", "X", "9", "8", "7", "6", "5", "4", "3", "2"}

	sum := 0
	for i := 0; i < 17; i++ {
		digit, _ := strconv.Atoi(string(str[i]))
		sum += digit * factors[i]
	}

	expectedCheckCode := checkCodes[sum%11]
	if string(str[17]) != expectedCheckCode {
		return ValidationResult{IsValid: false, Message: "身份证号码校验位不正确"}
	}

	return ValidationResult{IsValid: true, NormalizedValue: str}
}

// ValidateCreditCode validates unified social credit codes
func ValidateCreditCode(value interface{}) ValidationResult {
	if value == nil {
		return ValidationResult{IsValid: true}
	}

	str, ok := value.(string)
	if !ok {
		return ValidationResult{IsValid: false, Message: "统一社会信用代码必须是字符串类型"}
	}

	str = strings.TrimSpace(strings.ToUpper(str))
	if str == "" {
		return ValidationResult{IsValid: true}
	}

	creditCodeRegex := regexp.MustCompile(`^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$`)
	if !creditCodeRegex.MatchString(str) {
		return ValidationResult{IsValid: false, Message: "统一社会信用代码格式不正确"}
	}

	return ValidationResult{IsValid: true, NormalizedValue: str}
}

// ValidateTaskStatus validates task status values
func ValidateTaskStatus(value interface{}) ValidationResult {
	if value == nil {
		return ValidationResult{IsValid: true}
	}

	str, ok := value.(string)
	if !ok {
		return ValidationResult{IsValid: false, Message: "任务状态必须是字符串类型"}
	}

	validStatuses := map[string]bool{
		"draft": true, "planning": true, "todo": true, "in_progress": true,
		"testing": true, "completed": true, "cancelled": true, "on_hold": true,
		"suspended": true, "blocked": true, "archived": true,
	}

	if !validStatuses[str] {
		return ValidationResult{IsValid: false, Message: "无效的任务状态"}
	}

	return ValidationResult{IsValid: true, NormalizedValue: str}
}

// ValidatePriority validates priority values
func ValidatePriority(value interface{}) ValidationResult {
	if value == nil {
		return ValidationResult{IsValid: true}
	}

	str, ok := value.(string)
	if !ok {
		return ValidationResult{IsValid: false, Message: "优先级必须是字符串类型"}
	}

	validPriorities := map[string]bool{
		"low": true, "medium": true, "high": true, "urgent": true,
	}

	if !validPriorities[str] {
		return ValidationResult{IsValid: false, Message: "无效的优先级"}
	}

	return ValidationResult{IsValid: true, NormalizedValue: str}
}

// ValidateEnterpriseCode validates enterprise codes
func ValidateEnterpriseCode(value interface{}) ValidationResult {
	if value == nil {
		return ValidationResult{IsValid: false, Message: "企业代码不能为空"}
	}

	str, ok := value.(string)
	if !ok {
		return ValidationResult{IsValid: false, Message: "企业代码必须是字符串类型"}
	}

	str = strings.TrimSpace(strings.ToUpper(str))
	if str == "" {
		return ValidationResult{IsValid: false, Message: "企业代码不能为空"}
	}

	if len(str) < 2 || len(str) > 20 {
		return ValidationResult{IsValid: false, Message: "企业代码长度必须在2-20位之间"}
	}

	for _, r := range str {
		if !((r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_') {
			return ValidationResult{IsValid: false, Message: "企业代码只能包含大写字母、数字和下划线"}
		}
	}

	return ValidationResult{IsValid: true, NormalizedValue: str}
}

// ValidateJSON validates JSON format
func ValidateJSON(value interface{}) ValidationResult {
	if value == nil {
		return ValidationResult{IsValid: true}
	}

	str, ok := value.(string)
	if !ok {
		return ValidationResult{IsValid: false, Message: "JSON必须是字符串类型"}
	}

	str = strings.TrimSpace(str)
	if str == "" {
		return ValidationResult{IsValid: true, NormalizedValue: nil}
	}

	var result interface{}
	if err := json.Unmarshal([]byte(str), &result); err != nil {
		return ValidationResult{IsValid: false, Message: "JSON格式不正确"}
	}

	return ValidationResult{IsValid: true, NormalizedValue: result}
}

// ValidatePassword validates password strength
func ValidatePassword(value interface{}) ValidationResult {
	if value == nil {
		return ValidationResult{IsValid: false, Message: "密码不能为空"}
	}

	str, ok := value.(string)
	if !ok {
		return ValidationResult{IsValid: false, Message: "密码必须是字符串类型"}
	}

	if len(str) < 8 {
		return ValidationResult{IsValid: false, Message: "密码长度至少8位"}
	}

	hasLower := false
	hasUpper := false
	hasDigit := false
	hasSpecial := false

	for _, r := range str {
		switch {
		case unicode.IsLower(r):
			hasLower = true
		case unicode.IsUpper(r):
			hasUpper = true
		case unicode.IsDigit(r):
			hasDigit = true
		case strings.ContainsRune("!@#$%^&*(),.?\":{}|<>", r):
			hasSpecial = true
		}
	}

	if !hasLower {
		return ValidationResult{IsValid: false, Message: "密码必须包含小写字母"}
	}
	if !hasUpper {
		return ValidationResult{IsValid: false, Message: "密码必须包含大写字母"}
	}
	if !hasDigit {
		return ValidationResult{IsValid: false, Message: "密码必须包含数字"}
	}
	if !hasSpecial {
		return ValidationResult{IsValid: false, Message: "密码必须包含特殊字符"}
	}

	return ValidationResult{IsValid: true, NormalizedValue: str}
}

// ValidateChineseName validates Chinese names
func ValidateChineseName(value interface{}) ValidationResult {
	if value == nil {
		return ValidationResult{IsValid: true}
	}

	str, ok := value.(string)
	if !ok {
		return ValidationResult{IsValid: false, Message: "姓名必须是字符串类型"}
	}

	str = strings.TrimSpace(str)
	if str == "" {
		return ValidationResult{IsValid: true}
	}

	if len(str) < 2 || len(str) > 20 {
		return ValidationResult{IsValid: false, Message: "姓名长度必须在2-20个字符之间"}
	}

	for _, r := range str {
		if !unicode.Is(unicode.Scripts["Han"], r) && r != ' ' {
			return ValidationResult{IsValid: false, Message: "姓名只能包含中文字符和空格"}
		}
	}

	return ValidationResult{IsValid: true, NormalizedValue: str}
}

// Composite Validators

// ValidateFields validates multiple fields according to their rules
func ValidateFields(data map[string]interface{}, rules map[string]ValidationRule) (bool, map[string]string, map[string]interface{}) {
	errors := make(map[string]string)
	normalizedData := make(map[string]interface{})
	isValid := true

	for field, validator := range rules {
		result := validator(data[field])
		
		if !result.IsValid {
			errors[field] = result.Message
			isValid = false
		} else if result.NormalizedValue != nil {
			normalizedData[field] = result.NormalizedValue
		} else {
			normalizedData[field] = data[field]
		}
	}

	return isValid, errors, normalizedData
}

// ValidateNestedObject validates nested object structures
func ValidateNestedObject(data interface{}, schema map[string]ValidationRule) ValidationResult {
	if data == nil {
		return ValidationResult{IsValid: false, Message: "数据不能为空"}
	}

	dataMap, ok := data.(map[string]interface{})
	if !ok {
		return ValidationResult{IsValid: false, Message: "必须是对象类型"}
	}

	errors := make([]string, 0)
	normalizedData := make(map[string]interface{})

	for key, validator := range schema {
		result := validator(dataMap[key])
		if !result.IsValid {
			errors = append(errors, fmt.Sprintf("%s: %s", key, result.Message))
		} else {
			if result.NormalizedValue != nil {
				normalizedData[key] = result.NormalizedValue
			} else {
				normalizedData[key] = dataMap[key]
			}
		}
	}

	if len(errors) > 0 {
		return ValidationResult{
			IsValid: false,
			Message: strings.Join(errors, "; "),
		}
	}

	return ValidationResult{
		IsValid:         true,
		NormalizedValue: normalizedData,
	}
}

// FileValidators for file upload validation

// FileValidationResult represents file validation result
type FileValidationResult struct {
	IsValid       bool   `json:"is_valid"`
	Message       string `json:"message,omitempty"`
	FileName      string `json:"file_name,omitempty"`
	FileSize      int64  `json:"file_size,omitempty"`
	MimeType      string `json:"mime_type,omitempty"`
}

// ValidateFileSize validates file size
func ValidateFileSize(fileSize int64, maxSizeMB int) FileValidationResult {
	maxSizeBytes := int64(maxSizeMB * 1024 * 1024)
	
	if fileSize > maxSizeBytes {
		return FileValidationResult{
			IsValid: false,
			Message: fmt.Sprintf("文件大小不能超过%dMB", maxSizeMB),
			FileSize: fileSize,
		}
	}

	return FileValidationResult{
		IsValid:  true,
		FileSize: fileSize,
	}
}

// ValidateFileExtension validates file extension
func ValidateFileExtension(fileName string, allowedExtensions []string) FileValidationResult {
	if fileName == "" {
		return FileValidationResult{
			IsValid: false,
			Message: "文件名不能为空",
		}
	}

	parts := strings.Split(fileName, ".")
	if len(parts) < 2 {
		return FileValidationResult{
			IsValid: false,
			Message: "文件必须有扩展名",
			FileName: fileName,
		}
	}

	extension := strings.ToLower(parts[len(parts)-1])
	
	for _, allowed := range allowedExtensions {
		if strings.ToLower(allowed) == extension {
			return FileValidationResult{
				IsValid:  true,
				FileName: fileName,
			}
		}
	}

	return FileValidationResult{
		IsValid:  false,
		Message:  fmt.Sprintf("只允许上传%s格式的文件", strings.Join(allowedExtensions, ", ")),
		FileName: fileName,
	}
}

// ValidateMimeType validates MIME type
func ValidateMimeType(mimeType string, allowedTypes []string) FileValidationResult {
	if mimeType == "" {
		return FileValidationResult{
			IsValid: false,
			Message: "无法识别文件类型",
		}
	}

	for _, allowed := range allowedTypes {
		if strings.Contains(mimeType, allowed) || strings.Contains(allowed, mimeType) {
			return FileValidationResult{
				IsValid:  true,
				MimeType: mimeType,
			}
		}
	}

	return FileValidationResult{
		IsValid:  false,
		Message:  fmt.Sprintf("不支持的文件类型: %s", mimeType),
		MimeType: mimeType,
	}
}

// Sanitization Functions

// SanitizeString removes potentially harmful characters from strings
func SanitizeString(input string) string {
	// Remove HTML tags
	htmlRegex := regexp.MustCompile(`<[^>]*>`)
	cleaned := htmlRegex.ReplaceAllString(input, "")
	
	// Remove script tags and their content
	scriptRegex := regexp.MustCompile(`(?i)<script[^>]*>.*?</script>`)
	cleaned = scriptRegex.ReplaceAllString(cleaned, "")
	
	// Trim whitespace
	cleaned = strings.TrimSpace(cleaned)
	
	return cleaned
}

// SanitizeHTML removes or escapes potentially dangerous HTML
func SanitizeHTML(input string) string {
	// This is a basic implementation - in production you'd want to use a proper HTML sanitizer
	input = strings.ReplaceAll(input, "<script", "&lt;script")
	input = strings.ReplaceAll(input, "</script>", "&lt;/script&gt;")
	input = strings.ReplaceAll(input, "javascript:", "")
	input = strings.ReplaceAll(input, "onclick", "")
	input = strings.ReplaceAll(input, "onerror", "")
	
	return input
}