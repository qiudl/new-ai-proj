package services

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"regexp"
	"sort"
	"strings"
	"time"
)

// TaskAnalysisService provides Go-based task analysis functionality
type TaskAnalysisService struct {
	db database.DB // Properly typed database interface
}

// NewTaskAnalysisService creates a new task analysis service
func NewTaskAnalysisService(db database.DB) *TaskAnalysisService {
	return &TaskAnalysisService{
		db: db,
	}
}

// Task represents a task for analysis
type Task struct {
	ID           int                    `json:"id"`
	Title        string                 `json:"title"`
	Description  string                 `json:"description"`
	Status       string                 `json:"status"`
	Priority     string                 `json:"priority"`
	CreatedAt    time.Time              `json:"created_at"`
	UpdatedAt    time.Time              `json:"updated_at"`
	CustomFields map[string]interface{} `json:"custom_fields"`
}

// TagStatistics represents comprehensive tag statistics
type TagStatistics struct {
	TotalTasks        int                     `json:"total_tasks"`
	TaggedTasks       int                     `json:"tagged_tasks"`
	TaggingCoverage   float64                 `json:"tagging_coverage"`
	TagDistribution   map[string]int          `json:"tag_distribution"`
	CategoryStats     map[string]CategoryStat `json:"category_stats"`
	MostUsedTags      []TagUsage              `json:"most_used_tags"`
	RecentlyAddedTags []TagUsage              `json:"recently_added_tags"`
}

// CategoryStat represents statistics for a tag category
type CategoryStat struct {
	Count      int            `json:"count"`
	Percentage float64        `json:"percentage"`
	Tags       map[string]int `json:"tags"`
}

// TagUsage represents tag usage information
type TagUsage struct {
	Tag   string `json:"tag"`
	Count int    `json:"count"`
	Trend string `json:"trend,omitempty"`
}

// GenerateTagStatistics generates comprehensive tag statistics using Go
func (s *TaskAnalysisService) GenerateTagStatistics() (*TagStatistics, error) {
	log.Printf("📊 Starting database-driven tag statistics generation")

	// Query all tasks from database
	ctx := context.Background()
	tasks, totalTasks, err := s.db.Tasks().GetAll(ctx, 10000, 0) // Get all tasks
	if err != nil {
		log.Printf("❌ Failed to fetch tasks from database: %v", err)
		return nil, fmt.Errorf("failed to fetch tasks: %w", err)
	}

	log.Printf("📋 Fetched %d tasks from database for analysis", totalTasks)

	// Calculate real tag distribution from actual database data
	tagDistribution := s.calculateRealTagDistributionFromTasks(tasks)

	// Count unique tasks that have tags
	taggedTasksSet := make(map[int]bool)
	for _, task := range tasks {
		if task.CustomFields != nil {
			tags := s.ExtractTagsFromCustomFields(task.CustomFields)
			if len(tags) > 0 {
				taggedTasksSet[task.ID] = true
			}
		}
	}
	taggedTasks := len(taggedTasksSet)

	// Calculate coverage
	taggingCoverage := 0.0
	if totalTasks > 0 {
		taggingCoverage = float64(taggedTasks) / float64(totalTasks) * 100
	}

	// Generate category statistics based on real tag distribution
	categoryStats := s.generateRealCategoryStats(tagDistribution)

	// Generate most used tags
	mostUsedTags := s.generateMostUsedTags(tagDistribution)

	// Generate recently added tags by analyzing system development pattern
	recentlyAddedTags := s.generateRecentlyAddedTags(tagDistribution)

	log.Printf("✅ Generated tag statistics: %d total tasks, %d tagged tasks (%.1f%% coverage), %d unique tags",
		totalTasks, taggedTasks, taggingCoverage, len(tagDistribution))

	return &TagStatistics{
		TotalTasks:        totalTasks,
		TaggedTasks:       taggedTasks,
		TaggingCoverage:   taggingCoverage,
		TagDistribution:   tagDistribution,
		CategoryStats:     categoryStats,
		MostUsedTags:      mostUsedTags,
		RecentlyAddedTags: recentlyAddedTags,
	}, nil
}

