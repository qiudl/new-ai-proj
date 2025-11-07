import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Spin,
  message,
  Breadcrumb,
  Descriptions,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Tag,
  Alert,
  Divider,
  Typography,
  Tabs,
  Modal
} from 'antd';
import {
  SaveOutlined,
  ArrowLeftOutlined,
  UserOutlined,
  CalendarOutlined,
  TagOutlined,
  ClockCircleOutlined,
  BranchesOutlined,
  FileTextOutlined,
  EditOutlined,
  PlayCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { TaskService } from '../services/taskService';
import { projectService } from '../services/projectService';
import { Task } from '../types/task';
// ✅ FIXED - Add User type import (TS2304)
import { User } from '../types/user';
import { TaskParentSelector } from '../components/TaskParentSelector';
import TaskDocumentEditor from '../components/TaskDocumentEditor';
import { isSystemAdmin } from '../utils/permissions';
import { TokenManager } from '../utils/tokenManager';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const TaskEditPage: React.FC = () => {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const user = TokenManager.getCurrentUser();

  // 状态管理
  const [task, setTask] = useState<Task | null>(null);
  const [projectInfo, setProjectInfo] = useState<any>(null);
  const [parentTask, setParentTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [parentTaskChanged, setParentTaskChanged] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // 项目选择器相关状态（仅系统管理员可见）
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

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

        // 初始化项目选择器（系统管理员）
        // ✅ FIXED - Type assertion for partial user object (TS2345)
        if (user && isSystemAdmin(user as User)) {
          setSelectedProjectId(parsedProjectId);
        }

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
        
        // 加载父任务信息
        if (taskData.value.parent_id) {
          try {
            const parentTaskData = await TaskService.getTask(parsedProjectId, taskData.value.parent_id);
            setParentTask(parentTaskData);
          } catch (error) {
            console.error('Error loading parent task:', error);
          }
        }
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

  // 加载项目列表（仅系统管理员）
  const loadProjects = useCallback(async () => {
    // ✅ FIXED - Type assertion for partial user object (TS2345)
    if (!user || !isSystemAdmin(user as User)) return;

    try {
      setLoadingProjects(true);
      const response = await projectService.getProjects({ page: 1, page_size: 1000 });
      setProjects(response.data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      message.error('加载项目列表失败');
    } finally {
      setLoadingProjects(false);
    }
  }, [user]);

  useEffect(() => {
    // ✅ FIXED - Type assertion for partial user object (TS2345)
    if (user && isSystemAdmin(user as User)) {
      loadProjects();
    }
  }, [loadProjects, user]);

  // 保存任务基本信息
  const handleSave = useCallback(async () => {
    if (!task || !projectId) return;
    
    // 如果不在基本信息标签页，提示用户
    if (activeTab !== 'basic') {
      message.info('当前在' + (activeTab === 'document' ? '文档' : '计时') + '标签页，请切换到基本信息标签页保存任务信息');
      setActiveTab('basic');
      return;
    }
    
    try {
      const values = await form.validateFields();
      setSaving(true);
      
      const updateData = {
        title: values.title,
        description: values.description || '',
        status: values.status,
        assignee_id: values.assignee_id || null,
        due_date: values.due_date ? values.due_date.format('YYYY-MM-DDTHH:mm:ssZ') : null,
        // Include parent_id if it has changed
        ...(parentTaskChanged && { parent_id: task.parent_id }),
        // 根据后端TaskRequest模型，这些字段应该在顶层而不是custom_fields中
        // 只有当priority有有效值时才包含，避免空字符串导致验证失败
        ...(values.priority && ['low', 'medium', 'high'].includes(values.priority) && { priority: values.priority }),
        // 确保estimated_hours是数字类型，不是字符串
        ...(values.estimated_hours !== null && values.estimated_hours !== undefined && !isNaN(Number(values.estimated_hours)) && { 
          estimated_hours: Number(values.estimated_hours) 
        }),
        ...(values.tags && values.tags.length > 0 && { tags: values.tags }),
        custom_fields: task.custom_fields || {}
      };
      
      await TaskService.updateTask(parseInt(projectId), task.id, updateData);
      message.success('任务保存成功');
      setHasChanges(false);
      setParentTaskChanged(false);
      
      // Reload task data to get updated parent information
      await loadTask();
      
      // 返回任务详情页
      navigate(`/projects/${projectId}/tasks/${taskId}`);
    } catch (error) {
      console.error('Task save error:', error);

      // 表单验证错误
      if (error && typeof error === 'object' && 'errorFields' in error) {
        message.error('请检查表单填写');
        return;
      }

      // 处理不同类型的错误
      if (error instanceof Error) {
        const errorMessage = error.message || '';

        // 数据验证错误
        if (errorMessage.includes('数据验证失败')) {
          message.error(`数据验证失败: ${errorMessage.replace('数据验证失败:', '').trim()}`);
        }
        // 任务已归档
        else if (errorMessage.includes('归档')) {
          message.error('任务已归档，无法修改。请先恢复任务。');
        }
        // 权限错误
        else if (errorMessage.includes('权限') || errorMessage.includes('Unauthorized')) {
          message.error('没有权限修改此任务');
        }
        // 网络错误
        else if (errorMessage.includes('Network') || errorMessage.includes('timeout')) {
          message.error('网络连接失败，请检查网络后重试');
        }
        // 其他已知错误
        else if (errorMessage) {
          message.error(`保存失败: ${errorMessage}`);
        }
        // 未知错误
        else {
          message.error('保存失败，请稍后重试');
        }
      } else {
        // 非Error对象的错误
        message.error('保存失败，请稍后重试');
      }
    } finally {
      setSaving(false);
    }
  }, [task, projectId, activeTab, form, parentTaskChanged, loadTask, navigate]);

  // 取消编辑
  const handleCancel = () => {
    if (hasChanges) {
      // 这里可以添加确认对话框
      const confirmed = window.confirm('有未保存的更改，确定要离开吗？');
      if (!confirmed) return;
    }
    navigate(`/projects/${projectId}/tasks/${taskId}`);
  };

  // 表单值变化处理
  const handleFormChange = () => {
    setHasChanges(true);
  };

  // 父任务变更处理
  const handleParentChange = (parentId: number | null, parentTaskData?: Task | null) => {
    if (task) {
      // Update task data with new parent
      const updatedTask = { ...task, parent_id: parentId ?? undefined };
      setTask(updatedTask);
      setParentTask(parentTaskData || null);
      setParentTaskChanged(true);
      setHasChanges(true);
    }
  };

  // 项目变更处理（仅系统管理员）
  const handleProjectChange = (newProjectId: number) => {
    if (!task || !projectId) return;

    const currentProjectId = parseInt(projectId);
    if (newProjectId === currentProjectId) {
      return;
    }

    Modal.confirm({
      title: '确认更改任务所属项目？',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <Alert
            message="警告：此操作将改变任务所属项目"
            description={
              <div>
                <p>• 任务将从当前项目移动到目标项目</p>
                <p>• 任务的所有子任务也会跟随移动</p>
                <p>• 此操作不可撤销</p>
              </div>
            }
            type="warning"
            showIcon
            style={{ marginTop: '16px' }}
          />
        </div>
      ),
      okText: '确认更改',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          setSaving(true);
          const updatedTask = await TaskService.updateTaskProject(
            currentProjectId,
            task.id,
            newProjectId
          );

          message.success('任务所属项目已更新');
          setTask(updatedTask);
          setSelectedProjectId(newProjectId);

          // 重定向到新项目的任务编辑页面
          setTimeout(() => {
            navigate(`/projects/${newProjectId}/tasks/${task.id}/edit`);
          }, 1000);
        } catch (error: any) {
          console.error('Error updating task project:', error);
          const errorMessage = error?.message || '更新失败';
          message.error(`更新任务所属项目失败: ${errorMessage}`);
          // 恢复选择
          setSelectedProjectId(currentProjectId);
        } finally {
          setSaving(false);
        }
      },
      onCancel: () => {
        // 取消时恢复原选择
        setSelectedProjectId(currentProjectId);
      }
    });
  };

  // 快捷键处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S 保存当前标签页内容
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (activeTab === 'basic') {
          handleSave();
        } else if (activeTab === 'document') {
          // 文档标签页有自己的保存快捷键处理
          message.info('请在文档编辑器中使用 Ctrl+S 保存文档');
        } else {
          message.info('当前标签页暂不支持快捷键保存');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, handleSave]);

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
        {/* 主要编辑区域 */}
        <Col xs={24} lg={16}>
          <Card title="编辑任务" style={{ marginBottom: '24px' }}>
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              items={[
                {
                  key: 'basic',
                  label: (
                    <span>
                      <EditOutlined />
                      基本信息
                    </span>
                  ),
                  children: (
                    <Form
                      form={form}
                      layout="vertical"
                      onValuesChange={handleFormChange}
                    >
                      {/* 项目选择器（仅系统管理员可见） */}
                      {/* ✅ FIXED - Type assertion for partial user object (TS2345) */}
                      {user && isSystemAdmin(user as User) && (
                        <Alert
                          message="系统管理员权限"
                          description={
                            <div>
                              <p style={{ marginBottom: '8px' }}>
                                您可以更改任务所属项目。请注意：
                              </p>
                              <Form.Item
                                label="所属项目"
                                style={{ marginBottom: 0 }}
                              >
                                <Select
                                  value={selectedProjectId || (projectId ? parseInt(projectId) : undefined)}
                                  onChange={handleProjectChange}
                                  loading={loadingProjects}
                                  placeholder="选择项目"
                                  showSearch
                                  optionFilterProp="children"
                                  filterOption={(input, option) =>
                                    // ✅ FIXED - Use double assertion through unknown for type conversion (TS2352)
                                    (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                                  }
                                  style={{ width: '100%' }}
                                >
                                  {projects.map((proj) => (
                                    <Option key={proj.id} value={proj.id}>
                                      {proj.name}
                                    </Option>
                                  ))}
                                </Select>
                              </Form.Item>
                            </div>
                          }
                          type="info"
                          showIcon
                          style={{ marginBottom: '24px' }}
                        />
                      )}

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
                  )
                },
                {
                  key: 'document',
                  label: (
                    <span>
                      <FileTextOutlined />
                      任务文档
                    </span>
                  ),
                  children: task && projectId ? (
                    <div style={{ minHeight: '500px' }}>
                      <TaskDocumentEditor
                        taskId={task.id}
                        projectId={parseInt(projectId)}
                        onSave={(content) => {
                          // 文档保存成功的回调
                          }}
                      />
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '50px' }}>
                      <Spin size="large" />
                      <div style={{ marginTop: '16px' }}>加载任务信息...</div>
                    </div>
                  )
                },
                {
                  key: 'timer',
                  label: (
                    <span>
                      <PlayCircleOutlined />
                      时间跟踪
                    </span>
                  ),
                  children: (
                    <div style={{ padding: '20px', textAlign: 'center' }}>
                      <div style={{ marginBottom: '16px' }}>
                        <ClockCircleOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
                      </div>
                      <Typography.Title level={4}>时间跟踪功能</Typography.Title>
                      <Typography.Text type="secondary">
                        计时器功能即将推出，敬请期待！
                      </Typography.Text>
                    </div>
                  )
                }
              ]}
            />
          </Card>
        </Col>

        {/* 右侧信息面板 */}
        <Col xs={24} lg={8}>
          {/* 任务上下文信息 */}
          <Card title="任务信息" style={{ marginBottom: '16px' }}>
            <Descriptions column={1} >
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
              <Descriptions.Item label="父任务">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {parentTask ? (
                    <Button 
                      type="link" 
                      style={{ padding: 0, height: 'auto', fontSize: '14px' }}
                      onClick={() => navigate(`/projects/${task.project_id}/tasks/${parentTask.id}`)}
                    >
                      {parentTask.title} (#{parentTask.id})
                    </Button>
                  ) : (
                    <Text type="secondary">无父任务（根任务）</Text>
                  )}
                  
                  <TaskParentSelector
                    projectId={task.project_id}
                    currentTaskId={task.id}
                    currentParentId={parentTask?.id || null}
                    value={parentTask?.id || null}
                    onChange={handleParentChange}
                    placeholder="选择父任务"
                    allowClear={true}
                    className="task-edit-parent-selector"
                  />
                </div>
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
                  Ctrl + S 快速保存基本信息
                </Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileTextOutlined style={{ color: '#52c41a' }} />
                <Text style={{ fontSize: '12px' }}>
                  文档标签页支持独立保存
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