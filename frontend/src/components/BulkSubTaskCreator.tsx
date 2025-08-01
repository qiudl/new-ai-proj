import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  Table,
  Input,
  Select,
  Button,
  Space,
  message,
  Row,
  Col,
  Typography,
  Tooltip,
  Tag,
  DatePicker,
  Divider,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  SaveOutlined,
  CloseOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { Task, TaskRequest, SubTaskRow } from '../types/task';
import { TaskService } from '../services/taskService';
import {
  getCurrentWeekNumber,
  generateSubTaskName,
  getTaskNamePreview,
} from '../utils/taskNameGenerator';
import {
  BULK_SUBTASK_COLUMNS,
  DEFAULT_SUBTASK_TEMPLATE,
  TABLE_INTERACTION_CONFIG,
  VALIDATION_RULES,
} from '../utils/bulkSubTaskConfig';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

interface BulkSubTaskCreatorProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  parentTask: Task;
  projectId: number;
}

const BulkSubTaskCreator: React.FC<BulkSubTaskCreatorProps> = ({
  visible,
  onCancel,
  onSuccess,
  parentTask,
  projectId,
}) => {
  // 状态管理
  const [subTasks, setSubTasks] = useState<SubTaskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState<number>(0);

  // 计算当前周数
  useEffect(() => {
    setCurrentWeek(getCurrentWeekNumber());
  }, []);

  // 初始化数据
  useEffect(() => {
    if (visible) {
      const initialRows: SubTaskRow[] = Array.from(
        { length: TABLE_INTERACTION_CONFIG.initialRows },
        (_, index) => ({
          key: `subtask-${Date.now()}-${index}`,
          ...DEFAULT_SUBTASK_TEMPLATE,
        })
      );
      setSubTasks(initialRows);
    }
  }, [visible]);

  // 添加新行
  const addRow = useCallback(() => {
    if (subTasks.length >= TABLE_INTERACTION_CONFIG.maxRows) {
      message.warning(`最多只能添加 ${TABLE_INTERACTION_CONFIG.maxRows} 行`);
      return;
    }

    const newRow: SubTaskRow = {
      key: `subtask-${Date.now()}`,
      ...DEFAULT_SUBTASK_TEMPLATE,
    };
    setSubTasks(prev => [...prev, newRow]);
    message.success('已添加新任务行');
  }, [subTasks.length]);

  // 删除行
  const deleteRow = useCallback((key: string) => {
    if (subTasks.length <= TABLE_INTERACTION_CONFIG.minRows) {
      message.warning(`至少需要保留 ${TABLE_INTERACTION_CONFIG.minRows} 行`);
      return;
    }

    setSubTasks(prev => prev.filter(row => row.key !== key));
    message.success('已删除任务行');
  }, [subTasks.length]);

  // 更新行数据
  const updateRow = useCallback((key: string, field: keyof SubTaskRow, value: any) => {
    setSubTasks(prev => prev.map(row => 
      row.key === key ? { ...row, [field]: value } : row
    ));
  }, []);

  // 批量操作：清空所有行
  const clearAllRows = useCallback(() => {
    const emptyRows: SubTaskRow[] = Array.from(
      { length: TABLE_INTERACTION_CONFIG.initialRows },
      (_, index) => ({
        key: `subtask-${Date.now()}-${index}`,
        ...DEFAULT_SUBTASK_TEMPLATE,
      })
    );
    setSubTasks(emptyRows);
    message.success('已清空所有数据');
  }, []);

  // 批量操作：复制行
  const duplicateRow = useCallback((sourceKey: string) => {
    if (subTasks.length >= TABLE_INTERACTION_CONFIG.maxRows) {
      message.warning(`最多只能添加 ${TABLE_INTERACTION_CONFIG.maxRows} 行`);
      return;
    }

    const sourceRow = subTasks.find(row => row.key === sourceKey);
    if (!sourceRow) return;

    const newRow: SubTaskRow = {
      ...sourceRow,
      key: `subtask-${Date.now()}`,
      title: sourceRow.title ? `${sourceRow.title} (副本)` : '',
    };

    const sourceIndex = subTasks.findIndex(row => row.key === sourceKey);
    const newSubTasks = [...subTasks];
    newSubTasks.splice(sourceIndex + 1, 0, newRow);
    setSubTasks(newSubTasks);
    message.success('已复制任务行');
  }, [subTasks]);

  // 验证单行数据
  const validateRow = useCallback((row: SubTaskRow): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // 必填项验证
    if (!row.title || !row.title.trim()) {
      errors.push('任务标题不能为空');
    }

    // 长度验证
    if (row.title && row.title.length > 100) {
      errors.push('任务标题长度不能超过100字符');
    }

    if (row.description && row.description.length > 500) {
      errors.push('任务描述长度不能超过500字符');
    }

    if (row.assignee && row.assignee.length > 50) {
      errors.push('负责人名称不能超过50字符');
    }

    // 数值验证
    if (row.estimated_hours && (row.estimated_hours < 0 || row.estimated_hours > 999)) {
      errors.push('预计工时应在0-999小时之间');
    }

    // 日期验证
    if (row.due_date) {
      const dueDate = dayjs(row.due_date);
      const today = dayjs();
      if (dueDate.isBefore(today, 'day')) {
        errors.push('截止日期不能早于今天');
      }
    }

    return { isValid: errors.length === 0, errors };
  }, []);

  // 验证所有数据
  const validateAllRows = useCallback((): { isValid: boolean; validRows: SubTaskRow[]; errors: Record<string, string[]> } => {
    const validRows: SubTaskRow[] = [];
    const errors: Record<string, string[]> = {};
    let hasValidData = false;

    subTasks.forEach(row => {
      const validation = validateRow(row);
      
      // 只有有内容的行才进行验证
      if (row.title?.trim()) {
        hasValidData = true;
        if (validation.isValid) {
          validRows.push(row);
        } else {
          errors[row.key] = validation.errors;
        }
      }
    });

    // 如果没有任何有效数据
    if (!hasValidData) {
      errors['general'] = ['请至少填写一个任务标题'];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      validRows,
      errors
    };
  }, [subTasks, validateRow]);

  // 显示验证错误
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  // 实时验证（可选，防抖）
  const debouncedValidation = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const { errors } = validateAllRows();
        setValidationErrors(errors);
      }, 500);
    };
  }, [validateAllRows]);

  // 当数据变化时触发验证
  useEffect(() => {
    if (subTasks.length > 0) {
      debouncedValidation();
    }
  }, [subTasks, debouncedValidation]);

  // 批量创建子任务
  const handleBulkCreate = useCallback(async () => {
    try {
      setLoading(true);

      // 验证所有数据
      const validation = validateAllRows();
      if (!validation.isValid) {
        message.error('请修正表单中的错误后再提交');
        setValidationErrors(validation.errors);
        return;
      }

      const { validRows } = validation;
      if (validRows.length === 0) {
        message.warning('没有有效的任务数据');
        return;
      }

      // 转换为TaskRequest格式并并行创建
      const createPromises = validRows.map(async (row, index) => {
        const taskName = generateSubTaskName(parentTask.id, index, row.title.trim(), currentWeek);
        
        const taskRequest: TaskRequest = {
          title: taskName,
          description: row.description || '',
          status: row.status,
          parent_id: parentTask.id,
          due_date: row.due_date,
          custom_fields: {
            priority: row.priority,
            estimated_hours: row.estimated_hours,
            assignee: row.assignee,
            sequence: index + 1,
            batch_created: true,
            batch_created_at: dayjs().toISOString(),
            original_title: row.title.trim(), // 保存原始标题
          }
        };

        return TaskService.createTask(projectId, taskRequest);
      });

      // 并行执行所有创建请求
      const results = await Promise.allSettled(createPromises);
      
      // 统计结果
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failureCount = results.filter(result => result.status === 'rejected').length;
      
      if (successCount > 0) {
        message.success(`成功创建 ${successCount} 个子任务${failureCount > 0 ? `，${failureCount} 个失败` : ''}`);
        onSuccess();
        onCancel();
      } else {
        message.error('所有任务创建失败，请检查网络连接并重试');
      }

      // 记录失败的详情
      if (failureCount > 0) {
        const failedResults = results.filter(result => result.status === 'rejected') as PromiseRejectedResult[];
        console.error('批量创建子任务失败详情:', failedResults.map(result => result.reason));
      }

    } catch (error: any) {
      console.error('批量创建子任务失败:', error);
      message.error(error.message || '创建失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [
    validateAllRows, 
    validationErrors, 
    parentTask.id, 
    currentWeek, 
    projectId, 
    onSuccess, 
    onCancel
  ]);

  return (
    <Modal
      title={
        <Space>
          <PlusOutlined />
          批量创建子任务
          <Tag color="blue">父任务: {parentTask.title}</Tag>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={1200}
      footer={null}
      destroyOnClose
      maskClosable={false}
    >
      {/* 命名规则说明 */}
      <div style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col>
            <Text strong>命名规则：</Text>
          </Col>
          <Col>
            <Tag color="green">{currentWeek}周</Tag>
            <Text type="secondary">-</Text>
            <Tag color="blue">#{parentTask.id}</Tag>
            <Text type="secondary">-</Text>
            <Tag color="orange">序号</Tag>
            <Text type="secondary">：</Text>
            <Text>任务标题</Text>
          </Col>
          <Col>
            <Tooltip title="任务名称将自动按照此规则生成，序号从01开始递增">
              <QuestionCircleOutlined style={{ color: '#8c8c8c' }} />
            </Tooltip>
          </Col>
        </Row>
        <Text type="secondary" style={{ fontSize: 12 }}>
          例如：{currentWeek}周-#{parentTask.id}-01：实现用户登录功能
        </Text>
      </div>

      <Divider />

      {/* 操作按钮区 */}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button 
            type="dashed" 
            icon={<PlusOutlined />}
            onClick={addRow}
            disabled={subTasks.length >= TABLE_INTERACTION_CONFIG.maxRows}
          >
            添加任务行
          </Button>
          <Button 
            onClick={clearAllRows}
            disabled={loading}
          >
            清空所有
          </Button>
          <Text type="secondary">
            当前 {subTasks.length} 行，最多支持 {TABLE_INTERACTION_CONFIG.maxRows} 行
          </Text>
        </Space>
      </div>

      {/* 表格区域 */}
      <div style={{ marginBottom: 16 }}>
        <Spin spinning={loading}>
          <Table
            dataSource={subTasks}
            pagination={false}
            size="small"
            scroll={TABLE_INTERACTION_CONFIG.scroll}
            bordered
            locale={{
              emptyText: '请添加任务行开始创建',
            }}
          >
            {/* 基础列配置 - 暂时使用简单列 */}
            <Table.Column
              title="序号"
              key="sequence"
              width={60}
              render={(_, __, index) => (
                <Text strong>{String(index + 1).padStart(2, '0')}</Text>
              )}
            />
            <Table.Column
              title="任务标题"
              dataIndex="title"
              key="title"
              width={200}
              render={(text: string, record: SubTaskRow, index: number) => (
                <div>
                  <Input
                    placeholder="输入任务标题"
                    value={text}
                    onChange={(e) => updateRow(record.key, 'title', e.target.value)}
                    style={{ 
                      marginBottom: 4,
                      borderColor: validationErrors[record.key] ? '#ff4d4f' : undefined
                    }}
                  />
                  {validationErrors[record.key] && (
                    <div style={{ 
                      fontSize: 12, 
                      color: '#ff4d4f',
                      marginBottom: 4,
                    }}>
                      {validationErrors[record.key].join('; ')}
                    </div>
                  )}
                  {text && (
                    <div style={{ 
                      fontSize: 12, 
                      marginTop: 4,
                      padding: '2px 6px',
                      backgroundColor: '#f0f9ff',
                      border: '1px solid #bae7ff',
                      borderRadius: 4,
                    }}>
                      <Text type="secondary">预览：</Text>
                      <Text style={{ color: '#1890ff', fontWeight: 500 }}>
                        {getTaskNamePreview(parentTask.id, text, currentWeek, index)}
                      </Text>
                    </div>
                  )}
                </div>
              )}
            />
            <Table.Column
              title="描述"
              dataIndex="description"
              key="description"
              width={200}
              render={(text: string, record: SubTaskRow) => (
                <TextArea
                  placeholder="任务描述（可选）"
                  value={text}
                  onChange={(e) => updateRow(record.key, 'description', e.target.value)}
                  rows={2}
                />
              )}
            />
            <Table.Column
              title="状态"
              dataIndex="status"
              key="status"
              width={120}
              render={(status: string, record: SubTaskRow) => (
                <Select
                  value={status}
                  onChange={(value) => updateRow(record.key, 'status', value)}
                  style={{ width: '100%' }}
                >
                  <Option value="todo">待办</Option>
                  <Option value="in_progress">进行中</Option>
                  <Option value="completed">已完成</Option>
                  <Option value="cancelled">已取消</Option>
                </Select>
              )}
            />
            <Table.Column
              title="优先级"
              dataIndex="priority"
              key="priority"
              width={90}
              render={(priority: string, record: SubTaskRow) => (
                <Select
                  value={priority}
                  onChange={(value) => updateRow(record.key, 'priority', value)}
                  style={{ width: '100%' }}
                  size="small"
                >
                  <Option value="low">低</Option>
                  <Option value="medium">中</Option>
                  <Option value="high">高</Option>
                  <Option value="urgent">紧急</Option>
                </Select>
              )}
            />
            <Table.Column
              title="预计工时"
              dataIndex="estimated_hours"
              key="estimated_hours"
              width={100}
              render={(hours: number, record: SubTaskRow) => (
                <Input
                  type="number"
                  min={0}
                  max={999}
                  step={0.5}
                  value={hours}
                  onChange={(e) => updateRow(record.key, 'estimated_hours', parseFloat(e.target.value) || 0)}
                  suffix="h"
                  size="small"
                />
              )}
            />
            <Table.Column
              title="截止日期"
              dataIndex="due_date"
              key="due_date"
              width={140}
              render={(date: string, record: SubTaskRow) => (
                <DatePicker
                  value={date ? dayjs(date) : null}
                  onChange={(dateValue) => 
                    updateRow(record.key, 'due_date', dateValue ? dateValue.format('YYYY-MM-DD') : undefined)
                  }
                  style={{ width: '100%' }}
                  placeholder="选择日期"
                  size="small"
                />
              )}
            />
            <Table.Column
              title="负责人"
              dataIndex="assignee"
              key="assignee"
              width={100}
              render={(assignee: string, record: SubTaskRow) => (
                <Input
                  placeholder="负责人"
                  value={assignee}
                  onChange={(e) => updateRow(record.key, 'assignee', e.target.value)}
                  size="small"
                />
              )}
            />
            <Table.Column
              title="操作"
              key="action"
              width={100}
              render={(_, record: SubTaskRow) => (
                <Space size="small">
                  <Tooltip title="复制行">
                    <Button
                      type="text"
                      size="small"
                      onClick={() => duplicateRow(record.key)}
                      disabled={subTasks.length >= TABLE_INTERACTION_CONFIG.maxRows}
                    >
                      📋
                    </Button>
                  </Tooltip>
                  <Tooltip title="删除行">
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => deleteRow(record.key)}
                      disabled={subTasks.length <= TABLE_INTERACTION_CONFIG.minRows}
                    />
                  </Tooltip>
                </Space>
              )}
            />
          </Table>
        </Spin>
      </div>

      {/* 底部操作区 */}
      <div style={{ textAlign: 'right' }}>
        <Space>
          <Button 
            onClick={onCancel}
            icon={<CloseOutlined />}
          >
            取消
          </Button>
          <Button
            type="primary"
            loading={loading}
            onClick={handleBulkCreate}
            icon={<SaveOutlined />}
            disabled={!subTasks.some(row => row.title?.trim()) || Object.keys(validationErrors).length > 0}
          >
            批量创建 ({subTasks.filter(row => row.title?.trim()).length} 个任务)
          </Button>
        </Space>
      </div>
    </Modal>
  );
};

export default BulkSubTaskCreator;