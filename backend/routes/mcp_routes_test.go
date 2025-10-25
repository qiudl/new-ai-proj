package routes

import (
	"strings"
	"testing"
)

// TestTitleGeneration 测试标题生成逻辑
func TestTitleGeneration(t *testing.T) {
	tests := []struct {
		name     string
		content  string
		expected string
	}{
		{
			name:     "单级Markdown标题",
			content:  "# 任务实现方案\n\n详细内容...",
			expected: "任务实现方案",
		},
		{
			name:     "多级Markdown标题",
			content:  "### 任务实现方案\n\n详细内容...",
			expected: "任务实现方案",
		},
		{
			name:     "带空格的多级标题",
			content:  "##  任务实现方案  \n\n详细内容...",
			expected: "任务实现方案",
		},
		{
			name:     "长标题截断",
			content:  strings.Repeat("中文字符", 100) + "\n\n内容",
			expected: strings.Repeat("中文字符", 30) + "...",
		},
		{
			name:     "空内容",
			content:  "",
			expected: "任务文档",
		},
		{
			name:     "只有换行符",
			content:  "\n\n\n",
			expected: "任务文档",
		},
		{
			name:     "普通文本第一行",
			content:  "这是普通文本\n\n详细内容...",
			expected: "这是普通文本",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// 模拟标题生成逻辑
			title := generateTitleFromContent(tt.content)
			if title != tt.expected {
				t.Errorf("generateTitleFromContent() = %v, want %v", title, tt.expected)
			}
		})
	}
}

// generateTitleFromContent 提取的标题生成逻辑（用于测试）
func generateTitleFromContent(content string) string {
	title := ""

	if content == "" {
		return "任务文档"
	}

	// 从内容第一行提取标题
	lines := strings.Split(content, "\n")
	if len(lines) > 0 {
		firstLine := strings.TrimSpace(lines[0])
		// 移除Markdown标题标记（支持多级标题如 ### 标题）
		firstLine = strings.TrimLeft(firstLine, "# ")
		firstLine = strings.TrimSpace(firstLine)

		// 限制标题长度为60个中文字符（使用rune计数避免UTF-8乱码）
		runes := []rune(firstLine)
		if len(runes) > 60 {
			title = string(runes[:60]) + "..."
		} else if firstLine != "" {
			title = firstLine
		} else {
			title = "任务文档"
		}
	} else {
		title = "任务文档"
	}

	return title
}

// TestMarkdownHeadingRemoval 测试Markdown标题标记移除
func TestMarkdownHeadingRemoval(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"# 标题", "标题"},
		{"## 标题", "标题"},
		{"### 标题", "标题"},
		{"#### 标题", "标题"},
		{"##### 标题", "标题"},
		{"###### 标题", "标题"},
		{"####### 标题", "标题"}, // 7级标题（虽然不标准）
		{"  ## 带空格的标题  ", "带空格的标题"},
		{"标题无井号", "标题无井号"},
		{"", ""},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := strings.TrimSpace(strings.TrimLeft(strings.TrimSpace(tt.input), "# "))
			if result != tt.expected {
				t.Errorf("TrimLeft(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}

// BenchmarkTitleGeneration 性能基准测试
func BenchmarkTitleGeneration(b *testing.B) {
	content := "### 任务实现方案\n\n这是详细内容..."

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = generateTitleFromContent(content)
	}
}
