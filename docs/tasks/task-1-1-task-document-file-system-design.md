# 基于本地文件的任务文档管理系统设计

## 系统概述

设计一个基于本地Markdown文件的任务文档管理系统，利用Git进行版本控制，避免数据库单点故障，提供更好的文档版本管理和协作体验。

## 1. 文件系统架构

### 1.1 目录结构
```
backend/docs/
├── tasks/                      # 任务文档根目录
│   ├── projects/              # 按项目组织
│   │   ├── project-1/         # 项目ID或名称
│   │   │   ├── README.md      # 项目总览文档
│   │   │   ├── task-1.md      # 任务文档
│   │   │   ├── task-2.md
│   │   │   └── subtasks/      # 子任务目录
│   │   │       ├── task-1-1.md
│   │   │       └── task-1-2.md
│   │   └── project-2/
│   ├── personal/              # 个人任务文档
│   │   ├── user-1/            # 用户目录
│   │   │   ├── personal-task-1.md
│   │   │   └── personal-task-2.md
│   │   └── user-2/
│   ├── templates/             # 文档模板
│   │   ├── task-template.md
│   │   ├── project-template.md
│   │   └── personal-task-template.md
│   └── archives/              # 归档任务文档
│       ├── 2025/
│       │   ├── 01/
│       │   └── 02/
│       └── 2024/
```

### 1.2 文件命名规范
- 项目任务：`task-{task_id}.md`
- 个人任务：`personal-task-{task_id}.md`  
- 项目文档：`project-{project_id}-README.md`
- 归档文档：`{year}/{month}/task-{task_id}-archived.md`

## 2. 文档模板设计

### 2.1 任务文档模板 (task-template.md)
```markdown
---
task_id: {TASK_ID}
project_id: {PROJECT_ID} 
title: "{TASK_TITLE}"
status: "{TASK_STATUS}"
priority: "{TASK_PRIORITY}"
assignee: "{ASSIGNEE}"
created_date: "{CREATED_DATE}"
updated_date: "{UPDATED_DATE}"
due_date: "{DUE_DATE}"
tags: ["{TAG1}", "{TAG2}"]
parent_task_id: {PARENT_TASK_ID}
estimated_hours: {ESTIMATED_HOURS}
actual_hours: {ACTUAL_HOURS}
---

# {TASK_TITLE}

## 📋 任务概述
{TASK_DESCRIPTION}

## 🎯 目标
- [ ] 目标1
- [ ] 目标2
- [ ] 目标3

## 📝 详细描述
{DETAILED_DESCRIPTION}

## 🔗 相关资源
- [相关链接1](url)
- [相关文档2](path)

## 💬 讨论记录
### {DATE} - {AUTHOR}
{DISCUSSION_CONTENT}

## ✅ 完成检查清单
- [ ] 任务完成
- [ ] 代码审查
- [ ] 测试通过
- [ ] 文档更新

## 📊 时间记录
| 日期 | 开始时间 | 结束时间 | 耗时 | 描述 |
|------|----------|----------|------|------|
| {DATE} | {START} | {END} | {DURATION} | {DESCRIPTION} |

## 🏷️ 标签
{TAGS}

---
*最后更新: {UPDATED_DATE}*
*创建者: {CREATOR}*
```

### 2.2 个人任务文档模板 (personal-task-template.md)
```markdown
---
task_id: {TASK_ID}
user_id: {USER_ID}
title: "{TASK_TITLE}"
category: "{CATEGORY}"
priority: "{PRIORITY}"
status: "{STATUS}"
created_date: "{CREATED_DATE}"
updated_date: "{UPDATED_DATE}"
target_hours: {TARGET_HOURS}
total_hours: {TOTAL_HOURS}
---

# {TASK_TITLE}

## 🎯 个人目标
{PERSONAL_GOAL}

## 📋 任务内容
{TASK_CONTENT}

## 📈 进度跟踪
- 开始日期: {START_DATE}
- 预计完成: {TARGET_DATE}
- 完成进度: {PROGRESS}%

## ⏱️ 时间统计
- 目标时间: {TARGET_HOURS}小时
- 已用时间: {USED_HOURS}小时
- 剩余时间: {REMAINING_HOURS}小时

## 📝 工作日志
### {DATE}
- 工作内容: {WORK_CONTENT}
- 耗时: {DURATION}
- 心得: {NOTES}

## 🏆 完成标准
- [ ] 标准1
- [ ] 标准2
- [ ] 标准3

---
*个人任务 | 最后更新: {UPDATED_DATE}*
```

## 3. 后端实现

