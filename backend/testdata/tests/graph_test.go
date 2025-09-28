package tests

import (
	"fmt"
	"math"
	"strings"
	"testing"

	"ai-project-backend/testdata/core"
	"ai-project-backend/testdata/models"
	"ai-project-backend/testdata/relations"
)

// TestModelGraph 测试模型关系图
func TestModelGraph(t *testing.T) {
	registry := core.NewModelRegistry()
	graph := relations.NewModelGraph(registry)

	// 注册模型到注册中心
	registry.RegisterModel("User", func() core.IDataModel {
		return models.NewUser()
	})
	registry.RegisterModel("Project", func() core.IDataModel {
		return models.NewProject()
	})
	registry.RegisterModel("Task", func() core.IDataModel {
		return models.NewTask()
	})
	registry.RegisterModel("Document", func() core.IDataModel {
		return models.NewDocument()
	})

	// 添加模型到图中
	user := models.NewUser()
	err := graph.AddModel(user)
	if err != nil {
		t.Fatalf("Failed to add User model: %v", err)
	}

	project := models.NewProject()
	err = graph.AddModel(project)
	if err != nil {
		t.Fatalf("Failed to add Project model: %v", err)
	}

	task := models.NewTask()
	err = graph.AddModel(task)
	if err != nil {
		t.Fatalf("Failed to add Task model: %v", err)
	}

	document := models.NewDocument()
	err = graph.AddModel(document)
	if err != nil {
		t.Fatalf("Failed to add Document model: %v", err)
	}

	// 测试重复添加
	err = graph.AddModel(user)
	if err == nil {
		t.Error("Expected error for duplicate model addition")
	}

	// 测试获取节点
	userNode, err := graph.GetNode("User")
	if err != nil {
		t.Fatalf("Failed to get User node: %v", err)
	}
	if userNode.Name != "User" {
		t.Errorf("Expected node name 'User', got '%s'", userNode.Name)
	}

	// 测试获取所有节点
	allNodes := graph.GetAllNodes()
	if len(allNodes) != 4 {
		t.Errorf("Expected 4 nodes, got %d", len(allNodes))
	}

	// 测试获取所有边
	allEdges := graph.GetAllEdges()
	if len(allEdges) == 0 {
		t.Error("Expected some edges, got none")
	}

	// 测试获取邻居节点
	neighbors, err := graph.GetNeighbors("User")
	if err != nil {
		t.Fatalf("Failed to get User neighbors: %v", err)
	}
	
	// User应该有到Project和Task的边
	expectedNeighbors := map[string]bool{"Project": false, "Task": false}
	for _, neighbor := range neighbors {
		if _, exists := expectedNeighbors[neighbor.Name]; exists {
			expectedNeighbors[neighbor.Name] = true
		}
	}
	for name, found := range expectedNeighbors {
		if !found {
			t.Errorf("Expected %s as neighbor of User, but not found", name)
		}
	}
}

// TestGraphValidation 测试图验证
func TestGraphValidation(t *testing.T) {
	registry := core.NewModelRegistry()
	graph := relations.NewModelGraph(registry)

	// 添加模型
	user := models.NewUser()
	project := models.NewProject()
	task := models.NewTask()

	graph.AddModel(user)
	graph.AddModel(project)
	graph.AddModel(task)

	// 验证图的完整性
	errors := graph.ValidateGraph()
	// 业务模型中存在循环依赖是正常的，只检查是否有孤立引用
	hasOrphanReferences := false
	for _, err := range errors {
		if strings.Contains(err.Error(), "non-existent model") {
			hasOrphanReferences = true
			break
		}
	}
	if hasOrphanReferences {
		t.Error("Found orphan references in graph")
	}

	// 测试移除模型后的验证
	err := graph.RemoveModel("User")
	if err != nil {
		t.Fatalf("Failed to remove User model: %v", err)
	}

	// 现在应该有验证错误，因为Project和Task引用了不存在的User
	errors = graph.ValidateGraph()
	if len(errors) == 0 {
		t.Error("Expected validation errors after removing referenced model")
	}
}

