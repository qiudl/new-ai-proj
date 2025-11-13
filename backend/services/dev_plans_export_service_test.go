package services

import (
	"ai-project-backend/models"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewDevPlansExportService(t *testing.T) {
	// 使用临时目录进行测试
	tempDir := t.TempDir()

	service := NewDevPlansExportService(tempDir)

	assert.NotNil(t, service)
	assert.Equal(t, tempDir, service.basePath)

	// 验证目录已创建
	_, err := os.Stat(tempDir)
	assert.NoError(t, err)
}

func TestSanitizeFileName(t *testing.T) {
	service := NewDevPlansExportService(t.TempDir())

	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "简单英文",
			input:    "Simple Task",
			expected: "Simple_Task",
		},
		{
			name:     "中文标题",
			input:    "创建文档导出功能",
			expected: "创建文档导出功能",
		},
		{
			name:     "特殊字符",
			input:    "Task: Fix Bug #123",
			expected: "Task_Fix_Bug_123",
		},
		{
			name:     "多个空格",
			input:    "Multiple   Spaces",
			expected: "Multiple_Spaces",
		},
		{
			name:     "混合中英文",
			input:    "修复Bug：用户登录问题",
			expected: "修复Bug_用户登录问题",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.sanitizeFileName(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestGenerateFileName(t *testing.T) {
	service := NewDevPlansExportService(t.TempDir())

	tests := []struct {
		name     string
		task     *models.Task
		expected string
	}{
		{
			name: "简单任务",
			task: &models.Task{
				ID:    123,
				Title: "Test Task",
			},
			expected: "123_Test_Task.md",
		},
		{
			name: "中文任务",
			task: &models.Task{
				ID:    456,
				Title: "创建文档",
			},
			expected: "456_创建文档.md",
		},
		{
			name: "长标题",
			task: &models.Task{
				ID:    789,
				Title: "这是一个非常长的任务标题，超过一百个字符，这是一个非常长的任务标题，超过一百个字符，这是一个非常长的任务标题，超过一百个字符",
			},
			expected: "789_这是一个非常长的任务标题_超过一百个字符_这是一个非常长的任务标题_超过一百个字符_这是一个非常长的任务标题_超过一百个字符.md",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.generateFileName(tt.task)
			// 检查文件名以 task ID 开头
			// 检查文件名格式: {task_id}_{sanitized_title}.md
			assert.Contains(t, result, fmt.Sprintf("%d_", tt.task.ID))
			assert.Contains(t, result, ".md")
			// 检查长度限制
			assert.LessOrEqual(t, len(result), 110) // 100 + ID + .md
		})
	}
}

func TestExportTaskDocument(t *testing.T) {
	tempDir := t.TempDir()

	service := NewDevPlansExportService(tempDir)

	ctx := context.Background()

	// 创建测试任务
	task := &models.Task{
		ID:          3674,
		ProjectID:   1,
		Title:       "实现任务文档导出为文件的核心逻辑",
		Status:      "in_progress",
		Priority:    "high",
		Description: testStrPtr("实现将任务文档导出到 dev-plans 目录的核心功能"),
		CreatedAt:   time.Now().Add(-24 * time.Hour),
		UpdatedAt:   time.Now(),
	}

	// 创建测试文档
	documentContent := "## 技术方案\n\n这是详细的技术方案内容..."
	document := &models.TaskDocument{
		TaskID:  task.ID,
		Content: &documentContent,
		Version: 1,
	}

	// 测试导出
	result, err := service.ExportTaskDocument(ctx, task, document, nil)

	require.NoError(t, err)
	assert.True(t, result.Success)
	assert.Equal(t, task.ID, result.TaskID)
	assert.NotEmpty(t, result.FilePath)
	assert.NotEmpty(t, result.FileName)
	assert.Greater(t, result.Size, int64(0))

	// 验证文件已创建
	_, err = os.Stat(result.FilePath)
	assert.NoError(t, err)

	// 读取文件内容并验证
	content, err := os.ReadFile(result.FilePath)
	require.NoError(t, err)

	contentStr := string(content)
	// 验证包含任务标题
	assert.Contains(t, contentStr, task.Title)
	// 验证包含任务ID
	assert.Contains(t, contentStr, "3674")
	// 验证包含状态
	assert.Contains(t, contentStr, "进行中")
	// 验证包含文档内容
	assert.Contains(t, contentStr, "技术方案")
}

func TestExportTaskDocumentWithOptions(t *testing.T) {
	tempDir := t.TempDir()
	service := NewDevPlansExportService(tempDir)

	ctx := context.Background()

	task := &models.Task{
		ID:          1001,
		ProjectID:   1,
		Title:       "测试任务",
		Status:      "todo",
		Priority:    "medium",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	document := &models.TaskDocument{
		TaskID:  task.ID,
		Version: 1,
	}

	// 测试不覆盖已存在文件
	options1 := &ExportOptions{
		OverwriteExisting: true,
		IncludeMetadata:   true,
		IncludeTimestamp:  true,
	}

	// 第一次导出
	result1, err := service.ExportTaskDocument(ctx, task, document, options1)
	require.NoError(t, err)
	assert.True(t, result1.Success)

	// 第二次导出，不覆盖
	options2 := &ExportOptions{
		OverwriteExisting: false,
		IncludeMetadata:   true,
		IncludeTimestamp:  false,
	}

	result2, err := service.ExportTaskDocument(ctx, task, document, options2)
	require.NoError(t, err)
	assert.False(t, result2.Success)
	assert.Contains(t, result2.Error, "already exists")
}

func TestBatchExportTasks(t *testing.T) {
	tempDir := t.TempDir()
	service := NewDevPlansExportService(tempDir)

	ctx := context.Background()

	// 创建多个任务
	tasks := []*models.Task{
		{
			ID:        2001,
			ProjectID: 1,
			Title:     "任务1",
			Status:    "todo",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			ID:        2002,
			ProjectID: 1,
			Title:     "任务2",
			Status:    "in_progress",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			ID:        2003,
			ProjectID: 1,
			Title:     "任务3",
			Status:    "completed",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}

	// 创建文档映射
	documents := map[int]*models.TaskDocument{
		2001: {TaskID: 2001, Version: 1},
		2002: {TaskID: 2002, Version: 1},
		2003: {TaskID: 2003, Version: 1},
	}

	// 批量导出
	results, err := service.BatchExportTasks(ctx, tasks, documents, nil)

	require.NoError(t, err)
	assert.Len(t, results, 3)

	// 验证所有导出成功
	for i, result := range results {
		assert.True(t, result.Success, "Task %d export failed: %s", tasks[i].ID, result.Error)
		assert.Equal(t, tasks[i].ID, result.TaskID)

		// 验证文件存在
		_, err := os.Stat(result.FilePath)
		assert.NoError(t, err)
	}
}

func TestDeleteExportedDocument(t *testing.T) {
	tempDir := t.TempDir()
	service := NewDevPlansExportService(tempDir)

	ctx := context.Background()

	task := &models.Task{
		ID:        3001,
		ProjectID: 1,
		Title:     "待删除的任务",
		Status:    "completed",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	document := &models.TaskDocument{
		TaskID:  task.ID,
		Version: 1,
	}

	// 先导出
	result, err := service.ExportTaskDocument(ctx, task, document, nil)
	require.NoError(t, err)
	assert.True(t, result.Success)

	// 验证文件存在
	_, err = os.Stat(result.FilePath)
	assert.NoError(t, err)

	// 删除文件
	err = service.DeleteExportedDocument(task.ID, task.Title)
	assert.NoError(t, err)

	// 验证文件已删除
	_, err = os.Stat(result.FilePath)
	assert.True(t, os.IsNotExist(err))

	// 再次删除不存在的文件（应该不报错）
	err = service.DeleteExportedDocument(task.ID, task.Title)
	assert.NoError(t, err)
}

func TestListExportedDocuments(t *testing.T) {
	tempDir := t.TempDir()
	service := NewDevPlansExportService(tempDir)

	ctx := context.Background()

	// 创建 README 和 TEMPLATE 文件
	readmePath := filepath.Join(tempDir, "README.md")
	templatePath := filepath.Join(tempDir, "TEMPLATE.md")
	err := os.WriteFile(readmePath, []byte("# README"), 0644)
	require.NoError(t, err)
	err = os.WriteFile(templatePath, []byte("# TEMPLATE"), 0644)
	require.NoError(t, err)

	// 导出几个任务文档
	tasks := []*models.Task{
		{ID: 4001, ProjectID: 1, Title: "文档1", Status: "todo", CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: 4002, ProjectID: 1, Title: "文档2", Status: "todo", CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: 4003, ProjectID: 1, Title: "文档3", Status: "todo", CreatedAt: time.Now(), UpdatedAt: time.Now()},
	}

	for _, task := range tasks {
		doc := &models.TaskDocument{TaskID: task.ID, Version: 1}
		_, err := service.ExportTaskDocument(ctx, task, doc, nil)
		require.NoError(t, err)
	}

	// 列出文档
	files, err := service.ListExportedDocuments()
	require.NoError(t, err)

	// 应该只返回任务文档，不包括 README 和 TEMPLATE
	assert.Len(t, files, 3)

	// 验证文件名格式
	for _, file := range files {
		assert.Contains(t, file, ".md")
		assert.NotEqual(t, "README.md", file)
		assert.NotEqual(t, "TEMPLATE.md", file)
	}
}

func TestFormatStatus(t *testing.T) {
	service := NewDevPlansExportService(t.TempDir())

	tests := []struct {
		status   string
		expected string
	}{
		{"todo", "📋 待处理"},
		{"in_progress", "🟡 进行中"},
		{"testing", "🧪 测试中"},
		{"completed", "✅ 已完成"},
		{"cancelled", "❌ 已取消"},
		{"on_hold", "⏸️ 暂停"},
		{"unknown", "unknown"},
	}

	for _, tt := range tests {
		t.Run(tt.status, func(t *testing.T) {
			result := service.formatStatus(tt.status)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestFormatPriority(t *testing.T) {
	service := NewDevPlansExportService(t.TempDir())

	tests := []struct {
		priority string
		expected string
	}{
		{"high", "🔴 高"},
		{"medium", "🟡 中"},
		{"low", "🟢 低"},
		{"unknown", "unknown"},
	}

	for _, tt := range tests {
		t.Run(tt.priority, func(t *testing.T) {
			result := service.formatPriority(tt.priority)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// 辅助函数
func testStrPtr(s string) *string {
	return &s
}

// ========== 导入功能测试 ==========

func TestImportTaskDocument(t *testing.T) {
	tempDir := t.TempDir()
	service := NewDevPlansExportService(tempDir)
	ctx := context.Background()

	// 先创建一个任务并导出
	task := &models.Task{
		ID:          5001,
		ProjectID:   1,
		Title:       "导入测试任务",
		Status:      "in_progress",
		Priority:    "high",
		Description: testStrPtr("测试文档导入功能"),
		CreatedAt:   time.Now().Add(-24 * time.Hour),
		UpdatedAt:   time.Now(),
	}

	documentContent := "## 技术方案\n\n这是测试文档的详细内容..."
	document := &models.TaskDocument{
		TaskID:  task.ID,
		Content: &documentContent,
		Version: 2,
	}

	// 导出文档
	exportResult, err := service.ExportTaskDocument(ctx, task, document, nil)
	require.NoError(t, err)
	assert.True(t, exportResult.Success)

	// 测试导入
	result, parsed, err := service.ImportTaskDocument(ctx, task.ID, task.Title, nil)

	require.NoError(t, err)
	assert.True(t, result.Success)
	assert.Equal(t, task.ID, result.TaskID)
	assert.NotEmpty(t, result.FilePath)

	// 验证解析的内容
	assert.NotNil(t, parsed)
	assert.Equal(t, task.ID, parsed.TaskID)
	assert.Equal(t, task.Title, parsed.Title)
	assert.Equal(t, 2, parsed.Version)
	assert.Equal(t, "in_progress", parsed.Status)
	assert.Contains(t, parsed.Content, "技术方案")
}

func TestImportTaskDocumentFileNotFound(t *testing.T) {
	tempDir := t.TempDir()
	service := NewDevPlansExportService(tempDir)
	ctx := context.Background()

	// 尝试导入不存在的文件
	result, parsed, err := service.ImportTaskDocument(ctx, 9999, "不存在的任务", nil)

	assert.Error(t, err)
	assert.False(t, result.Success)
	assert.Contains(t, result.Error, "file not found")
	assert.Nil(t, parsed)
}

func TestImportTaskDocumentWithMetadata(t *testing.T) {
	tempDir := t.TempDir()
	service := NewDevPlansExportService(tempDir)
	ctx := context.Background()

	// 创建包含元数据的文档
	task := &models.Task{
		ID:        5002,
		ProjectID: 1,
		Title:     "元数据测试",
		Status:    "completed",
		Priority:  "medium",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	document := &models.TaskDocument{
		TaskID:  task.ID,
		Version: 3,
	}

	// 导出
	_, err := service.ExportTaskDocument(ctx, task, document, &ExportOptions{
		OverwriteExisting: true,
		IncludeMetadata:   true,
		IncludeTimestamp:  true,
		Format:            "markdown",
	})
	require.NoError(t, err)

	// 导入
	result, parsed, err := service.ImportTaskDocument(ctx, task.ID, task.Title, nil)

	require.NoError(t, err)
	assert.True(t, result.Success)
	assert.Equal(t, task.ID, parsed.TaskID)
	assert.Equal(t, 3, parsed.Version)
	assert.Equal(t, "completed", parsed.Status)
	assert.NotZero(t, parsed.LastSync)
}

func TestParseDocumentContent(t *testing.T) {
	service := NewDevPlansExportService(t.TempDir())

	content := `<!-- 文档元数据 -->
<!-- TASK_ID: 123 -->
<!-- STATUS: in_progress -->
<!-- VERSION: 5 -->
<!-- LAST_SYNC: 2025-11-11T10:30:00+08:00 -->

# 测试任务标题

## 📝 任务描述

这是任务的描述内容

## 📄 详细内容

这是详细的技术方案
包含多行内容

## 其他章节

其他内容
`

	parsed, err := service.parseDocumentContent(content, 123)

	require.NoError(t, err)
	assert.Equal(t, 123, parsed.TaskID)
	assert.Equal(t, "测试任务标题", parsed.Title)
	assert.Equal(t, "in_progress", parsed.Status)
	assert.Equal(t, 5, parsed.Version)
	assert.Contains(t, parsed.Description, "这是任务的描述内容")
	assert.Contains(t, parsed.Content, "这是详细的技术方案")
}

func TestExtractMetadataInt(t *testing.T) {
	service := NewDevPlansExportService(t.TempDir())

	tests := []struct {
		name     string
		line     string
		key      string
		expected int
		wantErr  bool
	}{
		{
			name:     "正常整数",
			line:     "<!-- TASK_ID: 123 -->",
			key:      "TASK_ID:",
			expected: 123,
			wantErr:  false,
		},
		{
			name:     "带空格",
			line:     "<!-- VERSION:   42   -->",
			key:      "VERSION:",
			expected: 42,
			wantErr:  false,
		},
		{
			name:    "缺少key",
			line:    "<!-- OTHER: 123 -->",
			key:     "TASK_ID:",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := service.extractMetadataInt(tt.line, tt.key)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expected, result)
			}
		})
	}
}

func TestExtractMetadataString(t *testing.T) {
	service := NewDevPlansExportService(t.TempDir())

	tests := []struct {
		name     string
		line     string
		key      string
		expected string
		wantErr  bool
	}{
		{
			name:     "正常字符串",
			line:     "<!-- STATUS: in_progress -->",
			key:      "STATUS:",
			expected: "in_progress",
			wantErr:  false,
		},
		{
			name:     "带空格",
			line:     "<!--   PRIORITY:   high   -->",
			key:      "PRIORITY:",
			expected: "high",
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := service.extractMetadataString(tt.line, tt.key)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expected, result)
			}
		})
	}
}

func TestExtractSection(t *testing.T) {
	service := NewDevPlansExportService(t.TempDir())

	content := `# 标题

## 📝 任务描述

这是第一段
这是第二段

## 📄 详细内容

详细内容第一行
详细内容第二行

## 其他章节

其他内容
`

	tests := []struct {
		name           string
		sectionHeader  string
		expectedInside string
	}{
		{
			name:           "任务描述",
			sectionHeader:  "## 📝 任务描述",
			expectedInside: "这是第一段",
		},
		{
			name:           "详细内容",
			sectionHeader:  "## 📄 详细内容",
			expectedInside: "详细内容第一行",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.extractSection(content, tt.sectionHeader, "##")
			assert.Contains(t, result, tt.expectedInside)
			assert.NotContains(t, result, "其他内容") // 不应包含其他章节
		})
	}
}

func TestParseFileNameInfo(t *testing.T) {
	service := NewDevPlansExportService(t.TempDir())

	tests := []struct {
		name          string
		fileName      string
		expectedID    int
		expectedTitle string
		wantErr       bool
	}{
		{
			name:          "正常文件名",
			fileName:      "123_测试任务.md",
			expectedID:    123,
			expectedTitle: "测试任务",
			wantErr:       false,
		},
		{
			name:          "英文标题",
			fileName:      "456_Test_Task.md",
			expectedID:    456,
			expectedTitle: "Test_Task",
			wantErr:       false,
		},
		{
			name:          "标题包含下划线",
			fileName:      "789_任务_标题_测试.md",
			expectedID:    789,
			expectedTitle: "任务_标题_测试",
			wantErr:       false,
		},
		{
			name:     "无效格式（缺少ID）",
			fileName: "测试任务.md",
			wantErr:  true,
		},
		{
			name:     "无效格式（ID不是数字）",
			fileName: "abc_测试任务.md",
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			taskID, title, err := service.parseFileNameInfo(tt.fileName)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedID, taskID)
				assert.Equal(t, tt.expectedTitle, title)
			}
		})
	}
}

func TestImportTaskDocumentByFileName(t *testing.T) {
	tempDir := t.TempDir()
	service := NewDevPlansExportService(tempDir)
	ctx := context.Background()

	// 先创建并导出一个任务
	task := &models.Task{
		ID:        5003,
		ProjectID: 1,
		Title:     "通过文件名导入",
		Status:    "todo",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	document := &models.TaskDocument{
		TaskID:  task.ID,
		Version: 1,
	}

	exportResult, err := service.ExportTaskDocument(ctx, task, document, nil)
	require.NoError(t, err)
	require.True(t, exportResult.Success)

	// 使用文件名导入
	fileName := filepath.Base(exportResult.FilePath)
	result, parsed, err := service.ImportTaskDocumentByFileName(ctx, fileName, nil)

	require.NoError(t, err)
	assert.True(t, result.Success)
	assert.Equal(t, task.ID, result.TaskID)
	assert.Equal(t, task.ID, parsed.TaskID)
	assert.Equal(t, task.Title, parsed.Title)
}

func TestBatchImportTaskDocuments(t *testing.T) {
	tempDir := t.TempDir()
	service := NewDevPlansExportService(tempDir)
	ctx := context.Background()

	// 创建多个任务并导出
	tasks := []*models.Task{
		{ID: 6001, ProjectID: 1, Title: "批量任务1", Status: "todo", CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: 6002, ProjectID: 1, Title: "批量任务2", Status: "in_progress", CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: 6003, ProjectID: 1, Title: "批量任务3", Status: "completed", CreatedAt: time.Now(), UpdatedAt: time.Now()},
	}

	documents := map[int]*models.TaskDocument{
		6001: {TaskID: 6001, Version: 1},
		6002: {TaskID: 6002, Version: 1},
		6003: {TaskID: 6003, Version: 1},
	}

	// 批量导出
	exportResults, err := service.BatchExportTasks(ctx, tasks, documents, nil)
	require.NoError(t, err)
	assert.Len(t, exportResults, 3)

	// 准备导入映射
	taskMappings := map[int]string{
		6001: "批量任务1",
		6002: "批量任务2",
		6003: "批量任务3",
	}

	// 批量导入
	importResults, parsedDocs, err := service.BatchImportTaskDocuments(ctx, taskMappings, nil)

	require.NoError(t, err)
	assert.Len(t, importResults, 3)
	assert.Len(t, parsedDocs, 3)

	// 验证所有导入成功
	for _, result := range importResults {
		assert.True(t, result.Success, "Task %d import failed: %s", result.TaskID, result.Error)
	}

	// 验证解析的文档
	for taskID, parsed := range parsedDocs {
		assert.Equal(t, taskID, parsed.TaskID)
		assert.NotEmpty(t, parsed.Title)
	}
}

func TestImportWithOptions(t *testing.T) {
	tempDir := t.TempDir()
	service := NewDevPlansExportService(tempDir)
	ctx := context.Background()

	// 创建任务
	task := &models.Task{
		ID:        5004,
		ProjectID: 1,
		Title:     "选项测试任务",
		Status:    "in_progress",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	document := &models.TaskDocument{
		TaskID:  task.ID,
		Version: 1,
	}

	// 导出
	_, err := service.ExportTaskDocument(ctx, task, document, nil)
	require.NoError(t, err)

	// 使用自定义选项导入
	options := &ImportOptions{
		ForceOverwrite:     true,
		UpdateIfNewer:      true,
		PreserveMetadata:   true,
		ValidateTaskExists: false,
	}

	result, parsed, err := service.ImportTaskDocument(ctx, task.ID, task.Title, options)

	require.NoError(t, err)
	assert.True(t, result.Success)
	assert.NotNil(t, parsed)
	assert.NotZero(t, parsed.LastSync) // UpdateIfNewer 应该设置了时间
}
