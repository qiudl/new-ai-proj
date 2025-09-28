// 批量操作相关类型定义

export type BatchOperationType = 
  | 'status_update'
  | 'parent_change'
  | 'assignee_change'
  | 'priority_change'
  | 'due_date_change'
  | 'archive'
  | 'restore'
  | 'delete'
  | 'move'
  | 'duplicate'
  | 'tags_add'
  | 'tags_remove'
  | 'custom_fields_update';

export type BatchOperationStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'partial';

// 批量操作选项
export interface BatchOperationOptions {
  dry_run?: boolean;                    // 是否仅预览不执行
  continue_on_error?: boolean;          // 遇到错误是否继续
  validate_only?: boolean;              // 仅验证不执行
  send_notifications?: boolean;         // 是否发送通知
  create_backup?: boolean;              // 是否创建备份
  max_concurrency?: number;             // 最大并发数 (1-10)
  timeout_seconds?: number;             // 操作超时时间 (1-3600)
  prevent_duplicates?: boolean;         // 防止重复操作
  require_confirmation?: boolean;       // 需要确认
  priority?: 'low' | 'normal' | 'high' | 'urgent'; // 操作优先级
}

// 批量操作请求
export interface BatchOperationRequest {
  operation_type: BatchOperationType;
  task_ids: number[];
  parameters?: Record<string, any>;
  options?: BatchOperationOptions;
  metadata?: Record<string, any>;
  requested_by: number;
  request_id?: string;
}

// 批量操作进度
export interface BatchOperationProgress {
  percentage: number;
  current_task: number;
  current_task_id: number;
  estimated_remaining_ms: number;
  phase: string; // validation, execution, cleanup
  last_update: string;
}

// 批量操作错误
export interface BatchOperationError {
  task_id: number;
  task_title?: string;
  error_code: string;
  error_message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  timestamp: string;
}

// 批量操作警告
export interface BatchOperationWarning {
  task_id: number;
  task_title?: string;
  warning: string;
  impact: string;
  timestamp: string;
}

// 批量操作响应
export interface BatchOperationResponse {
  operation_id: string;
  operation_type: BatchOperationType;
  status: BatchOperationStatus;
  total_tasks: number;
  processed_tasks: number;
  successful_tasks: number;
  failed_tasks: number;
  skipped_tasks: number;
  start_time: string;
  end_time?: string;
  duration_ms: number;
  errors?: BatchOperationError[];
  warnings?: BatchOperationWarning[];
  results?: any;
  progress: BatchOperationProgress;
  message: string;
  requested_by: number;
  executed_by?: number;
}

// 批量验证错误
export interface BatchValidationError {
  task_id: number;
  task_title?: string;
  field?: string;
  error_code: string;
  error_message: string;
  suggestions?: string[];
  timestamp: string;
}

// 批量验证警告
export interface BatchValidationWarning {
  task_id: number;
  task_title?: string;
  warning_code: string;
  warning: string;
  impact: string;
  severity: 'info' | 'low' | 'medium' | 'high';
  timestamp: string;
}

// 批量验证结果
export interface BatchValidationResult {
  valid: boolean;
  total_tasks: number;
  valid_tasks: number;
  invalid_tasks: number;
  warnings_count: number;
  validation_errors?: BatchValidationError[];
  validation_warnings?: BatchValidationWarning[];
  estimated_duration_ms: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  can_proceed: boolean;
  requirements?: string[];
}

// 任务预览
export interface TaskPreview {
  id: number;
  title: string;
  status: string;
  project_id: number;
  parent_id?: number;
  changes: Record<string, any>;
  warnings?: string[];
  can_process: boolean;
}

// 变更预览
export interface ChangePreview {
  field: string;
  old_value: any;
  new_value: any;
  impact: string;
}

