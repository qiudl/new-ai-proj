package relations

import (
	"errors"
	"fmt"
	"math"
	"sync"

	"ai-project-backend/testdata/core"
)

// ModelGraph 模型关系图
type ModelGraph struct {
	mu       sync.RWMutex
	nodes    map[string]*ModelNode
	edges    map[string][]*RelationEdge
	registry core.IModelRegistry
}

// ModelNode 模型节点
type ModelNode struct {
	Name       string                      `json:"name"`
	Model      core.IDataModel            `json:"-"`
	Fields     map[string]core.IFieldDefinition `json:"fields"`
	Relations  map[string]core.IRelation  `json:"relations"`
	Depth      int                        `json:"depth"`
	Position   Position                   `json:"position"`
	Metadata   map[string]interface{}     `json:"metadata"`
}

// RelationEdge 关系边
type RelationEdge struct {
	Source     string              `json:"source"`
	Target     string              `json:"target"`
	Relation   core.IRelation      `json:"relation"`
	Type       core.RelationType   `json:"type"`
	Weight     float64             `json:"weight"`
	Metadata   map[string]interface{} `json:"metadata"`
}

// Position 节点位置
type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	Z float64 `json:"z,omitempty"`
}

// NewModelGraph 创建模型图
func NewModelGraph(registry core.IModelRegistry) *ModelGraph {
	return &ModelGraph{
		nodes:    make(map[string]*ModelNode),
		edges:    make(map[string][]*RelationEdge),
		registry: registry,
	}
}

// AddModel 添加模型到图中
func (g *ModelGraph) AddModel(model core.IDataModel) error {
	g.mu.Lock()
	defer g.mu.Unlock()
	
	modelName := model.GetModelName()
	if _, exists := g.nodes[modelName]; exists {
		return errors.New("model already exists in graph")
	}
	
	node := &ModelNode{
		Name:      modelName,
		Model:     model,
		Fields:    model.GetFields(),
		Relations: model.GetRelations(),
		Depth:     0,
		Position:  Position{X: 0, Y: 0},
		Metadata:  make(map[string]interface{}),
	}
	
	g.nodes[modelName] = node
	g.edges[modelName] = make([]*RelationEdge, 0)
	
	// 构建关系边
	for _, relation := range model.GetRelations() {
		edge := &RelationEdge{
			Source:   modelName,
			Target:   relation.GetTargetModel(),
			Relation: relation,
			Type:     relation.GetType(),
			Weight:   g.calculateRelationWeight(relation),
			Metadata: make(map[string]interface{}),
		}
		g.edges[modelName] = append(g.edges[modelName], edge)
	}
	
	return nil
}

// RemoveModel 从图中移除模型
func (g *ModelGraph) RemoveModel(modelName string) error {
	g.mu.Lock()
	defer g.mu.Unlock()
	
	if _, exists := g.nodes[modelName]; !exists {
		return errors.New("model not found in graph")
	}
	
	// 移除节点
	delete(g.nodes, modelName)
	delete(g.edges, modelName)
	
	// 移除指向该模型的边
	for source, edges := range g.edges {
		newEdges := make([]*RelationEdge, 0)
		for _, edge := range edges {
			if edge.Target != modelName {
				newEdges = append(newEdges, edge)
			}
		}
		g.edges[source] = newEdges
	}
	
	return nil
}

// GetNode 获取模型节点
func (g *ModelGraph) GetNode(modelName string) (*ModelNode, error) {
	g.mu.RLock()
	defer g.mu.RUnlock()
	
	node, exists := g.nodes[modelName]
	if !exists {
		return nil, errors.New("model not found in graph")
	}
	
	return node, nil
}

