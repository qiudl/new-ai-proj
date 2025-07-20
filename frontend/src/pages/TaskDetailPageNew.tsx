import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Progress, 
  Tag, 
  Button, 
  Space, 
  Spin, 
  message, 
  Modal, 
  Table, 
  Breadcrumb,
  Statistic,
  Descriptions,
  Timeline,
  Badge,
  Avatar,
  Tooltip,
  Alert,
  Divider,
  Typography
} from 'antd';
import { 
  EditOutlined, 
  DeleteOutlined, 
  ArrowLeftOutlined, 
  PlusOutlined, 
  BranchesOutlined, 
  HistoryOutlined, 
  ClockCircleOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  CalendarOutlined,
  UserOutlined,
  TagOutlined,
  FileTextOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { TaskService } from '../services/taskService';
import { projectService } from '../services/projectService';
import { Task, TaskUpdate, TimelineEvent } from '../types/task';
import TaskModal from '../components/TaskModal';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import '../styles/TaskDetail.css';

const { Title, Paragraph, Text } = Typography;

// 启用dayjs相对时间插件
dayjs.extend(relativeTime);

interface TaskCompletionStats {
  totalSubtasks: number;
  completedSubtasks: number;
  inProgressSubtasks: number;
  todoSubtasks: number;
  completionRate: number;
}

const TaskDetailPageNew: React.FC = () => {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();
  const navigate = useNavigate();
  
  // 核心状态
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [createSubtaskModalVisible, setCreateSubtaskModalVisible] = useState(false);
  
  // 附加数据状态
  const [projectInfo, setProjectInfo] = useState<any>(null);
  const [parentTask, setParentTask] = useState<Task | null>(null);
  
  // 完成情况相关状态
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [completionStats, setCompletionStats] = useState<TaskCompletionStats>({
    totalSubtasks: 0,
    completedSubtasks: 0,
    inProgressSubtasks: 0,
    todoSubtasks: 0,
    completionRate: 0
  });
  
  // 其他数据
  const [taskUpdates, setTaskUpdates] = useState<TaskUpdate[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // 加载任务基本信息
  const loadTask = useCallback(async () => {
    if (!projectId || !taskId) return;
    
    // 验证参数
    const parsedProjectId = parseInt(projectId);
    const parsedTaskId = parseInt(taskId);
    
    if (isNaN(parsedProjectId) || isNaN(parsedTaskId)) {
      message.error('无效的任务ID或项目ID');
      navigate('/tasks');
      return;
    }
    
    try {
      setLoading(true);
      const taskData = await TaskService.getTask(parsedProjectId, parsedTaskId);
      setTask(taskData);
      
      // 并行加载其他数据
      loadAllTaskData();
    } catch (error) {
      message.error('获取任务详情失败');
      console.error('Error loading task:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, taskId, navigate]);

  // 并行加载所有任务数据
  const loadAllTaskData = useCallback(async () => {
    if (!projectId || !taskId || !task) return;
    
    const parsedProjectId = parseInt(projectId);
    const parsedTaskId = parseInt(taskId);
    
    if (isNaN(parsedProjectId) || isNaN(parsedTaskId)) {
      return;
    }
    
    try {
      setDataLoading(true);
      
      // 并行加载基础数据
      const [subtasksData, updatesData, timelineData] = await Promise.allSettled([
        TaskService.getTaskChildren(parsedProjectId, parsedTaskId),
        TaskService.getTaskUpdates(parsedProjectId, parsedTaskId, { page: 1, page_size: 20 }),
        TaskService.getTaskTimeline(parsedProjectId, parsedTaskId, { page: 1, page_size: 20 }),
      ]);
      
      // 单独获取项目信息
      try {
        const projectInfo = await projectService.getProject(parsedProjectId);
        setProjectInfo(projectInfo);
      } catch (error) {
        console.error('Error loading project info:', error);
      }
      
      // 单独获取父任务信息
      if (task.parent_id) {
        try {
          const parentTaskInfo = await TaskService.getTask(parsedProjectId, task.parent_id);
          setParentTask(parentTaskInfo);
        } catch (error) {
          console.error('Error loading parent task:', error);
        }
      }
      
      // 处理子任务数据
      if (subtasksData.status === 'fulfilled') {
        const children = Array.isArray(subtasksData.value) ? subtasksData.value : [];
        setSubtasks(children);
        calculateCompletionStats(children);
      }
      
      // 处理更新历史数据
      if (updatesData.status === 'fulfilled') {
        const updates = Array.isArray(updatesData.value.data) ? updatesData.value.data : [];
        setTaskUpdates(updates);
      }
      
      // 处理时间线数据
      if (timelineData.status === 'fulfilled') {
        const timeline = Array.isArray(timelineData.value.data) ? timelineData.value.data : [];
        setTimelineEvents(timeline);
      }
      
    } catch (error) {
      console.error('Error loading task data:', error);
    } finally {
      setDataLoading(false);
    }
  }, [projectId, taskId, task]);

  // 计算完成统计
  const calculateCompletionStats = (children: Task[]) => {
    const stats = {
      totalSubtasks: children.length,
      completedSubtasks: children.filter(t => t.status === 'completed').length,
      inProgressSubtasks: children.filter(t => t.status === 'in_progress').length,
      todoSubtasks: children.filter(t => t.status === 'todo').length,
      completionRate: 0
    };
    
    if (stats.totalSubtasks > 0) {
      stats.completionRate = Math.round((stats.completedSubtasks / stats.totalSubtasks) * 100);
    }
    
    setCompletionStats(stats);
  };

  useEffect(() => {
    if (projectId && taskId) {
      loadTask();
    }
  }, [projectId, taskId, loadTask]);

  // 状态颜色映射
  const getStatusConfig = (status: string) => {
    const configs = {
      todo: { 
        color: '#d9d9d9', 
        text: '待开始', 
        icon: <PauseCircleOutlined />,
        bgColor: '#fafafa'
      },
      in_progress: { 
        color: '#1890ff', 
        text: '进行中', 
        icon: <PlayCircleOutlined />,
        bgColor: '#e6f7ff'
      },
      completed: { 
        color: '#52c41a', 
        text: '已完成', 
        icon: <CheckCircleOutlined />,
        bgColor: '#f6ffed'
      },
      cancelled: { 
        color: '#ff4d4f', 
        text: '已取消', 
        icon: <StopOutlined />,
        bgColor: '#fff2f0'
      }
    };
    return configs[status as keyof typeof configs] || configs.todo;
  };

  // 优先级颜色
  const getPriorityConfig = (priority: string) => {
    const configs = {
      high: { color: '#ff4d4f', text: '高' },
      medium: { color: '#fa8c16', text: '中' },
      low: { color: '#52c41a', text: '低' }
    };
    return configs[priority as keyof typeof configs] || { color: '#d9d9d9', text: '未知' };
  };

  // 计算剩余时间
  const getTimeRemaining = () => {
    if (!task?.due_date) return null;
    
    const now = dayjs();
    const dueDate = dayjs(task.due_date);
    const diffDays = dueDate.diff(now, 'day');
    
    if (diffDays < 0) {
      return { text: `已逾期 ${Math.abs(diffDays)} 天`, type: 'danger' };
    } else if (diffDays === 0) {
      return { text: '今天到期', type: 'warning' };
    } else if (diffDays <= 3) {
      return { text: `${diffDays} 天后到期`, type: 'warning' };
    } else {
      return { text: `${diffDays} 天后到期`, type: 'normal' };
    }
  };

  const handleEditTask = () => {
    setEditModalVisible(true);
  };

  const handleUpdateTask = async (taskData: any) => {
    if (!task || !projectId) return;
    
    const parsedProjectId = parseInt(projectId);
    if (isNaN(parsedProjectId)) {
      message.error('无效的项目ID');
      return;
    }
    
    try {
      setModalLoading(true);
      await TaskService.updateTask(parsedProjectId, task.id, taskData);
      message.success('任务更新成功');
      setEditModalVisible(false);
      loadTask();
    } catch (error) {
      message.error('任务更新失败');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteTask = () => {
    if (!task || !projectId) return;
    
    const parsedProjectId = parseInt(projectId);
    if (isNaN(parsedProjectId)) {
      message.error('无效的项目ID');
      return;
    }
    
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除任务"${task.title}"吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await TaskService.deleteTask(parsedProjectId, task.id);
          message.success('任务删除成功');
          navigate('/tasks');
        } catch (error) {
          message.error('任务删除失败');
        }
      },
    });
  };

  const handleCreateSubtask = () => {
    setCreateSubtaskModalVisible(true);
  };

  const handleCreateSubtaskSubmit = async (taskData: any) => {
    if (!task || !projectId) return;
    
    const parsedProjectId = parseInt(projectId);
    if (isNaN(parsedProjectId)) {
      message.error('无效的项目ID');
      return;
    }
    
    try {
      setModalLoading(true);
      // 添加parent_id到任务数据
      const subtaskData = {
        ...taskData,
        parent_id: task.id
      };
      
      await TaskService.createTask(parsedProjectId, subtaskData);
      message.success('子任务创建成功');
      setCreateSubtaskModalVisible(false);
      
      // 重新加载所有数据
      loadTask();
    } catch (error) {
      message.error('子任务创建失败');
    } finally {
      setModalLoading(false);
    }
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

  const statusConfig = getStatusConfig(task.status);
  const priorityConfig = getPriorityConfig(task.custom_fields?.priority as string || 'medium');
  const timeRemaining = getTimeRemaining();

  // 子任务表格列定义
  const subtaskColumns = [
    {
      title: '任务名称',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Task) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {getStatusConfig(record.status).icon}
          <span>{text}</span>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config = getStatusConfig(status);
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('MM-DD HH:mm'),
    },
  ];

  return (
    <div className="task-detail-container" style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* 面包屑导航 */}
      <Breadcrumb 
        style={{ 
          marginBottom: '16px',
          fontSize: '14px',
          lineHeight: '22px'
        }}
        items={[
          {
            title: (
              <span 
                onClick={() => navigate('/tasks')}
                style={{ 
                  color: '#1890ff',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '0',
                  fontSize: '14px',
                  lineHeight: '22px'
                }}
              >
                <ArrowLeftOutlined style={{ fontSize: '12px' }} />
                任务列表
              </span>
            )
          },
          {
            title: (
              <span style={{ fontSize: '14px', lineHeight: '22px' }}>
                任务详情
              </span>
            )
          }
        ]}
      />

      <Row gutter={[24, 24]}>
        {/* 左侧主要内容 */}
        <Col xs={24} lg={16}>
          {/* 任务核心信息卡片 */}
          <Card 
            className="task-status-card"
            style={{ 
              marginBottom: '24px',
              background: statusConfig.bgColor,
              border: `2px solid ${statusConfig.color}`
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '24px', color: statusConfig.color }}>
                    {statusConfig.icon}
                  </div>
                  <Title level={2} style={{ margin: 0, color: '#262626' }}>
                    {task.title}
                  </Title>
                  <Tag color={statusConfig.color} style={{ fontSize: '14px', padding: '4px 12px' }}>
                    {statusConfig.text}
                  </Tag>
                </div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <TagOutlined style={{ color: '#666' }} />
                    <Text>优先级:</Text>
                    <Tag color={priorityConfig.color}>{priorityConfig.text}</Tag>
                  </div>
                  
                  {task.assignee_id && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserOutlined style={{ color: '#666' }} />
                      <Text>负责人: 用户 {task.assignee_id}</Text>
                    </div>
                  )}
                  
                  {timeRemaining && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CalendarOutlined style={{ 
                        color: timeRemaining.type === 'danger' ? '#ff4d4f' : 
                               timeRemaining.type === 'warning' ? '#fa8c16' : '#666' 
                      }} />
                      <Text style={{ 
                        color: timeRemaining.type === 'danger' ? '#ff4d4f' : 
                               timeRemaining.type === 'warning' ? '#fa8c16' : '#666' 
                      }}>
                        {timeRemaining.text}
                      </Text>
                    </div>
                  )}
                </div>

                {task.description && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <FileTextOutlined style={{ color: '#666' }} />
                      <Text strong>任务描述</Text>
                    </div>
                    <Paragraph style={{ 
                      background: 'rgba(255,255,255,0.8)', 
                      padding: '12px', 
                      borderRadius: '6px',
                      margin: 0 
                    }}>
                      {task.description}
                    </Paragraph>
                  </div>
                )}

                {/* 标签 */}
                {task.custom_fields?.tags && Array.isArray(task.custom_fields.tags) && task.custom_fields.tags.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <Text type="secondary" style={{ marginRight: '8px' }}>标签:</Text>
                    <Space wrap>
                      {task.custom_fields.tags.map((tag: string, index: number) => (
                        <Tag key={index} color="blue">{tag}</Tag>
                      ))}
                    </Space>
                  </div>
                )}
              </div>

              <Space>
                <Button type="primary" icon={<EditOutlined />} onClick={handleEditTask}>
                  编辑
                </Button>
                <Button danger icon={<DeleteOutlined />} onClick={handleDeleteTask}>
                  删除
                </Button>
              </Space>
            </div>
          </Card>

          {/* 完成情况统计 - 如果有子任务 */}
          {completionStats.totalSubtasks > 0 && (
            <Card title="任务完成情况" style={{ marginBottom: '24px' }}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <div style={{ textAlign: 'center' }}>
                    <Progress
                      type="circle"
                      percent={completionStats.completionRate}
                      size={120}
                      format={() => `${completionStats.completedSubtasks}/${completionStats.totalSubtasks}`}
                      strokeColor={{
                        '0%': '#108ee9',
                        '100%': '#87d068',
                      }}
                    />
                    <div style={{ marginTop: '12px' }}>
                      <Text strong style={{ fontSize: '16px' }}>
                        {completionStats.completionRate}% 完成
                      </Text>
                    </div>
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Statistic
                      title="已完成子任务"
                      value={completionStats.completedSubtasks}
                      suffix={`/ ${completionStats.totalSubtasks}`}
                      valueStyle={{ color: '#52c41a' }}
                      prefix={<CheckCircleOutlined />}
                    />
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div>
                        <Badge color="#1890ff" text={`进行中 ${completionStats.inProgressSubtasks}`} />
                      </div>
                      <div>
                        <Badge color="#d9d9d9" text={`待开始 ${completionStats.todoSubtasks}`} />
                      </div>
                    </div>
                  </Space>
                </Col>
              </Row>
            </Card>
          )}

          {/* 子任务列表 */}
          {subtasks.length > 0 && (
            <Card 
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BranchesOutlined />
                  <span>子任务列表</span>
                  <Badge count={subtasks.length} style={{ backgroundColor: '#52c41a' }} />
                </div>
              }
              style={{ marginBottom: '24px' }}
              extra={
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  size="small"
                  onClick={handleCreateSubtask}
                >
                  添加子任务
                </Button>
              }
            >
              <Table
                columns={subtaskColumns}
                dataSource={subtasks}
                rowKey="id"
                pagination={false}
                size="small"
                loading={dataLoading}
                onRow={(record) => ({
                  onClick: () => {
                    // 使用子任务自己的project_id，因为可能存在跨项目的任务关系
                    const targetProjectId = record.project_id || projectId;
                    navigate(`/projects/${targetProjectId}/tasks/${record.id}`);
                  },
                  style: { cursor: 'pointer' }
                })}
              />
            </Card>
          )}

          {/* 更新历史 */}
          {taskUpdates.length > 0 && (
            <Card 
              title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HistoryOutlined />
                    <span>更新历史</span>
                    <Badge count={taskUpdates.length} style={{ backgroundColor: '#1890ff' }} />
                  </div>
                  {taskUpdates.length > 5 && (
                    <Button 
                      type="link" 
                      size="small"
                      onClick={() => {/* 查看完整历史 */}}
                    >
                      查看全部 ({taskUpdates.length})
                    </Button>
                  )}
                </div>
              }
              style={{ marginBottom: '24px' }}
            >
              <Timeline>
                {taskUpdates.slice(0, 5).map((update, index) => {
                  // 获取更新类型的详细信息
                  const getUpdateTypeInfo = (type: string) => {
                    const types = {
                      'status': { icon: '🔄', text: '状态变更', color: 'blue' },
                      'priority': { icon: '🔥', text: '优先级调整', color: 'orange' },
                      'assignee': { icon: '👤', text: '负责人变更', color: 'green' },
                      'due_date': { icon: '📅', text: '截止时间调整', color: 'purple' },
                      'description': { icon: '📝', text: '描述更新', color: 'cyan' },
                      'title': { icon: '✏️', text: '标题修改', color: 'geekblue' },
                      'tags': { icon: '🏷️', text: '标签变更', color: 'magenta' },
                      'custom_fields': { icon: '⚙️', text: '自定义字段更新', color: 'volcano' },
                      'created': { icon: '✨', text: '任务创建', color: 'green' },
                      'completed': { icon: '✅', text: '任务完成', color: 'green' },
                      'archived': { icon: '📦', text: '任务归档', color: 'default' }
                    };
                    return types[type as keyof typeof types] || { icon: '📄', text: '信息更新', color: 'gray' };
                  };

                  const updateInfo = getUpdateTypeInfo(update.update_type);
                  
                  // 解析变更详情
                  const getChangeDetails = (update: any) => {
                    try {
                      if (update.old_value && update.new_value) {
                        const oldVal = typeof update.old_value === 'string' ? update.old_value : JSON.stringify(update.old_value);
                        const newVal = typeof update.new_value === 'string' ? update.new_value : JSON.stringify(update.new_value);
                        
                        if (update.update_type === 'status') {
                          const statusMap = {
                            'todo': '待开始',
                            'in_progress': '进行中', 
                            'completed': '已完成',
                            'cancelled': '已取消'
                          };
                          return `${statusMap[oldVal as keyof typeof statusMap] || oldVal} → ${statusMap[newVal as keyof typeof statusMap] || newVal}`;
                        }
                        
                        if (update.update_type === 'priority') {
                          const priorityMap = { 'low': '低', 'medium': '中', 'high': '高' };
                          return `${priorityMap[oldVal as keyof typeof priorityMap] || oldVal} → ${priorityMap[newVal as keyof typeof priorityMap] || newVal}`;
                        }
                        
                        if (update.update_type === 'due_date') {
                          const oldDate = oldVal ? dayjs(oldVal).format('YYYY-MM-DD') : '未设置';
                          const newDate = newVal ? dayjs(newVal).format('YYYY-MM-DD') : '未设置';
                          return `${oldDate} → ${newDate}`;
                        }
                        
                        return `"${oldVal}" → "${newVal}"`;
                      }
                      return null;
                    } catch {
                      return null;
                    }
                  };

                  const changeDetails = getChangeDetails(update);
                  const timeAgo = dayjs(update.created_at).fromNow();

                  return (
                    <Timeline.Item
                      key={index}
                      color={updateInfo.color}
                      dot={
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: '#fff',
                          border: `2px solid ${updateInfo.color === 'blue' ? '#1890ff' : 
                                                updateInfo.color === 'green' ? '#52c41a' :
                                                updateInfo.color === 'orange' ? '#fa8c16' :
                                                updateInfo.color === 'purple' ? '#722ed1' : '#8c8c8c'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px'
                        }}>
                          {updateInfo.icon}
                        </div>
                      }
                    >
                      <div style={{ marginLeft: '8px' }}>
                        {/* 更新标题 */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Text strong style={{ color: '#262626' }}>
                              {updateInfo.text}
                            </Text>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {dayjs(update.created_at).format('MM-DD HH:mm')}
                            </Text>
                          </div>
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            {timeAgo}
                          </Text>
                        </div>
                        
                        {/* 操作人信息 - 移到顶部 */}
                        {(update.updated_by_username || update.updated_by) && (
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            marginBottom: '8px',
                            padding: '6px 10px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '16px',
                            width: 'fit-content',
                            border: '1px solid #e8e8e8'
                          }}>
                            <Avatar 
                              size={18} 
                              icon={<UserOutlined />}
                              style={{ 
                                backgroundColor: '#1890ff', 
                                fontSize: '10px'
                              }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              <Text style={{ fontSize: '12px', color: '#333', fontWeight: 500 }}>
                                {update.updated_by_username || `用户${update.updated_by}`}
                              </Text>
                              {update.updated_by && (
                                <Text type="secondary" style={{ fontSize: '10px', lineHeight: 1 }}>
                                  ID: {update.updated_by}
                                </Text>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* 变更详情 */}
                        {changeDetails && (
                          <div style={{ 
                            marginBottom: '6px',
                            padding: '6px 10px',
                            backgroundColor: '#f5f5f5',
                            borderRadius: '4px',
                            fontSize: '13px',
                            fontFamily: 'monospace'
                          }}>
                            {changeDetails}
                          </div>
                        )}
                        
                        {/* 更新备注 */}
                        {update.notes && (
                          <div style={{ 
                            marginTop: '6px',
                            padding: '8px 12px',
                            backgroundColor: '#fafafa',
                            borderLeft: '3px solid #1890ff',
                            borderRadius: '0 4px 4px 0',
                            fontSize: '13px',
                            lineHeight: '1.4'
                          }}>
                            <Text style={{ color: '#595959' }}>{update.notes}</Text>
                          </div>
                        )}
                      </div>
                    </Timeline.Item>
                  );
                })}
              </Timeline>
              
              {taskUpdates.length === 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px 20px',
                  color: '#8c8c8c'
                }}>
                  <HistoryOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
                  <div>暂无更新历史</div>
                </div>
              )}
            </Card>
          )}
        </Col>

        {/* 右侧信息面板 */}
        <Col xs={24} lg={8}>
          {/* 基本信息 */}
          <Card title="基本信息" style={{ marginBottom: '16px' }}>
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
              {task.parent_id && (
                <Descriptions.Item label="父任务">
                  {parentTask ? (
                    <Button 
                      type="link" 
                      style={{ padding: 0, height: 'auto', fontSize: '14px' }}
                      onClick={() => navigate(`/projects/${task.project_id}/tasks/${task.parent_id}`)}
                    >
                      {parentTask.title} (#{task.parent_id})
                    </Button>
                  ) : (
                    `任务 #${task.parent_id}`
                  )}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="创建时间">
                {dayjs(task.created_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {dayjs(task.updated_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              {task.due_date && (
                <Descriptions.Item label="截止时间">
                  {dayjs(task.due_date).format('YYYY-MM-DD')}
                </Descriptions.Item>
              )}
              {task.custom_fields?.estimated_hours && (
                <Descriptions.Item label="预估工时">
                  {task.custom_fields.estimated_hours} 小时
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* 快速操作 */}
          <Card title="快速操作" style={{ marginBottom: '16px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                block 
                icon={<BranchesOutlined />}
                onClick={handleCreateSubtask}
              >
                创建子任务
              </Button>
              <Button 
                block 
                icon={<HistoryOutlined />}
                onClick={() => {/* 查看完整历史 */}}
              >
                查看完整历史
              </Button>
              <Button 
                block 
                icon={<ClockCircleOutlined />}
                onClick={() => {/* 时间线视图 */}}
              >
                时间线视图
              </Button>
            </Space>
          </Card>

          {/* 任务提醒 */}
          {timeRemaining && timeRemaining.type !== 'normal' && (
            <Alert
              message={timeRemaining.type === 'danger' ? '任务已逾期' : '任务即将到期'}
              description={timeRemaining.text}
              type={timeRemaining.type === 'danger' ? 'error' : 'warning'}
              icon={<WarningOutlined />}
              style={{ marginBottom: '16px' }}
              showIcon
            />
          )}
        </Col>
      </Row>

      {/* 编辑任务模态框 */}
      {task && editModalVisible && projectId && !isNaN(parseInt(projectId)) && (
        <TaskModal
          visible={editModalVisible}
          task={task}
          projectId={parseInt(projectId)}
          onOk={handleUpdateTask}
          onCancel={() => setEditModalVisible(false)}
          loading={modalLoading}
        />
      )}

      {/* 创建子任务模态框 */}
      {createSubtaskModalVisible && projectId && !isNaN(parseInt(projectId)) && (
        <TaskModal
          visible={createSubtaskModalVisible}
          projectId={parseInt(projectId)}
          onOk={handleCreateSubtaskSubmit}
          onCancel={() => setCreateSubtaskModalVisible(false)}
          loading={modalLoading}
          parentTask={task}
        />
      )}
    </div>
  );
};

export default TaskDetailPageNew;