### 3.1 文件管理服务
```go
// backend/services/task_document_file_service.go
package services

import (
    "fmt"
    "io/ioutil"
    "os"
    "path/filepath"
    "strings"
    "time"
)

type TaskDocumentFileService struct {
    basePath    string
    gitEnabled  bool
}

func NewTaskDocumentFileService(basePath string) *TaskDocumentFileService {
    return &TaskDocumentFileService{
        basePath:   basePath,
        gitEnabled: true,
    }
}

// CreateTaskDocument 创建任务文档
func (s *TaskDocumentFileService) CreateTaskDocument(task *models.Task, projectID int) error {
    docPath := s.getTaskDocumentPath(task.ID, projectID)
    content := s.generateTaskDocumentContent(task)
    
    // 确保目录存在
    if err := os.MkdirAll(filepath.Dir(docPath), 0755); err != nil {
        return err
    }
    
    // 写入文件
    if err := ioutil.WriteFile(docPath, []byte(content), 0644); err != nil {
        return err
    }
    
    // Git提交
    if s.gitEnabled {
        return s.gitCommit(docPath, fmt.Sprintf("Create task document: %s", task.Title))
    }
    
    return nil
}

// UpdateTaskDocument 更新任务文档
func (s *TaskDocumentFileService) UpdateTaskDocument(task *models.Task, projectID int) error {
    docPath := s.getTaskDocumentPath(task.ID, projectID)
    
    // 读取现有内容，保留用户编辑的部分
    existingContent, err := s.readTaskDocument(docPath)
    if err != nil {
        return s.CreateTaskDocument(task, projectID) // 如果不存在则创建
    }
    
    // 更新元数据部分，保留内容部分
    updatedContent := s.updateTaskDocumentMetadata(existingContent, task)
    
    // 写入文件
    if err := ioutil.WriteFile(docPath, []byte(updatedContent), 0644); err != nil {
        return err
    }
    
    // Git提交
    if s.gitEnabled {
        return s.gitCommit(docPath, fmt.Sprintf("Update task document: %s", task.Title))
    }
    
    return nil
}

// ReadTaskDocument 读取任务文档
func (s *TaskDocumentFileService) ReadTaskDocument(taskID, projectID int) (string, error) {
    docPath := s.getTaskDocumentPath(taskID, projectID)
    return s.readTaskDocument(docPath)
}

// ArchiveTaskDocument 归档任务文档
func (s *TaskDocumentFileService) ArchiveTaskDocument(taskID, projectID int) error {
    sourcePath := s.getTaskDocumentPath(taskID, projectID)
    archivePath := s.getArchivedDocumentPath(taskID)
    
    // 移动文件到归档目录
    if err := os.MkdirAll(filepath.Dir(archivePath), 0755); err != nil {
        return err
    }
    
    if err := os.Rename(sourcePath, archivePath); err != nil {
        return err
    }
    
    // Git提交
    if s.gitEnabled {
        return s.gitCommit(archivePath, fmt.Sprintf("Archive task document: task-%d", taskID))
    }
    
    return nil
}

// 私有方法
func (s *TaskDocumentFileService) getTaskDocumentPath(taskID, projectID int) string {
    return filepath.Join(s.basePath, "tasks", "projects", fmt.Sprintf("project-%d", projectID), fmt.Sprintf("task-%d.md", taskID))
}

func (s *TaskDocumentFileService) getArchivedDocumentPath(taskID int) string {
    now := time.Now()
    return filepath.Join(s.basePath, "tasks", "archives", fmt.Sprintf("%d", now.Year()), fmt.Sprintf("%02d", now.Month()), fmt.Sprintf("task-%d-archived.md", taskID))
}

func (s *TaskDocumentFileService) generateTaskDocumentContent(task *models.Task) string {
    template := s.loadTemplate("task-template.md")
    
    // 替换模板变量
    content := strings.ReplaceAll(template, "{TASK_ID}", fmt.Sprintf("%d", task.ID))
    content = strings.ReplaceAll(content, "{TASK_TITLE}", task.Title)
    content = strings.ReplaceAll(content, "{TASK_STATUS}", task.Status)
    content = strings.ReplaceAll(content, "{TASK_DESCRIPTION}", task.Description)
    content = strings.ReplaceAll(content, "{CREATED_DATE}", task.CreatedAt.Format("2006-01-02 15:04:05"))
    content = strings.ReplaceAll(content, "{UPDATED_DATE}", task.UpdatedAt.Format("2006-01-02 15:04:05"))
    
    return content
}

func (s *TaskDocumentFileService) gitCommit(filePath, message string) error {
    // 实现Git提交逻辑
    // 这里可以使用go-git库或者执行shell命令
    return nil
}
```

