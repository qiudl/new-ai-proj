package models

// TemplateType 文档模板类型
type TemplateType string

const (
	TemplateBugReport        TemplateType = "bug_report"
	TemplateFeatureSpec      TemplateType = "feature_spec"
	TemplateMeetingNotes     TemplateType = "meeting_notes"
	TemplateProjectPlan      TemplateType = "project_plan"
	TemplateAPIDocumentation TemplateType = "api_documentation"
	TemplateTestPlan         TemplateType = "test_plan"
	TemplateUserStory        TemplateType = "user_story"
	TemplateTechnicalDesign  TemplateType = "technical_design"
)

// ValidTemplateTypes 所有有效的模板类型
var ValidTemplateTypes = []TemplateType{
	TemplateBugReport,
	TemplateFeatureSpec,
	TemplateMeetingNotes,
	TemplateProjectPlan,
	TemplateAPIDocumentation,
	TemplateTestPlan,
	TemplateUserStory,
	TemplateTechnicalDesign,
}

// IsValidTemplateType 验证模板类型是否有效
func IsValidTemplateType(t string) bool {
	for _, validType := range ValidTemplateTypes {
		if string(validType) == t {
			return true
		}
	}
	return false
}

// TemplateContext 模板上下文信息
type TemplateContext struct {
	// 通用字段
	Title        *string  `json:"title"`
	ProjectID    *int     `json:"projectId"`
	TaskID       *int     `json:"taskId"`
	Requirements *string  `json:"requirements"`
	Assignee     *string  `json:"assignee"`
	Priority     *string  `json:"priority"`
	Deadline     *string  `json:"deadline"`
	Tags         []string `json:"tags"`
}

// GenerateDocumentRequest 生成文档请求
type GenerateDocumentRequest struct {
	TemplateType string          `json:"templateType" binding:"required"`
	Context      TemplateContext `json:"context" binding:"required"`
	AutoCreate   bool            `json:"autoCreate"`
}

// GenerateDocumentResponse 生成文档响应
type GenerateDocumentResponse struct {
	Content    string                 `json:"content"`
	Metadata   map[string]interface{} `json:"metadata"`
	DocumentID *int                   `json:"document_id,omitempty"`
}
