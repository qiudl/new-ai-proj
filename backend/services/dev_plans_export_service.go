package services

import (
	"ai-project-backend/models"
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// DevPlansExportService 任务文档导出服务
// 用于将任务文档导出到 backend/docs/dev-plans 目录供 Claude Code 网页版使用
type DevPlansExportService struct {
	basePath string // 基础路径，默认为 backend/docs/dev-plans
}

// ExportOptions 导出选项
type ExportOptions struct {
	OverwriteExisting bool   // 是否覆盖已存在的文件
	IncludeMetadata   bool   // 是否包含元数据
	IncludeTimestamp  bool   // 是否在文件中包含时间戳
	Format            string // 导出格式，默认 markdown
}

// ImportOptions 导入选项
type ImportOptions struct {
	ForceOverwrite     bool // 是否强制覆盖（忽略版本检查）
	UpdateIfNewer      bool // 仅当文件更新时间较新时才导入
	PreserveMetadata   bool // 是否保留文件中的元数据
	ValidateTaskExists bool // 是否验证任务存在
}

// ExportResult 导出结果
type ExportResult struct {
	Success    bool      `json:"success"`
	FilePath   string    `json:"file_path"`
	TaskID     int       `json:"task_id"`
	FileName   string    `json:"file_name"`
	Size       int64     `json:"size"`
	ExportedAt time.Time `json:"exported_at"`
	Error      string    `json:"error,omitempty"`
}

// ImportResult 导入结果
type ImportResult struct {
	Success      bool      `json:"success"`
	TaskID       int       `json:"task_id"`
	FilePath     string    `json:"file_path"`
	OldVersion   int       `json:"old_version"`
	NewVersion   int       `json:"new_version"`
	ImportedAt   time.Time `json:"imported_at"`
	UpdatedFiles int       `json:"updated_files"`
	Error        string    `json:"error,omitempty"`
}

// ParsedDocument 解析的文档内容
type ParsedDocument struct {
	TaskID      int
	Title       string
	Description string
	Content     string
	Status      string
	Priority    string
	Version     int
	LastSync    time.Time
	Metadata    map[string]string
}

// NewDevPlansExportService 创建新的导出服务实例
func NewDevPlansExportService(basePath string) *DevPlansExportService {
	if basePath == "" {
		basePath = "backend/docs/dev-plans"
	}

	service := &DevPlansExportService{
		basePath: basePath,
	}

	// 确保目录存在
	if err := service.ensureDirectory(); err != nil {
		log.Printf("Failed to ensure dev-plans directory: %v", err)
	}

	return service
}

// ensureDirectory 确保目录存在
func (s *DevPlansExportService) ensureDirectory() error {
	if err := os.MkdirAll(s.basePath, 0755); err != nil {
		return fmt.Errorf("failed to create directory %s: %w", s.basePath, err)
	}
	return nil
}

// ExportTaskDocument 导出单个任务文档
func (s *DevPlansExportService) ExportTaskDocument(
	ctx context.Context,
	task *models.Task,
	document *models.TaskDocument,
	options *ExportOptions,
) (*ExportResult, error) {
	if options == nil {
		options = s.getDefaultOptions()
	}

	result := &ExportResult{
		TaskID:     task.ID,
		ExportedAt: time.Now(),
	}

	// 生成文件名
	fileName := s.generateFileName(task)
	filePath := filepath.Join(s.basePath, fileName)

	result.FileName = fileName
	result.FilePath = filePath

	// 检查文件是否已存在
	if !options.OverwriteExisting {
		if _, err := os.Stat(filePath); err == nil {
			result.Success = false
			result.Error = "file already exists and overwrite is disabled"
			return result, nil
		}
	}

	// 生成文档内容
	content := s.generateDocumentContent(task, document, options)

	// 写入文件
	if err := os.WriteFile(filePath, []byte(content), 0644); err != nil {
		result.Success = false
		result.Error = fmt.Sprintf("failed to write file: %v", err)
		log.Printf("Failed to export task document (task_id=%d): %v", task.ID, err)
		return result, err
	}

	// 获取文件大小
	fileInfo, err := os.Stat(filePath)
	if err == nil {
		result.Size = fileInfo.Size()
	}

	result.Success = true
	log.Printf("Successfully exported task document: task_id=%d, file_path=%s, size=%d", task.ID, filePath, result.Size)

	return result, nil
}

// ExportTaskDocumentByID 根据任务ID和文档信息导出
func (s *DevPlansExportService) ExportTaskDocumentByID(
	ctx context.Context,
	taskID int,
	taskTitle string,
	documentContent string,
	options *ExportOptions,
) (*ExportResult, error) {
	// 创建简化的任务对象
	task := &models.Task{
		ID:    taskID,
		Title: taskTitle,
	}

	// 创建文档对象
	document := &models.TaskDocument{
		TaskID:  taskID,
		Content: &documentContent,
	}

	return s.ExportTaskDocument(ctx, task, document, options)
}

// BatchExportTasks 批量导出任务文档
func (s *DevPlansExportService) BatchExportTasks(
	ctx context.Context,
	tasks []*models.Task,
	documents map[int]*models.TaskDocument, // task_id -> document
	options *ExportOptions,
) ([]*ExportResult, error) {
	results := make([]*ExportResult, 0, len(tasks))

	for _, task := range tasks {
		document := documents[task.ID]
		if document == nil {
			// 如果没有文档，创建空文档
			document = &models.TaskDocument{
				TaskID: task.ID,
			}
		}

		result, err := s.ExportTaskDocument(ctx, task, document, options)
		if err != nil {
			log.Printf("Failed to export task in batch (task_id=%d): %v", task.ID, err)
		}
		results = append(results, result)
	}

	return results, nil
}

// DeleteExportedDocument 删除已导出的文档
func (s *DevPlansExportService) DeleteExportedDocument(taskID int, taskTitle string) error {
	fileName := s.generateFileNameFromParts(taskID, taskTitle)
	filePath := filepath.Join(s.basePath, fileName)

	if err := os.Remove(filePath); err != nil {
		if os.IsNotExist(err) {
			return nil // 文件不存在，认为删除成功
		}
		return fmt.Errorf("failed to delete file: %w", err)
	}

	log.Printf("Successfully deleted exported document: task_id=%d, file_path=%s", taskID, filePath)

	return nil
}

// ListExportedDocuments 列出所有已导出的文档
func (s *DevPlansExportService) ListExportedDocuments() ([]string, error) {
	files, err := os.ReadDir(s.basePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read directory: %w", err)
	}

	var mdFiles []string
	for _, file := range files {
		if !file.IsDir() && strings.HasSuffix(file.Name(), ".md") {
			// 排除 README 和 TEMPLATE 文件
			if file.Name() != "README.md" && file.Name() != "TEMPLATE.md" {
				mdFiles = append(mdFiles, file.Name())
			}
		}
	}

	return mdFiles, nil
}

// 私有方法

// generateFileName 生成文件名
// 格式: {task_id}_{sanitized_title}.md
func (s *DevPlansExportService) generateFileName(task *models.Task) string {
	return s.generateFileNameFromParts(task.ID, task.Title)
}

// generateFileNameFromParts 从组成部分生成文件名
func (s *DevPlansExportService) generateFileNameFromParts(taskID int, title string) string {
	// 清理标题：移除特殊字符，替换空格为下划线
	sanitizedTitle := s.sanitizeFileName(title)

	// 限制标题长度，避免文件名过长
	if len(sanitizedTitle) > 100 {
		sanitizedTitle = sanitizedTitle[:100]
	}

	return fmt.Sprintf("%d_%s.md", taskID, sanitizedTitle)
}

// sanitizeFileName 清理文件名中的特殊字符
func (s *DevPlansExportService) sanitizeFileName(name string) string {
	// 移除或替换不适合文件名的字符
	// 保留中文、英文、数字、下划线、横杠
	// Go的正则不支持\w，需要明确指定字符类
	re := regexp.MustCompile(`[^a-zA-Z0-9_\x{4e00}-\x{9fa5}-]+`)
	sanitized := re.ReplaceAllString(name, "_")

	// 移除开头和结尾的下划线
	sanitized = strings.Trim(sanitized, "_")

	// 将多个连续的下划线替换为单个
	re2 := regexp.MustCompile(`_+`)
	sanitized = re2.ReplaceAllString(sanitized, "_")

	return sanitized
}

// generateDocumentContent 生成文档内容
func (s *DevPlansExportService) generateDocumentContent(
	task *models.Task,
	document *models.TaskDocument,
	options *ExportOptions,
) string {
	var builder strings.Builder

	// 添加文档元数据（使用 HTML 注释）
	if options.IncludeMetadata {
		builder.WriteString("<!-- 文档元数据 -->\n")
		builder.WriteString(fmt.Sprintf("<!-- TASK_ID: %d -->\n", task.ID))
		builder.WriteString(fmt.Sprintf("<!-- STATUS: %s -->\n", task.Status))
		if options.IncludeTimestamp {
			builder.WriteString(fmt.Sprintf("<!-- LAST_SYNC: %s -->\n", time.Now().Format(time.RFC3339)))
		}
		builder.WriteString(fmt.Sprintf("<!-- VERSION: %d -->\n", document.Version))
		builder.WriteString("\n")
	}

	// 添加任务标题
	builder.WriteString(fmt.Sprintf("# %s\n\n", task.Title))

	// 添加任务信息表格
	builder.WriteString("## 📌 任务信息\n\n")
	builder.WriteString("| 字段 | 内容 |\n")
	builder.WriteString("|------|------|\n")
	builder.WriteString(fmt.Sprintf("| 任务ID | #%d |\n", task.ID))
	builder.WriteString(fmt.Sprintf("| 项目ID | %d |\n", task.ProjectID))

	if task.ParentID != nil {
		builder.WriteString(fmt.Sprintf("| 父任务ID | #%d |\n", *task.ParentID))
	}

	builder.WriteString(fmt.Sprintf("| 状态 | %s |\n", s.formatStatus(task.Status)))
	builder.WriteString(fmt.Sprintf("| 优先级 | %s |\n", s.formatPriority(task.Priority)))

	if task.AssigneeID != nil {
		builder.WriteString(fmt.Sprintf("| 负责人ID | %d |\n", *task.AssigneeID))
	}

	if task.EstimatedHours != nil {
		builder.WriteString(fmt.Sprintf("| 预计工时 | %.1f 小时 |\n", *task.EstimatedHours))
	}

	builder.WriteString(fmt.Sprintf("| 创建时间 | %s |\n", task.CreatedAt.Format("2006-01-02 15:04:05")))
	builder.WriteString(fmt.Sprintf("| 更新时间 | %s |\n", task.UpdatedAt.Format("2006-01-02 15:04:05")))

	if task.DueDate != nil {
		builder.WriteString(fmt.Sprintf("| 截止时间 | %s |\n", task.DueDate.Format("2006-01-02")))
	}

	builder.WriteString("\n")

	// 添加任务描述
	builder.WriteString("## 📝 任务描述\n\n")
	if task.Description != nil && *task.Description != "" {
		builder.WriteString(*task.Description)
		builder.WriteString("\n\n")
	} else {
		builder.WriteString("暂无描述\n\n")
	}

	// 添加文档内容（如果有）
	if document != nil && document.Content != nil && *document.Content != "" {
		builder.WriteString("## 📄 详细内容\n\n")
		builder.WriteString(*document.Content)
		builder.WriteString("\n\n")
	}

	// 添加更新日志
	builder.WriteString("## 🔄 更新日志\n\n")
	builder.WriteString("| 日期 | 版本 | 变更内容 | 变更人 |\n")
	builder.WriteString("|------|------|----------|--------|\n")
	builder.WriteString(fmt.Sprintf("| %s | %d.0.0 | 创建任务文档 | System |\n",
		task.CreatedAt.Format("2006-01-02"), document.Version))
	builder.WriteString("\n")

	// 添加页脚
	builder.WriteString("---\n\n")
	builder.WriteString(fmt.Sprintf("**创建时间**: %s\n", task.CreatedAt.Format("2006-01-02 15:04:05")))
	builder.WriteString(fmt.Sprintf("**最后更新**: %s\n", task.UpdatedAt.Format("2006-01-02 15:04:05")))
	builder.WriteString(fmt.Sprintf("**文档版本**: v%d.0.0\n", document.Version))

	return builder.String()
}

// formatStatus 格式化状态显示
func (s *DevPlansExportService) formatStatus(status string) string {
	statusMap := map[string]string{
		"todo":        "📋 待处理",
		"in_progress": "🟡 进行中",
		"testing":     "🧪 测试中",
		"completed":   "✅ 已完成",
		"cancelled":   "❌ 已取消",
		"on_hold":     "⏸️ 暂停",
	}

	if formatted, ok := statusMap[status]; ok {
		return formatted
	}
	return status
}

// formatPriority 格式化优先级显示
func (s *DevPlansExportService) formatPriority(priority string) string {
	priorityMap := map[string]string{
		"high":   "🔴 高",
		"medium": "🟡 中",
		"low":    "🟢 低",
	}

	if formatted, ok := priorityMap[priority]; ok {
		return formatted
	}
	return priority
}

// getDefaultOptions 获取默认导出选项
func (s *DevPlansExportService) getDefaultOptions() *ExportOptions {
	return &ExportOptions{
		OverwriteExisting: true,
		IncludeMetadata:   true,
		IncludeTimestamp:  true,
		Format:            "markdown",
	}
}

// getDefaultImportOptions 获取默认导入选项
func (s *DevPlansExportService) getDefaultImportOptions() *ImportOptions {
	return &ImportOptions{
		ForceOverwrite:     false,
		UpdateIfNewer:      true,
		PreserveMetadata:   true,
		ValidateTaskExists: true,
	}
}

// ImportTaskDocument 从文件导入任务文档
func (s *DevPlansExportService) ImportTaskDocument(
	ctx context.Context,
	taskID int,
	taskTitle string,
	options *ImportOptions,
) (*ImportResult, *ParsedDocument, error) {
	if options == nil {
		options = s.getDefaultImportOptions()
	}

	result := &ImportResult{
		TaskID:     taskID,
		ImportedAt: time.Now(),
	}

	// 生成文件路径
	fileName := s.generateFileNameFromParts(taskID, taskTitle)
	filePath := filepath.Join(s.basePath, fileName)
	result.FilePath = filePath

	// 检查文件是否存在
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			result.Success = false
			result.Error = "file not found"
			return result, nil, fmt.Errorf("file not found: %s", filePath)
		}
		result.Success = false
		result.Error = fmt.Sprintf("failed to stat file: %v", err)
		return result, nil, err
	}

	// 读取文件内容
	content, err := os.ReadFile(filePath)
	if err != nil {
		result.Success = false
		result.Error = fmt.Sprintf("failed to read file: %v", err)
		return result, nil, err
	}

	// 解析文档
	parsed, err := s.parseDocumentContent(string(content), taskID)
	if err != nil {
		result.Success = false
		result.Error = fmt.Sprintf("failed to parse document: %v", err)
		return result, nil, err
	}

	// 验证任务ID匹配
	if parsed.TaskID != 0 && parsed.TaskID != taskID {
		result.Success = false
		result.Error = fmt.Sprintf("task ID mismatch: expected %d, got %d", taskID, parsed.TaskID)
		return result, parsed, fmt.Errorf("task ID mismatch")
	}

	// 检查文件修改时间
	if options.UpdateIfNewer {
		parsed.LastSync = fileInfo.ModTime()
	}

	result.Success = true
	result.NewVersion = parsed.Version

	log.Printf("Successfully imported task document from file: task_id=%d, file_path=%s", taskID, filePath)

	return result, parsed, nil
}