### 3.2 API处理器
```go
// backend/handlers/task_document_file_handler.go
package handlers

import (
    "net/http"
    "strconv"
    
    "github.com/gin-gonic/gin"
)

type TaskDocumentFileHandler struct {
    documentService *services.TaskDocumentFileService
    taskService     *services.TaskService
}

func NewTaskDocumentFileHandler(documentService *services.TaskDocumentFileService, taskService *services.TaskService) *TaskDocumentFileHandler {
    return &TaskDocumentFileHandler{
        documentService: documentService,
        taskService:     taskService,
    }
}

// GetTaskDocument 获取任务文档内容
func (h *TaskDocumentFileHandler) GetTaskDocument(c *gin.Context) {
    taskID, _ := strconv.Atoi(c.Param("taskId"))
    projectID, _ := strconv.Atoi(c.Param("projectId"))
    
    content, err := h.documentService.ReadTaskDocument(taskID, projectID)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
        return
    }
    
    c.JSON(http.StatusOK, gin.H{
        "task_id": taskID,
        "project_id": projectID,
        "content": content,
        "format": "markdown",
    })
}

// UpdateTaskDocument 更新任务文档内容
func (h *TaskDocumentFileHandler) UpdateTaskDocument(c *gin.Context) {
    taskID, _ := strconv.Atoi(c.Param("taskId"))
    projectID, _ := strconv.Atoi(c.Param("projectId"))
    
    var req struct {
        Content string `json:"content" binding:"required"`
    }
    
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    // 直接写入文档内容（用户手动编辑的）
    docPath := h.documentService.getTaskDocumentPath(taskID, projectID)
    if err := ioutil.WriteFile(docPath, []byte(req.Content), 0644); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update document"})
        return
    }
    
    // Git提交
    if err := h.documentService.gitCommit(docPath, fmt.Sprintf("Update task document content: task-%d", taskID)); err != nil {
        // 记录错误但不失败
        log.Printf("Git commit failed: %v", err)
    }
    
    c.JSON(http.StatusOK, gin.H{"message": "Document updated successfully"})
}
```

## 4. 前端实现

### 4.1 文档管理服务
```typescript
// frontend/src/services/taskDocumentFileService.ts
export interface TaskDocumentContent {
  taskId: number;
  projectId: number;
  content: string;
  format: 'markdown';
  lastModified: string;
  gitHash?: string;
}

export class TaskDocumentFileService {
  private baseURL = '/api/v1';

  // 获取任务文档
  async getTaskDocument(taskId: number, projectId: number): Promise<TaskDocumentContent> {
    const response = await api.get(`/projects/${projectId}/tasks/${taskId}/document`);
    return response.data;
  }

  // 更新任务文档
  async updateTaskDocument(taskId: number, projectId: number, content: string): Promise<void> {
    await api.put(`/projects/${projectId}/tasks/${taskId}/document`, {
      content: content
    });
  }

  // 获取文档历史版本
  async getDocumentHistory(taskId: number, projectId: number): Promise<GitCommit[]> {
    const response = await api.get(`/projects/${projectId}/tasks/${taskId}/document/history`);
    return response.data;
  }

  // 比较文档版本
  async compareDocumentVersions(taskId: number, projectId: number, fromHash: string, toHash: string): Promise<DocumentDiff> {
    const response = await api.get(`/projects/${projectId}/tasks/${taskId}/document/compare`, {
      params: { from: fromHash, to: toHash }
    });
    return response.data;
  }
}
```

