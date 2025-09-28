package main

import (
	"fmt"
	"log"
	"time"

	"ai-project-backend/testdata/core"
	"ai-project-backend/testdata/models"
	"ai-project-backend/testdata/relations"
)

// 核心数据模型系统演示
func main() {
	fmt.Println("=== 核心数据模型设计与实现 演示 ===\n")

	// 1. 创建模型注册中心
	fmt.Println("1. 创建模型注册中心")
	registry := core.NewModelRegistry()
	
	// 注册所有模型
	registerModels(registry)
	fmt.Printf("已注册的模型: %v\n\n", registry.ListModels())

	// 2. 创建和操作实体模型
	fmt.Println("2. 创建和操作实体模型")
	demonstrateModels(registry)

	// 3. 演示关系图谱功能
	fmt.Println("\n3. 演示关系图谱功能")
	demonstrateRelationGraph(registry)

	// 4. 演示约束验证
	fmt.Println("\n4. 演示约束验证")
	demonstrateConstraints()

	// 5. 演示数据转换
	fmt.Println("\n5. 演示数据转换")
	demonstrateDataConversion()
	
	fmt.Println("\n=== 演示结束 ===")
}

// 注册所有模型
func registerModels(registry core.IModelRegistry) {
	models := map[string]func() core.IDataModel{
		"User":     func() core.IDataModel { return models.NewUser() },
		"Project":  func() core.IDataModel { return models.NewProject() },
		"Task":     func() core.IDataModel { return models.NewTask() },
		"Document": func() core.IDataModel { return models.NewDocument() },
	}

	for name, factory := range models {
		if err := registry.RegisterModel(name, factory); err != nil {
			log.Fatalf("Failed to register %s model: %v", name, err)
		}
	}
}

// 演示模型功能
func demonstrateModels(registry core.IModelRegistry) {
	// 创建用户
	userInstance, err := registry.CreateInstance("User")
	if err != nil {
		log.Fatalf("Failed to create User instance: %v", err)
	}
	
	user := userInstance.(*models.User)
	user.ID = 1
	user.Email = "john.doe@example.com"
	user.Name = "John Doe"
	user.Status = "active"
	user.Role = "admin"
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	fmt.Printf("创建用户: %s (ID: %d, Email: %s)\n", user.Name, user.ID, user.Email)

	// 显示用户字段定义
	fields := user.GetFields()
	fmt.Printf("用户模型字段数量: %d\n", len(fields))
	
	// 显示必填和唯一字段
	for name, field := range fields {
		if field.IsRequired() {
			fmt.Printf("  - %s: %s (必填: %t, 唯一: %t)\n", 
				name, field.GetType(), field.IsRequired(), field.IsUnique())
		}
	}

	// 创建项目
	projectInstance, _ := registry.CreateInstance("Project")
	project := projectInstance.(*models.Project)
	project.ID = 1
	project.Name = "AI Data Model Project"
	project.Description = "智能数据模型设计项目"
	project.OwnerID = user.ID
	project.Status = "active"
	project.StartDate = time.Now()
	project.EndDate = time.Now().Add(time.Hour * 24 * 30) // 30天后

	fmt.Printf("创建项目: %s (所有者ID: %d)\n", project.Name, project.OwnerID)

	// 创建任务
	taskInstance, _ := registry.CreateInstance("Task")
	task := taskInstance.(*models.Task)
	task.ID = 1
	task.Title = "实现核心数据模型"
	task.Description = "设计和实现核心数据模型接口"
	task.ProjectID = project.ID
	assigneeID := user.ID
	task.AssigneeID = &assigneeID
	task.Status = "in_progress"
	task.Priority = "high"
	task.DueDate = time.Now().Add(time.Hour * 24 * 7) // 7天后

	fmt.Printf("创建任务: %s (项目ID: %d, 负责人ID: %d)\n", 
		task.Title, task.ProjectID, *task.AssigneeID)

	// 显示关系定义
	userRelations := user.GetRelations()
	fmt.Printf("用户关系数量: %d\n", len(userRelations))
	for name, relation := range userRelations {
		fmt.Printf("  - %s -> %s (%s)\n", 
			name, relation.GetTargetModel(), relation.GetType())
	}
}

