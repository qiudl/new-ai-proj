import { Task } from '../types/task';
import { 
  Resource, 
  ResourceAllocation, 
  ResourceUtilizationStats,
  ResourceConflict,
  LoadBalancingResult,
  ResourceOptimizationConfig,
  SuggestionType,
  LoadBalancingSuggestion
} from '../services/resourceManagementService';

// 负载均衡算法相关类型定义
export interface LoadBalancingStrategy {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (
    allocations: ResourceAllocation[],
    resources: Resource[],
    config: ResourceOptimizationConfig
  ) => Promise<LoadBalancingResult>;
}

export interface LoadBalancingMetrics {
  utilizationVariance: number;
  averageUtilization: number;
  maxUtilization: number;
  minUtilization: number;
  overallocationCount: number;
  underutilizationCount: number;
  efficiencyScore: number;
  balanceScore: number;
}

export interface RebalancingAction {
  type: 'MOVE_ALLOCATION' | 'SPLIT_ALLOCATION' | 'MERGE_ALLOCATIONS' | 'ADJUST_CAPACITY';
  sourceResourceId: string;
  targetResourceId?: string;
  allocationId: string;
  adjustmentAmount: number;
  expectedImprovement: number;
  description: string;
}

/**
 * 智能负载均衡器
 * 实现多种负载均衡算法和优化策略
 */
class LoadBalancer {
  private static instance: LoadBalancer;
  
  // 负载均衡策略注册表
  private strategies: Map<string, LoadBalancingStrategy> = new Map();
  
  private constructor() {
    this.initializeStrategies();
  }

  public static getInstance(): LoadBalancer {
    if (!LoadBalancer.instance) {
      LoadBalancer.instance = new LoadBalancer();
    }
    return LoadBalancer.instance;
  }

  /**
   * 初始化内置负载均衡策略
   */
  private initializeStrategies(): void {
    // 1. 轮询策略
    this.registerStrategy({
      name: 'ROUND_ROBIN',
      description: '轮询分配：按顺序均匀分配任务到资源',
      parameters: {},
      execute: this.executeRoundRobinStrategy.bind(this)
    });

    // 2. 最少连接策略
    this.registerStrategy({
      name: 'LEAST_CONNECTIONS',
      description: '最少连接：优先分配给负载最轻的资源',
      parameters: {},
      execute: this.executeLeastConnectionsStrategy.bind(this)
    });

    // 3. 加权轮询策略
    this.registerStrategy({
      name: 'WEIGHTED_ROUND_ROBIN',
      description: '加权轮询：基于资源容量进行加权分配',
      parameters: { weightFactor: 1.0 },
      execute: this.executeWeightedRoundRobinStrategy.bind(this)
    });

    // 4. 能力优先策略
    this.registerStrategy({
      name: 'CAPACITY_FIRST',
      description: '能力优先：优先使用高容量资源',
      parameters: { capacityThreshold: 0.8 },
      execute: this.executeCapacityFirstStrategy.bind(this)
    });

    // 5. 成本优化策略
    this.registerStrategy({
      name: 'COST_OPTIMIZED',
      description: '成本优化：优先使用低成本资源',
      parameters: { costWeight: 0.7, efficiencyWeight: 0.3 },
      execute: this.executeCostOptimizedStrategy.bind(this)
    });

    // 6. 技能匹配策略
    this.registerStrategy({
      name: 'SKILL_MATCHING',
      description: '技能匹配：基于技能匹配度进行分配',
      parameters: { skillWeight: 0.8, availabilityWeight: 0.2 },
      execute: this.executeSkillMatchingStrategy.bind(this)
    });
  }

