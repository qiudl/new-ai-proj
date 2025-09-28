import { TaskStatus } from '../types/task';
import { ColumnsType } from 'antd/es/table';

/**
 * 批量子任务创建表格的列配置
 */
export interface BulkSubTaskColumn {
  key: string;
  title: string;
  dataIndex: string;
  width: number;
  required: boolean;
  editable: boolean;
  type: 'text' | 'textarea' | 'select' | 'number' | 'date' | 'preview';
  placeholder?: string;
  tooltip?: string;
  options?: Array<{ label: string; value: any; color?: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    message?: string;
  };
}

/**
 * 任务状态选项配置 - 支持11种状态的完整工作流
 */
export const TASK_STATUS_OPTIONS = [
  // 工作流状态
  { label: '草稿', value: 'draft' as TaskStatus, color: 'default' },
  { label: '规划中', value: 'planning' as TaskStatus, color: 'cyan' },
  { label: '待办', value: 'todo' as TaskStatus, color: 'blue' },
  { label: '进行中', value: 'in_progress' as TaskStatus, color: 'processing' },
  { label: '测试中', value: 'testing' as TaskStatus, color: 'purple' },
  { label: '已完成', value: 'completed' as TaskStatus, color: 'success' },
  
  // 终止状态
  { label: '已取消', value: 'cancelled' as TaskStatus, color: 'error' },
  { label: '已归档', value: 'archived' as TaskStatus, color: 'default' },
  
  // 暂停状态  
  { label: '挂起', value: 'on_hold' as TaskStatus, color: 'warning' },
  { label: '暂停', value: 'suspended' as TaskStatus, color: 'orange' },
  { label: '阻塞', value: 'blocked' as TaskStatus, color: 'volcano' },
];

/**
 * 优先级选项配置
 */
export const PRIORITY_OPTIONS = [
  { label: '低', value: 'low', color: 'green' },
  { label: '中', value: 'medium', color: 'blue' },
  { label: '高', value: 'high', color: 'orange' },
  { label: '紧急', value: 'urgent', color: 'red' },
];

/**
 * 批量子任务创建表格列配置
 */
export const BULK_SUBTASK_COLUMNS: BulkSubTaskColumn[] = [
  {
    key: 'sequence',
    title: '序号',
    dataIndex: 'sequence',
    width: 60,
    required: false,
    editable: false,
    type: 'text',
    tooltip: '自动生成的任务序号',
  },
  {
    key: 'title',
    title: '任务标题',
    dataIndex: 'title',
    width: 200,
    required: true,
    editable: true,
    type: 'text',
    placeholder: '输入任务标题',
    tooltip: '任务的简短描述，将用于生成完整任务名称',
    validation: {
      min: 1,
      max: 100,
      message: '任务标题长度应在1-100字符之间',
    },
  },
  {
    key: 'namePreview',
    title: '生成名称预览',
    dataIndex: 'namePreview',
    width: 300,
    required: false,
    editable: false,
    type: 'preview',
    tooltip: '根据命名规则自动生成的完整任务名称',
  },
  {
    key: 'description',
    title: '任务描述',
    dataIndex: 'description',
    width: 200,
    required: false,
    editable: true,
    type: 'textarea',
    placeholder: '详细描述任务内容（可选）',
    tooltip: '任务的详细说明，可以包含具体要求和注意事项',
    validation: {
      max: 500,
      message: '描述长度不能超过500字符',
    },
  },
  {
    key: 'status',
    title: '状态',
    dataIndex: 'status',
    width: 100,
    required: true,
    editable: true,
    type: 'select',
    options: TASK_STATUS_OPTIONS,
    tooltip: '任务的当前状态',
  },
  {
    key: 'priority',
    title: '优先级',
    dataIndex: 'priority',
    width: 90,
    required: false,
    editable: true,
    type: 'select',
    options: PRIORITY_OPTIONS,
    tooltip: '任务的重要程度',
  },
  {
    key: 'estimated_hours',
    title: '预计工时',
    dataIndex: 'estimated_hours',
    width: 100,
    required: false,
    editable: true,
    type: 'number',
    placeholder: '小时',
    tooltip: '完成此任务预计需要的工作时间',
    validation: {
      min: 0,
      max: 999,
      message: '工时应在0-999小时之间',
    },
  },
  {
    key: 'due_date',
    title: '截止日期',
    dataIndex: 'due_date',
    width: 130,
    required: false,
    editable: true,
    type: 'date',
    placeholder: '选择日期',
    tooltip: '任务的最后期限',
  },
  {
    key: 'assignee',
    title: '负责人',
    dataIndex: 'assignee',
    width: 100,
    required: false,
    editable: true,
    type: 'text',
    placeholder: '负责人',
    tooltip: '任务的负责人或执行者',
    validation: {
      max: 50,
      message: '负责人名称不能超过50字符',
    },
  },
];

/**
 * 默认的子任务数据模板
 */
export const DEFAULT_SUBTASK_TEMPLATE = {
  title: '',
  description: '',
  status: 'todo' as TaskStatus,
  priority: 'medium',
  estimated_hours: 1,
  assignee: '',
  due_date: undefined,
};

/**
 * 表格交互配置
 */
export const TABLE_INTERACTION_CONFIG = {
  // 最小行数
  minRows: 1,
  // 最大行数
  maxRows: 50,
  // 初始行数
  initialRows: 3,
  // 是否允许拖拽排序
  allowDragSort: true,
  // 是否显示序号
  showSequence: true,
  // 是否显示操作列
  showActions: true,
  // 表格滚动配置
  scroll: {
    x: 1400,
    y: 400,
  },
};

/**
 * 验证规则配置
 */
export const VALIDATION_RULES = {
  // 必填字段验证
  required: {
    title: '任务标题不能为空',
    status: '请选择任务状态',
  },
  // 长度验证
  length: {
    title: { min: 1, max: 100, message: '任务标题长度应在1-100字符之间' },
    description: { max: 500, message: '描述长度不能超过500字符' },
    assignee: { max: 50, message: '负责人名称不能超过50字符' },
  },
  // 数值验证
  number: {
    estimated_hours: { min: 0, max: 999, message: '工时应在0-999小时之间' },
  },
  // 自定义验证
  custom: {
    title: (value: string) => {
      if (!value || !value.trim()) {
        return '任务标题不能为空';
      }
      if (value.trim().length > 100) {
        return '任务标题长度不能超过100字符';
      }
      return null;
    },
    estimated_hours: (value: number) => {
      if (value < 0) {
        return '工时不能为负数';
      }
      if (value > 999) {
        return '工时不能超过999小时';
      }
      return null;
    },
  },
};

/**
 * 用户体验配置
 */
export const UX_CONFIG = {
  // 自动保存延迟（毫秒）
  autoSaveDelay: 500,
  // 名称预览更新延迟（毫秒）
  previewUpdateDelay: 300,
  // 表格行高
  tableRowHeight: 54,
  // 是否显示加载状态
  showLoadingStates: true,
  // 是否显示保存指示器
  showSaveIndicator: true,
  // 快捷键配置
  shortcuts: {
    addRow: 'Ctrl+Enter',
    deleteRow: 'Delete',
    save: 'Ctrl+S',
  },
};