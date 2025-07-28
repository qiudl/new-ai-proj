package services

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"ai-project-backend/models"
)

// SmartTemplateService 智能模板服务
type SmartTemplateService struct {
	db *sql.DB
}

// NewSmartTemplateService 创建智能模板服务实例
func NewSmartTemplateService(db *sql.DB) *SmartTemplateService {
	return &SmartTemplateService{
		db: db,
	}
}

// TemplateType 模板类型
type TemplateType string

const (
	TemplateTypeTask      TemplateType = "task"
	TemplateTypeProject   TemplateType = "project"
	TemplateTypeCustom    TemplateType = "custom"
	TemplateTypeAI        TemplateType = "ai_generated"
)

// TaskDocumentTemplate 任务文档模板
type TaskDocumentTemplate struct {
	ID          int                    `json:"id"`
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Type        TemplateType           `json:"type"`
	Category    string                 `json:"category"`
	Content     string                 `json:"content"`
	Variables   []TemplateVariable     `json:"variables"`
	Conditions  []TemplateCondition    `json:"conditions"`
	Metadata    models.CustomFields    `json:"metadata"`
	UsageCount  int                    `json:"usage_count"`
	CreatedBy   int                    `json:"created_by"`
	CreatedAt   time.Time             `json:"created_at"`
	UpdatedAt   time.Time             `json:"updated_at"`
	IsActive    bool                  `json:"is_active"`
}

// TemplateVariable 模板变量
type TemplateVariable struct {
	Name         string      `json:"name"`
	Type         string      `json:"type"`         // string, number, date, select, boolean
	DefaultValue interface{} `json:"default_value"`
	Options      []string    `json:"options,omitempty"` // for select type
	Required     bool        `json:"required"`
	Description  string      `json:"description"`
}

// TemplateCondition 模板应用条件
type TemplateCondition struct {
	Field    string      `json:"field"`    // task.status, task.priority, project.type
	Operator string      `json:"operator"` // equals, contains, starts_with, in
	Value    interface{} `json:"value"`
	Weight   float64     `json:"weight"`   // 匹配权重
}

// TemplateGenerationRequest 模板生成请求
type TemplateGenerationRequest struct {
	TaskID      int                    `json:"task_id"`
	ProjectID   int                    `json:"project_id"`
	TaskTitle   string                 `json:"task_title"`
	TaskStatus  string                 `json:"task_status"`
	Priority    string                 `json:"priority,omitempty"`
	Category    string                 `json:"category,omitempty"`
	Context     models.CustomFields    `json:"context,omitempty"`
	UserPrefs   map[string]interface{} `json:"user_preferences,omitempty"`
}

// TemplateRecommendation 模板推荐
type TemplateRecommendation struct {
	Template    TaskDocumentTemplate `json:"template"`
	Score       float64             `json:"score"`
	Reason      string              `json:"reason"`
	Variables   map[string]interface{} `json:"variables,omitempty"`
}

// ====================
// 智能模板推荐
// ====================

// GetRecommendedTemplates 获取推荐模板
func (s *SmartTemplateService) GetRecommendedTemplates(ctx context.Context, req TemplateGenerationRequest) ([]TemplateRecommendation, error) {
	// 获取所有活跃的模板
	templates, err := s.GetActiveTemplates(ctx)
	if err != nil {
		return nil, err
	}
	
	// 获取任务详细信息
	taskInfo, err := s.getTaskInfo(ctx, req.TaskID, req.ProjectID)
	if err != nil {
		return nil, err
	}
	
	var recommendations []TemplateRecommendation
	
	// 为每个模板计算匹配分数
	for _, template := range templates {
		score := s.calculateTemplateScore(template, taskInfo, req)
		if score > 0.1 { // 只返回分数大于阈值的模板
			recommendation := TemplateRecommendation{
				Template: template,
				Score:    score,
				Reason:   s.generateRecommendationReason(template, taskInfo, score),
				Variables: s.generateTemplateVariables(template, taskInfo, req),
			}
			recommendations = append(recommendations, recommendation)
		}
	}
	
	// 按分数排序
	for i := 0; i < len(recommendations)-1; i++ {
		for j := i + 1; j < len(recommendations); j++ {
			if recommendations[i].Score < recommendations[j].Score {
				recommendations[i], recommendations[j] = recommendations[j], recommendations[i]
			}
		}
	}
	
	// 返回前5个推荐
	if len(recommendations) > 5 {
		recommendations = recommendations[:5]
	}
	
	return recommendations, nil
}

