package services

import (
	"ai-project-backend/interfaces"
	"context"
	"fmt"
	"io/ioutil"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// UnifiedDocumentService 统一文档服务实现
type UnifiedDocumentService struct {
	config    *interfaces.DocumentConfig
	cache     *DocumentCache
	templates *TemplateManager
	mutex     sync.RWMutex
}

// DocumentCache 文档缓存
type DocumentCache struct {
	cache   map[string]*CacheEntry
	mutex   sync.RWMutex
	maxSize int
	ttl     time.Duration
}

// CacheEntry 缓存条目
type CacheEntry struct {
	Content   string
	Timestamp time.Time
	Size      int64
}

// TemplateManager 模板管理器
type TemplateManager struct {
	templates map[string]string
	basePath  string
}

// NewUnifiedDocumentService 创建统一文档服务实例
func NewUnifiedDocumentService(config *interfaces.DocumentConfig) *UnifiedDocumentService {
	service := &UnifiedDocumentService{
		config: config,
		templates: &TemplateManager{
			templates: make(map[string]string),
			basePath:  filepath.Join(config.BasePath, "templates"),
		},
	}
	
	// 初始化缓存
	if config.CacheEnabled {
		service.cache = &DocumentCache{
			cache:   make(map[string]*CacheEntry),
			maxSize: config.Cache.MaxSize,
			ttl:     config.Cache.TTL,
		}
	}
	
	// 确保目录存在
	service.ensureDirectories()
	
	// 加载模板
	service.loadTemplates()
	
	return service
}

// CreateDocument 创建文档
func (s *UnifiedDocumentService) CreateDocument(ctx context.Context, req *interfaces.CreateDocumentRequest) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	
	// 验证请求
	if err := s.validateCreateRequest(req); err != nil {
		return fmt.Errorf("invalid create request: %w", err)
	}
	
	// 生成文档路径
	docPath := s.getDocumentPath(req.ProjectID, req.TaskID)
	
	// 检查文档是否已存在
	if _, err := os.Stat(docPath); err == nil {
		return fmt.Errorf("document already exists for task %d in project %d", req.TaskID, req.ProjectID)
	}
	
	// 确保目录存在
	if err := os.MkdirAll(filepath.Dir(docPath), 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}
	
	// 生成内容（如果指定了模板）
	content := req.Content
	if req.TemplateID != "" {
		var err error
		content, err = s.generateContentFromTemplate(req.TemplateID, req)
		if err != nil {
			return fmt.Errorf("failed to generate content from template: %w", err)
		}
	}
	
	// 写入文件
	if err := ioutil.WriteFile(docPath, []byte(content), 0644); err != nil {
		return fmt.Errorf("failed to write document: %w", err)
	}
	
	// Git提交
	if s.config.GitEnabled {
		if err := s.gitCommit(docPath, fmt.Sprintf("Create document for task %d", req.TaskID)); err != nil {
			// Git失败不阻止文档创建，只记录错误
			fmt.Printf("Git commit failed: %v\n", err)
		}
	}
	
	// 清除缓存
	s.clearCache(s.getCacheKey(req.ProjectID, req.TaskID))
	
	return nil
}

// ReadDocument 读取文档
func (s *UnifiedDocumentService) ReadDocument(ctx context.Context, req *interfaces.ReadDocumentRequest) (*interfaces.DocumentResponse, error) {
	// 验证请求
	if err := s.validateReadRequest(req); err != nil {
		return nil, fmt.Errorf("invalid read request: %w", err)
	}
	
	// 检查缓存
	cacheKey := s.getCacheKey(req.ProjectID, req.TaskID)
	if s.cache != nil {
		if cached := s.getFromCache(cacheKey); cached != nil {
			return s.buildDocumentResponse(req.ProjectID, req.TaskID, cached.Content), nil
		}
	}
	
	// 读取文件
	docPath := s.getDocumentPath(req.ProjectID, req.TaskID)
	content, err := ioutil.ReadFile(docPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("document not found for task %d in project %d", req.TaskID, req.ProjectID)
		}
		return nil, fmt.Errorf("failed to read document: %w", err)
	}
	
	contentStr := string(content)
	
	// 添加到缓存
	if s.cache != nil {
		s.addToCache(cacheKey, contentStr, int64(len(content)))
	}
	
	return s.buildDocumentResponse(req.ProjectID, req.TaskID, contentStr), nil
}

