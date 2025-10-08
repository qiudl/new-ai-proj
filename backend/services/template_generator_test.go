package services

import (
	"strings"
	"testing"

	"ai-project-backend/models"
)

func TestNewTemplateGenerator(t *testing.T) {
	generator := NewTemplateGenerator()
	if generator == nil {
		t.Fatal("NewTemplateGenerator() returned nil")
	}
}

func TestGenerateBugReport(t *testing.T) {
	generator := NewTemplateGenerator()

	title := "测试Bug报告"
	requirements := "系统崩溃问题"
	priority := "high"
	assignee := "张三"
	deadline := "2025-10-15"

	ctx := models.TemplateContext{
		Title:        &title,
		Requirements: &requirements,
		Priority:     &priority,
		Assignee:     &assignee,
		Deadline:     &deadline,
	}

	content, metadata, err := generator.Generate(models.TemplateBugReport, ctx)

	if err != nil {
		t.Fatalf("Generate() failed: %v", err)
	}

	if content == "" {
		t.Error("Generated content is empty")
	}

	if metadata == nil {
		t.Fatal("Metadata is nil")
	}

	if metadata["template_type"] != models.TemplateBugReport {
		t.Errorf("Expected template_type %s, got %v", models.TemplateBugReport, metadata["template_type"])
	}

	// 检查内容包含关键字段
	if !strings.Contains(content, title) {
		t.Errorf("Content does not contain title: %s", title)
	}

	if !strings.Contains(content, requirements) {
		t.Errorf("Content does not contain requirements: %s", requirements)
	}

	if !strings.Contains(content, priority) {
		t.Errorf("Content does not contain priority: %s", priority)
	}
}

func TestGenerateFeatureSpec(t *testing.T) {
	generator := NewTemplateGenerator()

	title := "用户登录功能"
	requirements := "实现用户名密码登录"

	ctx := models.TemplateContext{
		Title:        &title,
		Requirements: &requirements,
	}

	content, metadata, err := generator.Generate(models.TemplateFeatureSpec, ctx)

	if err != nil {
		t.Fatalf("Generate() failed: %v", err)
	}

	if content == "" {
		t.Error("Generated content is empty")
	}

	// 检查Mermaid图表
	if !strings.Contains(content, "```mermaid") {
		t.Error("Content does not contain Mermaid diagram")
	}

	if !strings.Contains(content, "graph LR") {
		t.Error("Content does not contain graph definition")
	}

	if metadata["template_type"] != models.TemplateFeatureSpec {
		t.Errorf("Expected template_type %s, got %v", models.TemplateFeatureSpec, metadata["template_type"])
	}
}

func TestGenerateTechnicalDesign(t *testing.T) {
	generator := NewTemplateGenerator()

	title := "微服务架构设计"
	requirements := "设计可扩展的微服务系统"

	ctx := models.TemplateContext{
		Title:        &title,
		Requirements: &requirements,
	}

	content, metadata, err := generator.Generate(models.TemplateTechnicalDesign, ctx)

	if err != nil {
		t.Fatalf("Generate() failed: %v", err)
	}

	if content == "" {
		t.Error("Generated content is empty")
	}

	// 检查技术设计的关键部分
	if !strings.Contains(content, "系统架构") {
		t.Error("Content does not contain system architecture section")
	}

	if !strings.Contains(content, "数据模型设计") {
		t.Error("Content does not contain data model design section")
	}

	if !strings.Contains(content, "API设计") {
		t.Error("Content does not contain API design section")
	}

	if metadata["template_type"] != models.TemplateTechnicalDesign {
		t.Errorf("Expected template_type %s, got %v", models.TemplateTechnicalDesign, metadata["template_type"])
	}
}

func TestGenerateMeetingNotes(t *testing.T) {
	generator := NewTemplateGenerator()

	title := "项目启动会议"

	ctx := models.TemplateContext{
		Title: &title,
	}

	content, metadata, err := generator.Generate(models.TemplateMeetingNotes, ctx)

	if err != nil {
		t.Fatalf("Generate() failed: %v", err)
	}

	if content == "" {
		t.Error("Generated content is empty")
	}

	if metadata["template_type"] != models.TemplateMeetingNotes {
		t.Errorf("Expected template_type %s, got %v", models.TemplateMeetingNotes, metadata["template_type"])
	}
}

func TestGenerateProjectPlan(t *testing.T) {
	generator := NewTemplateGenerator()

	title := "Q4产品路线图"

	ctx := models.TemplateContext{
		Title: &title,
	}

	content, metadata, err := generator.Generate(models.TemplateProjectPlan, ctx)

	if err != nil {
		t.Fatalf("Generate() failed: %v", err)
	}

	if content == "" {
		t.Error("Generated content is empty")
	}

	if metadata["template_type"] != models.TemplateProjectPlan {
		t.Errorf("Expected template_type %s, got %v", models.TemplateProjectPlan, metadata["template_type"])
	}
}