// calculateRealTagDistributionFromTasks calculates tag distribution from actual task data
func (s *TaskAnalysisService) calculateRealTagDistributionFromTasks(tasks []*models.Task) map[string]int {
	log.Printf("🔍 Processing %d tasks for tag analysis", len(tasks))

	tagDistribution := make(map[string]int)

	// Process each task's custom fields to extract tags
	for _, task := range tasks {
		if task.CustomFields != nil {
			tags := s.ExtractTagsFromCustomFields(task.CustomFields)
			for _, tag := range tags {
				if tag != "" {
					tagDistribution[tag]++
				}
			}
		}
	}

	log.Printf("📊 Extracted %d unique tags from database", len(tagDistribution))

	// If no tags found in database, return minimal fallback distribution
	if len(tagDistribution) == 0 {
		log.Printf("⚠️  No tags found in database, using minimal fallback")
		return map[string]int{
			"未分类": 1,
		}
	}

	return tagDistribution
}

// calculateRealTagDistribution simulates real tag distribution from database (deprecated - keeping for compatibility)
func (s *TaskAnalysisService) calculateRealTagDistribution() map[string]int {
	// This method is deprecated - use calculateRealTagDistributionFromTasks instead
	// Keeping for backward compatibility

	return map[string]int{
		// Technical stack tags (most common)
		"前端":    28,
		"后端":    24,
		"API":   20,
		"数据库":   15,
		"UI":    18,
		"React": 16,

		// Task type tags
		"功能": 32,
		"优化": 18,
		"修复": 14,
		"测试": 12,
		"文档": 8,
		"重构": 6,

		// Complexity tags
		"简单": 25,
		"中等": 35,
		"复杂": 15,

		// Project/business tags
		"计时器":  12,
		"任务管理": 20,
		"项目管理": 15,
		"用户界面": 18,
		"系统集成": 8,

		// Priority/urgency tags
		"高优先级": 22,
		"中优先级": 45,
		"低优先级": 18,

		// Recent project specific tags
		"甘特图":      3,
		"时间管理":     5,
		"报表优化":     4,
		"可视化":      6,
		"工作笔记":     4,
		"Markdown": 7,
		"统一文档":     3,

		// Development phases
		"Phase1": 8,
		"Phase2": 6,
		"Phase3": 4,
		"Phase4": 3,

		// Quality tags
		"性能":   12,
		"安全":   6,
		"可访问性": 4,
		"兼容性":  5,
	}
}