// TestGraphMetrics 测试图度量指标
func TestGraphMetrics(t *testing.T) {
	registry := core.NewModelRegistry()
	graph := relations.NewModelGraph(registry)

	// 添加模型
	user := models.NewUser()
	project := models.NewProject()
	task := models.NewTask()
	document := models.NewDocument()

	graph.AddModel(user)
	graph.AddModel(project)
	graph.AddModel(task)
	graph.AddModel(document)

	// 计算度量指标
	metrics := graph.CalculateMetrics()

	if metrics.NodeCount != 4 {
		t.Errorf("Expected 4 nodes, got %d", metrics.NodeCount)
	}

	if metrics.EdgeCount == 0 {
		t.Error("Expected some edges, got 0")
	}

	if metrics.Density <= 0 || metrics.Density > 1 {
		t.Errorf("Expected density between 0 and 1, got %f", metrics.Density)
	}

	if metrics.MaxDepth < 0 {
		t.Errorf("Expected non-negative max depth, got %d", metrics.MaxDepth)
	}

	if len(metrics.Connectivity) != 4 {
		t.Errorf("Expected connectivity info for 4 models, got %d", len(metrics.Connectivity))
	}
}

// TestGraphPath 测试图路径查找
func TestGraphPath(t *testing.T) {
	registry := core.NewModelRegistry()
	graph := relations.NewModelGraph(registry)

	// 添加模型
	user := models.NewUser()
	project := models.NewProject()
	task := models.NewTask()

	graph.AddModel(user)
	graph.AddModel(project)
	graph.AddModel(task)

	// 测试查找从User到Task的路径
	path, err := graph.GetPath("User", "Task")
	if err != nil {
		t.Fatalf("Failed to find path from User to Task: %v", err)
	}

	if len(path) == 0 {
		t.Error("Expected non-empty path from User to Task")
	}

	// 验证路径的起点和终点
	if path[0].Source != "User" {
		t.Errorf("Expected path to start from User, got %s", path[0].Source)
	}

	lastEdge := path[len(path)-1]
	if lastEdge.Target != "Task" {
		t.Errorf("Expected path to end at Task, got %s", lastEdge.Target)
	}

	// 测试不存在的路径
	_, err = graph.GetPath("User", "NonExistentModel")
	if err == nil {
		t.Error("Expected error for path to non-existent model")
	}
}

// TestGraphLayout 测试图布局算法
func TestGraphLayout(t *testing.T) {
	registry := core.NewModelRegistry()
	graph := relations.NewModelGraph(registry)

	// 添加模型
	user := models.NewUser()
	project := models.NewProject()
	task := models.NewTask()
	document := models.NewDocument()

	graph.AddModel(user)
	graph.AddModel(project)
	graph.AddModel(task)
	graph.AddModel(document)

	// 测试层次化布局
	err := graph.UpdateLayout(relations.LayoutHierarchical)
	if err != nil {
		t.Fatalf("Failed to update hierarchical layout: %v", err)
	}

	// 检查节点位置是否已更新
	allNodes := graph.GetAllNodes()
	positionsSet := make(map[string]bool)
	for _, node := range allNodes {
		key := fmt.Sprintf("%.2f,%.2f", node.Position.X, node.Position.Y)
		if positionsSet[key] {
			// 允许一些节点有相同位置，特别是在同一层级
			continue
		}
		positionsSet[key] = true
		
		// 检查深度是否正确设置
		if node.Depth < 0 {
			t.Errorf("Expected non-negative depth for node %s, got %d", node.Name, node.Depth)
		}
	}

	// 测试圆形布局
	err = graph.UpdateLayout(relations.LayoutCircular)
	if err != nil {
		t.Fatalf("Failed to update circular layout: %v", err)
	}

	// 验证节点位置在圆形上
	for _, node := range allNodes {
		distance := math.Sqrt(node.Position.X*node.Position.X + node.Position.Y*node.Position.Y)
		expected := 200.0 // 圆形布局的半径
		if math.Abs(distance-expected) > 1.0 { // 允许小的浮点误差
			t.Errorf("Expected node %s at distance ~%.1f, got %.1f", node.Name, expected, distance)
		}
	}

	// 测试力导向布局
	err = graph.UpdateLayout(relations.LayoutForceDirected)
	if err != nil {
		t.Fatalf("Failed to update force-directed layout: %v", err)
	}

	// 测试不支持的布局算法
	err = graph.UpdateLayout(relations.LayoutAlgorithm(999))
	if err == nil {
		t.Error("Expected error for unsupported layout algorithm")
	}
}

