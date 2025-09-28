package tests

import (
	"errors"
	"testing"
	"time"

	"ai-project-backend/testdata/core"
	"ai-project-backend/testdata/models"
)

// TestModelRegistry 测试模型注册中心
func TestModelRegistry(t *testing.T) {
	registry := core.NewModelRegistry()

	// 测试模型注册
	err := registry.RegisterModel("User", func() core.IDataModel {
		return models.NewUser()
	})
	if err != nil {
		t.Fatalf("Failed to register User model: %v", err)
	}

	// 测试模型创建
	userInstance, err := registry.CreateInstance("User")
	if err != nil {
		t.Fatalf("Failed to create User instance: %v", err)
	}

	if userInstance.GetModelName() != "User" {
		t.Errorf("Expected model name 'User', got '%s'", userInstance.GetModelName())
	}

	// 测试重复注册
	err = registry.RegisterModel("User", func() core.IDataModel {
		return models.NewUser()
	})
	if err == nil {
		t.Error("Expected error for duplicate model registration")
	}

	// 测试获取元数据
	metadata, err := registry.GetModelMetadata("User")
	if err != nil {
		t.Fatalf("Failed to get User metadata: %v", err)
	}
	if metadata.Name != "User" {
		t.Errorf("Expected metadata name 'User', got '%s'", metadata.Name)
	}

	// 测试列出所有模型
	modelNames := registry.ListModels()
	if len(modelNames) != 1 || modelNames[0] != "User" {
		t.Errorf("Expected [User], got %v", modelNames)
	}

	// 测试注销模型
	err = registry.UnregisterModel("User")
	if err != nil {
		t.Fatalf("Failed to unregister User model: %v", err)
	}

	// 再次测试创建已注销的模型
	_, err = registry.CreateInstance("User")
	if err == nil {
		t.Error("Expected error for creating unregistered model")
	}
}

// TestFieldDefinition 测试字段定义
func TestFieldDefinition(t *testing.T) {
	// 创建字段定义
	field := models.NewFieldDefinition("email", core.FieldTypeString)
	field.SetRequired(true).SetUnique(true).SetDefaultValue("test@example.com")

	// 测试基本属性
	if field.GetName() != "email" {
		t.Errorf("Expected field name 'email', got '%s'", field.GetName())
	}

	if field.GetType() != core.FieldTypeString {
		t.Errorf("Expected field type String, got %v", field.GetType())
	}

	if !field.IsRequired() {
		t.Error("Expected field to be required")
	}

	if !field.IsUnique() {
		t.Error("Expected field to be unique")
	}

	if field.GetDefaultValue() != "test@example.com" {
		t.Errorf("Expected default value 'test@example.com', got '%v'", field.GetDefaultValue())
	}

	// 测试添加约束
	constraint := models.NewConstraint("length", core.ConstraintTypeLength)
	constraint.SetParam("min", 5).SetParam("max", 100)
	field.AddConstraint(constraint)

	constraints := field.GetConstraints()
	if len(constraints) != 1 {
		t.Errorf("Expected 1 constraint, got %d", len(constraints))
	}

	if constraints[0].GetName() != "length" {
		t.Errorf("Expected constraint name 'length', got '%s'", constraints[0].GetName())
	}
}

// TestRelation 测试关系定义
func TestRelation(t *testing.T) {
	relation := models.NewRelation("owner", core.RelationBelongsTo, "User")
	relation.SetForeignKey("id").SetLocalKey("owner_id").SetRequired(true)

	// 测试基本属性
	if relation.GetName() != "owner" {
		t.Errorf("Expected relation name 'owner', got '%s'", relation.GetName())
	}

	if relation.GetType() != core.RelationBelongsTo {
		t.Errorf("Expected relation type BelongsTo, got %v", relation.GetType())
	}

	if relation.GetTargetModel() != "User" {
		t.Errorf("Expected target model 'User', got '%s'", relation.GetTargetModel())
	}

	if relation.GetForeignKey() != "id" {
		t.Errorf("Expected foreign key 'id', got '%s'", relation.GetForeignKey())
	}

	if relation.GetLocalKey() != "owner_id" {
		t.Errorf("Expected local key 'owner_id', got '%s'", relation.GetLocalKey())
	}

	if !relation.IsRequired() {
		t.Error("Expected relation to be required")
	}

	// 测试基数设置
	cardinality := core.Cardinality{Min: 1, Max: 1}
	relation.SetCardinality(cardinality)
	
	if relation.GetCardinality().Min != 1 || relation.GetCardinality().Max != 1 {
		t.Errorf("Expected cardinality {1, 1}, got %v", relation.GetCardinality())
	}
}

// TestConstraint 测试约束
func TestConstraint(t *testing.T) {
	constraint := models.NewConstraint("range", core.ConstraintTypeRange)
	constraint.SetParam("min", 1).SetParam("max", 100)

	// 测试基本属性
	if constraint.GetName() != "range" {
		t.Errorf("Expected constraint name 'range', got '%s'", constraint.GetName())
	}

	if constraint.GetType() != core.ConstraintTypeRange {
		t.Errorf("Expected constraint type Range, got %v", constraint.GetType())
	}

	// 测试参数
	params := constraint.GetParams()
	if params["min"] != 1 || params["max"] != 100 {
		t.Errorf("Expected params {min: 1, max: 100}, got %v", params)
	}

	// 测试自定义验证器
	constraint.SetValidator(func(value interface{}) error {
		if num, ok := value.(int); ok {
			if num < 1 || num > 100 {
				return errors.New("value out of range")
			}
		}
		return nil
	})

	// 测试验证
	if err := constraint.Validate(50); err != nil {
		t.Errorf("Expected no error for valid value, got %v", err)
	}

	if err := constraint.Validate(150); err == nil {
		t.Error("Expected error for invalid value")
	}
}