// generateRecentlyAddedTags analyzes tag distribution to identify recently added or rare tags
func (s *TaskAnalysisService) generateRecentlyAddedTags(tagDistribution map[string]int) []TagUsage {
	log.Printf("🔍 Analyzing tag distribution for recently added tags")

	var recentTags []TagUsage

	// Convert tag distribution to sorted slice for analysis
	type tagCount struct {
		tag   string
		count int
	}

	var allTags []tagCount
	for tag, count := range tagDistribution {
		allTags = append(allTags, tagCount{tag: tag, count: count})
	}

	// Sort by count (ascending) to find least used tags which might be recently added
	sort.Slice(allTags, func(i, j int) bool {
		return allTags[i].count < allTags[j].count
	})

	// Identify recently added tags using heuristics:
	// 1. Tags with low usage count (1-3 uses) are likely recently added
	// 2. Tags containing modern/recent keywords
	// 3. Tags with specific patterns indicating recent development

	recentKeywords := []string{
		"AI", "智能", "自动化", "机器学习", "深度学习",
		"微服务", "容器", "Docker", "Kubernetes", "云原生",
		"GraphQL", "TypeScript", "Next.js", "Vue3", "React18",
		"WebAssembly", "PWA", "Serverless", "边缘计算",
		"区块链", "NFT", "元宇宙", "WebRTC", "WebGL",
		"实时协作", "低代码", "无代码", "自动部署",
		"监控", "可观测性", "链路追踪", "性能优化",
	}

	for _, tagItem := range allTags {
		tag := tagItem.tag
		count := tagItem.count

		// Skip if we already have enough recent tags
		if len(recentTags) >= 10 {
			break
		}

		isRecent := false
		trend := "稳定"

		// Heuristic 1: Tags with very low usage (1-5 uses) are likely new
		if count <= 5 {
			isRecent = true
			if count == 1 {
				trend = "新增"
			} else if count <= 3 {
				trend = "新兴"
			} else {
				trend = "小众"
			}
		}

		// Heuristic 2: Tags containing recent technology keywords
		if !isRecent {
			tagLower := strings.ToLower(tag)
			for _, keyword := range recentKeywords {
				if strings.Contains(tagLower, strings.ToLower(keyword)) {
					isRecent = true
					trend = "技术前沿"
					break
				}
			}
		}

		// Heuristic 3: Tags with specific patterns (Version numbers, Phase indicators, etc.)
		if !isRecent {
			// Look for version patterns (v1, v2, 2024, Phase1, etc.)
			versionPattern := regexp.MustCompile(`(?i)(v\d+|version\d+|phase\d+|2024|2025|beta|alpha|rc\d*)`)
			if versionPattern.MatchString(tag) {
				isRecent = true
				trend = "版本标识"
			}
		}

		if isRecent {
			recentTags = append(recentTags, TagUsage{
				Tag:   tag,
				Count: count,
				Trend: trend,
			})
		}
	}

	// If no recently added tags found using heuristics, return the least used tags
	if len(recentTags) == 0 && len(allTags) > 0 {
		log.Printf("⚠️  No recently added tags found using heuristics, using least used tags")
		limit := 5
		if len(allTags) < 5 {
			limit = len(allTags)
		}

		for i := 0; i < limit; i++ {
			recentTags = append(recentTags, TagUsage{
				Tag:   allTags[i].tag,
				Count: allTags[i].count,
				Trend: "较少使用",
			})
		}
	}

	log.Printf("📊 Found %d recently added tags", len(recentTags))
	return recentTags
}

// generateRealCategoryStats generates category statistics based on real tag distribution
func (s *TaskAnalysisService) generateRealCategoryStats(tagDistribution map[string]int) map[string]CategoryStat {
	categories := make(map[string]CategoryStat)

	// Technical category
	technicalTags := map[string]int{}
	technicalCount := 0
	for tag, count := range tagDistribution {
		if s.isTechnicalTag(tag) {
			technicalTags[tag] = count
			technicalCount += count
		}
	}

	// Type category
	typeTags := map[string]int{}
	typeCount := 0
	for tag, count := range tagDistribution {
		if s.isTypeTag(tag) {
			typeTags[tag] = count
			typeCount += count
		}
	}

	// Complexity category
	complexityTags := map[string]int{}
	complexityCount := 0
	for tag, count := range tagDistribution {
		if s.isComplexityTag(tag) {
			complexityTags[tag] = count
			complexityCount += count
		}
	}

	// Business category
	businessTags := map[string]int{}
	businessCount := 0
	for tag, count := range tagDistribution {
		if s.isBusinessTag(tag) {
			businessTags[tag] = count
			businessCount += count
		}
	}

	totalTagUsage := 0
	for _, count := range tagDistribution {
		totalTagUsage += count
	}

	if totalTagUsage > 0 {
		categories["technical"] = CategoryStat{
			Count:      technicalCount,
			Percentage: float64(technicalCount) / float64(totalTagUsage) * 100,
			Tags:       technicalTags,
		}

		categories["type"] = CategoryStat{
			Count:      typeCount,
			Percentage: float64(typeCount) / float64(totalTagUsage) * 100,
			Tags:       typeTags,
		}

		categories["complexity"] = CategoryStat{
			Count:      complexityCount,
			Percentage: float64(complexityCount) / float64(totalTagUsage) * 100,
			Tags:       complexityTags,
		}

		categories["business"] = CategoryStat{
			Count:      businessCount,
			Percentage: float64(businessCount) / float64(totalTagUsage) * 100,
			Tags:       businessTags,
		}
	}

	return categories
}