// UpdateDocument 更新文档
func (s *UnifiedDocumentService) UpdateDocument(ctx context.Context, req *interfaces.UpdateDocumentRequest) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	
	// 验证请求
	if err := s.validateUpdateRequest(req); err != nil {
		return fmt.Errorf("invalid update request: %w", err)
	}
	
	// 生成文档路径
	docPath := s.getDocumentPath(req.ProjectID, req.TaskID)
	
	// 检查文档是否存在
	if _, err := os.Stat(docPath); os.IsNotExist(err) {
		return fmt.Errorf("document not found for task %d in project %d", req.TaskID, req.ProjectID)
	}
	
	// 写入文件
	if err := ioutil.WriteFile(docPath, []byte(req.Content), 0644); err != nil {
		return fmt.Errorf("failed to update document: %w", err)
	}
	
	// Git提交
	if s.config.GitEnabled {
		message := req.Message
		if message == "" {
			message = fmt.Sprintf("Update document for task %d", req.TaskID)
		}
		if err := s.gitCommit(docPath, message); err != nil {
			fmt.Printf("Git commit failed: %v\n", err)
		}
	}
	
	// 清除缓存
	s.clearCache(s.getCacheKey(req.ProjectID, req.TaskID))
	
	return nil
}

// DeleteDocument 删除文档
func (s *UnifiedDocumentService) DeleteDocument(ctx context.Context, req *interfaces.DeleteDocumentRequest) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	
	// 验证请求
	if err := s.validateDeleteRequest(req); err != nil {
		return fmt.Errorf("invalid delete request: %w", err)
	}
	
	docPath := s.getDocumentPath(req.ProjectID, req.TaskID)
	
	// 检查文档是否存在
	if _, err := os.Stat(docPath); os.IsNotExist(err) {
		return fmt.Errorf("document not found for task %d in project %d", req.TaskID, req.ProjectID)
	}
	
	// 如果启用备份，先备份文件
	if s.config.BackupEnabled {
		if err := s.backupDocument(docPath); err != nil {
			return fmt.Errorf("failed to backup document: %w", err)
		}
	}
	
	// 删除文件
	if err := os.Remove(docPath); err != nil {
		return fmt.Errorf("failed to delete document: %w", err)
	}
	
	// Git提交
	if s.config.GitEnabled {
		message := fmt.Sprintf("Delete document for task %d", req.TaskID)
		if req.Reason != "" {
			message = fmt.Sprintf("Delete document for task %d: %s", req.TaskID, req.Reason)
		}
		if err := s.gitCommit(docPath, message); err != nil {
			fmt.Printf("Git commit failed: %v\n", err)
		}
	}
	
	// 清除缓存
	s.clearCache(s.getCacheKey(req.ProjectID, req.TaskID))
	
	return nil
}

// GetDocumentHistory 获取文档历史
func (s *UnifiedDocumentService) GetDocumentHistory(ctx context.Context, req *interfaces.HistoryRequest) ([]interfaces.GitCommit, error) {
	if !s.config.GitEnabled {
		return nil, fmt.Errorf("git is not enabled")
	}
	
	docPath := s.getDocumentPath(req.ProjectID, req.TaskID)
	relPath, err := filepath.Rel(s.getRepoRoot(), docPath)
	if err != nil {
		return nil, fmt.Errorf("failed to get relative path: %w", err)
	}
	
	// 构建git log命令
	args := []string{"log", "--pretty=format:%H|%an|%ad|%s", "--date=iso"}
	if req.Limit > 0 {
		args = append(args, fmt.Sprintf("--max-count=%d", req.Limit))
	}
	if req.Offset > 0 {
		args = append(args, fmt.Sprintf("--skip=%d", req.Offset))
	}
	args = append(args, "--", relPath)
	
	output, err := s.execGitCommandWithOutput(args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get git log: %w", err)
	}
	
	return s.parseGitLog(output), nil
}