// 演示关系图谱功能
func demonstrateRelationGraph(registry core.IModelRegistry) {
	// 创建关系图
	graph := relations.NewModelGraph(registry)

	// 创建所有模型实例并添加到图中
	modelNames := []string{"User", "Project", "Task", "Document"}
	for _, name := range modelNames {
		instance, err := registry.CreateInstance(name)
		if err != nil {
			log.Fatalf("Failed to create %s instance: %v", name, err)
		}
		
		if err := graph.AddModel(instance); err != nil {
			log.Fatalf("Failed to add %s to graph: %v", name, err)
		}
	}

	fmt.Printf("图中模型数量: %d\n", len(graph.GetAllNodes()))

	// 计算图度量指标
	metrics := graph.CalculateMetrics()
	fmt.Printf("图度量指标:\n")
	fmt.Printf("  - 节点数: %d\n", metrics.NodeCount)
	fmt.Printf("  - 边数: %d\n", metrics.EdgeCount)
	fmt.Printf("  - 密度: %.3f\n", metrics.Density)
	fmt.Printf("  - 最大深度: %d\n", metrics.MaxDepth)

	// 显示连通性信息
	fmt.Printf("模型连通性:\n")
	for model, connections := range metrics.Connectivity {
		fmt.Printf("  - %s: %d 个连接\n", model, connections)
	}

	// 查找路径
	path, err := graph.GetPath("User", "Task")
	if err == nil && len(path) > 0 {
		fmt.Printf("User 到 Task 的路径长度: %d\n", len(path))
		for i, edge := range path {
			fmt.Printf("  %d. %s -> %s (权重: %.2f)\n", 
				i+1, edge.Source, edge.Target, edge.Weight)
		}
	}

	// 获取邻居节点
	neighbors, err := graph.GetNeighbors("User")
	if err == nil {
		fmt.Printf("User 的邻居节点: ")
		for _, neighbor := range neighbors {
			fmt.Printf("%s ", neighbor.Name)
		}
		fmt.Println()
	}

	// 验证图的完整性
	validationErrors := graph.ValidateGraph()
	if len(validationErrors) == 0 {
		fmt.Println("图验证通过: 没有发现问题")
	} else {
		fmt.Printf("图验证发现 %d 个问题\n", len(validationErrors))
		for _, err := range validationErrors {
			fmt.Printf("  - %v\n", err)
		}
	}

	// 演示布局算法
	fmt.Println("应用层次化布局...")
	if err := graph.UpdateLayout(relations.LayoutHierarchical); err != nil {
		fmt.Printf("布局失败: %v\n", err)
	} else {
		fmt.Println("层次化布局应用成功")
		
		// 显示节点深度信息
		allNodes := graph.GetAllNodes()
		for name, node := range allNodes {
			fmt.Printf("  - %s: 深度 %d, 位置 (%.1f, %.1f)\n", 
				name, node.Depth, node.Position.X, node.Position.Y)
		}
	}
}

