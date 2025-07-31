// @ts-nocheck
import React, { useState, useCallback } from 'react';
import {
 List,
 Card,
 Typography, 
 Input,
 Select,
 InputNumber, 
 Modal,
 message, 
 Row,
 Col,
 Badge,
 Popconfirm
} from 'antd';
import {
 EditOutlined, 
 SaveOutlined, 
 BulbOutlined,
 StarOutlined
} from '@ant-design/icons';
import { GeneratedSubTask } from '../types/aiTaskGenerator';

const { Text, Title } = Typography;



interface GeneratedTasksListProps {
  tasks: GeneratedSubTask[];
  onEdit?: (tasks: GeneratedSubTask[]) => void;
  onImport?: (tasks: GeneratedSubTask[]) => void;
  onRegenerate?: () => void;
  loading?: boolean;
  editable?: boolean;
  showImportButton?: boolean;
  showRegenerateButton?: boolean;
  className?: string;
  maxHeight?: number;
}

interface EditingTask extends GeneratedSubTask {
  editing?: boolean;
  originalIndex?: number;
}

const GeneratedTasksList: React.FC<GeneratedTasksListProps> = ({
  tasks,
  onEdit,
  onImport,
  onRegenerate,
  loading = false,
  editable = true,
  showImportButton = true,
  showRegenerateButton = true,
  className = '',
  maxHeight = 400
}) => {
  const [editingTasks, setEditingTasks] = useState<EditingTask[]>(
    tasks.map((task, index) => ({ ...task, editing: false, originalIndex: index }))
  );
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState<Partial<GeneratedSubTask>>({
    title: '',
    description: '',
    priority: 'medium',
    estimatedHours: 2,
    status: 'todo',
    custom_fields: {
      tags: [],
      ai_generated: false
    }
  });

  // 同步外部tasks变化
  React.useEffect(() => {
    setEditingTasks(tasks.map((task, index) => ({ 
      ...task, 
      editing: false, 
      originalIndex: index 
    })));
  }, [tasks]);

  // 获取优先级颜色
  const getPriorityColor = (priority: string): string => {
    const colorMap: Record<string, string> = {
      'high': '#ff4d4f',
      'medium': '#fa8c16',
      'low': '#52c41a'
    };
    return colorMap[priority] || '#fa8c16';
  };

  // 获取优先级文本
  const getPriorityText = (priority: string): string => {
    const textMap: Record<string, string> = {
      'high': '高优先级',
      'medium': '中优先级',
      'low': '低优先级'
    };
    return textMap[priority] || '中优先级';
  };

  // 开始编辑任务
  const startEditing = useCallback((index: number) => {
    setEditingTasks(prev => prev.map((task, i) => ({
      ...task,
      editing: i === index
    })));
  }, []);

  // 保存编辑
  const saveEditing = useCallback((index: number) => {
    const updatedTasks = editingTasks.map((task, i) => ({
      ...task,
      editing: false
    }));
    setEditingTasks(updatedTasks);
    
    if (onEdit) {
      onEdit(updatedTasks.map(({ editing, originalIndex, ...task }) => task));
    }
    
    message.success('任务已更新');
  }, [editingTasks, onEdit]);

  // 取消编辑
  const cancelEditing = useCallback((index: number) => {
    // 恢复原始数据
    const originalTask = tasks[editingTasks[index].originalIndex!];
    setEditingTasks(prev => prev.map((task, i) => 
      i === index ? { 
        ...originalTask, 
        editing: false, 
        originalIndex: task.originalIndex 
      } : task
    ));
  }, [tasks, editingTasks]);

  // 删除任务
  const deleteTask = useCallback((index: number) => {
    const updatedTasks = editingTasks.filter((_, i) => i !== index);
    setEditingTasks(updatedTasks);
    
    if (onEdit) {
      onEdit(updatedTasks.map(({ editing, originalIndex, ...task }) => task));
    }
    
    message.success('任务已删除');
  }, [editingTasks, onEdit]);

  // 更新任务字段
  const updateTaskField = useCallback((index: number, field: keyof GeneratedSubTask, value: any) => {
    setEditingTasks(prev => prev.map((task, i) => 
      i === index ? { ...task, [field]: value } : task
    ));
  }, []);

  // 添加新任务
  const addNewTask = useCallback(() => {
    if (!newTask.title?.trim()) {
      message.warning('请输入任务标题');
      return;
    }

    const task: GeneratedSubTask = {
      title: newTask.title!,
      description: newTask.description || '',
      priority: newTask.priority as 'low' | 'medium' | 'high',
      estimatedHours: newTask.estimatedHours || 2,
      status: 'todo',
      custom_fields: {
        tags: newTask.custom_fields?.tags || [],
        ai_generated: false,
        generation_id: `manual_${Date.now()}`
      }
    };

    const updatedTasks = [...editingTasks, { 
      ...task, 
      editing: false, 
      originalIndex: editingTasks.length 
    }];
    setEditingTasks(updatedTasks);
    
    if (onEdit) {
      onEdit(updatedTasks.map(({ editing, originalIndex, ...t }) => t));
    }

    // 重置表单
    setNewTask({
      title: '',
      description: '',
      priority: 'medium',
      estimatedHours: 2,
      status: 'todo',
      custom_fields: { tags: [], ai_generated: false }
    });
    setShowAddModal(false);
    
    message.success('任务已添加');
  }, [newTask, editingTasks, onEdit]);

  // 拖拽处理
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updatedTasks = [...editingTasks];
    const draggedTask = updatedTasks[draggedIndex];
    updatedTasks.splice(draggedIndex, 1);
    updatedTasks.splice(index, 0, draggedTask);
    
    setEditingTasks(updatedTasks);
    setDraggedIndex(index);
  }, [editingTasks, draggedIndex]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    if (onEdit) {
      onEdit(editingTasks.map(({ editing, originalIndex, ...task }) => task));
    }
  }, [editingTasks, onEdit]);

  // 批量操作
  const handleImportAll = useCallback(() => {
    if (onImport) {
      onImport(editingTasks.map(({ editing, originalIndex, ...task }) => task));
    }
  }, [editingTasks, onImport]);

  // 统计信息
  const stats = React.useMemo(() => {
    const total = editingTasks.length;
    const aiGenerated = editingTasks.filter(t => t.custom_fields?.ai_generated).length;
    const manual = total - aiGenerated;
    const totalHours = editingTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const priorities = {
      high: editingTasks.filter(t => t.priority === 'high').length,
      medium: editingTasks.filter(t => t.priority === 'medium').length,
      low: editingTasks.filter(t => t.priority === 'low').length
    };

    return { total, aiGenerated, manual, totalHours, priorities };
  }, [editingTasks]);

  const renderTaskItem = (task: EditingTask, index: number) => {
    const isEditing = task.editing;
    const isAIGenerated = task.custom_fields?.ai_generated;

    return (
      <List.Item
        key={index}
        style={{
          padding: '12px 16px',
          border: '1px solid #f0f0f0',
          borderRadius: '6px',
          marginBottom: '8px',
          background: isEditing ? '#f6ffed' : '#fafafa',
          cursor: editable ? 'move' : 'default'
        }}
        draggable={editable && !isEditing}
        onDragStart={() => handleDragStart(index)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDragEnd={handleDragEnd}
      >
        <div style={{ width: '100%' }}>
          {/* 任务头部 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              {isEditing ? (
                <Input
                  value={task.title}
                  onChange={e => updateTaskField(index, 'title', e.target.value)}
                  placeholder="任务标题"
                  style={{ fontWeight: 500 }}
                />
              ) : (
                <Text strong style={{ fontSize: '14px' }}>
                  {task.title}
                </Text>
              )}
            </div>
            
            <Space>
              {isAIGenerated && (
                <Tooltip title="AI生成">
                  <BulbOutlined style={{ color: '#1890ff' }} />
                </Tooltip>
              )}
              {editable && (
                <>
                  {isEditing ? (
                    <Space size={4}>
                      <Tooltip title="保存">
                        <Button
                          type="text"
                          size="small"
                          icon={<SaveOutlined />}
                          onClick={() => saveEditing(index)}
                          style={{ color: '#52c41a' }}
                        />
                      </Tooltip>
                      <Tooltip title="取消">
                        <Button
                          type="text"
                          size="small"
                          icon={<CloseOutlined />}
                          onClick={() => cancelEditing(index)}
                          style={{ color: '#ff4d4f' }}
                        />
                      </Tooltip>
                    </Space>
                  ) : (
                    <Space size={4}>
                      <Tooltip title="编辑">
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => startEditing(index)}
                        />
                      </Tooltip>
                      <Tooltip title="删除">
                        <Popconfirm
                          title="确定删除这个任务吗？"
                          onConfirm={() => deleteTask(index)}
                          okText="确定"
                          cancelText="取消"
                        >
                          <Button
                            type="text"
                            size="small"
                            icon={<DeleteOutlined />}
                            danger
                          />
                        </Popconfirm>
                      </Tooltip>
                      <DragOutlined style={{ color: '#bfbfbf', cursor: 'move' }} />
                    </Space>
                  )}
                </>
              )}
            </Space>
          </div>

          {/* 任务描述 */}
          {(task.description || isEditing) && (
            <div style={{ marginBottom: 8 }}>
              {isEditing ? (
                <TextArea
                  value={task.description}
                  onChange={e => updateTaskField(index, 'description', e.target.value)}
                  placeholder="任务描述"
                  rows={2}
                />
              ) : (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {task.description}
                </Text>
              )}
            </div>
          )}

          {/* 任务属性 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space wrap>
              {isEditing ? (
                <>
                  <Select
                    value={task.priority}
                    onChange={value => updateTaskField(index, 'priority', value)}
                    size="small"
                    style={{ width: 100 }}
                  >
                    <Option value="high">
                      <Tag color="red">高优先级</Tag>
                    </Option>
                    <Option value="medium">
                      <Tag color="orange">中优先级</Tag>
                    </Option>
                    <Option value="low">
                      <Tag color="green">低优先级</Tag>
                    </Option>
                  </Select>
                  <Space align="center">
                    <ClockCircleOutlined />
                    <InputNumber
                      value={task.estimatedHours}
                      onChange={value => updateTaskField(index, 'estimatedHours', value || 1)}
                      min={0.5}
                      max={40}
                      step={0.5}
                      size="small"
                      style={{ width: 80 }}
                    />
                    <Text type="secondary" style={{ fontSize: '12px' }}>小时</Text>
                  </Space>
                </>
              ) : (
                <>
                  <Tag 
                    color={getPriorityColor(task.priority)}
                  >
                    {getPriorityText(task.priority)}
                  </Tag>
                  <Tag icon={<ClockCircleOutlined />}>
                    {task.estimatedHours}h
                  </Tag>
                  {task.custom_fields?.tags?.map(tag => (
                    <Tag key={tag} color="blue">
                      {tag}
                    </Tag>
                  ))}
                </>
              )}
            </Space>

            {/* 置信度评分（仅AI生成任务） */}
            {isAIGenerated && task.custom_fields?.confidence_score && (
              <Tooltip title={`AI生成置信度: ${task.custom_fields.confidence_score}%`}>
                <Badge
                  count={`${task.custom_fields.confidence_score}%`}
                  style={{
                    backgroundColor: task.custom_fields.confidence_score >= 80 ? '#52c41a' : 
                                   task.custom_fields.confidence_score >= 60 ? '#fa8c16' : '#ff4d4f'
                  }}
                />
              </Tooltip>
            )}
          </div>
        </div>
      </List.Item>
    );
  };

  return (
    <div className={className}>
      {/* 统计信息 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={4}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
                {stats.total}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>总任务数</Text>
            </div>
          </Col>
          <Col span={4}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}>
                {stats.aiGenerated}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>AI生成</Text>
            </div>
          </Col>
          <Col span={4}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fa8c16' }}>
                {stats.manual}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>手动添加</Text>
            </div>
          </Col>
          <Col span={4}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#722ed1' }}>
                {stats.totalHours}h
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>预估工时</Text>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <Space>
                <Tag color="red">高: {stats.priorities.high}</Tag>
                <Tag color="orange">中: {stats.priorities.medium}</Tag>
                <Tag color="green">低: {stats.priorities.low}</Tag>
              </Space>
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>优先级分布</Text>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 操作按钮 */}
      {(editable || showImportButton || showRegenerateButton) && (
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <Space>
            {editable && (
              <Button
                icon={<PlusOutlined />}
                onClick={() => setShowAddModal(true)}
              >
                添加任务
              </Button>
            )}
            {showImportButton && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleImportAll}
                disabled={editingTasks.length === 0}
                loading={loading}
              >
                导入所有任务 ({stats.total})
              </Button>
            )}
            {showRegenerateButton && (
              <Button
                icon={<StarOutlined />}
                onClick={onRegenerate}
                disabled={loading}
              >
                重新生成
              </Button>
            )}
          </Space>
        </div>
      )}

      {/* 任务列表 */}
      <div 
        style={{ 
          maxHeight, 
          overflowY: 'auto',
          border: '1px solid #f0f0f0',
          borderRadius: '6px',
          padding: '8px'
        }}
      >
        {editingTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>
            <ExclamationCircleOutlined style={{ fontSize: 24, marginBottom: 8 }} />
            <div>暂无任务</div>
          </div>
        ) : (
          <List
            dataSource={editingTasks}
            renderItem={renderTaskItem}
            split={false}
          />
        )}
      </div>

      {/* 添加任务模态框 */}
      <Modal
        title="添加新任务"
        open={showAddModal}
        onOk={addNewTask}
        onCancel={() => setShowAddModal(false)}
        okText="添加"
        cancelText="取消"
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>任务标题：</Text>
            <Input
              value={newTask.title}
              onChange={e => setNewTask(prev => ({ ...prev, title: e.target.value }))}
              placeholder="请输入任务标题"
              style={{ marginTop: 4 }}
            />
          </div>
          
          <div>
            <Text strong>任务描述：</Text>
            <TextArea
              value={newTask.description}
              onChange={e => setNewTask(prev => ({ ...prev, description: e.target.value }))}
              placeholder="请输入任务描述（可选）"
              rows={3}
              style={{ marginTop: 4 }}
            />
          </div>

          <Row gutter={16}>
            <Col span={12}>
              <Text strong>优先级：</Text>
              <Select
                value={newTask.priority}
                onChange={value => setNewTask(prev => ({ ...prev, priority: value }))}
                style={{ width: '100%', marginTop: 4 }}
              >
                <Option value="high">
                  <Tag color="red">高优先级</Tag>
                </Option>
                <Option value="medium">
                  <Tag color="orange">中优先级</Tag>
                </Option>
                <Option value="low">
                  <Tag color="green">低优先级</Tag>
                </Option>
              </Select>
            </Col>
            
            <Col span={12}>
              <Text strong>预估工时：</Text>
              <InputNumber
                value={newTask.estimatedHours}
                onChange={value => setNewTask(prev => ({ ...prev, estimatedHours: value || 2 }))}
                min={0.5}
                max={40}
                step={0.5}
                style={{ width: '100%', marginTop: 4 }}
                addonAfter="小时"
              />
            </Col>
          </Row>
        </Space>
      </Modal>
    </div>
  );
};

export default GeneratedTasksList;