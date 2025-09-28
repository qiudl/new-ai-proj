// OKR类型定义
export interface OKRObjective {
  id: number;
  title: string;
  description: string;
  quarter: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  progress: number;
  assigneeId?: number;
  enterpriseId?: number;
  startDate: string;
  endDate: string;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
  keyResults?: KeyResult[];
  // 层级结构支持
  parentId?: number;
  level?: number;
  subObjectives?: OKRObjective[];
  isExpanded?: boolean; // 前端展开状态
}

export interface KeyResult {
  id: number;
  objectiveId: number;
  title: string;
  description: string;
  type: 'percentage' | 'number' | 'boolean';
  targetValue: number;
  currentValue: number;
  unit?: string;
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'at_risk';
  createdAt: string;
  updatedAt: string;
}

export interface OKRStats {
  totalObjectives: number;
  completedObjectives: number;
  averageProgress: number;
  atRiskCount: number;
  quarter: string;
  remainingDays: number;
}

export interface CreateObjectiveRequest {
  title: string;
  description: string;
  quarter: string;
  startDate: string;
  endDate: string;
  keyResults: CreateKeyResultRequest[];
  // 层级支持
  parentId?: number;
}

export interface CreateKeyResultRequest {
  title: string;
  description: string;
  type: 'percentage' | 'number' | 'boolean';
  targetValue: number;
  unit?: string;
}

export interface UpdateObjectiveRequest {
  title?: string;
  description?: string;
  status?: 'draft' | 'active' | 'completed' | 'cancelled';
  progress?: number;
  startDate?: string;
  endDate?: string;
  keyResults?: UpdateKeyResultRequest[] | CreateKeyResultRequest[]; // 支持更新或创建关键结果
}

export interface UpdateKeyResultRequest {
  title?: string;
  description?: string;
  currentValue?: number;
  progress?: number;
  status?: 'not_started' | 'in_progress' | 'completed' | 'at_risk';
}

export interface OKRListResponse {
  objectives: OKRObjective[];
  total: number;
  quarter: string;
}

export interface OKRProgressLog {
  id: number;
  objectiveId: number;
  keyResultId: number;
  userId?: number;
  previousValue?: number;
  newValue?: number;
  previousProgress?: number;
  newProgress?: number;
  method: 'manual' | 'auto';
  note?: string;
  createdAt: string;
}

export interface OKRProgressLogListResponse {
  total: number;
  logs: OKRProgressLog[];
}

// Task-KeyResult Association Types
export interface TaskKeyResultAssociation {
  id: number;
  taskId: number;
  keyResultId: number;
  weight: number;
  syncMode: 'auto' | 'manual';
  createdAt: string;
  updatedAt: string;
}

export interface TaskKRAssociationWithKR extends TaskKeyResultAssociation {
  krTitle: string;
  krTargetValue: number;
  krCurrentValue: number;
  krProgress: number;
}

export interface TaskKRAssociationWithTask extends TaskKeyResultAssociation {
  taskTitle: string;
  taskStatus: string;
  taskProgress?: number;
}

export interface CreateTaskKRAssociationRequest {
  taskId: number;
  keyResultId: number;
  weight?: number;
  syncMode?: 'auto' | 'manual';
}

export interface UpdateTaskKRAssociationRequest {
  weight?: number;
  syncMode?: 'auto' | 'manual';
}
