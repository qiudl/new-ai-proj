import { Task } from '../types/task';
import { TaskService } from '../services/taskService';

export interface HierarchicalTaskWithDocument extends Task {
  level: number;
  parent_id?: number;
  children_count: number;
  expanded: boolean;
  hasChildren: boolean;
  
  documents: any[];
  documentCount: number;
  lastDocumentUpdate?: string;
  
  ancestorIds: number[];
  ancestorTitles: string[];
  
  isLoading?: boolean;
  loadError?: string;
}

export interface HierarchicalStats {
  total: number;
  byLevel: Map<number, number>;
  withDocuments: number;
  withoutDocuments: number;
  byStatus: Map<string, number>;
}

export interface HierarchicalLoadingState {
  rootTasks: Task[];
  expandedNodes: Set<number>;
  loadedChildren: Map<number, Task[]>;
  loadingNodes: Set<number>;
}

export class HierarchicalTaskManager {
  private tasks: Map<number, HierarchicalTaskWithDocument> = new Map();
  private expandedKeys: Set<number> = new Set();
  private loadedChildren: Map<number, Task[]> = new Map();
  private loadingNodes: Set<number> = new Set();

  constructor() {
    this.tasks = new Map();
    this.expandedKeys = new Set();
    this.loadedChildren = new Map();
    this.loadingNodes = new Set();
  }

  /**
   * 构建树形结构
   * @param flatTasks 扁平化的任务列表
   * @returns 层级任务列表
   */
  buildTree(flatTasks: Task[]): HierarchicalTaskWithDocument[] {
    // 1. 清空现有数据
    this.tasks.clear();
    
    // 2. 转换为层级任务对象并建立映射
    const taskMap = new Map<number, HierarchicalTaskWithDocument>();
    const rootTasks: HierarchicalTaskWithDocument[] = [];
    
    // 首先创建所有任务对象
    flatTasks.forEach(task => {
      // ✅ FIXED - Type assertion for task spread with required children_count property (TS2322)
      const hierarchicalTask: HierarchicalTaskWithDocument = {
        ...task,
        children_count: task.children_count || 0,
        level: task.task_level || 0,
        expanded: this.expandedKeys.has(task.id),
        hasChildren: (task.children_count || 0) > 0,
        documents: [],
        documentCount: 0,
        lastDocumentUpdate: undefined,
        ancestorIds: [],
        ancestorTitles: [],
        isLoading: false,
        loadError: undefined,
      } as HierarchicalTaskWithDocument;
      
      taskMap.set(task.id, hierarchicalTask);
      this.tasks.set(task.id, hierarchicalTask);
    });

    // 建立父子关系并计算祖先路径
    taskMap.forEach(task => {
      // 计算祖先路径
      this.calculateAncestorPath(task, taskMap);
      
      // 根任务直接加入结果
      if (!task.parent_id) {
        rootTasks.push(task);
      }
    });

    // 按创建时间排序
    rootTasks.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return rootTasks;
  }

  /**
   * 计算任务的祖先路径
   */
  private calculateAncestorPath(
    task: HierarchicalTaskWithDocument, 
    taskMap: Map<number, HierarchicalTaskWithDocument>
  ): void {
    const ancestorIds: number[] = [];
    const ancestorTitles: string[] = [];
    
    let currentTask = task;
    
    // 向上追溯到根任务
    while (currentTask.parent_id) {
      const parent = taskMap.get(currentTask.parent_id);
      if (!parent) break;
      
      ancestorIds.unshift(parent.id);
      ancestorTitles.unshift(parent.title);
      currentTask = parent;
    }
    
    task.ancestorIds = ancestorIds;
    task.ancestorTitles = ancestorTitles;
  }