// ImportTaskDocumentByFileName 根据文件名导入任务文档
func (s *DevPlansExportService) ImportTaskDocumentByFileName(
	ctx context.Context,
	fileName string,
	options *ImportOptions,
) (*ImportResult, *ParsedDocument, error) {
	// 从文件名提取任务ID
	taskID, title, err := s.parseFileNameInfo(fileName)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to parse file name: %w", err)
	}

	return s.ImportTaskDocument(ctx, taskID, title, options)
}

// BatchImportTaskDocuments 批量导入任务文档
func (s *DevPlansExportService) BatchImportTaskDocuments(
	ctx context.Context,
	taskMappings map[int]string, // taskID -> taskTitle
	options *ImportOptions,
) ([]*ImportResult, map[int]*ParsedDocument, error) {
	results := make([]*ImportResult, 0, len(taskMappings))
	parsedDocs := make(map[int]*ParsedDocument)

	for taskID, title := range taskMappings {
		result, parsed, err := s.ImportTaskDocument(ctx, taskID, title, options)
		if err != nil {
			log.Printf("Failed to import task document (task_id=%d): %v", taskID, err)
		}
		results = append(results, result)
		if parsed != nil {
			parsedDocs[taskID] = parsed
		}
	}

	return results, parsedDocs, nil
}