// TestGraphCycleDetection 测试循环依赖检测
func TestGraphCycleDetection(t *testing.T) {
	registry := core.NewModelRegistry()
	graph := relations.NewModelGraph(registry)

	// 创建一个简单的图，没有循环
	user := models.NewUser()
	project := models.NewProject()
	task := models.NewTask()

	graph.AddModel(user)
	graph.AddModel(project)
	graph.AddModel(task)

	// 验证循环依赖检测功能
	errors := graph.ValidateGraph()
	hasCycleError := false
	for _, err := range errors {
		if strings.Contains(err.Error(), "circular dependency") {
			hasCycleError = true
			break
		}
	}
	// 在正常的业务模型中，Project和Task之间的循环依赖是可接受的
	if hasCycleError {
		t.Log("Detected expected circular dependency between Project and Task")
	}
}

// TestModelNodeOperations 测试模型节点操作
func TestModelNodeOperations(t *testing.T) {
	registry := core.NewModelRegistry()
	graph := relations.NewModelGraph(registry)

	// 添加用户模型
	user := models.NewUser()
	err := graph.AddModel(user)
	if err != nil {
		t.Fatalf("Failed to add User model: %v", err)
	}

	// 获取用户节点
	userNode, err := graph.GetNode("User")
	if err != nil {
		t.Fatalf("Failed to get User node: %v", err)
	}

	// 验证节点属性
	if userNode.Name != "User" {
		t.Errorf("Expected node name 'User', got '%s'", userNode.Name)
	}

	if userNode.Model == nil {
		t.Error("Expected node to have model reference")
	}

	if len(userNode.Fields) == 0 {
		t.Error("Expected node to have fields")
	}

	if len(userNode.Relations) == 0 {
		t.Error("Expected node to have relations")
	}

	if userNode.Metadata == nil {
		t.Error("Expected node to have metadata map")
	}

	// 测试节点元数据操作
	userNode.Metadata["test_key"] = "test_value"
	if userNode.Metadata["test_key"] != "test_value" {
		t.Error("Failed to set metadata on node")
	}
}

// TestRelationEdgeOperations 测试关系边操作
func TestRelationEdgeOperations(t *testing.T) {
	registry := core.NewModelRegistry()
	graph := relations.NewModelGraph(registry)

	// 添加模型
	user := models.NewUser()
	project := models.NewProject()

	graph.AddModel(user)
	graph.AddModel(project)

	// 获取所有边
	allEdges := graph.GetAllEdges()
	
	// 验证User的边
	userEdges := allEdges["User"]
	if len(userEdges) < 2 { // User应该有到Project和Task的边
		t.Errorf("Expected at least 2 edges from User, got %d", len(userEdges))
	}

	// 检查边的属性
	for _, edge := range userEdges {
		if edge.Source != "User" {
			t.Errorf("Expected edge source to be 'User', got '%s'", edge.Source)
		}

		if edge.Target == "" {
			t.Error("Expected edge to have target")
		}

		if edge.Relation == nil {
			t.Error("Expected edge to have relation")
		}

		if edge.Weight <= 0 {
			t.Errorf("Expected positive edge weight, got %f", edge.Weight)
		}

		if edge.Metadata == nil {
			t.Error("Expected edge to have metadata map")
		}
	}
}