// Helper methods for tag categorization
func (s *TaskAnalysisService) isTechnicalTag(tag string) bool {
	technicalTags := []string{"前端", "后端", "API", "数据库", "UI", "React", "系统集成", "Markdown"}
	return s.containsTag(technicalTags, tag)
}

func (s *TaskAnalysisService) isTypeTag(tag string) bool {
	typeTags := []string{"功能", "优化", "修复", "测试", "文档", "重构"}
	return s.containsTag(typeTags, tag)
}

func (s *TaskAnalysisService) isComplexityTag(tag string) bool {
	complexityTags := []string{"简单", "中等", "复杂"}
	return s.containsTag(complexityTags, tag)
}

func (s *TaskAnalysisService) isBusinessTag(tag string) bool {
	businessTags := []string{"计时器", "任务管理", "项目管理", "用户界面", "甘特图", "时间管理", "报表优化", "可视化", "工作笔记", "统一文档"}
	return s.containsTag(businessTags, tag)
}

func (s *TaskAnalysisService) containsTag(tags []string, target string) bool {
	for _, tag := range tags {
		if tag == target {
			return true
		}
	}
	return false
}

// generateCategoryStats generates statistics by tag categories
func (s *TaskAnalysisService) generateCategoryStats(tagDistribution map[string]int) map[string]CategoryStat {
	categories := map[string]CategoryStat{
		"technical": {
			Count:      98,
			Percentage: 65.3,
			Tags: map[string]int{
				"frontend": 35,
				"backend":  28,
				"api":      25,
				"database": 10,
			},
		},
		"type": {
			Count:      63,
			Percentage: 42.0,
			Tags: map[string]int{
				"enhancement":  22,
				"bugfix":       18,
				"optimization": 15,
				"testing":      8,
			},
		},
		"complexity": {
			Count:      45,
			Percentage: 30.0,
			Tags: map[string]int{
				"simple":  15,
				"medium":  20,
				"complex": 10,
			},
		},
		"business": {
			Count:      32,
			Percentage: 21.3,
			Tags: map[string]int{
				"ui-ux":         12,
				"documentation": 5,
				"security":      4,
				"performance":   3,
			},
		},
	}

	return categories
}

// generateMostUsedTags generates most used tags with trends
func (s *TaskAnalysisService) generateMostUsedTags(tagDistribution map[string]int) []TagUsage {
	var tags []TagUsage

	for tag, count := range tagDistribution {
		trend := s.calculateTrend(tag, count)
		tags = append(tags, TagUsage{
			Tag:   tag,
			Count: count,
			Trend: trend,
		})
	}

	// Sort by count (descending)
	sort.Slice(tags, func(i, j int) bool {
		return tags[i].Count > tags[j].Count
	})

	// Return top 10
	if len(tags) > 10 {
		tags = tags[:10]
	}

	return tags
}

// calculateTrend calculates trend for a tag (mock implementation)
func (s *TaskAnalysisService) calculateTrend(tag string, count int) string {
	// Simple trend calculation based on tag name and count
	switch {
	case strings.Contains(tag, "frontend") || strings.Contains(tag, "ui"):
		return "上升"
	case strings.Contains(tag, "backend") || strings.Contains(tag, "api"):
		return "稳定"
	case strings.Contains(tag, "optimization") || strings.Contains(tag, "performance"):
		return "上升"
	case count > 20:
		return "稳定"
	case count > 10:
		return "下降"
	default:
		return "新增"
	}
}

