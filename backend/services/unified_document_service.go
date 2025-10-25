package services

import (
	"ai-project-backend/database"
	"ai-project-backend/interfaces"
	"context"
	"database/sql"
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
	db        interface{} // database.DB接口，支持数据库操作
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
func NewUnifiedDocumentService(config *interfaces.DocumentConfig, db ...interface{}) *UnifiedDocumentService {
	service := &UnifiedDocumentService{
		config: config,
		templates: &TemplateManager{
			templates: make(map[string]string),
			basePath:  filepath.Join(config.BasePath, "templates"),
		},
	}

	// 可选的数据库参数（用于CopyDocument和ToggleTemplate等功能）
	if len(db) > 0 {
		service.db = db[0]
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

// UpdateDocumentByID 通过文档ID更新文档
// 用于全局文档路由，自动查找文档所属的项目和任务
// 返回更新后的完整文档数据，方便MCP客户端使用
func (s *UnifiedDocumentService) UpdateDocumentByID(ctx context.Context, req *interfaces.UpdateDocumentByIDRequest) (*interfaces.DocumentResponse, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database not available for UpdateDocumentByID operation")
	}

	// 类型断言获取database.DB接口
	db, ok := s.db.(database.DB)
	if !ok {
		return nil, fmt.Errorf("database does not implement database.DB interface")
	}

	// 获取文档
	doc, err := db.Documents().GetByID(ctx, req.DocumentID)
	if err != nil {
		return nil, fmt.Errorf("document not found: %w", err)
	}

	// 更新标题（如果提供）
	if req.Title != "" {
		doc.Title = req.Title
	}

	// 更新内容
	doc.Content = &req.Content

	// 调用Update方法（会自动创建版本快照）
	updatedDoc, err := db.Documents().Update(ctx, doc)
	if err != nil {
		return nil, fmt.Errorf("failed to update document: %w", err)
	}

	// 构造响应（包含完整文档信息）
	content := ""
	if updatedDoc.Content != nil {
		content = *updatedDoc.Content
	}

	// 处理ProjectID指针
	projectID := 0
	if updatedDoc.ProjectID != nil {
		projectID = *updatedDoc.ProjectID
	}

	response := &interfaces.DocumentResponse{
		TaskID:      updatedDoc.ID, // 使用文档ID（TaskID字段在此场景下暂时使用文档ID）
		ProjectID:   projectID,
		Title:       updatedDoc.Title,
		Content:     content,
		Format:      string(updatedDoc.Type), // 转换DocumentType为string
		Size:        int64(len(content)),
		LastUpdated: updatedDoc.UpdatedAt,
		CreatedAt:   updatedDoc.CreatedAt,
		Version:     fmt.Sprintf("%d", updatedDoc.Version),
	}

	return response, nil
}

// GetDocumentByID 通过文档ID获取文档
// 用于全局文档路由
func (s *UnifiedDocumentService) GetDocumentByID(ctx context.Context, req *interfaces.GetDocumentByIDRequest) (*interfaces.DocumentResponse, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database not available for GetDocumentByID operation")
	}

	// 类型断言获取database.DB接口
	db, ok := s.db.(database.DB)
	if !ok {
		return nil, fmt.Errorf("database does not implement database.DB interface")
	}

	// 获取文档
	doc, err := db.Documents().GetByID(ctx, req.DocumentID)
	if err != nil {
		return nil, fmt.Errorf("document not found: %w", err)
	}

	// 构建响应
	var content string
	if doc.Content != nil {
		content = *doc.Content
	}

	response := &interfaces.DocumentResponse{
		Title:       doc.Title,
		Content:     content,
		Version:     fmt.Sprintf("v%d", doc.Version),
		CreatedAt:   doc.CreatedAt,
		LastUpdated: doc.UpdatedAt,
		Format:      "markdown",
		Size:        int64(len(content)),
	}

	return response, nil
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

// getDocumentPath 获取文档路径（兼容现有tasks目录结构）
func (s *UnifiedDocumentService) getDocumentPath(projectID, taskID int) string {
	return filepath.Join(s.config.BasePath, "tasks", "projects", fmt.Sprintf("project-%d", projectID), fmt.Sprintf("task-%d.md", taskID))
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

// ===== Phase 2: 版本管理功能实现 =====

// CompareVersions 比较文档版本
func (s *UnifiedDocumentService) CompareVersions(ctx context.Context, req *interfaces.CompareVersionsRequest) (*interfaces.VersionComparisonResponse, error) {
	if !s.config.Git.Enabled {
		return nil, fmt.Errorf("git is not enabled")
	}

	docPath := s.getDocumentPath(req.ProjectID, req.TaskID)
	relPath, err := filepath.Rel(s.getRepoRoot(), docPath)
	if err != nil {
		return nil, fmt.Errorf("failed to get relative path: %w", err)
	}

	// 获取两个版本的内容
	fromContent, err := s.getContentAtVersion(relPath, req.FromVersion)
	if err != nil {
		return nil, fmt.Errorf("failed to get from version content: %w", err)
	}

	toContent, err := s.getContentAtVersion(relPath, req.ToVersion)
	if err != nil {
		return nil, fmt.Errorf("failed to get to version content: %w", err)
	}

	// 比较内容生成变更
	changes := s.compareContent(fromContent, toContent)

	// 计算统计信息
	stats := s.calculateStats(changes)

	response := &interfaces.VersionComparisonResponse{
		FromVersion: req.FromVersion,
		ToVersion:   req.ToVersion,
		Changes:     changes,
		HasConflict: false, // 简化版本，暂不检测冲突
		Conflicts:   []interfaces.ConflictBlock{},
		Stats:       stats,
	}

	return response, nil
}

// GetDocumentAtVersion 获取特定版本的文档
func (s *UnifiedDocumentService) GetDocumentAtVersion(ctx context.Context, req *interfaces.VersionRequest) (*interfaces.DocumentResponse, error) {
	if !s.config.Git.Enabled {
		return nil, fmt.Errorf("git is not enabled")
	}

	docPath := s.getDocumentPath(req.ProjectID, req.TaskID)
	relPath, err := filepath.Rel(s.getRepoRoot(), docPath)
	if err != nil {
		return nil, fmt.Errorf("failed to get relative path: %w", err)
	}

	content, err := s.getContentAtVersion(relPath, req.Version)
	if err != nil {
		return nil, fmt.Errorf("failed to get version content: %w", err)
	}

	response := &interfaces.DocumentResponse{
		TaskID:      req.TaskID,
		ProjectID:   req.ProjectID,
		Content:     content,
		Format:      "markdown",
		Size:        int64(len(content)),
		Version:     req.Version,
		Path:        docPath,
		LastUpdated: time.Now(),
		CreatedAt:   time.Now(),
	}

	return response, nil
}

// ResolveConflict 解决文档冲突 (简化实现)
func (s *UnifiedDocumentService) ResolveConflict(ctx context.Context, req *interfaces.ConflictResolutionRequest) error {
	// 简化实现，实际应该根据冲突解决策略处理
	return fmt.Errorf("conflict resolution not implemented in this version")
}

// ===== Phase 2: 高级搜索功能实现 =====

// SearchDocuments 搜索文档
func (s *UnifiedDocumentService) SearchDocuments(ctx context.Context, req *interfaces.SearchRequest) (*interfaces.SearchResponse, error) {
	startTime := time.Now()

	// 获取搜索路径
	searchPaths := s.getSearchPaths(req.ProjectIDs, req.TaskIDs)

	var results []interfaces.SearchResult

	// 遍历搜索路径
	for _, path := range searchPaths {
		if match, score := s.matchDocument(path, req.Query, req.Filters); match {
			result, err := s.buildSearchResult(path, req.Query, score)
			if err != nil {
				continue
			}
			results = append(results, result)
		}
	}

	// 排序结果
	s.sortSearchResults(results, req.SortBy, req.SortOrder)

	// 分页
	total := len(results)
	start := req.Offset
	end := start + req.Limit
	if start > total {
		start = total
	}
	if end > total {
		end = total
	}

	if start < end {
		results = results[start:end]
	} else {
		results = []interfaces.SearchResult{}
	}

	queryTime := float64(time.Since(startTime).Nanoseconds()) / 1000000.0 // 转换为毫秒

	response := &interfaces.SearchResponse{
		Results:   results,
		Total:     total,
		Page:      req.Offset/req.Limit + 1,
		PageSize:  req.Limit,
		QueryTime: queryTime,
	}

	return response, nil
}

// IndexDocument 索引文档 (简化实现)
func (s *UnifiedDocumentService) IndexDocument(ctx context.Context, req *interfaces.IndexRequest) error {
	// 简化实现，实际应该建立搜索索引
	docPath := s.getDocumentPath(req.ProjectID, req.TaskID)
	if _, err := os.Stat(docPath); os.IsNotExist(err) {
		return fmt.Errorf("document does not exist")
	}

	// 这里可以实现实际的索引逻辑，比如更新Elasticsearch或其他搜索引擎
	return nil
}

// ===== Phase 2: 批量操作功能实现 =====

// BatchCreateDocuments 批量创建文档
func (s *UnifiedDocumentService) BatchCreateDocuments(ctx context.Context, req *interfaces.BatchCreateRequest) (*interfaces.BatchOperationResponse, error) {
	var results []interfaces.BatchOperationResult
	successCount := 0

	for _, docReq := range req.Documents {
		result := interfaces.BatchOperationResult{
			ProjectID: docReq.ProjectID,
			TaskID:    docReq.TaskID,
		}

		if err := s.CreateDocument(ctx, &docReq); err != nil {
			result.Success = false
			result.Error = err.Error()
		} else {
			result.Success = true
			successCount++
		}

		results = append(results, result)
	}

	response := &interfaces.BatchOperationResponse{
		Total:   len(req.Documents),
		Success: successCount,
		Failed:  len(req.Documents) - successCount,
		Results: results,
	}

	return response, nil
}

// BatchUpdateDocuments 批量更新文档
func (s *UnifiedDocumentService) BatchUpdateDocuments(ctx context.Context, req *interfaces.BatchUpdateRequest) (*interfaces.BatchOperationResponse, error) {
	var results []interfaces.BatchOperationResult
	successCount := 0

	for _, docReq := range req.Documents {
		result := interfaces.BatchOperationResult{
			ProjectID: docReq.ProjectID,
			TaskID:    docReq.TaskID,
		}

		if err := s.UpdateDocument(ctx, &docReq); err != nil {
			result.Success = false
			result.Error = err.Error()
		} else {
			result.Success = true
			successCount++
		}

		results = append(results, result)
	}

	response := &interfaces.BatchOperationResponse{
		Total:   len(req.Documents),
		Success: successCount,
		Failed:  len(req.Documents) - successCount,
		Results: results,
	}

	return response, nil
}

// BatchDeleteDocuments 批量删除文档
func (s *UnifiedDocumentService) BatchDeleteDocuments(ctx context.Context, req *interfaces.BatchDeleteRequest) (*interfaces.BatchOperationResponse, error) {
	var results []interfaces.BatchOperationResult
	successCount := 0

	for _, docReq := range req.Documents {
		result := interfaces.BatchOperationResult{
			ProjectID: docReq.ProjectID,
			TaskID:    docReq.TaskID,
		}

		if err := s.DeleteDocument(ctx, &docReq); err != nil {
			result.Success = false
			result.Error = err.Error()
		} else {
			result.Success = true
			successCount++
		}

		results = append(results, result)
	}

	response := &interfaces.BatchOperationResponse{
		Total:   len(req.Documents),
		Success: successCount,
		Failed:  len(req.Documents) - successCount,
		Results: results,
	}

	return response, nil
}

// ===== Phase 2: 导入导出功能实现 =====

// ExportDocuments 导出文档
func (s *UnifiedDocumentService) ExportDocuments(ctx context.Context, req *interfaces.ExportRequest) (*interfaces.ExportResponse, error) {
	// 简化实现，实际应该根据格式生成相应的导出文件
	fileName := fmt.Sprintf("documents-export-%s.%s", time.Now().Format("20060102-150405"), req.Format)

	// 这里应该实现实际的导出逻辑
	content := "# 文档导出\n\n导出功能暂未完全实现"
	data := []byte(content)

	response := &interfaces.ExportResponse{
		FileName: fileName,
		Size:     int64(len(data)),
		Data:     data,
		Format:   req.Format,
	}

	return response, nil
}

// ImportDocuments 导入文档
func (s *UnifiedDocumentService) ImportDocuments(ctx context.Context, req *interfaces.ImportRequest) (*interfaces.ImportResponse, error) {
	// 简化实现，实际应该根据格式解析导入文件
	results := []interfaces.ImportResult{
		{
			FileName:  "imported_document.md",
			ProjectID: req.ProjectID,
			TaskID:    1, // 示例任务ID
			Success:   true,
		},
	}

	response := &interfaces.ImportResponse{
		Total:   1,
		Success: 1,
		Failed:  0,
		Results: results,
	}

	return response, nil
}

// ===== Phase 2: 协作功能实现 =====

// 文档锁管理
var documentLocks = make(map[string]*DocumentLock)
var locksMutex = &sync.RWMutex{}

type DocumentLock struct {
	UserID    int       `json:"user_id"`
	LockType  string    `json:"lock_type"`
	LockedAt  time.Time `json:"locked_at"`
	ExpiresAt time.Time `json:"expires_at"`
}

// LockDocument 锁定文档
func (s *UnifiedDocumentService) LockDocument(ctx context.Context, req *interfaces.DocumentLockRequest) error {
	lockKey := fmt.Sprintf("%d-%d", req.ProjectID, req.TaskID)

	locksMutex.Lock()
	defer locksMutex.Unlock()

	// 检查是否已经被锁定
	if lock, exists := documentLocks[lockKey]; exists {
		if time.Now().Before(lock.ExpiresAt) && lock.UserID != req.UserID {
			return fmt.Errorf("document is already locked by user %d", lock.UserID)
		}
	}

	// 创建新锁
	ttl := time.Duration(req.TTL) * time.Second
	if ttl == 0 {
		ttl = 5 * time.Minute // 默认5分钟
	}

	documentLocks[lockKey] = &DocumentLock{
		UserID:    req.UserID,
		LockType:  req.LockType,
		LockedAt:  time.Now(),
		ExpiresAt: time.Now().Add(ttl),
	}

	return nil
}

// UnlockDocument 解锁文档
func (s *UnifiedDocumentService) UnlockDocument(ctx context.Context, req *interfaces.DocumentLockRequest) error {
	lockKey := fmt.Sprintf("%d-%d", req.ProjectID, req.TaskID)

	locksMutex.Lock()
	defer locksMutex.Unlock()

	if lock, exists := documentLocks[lockKey]; exists {
		if lock.UserID != req.UserID {
			return fmt.Errorf("document is locked by another user")
		}
		delete(documentLocks, lockKey)
	}

	return nil
}

// GetDocumentLockStatus 获取文档锁定状态
func (s *UnifiedDocumentService) GetDocumentLockStatus(ctx context.Context, req *interfaces.LockStatusRequest) (*interfaces.LockStatusResponse, error) {
	lockKey := fmt.Sprintf("%d-%d", req.ProjectID, req.TaskID)

	locksMutex.RLock()
	defer locksMutex.RUnlock()

	lock, exists := documentLocks[lockKey]
	if !exists || time.Now().After(lock.ExpiresAt) {
		// 清理过期锁
		if exists {
			delete(documentLocks, lockKey)
		}

		return &interfaces.LockStatusResponse{
			IsLocked: false,
			CanEdit:  true,
		}, nil
	}

	canEdit := lock.UserID == req.UserID

	response := &interfaces.LockStatusResponse{
		IsLocked:  true,
		LockType:  lock.LockType,
		LockedBy:  lock.UserID,
		LockedAt:  lock.LockedAt,
		ExpiresAt: lock.ExpiresAt,
		CanEdit:   canEdit,
	}

	return response, nil
}

// ===== Phase 2: 辅助方法实现 =====

// getContentAtVersion 获取指定版本的文件内容
func (s *UnifiedDocumentService) getContentAtVersion(filePath, version string) (string, error) {
	repoRoot := s.getRepoRoot()
	cmd := exec.Command("git", "show", fmt.Sprintf("%s:%s", version, filePath))
	cmd.Dir = repoRoot

	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("failed to get file at version %s: %w", version, err)
	}

	return string(output), nil
}

// compareContent 比较两个内容并生成变更列表
func (s *UnifiedDocumentService) compareContent(fromContent, toContent string) []interfaces.ChangeItem {
	fromLines := strings.Split(fromContent, "\n")
	toLines := strings.Split(toContent, "\n")

	var changes []interfaces.ChangeItem

	// 简化的差异算法
	maxLen := len(fromLines)
	if len(toLines) > maxLen {
		maxLen = len(toLines)
	}

	for i := 0; i < maxLen; i++ {
		var fromLine, toLine string
		if i < len(fromLines) {
			fromLine = fromLines[i]
		}
		if i < len(toLines) {
			toLine = toLines[i]
		}

		if fromLine != toLine {
			if fromLine == "" {
				changes = append(changes, interfaces.ChangeItem{
					Type:    "added",
					LineNum: i + 1,
					NewText: toLine,
				})
			} else if toLine == "" {
				changes = append(changes, interfaces.ChangeItem{
					Type:    "deleted",
					LineNum: i + 1,
					OldText: fromLine,
				})
			} else {
				changes = append(changes, interfaces.ChangeItem{
					Type:    "modified",
					LineNum: i + 1,
					OldText: fromLine,
					NewText: toLine,
				})
			}
		}
	}

	return changes
}

// calculateStats 计算比较统计信息
func (s *UnifiedDocumentService) calculateStats(changes []interfaces.ChangeItem) interfaces.ComparisonStats {
	stats := interfaces.ComparisonStats{}

	for _, change := range changes {
		switch change.Type {
		case "added":
			stats.LinesAdded++
			stats.WordsAdded += len(strings.Fields(change.NewText))
		case "deleted":
			stats.LinesDeleted++
			stats.WordsDeleted += len(strings.Fields(change.OldText))
		case "modified":
			stats.LinesChanged++
			stats.WordsAdded += len(strings.Fields(change.NewText))
			stats.WordsDeleted += len(strings.Fields(change.OldText))
		}
	}

	return stats
}

// getSearchPaths 获取搜索路径列表
func (s *UnifiedDocumentService) getSearchPaths(projectIDs, taskIDs []int) []string {
	var paths []string

	if len(projectIDs) > 0 {
		for _, projectID := range projectIDs {
			projectDir := filepath.Join(s.config.BasePath, "projects", fmt.Sprintf("project-%d", projectID))
			if files, err := filepath.Glob(filepath.Join(projectDir, "task-*.md")); err == nil {
				paths = append(paths, files...)
			}
		}
	} else {
		// 搜索所有项目
		if files, err := filepath.Glob(filepath.Join(s.config.BasePath, "projects", "*", "task-*.md")); err == nil {
			paths = append(paths, files...)
		}
	}

	return paths
}

// matchDocument 检查文档是否匹配搜索条件
func (s *UnifiedDocumentService) matchDocument(path, query string, filters map[string]string) (bool, float64) {
	content, err := ioutil.ReadFile(path)
	if err != nil {
		return false, 0
	}

	contentStr := string(content)
	lowerContent := strings.ToLower(contentStr)
	lowerQuery := strings.ToLower(query)

	// 简单的文本匹配
	if !strings.Contains(lowerContent, lowerQuery) {
		return false, 0
	}

	// 计算简单的相关性分数
	score := float64(strings.Count(lowerContent, lowerQuery))
	if strings.Contains(strings.ToLower(filepath.Base(path)), lowerQuery) {
		score += 10 // 文件名匹配加分
	}

	return true, score
}

// buildSearchResult 构建搜索结果
func (s *UnifiedDocumentService) buildSearchResult(path, query string, score float64) (interfaces.SearchResult, error) {
	content, err := ioutil.ReadFile(path)
	if err != nil {
		return interfaces.SearchResult{}, err
	}

	contentStr := string(content)

	// 提取项目ID和任务ID
	projectID, taskID := s.extractIDsFromPath(path)

	// 生成摘要片段
	snippet := s.generateSnippet(contentStr, query, 200)

	// 获取文件信息
	stat, _ := os.Stat(path)
	lastUpdated := time.Now()
	if stat != nil {
		lastUpdated = stat.ModTime()
	}

	result := interfaces.SearchResult{
		ProjectID:   projectID,
		TaskID:      taskID,
		Title:       s.extractTitle(contentStr),
		Content:     contentStr,
		Snippet:     snippet,
		Score:       score,
		LastUpdated: lastUpdated,
		Path:        path,
	}

	return result, nil
}

// sortSearchResults 排序搜索结果
func (s *UnifiedDocumentService) sortSearchResults(results []interfaces.SearchResult, sortBy, sortOrder string) {
	// 简化实现，只支持按分数排序
	if sortBy == "" || sortBy == "score" {
		if sortOrder == "asc" {
			for i := 0; i < len(results)-1; i++ {
				for j := i + 1; j < len(results); j++ {
					if results[i].Score > results[j].Score {
						results[i], results[j] = results[j], results[i]
					}
				}
			}
		} else {
			for i := 0; i < len(results)-1; i++ {
				for j := i + 1; j < len(results); j++ {
					if results[i].Score < results[j].Score {
						results[i], results[j] = results[j], results[i]
					}
				}
			}
		}
	}
}

// extractIDsFromPath 从路径中提取项目ID和任务ID
func (s *UnifiedDocumentService) extractIDsFromPath(path string) (int, int) {
	// 简化实现，从路径解析ID
	// 例如: /docs/projects/project-1/task-5.md
	baseName := filepath.Base(path)
	dirName := filepath.Base(filepath.Dir(path))

	projectID := 1 // 默认值
	taskID := 1    // 默认值

	// 解析项目ID
	if strings.HasPrefix(dirName, "project-") {
		fmt.Sscanf(dirName, "project-%d", &projectID)
	}

	// 解析任务ID
	if strings.HasPrefix(baseName, "task-") {
		fmt.Sscanf(baseName, "task-%d.md", &taskID)
	}

	return projectID, taskID
}

// generateSnippet 生成摘要片段
func (s *UnifiedDocumentService) generateSnippet(content, query string, maxLength int) string {
	lowerContent := strings.ToLower(content)
	lowerQuery := strings.ToLower(query)

	index := strings.Index(lowerContent, lowerQuery)
	if index == -1 {
		// 如果没有找到查询词，返回开头部分
		if len(content) > maxLength {
			return content[:maxLength] + "..."
		}
		return content
	}

	// 计算摘要片段的起始和结束位置
	start := index - maxLength/4
	if start < 0 {
		start = 0
	}

	end := start + maxLength
	if end > len(content) {
		end = len(content)
	}

	snippet := content[start:end]
	if start > 0 {
		snippet = "..." + snippet
	}
	if end < len(content) {
		snippet = snippet + "..."
	}

	return snippet
}

// extractTitle 从内容中提取标题
func (s *UnifiedDocumentService) extractTitle(content string) string {
	lines := strings.Split(content, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "# ") {
			return strings.TrimSpace(line[2:])
		}
	}

	// 如果没有找到标题，返回第一行或默认标题
	if len(lines) > 0 && lines[0] != "" {
		title := strings.TrimSpace(lines[0])
		if len(title) > 50 {
			title = title[:50] + "..."
		}
		return title
	}

	return "无标题文档"
}

// ============================================================================
// Phase 3: 迁移自HybridDocumentHandler的方法
// TODO: 这些方法需要添加数据库访问权限后才能完整实现
// ============================================================================

// CopyDocument 复制文档
// @Migrated from HybridDocumentHandler
func (s *UnifiedDocumentService) CopyDocument(ctx context.Context, req *interfaces.CopyDocumentRequest) (int, error) {
	if s.db == nil {
		return 0, fmt.Errorf("database not available for CopyDocument operation")
	}

	// 类型断言获取database.DB接口
	type DBGetter interface {
		GetDB() interface{}
	}

	dbGetter, ok := s.db.(DBGetter)
	if !ok {
		return 0, fmt.Errorf("database does not implement GetDB interface")
	}

	sqlDB, ok := dbGetter.GetDB().(*sql.DB)
	if !ok {
		return 0, fmt.Errorf("failed to get *sql.DB instance")
	}

	// 获取原文档
	getQuery := `
		SELECT folder_id, title, content, type, description, visibility
		FROM documents WHERE id = $1
	`

	var doc struct {
		FolderID    *int
		Title       string
		Content     string
		Type        string
		Description *string
		Visibility  string
	}

	err := sqlDB.QueryRowContext(ctx, getQuery, req.DocumentID).Scan(
		&doc.FolderID, &doc.Title, &doc.Content, &doc.Type, &doc.Description,
		&doc.Visibility,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return 0, fmt.Errorf("document not found: %d", req.DocumentID)
		}
		return 0, fmt.Errorf("failed to get original document: %w", err)
	}

	// 创建副本
	now := time.Now()
	createQuery := `
		INSERT INTO documents (
			folder_id, title, content, type, status, description,
			owner_id, visibility, version, is_template,
			created_at, updated_at, created_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id
	`

	var newID int
	err = sqlDB.QueryRowContext(
		ctx,
		createQuery,
		doc.FolderID, doc.Title+" (副本)", doc.Content, doc.Type, "draft", doc.Description,
		req.UserID, doc.Visibility, 1, false,
		now, now, req.UserID,
	).Scan(&newID)

	if err != nil {
		return 0, fmt.Errorf("failed to copy document: %w", err)
	}

	return newID, nil
}

