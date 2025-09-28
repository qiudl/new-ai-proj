package services

import (
	"context"
	"fmt"
	"strings"
	"time"
)

// GeneratedTask represents a task created for testing
type GeneratedTask struct {
	ID          int       `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Category    string    `json:"category"`
	Priority    string    `json:"priority"`
	CreatedAt   time.Time `json:"created_at"`
}

// GeneratedTimerSession represents a timer session for testing
type GeneratedTimerSession struct {
	ID              int                `json:"id"`
	TaskID          *int               `json:"task_id,omitempty"`
	UserID          int                `json:"user_id"`
	StartTime       time.Time          `json:"start_time"`
	EndTime         *time.Time         `json:"end_time,omitempty"`
	DurationSeconds int                `json:"duration_seconds"`
	Description     string             `json:"description"`
	IsTestData      bool               `json:"is_test_data"`
	CreatedAt       time.Time          `json:"created_at"`
}

// Feature and component names for realistic task generation
var (
	featureNames = []string{
		"用户认证", "数据分析", "报告生成", "文件上传", "邮件通知",
		"权限管理", "日志记录", "缓存系统", "搜索功能", "导出功能",
		"API接口", "移动适配", "性能监控", "安全加固", "界面优化",
	}
	
	componentNames = []string{
		"登录模块", "数据库连接", "前端组件", "后端服务", "配置系统",
		"文件处理", "图片上传", "表单验证", "路由系统", "中间件",
		"定时任务", "消息队列", "缓存层", "日志系统", "监控面板",
	}
	
	moduleNames = []string{
		"用户手册", "API文档", "部署指南", "开发规范", "测试文档",
		"系统架构", "数据库设计", "接口规范", "安全指南", "操作手册",
	}
	
	technologyNames = []string{
		"React", "Vue", "Docker", "Kubernetes", "Redis",
		"PostgreSQL", "GraphQL", "WebSocket", "微服务", "云原生",
		"机器学习", "区块链", "人工智能", "大数据", "物联网",
	}
	
	meetingTypes = []string{
		"需求评审", "技术分享", "项目同步", "代码审查", "架构讨论",
		"产品规划", "用户研究", "团队建设", "培训学习", "问题解决",
	}
)

// generateTasks creates realistic tasks for testing
func (s *TestDataGeneratorService) generateTasks(ctx context.Context, taskCount int, categories []string, userID int) ([]*GeneratedTask, error) {
	tasks := make([]*GeneratedTask, 0, taskCount)
	
	// If no categories specified, use all available
	if len(categories) == 0 {
		categories = []string{"开发", "调试", "文档", "测试", "会议", "研究"}
	}
	
	for i := 0; i < taskCount; i++ {
		task := s.generateSingleTask(i+1, categories, userID)
		tasks = append(tasks, task)
	}
	
	return tasks, nil
}

// generateSingleTask creates a single realistic task
func (s *TestDataGeneratorService) generateSingleTask(index int, categories []string, userID int) *GeneratedTask {
	// Select random category and template
	category := categories[s.random.Intn(len(categories))]
	template := s.getTemplateByCategory(category)
	
	// Generate realistic title and description
	title := s.generateTaskTitle(template, category)
	description := s.generateTaskDescription(template, category, title)
	
	return &GeneratedTask{
		ID:          index, // Will be updated when persisted
		Title:       title,
		Description: description,
		Category:    category,
		Priority:    template.Priority,
		CreatedAt:   time.Now(),
	}
}

// getTemplateByCategory finds template matching category
func (s *TestDataGeneratorService) getTemplateByCategory(category string) TaskTemplate {
	for _, template := range s.templates {
		if template.Category == category {
			return template
		}
	}
	// Return default template if not found
	return s.templates[0]
}

// generateTaskTitle creates a realistic task title
func (s *TestDataGeneratorService) generateTaskTitle(template TaskTemplate, category string) string {
	titlePattern := template.TitlePattern
	
	switch category {
	case "开发":
		feature := featureNames[s.random.Intn(len(featureNames))]
		return strings.Replace(titlePattern, "{feature}", feature, -1)
	case "调试":
		component := componentNames[s.random.Intn(len(componentNames))]
		return strings.Replace(titlePattern, "{component}", component, -1)
	case "文档":
		module := moduleNames[s.random.Intn(len(moduleNames))]
		return strings.Replace(titlePattern, "{module}", module, -1)
	case "测试":
		feature := featureNames[s.random.Intn(len(featureNames))]
		return strings.Replace(titlePattern, "{feature}", feature, -1)
	case "会议":
		meetingType := meetingTypes[s.random.Intn(len(meetingTypes))]
		return strings.Replace(titlePattern, "{meeting_type}", meetingType, -1)
	case "研究":
		technology := technologyNames[s.random.Intn(len(technologyNames))]
		return strings.Replace(titlePattern, "{technology}", technology, -1)
	default:
		return titlePattern
	}
}

// generateTaskDescription creates a realistic task description
func (s *TestDataGeneratorService) generateTaskDescription(template TaskTemplate, category string, title string) string {
	descriptions := map[string][]string{
		"开发": {
			"需要实现完整的功能模块，包括前端界面和后端接口",
			"按照产品需求文档开发新功能，确保代码质量和性能",
			"开发时需要考虑安全性和可扩展性",
			"完成开发后需要进行自测和代码审查",
		},
		"调试": {
			"定位并修复报告的问题，分析根本原因",
			"重现问题并确认修复方案的有效性",
			"修复后需要回归测试确保不影响其他功能",
			"更新相关文档和测试用例",
		},
		"文档": {
			"编写详细的技术文档，包括使用说明和示例",
			"确保文档内容准确、完整、易懂",
			"添加必要的图表和代码示例",
			"定期更新文档内容保持与系统同步",
		},
		"测试": {
			"设计和执行测试用例，覆盖各种场景",
			"进行功能测试、性能测试和安全测试",
			"记录测试结果并跟踪问题解决进度",
			"自动化测试脚本的编写和维护",
		},
		"会议": {
			"准备会议议程和相关材料",
			"积极参与讨论并提供技术建议",
			"会议后整理要点和行动计划",
			"跟进会议决议的执行情况",
		},
		"研究": {
			"深入研究相关技术的原理和最佳实践",
			"对比不同技术方案的优缺点",
			"编写技术调研报告和实践总结",
			"与团队分享研究成果和经验",
		},
	}
	
	categoryDescriptions, exists := descriptions[category]
	if !exists {
		return fmt.Sprintf("完成 %s 相关的工作任务", title)
	}
	
	selectedDesc := categoryDescriptions[s.random.Intn(len(categoryDescriptions))]
	return fmt.Sprintf("%s。%s", title, selectedDesc)
}

// generateTimerSessions creates realistic timer sessions
func (s *TestDataGeneratorService) generateTimerSessions(
	ctx context.Context,
	schedule *WorkSchedule,
	tasks []*GeneratedTask,
	pattern WorkPattern,
	userID int,
) ([]*GeneratedTimerSession, error) {
	
	sessions := make([]*GeneratedTimerSession, 0)
	sessionID := 1
	
	for _, daySchedule := range schedule.Days {
		for _, sessionSchedule := range daySchedule.Sessions {
			session := s.generateTimerSession(
				sessionID,
				sessionSchedule,
				tasks,
				userID,
				pattern,
			)
			sessions = append(sessions, session)
			sessionID++
		}
	}
	
	return sessions, nil
}

// generateTimerSession creates a single timer session
func (s *TestDataGeneratorService) generateTimerSession(
	sessionID int,
	schedule SessionSchedule,
	tasks []*GeneratedTask,
	userID int,
	pattern WorkPattern,
) *GeneratedTimerSession {
	
	// Select task for this session
	var taskID *int
	var description string
	
	if schedule.TaskIndex < len(tasks) {
		task := tasks[schedule.TaskIndex]
		taskID = &task.ID
		description = fmt.Sprintf("工作于: %s", task.Title)
	} else {
		// Personal timer task
		description = "个人计时任务"
	}
	
	// Calculate end time (removed unused variable)
	_ = schedule.StartTime.Add(time.Duration(schedule.DurationMins) * time.Minute)
	
	// Add some realistic variation to timing
	variation := s.randomInt(-5, 5) // ±5 minutes variation
	actualDuration := schedule.DurationMins + variation
	if actualDuration < 5 {
		actualDuration = 5 // Minimum 5 minutes
	}
	
	actualEndTime := schedule.StartTime.Add(time.Duration(actualDuration) * time.Minute)
	
	return &GeneratedTimerSession{
		ID:              sessionID,
		TaskID:          taskID,
		UserID:          userID,
		StartTime:       schedule.StartTime,
		EndTime:         &actualEndTime,
		DurationSeconds: actualDuration * 60,
		Description:     description,
		IsTestData:      true,
		CreatedAt:       schedule.StartTime,
	}
}

// persistData saves generated tasks and sessions to database
func (s *TestDataGeneratorService) persistData(ctx context.Context, tasks []*GeneratedTask, sessions []*GeneratedTimerSession) error {
	// Start transaction
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()
	
	// Create tasks
	taskIDMap := make(map[int]int) // old ID -> new ID
	
	for _, task := range tasks {
		// Insert task
		var newTaskID int
		err := tx.QueryRowContext(ctx, `
			INSERT INTO tasks (project_id, title, description, status, assignee_id, created_at)
			VALUES (1, $1, $2, 'todo', $3, $4)
			RETURNING id
		`, task.Title, task.Description, 1, task.CreatedAt).Scan(&newTaskID)
		
		if err != nil {
			return fmt.Errorf("failed to insert task: %w", err)
		}
		
		taskIDMap[task.ID] = newTaskID
	}
	
	// Create timer sessions
	for _, session := range sessions {
		var finalTaskID *int
		if session.TaskID != nil {
			if newID, exists := taskIDMap[*session.TaskID]; exists {
				finalTaskID = &newID
			}
		}
		
		_, err := tx.ExecContext(ctx, `
			INSERT INTO unified_timer_logs (
				user_id, target_type, target_id, target_title,
				start_time, end_time, duration_seconds, status, created_by, created_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', $8, $9)
		`,
			session.UserID,
			"project_task", // Use the correct target_type from the check constraint
			finalTaskID,
			session.Description,
			session.StartTime,
			session.EndTime,
			session.DurationSeconds,
			session.UserID, // created_by
			session.CreatedAt,
		)
		
		if err != nil {
			return fmt.Errorf("failed to insert timer session: %w", err)
		}
	}
	
	// Commit transaction
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}
	
	return nil
}

// calculateTotalHours calculates total hours from sessions
func (s *TestDataGeneratorService) calculateTotalHours(sessions []*GeneratedTimerSession) float64 {
	totalSeconds := 0
	for _, session := range sessions {
		totalSeconds += session.DurationSeconds
	}
	return float64(totalSeconds) / 3600.0
}

// calculateAvgSessionLength calculates average session length in minutes
func (s *TestDataGeneratorService) calculateAvgSessionLength(sessions []*GeneratedTimerSession) float64 {
	if len(sessions) == 0 {
		return 0
	}
	
	totalMinutes := 0
	for _, session := range sessions {
		totalMinutes += session.DurationSeconds / 60
	}
	
	return float64(totalMinutes) / float64(len(sessions))
}

// groupTasksByCategory groups tasks by their category
func (s *TestDataGeneratorService) groupTasksByCategory(tasks []*GeneratedTask) map[string]int {
	categoryCount := make(map[string]int)
	for _, task := range tasks {
		categoryCount[task.Category]++
	}
	return categoryCount
}

// CleanupTestData removes test data older than specified days
func (s *TestDataGeneratorService) CleanupTestData(ctx context.Context, olderThanDays int) error {
	// Clean up timer logs (identify test data by description pattern)
	_, err := s.db.ExecContext(ctx, `
		DELETE FROM unified_timer_logs 
		WHERE target_title LIKE '工作于:%'
		AND created_at < NOW() - INTERVAL '%d days'
	`, olderThanDays)
	
	if err != nil {
		return fmt.Errorf("failed to cleanup timer logs: %w", err)
	}
	
	// Note: We don't automatically delete tasks as they might have dependencies
	// Task cleanup should be done manually or through separate admin function
	
	return nil
}