// GetNeighbors 获取邻居节点
func (g *ModelGraph) GetNeighbors(modelName string) ([]*ModelNode, error) {
	g.mu.RLock()
	defer g.mu.RUnlock()
	
	edges, exists := g.edges[modelName]
	if !exists {
		return nil, errors.New("model not found in graph")
	}
	
	neighbors := make([]*ModelNode, 0)
	for _, edge := range edges {
		if neighbor, exists := g.nodes[edge.Target]; exists {
			neighbors = append(neighbors, neighbor)
		}
	}
	
	return neighbors, nil
}

// GetPath 获取两个模型间的路径
func (g *ModelGraph) GetPath(source, target string) ([]*RelationEdge, error) {
	g.mu.RLock()
	defer g.mu.RUnlock()
	
	if _, exists := g.nodes[source]; !exists {
		return nil, errors.New("source model not found")
	}
	if _, exists := g.nodes[target]; !exists {
		return nil, errors.New("target model not found")
	}
	
	return g.dijkstra(source, target)
}

// GetAllNodes 获取所有节点
func (g *ModelGraph) GetAllNodes() map[string]*ModelNode {
	g.mu.RLock()
	defer g.mu.RUnlock()
	
	result := make(map[string]*ModelNode)
	for k, v := range g.nodes {
		result[k] = v
	}
	return result
}

// GetAllEdges 获取所有边
func (g *ModelGraph) GetAllEdges() map[string][]*RelationEdge {
	g.mu.RLock()
	defer g.mu.RUnlock()
	
	result := make(map[string][]*RelationEdge)
	for k, v := range g.edges {
		result[k] = v
	}
	return result
}

// ValidateGraph 验证图的完整性
func (g *ModelGraph) ValidateGraph() []error {
	g.mu.RLock()
	defer g.mu.RUnlock()
	
	var errors []error
	
	// 检查孤立的引用
	for source, edges := range g.edges {
		for _, edge := range edges {
			if _, exists := g.nodes[edge.Target]; !exists {
				errors = append(errors, 
					fmt.Errorf("model %s references non-existent model %s", source, edge.Target))
			}
		}
	}
	
	// 检查循环依赖
	if cycles := g.detectCycles(); len(cycles) > 0 {
		for _, cycle := range cycles {
			errors = append(errors, fmt.Errorf("circular dependency detected: %v", cycle))
		}
	}
	
	return errors
}

// CalculateMetrics 计算图的度量指标
func (g *ModelGraph) CalculateMetrics() GraphMetrics {
	g.mu.RLock()
	defer g.mu.RUnlock()
	
	metrics := GraphMetrics{
		NodeCount:    len(g.nodes),
		EdgeCount:    0,
		Density:      0,
		Connectivity: make(map[string]int),
	}
	
	// 计算边数和连通性
	for source, edges := range g.edges {
		edgeCount := len(edges)
		metrics.EdgeCount += edgeCount
		metrics.Connectivity[source] = edgeCount
	}
	
	// 计算密度
	if metrics.NodeCount > 1 {
		maxEdges := metrics.NodeCount * (metrics.NodeCount - 1)
		metrics.Density = float64(metrics.EdgeCount) / float64(maxEdges)
	}
	
	// 计算最大深度
	metrics.MaxDepth = g.calculateMaxDepth()
	
	return metrics
}

// UpdateLayout 更新图布局
func (g *ModelGraph) UpdateLayout(algorithm LayoutAlgorithm) error {
	g.mu.Lock()
	defer g.mu.Unlock()
	
	switch algorithm {
	case LayoutForceDirected:
		return g.forceDirectedLayout()
	case LayoutHierarchical:
		return g.hierarchicalLayout()
	case LayoutCircular:
		return g.circularLayout()
	default:
		return errors.New("unsupported layout algorithm")
	}
}

