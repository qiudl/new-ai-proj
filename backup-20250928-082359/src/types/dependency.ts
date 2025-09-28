// 任务依赖关系类型定义

/**
 * 依赖关系类型枚举
 * FS (Finish-to-Start): 前置任务完成后，后续任务才能开始
 * SS (Start-to-Start): 前置任务开始后，后续任务才能开始
 * FF (Finish-to-Finish): 前置任务完成后，后续任务才能完成
 * SF (Start-to-Finish): 前置任务开始后，后续任务才能完成
 */
export enum DependencyType {
  FINISH_TO_START = 'FS',  // 最常用：前置任务完成→后续任务开始
  START_TO_START = 'SS',   // 前置任务开始→后续任务开始
  FINISH_TO_FINISH = 'FF', // 前置任务完成→后续任务完成
  START_TO_FINISH = 'SF'   // 前置任务开始→后续任务完成
}

/**
 * 依赖关系强度类型
 */
export enum DependencyStrength {
  MANDATORY = 'mandatory',  // 强制依赖，必须遵守
  OPTIONAL = 'optional',    // 可选依赖，建议遵守
  PREFERRED = 'preferred'   // 首选依赖，最好遵守
}

/**
 * 任务依赖关系接口
 */
export interface TaskDependency {
  id: number;
  predecessor_id: number;      // 前置任务ID
  successor_id: number;        // 后续任务ID
  type: DependencyType;        // 依赖类型
  strength: DependencyStrength; // 依赖强度
  lag_days?: number;           // 滞后天数（可为负数，表示提前）
  description?: string;        // 依赖关系描述
  created_at: string;
  updated_at: string;
  created_by: number;
}

/**
 * 创建依赖关系请求
 */
export interface CreateDependencyRequest {
  predecessor_id: number;
  successor_id: number;
  type: DependencyType;
  strength?: DependencyStrength;
  lag_days?: number;
  description?: string;
}

/**
 * 更新依赖关系请求
 */
export interface UpdateDependencyRequest {
  type?: DependencyType;
  strength?: DependencyStrength;
  lag_days?: number;
  description?: string;
}

/**
 * 批量创建依赖关系请求
 */
export interface BatchCreateDependenciesRequest {
  dependencies: CreateDependencyRequest[];
}

/**
 * 依赖关系验证结果
 */
export interface DependencyValidation {
  isValid: boolean;
  errors: DependencyError[];
  warnings: DependencyWarning[];
}

/**
 * 依赖关系错误
 */
export interface DependencyError {
  type: 'CIRCULAR_DEPENDENCY' | 'SELF_DEPENDENCY' | 'INVALID_TYPE' | 'DUPLICATE_DEPENDENCY';
  message: string;
  affectedTasks: number[];
  dependencyPath?: number[]; // 循环依赖路径
}

/**
 * 依赖关系警告
 */
export interface DependencyWarning {
  type: 'LONG_LAG' | 'COMPLEX_CHAIN' | 'CROSS_PROJECT' | 'TIMELINE_CONFLICT';
  message: string;
  affectedTasks: number[];
  suggestion?: string;
}

/**
 * 关键路径分析结果
 */
export interface CriticalPathAnalysis {
  criticalTasks: number[];           // 关键路径上的任务ID
  totalDuration: number;             // 项目总工期（天）
  earliestStart: { [taskId: number]: Date }; // 各任务最早开始时间
  earliestFinish: { [taskId: number]: Date }; // 各任务最早完成时间
  latestStart: { [taskId: number]: Date };   // 各任务最晚开始时间
  latestFinish: { [taskId: number]: Date };  // 各任务最晚完成时间
  totalFloat: { [taskId: number]: number };  // 各任务总浮动时间
  freeFloat: { [taskId: number]: number };   // 各任务自由浮动时间
}

/**
 * 任务调度结果
 */
