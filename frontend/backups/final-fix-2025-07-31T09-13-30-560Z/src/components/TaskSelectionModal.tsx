// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Modal, 
  Select, 
  List, 
  Card, 
  Typography, 
  Space, 
  Button, 
  Empty, 
  Spin, 
  Input,
  Tag,
  Divider,
  Alert
} from 'antd';
import { 
  ProjectOutlined, 
  ClockCircleOutlined, 
  SearchOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { TaskService } from '../services/taskService';
import { projectService } from '../services/projectService';
import TimerService from '../services/timerService';
import { Task } from '../types/task';
import { TaskOption } from '../types/timer';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

interface Project {
  id: number;
  name: string;
  description?: string;
  taskCount?: number;
}

interface TaskSelectionModalProps {
  visible: boolean;
  onCancel: () => void;
  onSelect: (taskId: number, task: Task | TaskOption) => void;
  loading?: boolean;
}

const TaskSelectionModal: React.FC<TaskSelectionModalProps> = ({
  visible,
  onCancel,
  onSelect,
  loading = false
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // 加载项目列表
  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const response = await projectService.getProjects({ page: 1, pageSize: 100 });
      const projectsWithStats = await Promise.all(
        response.data.map(async (project: any) => {
          try {
            const tasks = await TaskService.getTasks(project.id);
            return {
              ...project,
              taskCount: tasks.data.filter((task: any) => 
                task.status === 'todo' || task.status === 'in_progress'
              ).length
            };
          } catch (error) {
            return { ...project, taskCount: 0 };
          }
        })
      );
      setProjects(projectsWithStats);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  // 加载指定项目的任务列表
  const loadTasks = useCallback(async (projectId: number) => {
    setTasksLoading(true);
    try {
      const response = await TaskService.getTasks(projectId, { page: 1, page_size: 100 });
      // 只显示未完成的任务
      const availableTasks = response.data.filter((task: Task) => 
        task.status === 'todo' || task.status === 'in_progress'
      );
      setTasks(availableTasks);
      setFilteredTasks(availableTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setTasks([]);
      setFilteredTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  // 处理项目选择
  const handleProjectSelect = useCallback((projectId: number) => {
    setSelectedProjectId(projectId);
    setSelectedTask(null);
    setSearchText('');
    loadTasks(projectId);
  }, [loadTasks]);

  // 处理任务搜索
  const handleSearch = useCallback((value: string) => {
    setSearchText(value);
    if (!value.trim()) {
      setFilteredTasks(tasks);
    } else {
      const filtered = tasks.filter((task: Task) =>
        task.title.toLowerCase().includes(value.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(value.toLowerCase()))
      );
      setFilteredTasks(filtered);
    }
  }, [tasks]);

  // 处理任务选择
  const handleTaskSelect = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  // 确认选择任务
  const handleConfirm = useCallback(() => {
    if (selectedTask) {
      onSelect(selectedTask.id, selectedTask);
    }
  }, [selectedTask, onSelect]);

  // 重置状态
  const resetState = useCallback(() => {
    setSelectedProjectId(null);
    setSelectedTask(null);
    setTasks([]);
    setFilteredTasks([]);
    setSearchText('');
  }, []);

  // 处理弹窗关闭
  const handleCancel = useCallback(() => {
    resetState();
    onCancel();
  }, [resetState, onCancel]);

  // 获取任务状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return '#faad14';
      case 'in_progress': return '#1890ff';
      case 'completed': return '#52c41a';
      case 'cancelled': return '#ff4d4f';
      default: return '#8c8c8c';
    }
  };

  // 获取任务状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'todo': return '待办';
      case 'in_progress': return '进行中';
      case 'completed': return '已完成';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  // 获取任务优先级颜色
  const getPriorityColor = (priority?: string) => {
    if (!priority) return undefined;
    switch (priority.toLowerCase()) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'default';
    }
  };

  // 弹窗打开时加载项目
  useEffect(() => {
    if (visible) {
      loadProjects();
    } else {
      resetState();
    }
  }, [visible, loadProjects, resetState]);

  return (
    <Modal
      title={
        <Space>
          <ClockCircleOutlined />
          <span>选择计时任务</span>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      width={800}
      style={{ top: 50 }}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button
          key="confirm"
          type="primary"
          icon={<PlayCircleOutlined />}
          disabled={!selectedTask}
          loading={loading}
          onClick={handleConfirm}
        >
          开始计时
        </Button>
      ]}
    >
      <div style={{ minHeight: '500px' }}>
        {/* 步骤指示 */}
        <Alert
          message="计时任务选择"
          description="请先选择项目，然后选择要计时的任务"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {/* 项目选择 */}
        <Card 
          title={
            <Space>
              <ProjectOutlined />
              <span>第一步：选择项目</span>
            </Space>
          }
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Select
            placeholder="请选择项目"
            style={{ width: '100%' }}
            loading={projectsLoading}
            value={selectedProjectId}
            onChange={handleProjectSelect}
            optionFilterProp="children"
            showSearch
          >
            {projects.map(project => (
              <Option key={project.id} value={project.id}>
                <Space>
                  <span>{project.name}</span>
                  {project.taskCount !== undefined && (
                    <Tag color={project.taskCount > 0 ? 'blue' : 'default'}>
                      {project.taskCount} 个可用任务
                    </Tag>
                  )}
                </Space>
              </Option>
            ))}
          </Select>
        </Card>

        {/* 任务选择 */}
        {selectedProjectId && (
          <Card
            title={
              <Space>
                <CheckCircleOutlined />
                <span>第二步：选择任务</span>
              </Space>
            }
            size="small"
            extra={
              <Search
                placeholder="搜索任务..."
                allowClear
                style={{ width: 250 }}
                value={searchText}
                onChange={(e) => handleSearch(e.target.value)}
                prefix={<SearchOutlined />}
              />
            }
          >
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {tasksLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Spin size="large" tip="加载任务中...">
                    <div style={{ height: '100px', width: '100%' }} />
                  </Spin>
                </div>
              ) : filteredTasks.length === 0 ? (
                <Empty
                  description={
                    searchText 
                      ? `未找到包含 "${searchText}" 的任务`
                      : "该项目暂无可用任务"
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ padding: '40px 0' }}
                />
              ) : (
                <List
                  dataSource={filteredTasks}
                  renderItem={(task) => (
                    <List.Item
                      key={task.id}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: selectedTask?.id === task.id ? '#e6f7ff' : 'transparent',
                        borderRadius: '6px',
                        padding: '12px',
                        border: selectedTask?.id === task.id ? '2px solid #1890ff' : '1px solid transparent',
                        marginBottom: '8px'
                      }}
                      onClick={() => handleTaskSelect(task)}
                    >
                      <List.Item.Meta
                        avatar={
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              backgroundColor: getStatusColor(task.status),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '16px'
                            }}
                          >
                            {task.status === 'in_progress' ? (
                              <ClockCircleOutlined />
                            ) : (
                              <ExclamationCircleOutlined />
                            )}
                          </div>
                        }
                        title={
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Text strong style={{ fontSize: '14px' }}>
                              {task.title}
                            </Text>
                            <Tag color={getStatusColor(task.status)} style={{ fontSize: '10px' }}>
                              {getStatusText(task.status)}
                            </Tag>
                            {task.custom_fields?.priority && (
                              <Tag color={getPriorityColor(task.custom_fields.priority)} style={{ fontSize: '10px' }}>
                                {task.custom_fields.priority}
                              </Tag>
                            )}
                          </div>
                        }
                        description={
                          <div>
                            {task.description && (
                              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                                {task.description.length > 80 
                                  ? `${task.description.substring(0, 80)}...` 
                                  : task.description
                                }
                              </Text>
                            )}
                            {task.custom_fields?.estimated_hours && (
                              <Tag icon={<ClockCircleOutlined />} style={{ fontSize: '10px' }}>
                                预计 {task.custom_fields.estimated_hours}h
                              </Tag>
                            )}
                          </div>
                        }
                      />
                      {selectedTask?.id === task.id && (
                        <div style={{ color: '#1890ff', fontSize: '16px' }}>
                          <CheckCircleOutlined />
                        </div>
                      )}
                    </List.Item>
                  )}
                />
              )}
            </div>
          </Card>
        )}

        {/* 选中任务预览 */}
        {selectedTask && (
          <>
            <Divider />
            <Card
              title="已选择的任务"
              size="small"
              style={{ 
                backgroundColor: '#f6ffed',
                borderColor: '#b7eb8f'
              }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Title level={5} style={{ margin: 0, color: '#389e0d' }}>
                  {selectedTask.title}
                </Title>
                {selectedTask.description && (
                  <Text type="secondary">{selectedTask.description}</Text>
                )}
                <Space wrap>
                  <Tag color={getStatusColor(selectedTask.status)}>
                    {getStatusText(selectedTask.status)}
                  </Tag>
                  {selectedTask.custom_fields?.priority && (
                    <Tag color={getPriorityColor(selectedTask.custom_fields.priority)}>
                      优先级: {selectedTask.custom_fields.priority}
                    </Tag>
                  )}
                  {selectedTask.custom_fields?.estimated_hours && (
                    <Tag icon={<ClockCircleOutlined />}>
                      预计时长: {selectedTask.custom_fields.estimated_hours}小时
                    </Tag>
                  )}
                </Space>
              </Space>
            </Card>
          </>
        )}
      </div>
    </Modal>
  );
};

export default TaskSelectionModal;