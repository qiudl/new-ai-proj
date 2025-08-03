# 任务文档模块2.0 MVP升级方案（1天开发）

## 核心目标
在1天内实现任务文档的基本升级，聚焦最核心的3个需求：
1. **默认任务信息文档**自动创建
2. **图片上传**支持（最基础的富媒体）
3. **父子任务文档查看**（只读模式）

## 实施策略：最小化改动，最大化价值

### 1. 数据库改动（15分钟）
**无需新建表**，只在现有`documents`表添加一个字段：

```sql
-- 只需要这一个字段标识任务信息文档
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS is_task_default BOOLEAN DEFAULT FALSE;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_documents_task_default 
ON documents(project_id, is_task_default) WHERE is_task_default = TRUE;
```

### 2. 后端API增强（2小时）

#### 2.1 修改现有任务创建API
```go
// 在 task.go 的 CreateTask 方法中添加
func CreateTaskWithDocument(task *Task) error {
    // 1. 创建任务
    err := CreateTask(task)
    if err != nil {
        return err
    }
    
    // 2. 自动创建默认任务信息文档
    document := &Document{
        ProjectID:   &task.ProjectID,
        Title:       fmt.Sprintf("TASK-%06d-任务信息", task.ID),
        Content:     generateDefaultTaskContent(task),
        Type:        "markdown",
        Status:      "draft",
        OwnerID:     task.CreatedBy,
        Visibility:  "team",
        IsTaskDefault: true, // 新字段
        CreatedBy:   task.CreatedBy,
    }
    
    return CreateDocument(document)
}

// 默认内容模板
func generateDefaultTaskContent(task *Task) *string {
    content := fmt.Sprintf(`# 任务信息文档

## 基本信息
- **任务ID**: TASK-%06d
- **任务标题**: %s
- **创建时间**: %s
- **状态**: %s

## 任务描述
%s

## 工作记录
<!-- 在此记录工作进展 -->

## 相关文档
<!-- 在此添加相关文档链接 -->

## 备注
<!-- 其他备注信息 -->
`, task.ID, task.Title, task.CreatedAt.Format("2006-01-02"), task.Status, task.Description)
    
    return &content
}
```

#### 2.2 新增父子任务文档查询API
```go
// handlers/task_document.go - 新建文件
func GetTaskRelatedDocuments(c *gin.Context) {
    taskID := c.Param("id")
    userID := c.GetInt("user_id")
    
    // 1. 获取当前任务的文档
    currentDocs := getTaskDocuments(taskID)
    
    // 2. 获取父任务文档（如果存在）
    parentDocs := getParentTaskDocuments(taskID)
    
    // 3. 获取子任务文档（如果存在）
    childDocs := getChildTaskDocuments(taskID)
    
    response := map[string]interface{}{
        "current_documents": currentDocs,
        "parent_documents":  parentDocs,
        "child_documents":   childDocs,
    }
    
    c.JSON(200, response)
}
```

### 3. 前端组件升级（4小时）

#### 3.1 升级现有TaskDocumentEditor使用@uiw/react-md-editor（2小时）

**技术选型优势**：
- `@uiw/react-md-editor` 提供完整的Markdown编辑+预览体验
- 内置工具栏支持图片、链接等常用功能  
- 自带文件上传钩子，易于集成图片上传
- 实时预览模式，所见即所得
- 轻量级，符合MVP快速开发要求

**实施要点**：
- 替换现有的TextArea + ReactMarkdown组合
- 保留现有的自动保存逻辑
- 集成图片上传到编辑器工具栏
- 保持原有的快捷键支持（Ctrl+S保存）

#### 3.2 创建简单的文档层级查看器（2小时）

**组件设计**：
- 使用Ant Design的Collapse组件展示层级结构
- 当前任务文档列表（可编辑）
- 父任务文档列表（只读，点击可查看）
- 子任务文档列表（只读，点击可查看）
- 每个文档显示类型标签（默认/附件/笔记等）

**交互逻辑**：
- 默认展开当前任务文档
- 父子任务文档可折叠查看
- 点击文档名称可在新标签页打开（只读模式）
- 标识文档类型和权限状态

### 4. 文件上传服务（1小时）

#### 4.1 简单的图片上传API

**实施策略**：
- 利用现有的文件上传基础设施（如果有）
- 简单的本地文件存储（uploads/images目录）
- 支持常见图片格式：jpg、png、gif、webp
- 文件大小限制：5MB以内
- 自动生成唯一文件名避免冲突

**API设计**：
- `POST /api/upload/image` - 图片上传
- 返回格式：`{url: "/uploads/images/xxx.jpg", filename: "xxx.jpg"}`
- 错误处理：文件类型、大小、权限检查

### 5. 集成到现有页面（1小时）

#### 5.1 修改任务详情页面

**集成策略**：
- 在现有任务详情页面添加"任务文档"标签页
- 保持现有页面布局和交互逻辑不变
- @uiw/react-md-editor与现有Ant Design样式协调
- 响应式设计，支持移动端查看

**页面结构**：
```
任务详情页面
├─ 基本信息标签页（现有）
├─ 任务文档标签页（新增）
│  ├─ Markdown编辑器（@uiw/react-md-editor）
│  └─ 文档层级查看器
└─ 其他标签页（现有）
```

## 开发时间分配

| 阶段 | 时间 | 内容 |
|------|------|------|
| 数据库 | 15分钟 | 添加一个字段 |
| 后端API | 2小时 | 任务创建时自动生成文档 + 文档查询API |
| 图片上传 | 1小时 | 简单的文件上传服务 |
| 前端升级 | 4小时 | 编辑器添加图片上传 + 文档层级查看器 |
| 集成测试 | 1小时 | 集成到现有页面并测试 |
| **总计** | **8小时** | **1个工作日完成** |

## 效果展示

完成后的功能：

1. ✅ **自动文档**：创建任务时自动生成 `TASK-000123-任务信息` 文档
2. ✅ **图片支持**：可以上传图片并插入到文档中
3. ✅ **层级查看**：可以看到父任务和子任务的文档列表（只读）

## 后续扩展方向

MVP完成后，可以根据需要逐步添加：

**阶段二（1-2天）**：
- 音频/视频上传支持
- 文档模板系统
- 批量文档操作

**阶段三（2-3天）**：
- 富文本编辑模式（TinyMCE集成）
- 文档权限管理
- 实时协作编辑

**阶段四（3-5天）**：
- 文档版本控制
- 全文搜索功能
- 文档统计分析

这个MVP方案使用@uiw/react-md-editor确保在有限时间内交付核心价值，该编辑器的优势在于开箱即用、功能完整且易于扩展，完美符合1天MVP开发的时间要求。