// parseDocumentContent 解析文档内容
func (s *DevPlansExportService) parseDocumentContent(content string, taskID int) (*ParsedDocument, error) {
	parsed := &ParsedDocument{
		TaskID:   taskID,
		Metadata: make(map[string]string),
	}

	lines := strings.Split(content, "\n")

	// 解析HTML注释中的元数据
	for _, line := range lines {
		line = strings.TrimSpace(line)

		// 解析 TASK_ID
		if strings.Contains(line, "<!-- TASK_ID:") {
			if id, err := s.extractMetadataInt(line, "TASK_ID:"); err == nil {
				parsed.TaskID = id
			}
		}

		// 解析 STATUS
		if strings.Contains(line, "<!-- STATUS:") {
			if status, err := s.extractMetadataString(line, "STATUS:"); err == nil {
				parsed.Status = status
			}
		}

		// 解析 VERSION
		if strings.Contains(line, "<!-- VERSION:") {
			if version, err := s.extractMetadataInt(line, "VERSION:"); err == nil {
				parsed.Version = version
			}
		}

		// 解析 LAST_SYNC
		if strings.Contains(line, "<!-- LAST_SYNC:") {
			if syncTime, err := s.extractMetadataTime(line, "LAST_SYNC:"); err == nil {
				parsed.LastSync = syncTime
			}
		}
	}

	// 提取标题（第一个 # 标题）
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "# ") && !strings.HasPrefix(line, "## ") {
			parsed.Title = strings.TrimPrefix(line, "# ")
			break
		}
	}

	// 提取任务描述（## 📝 任务描述 章节）
	parsed.Description = s.extractSection(content, "## 📝 任务描述", "##")

	// 提取详细内容（## 📄 详细内容 章节）
	parsed.Content = s.extractSection(content, "## 📄 详细内容", "##")

	// 如果没有单独的详细内容章节，将整个文档作为内容
	if parsed.Content == "" {
		parsed.Content = content
	}

	return parsed, nil
}