  /**
   * 展开节点
   * @param taskId 要展开的任务ID
   * @param projectId 项目ID
   * @returns 子任务列表
   */
  async expandNode(taskId: number, projectId: number): Promise<Task[]> {
    // 检查是否正在加载
    if (this.loadingNodes.has(taskId)) {
      return [];
    }

    // 检查缓存
    if (this.loadedChildren.has(taskId)) {
      this.expandedKeys.add(taskId);
      const task = this.tasks.get(taskId);
      if (task) {
        task.expanded = true;
      }
      return this.loadedChildren.get(taskId) || [];
    }

    try {
      // 设置加载状态
      this.loadingNodes.add(taskId);
      const task = this.tasks.get(taskId);
      if (task) {
        task.isLoading = true;
        task.loadError = undefined;
      }

      // 加载子任务
      const children = await TaskService.getTaskChildren(projectId, taskId);
      const childrenArray = Array.isArray(children) ? children : children.data || [];

      // 缓存子任务
      this.loadedChildren.set(taskId, childrenArray);
      
      // 更新展开状态
      this.expandedKeys.add(taskId);
      if (task) {
        task.expanded = true;
        task.isLoading = false;
      }

      return childrenArray;
    } catch (error) {
      console.error('加载子任务失败:', error);
      
      // 设置错误状态
      const task = this.tasks.get(taskId);
      if (task) {
        task.isLoading = false;
        task.loadError = error instanceof Error ? error.message : '加载失败';
      }
      
      return [];
    } finally {
      this.loadingNodes.delete(taskId);
    }
  }

  /**
   * 折叠节点
   * @param taskId 要折叠的任务ID
   */
  collapseNode(taskId: number): void {
    this.expandedKeys.delete(taskId);
    const task = this.tasks.get(taskId);
    if (task) {
      task.expanded = false;
    }
    
    // 递归折叠所有子节点
    this.recursiveCollapseChildren(taskId);
  }

  /**
   * 递归折叠子节点
   */
  private recursiveCollapseChildren(taskId: number): void {
    const children = this.loadedChildren.get(taskId);
    if (!children) return;

    children.forEach(child => {
      this.expandedKeys.delete(child.id);
      const childTask = this.tasks.get(child.id);
      if (childTask) {
        childTask.expanded = false;
      }
      this.recursiveCollapseChildren(child.id);
    });
  }

  /**
   * 扁平化显示列表
   * @param tree 树形结构的任务列表
   * @returns 扁平化的显示列表
   */
  flattenForDisplay(tree: HierarchicalTaskWithDocument[]): HierarchicalTaskWithDocument[] {
    const result: HierarchicalTaskWithDocument[] = [];
    
    const flatten = (tasks: HierarchicalTaskWithDocument[]) => {
      tasks.forEach(task => {
        result.push(task);
        
        // 如果任务展开且有已加载的子任务，递归添加
        if (task.expanded && this.loadedChildren.has(task.id)) {
          const children = this.loadedChildren.get(task.id) || [];
          const hierarchicalChildren = children.map(child => {
            const existing = this.tasks.get(child.id);
            if (existing) {
              return existing;
            }

            // ✅ FIXED - Type assertion for child task spread with required children_count property (TS2322)
            // 创建新的层级任务对象
            const hierarchicalChild: HierarchicalTaskWithDocument = {
              ...child,
              children_count: child.children_count || 0,
              level: task.level + 1,
              expanded: this.expandedKeys.has(child.id),
              hasChildren: (child.children_count || 0) > 0,
              documents: [],
              documentCount: 0,
              lastDocumentUpdate: undefined,
              ancestorIds: [...task.ancestorIds, task.id],
              ancestorTitles: [...task.ancestorTitles, task.title],
              isLoading: false,
              loadError: undefined,
            } as HierarchicalTaskWithDocument;
            
            this.tasks.set(child.id, hierarchicalChild);
            return hierarchicalChild;
          });
          
          flatten(hierarchicalChildren);
        }
      });
    };
    
    flatten(tree);
    return result;
  }

  /**
   * 智能展开（有文档的分支）
   * @param projectId 项目ID
   */
  async smartExpand(projectId: number): Promise<void> {
    const tasksWithDocuments = Array.from(this.tasks.values())
      .filter(task => task.documentCount > 0);
    
    // 展开所有有文档任务的祖先路径
    for (const task of tasksWithDocuments) {
      for (const ancestorId of task.ancestorIds) {
        if (!this.expandedKeys.has(ancestorId)) {
          await this.expandNode(ancestorId, projectId);
        }
      }
    }
  }