// AnalyzeTaskContent analyzes task content and suggests tags using Go
func (s *TaskAnalysisService) AnalyzeTaskContent(title, description string) ([]string, float64) {
	content := strings.ToLower(title + " " + description)
	var suggestedTags []string
	confidence := 0.0

	// Technical stack analysis
	techPatterns := map[string]string{
		"frontend": `(?i)(前端|react|vue|ui|界面|组件|component|frontend)`,
		"backend":  `(?i)(后端|api|接口|服务|service|backend|server)`,
		"database": `(?i)(数据库|sql|db|database|表|table|查询|query)`,
		"mobile":   `(?i)(移动|mobile|app|android|ios|手机)`,
	}

	for tag, pattern := range techPatterns {
		if matched, _ := regexp.MatchString(pattern, content); matched {
			suggestedTags = append(suggestedTags, tag)
			confidence += 0.2
		}
	}

	// Task type analysis
	typePatterns := map[string]string{
		"enhancement":   `(?i)(功能|feature|enhancement|改进|优化|新增)`,
		"bugfix":        `(?i)(修复|bug|fix|错误|问题|issue)`,
		"refactor":      `(?i)(重构|refactor|优化|重写|重新设计)`,
		"testing":       `(?i)(测试|test|验证|检查|quality)`,
		"documentation": `(?i)(文档|doc|documentation|说明|readme)`,
	}

	for tag, pattern := range typePatterns {
		if matched, _ := regexp.MatchString(pattern, content); matched {
			suggestedTags = append(suggestedTags, tag)
			confidence += 0.15
		}
	}

	// Complexity analysis
	complexityPatterns := map[string]string{
		"simple":  `(?i)(简单|simple|小|minor|调整|微调)`,
		"complex": `(?i)(复杂|complex|架构|architecture|设计|重构|系统)`,
	}

	complexityFound := false
	for tag, pattern := range complexityPatterns {
		if matched, _ := regexp.MatchString(pattern, content); matched {
			suggestedTags = append(suggestedTags, tag)
			confidence += 0.1
			complexityFound = true
			break
		}
	}

	if !complexityFound {
		suggestedTags = append(suggestedTags, "medium")
		confidence += 0.1
	}

	// Priority analysis
	priorityPatterns := map[string]string{
		"urgent":        `(?i)(紧急|urgent|critical|重要|立即|马上)`,
		"high-priority": `(?i)(高优先级|high|重要|priority|关键)`,
		"low-priority":  `(?i)(低优先级|low|次要|optional|可选)`,
	}

	for tag, pattern := range priorityPatterns {
		if matched, _ := regexp.MatchString(pattern, content); matched {
			suggestedTags = append(suggestedTags, tag)
			confidence += 0.1
			break
		}
	}

	// Normalize confidence to 0-1 range
	if confidence > 1.0 {
		confidence = 1.0
	}

	// Remove duplicates
	uniqueTags := make([]string, 0, len(suggestedTags))
	seen := make(map[string]bool)
	for _, tag := range suggestedTags {
		if !seen[tag] {
			uniqueTags = append(uniqueTags, tag)
			seen[tag] = true
		}
	}

	return uniqueTags, confidence
}

// GenerateWeeklyReport generates a weekly report using Go
func (s *TaskAnalysisService) GenerateWeeklyReport(startDate, endDate string, projectID *int) (map[string]interface{}, error) {
	// Mock weekly report generation
	report := map[string]interface{}{
		"period": map[string]string{
			"start_date": startDate,
			"end_date":   endDate,
		},
		"executive_summary": map[string]interface{}{
			"key_metrics": map[string]interface{}{
				"completed_tasks": 18,
				"completion_rate": 78.3,
				"new_tasks":       12,
				"velocity":        18,
				"blockage_rate":   8.5,
			},
			"technical_distribution": []map[string]interface{}{
				{"area": "frontend", "count": 8, "percentage": 44.4},
				{"area": "backend", "count": 6, "percentage": 33.3},
				{"area": "api", "count": 4, "percentage": 22.2},
			},
			"major_achievements": []map[string]interface{}{
				{
					"title":      "任务分析系统完成",
					"impact":     "高影响",
					"complexity": "复杂",
				},
			},
			"risks": []map[string]interface{}{
				{
					"type":        "技术风险",
					"description": "部分任务存在技术复杂度较高的问题",
				},
			},
			"trend": map[string]string{
				"velocity":   "上升",
				"quality":    "良好",
				"complexity": "稳定",
			},
		},
		"insights": []map[string]interface{}{
			{
				"type":    "productivity",
				"level":   "positive",
				"message": "团队生产力表现优秀",
				"details": "本周完成任务数量超出平均水平20%",
			},
			{
				"type":    "technical",
				"level":   "info",
				"message": "前端开发占主导地位",
				"details": "44.4%的任务集中在前端开发，建议平衡技术栈分配",
			},
		},
		"recommendations": []map[string]interface{}{
			{
				"category":    "process",
				"priority":    "high",
				"title":       "优化任务分配策略",
				"description": "建议更均衡地分配前后端任务",
				"actions":     []string{"分析技能矩阵", "调整任务分配算法", "增加跨栈培训"},
			},
		},
		"generated_at": time.Now(),
		"report_url":   fmt.Sprintf("/reports/weekly-report-%s-to-%s.json", startDate, endDate),
	}

	return report, nil
}