// dijkstra 实现Dijkstra最短路径算法
func (g *ModelGraph) dijkstra(source, target string) ([]*RelationEdge, error) {
	dist := make(map[string]float64)
	prev := make(map[string]*RelationEdge)
	visited := make(map[string]bool)
	queue := make([]string, 0)
	
	// 初始化距离
	for nodeName := range g.nodes {
		dist[nodeName] = float64(^uint(0) >> 1) // 无穷大
		visited[nodeName] = false
	}
	dist[source] = 0
	queue = append(queue, source)
	
	for len(queue) > 0 {
		// 找到距离最小的未访问节点
		minIdx := 0
		for i, node := range queue {
			if dist[node] < dist[queue[minIdx]] {
				minIdx = i
			}
		}
		
		current := queue[minIdx]
		queue = append(queue[:minIdx], queue[minIdx+1:]...)
		
		if visited[current] {
			continue
		}
		visited[current] = true
		
		if current == target {
			break
		}
		
		// 更新邻居距离
		for _, edge := range g.edges[current] {
			if !visited[edge.Target] {
				alt := dist[current] + edge.Weight
				if alt < dist[edge.Target] {
					dist[edge.Target] = alt
					prev[edge.Target] = edge
					queue = append(queue, edge.Target)
				}
			}
		}
	}
	
	// 重建路径
	if prev[target] == nil {
		return nil, errors.New("no path found")
	}
	
	path := make([]*RelationEdge, 0)
	current := target
	for prev[current] != nil {
		edge := prev[current]
		path = append([]*RelationEdge{edge}, path...)
		current = edge.Source
	}
	
	return path, nil
}

// detectCycles 检测循环依赖
func (g *ModelGraph) detectCycles() [][]string {
	color := make(map[string]int) // 0: white, 1: gray, 2: black
	var cycles [][]string
	var path []string
	
	var dfs func(string) bool
	dfs = func(node string) bool {
		if color[node] == 1 { // 灰色节点，发现循环
			// 找到循环的起始位置
			cycleStart := -1
			for i, n := range path {
				if n == node {
					cycleStart = i
					break
				}
			}
			if cycleStart >= 0 {
				cycles = append(cycles, append([]string{}, path[cycleStart:]...))
			}
			return true
		}
		
		if color[node] == 2 { // 已访问
			return false
		}
		
		color[node] = 1 // 标记为正在访问
		path = append(path, node)
		
		for _, edge := range g.edges[node] {
			if dfs(edge.Target) {
				return true
			}
		}
		
		color[node] = 2 // 标记为已访问
		path = path[:len(path)-1]
		return false
	}
	
	for node := range g.nodes {
		if color[node] == 0 {
			dfs(node)
		}
	}
	
	return cycles
}

// calculateRelationWeight 计算关系权重
func (g *ModelGraph) calculateRelationWeight(relation core.IRelation) float64 {
	weight := 1.0
	
	// 根据关系类型调整权重
	switch relation.GetType() {
	case core.RelationBelongsTo:
		weight = 0.5 // 从属关系权重较低
	case core.RelationOneToOne:
		weight = 0.8
	case core.RelationOneToMany:
		weight = 1.0
	case core.RelationManyToMany:
		weight = 1.5 // 多对多关系权重较高
	}
	
	// 必需关系权重更高
	if relation.IsRequired() {
		weight *= 1.2
	}
	
	return weight
}

// calculateMaxDepth 计算最大深度
func (g *ModelGraph) calculateMaxDepth() int {
	visited := make(map[string]bool)
	maxDepth := 0
	
	var dfs func(string, int)
	dfs = func(node string, depth int) {
		if visited[node] {
			return
		}
		
		visited[node] = true
		if depth > maxDepth {
			maxDepth = depth
		}
		
		for _, edge := range g.edges[node] {
			dfs(edge.Target, depth+1)
		}
	}
	
	for node := range g.nodes {
		if !visited[node] {
			dfs(node, 0)
		}
	}
	
	return maxDepth
}

