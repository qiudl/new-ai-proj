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
  Alert,
  Progress,
  notification,
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
import '../styles/bulk-subtask-creator.css';

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
  
  // 错误处理和反馈状态
  const [createProgress, setCreateProgress] = useState<{
    current: number;
    total: number;
    status: 'active' | 'success' | 'exception' | 'normal';
  }>({ current: 0, total: 0, status: 'normal' });
  const [createErrors, setCreateErrors] = useState<Array<{
    index: number;
    title: string;
    error: string;
  }>>([]);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

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
          // Ensure priority matches the union type
          priority: DEFAULT_SUBTASK_TEMPLATE.priority as 'low' | 'medium' | 'high' | 'urgent' | undefined,
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
      priority: DEFAULT_SUBTASK_TEMPLATE.priority as 'low' | 'medium' | 'high' | 'urgent' | undefined,
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
        priority: DEFAULT_SUBTASK_TEMPLATE.priority as 'low' | 'medium' | 'high' | 'urgent' | undefined,
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

  // 批量创建子任务 - 增强版错误处理
  const handleBulkCreate = useCallback(async () => {
    try {
      setLoading(true);
      setCreateErrors([]);
      setShowErrorDetails(false);

      // 验证所有数据
      const validation = validateAllRows();
      if (!validation.isValid) {
        // 显示详细的验证错误
        const errorCount = Object.keys(validation.errors).length;
        notification.error({
          message: '数据验证失败',
          description: `发现 ${errorCount} 个错误，请修正后重试`,
          duration: 5,
        });
        setValidationErrors(validation.errors);
        return;
      }

      const { validRows } = validation;
      if (validRows.length === 0) {
        notification.warning({
          message: '没有有效数据',
          description: '请至少填写一个任务标题',
          duration: 3,
        });
        return;
      }

      // 初始化进度
      setCreateProgress({
        current: 0,
        total: validRows.length,
        status: 'active'
      });

      // 转换为TaskRequest格式
      const taskRequests = validRows.map((row, index) => {
        const taskName = generateSubTaskName(parentTask.id, index, row.title.trim(), parentTask.title, currentWeek);
        
        return {
          taskRequest: {
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
              original_title: row.title.trim(),
            }
          },
          originalRow: row,
          index
        };
      });

      // 使用串行创建以提供实时进度反馈
      const results: Array<{ success: boolean; index: number; title: string; error?: string }> = [];
      
      for (let i = 0; i < taskRequests.length; i++) {
        const { taskRequest, originalRow, index } = taskRequests[i];
        
        try {
          await TaskService.createTask(projectId, taskRequest);
          results.push({ 
            success: true, 
            index, 
            title: originalRow.title 
          });
          
          // 更新进度
          setCreateProgress(prev => ({
            ...prev,
            current: i + 1
          }));
          
        } catch (error: any) {
          const errorMessage = error?.response?.data?.error?.message || error?.message || '未知错误';
          results.push({ 
            success: false, 
            index, 
            title: originalRow.title,
            error: errorMessage
          });
          
          setCreateErrors(prev => [...prev, {
            index,
            title: originalRow.title,
            error: errorMessage
          }]);
        }
      }

      // 统计结果
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      // 更新最终进度状态
      setCreateProgress(prev => ({
        ...prev,
        status: failureCount === 0 ? 'success' : 'exception'
      }));

      // 显示结果通知
      if (successCount > 0 && failureCount === 0) {
        notification.success({
          message: '批量创建成功',
          description: `成功创建 ${successCount} 个子任务`,
          duration: 3,
        });
        
        // 延迟关闭以显示成功状态
        setTimeout(() => {
          onSuccess();
          onCancel();
        }, 1500);
        
      } else if (successCount > 0 && failureCount > 0) {
        notification.warning({
          message: '部分创建成功',
          description: `成功创建 ${successCount} 个，失败 ${failureCount} 个`,
          duration: 5,
        });
        setShowErrorDetails(true);
        
      } else {
        notification.error({
          message: '批量创建失败',
          description: '所有任务创建失败，请检查网络连接并重试',
          duration: 5,
        });
        setShowErrorDetails(true);
      }

    } catch (error: any) {
      console.error('批量创建子任务失败:', error);
      
      setCreateProgress(prev => ({
        ...prev,
        status: 'exception'
      }));
      
      notification.error({
        message: '系统错误',
        description: error?.message || '创建过程中发生未知错误，请重试',
        duration: 5,
      });
      
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
      className="bulk-subtask-creator"
    >
      {/* 命名规则说明 */}
      <div className="naming-rule-section">
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

      {/* 进度显示区 */}
      {loading && createProgress.total > 0 && (
        <div className="create-progress">
          <Progress
            percent={Math.round((createProgress.current / createProgress.total) * 100)}
            status={createProgress.status}
            format={() => `${createProgress.current}/${createProgress.total}`}
          />
          <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
            正在创建第 {createProgress.current + 1} 个任务...
          </Text>
        </div>
      )}

      {/* 错误详情显示 */}
      {showErrorDetails && createErrors.length > 0 && (
        <div className="error-details">
          <Alert
            message="创建失败详情"
            description={
              <div>
                {createErrors.map((error, index) => (
                  <div key={index} className="error-item">
                    <Text strong>任务 {error.index + 1}: {error.title}</Text>
                    <br />
                    <Text type="danger" style={{ fontSize: 12 }}>
                      错误：{error.error}
                    </Text>
                  </div>
                ))}
              </div>
            }
            type="error"
            showIcon
            closable
            onClose={() => setShowErrorDetails(false)}
          />
        </div>
      )}

      {/* 通用错误提示 */}
      {validationErrors.general && (
        <div style={{ marginBottom: 16 }}>
          <Alert
            message="数据验证错误"
            description={validationErrors.general.join('; ')}
            type="warning"
            showIcon
          />
        </div>
      )}

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
            
            scroll={TABLE_INTERACTION_CONFIG.scroll}
            bordered
            className="bulk-subtask-table"
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
                <div className="sequence-number">
                  {String(index + 1).padStart(2, '0')}
                </div>
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
                    <div className="task-name-preview">
                      <Text type="secondary">预览：</Text>
                      <Text className="task-name-preview-text">
                        {getTaskNamePreview(parentTask.id, text, parentTask.title, currentWeek, index)}
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
                  
                />
              )}
            />
            <Table.Column
              title="操作"
              key="action"
              width={100}
              render={(_, record: SubTaskRow) => (
                <div className="action-buttons">
                  <Tooltip title="复制行">
                    <Button
                      type="text"
                      
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
                      
                      icon={<DeleteOutlined />}
                      onClick={() => deleteRow(record.key)}
                      disabled={subTasks.length <= TABLE_INTERACTION_CONFIG.minRows}
                    />
                  </Tooltip>
                </div>
              )}
            />
          </Table>
        </Spin>
      </div>

      {/* 底部操作区 */}
      <div className="footer-buttons">
        <div>
          <Text type="secondary">
            有效任务: {subTasks.filter(row => row.title?.trim()).length} 个
            {Object.keys(validationErrors).length > 0 && (
              <Text type="danger" style={{ marginLeft: 8 }}>
                • {Object.keys(validationErrors).length} 个错误
              </Text>
            )}
          </Text>
        </div>
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