// 批量操作预览
export interface BatchOperationPreview {
  operation_type: BatchOperationType;
  total_tasks: number;
  affected_tasks: TaskPreview[];
  changes: ChangePreview[];
  warnings?: string[];
  estimated_time_ms: number;
  risk_level: string;
  prerequisites?: string[];
  can_proceed: boolean;
}

// 具体的批量操作请求类型

// 批量状态更新请求
export interface BatchStatusUpdateRequest {
  task_ids: number[];
  new_status: string;
  force?: boolean;
}

// 批量父任务更改请求
export interface BatchParentChangeRequest {
  task_ids: number[];
  new_parent_id?: number; // null表示设置为根任务
  maintain_order?: boolean;
}

// 批量负责人更改请求
export interface BatchAssigneeChangeRequest {
  task_ids: number[];
  new_assignee_id?: number; // null表示取消分配
  notify_users?: boolean;
}

// 批量优先级更改请求
export interface BatchPriorityChangeRequest {
  task_ids: number[];
  new_priority: 'low' | 'medium' | 'high' | 'urgent';
}

// 批量截止日期更改请求
export interface BatchDueDateChangeRequest {
  task_ids: number[];
  new_due_date?: string; // null表示清除截止日期
  offset_days?: number; // 相对现有截止日期的天数偏移
}

// 批量归档请求
export interface BatchArchiveRequest {
  task_ids: number[];
  archive_children?: boolean;
  reason?: string;
}

// 批量删除请求
export interface BatchDeleteRequest {
  task_ids: number[];
  delete_children?: boolean;
  hard_delete?: boolean;
  backup_first?: boolean;
  reason?: string;
}

// 批量移动请求
export interface BatchMoveRequest {
  task_ids: number[];
  target_project_id?: number;
  target_parent_id?: number;
  move_children?: boolean;
  update_references?: boolean;
}

// 批量标签更新请求
export interface BatchTagsUpdateRequest {
  task_ids: number[];
  operation: 'add' | 'remove' | 'replace';
  tags: string[];
}

// 批量自定义字段更新请求
export interface BatchCustomFieldsUpdateRequest {
  task_ids: number[];
  operation: 'set' | 'merge' | 'remove';
  custom_fields: Record<string, any>;
}

// UI组件相关类型

// 批量操作表单数据
export interface BatchOperationFormData {
  selectedTasks: number[];
  operation: BatchOperationType;
  parameters: Record<string, any>;
  options: BatchOperationOptions;
}

// 批量操作对话框状态
export interface BatchOperationDialogState {
  visible: boolean;
  loading: boolean;
  step: number; // 0: 选择操作, 1: 配置参数, 2: 预览, 3: 执行, 4: 结果
  operation?: BatchOperationType;
  selectedTasks: number[];
  formData?: any;
  validationResult?: BatchValidationResult;
  preview?: BatchOperationPreview;
  operationResult?: BatchOperationResponse;
  error?: string;
}

// 批量操作UI配置
export interface BatchOperationUIConfig {
  title: string;
  description: string;
  icon: string;
  color: string;
  dangerLevel: 'safe' | 'caution' | 'danger';
  confirmationRequired: boolean;
  parametersForm?: {
    fields: BatchOperationFormField[];
  };
}

// 批量操作表单字段
export interface BatchOperationFormField {
  name: string;
  label: string;
  type: 'input' | 'select' | 'checkbox' | 'date' | 'number' | 'textarea';
  required: boolean;
  options?: { label: string; value: any }[];
  placeholder?: string;
  help?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

// 批量操作历史记录
export interface BatchOperationHistoryItem {
  id: number;
  operation_id: string;
  operation_type: BatchOperationType;
  status: BatchOperationStatus;
  requested_by: number;
  executed_by?: number;
  total_tasks: number;
  success_tasks: number;
  failed_tasks: number;
  parameters: Record<string, any>;
  results?: Record<string, any>;
  start_time: string;
  end_time?: string;
  duration_ms?: number;
  error_log?: string;
  created_at: string;
  updated_at: string;
}