// ArchiveDocument 归档文档
func (s *UnifiedDocumentService) ArchiveDocument(ctx context.Context, req *interfaces.ArchiveRequest) error {
	sourcePath := s.getDocumentPath(req.ProjectID, req.TaskID)
	archivePath := s.getArchivedDocumentPath(req.TaskID)
	
	// 检查源文件是否存在
	if _, err := os.Stat(sourcePath); os.IsNotExist(err) {
		return fmt.Errorf("document not found for task %d in project %d", req.TaskID, req.ProjectID)
	}
	
	// 确保归档目录存在
	if err := os.MkdirAll(filepath.Dir(archivePath), 0755); err != nil {
		return fmt.Errorf("failed to create archive directory: %w", err)
	}
	
	// 复制文件到归档目录
	content, err := ioutil.ReadFile(sourcePath)
	if err != nil {
		return fmt.Errorf("failed to read source file: %w", err)
	}
	
	if err := ioutil.WriteFile(archivePath, content, 0644); err != nil {
		return fmt.Errorf("failed to write archive file: %w", err)
	}
	
	// Git提交归档
	if s.config.GitEnabled {
		message := fmt.Sprintf("Archive document for task %d", req.TaskID)
		if req.Reason != "" {
			message = fmt.Sprintf("Archive document for task %d: %s", req.TaskID, req.Reason)
		}
		if err := s.gitCommit(archivePath, message); err != nil {
			fmt.Printf("Git commit failed: %v\n", err)
		}
	}
	
	return nil
}

// MigrateDocument 迁移文档
func (s *UnifiedDocumentService) MigrateDocument(ctx context.Context, req *interfaces.MigrateRequest) error {
	// 检查源文件是否存在
	if _, err := os.Stat(req.SourcePath); os.IsNotExist(err) {
		return fmt.Errorf("source document not found: %s", req.SourcePath)
	}
	
	// 如果是试运行，只验证不实际操作
	if req.DryRun {
		fmt.Printf("DRY RUN: Would migrate %s to %s\n", req.SourcePath, req.TargetPath)
		return nil
	}
	
	// 确保目标目录存在
	if err := os.MkdirAll(filepath.Dir(req.TargetPath), 0755); err != nil {
		return fmt.Errorf("failed to create target directory: %w", err)
	}
	
	// 复制文件
	content, err := ioutil.ReadFile(req.SourcePath)
	if err != nil {
		return fmt.Errorf("failed to read source file: %w", err)
	}
	
	if err := ioutil.WriteFile(req.TargetPath, content, 0644); err != nil {
		return fmt.Errorf("failed to write target file: %w", err)
	}
	
	// Git提交
	if s.config.GitEnabled {
		if err := s.gitCommit(req.TargetPath, fmt.Sprintf("Migrate document from %s to %s", req.SourcePath, req.TargetPath)); err != nil {
			fmt.Printf("Git commit failed: %v\n", err)
		}
	}
	
	return nil
}

// HealthCheck 健康检查
func (s *UnifiedDocumentService) HealthCheck(ctx context.Context) error {
	// 检查基础目录是否存在
	if _, err := os.Stat(s.config.BasePath); os.IsNotExist(err) {
		return fmt.Errorf("base path does not exist: %s", s.config.BasePath)
	}
	
	// 检查Git是否可用（如果启用）
	if s.config.GitEnabled {
		if _, err := exec.LookPath("git"); err != nil {
			return fmt.Errorf("git is not available: %w", err)
		}
	}
	
	return nil
}

// 私有方法

// getDocumentPath 获取文档路径（统一路径策略）
func (s *UnifiedDocumentService) getDocumentPath(projectID, taskID int) string {
	return filepath.Join(s.config.BasePath, "projects", fmt.Sprintf("project-%d", projectID), fmt.Sprintf("task-%d.md", taskID))
}

// getArchivedDocumentPath 获取归档文档路径
func (s *UnifiedDocumentService) getArchivedDocumentPath(taskID int) string {
	now := time.Now()
	return filepath.Join(s.config.BasePath, "archives", fmt.Sprintf("%d", now.Year()), fmt.Sprintf("%02d", now.Month()), fmt.Sprintf("task-%d-archived.md", taskID))
}

