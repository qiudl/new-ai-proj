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
  Typography,
  Tabs,
  Pagination
} from 'antd';
import { 
  EditOutlined, 
  DeleteOutlined, 
  ArrowLeftOutlined, 
  PlusOutlined, 
  ImportOutlined,
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
  WarningOutlined,
  FolderOutlined,
  UploadOutlined,
  EyeOutlined,
  DownloadOutlined,
  InboxOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { TaskService } from '../services/taskService';
import { projectService } from '../services/projectService';
import api from '../services/api';
import { Task, TaskUpdate, TimelineEvent } from '../types/task';
import TaskModal from '../components/TaskModal';
import TaskArchiveModal from '../components/TaskArchiveModal';
import TaskTimeline from '../components/TaskTimeline';
import MarkdownRenderer from '../components/MarkdownRenderer';
import TaskInfoEditor from '../components/TaskInfoEditor';
import TaskSummaryEditor from '../components/TaskSummaryEditor';
// 🔽 UPDATED: 使用全局计时器
import MVPTaskDetailTimer from '../components/MVPTaskDetailTimer';
import TaskDocumentEditor from '../components/TaskDocumentEditor';
import TaskGanttChart from '../components/TaskGanttChart';
import BulkSubTaskCreator from '../components/BulkSubTaskCreator';
import TaskDocumentWidget from '../components/TaskDocumentWidget';
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
  const location = useLocation();
  
  // 核心状态
  const [task, setTask] = useState<Task | null>(null);
  const [documentExists, setDocumentExists] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 从URL参数读取活动Tab
  const getActiveTabFromURL = () => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('tab') || 'info';
  };
  const [activeTab, setActiveTab] = useState(getActiveTabFromURL());
  // 统一的任务模态框状态管理
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState<'edit' | 'createSubtask' | 'createSibling'>('edit');
  const [modalLoading, setModalLoading] = useState(false);
  const [archiveModalVisible, setArchiveModalVisible] = useState(false);
  const [timelineActiveTab, setTimelineActiveTab] = useState('timeline'); // 'timeline', 'history'
  
  // 批量子任务创建状态
  const [bulkSubTaskModalVisible, setBulkSubTaskModalVisible] = useState(false);
  
  // 附加数据状态
  const [projectInfo, setProjectInfo] = useState<any>(null);
  const [parentTask, setParentTask] = useState<Task | null>(null);
  const [siblingTasks, setSiblingTasks] = useState<Task[]>([]);
  
  // 关联任务状态
  const [relatedTasks, setRelatedTasks] = useState<Task[]>([]);
  const [relatedTasksLoading, setRelatedTasksLoading] = useState(false);
  const [relatedTasksPage, setRelatedTasksPage] = useState(1);
  const [relatedTasksTotal, setRelatedTasksTotal] = useState(0);
  const pageSize = 8;
  
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
  
  // 检查特定任务的文档是否存在
  const checkDocumentExistsForTask = useCallback(async (taskData: Task) => {
    if (!taskData || !projectId) return;

    try {
      // 使用GET请求代替HEAD，因为api服务更好地处理GET请求
      const response = await api.get(`/projects/${projectId}/tasks/${taskData.id}/documents`);
      setDocumentExists(true);
    } catch (error: Error | unknown) {
      console.error('检查文档状态失败:', error);
      // 404表示文档不存在，这是正常情况
      if (error.status === 404) {
        setDocumentExists(false);
      } else {
        setDocumentExists(false);
      }
    }
  }, [projectId]);

  // 检查文档是否存在
  const checkDocumentExists = useCallback(async () => {
    if (!task || !projectId) return;
    await checkDocumentExistsForTask(task);
  }, [task, projectId, checkDocumentExistsForTask]);

  // 加载任务基本信息
  const loadTask = useCallback(async () => {
    if (!projectId || !taskId) return;
    
    // 验证参数
    const parsedProjectId = parseInt(projectId);
    const parsedTaskId = parseInt(taskId);
    
    if (isNaN(parsedProjectId) || isNaN(parsedTaskId)) {
      message.error('无效的任务ID或项目ID');
      navigate('/task-documents');
      return;
    }
    
    try {
      setLoading(true);
      const taskData = await TaskService.getTask(parsedProjectId, parsedTaskId);
      setTask(taskData);
      // 任务加载完成后检查文档状态
      setTimeout(() => checkDocumentExistsForTask(taskData), 100);
      
      // 并行加载其他数据，直接传递taskData
      loadAllTaskDataWithTask(taskData);
    } catch (error) {
      message.error('获取任务详情失败');
      console.error('Error loading task:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, taskId, navigate]);

  // 并行加载所有任务数据（使用当前task状态）
  const loadAllTaskData = useCallback(async () => {
    if (!projectId || !taskId || !task) return;
    await loadAllTaskDataWithTask(task);
  }, [projectId, taskId, task]);

  // 并行加载所有任务数据（使用传入的task参数）
  const loadAllTaskDataWithTask = useCallback(async (taskData: Task) => {
    if (!projectId || !taskId || !taskData) return;
    
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
      
      // 单独获取父任务信息和兄弟任务
      if (taskData.parent_id) {
        try {
          const parentTaskInfo = await TaskService.getTask(parsedProjectId, taskData.parent_id);
          setParentTask(parentTaskInfo);
          
          // 获取兄弟任务（相同父任务的其他子任务）
          const siblings = await TaskService.getTaskChildren(parsedProjectId, taskData.parent_id);
          const filteredSiblings = Array.isArray(siblings) 
            ? siblings.filter((sibling: Task) => sibling.id !== taskData.id)
            : [];
          setSiblingTasks(filteredSiblings);
        } catch (error) {
          console.error('Error loading parent task:', error);
        }
      } else {
        // 如果是根任务，获取同级的其他根任务作为兄弟任务
        try {
          const rootTasks = await TaskService.getRootTasks(parsedProjectId);
          const filteredRootSiblings = Array.isArray(rootTasks) 
            ? rootTasks.filter((rootTask: Task) => rootTask.id !== taskData.id)
            : [];
          setSiblingTasks(filteredRootSiblings);
        } catch (error) {
          console.error('Error loading root tasks:', error);
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
  }, [projectId, taskId]);

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

  // 加载关联任务
  const loadRelatedTasks = useCallback(async (page: number = 1) => {
    if (!task || !projectId) return;
    
    const parsedProjectId = parseInt(projectId);
    if (isNaN(parsedProjectId)) return;
    
    try {
      setRelatedTasksLoading(true);
      
      // 获取同项目下的其他任务
      const tasksResponse = await TaskService.getTasks(parsedProjectId, {
        page,
        page_size: pageSize
      });
      
      if (tasksResponse && tasksResponse.data) {
        const allTasks = Array.isArray(tasksResponse.data) ? tasksResponse.data : [];
        // 排除当前任务
        const tasks = allTasks.filter(t => t.id !== task.id);
        
        // 根据关联性排序任务
        const sortedTasks = tasks.sort((a: Task, b: Task) => {
          // 1. 相同状态的任务优先
          if (a.status === task.status && b.status !== task.status) return -1;
          if (b.status === task.status && a.status !== task.status) return 1;
          
          // 2. 相同优先级的任务其次
          const aPriority = a.custom_fields?.priority || 'medium';
          const bPriority = b.custom_fields?.priority || 'medium';
          const taskPriority = task.custom_fields?.priority || 'medium';
          if (aPriority === taskPriority && bPriority !== taskPriority) return -1;
          if (bPriority === taskPriority && aPriority !== taskPriority) return 1;
          
          // 3. 相同负责人的任务
          if (a.assignee_id === task.assignee_id && b.assignee_id !== task.assignee_id) return -1;
          if (b.assignee_id === task.assignee_id && a.assignee_id !== task.assignee_id) return 1;
          
          // 4. 最后按更新时间排序
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
        
        setRelatedTasks(sortedTasks);
        setRelatedTasksTotal(tasksResponse.pagination?.total || tasks.length);
      }
    } catch (error) {
      console.error('Failed to load related tasks:', error);
      message.error('加载关联任务失败');
    } finally {
      setRelatedTasksLoading(false);
    }
  }, [task, projectId, pageSize]);

  // 处理关联任务分页
  const handleRelatedTasksPageChange = useCallback((page: number) => {
    setRelatedTasksPage(page);
    loadRelatedTasks(page);
  }, [loadRelatedTasks]);

  useEffect(() => {
    if (projectId && taskId) {
      loadTask();
    }
  }, [projectId, taskId, loadTask]);

  // 监听URL变化，更新activeTab
  useEffect(() => {
    setActiveTab(getActiveTabFromURL());
  }, [location.search]);

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
    setTaskModalMode('edit');
    setTaskModalVisible(true);
  };

  const handleUpdateTask = async (taskData: unknown) => {
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
      setTaskModalVisible(false);
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
          // 跳转到该任务所属的项目详情页
          navigate(`/projects/${parsedProjectId}`);
        } catch (error) {
          message.error('任务删除失败');
        }
      },
    });
  };

  const handleCreateSubtask = () => {
    setTaskModalMode('createSubtask');
    setTaskModalVisible(true);
  };

  const handleCreateSibling = () => {
    setTaskModalMode('createSibling');
    setTaskModalVisible(true);
  };

  // 批量导入子任务处理函数
  const handleBulkImportSubtasks = () => {
    if (!task || !projectId) {
      message.error('任务信息不完整，无法进行批量导入');
      return;
    }
    
    // 跳转到批量导入页面，带上父任务参数
    navigate(`/projects/${projectId}/bulk-import?parentTaskId=${task.id}`);
  };

  // 归档任务处理函数
  const handleArchiveTask = () => {
    setArchiveModalVisible(true);
  };

  // 归档成功处理
  const handleArchiveSuccess = () => {
    setArchiveModalVisible(false);
    message.success('任务已归档');
    // 返回到任务列表
    navigate(`/projects/${projectId}/tasks`);
  };

  // 手工批量创建子任务处理函数
  const handleBulkCreateSubTasks = () => {
    setBulkSubTaskModalVisible(true);
  };

  // 批量创建子任务成功处理
  const handleBulkSubTaskSuccess = () => {
    setBulkSubTaskModalVisible(false);
    message.success('批量创建子任务成功');
    // 重新加载任务数据
    loadTask();
  };

  // 统一的任务模态框提交处理
  const handleTaskModalSubmit = async (taskData: unknown) => {
    if (taskModalMode === 'edit') {
      await handleUpdateTask(taskData);
    } else if (taskModalMode === 'createSubtask') {
      await handleCreateSubtaskSubmit(taskData);
    } else if (taskModalMode === 'createSibling') {
      await handleCreateSiblingSubmit(taskData);
    }
  };

  const handleCreateSubtaskSubmit = async (taskData: unknown) => {
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
      setTaskModalVisible(false);
      
      // 重新加载所有数据
      loadTask();
    } catch (error) {
      message.error('子任务创建失败');
    } finally {
      setModalLoading(false);
    }
  };

  const handleCreateSiblingSubmit = async (taskData: unknown) => {
    if (!task || !projectId) return;
    
    const parsedProjectId = parseInt(projectId);
    if (isNaN(parsedProjectId)) {
      message.error('无效的项目ID');
      return;
    }
    
    try {
      setModalLoading(true);
      // 使用当前任务的parent_id作为兄弟任务的parent_id
      const siblingData = {
        ...taskData,
        parent_id: task.parent_id || null // 如果当前任务是根任务，兄弟任务也是根任务
      };
      
      await TaskService.createTask(parsedProjectId, siblingData);
      message.success('兄弟任务创建成功');
      setTaskModalVisible(false);
      
      // 重新加载所有数据
      loadTask();
    } catch (error) {
      message.error('兄弟任务创建失败');
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
      title: '任务ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a: Task, b: Task) => a.id - b.id,
      render: (id: number) => (
        <Text code style={{ fontSize: '12px' }}>#{id}</Text>
      ),
    },
    {
      title: '任务名称',
      dataIndex: 'title',
      key: 'title',
      sorter: (a: Task, b: Task) => a.title.localeCompare(b.title, 'zh-CN'),
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
      width: 100,
      sorter: (a: Task, b: Task) => {
        const statusOrder = { 'todo': 0, 'in_progress': 1, 'completed': 2, 'cancelled': 3 };
        return (statusOrder[a.status as keyof typeof statusOrder] || 0) - 
               (statusOrder[b.status as keyof typeof statusOrder] || 0);
      },
      render: (status: string) => {
        const config = getStatusConfig(status);
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      sorter: (a: Task, b: Task) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
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
          // 返回按钮和项目任务根节点
          {
            title: (
              <span 
                onClick={() => navigate(`/projects/${projectId}`)}
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
                项目任务
              </span>
            )
          },
          // 如果有父任务，显示父任务链接
          ...(task.parent_id && parentTask ? [{
            title: (
              <span 
                onClick={() => navigate(`/projects/${task.project_id}/tasks/${task.parent_id}`)}
                style={{ 
                  color: '#1890ff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  lineHeight: '22px'
                }}
              >
                {parentTask.title}
              </span>
            )
          }] : []),
          // 当前任务名称
          {
            title: (
              <span style={{ 
                fontSize: '14px', 
                lineHeight: '22px',
                color: '#8c8c8c',
                fontWeight: 500
              }}>
                {task.title}
              </span>
            )
          }
        ]}
      />

      <Row gutter={[24, 24]}>
        {/* 左侧主要内容 */}
        <Col xs={24} sm={24} md={24} lg={16} xl={16}>
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

                {/* 任务摘要（AI提炼） */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <FileTextOutlined style={{ color: '#666' }} />
                    <Text strong>任务摘要</Text>
                  </div>
                  <div style={{ 
                    background: 'rgba(255,255,255,0.8)', 
                    padding: '12px', 
                    borderRadius: '6px',
                    margin: 0 
                  }}>
                    <TaskSummaryEditor
                      summary={task.custom_fields?.task_summary || ''}
                      description={task.description || ''}
                      onUpdate={async (summary) => {
                        const updateData = {
                          custom_fields: {
                            ...task.custom_fields,
                            task_summary: summary
                          }
                        };
                        await handleUpdateTask(updateData);
                      }}
                      loading={modalLoading}
                    />
                  </div>
                </div>

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
                <Tooltip title="编辑任务">
                  <Button type="primary" icon={<EditOutlined />} onClick={handleEditTask} />
                </Tooltip>
                <Tooltip title="删除任务">
                  <Button danger icon={<DeleteOutlined />} onClick={handleDeleteTask} />
                </Tooltip>
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
                <Space size="small">
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    size="small"
                    onClick={handleCreateSubtask}
                  >
                    添加子任务
                  </Button>
                  <Button 
                    type="default" 
                    icon={<ImportOutlined />} 
                    size="small"
                    onClick={handleBulkImportSubtasks}
                  >
                    批量导入
                  </Button>
                </Space>
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

          {/* 任务详情Tabs */}
          <Card style={{ marginBottom: '24px' }}>
            <Tabs
              activeKey={activeTab}
              onChange={(key) => {
                setActiveTab(key);
                // 更新URL但不刷新页面
                const searchParams = new URLSearchParams(location.search);
                if (key === 'info') {
                  searchParams.delete('tab');
                } else {
                  searchParams.set('tab', key);
                }
                const newSearch = searchParams.toString();
                const newUrl = `${location.pathname}${newSearch ? `?${newSearch}` : ''}`;
                window.history.replaceState(null, '', newUrl);
              }}
              type="card"
              size="large"
              items={[
                {
                  key: 'info',
                  label: (
                    <Space>
                      <FileTextOutlined />
                      <span>任务信息</span>
                    </Space>
                  ),
                  children: (
                    <TaskInfoEditor
                      task={task}
                      onUpdate={handleUpdateTask}
                      loading={modalLoading}
                    />
                  )
                },
                {
                  key: 'document',
                  label: (
                    <Space>
                      <EditOutlined />
                      <span>任务文档</span>
                      {documentExists === true && (
                        <Badge status="success" />
                      )}
                      {documentExists === false && (
                        <Badge status="default" />
                      )}
                    </Space>
                  ),
                  children: (
                    <div style={{ minHeight: '500px' }}>
                      <TaskDocumentEditor
                        taskId={task.id}
                        projectId={parseInt(projectId || '0')}
                        onSave={(content) => {
                          // 文档保存成功后更新状态
                          setDocumentExists(true);
                          // 不在这里显示成功消息，让TaskDocumentEditor自己处理
                        }}
                        style={{ height: '500px' }}
                      />
                    </div>
                  )
                },
                {
                  key: 'gantt',
                  label: (
                    <Space>
                      <BarChartOutlined />
                      <span>甘特图</span>
                      {subtasks.length > 0 && (
                        <Badge count={subtasks.length} size="small" style={{ backgroundColor: '#722ed1' }} />
                      )}
                    </Space>
                  ),
                  children: (
                    <div style={{ minHeight: '500px' }}>
                      <TaskGanttChart
                        parentTask={task}
                        projectId={parseInt(projectId || '0')}
                        style={{ border: 'none', boxShadow: 'none' }}
                      />
                    </div>
                  )
                }
              ]}
            />
          </Card>

        </Col>

        {/* 右侧信息面板 */}
        <Col xs={24} sm={24} md={24} lg={8} xl={8}>
          {/* 任务计时器 */}
          <MVPTaskDetailTimer
            taskId={task.id}
            taskTitle={task.title}
            taskStatus={task.status}
            projectId={projectId ? parseInt(projectId) : undefined}
            style={{ marginBottom: '16px' }}
          />
          
          {/* 任务文档小部件 */}
          <div style={{ marginBottom: '16px' }}>
            <TaskDocumentWidget
              projectId={parseInt(projectId || '0')}
              taskId={task.id}
              compact={false}
              showTitle={true}
            />
          </div>
          
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
                ) : task.project_name ? (
                  <Button 
                    type="link" 
                    style={{ padding: 0, height: 'auto', fontSize: '14px' }}
                    onClick={() => navigate(`/projects/${task.project_id}`)}
                  >
                    {task.project_name} (#{task.project_id})
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{dayjs(task.updated_at).format('YYYY-MM-DD HH:mm')}</span>
                  {(task.updated_by_username || task.updated_by) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#8c8c8c' }}>by</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Avatar 
                          size={16} 
                          icon={<UserOutlined />}
                          style={{ backgroundColor: '#1890ff', fontSize: '8px' }}
                        />
                        <span style={{ fontSize: '12px', color: '#595959' }}>
                          {task.updated_by_username || `用户${task.updated_by}`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
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
                icon={<BranchesOutlined />}
                onClick={handleCreateSibling}
                style={{ color: '#fa8c16', borderColor: '#fa8c16' }}
              >
                创建兄弟任务
              </Button>
              <Button 
                block 
                icon={<BranchesOutlined />}
                onClick={handleBulkCreateSubTasks}
                type="primary"
                ghost
              >
                手工批量创建子任务
              </Button>
              <Button 
                block 
                icon={<ImportOutlined />}
                onClick={handleBulkImportSubtasks}
              >
                批量导入任务
              </Button>
              <Button 
                block 
                icon={<InboxOutlined />}
                onClick={handleArchiveTask}
                style={{ marginTop: '8px' }}
              >
                归档任务
              </Button>
            </Space>
          </Card>

          {/* 相关任务 */}
          <Card 
            title={
              <Space>
                <BranchesOutlined />
                <span>相关任务</span>
                <Badge 
                  count={
                    (parentTask ? 1 : 0) + 
                    subtasks.length + 
                    siblingTasks.length
                  } 
                  showZero={false}
                  size="small"
                />
              </Space>
            }
            style={{ marginBottom: '16px' }}
          >
            <Space direction="vertical" style={{ width: '100%', gap: '16px' }}>
              {/* 父任务 */}
              {parentTask && (
                <div style={{ 
                  padding: '12px', 
                  background: '#f6ffed', 
                  borderRadius: '6px',
                  border: '1px solid #b7eb8f'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Badge status="processing" />
                    <Text strong style={{ fontSize: '13px', color: '#389e0d' }}>父任务</Text>
                  </div>
                  <Button 
                    type="link" 
                    style={{ 
                      padding: 0, 
                      height: 'auto', 
                      fontSize: '14px',
                      fontWeight: 500,
                      textAlign: 'left',
                      width: '100%',
                      justifyContent: 'flex-start'
                    }}
                    onClick={() => navigate(`/projects/${task.project_id}/tasks/${parentTask.id}`)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getStatusConfig(parentTask.status).icon}
                      <span>{parentTask.title}</span>
                    </div>
                  </Button>
                </div>
              )}

              {/* 子任务 */}
              {subtasks.length > 0 && (
                <div style={{ 
                  padding: '12px', 
                  background: '#e6f7ff', 
                  borderRadius: '6px',
                  border: '1px solid #91d5ff'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Badge status="processing" />
                    <Text strong style={{ fontSize: '13px', color: '#1890ff' }}>
                      子任务 ({subtasks.length})
                    </Text>
                    {subtasks.length > 3 && (
                      <Button 
                        type="link" 
                        size="small" 
                        style={{ fontSize: '12px', padding: 0 }}
                        onClick={() => {
                          // 滚动到主内容区的子任务表格
                          const subtaskTable = document.querySelector('.ant-table-wrapper');
                          if (subtaskTable) {
                            subtaskTable.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                      >
                        查看全部
                      </Button>
                    )}
                  </div>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {subtasks.slice(0, 3).map((subtask) => (
                      <Button 
                        key={subtask.id}
                        type="link" 
                        style={{ 
                          padding: '4px 8px', 
                          height: 'auto', 
                          fontSize: '13px',
                          textAlign: 'left',
                          width: '100%',
                          justifyContent: 'flex-start',
                          background: 'rgba(255,255,255,0.6)',
                          borderRadius: '4px'
                        }}
                        onClick={() => navigate(`/projects/${subtask.project_id}/tasks/${subtask.id}`)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {getStatusConfig(subtask.status).icon}
                          <span style={{ flex: 1, minWidth: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {subtask.title}
                          </span>
                        </div>
                      </Button>
                    ))}
                    {subtasks.length > 3 && (
                      <Text type="secondary" style={{ fontSize: '12px', paddingLeft: '8px' }}>
                        还有 {subtasks.length - 3} 个子任务...
                      </Text>
                    )}
                  </Space>
                </div>
              )}

              {/* 兄弟任务 */}
              {siblingTasks.length > 0 && (
                <div style={{ 
                  padding: '12px', 
                  background: '#fff7e6', 
                  borderRadius: '6px',
                  border: '1px solid #ffd591'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Badge status="default" />
                    <Text strong style={{ fontSize: '13px', color: '#d46b08' }}>
                      同级任务 ({siblingTasks.length})
                    </Text>
                  </div>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {siblingTasks.slice(0, 3).map((sibling) => (
                      <Button 
                        key={sibling.id}
                        type="link" 
                        style={{ 
                          padding: '4px 8px', 
                          height: 'auto', 
                          fontSize: '13px',
                          textAlign: 'left',
                          width: '100%',
                          justifyContent: 'flex-start',
                          background: 'rgba(255,255,255,0.6)',
                          borderRadius: '4px'
                        }}
                        onClick={() => navigate(`/projects/${sibling.project_id}/tasks/${sibling.id}`)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {getStatusConfig(sibling.status).icon}
                          <span style={{ flex: 1, minWidth: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {sibling.title}
                          </span>
                        </div>
                      </Button>
                    ))}
                    {siblingTasks.length > 3 && (
                      <Text type="secondary" style={{ fontSize: '12px', paddingLeft: '8px' }}>
                        还有 {siblingTasks.length - 3} 个同级任务...
                      </Text>
                    )}
                  </Space>
                </div>
              )}

              {/* 无相关任务时的提示 */}
              {!parentTask && subtasks.length === 0 && siblingTasks.length === 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '32px 20px', 
                  color: '#8c8c8c',
                  background: '#fafafa',
                  borderRadius: '6px',
                  border: '1px dashed #d9d9d9'
                }}>
                  <BranchesOutlined style={{ fontSize: '32px', marginBottom: '12px', color: '#d9d9d9' }} />
                  <div style={{ fontSize: '14px', marginBottom: '8px' }}>暂无相关任务</div>
                  <div style={{ fontSize: '12px', color: '#bfbfbf' }}>
                    您可以创建子任务来分解当前任务
                  </div>
                </div>
              )}
            </Space>
          </Card>

          {/* 任务详情分页 - 时间线和历史记录 */}
          <Card 
            title="任务详情"
            style={{ marginBottom: '16px' }}
          >
            <Tabs 
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: 'timeline',
                  label: (
                    <Space>
                      <ClockCircleOutlined />
                      时间线
                      {timelineEvents.length > 0 && (
                        <Badge count={timelineEvents.length} size="small" />
                      )}
                    </Space>
                  ),
                  children: timelineEvents.length > 0 ? (
                    <TaskTimeline 
                      events={timelineEvents}
                      onRefresh={() => loadAllTaskData()}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8c8c8c' }}>
                      <ClockCircleOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
                      <div>暂无时间线数据</div>
                    </div>
                  )
                },
                {
                  key: 'history',
                  label: (
                    <Space>
                      <HistoryOutlined />
                      更新历史
                      {taskUpdates.length > 0 && (
                        <Badge count={taskUpdates.length} size="small" />
                      )}
                    </Space>
                  ),
                  children: taskUpdates.length > 0 ? (
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      <Timeline>
                        {taskUpdates.map((update, index) => {
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
                          const getChangeDetails = (update: React.FormEvent | React.ChangeEvent<HTMLInputElement>) => {
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
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  backgroundColor: '#fff',
                                  border: `2px solid ${updateInfo.color === 'blue' ? '#1890ff' : 
                                                        updateInfo.color === 'green' ? '#52c41a' :
                                                        updateInfo.color === 'orange' ? '#fa8c16' :
                                                        updateInfo.color === 'purple' ? '#722ed1' : '#8c8c8c'}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '8px'
                                }}>
                                  {updateInfo.icon}
                                </div>
                              }
                            >
                              <div style={{ marginLeft: '4px' }}>
                                {/* 更新标题 */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                  <Text strong style={{ color: '#262626', fontSize: '13px' }}>
                                    {updateInfo.text}
                                  </Text>
                                  <Text type="secondary" style={{ fontSize: '10px' }}>
                                    {timeAgo}
                                  </Text>
                                </div>
                                
                                <div style={{ fontSize: '11px', color: '#8c8c8c', marginBottom: '4px' }}>
                                  {dayjs(update.created_at).format('MM-DD HH:mm')}
                                </div>
                                
                                {/* 操作人信息 */}
                                {(update.updated_by_username || update.updated_by) && (
                                  <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '6px', 
                                    marginBottom: '6px',
                                    padding: '4px 8px',
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: '12px',
                                    width: 'fit-content',
                                    border: '1px solid #e8e8e8'
                                  }}>
                                    <Avatar 
                                      size={14} 
                                      icon={<UserOutlined />}
                                      style={{ 
                                        backgroundColor: '#1890ff', 
                                        fontSize: '8px'
                                      }}
                                    />
                                    <Text style={{ fontSize: '11px', color: '#333', fontWeight: 500 }}>
                                      {update.updated_by_username || `用户${update.updated_by}`}
                                    </Text>
                                  </div>
                                )}
                                
                                {/* 变更详情 */}
                                {changeDetails && (
                                  <div style={{ 
                                    marginBottom: '4px',
                                    padding: '4px 8px',
                                    backgroundColor: '#f5f5f5',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontFamily: 'monospace'
                                  }}>
                                    {changeDetails}
                                  </div>
                                )}
                                
                                {/* 更新备注 */}
                                {update.notes && (
                                  <div style={{ 
                                    marginTop: '4px',
                                    padding: '6px 8px',
                                    backgroundColor: '#fafafa',
                                    borderLeft: '2px solid #1890ff',
                                    borderRadius: '0 4px 4px 0',
                                    fontSize: '11px',
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
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8c8c8c' }}>
                      <HistoryOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
                      <div>暂无历史记录</div>
                    </div>
                  )
                }
              ]}
            />
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


      {/* 统一的任务模态框 */}
      {taskModalVisible && projectId && !isNaN(parseInt(projectId)) && (
        <TaskModal
          visible={taskModalVisible}
          task={taskModalMode === 'edit' ? task : undefined}
          parentTask={taskModalMode === 'createSubtask' ? task : undefined}
          siblingTask={taskModalMode === 'createSibling' ? task : undefined}
          mode={taskModalMode}
          projectId={parseInt(projectId)}
          onOk={handleTaskModalSubmit}
          onCancel={() => setTaskModalVisible(false)}
          loading={modalLoading}
          allowParentSelection={true} // 始终允许父任务选择
          onEditDetails={() => {
            setTaskModalVisible(false);
            if (taskModalMode === 'edit') {
              // 编辑模式：跳转到当前任务的编辑页面
              navigate(`/projects/${projectId}/tasks/${taskId}/edit`);
            } else if (taskModalMode === 'createSubtask') {
              // 创建子任务模式：跳转到批量导入页面，可以创建多个子任务
              navigate(`/projects/${projectId}/bulk-import?parentTaskId=${task?.id}`);
            } else if (taskModalMode === 'createSibling') {
              // 创建兄弟任务模式：跳转到批量导入页面
              navigate(`/projects/${projectId}/bulk-import?parentTaskId=${task?.parent_id || ''}`);
            }
          }}
        />
      )}
      
      {/* Archive Modal */}
      {task && projectId && (
        <TaskArchiveModal
          visible={archiveModalVisible}
          onCancel={() => setArchiveModalVisible(false)}
          onSuccess={handleArchiveSuccess}
          projectId={parseInt(projectId)}
          tasks={[task]}
          mode="single"
        />
      )}

      {/* Bulk SubTask Creator Modal */}
      {task && projectId && (
        <BulkSubTaskCreator
          visible={bulkSubTaskModalVisible}
          onCancel={() => setBulkSubTaskModalVisible(false)}
          onSuccess={handleBulkSubTaskSuccess}
          parentTask={task}
          projectId={parseInt(projectId)}
        />
      )}
      </div>
  );
};

export default TaskDetailPageNew;