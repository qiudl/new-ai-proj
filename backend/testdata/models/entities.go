package models

import (
	"time"

	"ai-project-backend/testdata/core"
)

// User 用户实体模型
type User struct {
	*BaseModel
	ID        int       `json:"id" db:"id"`
	Email     string    `json:"email" db:"email"`
	Name      string    `json:"name" db:"name"`
	Password  string    `json:"-" db:"password"`      // 不序列化到JSON
	Avatar    string    `json:"avatar" db:"avatar"`
	Status    string    `json:"status" db:"status"`
	Role      string    `json:"role" db:"role"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
	
	// 关系字段（不持久化）
	Projects []*Project `json:"projects,omitempty" db:"-"`
	Tasks    []*Task    `json:"tasks,omitempty" db:"-"`
}

// NewUser 创建用户实例
func NewUser() *User {
	return &User{
		BaseModel: NewBaseModel("User", "1.0", "用户实体模型"),
		Status:    "active",
		Role:      "user",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

// GetModelName 获取模型名称
func (u *User) GetModelName() string {
	return "User"
}

// GetFields 获取字段定义
func (u *User) GetFields() map[string]core.IFieldDefinition {
	fields := make(map[string]core.IFieldDefinition)
	
	fields["id"] = NewFieldDefinition("id", core.FieldTypeInt).
		SetRequired(true).
		SetUnique(true)
	
	fields["email"] = NewFieldDefinition("email", core.FieldTypeString).
		SetRequired(true).
		SetUnique(true)
	
	fields["name"] = NewFieldDefinition("name", core.FieldTypeString).
		SetRequired(true)
	
	fields["password"] = NewFieldDefinition("password", core.FieldTypeString).
		SetRequired(true)
	
	fields["avatar"] = NewFieldDefinition("avatar", core.FieldTypeString)
	
	fields["status"] = NewFieldDefinition("status", core.FieldTypeString).
		SetDefaultValue("active")
	
	fields["role"] = NewFieldDefinition("role", core.FieldTypeString).
		SetDefaultValue("user")
	
	fields["created_at"] = NewFieldDefinition("created_at", core.FieldTypeTimestamp).
		SetRequired(true)
	
	fields["updated_at"] = NewFieldDefinition("updated_at", core.FieldTypeTimestamp).
		SetRequired(true)
	
	return fields
}

// GetRelations 获取关系定义
func (u *User) GetRelations() map[string]core.IRelation {
	relations := make(map[string]core.IRelation)
	
	relations["projects"] = NewRelation("projects", core.RelationOneToMany, "Project").
		SetForeignKey("owner_id").
		SetLocalKey("id")
	
	relations["tasks"] = NewRelation("tasks", core.RelationOneToMany, "Task").
		SetForeignKey("assignee_id").
		SetLocalKey("id")
	
	return relations
}

// ToMap 转换为Map
func (u *User) ToMap() map[string]interface{} {
	return ToMapGeneric(u)
}

// FromMap 从Map填充
func (u *User) FromMap(data map[string]interface{}) error {
	return FromMapGeneric(u, data)
}

// Project 项目实体模型
type Project struct {
	*BaseModel
	ID          int       `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Description string    `json:"description" db:"description"`
	OwnerID     int       `json:"owner_id" db:"owner_id"`
	Status      string    `json:"status" db:"status"`
	StartDate   time.Time `json:"start_date" db:"start_date"`
	EndDate     time.Time `json:"end_date" db:"end_date"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
	
	// 关系字段
	Owner *User   `json:"owner,omitempty" db:"-"`
	Tasks []*Task `json:"tasks,omitempty" db:"-"`
}

// NewProject 创建项目实例
func NewProject() *Project {
	return &Project{
		BaseModel: NewBaseModel("Project", "1.0", "项目实体模型"),
		Status:    "active",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

// GetModelName 获取模型名称
func (p *Project) GetModelName() string {
	return "Project"
}

// GetFields 获取字段定义
func (p *Project) GetFields() map[string]core.IFieldDefinition {
	fields := make(map[string]core.IFieldDefinition)
	
	fields["id"] = NewFieldDefinition("id", core.FieldTypeInt).
		SetRequired(true).
		SetUnique(true)
	
	fields["name"] = NewFieldDefinition("name", core.FieldTypeString).
		SetRequired(true)
	
	fields["description"] = NewFieldDefinition("description", core.FieldTypeText)
	
	fields["owner_id"] = NewFieldDefinition("owner_id", core.FieldTypeInt).
		SetRequired(true)
	
	fields["status"] = NewFieldDefinition("status", core.FieldTypeString).
		SetDefaultValue("active")
	
	fields["start_date"] = NewFieldDefinition("start_date", core.FieldTypeTimestamp)
	
	fields["end_date"] = NewFieldDefinition("end_date", core.FieldTypeTimestamp)
	
	fields["created_at"] = NewFieldDefinition("created_at", core.FieldTypeTimestamp).
		SetRequired(true)
	
	fields["updated_at"] = NewFieldDefinition("updated_at", core.FieldTypeTimestamp).
		SetRequired(true)
	
	return fields
}

// GetRelations 获取关系定义
func (p *Project) GetRelations() map[string]core.IRelation {
	relations := make(map[string]core.IRelation)
	
	relations["owner"] = NewRelation("owner", core.RelationBelongsTo, "User").
		SetForeignKey("id").
		SetLocalKey("owner_id").
		SetRequired(true)
	
	relations["tasks"] = NewRelation("tasks", core.RelationOneToMany, "Task").
		SetForeignKey("project_id").
		SetLocalKey("id")
	
	return relations
}

// ToMap 转换为Map
func (p *Project) ToMap() map[string]interface{} {
	return ToMapGeneric(p)
}

// FromMap 从Map填充
func (p *Project) FromMap(data map[string]interface{}) error {
	return FromMapGeneric(p, data)
}

// Task 任务实体模型
type Task struct {
	*BaseModel
	ID          int       `json:"id" db:"id"`
	Title       string    `json:"title" db:"title"`
	Description string    `json:"description" db:"description"`
	ProjectID   int       `json:"project_id" db:"project_id"`
	AssigneeID  *int      `json:"assignee_id" db:"assignee_id"`
	Status      string    `json:"status" db:"status"`
	Priority    string    `json:"priority" db:"priority"`
	DueDate     time.Time `json:"due_date" db:"due_date"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
	
	// 关系字段
	Project  *Project `json:"project,omitempty" db:"-"`
	Assignee *User    `json:"assignee,omitempty" db:"-"`
	SubTasks []*Task  `json:"subtasks,omitempty" db:"-"`
}