// forceDirectedLayout 力导向布局算法
func (g *ModelGraph) forceDirectedLayout() error {
	// 简化的力导向布局实现
	const iterations = 100
	const k = 1.0 // 弹簧常数
	const repulsion = 10.0 // 排斥力常数
	
	for iter := 0; iter < iterations; iter++ {
		forces := make(map[string]Position)
		
		// 计算排斥力
		for name1, node1 := range g.nodes {
			forces[name1] = Position{X: 0, Y: 0}
			for name2, node2 := range g.nodes {
				if name1 != name2 {
					dx := node1.Position.X - node2.Position.X
					dy := node1.Position.Y - node2.Position.Y
					distance := math.Sqrt(dx*dx + dy*dy)
					if distance > 0 {
						force := repulsion / (distance * distance)
						currentForce := forces[name1]
						currentForce.X += force * dx / distance
						currentForce.Y += force * dy / distance
						forces[name1] = currentForce
					}
				}
			}
		}
		
		// 计算吸引力
		for source, edges := range g.edges {
			sourceNode := g.nodes[source]
			for _, edge := range edges {
				if targetNode, exists := g.nodes[edge.Target]; exists {
					dx := targetNode.Position.X - sourceNode.Position.X
					dy := targetNode.Position.Y - sourceNode.Position.Y
					distance := math.Sqrt(dx*dx + dy*dy)
					if distance > 0 {
						force := k * distance
						currentForce := forces[source]
						currentForce.X += force * dx / distance
						currentForce.Y += force * dy / distance
						forces[source] = currentForce
					}
				}
			}
		}
		
		// 应用力
		for name, force := range forces {
			node := g.nodes[name]
			node.Position.X += force.X * 0.01
			node.Position.Y += force.Y * 0.01
		}
	}
	
	return nil
}

// hierarchicalLayout 层次化布局算法
func (g *ModelGraph) hierarchicalLayout() error {
	// 计算每个节点的层级
	levels := make(map[string]int)
	visited := make(map[string]bool)
	
	var assignLevel func(string, int)
	assignLevel = func(node string, level int) {
		if visited[node] {
			return
		}
		
		visited[node] = true
		if currentLevel, exists := levels[node]; !exists || level > currentLevel {
			levels[node] = level
		}
		
		for _, edge := range g.edges[node] {
			assignLevel(edge.Target, level+1)
		}
	}
	
	// 从根节点开始分配层级
	for node := range g.nodes {
		if !visited[node] {
			assignLevel(node, 0)
		}
	}
	
	// 按层级排列节点
	levelGroups := make(map[int][]string)
	for node, level := range levels {
		levelGroups[level] = append(levelGroups[level], node)
	}
	
	// 设置位置
	ySpacing := 100.0
	xSpacing := 150.0
	
	for level, nodes := range levelGroups {
		y := float64(level) * ySpacing
		for i, node := range nodes {
			x := float64(i-(len(nodes)-1)/2) * xSpacing
			g.nodes[node].Position = Position{X: x, Y: y}
			g.nodes[node].Depth = level
		}
	}
	
	return nil
}

// circularLayout 圆形布局算法
func (g *ModelGraph) circularLayout() error {
	nodeCount := len(g.nodes)
	if nodeCount == 0 {
		return nil
	}
	
	radius := 200.0
	angleStep := 2 * math.Pi / float64(nodeCount)
	
	i := 0
	for _, node := range g.nodes {
		angle := float64(i) * angleStep
		node.Position = Position{
			X: radius * math.Cos(angle),
			Y: radius * math.Sin(angle),
		}
		i++
	}
	
	return nil
}

// GraphMetrics 图度量指标
type GraphMetrics struct {
	NodeCount    int            `json:"node_count"`
	EdgeCount    int            `json:"edge_count"`
	Density      float64        `json:"density"`
	MaxDepth     int            `json:"max_depth"`
	Connectivity map[string]int `json:"connectivity"`
}

// LayoutAlgorithm 布局算法枚举
type LayoutAlgorithm int

const (
	LayoutForceDirected LayoutAlgorithm = iota
	LayoutHierarchical
	LayoutCircular
)