// calculateTemplateScore 计算模板匹配分数
func (s *SmartTemplateService) calculateTemplateScore(template TaskDocumentTemplate, taskInfo *TaskInfo, req TemplateGenerationRequest) float64 {
	score := 0.0
	
	// 基础分数
	score += 0.1
	
	// 基于条件的匹配
	for _, condition := range template.Conditions {
		if s.evaluateCondition(condition, taskInfo, req) {
			score += condition.Weight
		}
	}
	
	// 基于使用频率的推荐
	if template.UsageCount > 0 {
		score += float64(template.UsageCount) * 0.01 // 每次使用增加0.01分
	}
	
	// 基于任务标题的语义匹配（简化版）
	if s.semanticMatch(template.Name, req.TaskTitle) {
		score += 0.2
	}
	
	// 基于分类匹配
	if req.Category != "" && template.Category == req.Category {
		score += 0.3
	}
	
	return score
}

// evaluateCondition 评估模板条件
func (s *SmartTemplateService) evaluateCondition(condition TemplateCondition, taskInfo *TaskInfo, req TemplateGenerationRequest) bool {
	var fieldValue interface{}
	
	switch condition.Field {
	case "task.status":
		fieldValue = taskInfo.Status
	case "task.priority":
		fieldValue = req.Priority
	case "task.title":
		fieldValue = taskInfo.Title
	case "project.type":
		fieldValue = taskInfo.ProjectType
	default:
		return false
	}
	
	switch condition.Operator {
	case "equals":
		return fmt.Sprintf("%v", fieldValue) == fmt.Sprintf("%v", condition.Value)
	case "contains":
		return strings.Contains(strings.ToLower(fmt.Sprintf("%v", fieldValue)), strings.ToLower(fmt.Sprintf("%v", condition.Value)))
	case "starts_with":
		return strings.HasPrefix(strings.ToLower(fmt.Sprintf("%v", fieldValue)), strings.ToLower(fmt.Sprintf("%v", condition.Value)))
	case "in":
		if values, ok := condition.Value.([]interface{}); ok {
			for _, v := range values {
				if fmt.Sprintf("%v", fieldValue) == fmt.Sprintf("%v", v) {
					return true
				}
			}
		}
	}
	
	return false
}

// semanticMatch 语义匹配（简化版）
func (s *SmartTemplateService) semanticMatch(templateName, taskTitle string) bool {
	templateWords := strings.Fields(strings.ToLower(templateName))
	titleWords := strings.Fields(strings.ToLower(taskTitle))
	
	matchCount := 0
	for _, templateWord := range templateWords {
		for _, titleWord := range titleWords {
			if strings.Contains(titleWord, templateWord) || strings.Contains(templateWord, titleWord) {
				matchCount++
				break
			}
		}
	}
	
	return float64(matchCount)/float64(len(templateWords)) > 0.3
}

// generateRecommendationReason 生成推荐理由
func (s *SmartTemplateService) generateRecommendationReason(template TaskDocumentTemplate, taskInfo *TaskInfo, score float64) string {
	reasons := []string{}
	
	if score > 0.8 {
		reasons = append(reasons, "高度匹配您的任务类型")
	} else if score > 0.5 {
		reasons = append(reasons, "适合您的任务场景")
	}
	
	if template.UsageCount > 10 {
		reasons = append(reasons, "广受欢迎的模板")
	}
	
	if len(reasons) == 0 {
		reasons = append(reasons, "基于任务特征推荐")
	}
	
	return strings.Join(reasons, "，")
}

// generateTemplateVariables 生成模板变量值
func (s *SmartTemplateService) generateTemplateVariables(template TaskDocumentTemplate, taskInfo *TaskInfo, req TemplateGenerationRequest) map[string]interface{} {
	variables := make(map[string]interface{})
	
	for _, variable := range template.Variables {
		switch variable.Name {
		case "task_title":
			variables[variable.Name] = taskInfo.Title
		case "task_status":
			variables[variable.Name] = taskInfo.Status
		case "project_name":
			variables[variable.Name] = taskInfo.ProjectName
		case "current_date":
			variables[variable.Name] = time.Now().Format("2006-01-02")
		case "assignee_name":
			variables[variable.Name] = taskInfo.AssigneeName
		default:
			if variable.DefaultValue != nil {
				variables[variable.Name] = variable.DefaultValue
			}
		}
	}
	
	return variables
}

// ====================
// 模板生成
// ====================

// GenerateDocumentFromTemplate 从模板生成文档
func (s *SmartTemplateService) GenerateDocumentFromTemplate(ctx context.Context, templateID int, variables map[string]interface{}) (string, error) {
	// 获取模板
	template, err := s.GetTemplateByID(ctx, templateID)
	if err != nil {
		return "", err
	}
	
	// 替换模板变量
	content := template.Content
	for name, value := range variables {
		placeholder := fmt.Sprintf("{{%s}}", name)
		content = strings.ReplaceAll(content, placeholder, fmt.Sprintf("%v", value))
	}
	
	// 处理条件块（简化版）
	content = s.processConditionalBlocks(content, variables)
	
	// 更新使用次数
	s.incrementTemplateUsage(ctx, templateID)
	
	return content, nil
}