// extractMetadataInt 从元数据行提取整数值
func (s *DevPlansExportService) extractMetadataInt(line, key string) (int, error) {
	// <!-- KEY: VALUE -->
	start := strings.Index(line, key)
	if start == -1 {
		return 0, fmt.Errorf("key not found")
	}
	start += len(key)

	end := strings.Index(line[start:], "-->")
	if end == -1 {
		return 0, fmt.Errorf("end marker not found")
	}

	valueStr := strings.TrimSpace(line[start : start+end])
	var value int
	_, err := fmt.Sscanf(valueStr, "%d", &value)
	return value, err
}

// extractMetadataString 从元数据行提取字符串值
func (s *DevPlansExportService) extractMetadataString(line, key string) (string, error) {
	start := strings.Index(line, key)
	if start == -1 {
		return "", fmt.Errorf("key not found")
	}
	start += len(key)

	end := strings.Index(line[start:], "-->")
	if end == -1 {
		return "", fmt.Errorf("end marker not found")
	}

	return strings.TrimSpace(line[start : start+end]), nil
}

// extractMetadataTime 从元数据行提取时间值
func (s *DevPlansExportService) extractMetadataTime(line, key string) (time.Time, error) {
	valueStr, err := s.extractMetadataString(line, key)
	if err != nil {
		return time.Time{}, err
	}

	return time.Parse(time.RFC3339, valueStr)
}