// 演示约束验证
func demonstrateConstraints() {
	// 创建字段约束
	emailField := models.NewFieldDefinition("email", core.FieldTypeString)
	emailField.SetRequired(true).SetUnique(true)

	// 添加长度约束
	lengthConstraint := models.NewConstraint("length", core.ConstraintTypeLength)
	lengthConstraint.SetParam("min", 5).SetParam("max", 100)
	lengthConstraint.SetValidator(func(value interface{}) error {
		if str, ok := value.(string); ok {
			if len(str) < 5 || len(str) > 100 {
				return fmt.Errorf("email length must be between 5 and 100 characters")
			}
		}
		return nil
	})
	emailField.AddConstraint(lengthConstraint)

	// 添加格式约束
	formatConstraint := models.NewConstraint("email_format", core.ConstraintTypeFormat)
	formatConstraint.SetParam("pattern", "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$")
	formatConstraint.SetValidator(func(value interface{}) error {
		if str, ok := value.(string); ok {
			if !isValidEmail(str) {
				return fmt.Errorf("invalid email format")
			}
		}
		return nil
	})
	emailField.AddConstraint(formatConstraint)

	fmt.Printf("Email 字段约束数量: %d\n", len(emailField.GetConstraints()))

	// 测试约束验证
	testEmails := []string{
		"test@example.com",
		"invalid-email",
		"x@y.z",  // 太短
		"very.long.email.address.that.exceeds.the.maximum.length.limit.for.demonstration@example.com", // 太长
	}

	for _, email := range testEmails {
		fmt.Printf("验证邮箱 '%s': ", email)
		
		valid := true
		for _, constraint := range emailField.GetConstraints() {
			if err := constraint.Validate(email); err != nil {
				fmt.Printf("失败 (%s)", err.Error())
				valid = false
				break
			}
		}
		
		if valid {
			fmt.Print("通过")
		}
		fmt.Println()
	}
}

// 演示数据转换
func demonstrateDataConversion() {
	// 创建用户实例
	user := models.NewUser()
	user.ID = 1
	user.Email = "demo@example.com"
	user.Name = "Demo User"
	user.Status = "active"
	user.Role = "user"
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	// 转换为Map
	userMap := user.ToMap()
	fmt.Println("用户转换为Map:")
	for key, value := range userMap {
		if key == "Password" { // 跳过密码字段
			continue
		}
		fmt.Printf("  %s: %v\n", key, value)
	}

	// 从Map创建新用户
	newUser := models.NewUser()
	testData := map[string]interface{}{
		"ID":    2,
		"Email": "new.user@example.com",
		"Name":  "New User",
		"Status": "pending",
		"Role":  "admin",
	}

	if err := newUser.FromMap(testData); err != nil {
		fmt.Printf("FromMap 转换失败: %v\n", err)
	} else {
		fmt.Println("\n从Map创建新用户成功:")
		fmt.Printf("  ID: %d\n", newUser.ID)
		fmt.Printf("  Email: %s\n", newUser.Email)
		fmt.Printf("  Name: %s\n", newUser.Name)
		fmt.Printf("  Status: %s\n", newUser.Status)
		fmt.Printf("  Role: %s\n", newUser.Role)
	}

	// 演示模型元数据
	fmt.Println("\n模型元数据:")
	metadata := user.GetMetadata()
	fmt.Printf("  名称: %s\n", metadata.Name)
	fmt.Printf("  版本: %s\n", metadata.Version)
	fmt.Printf("  描述: %s\n", metadata.Description)
	fmt.Printf("  创建时间: %s\n", metadata.CreatedAt.Format("2006-01-02 15:04:05"))
	
	// 添加标签和属性
	user.AddTag("demo")
	user.AddTag("example")
	user.SetProperty("department", "Engineering")
	user.SetProperty("location", "Shanghai")
	
	updatedMetadata := user.GetMetadata()
	fmt.Printf("  标签: %v\n", updatedMetadata.Tags)
	fmt.Printf("  自定义属性: %v\n", updatedMetadata.Properties)
}

// 简单的邮箱格式验证
func isValidEmail(email string) bool {
	// 简化的邮箱验证，实际使用中应该使用正则表达式
	return len(email) > 5 && 
		   contains(email, "@") && 
		   contains(email, ".") &&
		   !startsWith(email, "@") &&
		   !endsWith(email, "@")
}

// 字符串包含检查
func contains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// 字符串开头检查
func startsWith(s, prefix string) bool {
	return len(s) >= len(prefix) && s[:len(prefix)] == prefix
}

// 字符串结尾检查
func endsWith(s, suffix string) bool {
	return len(s) >= len(suffix) && s[len(s)-len(suffix):] == suffix
}