// processConditionalBlocks 处理条件块
func (s *SmartTemplateService) processConditionalBlocks(content string, variables map[string]interface{}) string {
	// 简化的条件块处理
	// 格式: {{#if variable_name}}content{{/if}}
	
	lines := strings.Split(content, "\n")
	var result []string
	inCondition := false
	conditionMet := false
	
	for _, line := range lines {
		if strings.Contains(line, "{{#if ") {
			// 提取条件变量名
			start := strings.Index(line, "{{#if ") + 6
			end := strings.Index(line[start:], "}}")
			if end > 0 {
				varName := strings.TrimSpace(line[start : start+end])
				conditionMet = variables[varName] != nil && variables[varName] != ""
				inCondition = true
			}
		} else if strings.Contains(line, "{{/if}}") {
			inCondition = false
		} else if !inCondition || conditionMet {
			result = append(result, line)
		}
	}
	
	return strings.Join(result, "\n")
}

// ====================
// 模板管理
// ====================

// CreateTemplate 创建模板
func (s *SmartTemplateService) CreateTemplate(ctx context.Context, template TaskDocumentTemplate) (*TaskDocumentTemplate, error) {
	err := s.db.QueryRowContext(ctx, `
		INSERT INTO task_document_templates 
		(name, description, type, category, content, variables, conditions, metadata, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at
	`, template.Name, template.Description, template.Type, template.Category,
		template.Content, template.Variables, template.Conditions, template.Metadata, template.CreatedBy).Scan(
		&template.ID, &template.CreatedAt, &template.UpdatedAt)
	
	if err != nil {
		return nil, err
	}
	
	return &template, nil
}

// GetActiveTemplates 获取活跃模板
func (s *SmartTemplateService) GetActiveTemplates(ctx context.Context) ([]TaskDocumentTemplate, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, name, description, type, category, content, variables, conditions, 
			   metadata, usage_count, created_by, created_at, updated_at, is_active
		FROM task_document_templates 
		WHERE is_active = true
		ORDER BY usage_count DESC, created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var templates []TaskDocumentTemplate
	for rows.Next() {
		var template TaskDocumentTemplate
		err := rows.Scan(
			&template.ID, &template.Name, &template.Description, &template.Type,
			&template.Category, &template.Content, &template.Variables, &template.Conditions,
			&template.Metadata, &template.UsageCount, &template.CreatedBy,
			&template.CreatedAt, &template.UpdatedAt, &template.IsActive,
		)
		if err != nil {
			return nil, err
		}
		templates = append(templates, template)
	}
	
	return templates, nil
}

// GetTemplateByID 根据ID获取模板
func (s *SmartTemplateService) GetTemplateByID(ctx context.Context, templateID int) (*TaskDocumentTemplate, error) {
	var template TaskDocumentTemplate
	err := s.db.QueryRowContext(ctx, `
		SELECT id, name, description, type, category, content, variables, conditions,
			   metadata, usage_count, created_by, created_at, updated_at, is_active
		FROM task_document_templates 
		WHERE id = $1
	`, templateID).Scan(
		&template.ID, &template.Name, &template.Description, &template.Type,
		&template.Category, &template.Content, &template.Variables, &template.Conditions,
		&template.Metadata, &template.UsageCount, &template.CreatedBy,
		&template.CreatedAt, &template.UpdatedAt, &template.IsActive,
	)
	
	if err != nil {
		return nil, err
	}
	
	return &template, nil
}

// incrementTemplateUsage 增加模板使用次数
func (s *SmartTemplateService) incrementTemplateUsage(ctx context.Context, templateID int) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE task_document_templates 
		SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`, templateID)
	
	return err
}

// ====================
// 辅助结构和方法
// ====================

// TaskInfo 任务信息
type TaskInfo struct {
	ID           int
	Title        string
	Status       string
	Priority     string
	ProjectID    int
	ProjectName  string
	ProjectType  string
	AssigneeID   *int
	AssigneeName string
	CreatedAt    time.Time
}

// getTaskInfo 获取任务信息
func (s *SmartTemplateService) getTaskInfo(ctx context.Context, taskID, projectID int) (*TaskInfo, error) {
	var taskInfo TaskInfo
	err := s.db.QueryRowContext(ctx, `
		SELECT t.id, t.title, t.status, t.project_id, p.name as project_name,
			   COALESCE(t.assignee_id, 0), COALESCE(u.username, ''),
			   t.created_at, p.description as project_type
		FROM tasks t
		JOIN projects p ON t.project_id = p.id
		LEFT JOIN users u ON t.assignee_id = u.id
		WHERE t.id = $1 AND t.project_id = $2 AND t.deleted_at IS NULL
	`, taskID, projectID).Scan(
		&taskInfo.ID, &taskInfo.Title, &taskInfo.Status, &taskInfo.ProjectID,
		&taskInfo.ProjectName, &taskInfo.AssigneeID, &taskInfo.AssigneeName,
		&taskInfo.CreatedAt, &taskInfo.ProjectType,
	)
	
	if err != nil {
		return nil, err
	}
	
	return &taskInfo, nil
}