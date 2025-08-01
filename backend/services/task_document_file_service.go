package services

import (
	"ai-project-backend/models"
	"context"
	"fmt"
	"io/ioutil"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// TaskDocumentFileService 基于文件系统的任务文档管理服务
type TaskDocumentFileService struct {
	basePath   string
	gitEnabled bool
}

// GitCommit Git提交信息
type GitCommit struct {
	Hash      string    `json:"hash"`
	Author    string    `json:"author"`
	Date      time.Time `json:"date"`
	Message   string    `json:"message"`
}

// DocumentDiff 文档差异信息
type DocumentDiff struct {
	FromHash string `json:"from_hash"`
	ToHash   string `json:"to_hash"`
	Diff     string `json:"diff"`
}

// NewTaskDocumentFileService 创建新的文档服务实例
func NewTaskDocumentFileService(basePath string) *TaskDocumentFileService {
	service := &TaskDocumentFileService{
		basePath:   basePath,
		gitEnabled: true,
	}
	
	// 确保基础目录存在
	service.ensureDirectories()
	
	return service
}

// ensureDirectories 确保所需目录存在
func (s *TaskDocumentFileService) ensureDirectories() {
	dirs := []string{
		filepath.Join(s.basePath, "tasks", "projects"),
		filepath.Join(s.basePath, "tasks", "personal"),
		filepath.Join(s.basePath, "tasks", "templates"),
		filepath.Join(s.basePath, "tasks", "archives"),
	}
	
	for _, dir := range dirs {
		os.MkdirAll(dir, 0755)
	}
}

// CreateTaskDocument 创建任务文档
func (s *TaskDocumentFileService) CreateTaskDocument(ctx context.Context, task *models.Task, projectID int) error {
	docPath := s.getTaskDocumentPath(task.ID, projectID)
	content := s.generateTaskDocumentContent(task, projectID)
	
	// 确保项目目录存在
	if err := os.MkdirAll(filepath.Dir(docPath), 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}
	
	// 写入文件
	if err := ioutil.WriteFile(docPath, []byte(content), 0644); err != nil {
		return fmt.Errorf("failed to write document: %w", err)
	}
	
	// Git提交
	if s.gitEnabled {
		if err := s.gitCommit(docPath, fmt.Sprintf("Create task document: %s (ID: %d)", task.Title, task.ID)); err != nil {
			// Git失败不阻止文档创建，只记录错误
			fmt.Printf("Git commit failed: %v\n", err)
		}
	}
	
	return nil
}

// CreatePersonalTaskDocument 创建个人任务文档
func (s *TaskDocumentFileService) CreatePersonalTaskDocument(ctx context.Context, task *models.UserTimerTask) error {
	docPath := s.getPersonalTaskDocumentPath(task.ID, task.UserID)
	content := s.generatePersonalTaskDocumentContent(task)
	
	// 确保用户目录存在
	if err := os.MkdirAll(filepath.Dir(docPath), 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}
	
	// 写入文件
	if err := ioutil.WriteFile(docPath, []byte(content), 0644); err != nil {
		return fmt.Errorf("failed to write personal document: %w", err)
	}
	
	// Git提交
	if s.gitEnabled {
		if err := s.gitCommit(docPath, fmt.Sprintf("Create personal task document: %s (ID: %d)", task.Title, task.ID)); err != nil {
			fmt.Printf("Git commit failed: %v\n", err)
		}
	}
	
	return nil
}

// UpdateTaskDocument 更新任务文档元数据
func (s *TaskDocumentFileService) UpdateTaskDocument(ctx context.Context, task *models.Task, projectID int) error {
	docPath := s.getTaskDocumentPath(task.ID, projectID)
	
	// 读取现有内容
	existingContent, err := s.readTaskDocument(docPath)
	if err != nil {
		// 如果文档不存在，创建新的
		return s.CreateTaskDocument(ctx, task, projectID)
	}
	
	// 更新元数据部分，保留内容部分
	updatedContent := s.updateTaskDocumentMetadata(existingContent, task)
	
	// 写入文件
	if err := ioutil.WriteFile(docPath, []byte(updatedContent), 0644); err != nil {
		return fmt.Errorf("failed to update document: %w", err)
	}
	
	// Git提交
	if s.gitEnabled {
		if err := s.gitCommit(docPath, fmt.Sprintf("Update task document metadata: %s (ID: %d)", task.Title, task.ID)); err != nil {
			fmt.Printf("Git commit failed: %v\n", err)
		}
	}
	
	return nil
}

// ReadTaskDocument 读取任务文档
func (s *TaskDocumentFileService) ReadTaskDocument(taskID, projectID int) (string, error) {
	docPath := s.getTaskDocumentPath(taskID, projectID)
	return s.readTaskDocument(docPath)
}

// ReadPersonalTaskDocument 读取个人任务文档
func (s *TaskDocumentFileService) ReadPersonalTaskDocument(taskID, userID int) (string, error) {
	docPath := s.getPersonalTaskDocumentPath(taskID, userID)
	return s.readTaskDocument(docPath)
}

// UpdateDocumentContent 更新文档内容（用户手动编辑）
func (s *TaskDocumentFileService) UpdateDocumentContent(taskID, projectID int, content string, isPersonal bool, userID int) error {
	var docPath string
	var commitMessage string
	
	if isPersonal {
		docPath = s.getPersonalTaskDocumentPath(taskID, userID)
		commitMessage = fmt.Sprintf("Update personal task document content: task-%d", taskID)
	} else {
		docPath = s.getTaskDocumentPath(taskID, projectID)
		commitMessage = fmt.Sprintf("Update task document content: task-%d", taskID)
	}
	
	if err := ioutil.WriteFile(docPath, []byte(content), 0644); err != nil {
		return fmt.Errorf("failed to update document content: %w", err)
	}
	
	// Git提交
	if s.gitEnabled {
		if err := s.gitCommit(docPath, commitMessage); err != nil {
			fmt.Printf("Git commit failed: %v\n", err)
		}
	}
	
	return nil
}

// ArchiveTaskDocument 归档任务文档
func (s *TaskDocumentFileService) ArchiveTaskDocument(taskID, projectID int) error {
	sourcePath := s.getTaskDocumentPath(taskID, projectID)
	archivePath := s.getArchivedDocumentPath(taskID)
	
	// 检查源文件是否存在
	if _, err := os.Stat(sourcePath); os.IsNotExist(err) {
		return nil // 文档不存在，无需归档
	}
	
	// 确保归档目录存在
	if err := os.MkdirAll(filepath.Dir(archivePath), 0755); err != nil {
		return fmt.Errorf("failed to create archive directory: %w", err)
	}
	
	// 复制文件到归档目录（而不是移动，保留原文件用于历史记录）
	content, err := ioutil.ReadFile(sourcePath)
	if err != nil {
		return fmt.Errorf("failed to read source file: %w", err)
	}
	
	if err := ioutil.WriteFile(archivePath, content, 0644); err != nil {
		return fmt.Errorf("failed to write archive file: %w", err)
	}
	
	// Git提交归档
	if s.gitEnabled {
		if err := s.gitCommit(archivePath, fmt.Sprintf("Archive task document: task-%d", taskID)); err != nil {
			fmt.Printf("Git commit failed: %v\n", err)
		}
	}
	
	return nil
}

// GetDocumentHistory 获取文档的Git历史
func (s *TaskDocumentFileService) GetDocumentHistory(taskID, projectID int, isPersonal bool, userID int) ([]GitCommit, error) {
	var docPath string
	if isPersonal {
		docPath = s.getPersonalTaskDocumentPath(taskID, userID)
	} else {
		docPath = s.getTaskDocumentPath(taskID, projectID)
	}
	
	// 获取相对路径（相对于仓库根目录）
	relPath, err := filepath.Rel(s.getRepoRoot(), docPath)
	if err != nil {
		return nil, fmt.Errorf("failed to get relative path: %w", err)
	}
	
	output, err := s.execGitCommandWithOutput("log", "--pretty=format:%H|%an|%ad|%s", "--date=iso", "--", relPath)
	if err != nil {
		return nil, fmt.Errorf("failed to get git log: %w", err)
	}
	
	return s.parseGitLog(output), nil
}

// CompareDocumentVersions 比较文档版本
func (s *TaskDocumentFileService) CompareDocumentVersions(taskID, projectID int, fromHash, toHash string, isPersonal bool, userID int) (*DocumentDiff, error) {
	var docPath string
	if isPersonal {
		docPath = s.getPersonalTaskDocumentPath(taskID, userID)
	} else {
		docPath = s.getTaskDocumentPath(taskID, projectID)
	}
	
	relPath, err := filepath.Rel(s.getRepoRoot(), docPath)
	if err != nil {
		return nil, fmt.Errorf("failed to get relative path: %w", err)
	}
	
	diff, err := s.execGitCommandWithOutput("diff", fromHash, toHash, "--", relPath)
	if err != nil {
		return nil, fmt.Errorf("failed to get diff: %w", err)
	}
	
	return &DocumentDiff{
		FromHash: fromHash,
		ToHash:   toHash,
		Diff:     diff,
	}, nil
}

// 私有方法实现

// getTaskDocumentPath 获取任务文档路径
func (s *TaskDocumentFileService) getTaskDocumentPath(taskID, projectID int) string {
	return filepath.Join(s.basePath, "tasks", "projects", fmt.Sprintf("project-%d", projectID), fmt.Sprintf("task-%d.md", taskID))
}

// getPersonalTaskDocumentPath 获取个人任务文档路径
func (s *TaskDocumentFileService) getPersonalTaskDocumentPath(taskID, userID int) string {
	return filepath.Join(s.basePath, "tasks", "personal", fmt.Sprintf("user-%d", userID), fmt.Sprintf("personal-task-%d.md", taskID))
}

// getArchivedDocumentPath 获取归档文档路径
func (s *TaskDocumentFileService) getArchivedDocumentPath(taskID int) string {
	now := time.Now()
	return filepath.Join(s.basePath, "tasks", "archives", fmt.Sprintf("%d", now.Year()), fmt.Sprintf("%02d", now.Month()), fmt.Sprintf("task-%d-archived.md", taskID))
}

// getRepoRoot 获取Git仓库根目录
func (s *TaskDocumentFileService) getRepoRoot() string {
	// 假设项目根目录就是Git仓库根目录
	return filepath.Dir(filepath.Dir(s.basePath)) // basePath通常是 "项目根/backend/docs"
}

// loadTemplate 加载文档模板
func (s *TaskDocumentFileService) loadTemplate(templateName string) string {
	templatePath := filepath.Join(s.basePath, "tasks", "templates", templateName)
	content, err := ioutil.ReadFile(templatePath)
	if err != nil {
		// 如果模板不存在，返回基础模板
		return s.getDefaultTemplate(templateName)
	}
	return string(content)
}

// getDefaultTemplate 获取默认模板
func (s *TaskDocumentFileService) getDefaultTemplate(templateName string) string {
	switch templateName {
	case "task-template.md":
		return `---
task_id: {TASK_ID}
title: "{TASK_TITLE}"
status: "{TASK_STATUS}"
created_date: "{CREATED_DATE}"
updated_date: "{UPDATED_DATE}"
---

# {TASK_TITLE}

## 任务描述
{TASK_DESCRIPTION}

## 详细内容
请在这里添加任务的详细内容...

---
*最后更新: {UPDATED_DATE}*`
	case "personal-task-template.md":
		return `---
task_id: {TASK_ID}
title: "{TASK_TITLE}"
category: "{CATEGORY}"
created_date: "{CREATED_DATE}"
---

# {TASK_TITLE}

## 个人目标
{PERSONAL_GOAL}

## 工作日志
请在这里记录工作进展...

---
*个人任务 | 最后更新: {UPDATED_DATE}*`
	default:
		return "# 文档模板\n\n请添加内容..."
	}
}

// generateTaskDocumentContent 生成任务文档内容
func (s *TaskDocumentFileService) generateTaskDocumentContent(task *models.Task, projectID int) string {
	template := s.loadTemplate("task-template.md")
	
	// 替换模板变量
	content := strings.ReplaceAll(template, "{TASK_ID}", fmt.Sprintf("%d", task.ID))
	content = strings.ReplaceAll(content, "{PROJECT_ID}", fmt.Sprintf("%d", projectID))
	content = strings.ReplaceAll(content, "{TASK_TITLE}", task.Title)
	content = strings.ReplaceAll(content, "{TASK_STATUS}", task.Status)
	content = strings.ReplaceAll(content, "{TASK_PRIORITY}", "medium") // 默认优先级
	content = strings.ReplaceAll(content, "{ASSIGNEE}", "")
	content = strings.ReplaceAll(content, "{TASK_DESCRIPTION}", task.Description)
	content = strings.ReplaceAll(content, "{DETAILED_DESCRIPTION}", "请添加详细描述...")
	content = strings.ReplaceAll(content, "{CREATED_DATE}", task.CreatedAt.Format("2006-01-02 15:04:05"))
	content = strings.ReplaceAll(content, "{UPDATED_DATE}", task.UpdatedAt.Format("2006-01-02 15:04:05"))
	content = strings.ReplaceAll(content, "{DUE_DATE}", "")
	content = strings.ReplaceAll(content, "{PARENT_TASK_ID}", "")
	content = strings.ReplaceAll(content, "{ESTIMATED_HOURS}", "0")
	content = strings.ReplaceAll(content, "{ACTUAL_HOURS}", "0")
	content = strings.ReplaceAll(content, "{TAG1}", "")
	content = strings.ReplaceAll(content, "{TAG2}", "")
	content = strings.ReplaceAll(content, "{TAGS}", "")
	content = strings.ReplaceAll(content, "{CREATOR}", "System")
	content = strings.ReplaceAll(content, "{DATE}", time.Now().Format("2006-01-02"))
	content = strings.ReplaceAll(content, "{AUTHOR}", "System")
	content = strings.ReplaceAll(content, "{DISCUSSION_CONTENT}", "暂无讨论记录")
	content = strings.ReplaceAll(content, "{START}", "")
	content = strings.ReplaceAll(content, "{END}", "")
	content = strings.ReplaceAll(content, "{DURATION}", "")
	content = strings.ReplaceAll(content, "{DESCRIPTION}", "")
	
	return content
}

// generatePersonalTaskDocumentContent 生成个人任务文档内容
func (s *TaskDocumentFileService) generatePersonalTaskDocumentContent(task *models.UserTimerTask) string {
	template := s.loadTemplate("personal-task-template.md")
	
	// 替换模板变量
	content := strings.ReplaceAll(template, "{TASK_ID}", fmt.Sprintf("%d", task.ID))
	content = strings.ReplaceAll(content, "{USER_ID}", fmt.Sprintf("%d", task.UserID))
	content = strings.ReplaceAll(content, "{TASK_TITLE}", task.Title)
	content = strings.ReplaceAll(content, "{CATEGORY}", task.Category)
	content = strings.ReplaceAll(content, "{PRIORITY}", task.Priority)
	content = strings.ReplaceAll(content, "{STATUS}", task.Status)
	content = strings.ReplaceAll(content, "{COLOR}", task.Color)
	content = strings.ReplaceAll(content, "{PERSONAL_GOAL}", "请设定个人目标...")
	content = strings.ReplaceAll(content, "{TASK_CONTENT}", task.Description)
	content = strings.ReplaceAll(content, "{CREATED_DATE}", task.CreatedAt.Format("2006-01-02 15:04:05"))
	content = strings.ReplaceAll(content, "{UPDATED_DATE}", task.UpdatedAt.Format("2006-01-02 15:04:05"))
	content = strings.ReplaceAll(content, "{TARGET_HOURS}", fmt.Sprintf("%.1f", float64(task.TargetTimeSeconds)/3600))
	content = strings.ReplaceAll(content, "{TOTAL_HOURS}", fmt.Sprintf("%.1f", float64(task.TotalTimeSeconds)/3600))
	content = strings.ReplaceAll(content, "{START_DATE}", task.CreatedAt.Format("2006-01-02"))
	content = strings.ReplaceAll(content, "{TARGET_DATE}", "")
	content = strings.ReplaceAll(content, "{PROGRESS}", "0")
	content = strings.ReplaceAll(content, "{USED_HOURS}", fmt.Sprintf("%.1f", float64(task.TotalTimeSeconds)/3600))
	content = strings.ReplaceAll(content, "{REMAINING_HOURS}", fmt.Sprintf("%.1f", float64(task.TargetTimeSeconds-task.TotalTimeSeconds)/3600))
	content = strings.ReplaceAll(content, "{TODAY_HOURS}", "0")
	content = strings.ReplaceAll(content, "{WEEK_HOURS}", "0")
	content = strings.ReplaceAll(content, "{CURRENT_STATUS}", task.Status)
	content = strings.ReplaceAll(content, "{DATE}", time.Now().Format("2006-01-02"))
	content = strings.ReplaceAll(content, "{DURATION}", "0小时")
	content = strings.ReplaceAll(content, "{WORK_CONTENT}", "请记录工作内容...")
	content = strings.ReplaceAll(content, "{COMPLETION_STATUS}", "")
	content = strings.ReplaceAll(content, "{ISSUES}", "")
	content = strings.ReplaceAll(content, "{NOTES}", "")
	content = strings.ReplaceAll(content, "{PREV_DATE}", "")
	content = strings.ReplaceAll(content, "{PREV_DURATION}", "")
	content = strings.ReplaceAll(content, "{PREV_WORK_CONTENT}", "")
	content = strings.ReplaceAll(content, "{PREV_COMPLETION_STATUS}", "")
	
	return content
}

// readTaskDocument 读取任务文档
func (s *TaskDocumentFileService) readTaskDocument(docPath string) (string, error) {
	content, err := ioutil.ReadFile(docPath)
	if err != nil {
		return "", fmt.Errorf("failed to read document: %w", err)
	}
	return string(content), nil
}

// updateTaskDocumentMetadata 更新任务文档元数据
func (s *TaskDocumentFileService) updateTaskDocumentMetadata(existingContent string, task *models.Task) string {
	// 使用正则表达式更新前置matter中的元数据
	lines := strings.Split(existingContent, "\n")
	var updatedLines []string
	inFrontMatter := false
	frontMatterEnded := false
	
	for i, line := range lines {
		if i == 0 && strings.TrimSpace(line) == "---" {
			inFrontMatter = true
			updatedLines = append(updatedLines, line)
			continue
		}
		
		if inFrontMatter && strings.TrimSpace(line) == "---" && i > 0 {
			frontMatterEnded = true
			inFrontMatter = false
			updatedLines = append(updatedLines, line)
			continue
		}
		
		if inFrontMatter && !frontMatterEnded {
			// 更新元数据字段
			if strings.HasPrefix(line, "title:") {
				updatedLines = append(updatedLines, fmt.Sprintf("title: \"%s\"", task.Title))
			} else if strings.HasPrefix(line, "status:") {
				updatedLines = append(updatedLines, fmt.Sprintf("status: \"%s\"", task.Status))
			} else if strings.HasPrefix(line, "updated_date:") {
				updatedLines = append(updatedLines, fmt.Sprintf("updated_date: \"%s\"", task.UpdatedAt.Format("2006-01-02 15:04:05")))
			} else {
				updatedLines = append(updatedLines, line)
			}
		} else {
			updatedLines = append(updatedLines, line)
		}
	}
	
	return strings.Join(updatedLines, "\n")
}

// Git相关方法

// gitCommit 提交文件到Git
func (s *TaskDocumentFileService) gitCommit(filePath, message string) error {
	repoRoot := s.getRepoRoot()
	
	// 添加文件到暂存区
	if err := s.execGitCommand(repoRoot, "add", filePath); err != nil {
		return fmt.Errorf("git add failed: %w", err)
	}
	
	// 提交更改
	if err := s.execGitCommand(repoRoot, "commit", "-m", message); err != nil {
		// 如果没有更改需要提交，不报错
		if strings.Contains(err.Error(), "nothing to commit") {
			return nil
		}
		return fmt.Errorf("git commit failed: %w", err)
	}
	
	return nil
}

// execGitCommand 执行Git命令
func (s *TaskDocumentFileService) execGitCommand(workDir string, args ...string) error {
	cmd := exec.Command("git", args...)
	cmd.Dir = workDir
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("git command failed: %s, output: %s", err, string(output))
	}
	return nil
}

// execGitCommandWithOutput 执行Git命令并返回输出
func (s *TaskDocumentFileService) execGitCommandWithOutput(args ...string) (string, error) {
	cmd := exec.Command("git", args...)
	cmd.Dir = s.getRepoRoot()
	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("git command failed: %w", err)
	}
	return string(output), nil
}

// parseGitLog 解析Git日志输出
func (s *TaskDocumentFileService) parseGitLog(output string) []GitCommit {
	var commits []GitCommit
	lines := strings.Split(strings.TrimSpace(output), "\n")
	
	for _, line := range lines {
		if line == "" {
			continue
		}
		
		parts := strings.Split(line, "|")
		if len(parts) >= 4 {
			date, _ := time.Parse("2006-01-02 15:04:05 -0700", parts[2])
			commits = append(commits, GitCommit{
				Hash:    parts[0],
				Author:  parts[1],
				Date:    date,
				Message: parts[3],
			})
		}
	}
	
	return commits
}