func TestGenerateAPIDocumentation(t *testing.T) {
	generator := NewTemplateGenerator()

	title := "REST API文档"

	ctx := models.TemplateContext{
		Title: &title,
	}

	content, metadata, err := generator.Generate(models.TemplateAPIDocumentation, ctx)

	if err != nil {
		t.Fatalf("Generate() failed: %v", err)
	}

	if content == "" {
		t.Error("Generated content is empty")
	}

	if metadata["template_type"] != models.TemplateAPIDocumentation {
		t.Errorf("Expected template_type %s, got %v", models.TemplateAPIDocumentation, metadata["template_type"])
	}
}

func TestGenerateTestPlan(t *testing.T) {
	generator := NewTemplateGenerator()

	title := "支付模块测试计划"

	ctx := models.TemplateContext{
		Title: &title,
	}

	content, metadata, err := generator.Generate(models.TemplateTestPlan, ctx)

	if err != nil {
		t.Fatalf("Generate() failed: %v", err)
	}

	if content == "" {
		t.Error("Generated content is empty")
	}

	if metadata["template_type"] != models.TemplateTestPlan {
		t.Errorf("Expected template_type %s, got %v", models.TemplateTestPlan, metadata["template_type"])
	}
}

func TestGenerateUserStory(t *testing.T) {
	generator := NewTemplateGenerator()

	title := "用户注册故事"
	requirements := "作为新用户，我希望能够注册账号"

	ctx := models.TemplateContext{
		Title:        &title,
		Requirements: &requirements,
	}

	content, metadata, err := generator.Generate(models.TemplateUserStory, ctx)

	if err != nil {
		t.Fatalf("Generate() failed: %v", err)
	}

	if content == "" {
		t.Error("Generated content is empty")
	}

	if metadata["template_type"] != models.TemplateUserStory {
		t.Errorf("Expected template_type %s, got %v", models.TemplateUserStory, metadata["template_type"])
	}
}

func TestGenerateWithEmptyContext(t *testing.T) {
	generator := NewTemplateGenerator()

	ctx := models.TemplateContext{}

	content, metadata, err := generator.Generate(models.TemplateBugReport, ctx)

	if err != nil {
		t.Fatalf("Generate() failed with empty context: %v", err)
	}

	if content == "" {
		t.Error("Generated content is empty")
	}

	// 应该使用默认值
	if !strings.Contains(content, "Bug报告") || !strings.Contains(content, "待补充") {
		t.Error("Content does not contain default values")
	}

	if metadata == nil {
		t.Error("Metadata should not be nil")
	}
}

func TestGenerateWithInvalidTemplateType(t *testing.T) {
	generator := NewTemplateGenerator()

	ctx := models.TemplateContext{}

	_, _, err := generator.Generate("invalid_template", ctx)

	if err == nil {
		t.Error("Expected error for invalid template type, got nil")
	}

	expectedError := "不支持的模板类型"
	if !strings.Contains(err.Error(), expectedError) {
		t.Errorf("Expected error message to contain '%s', got: %v", expectedError, err)
	}
}

func TestGetOrDefault(t *testing.T) {
	tests := []struct {
		name         string
		ptr          *string
		defaultValue string
		expected     string
	}{
		{
			name:         "Non-nil pointer with value",
			ptr:          testStringPtr("test value"),
			defaultValue: "default",
			expected:     "test value",
		},
		{
			name:         "Nil pointer",
			ptr:          nil,
			defaultValue: "default",
			expected:     "default",
		},
		{
			name:         "Empty string pointer",
			ptr:          testStringPtr(""),
			defaultValue: "default",
			expected:     "default",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getOrDefault(tt.ptr, tt.defaultValue)
			if result != tt.expected {
				t.Errorf("getOrDefault() = %v, want %v", result, tt.expected)
			}
		})
	}
}

// Helper function for creating string pointers for tests
func testStringPtr(s string) *string {
	return &s
}

func TestAllTemplateTypesGenerate(t *testing.T) {
	generator := NewTemplateGenerator()

	title := "测试文档"
	ctx := models.TemplateContext{
		Title: &title,
	}

	templateTypes := []models.TemplateType{
		models.TemplateBugReport,
		models.TemplateFeatureSpec,
		models.TemplateMeetingNotes,
		models.TemplateProjectPlan,
		models.TemplateAPIDocumentation,
		models.TemplateTestPlan,
		models.TemplateUserStory,
		models.TemplateTechnicalDesign,
	}

	for _, templateType := range templateTypes {
		t.Run(string(templateType), func(t *testing.T) {
			content, metadata, err := generator.Generate(templateType, ctx)

			if err != nil {
				t.Fatalf("Generate(%s) failed: %v", templateType, err)
			}

			if content == "" {
				t.Errorf("Generate(%s) returned empty content", templateType)
			}

			if metadata == nil {
				t.Errorf("Generate(%s) returned nil metadata", templateType)
			}

			if metadata["template_type"] != templateType {
				t.Errorf("Generate(%s) metadata mismatch: got %v", templateType, metadata["template_type"])
			}

			if metadata["generated_at"] == nil {
				t.Errorf("Generate(%s) missing generated_at in metadata", templateType)
			}
		})
	}
}