  /**
   * 搜索路径展开
   * @param keyword 搜索关键词
   * @param projectId 项目ID
   */
  async expandSearchPath(keyword: string, projectId: number): Promise<void> {
    const lowerKeyword = keyword.toLowerCase();
    const matchingTasks = Array.from(this.tasks.values())
      .filter(task => 
        task.title.toLowerCase().includes(lowerKeyword) ||
        task.description?.toLowerCase().includes(lowerKeyword)
      );
    
    // 展开所有匹配任务的祖先路径
    for (const task of matchingTasks) {
      for (const ancestorId of task.ancestorIds) {
        if (!this.expandedKeys.has(ancestorId)) {
          await this.expandNode(ancestorId, projectId);
        }
      }
    }
  }

  /**
   * 批量展开到指定层级
   * @param maxLevel 最大展开层级
   * @param projectId 项目ID
   */
  async expandToLevel(maxLevel: number, projectId: number): Promise<void> {
    const tasksToExpand = Array.from(this.tasks.values())
      .filter(task => task.level < maxLevel && task.hasChildren);
    
    for (const task of tasksToExpand) {
      if (!this.expandedKeys.has(task.id)) {
        await this.expandNode(task.id, projectId);
      }
    }
  }

  /**
   * 全部展开
   * @param projectId 项目ID
   */
  async expandAll(projectId: number): Promise<void> {
    await this.expandToLevel(3, projectId); // 展开到最大层级
  }

  /**
   * 全部折叠
   */
  collapseAll(): void {
    Array.from(this.expandedKeys).forEach(taskId => {
      this.collapseNode(taskId);
    });
  }

  /**
   * 计算统计信息
   * @param tasks 任务列表
   * @returns 统计信息
   */
  calculateStats(tasks: HierarchicalTaskWithDocument[]): HierarchicalStats {
    const stats: HierarchicalStats = {
      total: tasks.length,
      byLevel: new Map(),
      withDocuments: 0,
      withoutDocuments: 0,
      byStatus: new Map(),
    };

    tasks.forEach(task => {
      // 按层级统计
      const levelCount = stats.byLevel.get(task.level) || 0;
      stats.byLevel.set(task.level, levelCount + 1);

      // 按文档状态统计
      if (task.documentCount > 0) {
        stats.withDocuments++;
      } else {
        stats.withoutDocuments++;
      }

      // 按任务状态统计
      const statusCount = stats.byStatus.get(task.status) || 0;
      stats.byStatus.set(task.status, statusCount + 1);
    });

    return stats;
  }

  /**
   * 更新任务文档信息
   * @param taskId 任务ID
   * @param documents 文档列表
   */
  updateTaskDocuments(taskId: number, documents: any[]): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.documents = documents;
      task.documentCount = documents.length;
      
      if (documents.length > 0) {
        // 找到最新的文档更新时间
        const latestDoc = documents.reduce((latest, doc) => {
          return new Date(doc.updated_at) > new Date(latest.updated_at) ? doc : latest;
        });
        task.lastDocumentUpdate = latestDoc.updated_at;
      }
    }
  }

  /**
   * 获取任务路径字符串
   * @param taskId 任务ID
   * @returns 路径字符串，如 "项目 > 用户系统 > 登录功能"
   */
  getTaskPath(taskId: number): string {
    const task = this.tasks.get(taskId);
    if (!task) return '';
    
    const pathParts = [...task.ancestorTitles, task.title];
    return pathParts.join(' > ');
  }

  /**
   * 检查任务是否在展开状态的祖先路径中
   * @param taskId 任务ID
   * @returns 是否可见
   */
  isTaskVisible(taskId: number): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    
    // 根任务总是可见
    if (task.level === 0) return true;
    
    // 检查所有祖先是否都展开
    for (const ancestorId of task.ancestorIds) {
      if (!this.expandedKeys.has(ancestorId)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 获取展开状态
   */
  getExpandedKeys(): Set<number> {
    return new Set(this.expandedKeys);
  }

  /**
   * 设置展开状态
   */
  setExpandedKeys(keys: Set<number>): void {
    this.expandedKeys = new Set(keys);
    
    // 更新任务的展开状态
    this.tasks.forEach(task => {
      task.expanded = this.expandedKeys.has(task.id);
    });
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.loadedChildren.clear();
    this.loadingNodes.clear();
  }

  /**
   * 重置管理器
   */
  reset(): void {
    this.tasks.clear();
    this.expandedKeys.clear();
    this.loadedChildren.clear();
    this.loadingNodes.clear();
  }
}