export interface TaskScheduleResult {
  taskId: number;
  originalStartDate: Date;
  originalEndDate: Date;
  scheduledStartDate: Date;
  scheduledEndDate: Date;
  isAdjusted: boolean;
  adjustmentReason?: string;
}

/**
 * 自动调度请求
 */
export interface AutoScheduleRequest {
  projectId: number;
  baselineDate?: Date;     // 基准日期，默认为当前日期
  respectExistingDates?: boolean; // 是否尊重现有的任务日期
  optimizeResource?: boolean;     // 是否进行资源优化
}

/**
 * 自动调度结果
 */
export interface AutoScheduleResponse {
  success: boolean;
  message: string;
  scheduleResults: TaskScheduleResult[];
  criticalPath: CriticalPathAnalysis;
  warnings: DependencyWarning[];
}

/**
 * 依赖关系图数据结构（用于可视化）
 */
export interface DependencyGraphNode {
  id: number;
  taskId: number;
  title: string;
  startDate: Date;
  endDate: Date;
  status: string;
  priority?: string;
  x: number;  // 图形位置
  y: number;
  width: number;
  height: number;
  level: number;  // 层级深度
  isCritical: boolean; // 是否在关键路径上
}

/**
 * 依赖关系图边
 */
export interface DependencyGraphEdge {
  id: number;
  dependencyId: number;
  source: number;  // 源任务ID
  target: number;  // 目标任务ID
  type: DependencyType;
  strength: DependencyStrength;
  points: { x: number; y: number }[]; // 连线路径点
  isCritical: boolean; // 是否在关键路径上
}

/**
 * 依赖关系图
 */
export interface DependencyGraph {
  nodes: DependencyGraphNode[];
  edges: DependencyGraphEdge[];
  criticalPath: number[];
  projectDuration: number;
}

/**
 * 拖拽创建依赖关系的状态
 */
export interface DragDependencyState {
  isDragging: boolean;
  sourceTaskId?: number;
  sourcePoint?: { x: number; y: number };
  currentPoint?: { x: number; y: number };
  targetTaskId?: number;
  isValidTarget: boolean;
}

/**
 * 依赖关系统计信息
 */
export interface DependencyStatistics {
  totalDependencies: number;
  typeDistribution: { [key in DependencyType]: number };
  strengthDistribution: { [key in DependencyStrength]: number };
  avgLagDays: number;
  complexTasksCount: number; // 依赖关系复杂的任务数量
  orphanTasksCount: number;  // 没有依赖关系的任务数量
}

/**
 * 依赖关系配置选项
 */
export interface DependencyConfig {
  showDependencyLines: boolean;
  showCriticalPath: boolean;
  highlightCriticalTasks: boolean;
  showFloatTimes: boolean;
  allowCrossDependencies: boolean; // 是否允许跨项目依赖
  autoScheduleOnChange: boolean;   // 依赖变更时是否自动重新调度
  defaultDependencyType: DependencyType;
  defaultDependencyStrength: DependencyStrength;
  maxLagDays: number;
}

/**
 * 依赖关系操作历史
 */
export interface DependencyHistoryEntry {
  id: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'BATCH_CREATE' | 'AUTO_SCHEDULE';
  dependencyId?: number;
  oldValue?: Partial<TaskDependency>;
  newValue?: Partial<TaskDependency>;
  performedBy: number;
  performedAt: string;
  description: string;
}

/**
 * 依赖关系搜索过滤器
 */
export interface DependencyFilter {
  projectId?: number;
  taskIds?: number[];
  types?: DependencyType[];
  strengths?: DependencyStrength[];
  onlyCriticalPath?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * 依赖关系导出选项
 */
export interface DependencyExportOptions {
  format: 'JSON' | 'CSV' | 'MPP' | 'PDF';
  includeTaskDetails: boolean;
  includeCriticalPath: boolean;
  includeStatistics: boolean;
  dateFormat?: string;
}