// TestUserModel 测试用户模型
func TestUserModel(t *testing.T) {
	user := models.NewUser()
	user.ID = 1
	user.Email = "test@example.com"
	user.Name = "Test User"
	user.Status = "active"
	user.Role = "admin"
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	// 测试模型名称
	if user.GetModelName() != "User" {
		t.Errorf("Expected model name 'User', got '%s'", user.GetModelName())
	}

	// 测试字段定义
	fields := user.GetFields()
	if len(fields) < 7 { // 至少包含基本字段
		t.Errorf("Expected at least 7 fields, got %d", len(fields))
	}

	// 测试必填字段
	idField := fields["id"]
	if !idField.IsRequired() || !idField.IsUnique() {
		t.Error("ID field should be required and unique")
	}

	emailField := fields["email"]
	if !emailField.IsRequired() || !emailField.IsUnique() {
		t.Error("Email field should be required and unique")
	}

	// 测试关系定义
	relations := user.GetRelations()
	if len(relations) < 2 { // projects 和 tasks
		t.Errorf("Expected at least 2 relations, got %d", len(relations))
	}

	projectsRelation := relations["projects"]
	if projectsRelation.GetType() != core.RelationOneToMany {
		t.Error("Projects relation should be OneToMany")
	}

	// 测试ToMap转换
	dataMap := user.ToMap()
	if dataMap["email"] != "test@example.com" {
		t.Errorf("Expected email 'test@example.com', got '%v'", dataMap["email"])
	}

	// 测试FromMap填充
	newUser := models.NewUser()
	testData := map[string]interface{}{
		"id":    2,
		"email": "new@example.com",
		"name":  "New User",
	}

	err := newUser.FromMap(testData)
	if err != nil {
		t.Fatalf("Failed to populate from map: %v", err)
	}

	if newUser.ID != 2 || newUser.Email != "new@example.com" {
		t.Error("Failed to correctly populate user from map")
	}
}

// TestProjectModel 测试项目模型
func TestProjectModel(t *testing.T) {
	project := models.NewProject()
	project.ID = 1
	project.Name = "Test Project"
	project.Description = "Test Description"
	project.OwnerID = 1
	project.Status = "active"

	// 测试模型名称
	if project.GetModelName() != "Project" {
		t.Errorf("Expected model name 'Project', got '%s'", project.GetModelName())
	}

	// 测试关系定义
	relations := project.GetRelations()
	
	ownerRelation := relations["owner"]
	if ownerRelation.GetType() != core.RelationBelongsTo {
		t.Error("Owner relation should be BelongsTo")
	}
	if !ownerRelation.IsRequired() {
		t.Error("Owner relation should be required")
	}

	tasksRelation := relations["tasks"]
	if tasksRelation.GetType() != core.RelationOneToMany {
		t.Error("Tasks relation should be OneToMany")
	}
}

// TestTaskModel 测试任务模型
func TestTaskModel(t *testing.T) {
	task := models.NewTask()
	task.ID = 1
	task.Title = "Test Task"
	task.Description = "Test Description"
	task.ProjectID = 1
	assigneeID := 1
	task.AssigneeID = &assigneeID
	task.Status = "in_progress"
	task.Priority = "high"

	// 测试模型名称
	if task.GetModelName() != "Task" {
		t.Errorf("Expected model name 'Task', got '%s'", task.GetModelName())
	}

	// 测试字段定义
	fields := task.GetFields()
	statusField := fields["status"]
	if statusField.GetDefaultValue() != "todo" {
		t.Errorf("Expected default status 'todo', got '%v'", statusField.GetDefaultValue())
	}

	priorityField := fields["priority"]
	if priorityField.GetDefaultValue() != "medium" {
		t.Errorf("Expected default priority 'medium', got '%v'", priorityField.GetDefaultValue())
	}

	// 测试关系定义
	relations := task.GetRelations()
	projectRelation := relations["project"]
	if !projectRelation.IsRequired() {
		t.Error("Project relation should be required")
	}

	assigneeRelation := relations["assignee"]
	if assigneeRelation.IsRequired() {
		t.Error("Assignee relation should not be required")
	}
}

// TestDocumentModel 测试文档模型
func TestDocumentModel(t *testing.T) {
	doc := models.NewDocument()
	doc.ID = 1
	doc.Title = "Test Document"
	doc.Content = "# Test Content"
	doc.Type = "markdown"
	doc.AuthorID = 1
	taskID := 1
	doc.TaskID = &taskID
	doc.Status = "published"

	// 测试模型名称
	if doc.GetModelName() != "Document" {
		t.Errorf("Expected model name 'Document', got '%s'", doc.GetModelName())
	}

	// 测试字段默认值
	fields := doc.GetFields()
	typeField := fields["type"]
	if typeField.GetDefaultValue() != "markdown" {
		t.Errorf("Expected default type 'markdown', got '%v'", typeField.GetDefaultValue())
	}

	statusField := fields["status"]
	if statusField.GetDefaultValue() != "draft" {
		t.Errorf("Expected default status 'draft', got '%v'", statusField.GetDefaultValue())
	}

	// 测试关系定义
	relations := doc.GetRelations()
	authorRelation := relations["author"]
	if !authorRelation.IsRequired() {
		t.Error("Author relation should be required")
	}

	taskRelation := relations["task"]
	if taskRelation.IsRequired() {
		t.Error("Task relation should not be required")
	}
}