### 4.2 Markdown编辑器组件
```typescript
// frontend/src/components/TaskDocumentEditor.tsx
import React, { useState, useEffect } from 'react';
import { Button, message, Spin } from 'antd';
import { SaveOutlined, HistoryOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons';
import { TaskDocumentFileService } from '../services/taskDocumentFileService';
import MarkdownEditor from './MarkdownEditor';
import MarkdownPreview from './MarkdownPreview';

interface TaskDocumentEditorProps {
  taskId: number;
  projectId: number;
  readOnly?: boolean;
}

export const TaskDocumentEditor: React.FC<TaskDocumentEditorProps> = ({
  taskId,
  projectId,
  readOnly = false
}) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const documentService = new TaskDocumentFileService();

  useEffect(() => {
    loadDocument();
  }, [taskId, projectId]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const doc = await documentService.getTaskDocument(taskId, projectId);
      setContent(doc.content);
    } catch (error) {
      console.error('Failed to load document:', error);
      message.error('加载文档失败');
    } finally {
      setLoading(false);
    }
  };

  const saveDocument = async () => {
    try {
      setSaving(true);
      await documentService.updateTaskDocument(taskId, projectId, content);
      setHasChanges(false);
      message.success('文档保存成功');
    } catch (error) {
      console.error('Failed to save document:', error);
      message.error('保存文档失败');
    } finally {
      setSaving(false);
    }
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasChanges(true);
  };

  if (loading) {
    return <Spin size="large" />;
  }

  return (
    <div className="task-document-editor">
      <div className="document-toolbar">
        <Button.Group>
          <Button
            icon={<EditOutlined />}
            type={!previewMode ? 'primary' : 'default'}
            onClick={() => setPreviewMode(false)}
          >
            编辑
          </Button>
          <Button
            icon={<EyeOutlined />}
            type={previewMode ? 'primary' : 'default'}
            onClick={() => setPreviewMode(true)}
          >
            预览
          </Button>
        </Button.Group>

        <div className="document-actions">
          <Button
            icon={<HistoryOutlined />}
            onClick={() => {/* 打开历史版本对话框 */}}
          >
            版本历史
          </Button>
          {!readOnly && (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              disabled={!hasChanges}
              onClick={saveDocument}
            >
              保存
            </Button>
          )}
        </div>
      </div>

      <div className="document-content">
        {previewMode ? (
          <MarkdownPreview content={content} />
        ) : (
          <MarkdownEditor
            value={content}
            onChange={handleContentChange}
            readOnly={readOnly}
            height="600px"
          />
        )}
      </div>

      {hasChanges && (
        <div className="unsaved-changes-indicator">
          文档有未保存的更改
        </div>
      )}
    </div>
  );
};
```

## 5. Git集成

### 5.1 自动提交机制
```go
// backend/services/git_service.go
package services

import (
    "os/exec"
    "fmt"
)

type GitService struct {
    repoPath string
}

func NewGitService(repoPath string) *GitService {
    return &GitService{repoPath: repoPath}
}

func (g *GitService) CommitFile(filePath, message string) error {
    // 添加文件到暂存区
    if err := g.execGitCommand("add", filePath); err != nil {
        return err
    }
    
    // 提交更改
    return g.execGitCommand("commit", "-m", message)
}

func (g *GitService) GetFileHistory(filePath string) ([]GitCommit, error) {
    output, err := g.execGitCommandWithOutput("log", "--pretty=format:%H|%an|%ad|%s", "--date=iso", "--", filePath)
    if err != nil {
        return nil, err
    }
    
    return g.parseGitLog(output), nil
}

func (g *GitService) GetFileDiff(filePath, fromHash, toHash string) (string, error) {
    return g.execGitCommandWithOutput("diff", fromHash, toHash, "--", filePath)
}

func (g *GitService) execGitCommand(args ...string) error {
    cmd := exec.Command("git", args...)
    cmd.Dir = g.repoPath
    return cmd.Run()
}

func (g *GitService) execGitCommandWithOutput(args ...string) (string, error) {
    cmd := exec.Command("git", args...)
    cmd.Dir = g.repoPath
    output, err := cmd.Output()
    return string(output), err
}
```

## 6. 实施计划

### 阶段1: 基础架构 (完成度目标: 40%)
1. ✅ 设计文档系统架构
2. 🔄 创建目录结构
3. 🔄 实现文档模板
4. 🔄 开发基础文件服务

### 阶段2: 核心功能 (完成度目标: 80%)
1. 实现任务文档自动生成
2. 开发文档读写API
3. 集成前端编辑器
4. 实现Git版本控制

### 阶段3: 高级功能 (完成度目标: 100%)
1. 文档搜索和索引
2. 版本对比和恢复
3. 协作和权限管理
4. 性能优化和监控

## 7. 优势分析

### 7.1 相比数据库存储的优势
1. **版本控制**: Git天然支持完整版本历史
2. **备份安全**: 分布式存储，多重备份
3. **协作便利**: 支持分支、合并等协作模式
4. **数据可读**: 纯文本格式，可直接阅读和编辑
5. **离线访问**: 本地文件，无需数据库连接
6. **迁移简单**: 纯文件，易于迁移和备份

### 7.2 技术优势
1. **性能**: 文件系统读写速度快
2. **扩展性**: 易于添加新的文档类型
3. **维护性**: 减少数据库依赖，简化架构
4. **开发效率**: 可直接编辑文件进行调试

这个设计提供了一个完整的基于文件的任务文档管理系统，利用Git的版本控制能力，提供了比数据库存储更好的文档管理体验。