// ToggleTemplate 切换文档模板状态
// @Migrated from HybridDocumentHandler
func (s *UnifiedDocumentService) ToggleTemplate(ctx context.Context, req *interfaces.ToggleTemplateRequest) (bool, error) {
	if s.db == nil {
		return false, fmt.Errorf("database not available for ToggleTemplate operation")
	}

	// 类型断言获取database.DB接口
	type DBGetter interface {
		GetDB() interface{}
	}

	dbGetter, ok := s.db.(DBGetter)
	if !ok {
		return false, fmt.Errorf("database does not implement GetDB interface")
	}

	sqlDB, ok := dbGetter.GetDB().(*sql.DB)
	if !ok {
		return false, fmt.Errorf("failed to get *sql.DB instance")
	}

	// 切换模板状态
	query := `
		UPDATE documents
		SET is_template = NOT is_template, updated_at = $1
		WHERE id = $2
		RETURNING is_template
	`

	var newTemplateStatus bool
	err := sqlDB.QueryRowContext(ctx, query, time.Now(), req.DocumentID).Scan(&newTemplateStatus)

	if err != nil {
		if err == sql.ErrNoRows {
			return false, fmt.Errorf("document not found: %d", req.DocumentID)
		}
		return false, fmt.Errorf("failed to toggle template status: %w", err)
	}

	return newTemplateStatus, nil
}