// extractSection 提取特定章节的内容
func (s *DevPlansExportService) extractSection(content, sectionHeader, nextSectionPrefix string) string {
	lines := strings.Split(content, "\n")
	var sectionLines []string
	inSection := false

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)

		// 找到目标章节
		if strings.HasPrefix(trimmed, sectionHeader) {
			inSection = true
			continue
		}

		// 遇到下一个章节，停止
		if inSection && strings.HasPrefix(trimmed, nextSectionPrefix) && trimmed != sectionHeader {
			break
		}

		// 收集章节内容
		if inSection {
			sectionLines = append(sectionLines, line)
		}
	}

	return strings.TrimSpace(strings.Join(sectionLines, "\n"))
}

// parseFileNameInfo 从文件名解析任务ID和标题
func (s *DevPlansExportService) parseFileNameInfo(fileName string) (int, string, error) {
	// 移除 .md 后缀
	fileName = strings.TrimSuffix(fileName, ".md")

	// 分割为 ID 和标题
	parts := strings.SplitN(fileName, "_", 2)
	if len(parts) < 2 {
		return 0, "", fmt.Errorf("invalid file name format: %s", fileName)
	}

	// 解析任务ID
	var taskID int
	_, err := fmt.Sscanf(parts[0], "%d", &taskID)
	if err != nil {
		return 0, "", fmt.Errorf("invalid task ID in file name: %s", parts[0])
	}

	return taskID, parts[1], nil
}