  /**
   * 注册负载均衡策略
   */
  public registerStrategy(strategy: LoadBalancingStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * 获取可用的负载均衡策略
   */
  public getAvailableStrategies(): LoadBalancingStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * 执行负载均衡
   */
  public async balance(
    allocations: ResourceAllocation[],
    resources: Resource[],
    config: ResourceOptimizationConfig,
    strategyName: string = 'LEAST_CONNECTIONS'
  ): Promise<LoadBalancingResult> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`未找到负载均衡策略: ${strategyName}`);
    }

    try {
      // 执行策略
      const result = await strategy.execute(allocations, resources, config);
      
      // 计算负载均衡指标
      const metrics = this.calculateLoadBalancingMetrics(result.allocations, resources);
      
      // 生成优化建议
      const suggestions = this.generateBalancingSuggestions(metrics, result.allocations, resources);
      
      return {
        ...result,
        suggestions: [...result.suggestions, ...suggestions],
        efficiency: metrics.efficiencyScore
      };
    } catch (error) {
      console.error('负载均衡执行失败:', error);
      throw error;
    }
  }

  /**
   * 轮询策略实现
   */
  private async executeRoundRobinStrategy(
    allocations: ResourceAllocation[],
    resources: Resource[],
    config: ResourceOptimizationConfig
  ): Promise<LoadBalancingResult> {
    const balancedAllocations = [...allocations];
    const conflicts: ResourceConflict[] = [];
    
    // 按资源ID轮询分配
    let currentResourceIndex = 0;
    const sortedResources = [...resources].sort((a, b) => a.id.localeCompare(b.id));
    
    for (let i = 0; i < balancedAllocations.length; i++) {
      const allocation = balancedAllocations[i];
      const targetResource = sortedResources[currentResourceIndex % sortedResources.length];
      
      // 更新分配的资源
      allocation.resourceId = targetResource.id;
      
      currentResourceIndex++;
    }

    const utilizationStats = this.calculateUtilizationStats(balancedAllocations, resources);
    
    return {
      allocations: balancedAllocations,
      utilizationStats,
      conflicts,
      suggestions: [],
      efficiency: this.calculateOverallEfficiency(utilizationStats),
      totalCost: this.calculateTotalCost(balancedAllocations, resources)
    };
  }

  /**
   * 最少连接策略实现
   */
  private async executeLeastConnectionsStrategy(
    allocations: ResourceAllocation[],
    resources: Resource[],
    config: ResourceOptimizationConfig
  ): Promise<LoadBalancingResult> {
    const balancedAllocations = [...allocations];
    const conflicts: ResourceConflict[] = [];
    
    // 计算每个资源的当前负载
    const resourceLoads = new Map<string, number>();
    resources.forEach(resource => {
      const load = balancedAllocations
        .filter(alloc => alloc.resourceId === resource.id)
        .reduce((sum, alloc) => sum + alloc.allocatedHours, 0);
      resourceLoads.set(resource.id, load);
    });

    // 重新分配到负载最轻的资源
    for (const allocation of balancedAllocations) {
      // 找到当前负载最轻的资源
      let lightestResource = resources[0];
      let lightestLoad = resourceLoads.get(lightestResource.id) || 0;
      
      for (const resource of resources) {
        const currentLoad = resourceLoads.get(resource.id) || 0;
        if (currentLoad < lightestLoad) {
          lightestResource = resource;
          lightestLoad = currentLoad;
        }
      }
      
      // 更新分配
      const oldResourceId = allocation.resourceId;
      allocation.resourceId = lightestResource.id;
      
      // 更新负载统计
      resourceLoads.set(oldResourceId, (resourceLoads.get(oldResourceId) || 0) - allocation.allocatedHours);
      resourceLoads.set(lightestResource.id, (resourceLoads.get(lightestResource.id) || 0) + allocation.allocatedHours);
    }

    const utilizationStats = this.calculateUtilizationStats(balancedAllocations, resources);
    
    return {
      allocations: balancedAllocations,
      utilizationStats,
      conflicts,
      suggestions: [],
      efficiency: this.calculateOverallEfficiency(utilizationStats),
      totalCost: this.calculateTotalCost(balancedAllocations, resources)
    };
  }

  /**
   * 加权轮询策略实现
   */
  private async executeWeightedRoundRobinStrategy(
    allocations: ResourceAllocation[],
    resources: Resource[],
    config: ResourceOptimizationConfig
  ): Promise<LoadBalancingResult> {
    const balancedAllocations = [...allocations];
    const conflicts: ResourceConflict[] = [];
    
    // 计算资源权重（基于容量）
    const resourceWeights = resources.map(resource => ({
      resource,
      weight: resource.capacity,
      currentLoad: 0
    }));
    
    const totalWeight = resourceWeights.reduce((sum, rw) => sum + rw.weight, 0);
    
    // 按权重分配任务
    for (const allocation of balancedAllocations) {
      // 选择权重比例最高且当前负载相对最低的资源
      let bestResource = resourceWeights[0];
      let bestScore = -1;
      
      for (const rw of resourceWeights) {
        const weightRatio = rw.weight / totalWeight;
        const loadRatio = rw.currentLoad / (rw.resource.capacity * 40); // 假设每周40小时
        const score = weightRatio - loadRatio;
        
        if (score > bestScore) {
          bestScore = score;
          bestResource = rw;
        }
      }
      
      // 更新分配
      allocation.resourceId = bestResource.resource.id;
      bestResource.currentLoad += allocation.allocatedHours;
    }

    const utilizationStats = this.calculateUtilizationStats(balancedAllocations, resources);
    
    return {
      allocations: balancedAllocations,
      utilizationStats,
      conflicts,
      suggestions: [],
      efficiency: this.calculateOverallEfficiency(utilizationStats),
      totalCost: this.calculateTotalCost(balancedAllocations, resources)
    };
  }

  /**
   * 能力优先策略实现
   */
  private async executeCapacityFirstStrategy(
    allocations: ResourceAllocation[],
    resources: Resource[],
    config: ResourceOptimizationConfig
  ): Promise<LoadBalancingResult> {
    const balancedAllocations = [...allocations];
    const conflicts: ResourceConflict[] = [];
    
    // 按容量排序资源（降序）
    const sortedResources = [...resources].sort((a, b) => b.capacity - a.capacity);
    const capacityThreshold = config.maxOverallocationRate || 0.8;
    
    // 资源使用情况跟踪
    const resourceUsage = new Map<string, number>();
    sortedResources.forEach(resource => resourceUsage.set(resource.id, 0));
    
    // 优先使用高容量资源
    for (const allocation of balancedAllocations) {
      let selectedResource: Resource | null = null;
      
      for (const resource of sortedResources) {
        const currentUsage = resourceUsage.get(resource.id) || 0;
        const utilizationRate = currentUsage / (resource.capacity * 40);
        
        if (utilizationRate < capacityThreshold) {
          selectedResource = resource;
          break;
        }
      }
      
      // 如果没有找到合适的资源，使用负载最轻的
      if (!selectedResource) {
        selectedResource = sortedResources.reduce((lightest, current) => {
          const lightestUsage = resourceUsage.get(lightest.id) || 0;
          const currentUsage = resourceUsage.get(current.id) || 0;
          return currentUsage < lightestUsage ? current : lightest;
        });
      }
      
      if (selectedResource) {
        allocation.resourceId = selectedResource.id;
        resourceUsage.set(selectedResource.id, (resourceUsage.get(selectedResource.id) || 0) + allocation.allocatedHours);
      }
    }

    const utilizationStats = this.calculateUtilizationStats(balancedAllocations, resources);
    
    return {
      allocations: balancedAllocations,
      utilizationStats,
      conflicts,
      suggestions: [],
      efficiency: this.calculateOverallEfficiency(utilizationStats),
      totalCost: this.calculateTotalCost(balancedAllocations, resources)
    };
  }

  /**
   * 成本优化策略实现
   */
  private async executeCostOptimizedStrategy(
    allocations: ResourceAllocation[],
    resources: Resource[],
    config: ResourceOptimizationConfig
  ): Promise<LoadBalancingResult> {
    const balancedAllocations = [...allocations];
    const conflicts: ResourceConflict[] = [];
    const costWeight = config.costWeight || 0.7;
    const efficiencyWeight = config.efficiencyWeight || 0.3;
    
    // 按成本效益比排序资源
    const resourceScores = resources.map(resource => ({
      resource,
      score: this.calculateCostEfficiencyScore(resource, costWeight, efficiencyWeight),
      currentLoad: 0
    })).sort((a, b) => b.score - a.score);
    
    // 按成本效益优先分配
    for (const allocation of balancedAllocations) {
      // 选择最佳成本效益比且未过载的资源
      let bestResource = resourceScores[0];
      
      for (const rs of resourceScores) {
        const utilizationRate = rs.currentLoad / (rs.resource.capacity * 40);
        if (utilizationRate < 0.9) { // 避免过度分配
          bestResource = rs;
          break;
        }
      }
      
      allocation.resourceId = bestResource.resource.id;
      bestResource.currentLoad += allocation.allocatedHours;
    }

    const utilizationStats = this.calculateUtilizationStats(balancedAllocations, resources);
    
    return {
      allocations: balancedAllocations,
      utilizationStats,
      conflicts,
      suggestions: [],
      efficiency: this.calculateOverallEfficiency(utilizationStats),
      totalCost: this.calculateTotalCost(balancedAllocations, resources)
    };
  }

  /**
   * 技能匹配策略实现
   */
  private async executeSkillMatchingStrategy(
    allocations: ResourceAllocation[],
    resources: Resource[],
    config: ResourceOptimizationConfig
  ): Promise<LoadBalancingResult> {
    const balancedAllocations = [...allocations];
    const conflicts: ResourceConflict[] = [];
    const skillWeight = config.efficiencyWeight || 0.8;
    const availabilityWeight = config.balanceWeight || 0.2;
    
    // 为每个分配找到最匹配的资源
    for (const allocation of balancedAllocations) {
      // 获取任务所需技能（这里简化处理，实际应该从任务信息中获取）
      const requiredSkills = this.extractTaskSkills(allocation.taskId);
      
      let bestResource = resources[0];
      let bestScore = -1;
      
      for (const resource of resources) {
        // 计算技能匹配度
        const skillMatchScore = this.calculateSkillMatchScore(requiredSkills, resource.skills);
        
        // 计算可用性评分
        const availabilityScore = this.calculateAvailabilityScore(resource, allocation.startDate, allocation.endDate);
        
        // 综合评分
        const totalScore = skillMatchScore * skillWeight + availabilityScore * availabilityWeight;
        
        if (totalScore > bestScore) {
          bestScore = totalScore;
          bestResource = resource;
        }
      }
      
      allocation.resourceId = bestResource.id;
    }

    const utilizationStats = this.calculateUtilizationStats(balancedAllocations, resources);
    
    return {
      allocations: balancedAllocations,
      utilizationStats,
      conflicts,
      suggestions: [],
      efficiency: this.calculateOverallEfficiency(utilizationStats),
      totalCost: this.calculateTotalCost(balancedAllocations, resources)
    };
  }

  /**
   * 计算负载均衡指标
   */
  private calculateLoadBalancingMetrics(
    allocations: ResourceAllocation[],
    resources: Resource[]
  ): LoadBalancingMetrics {
    const utilizationRates = resources.map(resource => {
      const allocated = allocations
        .filter(alloc => alloc.resourceId === resource.id)
        .reduce((sum, alloc) => sum + alloc.allocatedHours, 0);
      return allocated / (resource.capacity * 40);
    });

    const averageUtilization = utilizationRates.reduce((sum, rate) => sum + rate, 0) / utilizationRates.length;
    const maxUtilization = Math.max(...utilizationRates);
    const minUtilization = Math.min(...utilizationRates);
    
    // 计算方差
    const variance = utilizationRates.reduce((sum, rate) => sum + Math.pow(rate - averageUtilization, 2), 0) / utilizationRates.length;
    
    // 计算过载和低利用率资源数量
    const overallocationCount = utilizationRates.filter(rate => rate > 1.0).length;
    const underutilizationCount = utilizationRates.filter(rate => rate < 0.5).length;
    
    // 效率评分 (0-1)
    const efficiencyScore = Math.max(0, 1 - variance);
    
    // 平衡评分 (0-1)
    const balanceScore = Math.max(0, 1 - (maxUtilization - minUtilization));

    return {
      utilizationVariance: variance,
      averageUtilization,
      maxUtilization,
      minUtilization,
      overallocationCount,
      underutilizationCount,
      efficiencyScore,
      balanceScore
    };
  }

  /**
   * 生成平衡优化建议
   */
  private generateBalancingSuggestions(
    metrics: LoadBalancingMetrics,
    _allocations: ResourceAllocation[],
    _resources: Resource[]
  ): LoadBalancingSuggestion[] {
    const suggestions: LoadBalancingSuggestion[] = [];

    // 高方差建议
    if (metrics.utilizationVariance > 0.3) {
      suggestions.push({
        type: SuggestionType.REBALANCE_ALLOCATION,
        priority: 'HIGH',
        description: `资源利用率不均衡（方差：${metrics.utilizationVariance.toFixed(2)}），建议重新平衡负载`,
        expectedImprovement: 0.3,
        estimatedEffort: 4,
        actions: [{
          type: 'REALLOCATE',
          targetId: 'system',
          parameters: { strategy: 'LEAST_CONNECTIONS' },
          description: '使用最少连接策略重新分配任务'
        }]
      });
    }

    // 过载资源建议
    if (metrics.overallocationCount > 0) {
      suggestions.push({
        type: SuggestionType.ADD_RESOURCES,
        priority: 'HIGH',
        description: `发现 ${metrics.overallocationCount} 个过载资源，建议增加资源或重新分配`,
        expectedImprovement: 0.4,
        estimatedEffort: 6,
        actions: [{
          type: 'ADD_RESOURCE',
          targetId: 'overloaded_resources',
          parameters: { capacity: 'medium' },
          description: '增加额外资源以缓解过载'
        }]
      });
    }

    // 低利用率建议
    if (metrics.underutilizationCount > 0) {
      suggestions.push({
        type: SuggestionType.COST_OPTIMIZATION,
        priority: 'MEDIUM',
        description: `发现 ${metrics.underutilizationCount} 个低利用率资源，建议优化分配`,
        expectedImprovement: 0.2,
        estimatedEffort: 2,
        actions: [{
          type: 'REALLOCATE',
          targetId: 'underutilized_resources',
          parameters: { increaseUtilization: true },
          description: '将更多任务分配给低利用率资源'
        }]
      });
    }

    return suggestions;
  }

  /**
   * 辅助方法 - 计算成本效益评分
   */
  private calculateCostEfficiencyScore(resource: Resource, costWeight: number, efficiencyWeight: number): number {
    const costScore = 1 / (resource.costPerHour + 1); // 成本越低分数越高
    const capacityScore = resource.capacity / 10; // 容量评分
    return costScore * costWeight + capacityScore * efficiencyWeight;
  }

  /**
   * 辅助方法 - 提取任务技能需求
   */
  private extractTaskSkills(taskId: number): string[] {
    // 简化实现，实际应该从任务数据中获取
    const skillMap: Record<number, string[]> = {
      1: ['React', 'TypeScript'],
      2: ['Node.js', 'Database'],
      3: ['Design', 'UI/UX'],
      4: ['Testing', 'QA']
    };
    return skillMap[taskId] || ['General'];
  }

  /**
   * 辅助方法 - 计算技能匹配评分
   */
  private calculateSkillMatchScore(requiredSkills: string[], resourceSkills: string[]): number {
    if (requiredSkills.length === 0) return 1;
    
    const matchedSkills = requiredSkills.filter(skill => resourceSkills.includes(skill));
    return matchedSkills.length / requiredSkills.length;
  }

  /**
   * 辅助方法 - 计算可用性评分
   */
  private calculateAvailabilityScore(resource: Resource, startDate: Date, endDate: Date): number {
    const availableSlots = resource.availability.filter(avail => 
      avail.isAvailable &&
      avail.startDate <= startDate &&
      avail.endDate >= endDate
    );
    
    return availableSlots.length > 0 ? 1 : 0.3; // 可用返回1，不可用返回0.3（仍可考虑）
  }

  /**
   * 辅助方法 - 计算利用率统计
   */
  private calculateUtilizationStats(
    allocations: ResourceAllocation[],
    resources: Resource[]
  ): ResourceUtilizationStats[] {
    return resources.map(resource => {
      const resourceAllocations = allocations.filter(a => a.resourceId === resource.id);
      const allocatedHours = resourceAllocations.reduce((sum, a) => sum + a.allocatedHours, 0);
      const totalCapacity = resource.capacity * 40; // 假设每周40小时
      const utilizationRate = totalCapacity > 0 ? allocatedHours / totalCapacity : 0;
      const overallocationHours = Math.max(0, allocatedHours - totalCapacity);
      
      return {
        resourceId: resource.id,
        resourceName: resource.name,
        totalCapacity,
        allocatedHours,
        availableHours: Math.max(0, totalCapacity - allocatedHours),
        utilizationRate,
        overallocationHours,
        efficiency: this.calculateResourceEfficiency(resource, resourceAllocations),
        costUtilization: allocatedHours * resource.costPerHour
      };
    });
  }

  /**
   * 辅助方法 - 计算资源效率
   */
  private calculateResourceEfficiency(resource: Resource, allocations: ResourceAllocation[]): number {
    // 简化的效率计算，考虑技能匹配度和利用率
    return 0.8; // 实际实现中会更复杂
  }

  /**
   * 辅助方法 - 计算总体效率
   */
  private calculateOverallEfficiency(utilizationStats: ResourceUtilizationStats[]): number {
    if (utilizationStats.length === 0) return 0;
    
    const totalEfficiency = utilizationStats.reduce((sum, stats) => sum + stats.efficiency, 0);
    return totalEfficiency / utilizationStats.length;
  }

  /**
   * 辅助方法 - 计算总成本
   */
  private calculateTotalCost(allocations: ResourceAllocation[], resources: Resource[]): number {
    return allocations.reduce((total, allocation) => {
      const resource = resources.find(r => r.id === allocation.resourceId);
      return total + (resource ? allocation.allocatedHours * resource.costPerHour : 0);
    }, 0);
  }

  /**
   * 执行实时负载调整
   */
  public async performRealTimeBalancing(
    currentAllocations: ResourceAllocation[],
    resources: Resource[],
    newAllocation: ResourceAllocation,
    config: ResourceOptimizationConfig
  ): Promise<LoadBalancingResult> {
    const updatedAllocations = [...currentAllocations, newAllocation];
    
    // 检查是否需要重新平衡
    const metrics = this.calculateLoadBalancingMetrics(updatedAllocations, resources);
    
    if (metrics.utilizationVariance > 0.4 || metrics.overallocationCount > 0) {
      // 执行智能重新平衡
      return this.balance(updatedAllocations, resources, config, 'LEAST_CONNECTIONS');
    }
    
    // 不需要重新平衡，返回当前状态
    const utilizationStats = this.calculateUtilizationStats(updatedAllocations, resources);
    
    return {
      allocations: updatedAllocations,
      utilizationStats,
      conflicts: [],
      suggestions: [],
      efficiency: this.calculateOverallEfficiency(utilizationStats),
      totalCost: this.calculateTotalCost(updatedAllocations, resources)
    };
  }

  /**
   * 预测负载趋势
   */
  public predictLoadTrend(
    currentAllocations: ResourceAllocation[],
    resources: Resource[],
    futureTasks: Task[],
    timeHorizon: number = 30 // 天数
  ): Promise<LoadBalancingMetrics[]> {
    return new Promise((resolve) => {
      // 简化的趋势预测实现
      const currentMetrics = this.calculateLoadBalancingMetrics(currentAllocations, resources);
      const predictions: LoadBalancingMetrics[] = [];
      
      // 生成未来7天的预测数据
      for (let day = 1; day <= Math.min(timeHorizon, 7); day++) {
        const trend = 1 + (day * 0.05); // 假设每天增长5%
        predictions.push({
          ...currentMetrics,
          averageUtilization: Math.min(1.2, currentMetrics.averageUtilization * trend),
          maxUtilization: Math.min(1.5, currentMetrics.maxUtilization * trend)
        });
      }
      
      resolve(predictions);
    });
  }
}

export default LoadBalancer;