// ensureDirectories 确保所需目录存在
func (s *UnifiedDocumentService) ensureDirectories() {
	dirs := []string{
		filepath.Join(s.config.BasePath, "projects"),
		filepath.Join(s.config.BasePath, "archives"),
		filepath.Join(s.config.BasePath, "templates"),
		filepath.Join(s.config.BasePath, "backups"),
	}
	
	for _, dir := range dirs {
		os.MkdirAll(dir, 0755)
	}
}

// 验证方法
func (s *UnifiedDocumentService) validateCreateRequest(req *interfaces.CreateDocumentRequest) error {
	if req.ProjectID <= 0 || req.TaskID <= 0 || req.UserID <= 0 {
		return fmt.Errorf("invalid IDs")
	}
	if req.Content == "" {
		return fmt.Errorf("content cannot be empty")
	}
	return nil
}

func (s *UnifiedDocumentService) validateReadRequest(req *interfaces.ReadDocumentRequest) error {
	if req.ProjectID <= 0 || req.TaskID <= 0 || req.UserID <= 0 {
		return fmt.Errorf("invalid IDs")
	}
	return nil
}

func (s *UnifiedDocumentService) validateUpdateRequest(req *interfaces.UpdateDocumentRequest) error {
	if req.ProjectID <= 0 || req.TaskID <= 0 || req.UserID <= 0 {
		return fmt.Errorf("invalid IDs")
	}
	if req.Content == "" {
		return fmt.Errorf("content cannot be empty")
	}
	return nil
}

func (s *UnifiedDocumentService) validateDeleteRequest(req *interfaces.DeleteDocumentRequest) error {
	if req.ProjectID <= 0 || req.TaskID <= 0 || req.UserID <= 0 {
		return fmt.Errorf("invalid IDs")
	}
	return nil
}

// 缓存方法
func (s *UnifiedDocumentService) getCacheKey(projectID, taskID int) string {
	return fmt.Sprintf("doc:%d:%d", projectID, taskID)
}

func (s *UnifiedDocumentService) getFromCache(key string) *CacheEntry {
	if s.cache == nil {
		return nil
	}
	
	s.cache.mutex.RLock()
	defer s.cache.mutex.RUnlock()
	
	entry, exists := s.cache.cache[key]
	if !exists {
		return nil
	}
	
	// 检查是否过期
	if time.Since(entry.Timestamp) > s.cache.ttl {
		delete(s.cache.cache, key)
		return nil
	}
	
	return entry
}

func (s *UnifiedDocumentService) addToCache(key, content string, size int64) {
	if s.cache == nil {
		return
	}
	
	s.cache.mutex.Lock()
	defer s.cache.mutex.Unlock()
	
	// 检查缓存大小限制
	if len(s.cache.cache) >= s.cache.maxSize {
		// 清理最旧的条目
		s.evictOldestEntry()
	}
	
	s.cache.cache[key] = &CacheEntry{
		Content:   content,
		Timestamp: time.Now(),
		Size:      size,
	}
}

func (s *UnifiedDocumentService) clearCache(key string) {
	if s.cache == nil {
		return
	}
	
	s.cache.mutex.Lock()
	defer s.cache.mutex.Unlock()
	
	delete(s.cache.cache, key)
}

func (s *UnifiedDocumentService) evictOldestEntry() {
	var oldestKey string
	var oldestTime time.Time
	
	for key, entry := range s.cache.cache {
		if oldestKey == "" || entry.Timestamp.Before(oldestTime) {
			oldestKey = key
			oldestTime = entry.Timestamp
		}
	}
	
	if oldestKey != "" {
		delete(s.cache.cache, oldestKey)
	}
}