// NewTask 创建任务实例
func NewTask() *Task {
	return &Task{
		BaseModel: NewBaseModel("Task", "1.0", "任务实体模型"),
		Status:    "todo",
		Priority:  "medium",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

// GetModelName 获取模型名称
func (t *Task) GetModelName() string {
	return "Task"
}

// GetFields 获取字段定义
func (t *Task) GetFields() map[string]core.IFieldDefinition {
	fields := make(map[string]core.IFieldDefinition)
	
	fields["id"] = NewFieldDefinition("id", core.FieldTypeInt).
		SetRequired(true).
		SetUnique(true)
	
	fields["title"] = NewFieldDefinition("title", core.FieldTypeString).
		SetRequired(true)
	
	fields["description"] = NewFieldDefinition("description", core.FieldTypeText)
	
	fields["project_id"] = NewFieldDefinition("project_id", core.FieldTypeInt).
		SetRequired(true)
	
	fields["assignee_id"] = NewFieldDefinition("assignee_id", core.FieldTypeInt)
	
	fields["status"] = NewFieldDefinition("status", core.FieldTypeString).
		SetDefaultValue("todo")
	
	fields["priority"] = NewFieldDefinition("priority", core.FieldTypeString).
		SetDefaultValue("medium")
	
	fields["due_date"] = NewFieldDefinition("due_date", core.FieldTypeTimestamp)
	
	fields["created_at"] = NewFieldDefinition("created_at", core.FieldTypeTimestamp).
		SetRequired(true)
	
	fields["updated_at"] = NewFieldDefinition("updated_at", core.FieldTypeTimestamp).
		SetRequired(true)
	
	return fields
}

// GetRelations 获取关系定义
func (t *Task) GetRelations() map[string]core.IRelation {
	relations := make(map[string]core.IRelation)
	
	relations["project"] = NewRelation("project", core.RelationBelongsTo, "Project").
		SetForeignKey("id").
		SetLocalKey("project_id").
		SetRequired(true)
	
	relations["assignee"] = NewRelation("assignee", core.RelationBelongsTo, "User").
		SetForeignKey("id").
		SetLocalKey("assignee_id")
	
	relations["subtasks"] = NewRelation("subtasks", core.RelationOneToMany, "Task").
		SetForeignKey("parent_id").
		SetLocalKey("id")
	
	return relations
}

// ToMap 转换为Map
func (t *Task) ToMap() map[string]interface{} {
	return ToMapGeneric(t)
}

// FromMap 从Map填充
func (t *Task) FromMap(data map[string]interface{}) error {
	return FromMapGeneric(t, data)
}

// Document 文档实体模型
type Document struct {
	*BaseModel
	ID        int       `json:"id" db:"id"`
	Title     string    `json:"title" db:"title"`
	Content   string    `json:"content" db:"content"`
	Type      string    `json:"type" db:"type"`
	AuthorID  int       `json:"author_id" db:"author_id"`
	TaskID    *int      `json:"task_id" db:"task_id"`
	Status    string    `json:"status" db:"status"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
	
	// 关系字段
	Author *User `json:"author,omitempty" db:"-"`
	Task   *Task `json:"task,omitempty" db:"-"`
}

// NewDocument 创建文档实例
func NewDocument() *Document {
	return &Document{
		BaseModel: NewBaseModel("Document", "1.0", "文档实体模型"),
		Type:      "markdown",
		Status:    "draft",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

// GetModelName 获取模型名称
func (d *Document) GetModelName() string {
	return "Document"
}

// GetFields 获取字段定义
func (d *Document) GetFields() map[string]core.IFieldDefinition {
	fields := make(map[string]core.IFieldDefinition)
	
	fields["id"] = NewFieldDefinition("id", core.FieldTypeInt).
		SetRequired(true).
		SetUnique(true)
	
	fields["title"] = NewFieldDefinition("title", core.FieldTypeString).
		SetRequired(true)
	
	fields["content"] = NewFieldDefinition("content", core.FieldTypeText)
	
	fields["type"] = NewFieldDefinition("type", core.FieldTypeString).
		SetDefaultValue("markdown")
	
	fields["author_id"] = NewFieldDefinition("author_id", core.FieldTypeInt).
		SetRequired(true)
	
	fields["task_id"] = NewFieldDefinition("task_id", core.FieldTypeInt)
	
	fields["status"] = NewFieldDefinition("status", core.FieldTypeString).
		SetDefaultValue("draft")
	
	fields["created_at"] = NewFieldDefinition("created_at", core.FieldTypeTimestamp).
		SetRequired(true)
	
	fields["updated_at"] = NewFieldDefinition("updated_at", core.FieldTypeTimestamp).
		SetRequired(true)
	
	return fields
}

// GetRelations 获取关系定义
func (d *Document) GetRelations() map[string]core.IRelation {
	relations := make(map[string]core.IRelation)
	
	relations["author"] = NewRelation("author", core.RelationBelongsTo, "User").
		SetForeignKey("id").
		SetLocalKey("author_id").
		SetRequired(true)
	
	relations["task"] = NewRelation("task", core.RelationBelongsTo, "Task").
		SetForeignKey("id").
		SetLocalKey("task_id")
	
	return relations
}

// ToMap 转换为Map
func (d *Document) ToMap() map[string]interface{} {
	return ToMapGeneric(d)
}

// FromMap 从Map填充
func (d *Document) FromMap(data map[string]interface{}) error {
	return FromMapGeneric(d, data)
}