// GetTagColor returns color for a tag based on its category
func (s *TaskAnalysisService) GetTagColor(tag string) string {
	categoryColors := map[string]string{
		// Technical tags
		"frontend": "#1890ff",
		"backend":  "#52c41a",
		"api":      "#13c2c2",
		"database": "#722ed1",
		"mobile":   "#eb2f96",

		// Type tags
		"enhancement":   "#52c41a",
		"bugfix":        "#f5222d",
		"refactor":      "#fa8c16",
		"testing":       "#faad14",
		"documentation": "#1890ff",

		// Complexity tags
		"simple":  "#52c41a",
		"medium":  "#faad14",
		"complex": "#f5222d",

		// Priority tags
		"urgent":        "#ff4d4f",
		"high-priority": "#fa541c",
		"low-priority":  "#52c41a",

		// Other tags
		"security":     "#f5222d",
		"performance":  "#fa8c16",
		"ui-ux":        "#eb2f96",
		"optimization": "#13c2c2",
	}

	if color, exists := categoryColors[tag]; exists {
		return color
	}

	return "#666666" // Default gray
}

// NormalizeTag normalizes a tag string
func (s *TaskAnalysisService) NormalizeTag(tag string) string {
	// Convert to lowercase
	normalized := strings.ToLower(strings.TrimSpace(tag))

	// Replace spaces with hyphens
	normalized = regexp.MustCompile(`\s+`).ReplaceAllString(normalized, "-")

	// Remove invalid characters
	normalized = regexp.MustCompile(`[^a-z0-9-]`).ReplaceAllString(normalized, "")

	// Remove multiple consecutive hyphens
	normalized = regexp.MustCompile(`-+`).ReplaceAllString(normalized, "-")

	// Remove leading/trailing hyphens
	normalized = strings.Trim(normalized, "-")

	return normalized
}

// ValidateTag validates if a tag is valid
func (s *TaskAnalysisService) ValidateTag(tag string) bool {
	if len(tag) == 0 || len(tag) > 50 {
		return false
	}

	// Check if tag contains only valid characters
	matched, _ := regexp.MatchString(`^[a-z0-9-]+$`, tag)
	return matched
}

// ParseCustomFields safely parses custom fields JSON
func (s *TaskAnalysisService) ParseCustomFields(customFieldsJSON string) map[string]interface{} {
	var fields map[string]interface{}

	if customFieldsJSON == "" {
		return make(map[string]interface{})
	}

	if err := json.Unmarshal([]byte(customFieldsJSON), &fields); err != nil {
		return make(map[string]interface{})
	}

	return fields
}

// ExtractTagsFromCustomFields extracts tags from custom fields
func (s *TaskAnalysisService) ExtractTagsFromCustomFields(customFields map[string]interface{}) []string {
	tags := make([]string, 0)

	if tagsInterface, exists := customFields["tags"]; exists {
		switch v := tagsInterface.(type) {
		case []interface{}:
			for _, tag := range v {
				if tagStr, ok := tag.(string); ok {
					tags = append(tags, tagStr)
				}
			}
		case []string:
			tags = v
		case string:
			// Handle comma-separated tags
			if v != "" {
				tags = strings.Split(v, ",")
				for i, tag := range tags {
					tags[i] = strings.TrimSpace(tag)
				}
			}
		}
	}

	return tags
}
