package config

import (
	"ai-project-backend/interfaces"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"gopkg.in/yaml.v2"
)

// LoadDocumentConfig 加载文档配置
func LoadDocumentConfig(configPath string) (*interfaces.DocumentConfig, error) {
	// 如果没有指定配置文件路径，使用默认路径
	if configPath == "" {
		configPath = "./config/document.yaml"
	}

	// 读取配置文件
	data, err := os.ReadFile(configPath)
	if err != nil {
		// 如果配置文件不存在，返回默认配置
		if os.IsNotExist(err) {
			return getDefaultDocumentConfig(), nil
		}
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	// 解析YAML配置
	var config struct {
		Document    *interfaces.DocumentConfig `yaml:"document"`
		Development struct {
			Document *interfaces.DocumentConfig `yaml:"document"`
		} `yaml:"development"`
		Production struct {
			Document *interfaces.DocumentConfig `yaml:"document"`
		} `yaml:"production"`
	}

	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	// 根据环境选择配置
	env := os.Getenv("APP_ENV")
	var documentConfig *interfaces.DocumentConfig

	switch env {
	case "production":
		if config.Production.Document != nil {
			documentConfig = config.Production.Document
		}
	case "development":
		if config.Development.Document != nil {
			documentConfig = config.Development.Document
		}
	}

	// 如果没有找到环境特定配置，使用默认配置
	if documentConfig == nil {
		if config.Document != nil {
			documentConfig = config.Document
		} else {
			documentConfig = getDefaultDocumentConfig()
		}
	}

	// 验证并完善配置
	if err := validateAndCompleteConfig(documentConfig); err != nil {
		return nil, fmt.Errorf("invalid config: %w", err)
	}

	return documentConfig, nil
}

// getDefaultDocumentConfig 获取默认配置
func getDefaultDocumentConfig() *interfaces.DocumentConfig {
	return &interfaces.DocumentConfig{
		BasePath:          "./docs",
		GitEnabled:        true,
		CacheEnabled:      true,
		MaxFileSize:       10 * 1024 * 1024, // 10MB
		AllowedExtensions: []string{".md", ".txt"},
		BackupEnabled:     true,
		Templates: map[string]string{
			"task_template":     "task-template.md",
			"personal_template": "personal-task-template.md",
			"project_template":  "project-template.md",
		},
		Cache: interfaces.CacheConfig{
			TTL:     time.Hour,
			MaxSize: 1000,
			Enabled: true,
		},
		Git: interfaces.GitConfig{
			Enabled:      true,
			AutoCommit:   true,
			CommitPrefix: "docs:",
			AuthorName:   "AI Project System",
			AuthorEmail:  "noreply@ai-project.com",
		},
	}
}

// validateAndCompleteConfig 验证并完善配置
func validateAndCompleteConfig(config *interfaces.DocumentConfig) error {
	if config.BasePath == "" {
		config.BasePath = "./docs"
	}

	// 确保路径是绝对路径或相对于当前工作目录
	if !filepath.IsAbs(config.BasePath) {
		abs, err := filepath.Abs(config.BasePath)
		if err != nil {
			return fmt.Errorf("failed to get absolute path: %w", err)
		}
		config.BasePath = abs
	}

	if config.MaxFileSize <= 0 {
		config.MaxFileSize = 10 * 1024 * 1024 // 默认10MB
	}

	if len(config.AllowedExtensions) == 0 {
		config.AllowedExtensions = []string{".md", ".txt"}
	}

	if config.Templates == nil {
		config.Templates = make(map[string]string)
	}

	// 验证缓存配置
	if config.Cache.TTL <= 0 {
		config.Cache.TTL = time.Hour
	}
	if config.Cache.MaxSize <= 0 {
		config.Cache.MaxSize = 1000
	}

	// 验证Git配置
	if config.Git.CommitPrefix == "" {
		config.Git.CommitPrefix = "docs:"
	}
	if config.Git.AuthorName == "" {
		config.Git.AuthorName = "AI Project System"
	}
	if config.Git.AuthorEmail == "" {
		config.Git.AuthorEmail = "noreply@ai-project.com"
	}

	return nil
}

// CreateTemplateFiles 创建默认模板文件
func CreateTemplateFiles(config *interfaces.DocumentConfig) error {
	templateDir := filepath.Join(config.BasePath, "templates")
	if err := os.MkdirAll(templateDir, 0755); err != nil {
		return fmt.Errorf("failed to create template directory: %w", err)
	}

	templates := map[string]string{
		"task-template.md": `---
task_id: {TASK_ID}
project_id: {PROJECT_ID}
title: "{TASK_TITLE}"
created_date: "{DATE}"
---

# {TASK_TITLE}

## 任务描述
{CONTENT}

## 详细内容
请在这里添加任务的详细内容...

## 进度记录
- {DATETIME}: 任务创建

---
*最后更新: {DATETIME}*`,

		"personal-task-template.md": `---
task_id: {TASK_ID}
user_id: {USER_ID}
created_date: "{DATE}"
---

# 个人任务

## 目标
{CONTENT}

## 工作日志
请在这里记录工作进展...

---
*个人任务 | 最后更新: {DATETIME}*`,

		"project-template.md": `---
project_id: {PROJECT_ID}
created_date: "{DATE}"
---

# 项目文档

## 项目概述
{CONTENT}

## 项目进展
请在这里记录项目进展...

---
*项目文档 | 最后更新: {DATETIME}*`,
	}

	for filename, content := range templates {
		filePath := filepath.Join(templateDir, filename)
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			if err := os.WriteFile(filePath, []byte(content), 0644); err != nil {
				return fmt.Errorf("failed to create template file %s: %w", filename, err)
			}
		}
	}

	return nil
}
