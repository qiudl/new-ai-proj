// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { 
 Card, 
 message, 
 Form, 
 Select,
 DatePicker,
 InputNumber, 
 Typography
} from 'antd';
import { 
 ArrowLeftOutlined, 
 TagOutlined, 
 BranchesOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { TaskService } from '../services/taskService';
import { projectService } from '../services/projectService';
import { useTaskHierarchy, useTaskStatusHierarchy, useTaskDueDateHierarchy } from '../hooks/useTaskHierarchy';
import TaskHierarchyInfo from '../components/TaskHierarchyInfo';
import { Task } from '../types/task';
import dayjs from 'dayjs';

const { Title, Text } = Typography;



const TaskEditPage: React.FC = () => {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();
  const [form] = Form.useForm();
  
  // 状态管理
  const [task, setTask] = useState<Task | null>(null);
  const [projectInfo, setProjectInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 使用任务层级Hooks
  const parsedProjectId = parseInt(projectId || '0');
  const parsedTaskId = parseInt(taskId || '0');
  const { hierarchyInfo, refreshHierarchy } = useTaskHierarchy(parsedProjectId, parsedTaskId);
  const { updateTaskStatus, updating: statusUpdating } = useTaskStatusHierarchy(parsedProjectId);
  const { updateTaskDueDate, updating: dueDateUpdating } = useTaskDueDateHierarchy(parsedProjectId);

  // 加载任务数据
  const loadTask = useCallback(async () => {
    if (!projectId || !taskId) return;
    
    const parsedProjectId = parseInt(projectId);
    const parsedTaskId = parseInt(taskId);
    
    if (isNaN(parsedProjectId) || isNaN(parsedTaskId)) {
      message.error('无效的任务ID或项目ID');
      navigate('/task-documents');
      return;
    }
    
    try {
      setLoading(true);
      
      // 并行加载任务和项目信息
      const [taskData, projectData] = await Promise.allSettled([
        TaskService.getTask(parsedProjectId, parsedTaskId),
        projectService.getProject(parsedProjectId)
      ]);
      
      if (taskData.status === 'fulfilled') {
        setTask(taskData.value);
        
        // 设置表单初始值
        form.setFieldsValue({
          title: taskData.value.title,
          description: taskData.value.description,
          status: taskData.value.status,
          assignee_id: taskData.value.assignee_id,
          due_date: taskData.value.due_date ? dayjs(taskData.value.due_date) : null,
          priority: taskData.value.custom_fields?.priority || 'medium',
          estimated_hours: taskData.value.custom_fields?.estimated_hours,
          tags: taskData.value.custom_fields?.tags || []
        });
      } else {
        message.error('获取任务详情失败');
        navigate('/task-documents');
        return;
      }
      
      if (projectData.status === 'fulfilled') {
        setProjectInfo(projectData.value);
      }
      
    } catch (error) {
      message.error('加载任务数据失败');
      console.error('Error loading task:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, taskId, navigate, form]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  // 表单值变化处理
  const handleFormChange = () => {
    setHasChanges(true);
  };

  // 保存任务（使用层级逻辑）
  const handleSave = async () => {
    if (!task || !projectId) return;
    
    try {
      const values = await form.validateFields();
      setSaving(true);
      
      const updateData = {
        title: values.title,
        description: values.description || '',
        status: values.status,
        assignee_id: values.assignee_id || null,
        due_date: values.due_date ? values.due_date.format('YYYY-MM-DDTHH:mm:ssZ') : null,
        ...(values.priority && ['low', 'medium', 'high'].includes(values.priority) && { priority: values.priority }),
        ...(values.estimated_hours !== null && values.estimated_hours !== undefined && !isNaN(Number(values.estimated_hours)) && { 
          estimated_hours: Number(values.estimated_hours) 
        }),
        ...(values.tags && values.tags.length > 0 && { tags: values.tags }),
        custom_fields: task.custom_fields || {}
      };

      // 使用层级服务更新任务
      await TaskService.updateTask(parseInt(projectId), task.id, updateData);
      
      message.success('任务保存成功');
      setHasChanges(false);
      
      // 刷新任务数据
      await loadTask();
      await refreshHierarchy();
      
    } catch (error: any) {
      console.error('Error saving task:', error);
      message.error(`保存任务失败: ${error.message || '未知错误'}`);
    } finally {
      setSaving(false);
    }
  };

  // 快速状态更新
  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;
    
    try {
      await updateTaskStatus(task.id, newStatus);
      form.setFieldsValue({ status: newStatus });
      await loadTask();
    } catch (error) {
      // 错误已在hook中处理
    }
  };

  // 快速截止时间更新
  const handleDueDateChange = async (date: dayjs.Dayjs | null) => {
    if (!task || !date) return;
    
    try {
      await updateTaskDueDate(task.id, date.format('YYYY-MM-DDTHH:mm:ssZ'));
      form.setFieldsValue({ due_date: date });
      await loadTask();
    } catch (error) {
      // 错误已在hook中处理
    }
  };

  // 取消编辑
  const handleCancel = () => {
    if (hasChanges) {
      // 这里可以添加确认对话框
      const confirmed = window.confirm('有未保存的更改，确定要离开吗？');
      if (!confirmed) return;
    }
    navigate(`/projects/${projectId}/tasks/${taskId}`);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!task) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Alert
          message="任务不存在"
          description="请检查任务ID是否正确，或任务可能已被删除。"
          type="warning"
          showIcon
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* 面包屑导航和操作按钮 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Breadcrumb
          items={[
            {
              title: (
                <span 
                  onClick={() => navigate('/task-documents')}
                  style={{ color: '#1890ff', cursor: 'pointer' }}
                >
                  <ArrowLeftOutlined style={{ marginRight: '4px' }} />
                  任务文档
                </span>
              )
            },
            {
              title: (
                <span 
                  onClick={() => navigate(`/projects/${projectId}/tasks/${taskId}`)}
                  style={{ color: '#1890ff', cursor: 'pointer' }}
                >
                  任务详情
                </span>
              )
            },
            {
              title: '编辑任务'
            }
          ]}
        />
        
        <Space>
          <Button onClick={handleCancel}>
            取消
          </Button>
          <Button 
            type="primary" 
            icon={<SaveOutlined />} 
            onClick={handleSave}
            loading={saving}
          >
            保存
          </Button>
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        {/* 左侧编辑表单 */}
        <Col xs={24} lg={16}>
          <Card title="编辑任务" style={{ marginBottom: '24px' }}>
            <Form
              form={form}
              layout="vertical"
              onValuesChange={handleFormChange}
            >
              {/* 基本信息 */}
              <Form.Item
                name="title"
                label="任务标题"
                rules={[{ required: true, message: '请输入任务标题' }]}
              >
                <Input placeholder="请输入任务标题" size="large" />
              </Form.Item>

              <Form.Item
                name="description"
                label="任务描述"
              >
                <TextArea 
                  rows={4} 
                  placeholder="请输入任务详细描述"
                  showCount
                  maxLength={1000}
                />
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="status"
                    label="任务状态"
                    rules={[{ required: true, message: '请选择任务状态' }]}
                  >
                    <Select placeholder="选择状态">
                      <Option value="todo">待开始</Option>
                      <Option value="in_progress">进行中</Option>
                      <Option value="completed">已完成</Option>
                      <Option value="cancelled">已取消</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="priority"
                    label="优先级"
                  >
                    <Select placeholder="选择优先级">
                      <Option value="low">低</Option>
                      <Option value="medium">中</Option>
                      <Option value="high">高</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="assignee_id"
                    label="负责人"
                  >
                    <Select placeholder="选择负责人" allowClear>
                      <Option value={1}>用户 1</Option>
                      <Option value={2}>用户 2</Option>
                      <Option value={3}>用户 3</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="due_date"
                    label="截止时间"
                  >
                    <DatePicker 
                      style={{ width: '100%' }}
                      placeholder="选择截止时间"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="estimated_hours"
                    label="预估工时"
                  >
                    <InputNumber 
                      style={{ width: '100%' }}
                      min={0}
                      step={0.5}
                      placeholder="预估工时(小时)"
                      addonAfter="小时"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="tags"
                    label="标签"
                  >
                    <Select
                      mode="tags"
                      style={{ width: '100%' }}
                      placeholder="添加标签"
                      tokenSeparators={[',']}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>

        {/* 右侧信息面板 */}
        <Col xs={24} lg={8}>
          {/* 任务层级关系 */}
          {hierarchyInfo && (
            <div style={{ marginBottom: '16px' }}>
              <TaskHierarchyInfo
                task={hierarchyInfo.task}
                parent={hierarchyInfo.parent}
                children={hierarchyInfo.children}
                siblings={hierarchyInfo.siblings}
                onNavigateToTask={(taskId) => navigate(`/projects/${projectId}/tasks/${taskId}/edit`)}
              />
            </div>
          )}

          {/* 任务上下文信息 */}
          <Card title="任务信息" style={{ marginBottom: '16px' }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="任务ID">#{task.id}</Descriptions.Item>
              <Descriptions.Item label="所属项目">
                {projectInfo ? (
                  <Button 
                    type="link" 
                    style={{ padding: 0, height: 'auto', fontSize: '14px' }}
                    onClick={() => navigate(`/projects/${task.project_id}`)}
                  >
                    {projectInfo.name} (#{task.project_id})
                  </Button>
                ) : (
                  `项目 #${task.project_id}`
                )}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(task.created_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {dayjs(task.updated_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 操作提示 */}
          <Card title="编辑提示" style={{ marginBottom: '16px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SaveOutlined style={{ color: '#1890ff' }} />
                <Text style={{ fontSize: '12px' }}>
                  Ctrl + S 快速保存
                </Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TagOutlined style={{ color: '#52c41a' }} />
                <Text style={{ fontSize: '12px' }}>
                  标签支持回车分隔
                </Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClockCircleOutlined style={{ color: '#fa8c16' }} />
                <Text style={{ fontSize: '12px' }}>
                  修改会自动记录历史
                </Text>
              </div>
            </Space>
          </Card>

          {/* 未保存提醒 */}
          {hasChanges && (
            <Alert
              message="有未保存的更改"
              description="请记得保存您的修改"
              type="warning"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          )}
        </Col>
      </Row>
    </div>
  );
};

export default TaskEditPage;