// 其他辅助方法
func (s *UnifiedDocumentService) buildDocumentResponse(projectID, taskID int, content string) *interfaces.DocumentResponse {
	docPath := s.getDocumentPath(projectID, taskID)
	stat, _ := os.Stat(docPath)
	
	response := &interfaces.DocumentResponse{
		TaskID:    taskID,
		ProjectID: projectID,
		Content:   content,
		Format:    "markdown",
		Size:      int64(len(content)),
		Path:      docPath,
	}
	
	if stat != nil {
		response.LastUpdated = stat.ModTime()
		response.CreatedAt = stat.ModTime() // 简化处理
	}
	
	return response
}

// Git相关方法（简化版本，基于原有代码）
func (s *UnifiedDocumentService) getRepoRoot() string {
	return filepath.Dir(filepath.Dir(s.config.BasePath))
}

func (s *UnifiedDocumentService) gitCommit(filePath, message string) error {
	repoRoot := s.getRepoRoot()
	
	// 添加文件到暂存区
	if err := s.execGitCommand(repoRoot, "add", filePath); err != nil {
		return fmt.Errorf("git add failed: %w", err)
	}
	
	// 提交更改
	if err := s.execGitCommand(repoRoot, "commit", "-m", message); err != nil {
		if strings.Contains(err.Error(), "nothing to commit") {
			return nil
		}
		return fmt.Errorf("git commit failed: %w", err)
	}
	
	return nil
}

func (s *UnifiedDocumentService) execGitCommand(workDir string, args ...string) error {
	cmd := exec.Command("git", args...)
	cmd.Dir = workDir
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("git command failed: %s, output: %s", err, string(output))
	}
	return nil
}

func (s *UnifiedDocumentService) execGitCommandWithOutput(args ...string) (string, error) {
	cmd := exec.Command("git", args...)
	cmd.Dir = s.getRepoRoot()
	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("git command failed: %w", err)
	}
	return string(output), nil
}

func (s *UnifiedDocumentService) parseGitLog(output string) []interfaces.GitCommit {
	var commits []interfaces.GitCommit
	lines := strings.Split(strings.TrimSpace(output), "\n")
	
	for _, line := range lines {
		if line == "" {
			continue
		}
		
		parts := strings.Split(line, "|")
		if len(parts) >= 4 {
			date, _ := time.Parse("2006-01-02 15:04:05 -0700", parts[2])
			commits = append(commits, interfaces.GitCommit{
				Hash:    parts[0],
				Author:  parts[1],
				Date:    date,
				Message: parts[3],
			})
		}
	}
	
	return commits
}

// 模板相关方法
func (s *UnifiedDocumentService) loadTemplates() {
	for name, path := range s.config.Templates {
		if content, err := ioutil.ReadFile(filepath.Join(s.templates.basePath, path)); err == nil {
			s.templates.templates[name] = string(content)
		}
	}
}

func (s *UnifiedDocumentService) generateContentFromTemplate(templateID string, req *interfaces.CreateDocumentRequest) (string, error) {
	template, exists := s.templates.templates[templateID]
	if !exists {
		return "", fmt.Errorf("template not found: %s", templateID)
	}
	
	// 简单的模板变量替换
	content := strings.ReplaceAll(template, "{TASK_ID}", fmt.Sprintf("%d", req.TaskID))
	content = strings.ReplaceAll(content, "{PROJECT_ID}", fmt.Sprintf("%d", req.ProjectID))
	content = strings.ReplaceAll(content, "{USER_ID}", fmt.Sprintf("%d", req.UserID))
	content = strings.ReplaceAll(content, "{CONTENT}", req.Content)
	content = strings.ReplaceAll(content, "{DATE}", time.Now().Format("2006-01-02"))
	content = strings.ReplaceAll(content, "{DATETIME}", time.Now().Format("2006-01-02 15:04:05"))
	
	return content, nil
}

func (s *UnifiedDocumentService) backupDocument(docPath string) error {
	backupDir := filepath.Join(s.config.BasePath, "backups", time.Now().Format("2006-01-02"))
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		return err
	}
	
	backupPath := filepath.Join(backupDir, fmt.Sprintf("%s.%d.bak", filepath.Base(docPath), time.Now().Unix()))
	
	content, err := ioutil.ReadFile(docPath)
	if err != nil {
		return err
	}
	
	return ioutil.WriteFile(backupPath, content, 0644)
}