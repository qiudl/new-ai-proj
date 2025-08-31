import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
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

// 懒加载非关键组件
const TaskGanttChart = lazy(() => import('../components/TaskGanttChart'));
const TaskAnalysisPanel = lazy(() => import('../components/TaskAnalysisPanel'));
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
  BarChartOutlined,
  DownOutlined,
  UpOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { TaskService } from '../services/taskService';
import { TaskDetailDescendantsTree } from '../components/TaskDetailDescendantsTree';
import { projectService } from '../services/projectService';
import api from '../services/api';
import { documentService } from '../services/documentService';
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
import BulkSubTaskCreator from '../components/BulkSubTaskCreator';
import TaskDocumentWidget from '../components/TaskDocumentWidget';
import UnifiedTaskDocumentArea from '../components/UnifiedTaskDocumentArea';
// import { TaskProgressDisplay } from '../components/TaskProgressDisplay'; // 已删除WebSocket相关组件
// 导入新的优化组件
import { useTaskDetailState } from '../hooks/useTaskDetailState';
import { useMemoryManager } from '../hooks/useMemoryManager';
import { TaskBasicInfo, TaskDetailInfo } from '../components/TaskDetailBasicInfo';
import TaskRelationsPanel from '../components/TaskDetailRelations';
import AnimatedContainer, { UpdateAnimation } from '../components/AnimatedContainer';
import { RefreshConfigProvider } from '../contexts/RefreshConfigContext';
import { RefreshConfigButton } from '../components/RefreshConfigModal';
import TaskCompletionRefresh from '../components/TaskCompletionRefresh';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import '../styles/TaskDetail.css';
import { TaskProgressBar, TaskProgressBarProps } from '../components/TaskProgressBar';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import PerformanceMonitor from '../components/PerformanceMonitor';

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

// 暂时简化任务进度条，避免复杂的数据加载
const TaskProgressInline: React.FC<{ taskId: number; status: 'todo'|'in_progress'|'blocked'|'completed'; style?: React.CSSProperties }>= ({ taskId, status, style }) => {
  return (
    <div style={style}>
      <TaskProgressBar
        percent={0}
        percentDisplay={0}
        estimateText={undefined}
        actualText={undefined}
        overrunPercent={0}
        status={status}
        breakdown={undefined}
      />
    </div>
  )
}

const TaskDetailPageNew: React.FC = () => {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // 使用内存管理器钩子（解构需要的稳定函数，避免对象引用变化导致的重复副作用）
  const { addCleanupFunction, cleanupAll } = useMemoryManager();
  
  // 使用默认配置，避免条件性调用Hooks
  const defaultRefreshConfig = {
    completionStatsInterval: 30,
    enableVisibilityDetection: true,
    maxRetries: 3,
    retryInterval: 5000
  };
  
  // 始终调用 Hook，避免条件性调用
  const refreshConfig = defaultRefreshConfig;

  // 使用状态钩子
  const {
    taskState,
    documentState,
    relationState,
    completionState,
    uiState,
    historyState,
    projectState,
    updateTaskState,
    updateDocumentState,
    updateRelationState,
    updateCompletionState,
    updateUIState,
    updateHistoryState,
    updateProjectState,
    resetAllState
  } = useTaskDetailState();

  // 解构任务状态
  const { task, loading } = taskState;

  // 从URL参数读取活动Tab
  const getActiveTabFromURL = () => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('tab') || 'info';
  };

  // 初始化UI状态
  useEffect(() => {
    const activeTab = getActiveTabFromURL();
    console.log('Initializing activeTab to:', activeTab);
    updateUIState({ activeTab });
  }, [location.search, updateUIState]); // 恢复updateUIState依赖

  // 简化版自动刷新 - 避免复杂的Hook依赖
  const [isCompletionStatsRefreshing, setIsCompletionStatsRefreshing] = useState(false);
  const [completionStatsError, setCompletionStatsError] = useState<Error | null>(null);
  const completionStatsStats = null;
  const completionStatsMemoryStats = null;

  const refreshCompletionStats = useCallback(async () => {
    if (!projectId || !task) return;
    
    const parsedProjectId = parseInt(projectId);
    if (isNaN(parsedProjectId)) return;
    
    setIsCompletionStatsRefreshing(true);
    setCompletionStatsError(null);
    
    try {
      // 重新加载子任务数据
      const subtasksData = await TaskService.getTaskChildren(parsedProjectId, task.id);
      const children = Array.isArray(subtasksData) 
        ? subtasksData 
        : Array.isArray(subtasksData?.data) 
        ? subtasksData.data 
        : [];
      
      updateRelationState({ subtasks: children });
      
      // 直接计算统计，避免函数依赖
      const stats = {
        totalSubtasks: children.length,
        completedSubtasks: children.filter(t => t.status === 'completed').length,
        inProgressSubtasks: children.filter(t => t.status === 'in_progress').length,
        todoSubtasks: children.filter(t => t.status === 'todo').length,
        completionRate: 0,
        loading: false
      };
      
      if (stats.totalSubtasks > 0) {
        stats.completionRate = Math.round((stats.completedSubtasks / stats.totalSubtasks) * 100);
      }
      
      updateCompletionState(stats);
    } catch (error) {
      console.error('刷新完成统计失败:', error);
      setCompletionStatsError(error as Error);
    } finally {
      setIsCompletionStatsRefreshing(false);
    }
  }, [projectId, task?.id, updateRelationState, updateCompletionState]);

  // 暂时禁用自动刷新以调试无限渲染问题
  // useEffect(() => {
  //   if (!projectId || !task?.id) return;
  //   
  //   const interval = setInterval(() => {
  //     refreshCompletionStats();
  //   }, refreshConfig.completionStatsInterval * 1000);
  //   
  //   return () => clearInterval(interval);
  // }, [projectId, task?.id, refreshCompletionStats, refreshConfig.completionStatsInterval]);

  const cleanupCompletionStats = useCallback(() => {
    setIsCompletionStatsRefreshing(false);
    setCompletionStatsError(null);
  }, []);

  // 注册自动刷新清理函数到内存管理器
  useEffect(() => {
    addCleanupFunction(cleanupCompletionStats);
    return () => {
      // 组件卸载时清理
    };
  }, [addCleanupFunction]);

  const pageSize = 8;
  const [relatedTasksPage, setRelatedTasksPage] = useState(1);
  const [relatedTasksTotal, setRelatedTasksTotal] = useState(0);
  
  // 检查特定任务的文档是否存在
  const checkDocumentExistsForTask = useCallback(async (taskData: Task) => {
    if (!taskData || !projectId) return;

    try {
      updateDocumentState({ loading: true });
      // 轻量化：仅检查当前任务的文档数量，避免在初始加载时递归遍历所有子任务导致卡顿
      const parsedProjectId = parseInt(projectId);
      const rootDocsResp = await documentService.getTaskDocuments(parsedProjectId, taskData.id);
      const rootCount = (rootDocsResp?.total ?? rootDocsResp?.documents?.length ?? 0) as number;
      updateDocumentState({ 
        exists: rootCount > 0, 
        count: rootCount,
        loading: false
      });
    } catch (error: any) {
      if (error?.response?.status === 404) {
        updateDocumentState({ 
          exists: false, 
          count: 0,
          loading: false
        });
      } else {
        console.error('检查文档状态失败:', error);
        updateDocumentState({ 
          exists: false, 
          count: 0,
          loading: false
        });
      }
    }
  }, [projectId, updateDocumentState]);

  // 检查文档是否存在
  const checkDocumentExists = useCallback(async () => {
    if (!taskState.task || !projectId) return;
    await checkDocumentExistsForTask(taskState.task);
  }, [taskState.task, projectId, checkDocumentExistsForTask]);

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
      updateTaskState({ loading: true, error: null });
      const taskData = await TaskService.getTask(parsedProjectId, parsedTaskId);
      updateTaskState({ task: taskData, loading: false });
      // 并行加载其他数据，直接传递taskData
      loadAllTaskDataWithTask(taskData);
    } catch (error: any) {
      console.error('Error loading task:', error);
      
      // Check if it's a 404 error
      const status = error?.status || error?.response?.status || error?.statusCode;
      if (status === 404) {
        // Don't show error message for 404, just set task to null
        // The component will render the "task not found" UI
        updateTaskState({ task: null, loading: false });
      } else {
        // For other errors, show the error message
        message.error('获取任务详情失败');
        updateTaskState({ error: '获取任务详情失败', loading: false });
      }
    }
  }, [projectId, taskId, navigate, updateTaskState]);

  // 并行加载所有任务数据（使用当前task状态）
  const loadAllTaskData = useCallback(async () => {
    if (!projectId || !taskId || !taskState.task) return;
    await loadAllTaskDataWithTask(taskState.task);
  }, [projectId, taskId, taskState.task]);

  // 并行加载所有任务数据（使用传入的task参数）
  const loadAllTaskDataWithTask = useCallback(async (taskData: Task) => {
    if (!projectId || !taskId || !taskData) return;
    
    const parsedProjectId = parseInt(projectId);
    const parsedTaskId = parseInt(taskId);
    
    if (isNaN(parsedProjectId) || isNaN(parsedTaskId)) {
      return;
    }
    
    // 容错解析函数：尽可能从不同结构中提取数组
    const toArray = (resp: any): any[] => {
      if (!resp) return [];
      // 显式处理常见结构
      const candidates = [
        resp,
        resp?.data,
        resp?.data?.data,
        resp?.items,
        resp?.data?.items,
        resp?.results,
        resp?.data?.results,
        // 针对时间线与更新历史的常见键
        resp?.events,
        resp?.data?.events,
        resp?.updates,
        resp?.data?.updates,
      ];
      for (const c of candidates) {
        if (Array.isArray(c)) return c as any[];
      }
      // 针对返回 { data: { total, updates: null } } 的情况
      if (resp?.data && typeof resp.data.total === 'number' && (resp.data.updates === null || resp.data.updates === undefined)) {
        return [];
      }
      return [];
    };
    
    try {
      updateRelationState({ loading: true });
      
      // 并行加载基础数据
      const [subtasksData, updatesData, timelineData] = await Promise.allSettled([
        TaskService.getTaskChildren(parsedProjectId, parsedTaskId),
        TaskService.getTaskUpdates(parsedProjectId, parsedTaskId, { page: 1, page_size: 20 }),
        TaskService.getTaskTimeline(parsedProjectId, parsedTaskId, { page: 1, page_size: 20 }),
      ]);
      
      // 单独获取项目信息
      try {
        updateProjectState({ loading: true });
        const projectInfo = await projectService.getProject(parsedProjectId);
        updateProjectState({ projectInfo, loading: false });
      } catch (error) {
        console.error('Error loading project info:', error);
        updateProjectState({ loading: false });
      }
      
      // 单独获取父任务信息和兄弟任务
      if (taskData.parent_id) {
        try {
          const parentTaskInfo = await TaskService.getTask(parsedProjectId, taskData.parent_id);
          updateRelationState({ parent: parentTaskInfo });
          
          // 获取兄弟任务（相同父任务的其他子任务）
          const siblings = await TaskService.getTaskChildren(parsedProjectId, taskData.parent_id);
          const filteredSiblings = Array.isArray(siblings) 
            ? siblings.filter((sibling: Task) => sibling.id !== taskData.id)
            : [];
          updateRelationState({ siblings: filteredSiblings });
        } catch (error) {
          console.error('Error loading parent task:', error);
        }
      } else {
        // 如果是根任务，获取同级的其他根任务作为兄弟任务
        try {
          const rootTasksResponse = await TaskService.getRootTasks(parsedProjectId);
          const rootTasks = toArray(rootTasksResponse);
          const filteredRootSiblings = rootTasks.filter((rootTask: Task) => rootTask.id !== taskData.id);
          updateRelationState({ siblings: filteredRootSiblings });
        } catch (error) {
          console.error('Error loading root tasks:', error);
        }
      }
      
      // 处理子任务数据
      if (subtasksData.status === 'fulfilled') {
        const children = toArray((subtasksData as PromiseFulfilledResult<any>).value);
        updateRelationState({ subtasks: children });
        
        // 直接计算统计，避免函数依赖
        const stats = {
          totalSubtasks: children.length,
          completedSubtasks: children.filter(t => t.status === 'completed').length,
          inProgressSubtasks: children.filter(t => t.status === 'in_progress').length,
          todoSubtasks: children.filter(t => t.status === 'todo').length,
          completionRate: 0,
          loading: false
        };
        
        if (stats.totalSubtasks > 0) {
          stats.completionRate = Math.round((stats.completedSubtasks / stats.totalSubtasks) * 100);
        }
        
        updateCompletionState(stats);
      } else {
        // 处理API调用失败的情况
        console.error('Failed to load subtasks:', (subtasksData as PromiseRejectedResult).reason);
        updateRelationState({ subtasks: [] });
        updateCompletionState({
          totalSubtasks: 0,
          completedSubtasks: 0,
          inProgressSubtasks: 0,
          todoSubtasks: 0,
          completionRate: 0,
          loading: false
        });
      }
      
      // 处理更新历史数据
      if (updatesData.status === 'fulfilled') {
        const updates = toArray((updatesData as PromiseFulfilledResult<any>).value);
        updateHistoryState({ taskUpdates: updates });
      }
      
      // 处理时间线数据
      if (timelineData.status === 'fulfilled') {
        const timeline = toArray((timelineData as PromiseFulfilledResult<any>).value);
        updateHistoryState({ timelineEvents: timeline });
      }
      
      updateRelationState({ loading: false });
      
    } catch (error) {
      console.error('Error loading task data:', error);
      updateRelationState({ loading: false, error: 'Failed to load task data' });
    }
  }, [projectId, taskId, updateRelationState, updateProjectState, updateHistoryState, updateCompletionState]);

  // 计算完成统计 - 现在从钩子中获取
  // calculateCompletionStats 函数已在useTaskDetailState中定义

  // 加载关联任务
  const loadRelatedTasks = useCallback(async (page: number = 1) => {
    if (!taskState.task || !projectId) return;
    
    const parsedProjectId = parseInt(projectId);
    if (isNaN(parsedProjectId)) return;
    
    try {
      updateRelationState(prev => ({ ...prev, loading: true }));
      
      // 获取同项目下的其他任务
      const tasksResponse = await TaskService.getTasks(parsedProjectId, {
        page,
        page_size: pageSize
      });
      
      if (tasksResponse && tasksResponse.data) {
        const allTasks = Array.isArray(tasksResponse.data) ? tasksResponse.data : [];
        // 排除当前任务
        const tasks = allTasks.filter(t => t.id !== taskState.task!.id);
        
        // 根据关联性排序任务
        const sortedTasks = tasks.sort((a: Task, b: Task) => {
          // 1. 相同状态的任务优先
          if (a.status === taskState.task!.status && b.status !== taskState.task!.status) return -1;
          if (b.status === taskState.task!.status && a.status !== taskState.task!.status) return 1;
          
          // 2. 相同优先级的任务其次
          const aPriority = a.custom_fields?.priority || 'medium';
          const bPriority = b.custom_fields?.priority || 'medium';
          const taskPriority = taskState.task!.custom_fields?.priority || 'medium';
          if (aPriority === taskPriority && bPriority !== taskPriority) return -1;
          if (bPriority === taskPriority && aPriority !== taskPriority) return 1;
          
          // 3. 相同负责人的任务
          if (a.assignee_id === taskState.task!.assignee_id && b.assignee_id !== taskState.task!.assignee_id) return -1;
          if (b.assignee_id === taskState.task!.assignee_id && a.assignee_id !== taskState.task!.assignee_id) return 1;
          
          // 4. 最后按更新时间排序
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
        
        updateRelationState({ related: sortedTasks, loading: false });
        setRelatedTasksTotal(tasksResponse.pagination?.total || tasks.length);
      }
    } catch (error) {
      console.error('Failed to load related tasks:', error);
      message.error('加载关联任务失败');
      updateRelationState({ loading: false });
    }
  }, [taskState.task, projectId, pageSize, updateRelationState]);

  // 处理关联任务分页
  const handleRelatedTasksPageChange = useCallback((page: number) => {
    setRelatedTasksPage(page);
    loadRelatedTasks(page);
  }, [loadRelatedTasks]);


  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      // 使用内存管理器清理所有资源
      cleanupAll();
      // 重置状态
      resetAllState();
      console.log('🧹 TaskDetailPageNew: All resources cleaned up');
    };
  }, [cleanupAll, resetAllState]);

  useEffect(() => {
    if (projectId && taskId) {
      loadTask();
    }
  }, [projectId, taskId]); // 移除loadTask依赖，避免循环

  // 暂时禁用URL监听以测试tab切换
  // useEffect(() => {
  //   console.log('URL changed, location.search:', location.search);
  //   const newActiveTab = getActiveTabFromURL();
  //   console.log('newActiveTab from URL:', newActiveTab);
  //   console.log('current uiState.activeTab:', uiState.activeTab);
  //   if (newActiveTab !== uiState.activeTab) {
  //     console.log('Updating activeTab from URL listener:', newActiveTab);
  //     updateUIState({ activeTab: newActiveTab });
  //   }
  // }, [location.search, uiState.activeTab, updateUIState]);

  // 当切换到文档Tab时再检查文档存在与数量，避免初始加载时的重网络与遍历
  useEffect(() => {
    if (uiState.activeTab === 'document' && !documentState.loading && documentState.exists === null) {
      checkDocumentExists();
    }
  }, [uiState.activeTab, documentState.loading, documentState.exists]); // 移除checkDocumentExists依赖

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
    updateUIState({ taskModalMode: 'edit', taskModalVisible: true });
  };

  const handleUpdateTask = async (taskData: unknown) => {
    if (!taskState.task || !projectId) return;
    
    const parsedProjectId = parseInt(projectId);
    if (isNaN(parsedProjectId)) {
      message.error('无效的项目ID');
      return;
    }
    
    try {
      updateUIState({ modalLoading: true });
      await TaskService.updateTask(parsedProjectId, taskState.task.id, taskData);
      message.success('任务更新成功');
      updateUIState({ taskModalVisible: false, modalLoading: false });
      loadTask();
    } catch (error) {
      message.error('任务更新失败');
      updateUIState({ modalLoading: false });
    }
  };

  const handleDeleteTask = () => {
    if (!taskState.task || !projectId) return;
    
    const parsedProjectId = parseInt(projectId);
    if (isNaN(parsedProjectId)) {
      message.error('无效的项目ID');
      return;
    }
    
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除任务"${taskState.task.title}"吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await TaskService.deleteTask(parsedProjectId, taskState.task!.id);
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
    updateUIState({ taskModalMode: 'createSubtask', taskModalVisible: true });
  };

  const handleCreateSibling = () => {
    updateUIState({ taskModalMode: 'createSibling', taskModalVisible: true });
  };

  // 批量导入子任务处理函数
  const handleBulkImportSubtasks = () => {
    if (!taskState.task || !projectId) {
      message.error('任务信息不完整，无法进行批量导入');
      return;
    }
    
    // 跳转到批量导入页面，带上父任务参数
    navigate(`/projects/${projectId}/bulk-import?parentTaskId=${taskState.task.id}`);
  };

  // 归档任务处理函数
  const handleArchiveTask = () => {
    updateUIState({ archiveModalVisible: true });
  };

  // 归档成功处理
  const handleArchiveSuccess = () => {
    updateUIState({ archiveModalVisible: false });
    message.success('任务已归档');
    // 返回到任务列表
    navigate(`/projects/${projectId}/tasks`);
  };

  // 手工批量创建子任务处理函数
  const handleBulkCreateSubTasks = () => {
    updateUIState({ bulkSubTaskModalVisible: true });
  };

  // 批量创建子任务成功处理
  const handleBulkSubTaskSuccess = () => {
    updateUIState({ bulkSubTaskModalVisible: false });
    message.success('批量创建子任务成功');
    // 重新加载任务数据
    loadTask();
  };

  // 统一的任务模态框提交处理
  const handleTaskModalSubmit = async (taskData: unknown) => {
    if (uiState.taskModalMode === 'edit') {
      await handleUpdateTask(taskData);
    } else if (uiState.taskModalMode === 'createSubtask') {
      await handleCreateSubtaskSubmit(taskData);
    } else if (uiState.taskModalMode === 'createSibling') {
      await handleCreateSiblingSubmit(taskData);
    }
  };

  const handleCreateSubtaskSubmit = async (taskData: unknown) => {
    if (!taskState.task || !projectId) return;
    
    const parsedProjectId = parseInt(projectId);
    if (isNaN(parsedProjectId)) {
      message.error('无效的项目ID');
      return;
    }
    
    try {
      updateUIState({ modalLoading: true });
      // 添加parent_id到任务数据
      const subtaskData = {
        ...taskData,
        parent_id: taskState.task.id
      };
      
      await TaskService.createTask(parsedProjectId, subtaskData);
      message.success('子任务创建成功');
      updateUIState({ taskModalVisible: false, modalLoading: false });
      
      // 重新加载所有数据
      loadTask();
    } catch (error) {
      message.error('子任务创建失败');
      updateUIState({ modalLoading: false });
    }
  };

  const handleCreateSiblingSubmit = async (taskData: unknown) => {
    if (!taskState.task || !projectId) return;
    
    const parsedProjectId = parseInt(projectId);
    if (isNaN(parsedProjectId)) {
      message.error('无效的项目ID');
      return;
    }
    
    try {
      updateUIState({ modalLoading: true });
      // 使用当前任务的parent_id作为兄弟任务的parent_id
      const siblingData = {
        ...taskData,
        parent_id: taskState.task.parent_id || null // 如果当前任务是根任务，兄弟任务也是根任务
      };
      
      await TaskService.createTask(parsedProjectId, siblingData);
      message.success('兄弟任务创建成功');
      updateUIState({ taskModalVisible: false, modalLoading: false });
      
      // 重新加载所有数据
      loadTask();
    } catch (error) {
      message.error('兄弟任务创建失败');
      updateUIState({ modalLoading: false });
    }
  };

  // 处理关系任务导航 - 移到组件顶部
  const handleNavigateToTask = useCallback((taskId: number, projectId: number) => {
    navigate(`/projects/${projectId}/tasks/${taskId}`);
  }, [navigate]);

  if (taskState.loading) {
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

  if (!taskState.task) {
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

  // 渲染面包屑的辅助数据
  const breadcrumbItems = [
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
    ...(taskState.task.parent_id && relationState.parent ? [{
      title: (
        <span 
          onClick={() => navigate(`/projects/${taskState.task.project_id}/tasks/${taskState.task.parent_id}`)}
          style={{ 
            color: '#1890ff',
            cursor: 'pointer',
            fontSize: '14px',
            lineHeight: '22px'
          }}
        >
          {relationState.parent.title}
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
          {taskState.task.title}
        </span>
      )
    }
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
          ...(task.parent_id && relationState.parent ? [{
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
                {relationState.parent.title}
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


      <Row gutter={[24, 24]} style={{ position: 'relative' }}>
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

                {/* 任务进度条 */}
                <TaskProgressInline 
                  taskId={task.id} 
                  status={task.status as 'todo'|'in_progress'|'blocked'|'completed'}
                  style={{ marginBottom: '16px' }} 
                />
              </div>
            </div>
          </Card>

          {/* 任务摘要（AI提炼）*/}
          {task.custom_fields?.task_summary && (
            <Card style={{ marginBottom: '24px' }}>
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
                  loading={uiState.modalLoading}
                />
              </div>
            </Card>
          )}

          {/* 完成情况统计 - 如果有子任务 */}
          {completionState.totalSubtasks > 0 && (
            <AnimatedContainer type="fade" visible={true}>
              <Card 
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>任务完成情况</span>
                    <TaskCompletionRefresh 
                      onRefreshCompletionStats={() => refreshCompletionStats()}
                      size="small"
                      showProgress={true}
                      disabled={isCompletionStatsRefreshing}
                    />
                    <RefreshConfigButton />
                    {completionStatsStats && completionStatsStats.totalRefreshes > 0 && (
                      <Tooltip title={
                        <div>
                          <div>总刷新: {completionStatsStats.totalRefreshes}</div>
                          <div>成功: {completionStatsStats.successfulRefreshes}</div>
                          <div>失败: {completionStatsStats.failedRefreshes}</div>
                          <div>缓存命中: {completionStatsStats.cacheHits}</div>
                          <div>平均响应时间: {completionStatsStats.averageResponseTime}ms</div>
                          {completionStatsMemoryStats && (
                            <div style={{ marginTop: '4px', borderTop: '1px solid #f0f0f0', paddingTop: '4px' }}>
                              <div>内存使用: {completionStatsMemoryStats.percentage.toFixed(1)}%</div>
                              <div>已用: {(completionStatsMemoryStats.used / 1024 / 1024).toFixed(1)}MB</div>
                            </div>
                          )}
                        </div>
                      }>
                        <span style={{ 
                          fontSize: '10px', 
                          color: completionStatsMemoryStats && completionStatsMemoryStats.percentage > 80 ? '#fa8c16' : '#8c8c8c',
                          cursor: 'help'
                        }}>
                          {completionStatsStats.successfulRefreshes}/{completionStatsStats.totalRefreshes}
                          {completionStatsStats.cacheHits > 0 && (
                            <span style={{ marginLeft: '4px' }}>⚡{completionStatsStats.cacheHits}</span>
                          )}
                        </span>
                      </Tooltip>
                    )}
                  </div>
                }
                style={{ marginBottom: '24px' }}
                extra={
                  completionStatsError && (
                    <Tooltip title={`刷新失败: ${completionStatsError.message}`}>
                      <WarningOutlined style={{ color: '#faad14' }} />
                    </Tooltip>
                  )
                }
              >
                <UpdateAnimation 
                  updateTrigger={completionState.completionRate}
                  type="highlight"
                  duration="normal"
                >
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12}>
                      <div style={{ textAlign: 'center' }}>
                        <Progress
                          type="circle"
                          percent={completionState.completionRate}
                          size={120}
                          format={() => `${completionState.completedSubtasks}/${completionState.totalSubtasks}`}
                          strokeColor={{
                            '0%': '#108ee9',
                            '100%': '#87d068',
                          }}
                        />
                        <div style={{ marginTop: '12px' }}>
                          <Text strong style={{ fontSize: '16px' }}>
                            {completionState.completionRate}% 完成
                          </Text>
                        </div>
                      </div>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <UpdateAnimation 
                          updateTrigger={completionState.completedSubtasks}
                          type="pulse"
                          duration="fast"
                        >
                          <Statistic
                            title="已完成子任务"
                            value={completionState.completedSubtasks}
                            suffix={`/ ${completionState.totalSubtasks}`}
                            valueStyle={{ color: '#52c41a' }}
                            prefix={<CheckCircleOutlined />}
                          />
                        </UpdateAnimation>
                        <div style={{ display: 'flex', gap: '16px' }}>
                          <div>
                            <UpdateAnimation 
                              updateTrigger={completionState.inProgressSubtasks}
                              type="highlight"
                              duration="fast"
                              highlightColor="#e6f7ff"
                            >
                              <Badge color="#1890ff" text={`进行中 ${completionState.inProgressSubtasks}`} />
                            </UpdateAnimation>
                          </div>
                          <div>
                            <UpdateAnimation 
                              updateTrigger={completionState.todoSubtasks}
                              type="highlight"
                              duration="fast"
                              highlightColor="#f5f5f5"
                            >
                              <Badge color="#d9d9d9" text={`待开始 ${completionState.todoSubtasks}`} />
                            </UpdateAnimation>
                          </div>
                        </div>
                      </Space>
                    </Col>
                  </Row>
                </UpdateAnimation>
              </Card>
            </AnimatedContainer>
          )}

          {/* 子任务树（懒加载） */}
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BranchesOutlined />
                <span>子任务树</span>
                <span style={{ fontSize: '12px', color: '#8c8c8c' }}>(自动刷新)</span>
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
            <div style={{ padding: '4px 0' }}>
              <TaskDetailDescendantsTree 
                projectId={parseInt(projectId || '0')} 
                rootTaskId={taskState.task.id} 
                limit={200} 
              />
            </div>
          </Card>

          {/* 任务详情Tabs */}
          <Card style={{ marginBottom: '24px' }}>
            <Tabs
              activeKey={uiState.activeTab}
              onChange={(key) => {
                console.log('Tabs onChange fired with key:', key);
                console.log('Tab changing to:', key);
                console.log('Current activeTab:', uiState.activeTab);
                updateUIState({ activeTab: key });
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
                console.log('Updated URL to:', newUrl);
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
                      task={taskState.task}
                      onUpdate={handleUpdateTask}
                      loading={uiState.modalLoading}
                    />
                  )
                },
                {
                  key: 'document',
                  label: (
                    <Space>
                      <EditOutlined />
                      <span>任务文档</span>
                      <Badge count={documentState.count} size="small" />
                    </Space>
                  ),
                  children: (
                    <div style={{ minHeight: '500px' }}>
                      <UnifiedTaskDocumentArea
                        taskId={taskState.task.id}
                        projectId={parseInt(projectId || '0')}
                        height="500px"
                        defaultViewMode="edit"
                        showToolbar={true}
                        showDocumentList={true}
                        compactMode={false}
                        headerVisible={false}
                        includeSubtaskDocuments={true}
                        onDocumentChange={(docs) => {
                          // 更新文档存在状态与数量（包含所有下级任务）
                          updateDocumentState({ 
                            exists: docs.length > 0, 
                            count: docs.length 
                          });
                        }}
                        onViewModeChange={(mode) => {
                          // no-op
                        }}
                      />
                    </div>
                  )
                },
                {
                  key: 'progress',
                  label: (
                    <Space>
                      <BarChartOutlined />
                      <span>进度分析</span>
                    </Space>
                  ),
                  children: (
                    <div style={{ minHeight: '400px' }}>
                      <Alert
                        message="进度功能暂时不可用"
                        description="WebSocket相关组件已被移除"
                        type="info"
                        showIcon
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
                      {relationState.subtasks && relationState.subtasks.length > 0 && (
                        <Badge count={relationState.subtasks.length} size="small" style={{ backgroundColor: '#722ed1' }} />
                      )}
                    </Space>
                  ),
                  children: (
                    <div style={{ minHeight: '500px' }}>
                      <Suspense fallback={<Spin size="large" />}>
                        <TaskGanttChart
                          parentTask={taskState.task}
                          projectId={parseInt(projectId || '0')}
                          style={{ border: 'none', boxShadow: 'none' }}
                        />
                      </Suspense>
                    </div>
                  )
                }
              ]}
            />
          </Card>

        </Col>

        {/* 右侧信息卡片 */}
        <Col xs={24} sm={24} md={24} lg={8} xl={8} className="info-sidebar">
          {/* 性能监控 */}
          <PerformanceMonitor 
            size="small"
            showDetails={false}
            showAlerts={true}
            style={{ marginBottom: '16px' }}
          />
          
          {/* 任务计时器 */}
          <MVPTaskDetailTimer
            taskId={taskState.task.id}
            taskTitle={taskState.task.title}
            taskStatus={taskState.task.status}
            projectId={projectId ? parseInt(projectId) : undefined}
            style={{ marginBottom: '16px' }}
          />
          
          {/* 任务文档小部件 - 兼容性保留 */}
          <div style={{ marginBottom: '16px' }}>
            <Card size="small" title="文档概览">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  💡 新版统一文档界面已在主Tab中启用
                </Text>
                <TaskDocumentWidget
                  projectId={parseInt(projectId || '0')}
                  taskId={taskState.task.id}
                  compact={true}
                  showTitle={false}
                />
              </Space>
            </Card>
          </div>
          
          {/* 基本信息 */}
          <TaskDetailInfo
            task={taskState.task}
            projectInfo={projectState.projectInfo}
            parentTask={relationState.parent}
          />

          {/* 关系任务组件 */}
          <TaskRelationsPanel
            task={taskState.task}
            parentTask={relationState.parent}
            subtasks={relationState.subtasks}
            siblingTasks={relationState.siblings}
            expandedSubtasks={uiState.expandedSubtasks}
            expandedSiblings={uiState.expandedSiblings}
            onCreateSubtask={handleCreateSubtask}
            onCreateSibling={handleCreateSibling}
            onBulkCreateSubTasks={handleBulkCreateSubTasks}
            onBulkImportSubtasks={handleBulkImportSubtasks}
            onArchiveTask={handleArchiveTask}
            onNavigateToTask={handleNavigateToTask}
            onToggleSubtasks={() => updateUIState({ expandedSubtasks: !uiState.expandedSubtasks })}
            onToggleSiblings={() => updateUIState({ expandedSiblings: !uiState.expandedSiblings })}
            getStatusConfig={getStatusConfig}
          />

          // 任务详情分页 - 时间线和历史记录
          <Card 
            title="任务详情"
            style={{ marginBottom: '16px' }}
          >
            <Tabs 
              activeKey={uiState.detailTab || 'timeline'}
              onChange={(key) => updateUIState({ detailTab: key })}
              items={[
                {
                  key: 'timeline',
                  label: (
                    <Space>
                      <ClockCircleOutlined />
                      时间线
                      {historyState.timelineEvents && historyState.timelineEvents.length > 0 && (
                        <Badge count={historyState.timelineEvents.length} size="small" />
                      )}
                    </Space>
                  ),
                  children: historyState.timelineEvents && historyState.timelineEvents.length > 0 ? (
                    <TaskTimeline 
                      events={historyState.timelineEvents}
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
                      {historyState.taskUpdates && historyState.taskUpdates.length > 0 && (
                        <Badge count={historyState.taskUpdates.length} size="small" />
                      )}
                    </Space>
                  ),
                  children: historyState.taskUpdates && historyState.taskUpdates.length > 0 ? (
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      <Timeline>
                        {historyState.taskUpdates.map((update: any, index: number) => {
                          // 获取更新类型的详细信息和处理更新详情的逻辑保持不变
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
                          const getChangeDetails = (updateItem: any) => {
                            try {
                              if (updateItem.old_value && updateItem.new_value) {
                                const oldVal = typeof updateItem.old_value === 'string' ? updateItem.old_value : JSON.stringify(updateItem.old_value);
                                const newVal = typeof updateItem.new_value === 'string' ? updateItem.new_value : JSON.stringify(updateItem.new_value);
                                
                                if (updateItem.update_type === 'status') {
                                  const statusMap = {
                                    'todo': '待开始',
                                    'in_progress': '进行中', 
                                    'completed': '已完成',
                                    'cancelled': '已取消'
                                  };
                                  return `${statusMap[oldVal as keyof typeof statusMap] || oldVal} → ${statusMap[newVal as keyof typeof statusMap] || newVal}`;
                                }
                                
                                if (updateItem.update_type === 'priority') {
                                  const priorityMap = { 'low': '低', 'medium': '中', 'high': '高' };
                                  return `${priorityMap[oldVal as keyof typeof priorityMap] || oldVal} → ${priorityMap[newVal as keyof typeof priorityMap] || newVal}`;
                                }
                                
                                if (updateItem.update_type === 'due_date') {
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
      {uiState.taskModalVisible && projectId && !isNaN(parseInt(projectId)) && (
        <TaskModal
          visible={uiState.taskModalVisible}
          task={uiState.taskModalMode === 'edit' ? taskState.task : undefined}
          parentTask={uiState.taskModalMode === 'createSubtask' ? taskState.task : undefined}
          siblingTask={uiState.taskModalMode === 'createSibling' ? taskState.task : undefined}
          mode={uiState.taskModalMode}
          projectId={parseInt(projectId)}
          onOk={handleTaskModalSubmit}
          onCancel={() => updateUIState({ taskModalVisible: false })}
          loading={uiState.modalLoading}
          allowParentSelection={true}
          onEditDetails={() => {
            updateUIState({ taskModalVisible: false });
            if (uiState.taskModalMode === 'edit') {
              navigate(`/projects/${projectId}/tasks/${taskId}/edit`);
            } else if (uiState.taskModalMode === 'createSubtask') {
              navigate(`/projects/${projectId}/bulk-import?parentTaskId=${taskState.task?.id}`);
            } else if (uiState.taskModalMode === 'createSibling') {
              navigate(`/projects/${projectId}/bulk-import?parentTaskId=${taskState.task?.parent_id || ''}`);
            }
          }}
        />
      )}
      
      {/* Archive Modal */}
      {taskState.task && projectId && (
        <TaskArchiveModal
          visible={uiState.archiveModalVisible}
          onCancel={() => updateUIState({ archiveModalVisible: false })}
          onSuccess={handleArchiveSuccess}
          projectId={parseInt(projectId)}
          tasks={[taskState.task]}
          mode="single"
        />
      )}

      {/* Bulk SubTask Creator Modal */}
      {taskState.task && projectId && (
        <BulkSubTaskCreator
          visible={uiState.bulkSubTaskModalVisible}
          onCancel={() => updateUIState({ bulkSubTaskModalVisible: false })}
          onSuccess={handleBulkSubTaskSuccess}
          parentTask={taskState.task}
          projectId={parseInt(projectId)}
        />
      )}
    </div>
  );
};

export default function WrappedTaskDetailPageNew() {
  return (
    <RefreshConfigProvider>
      <TaskDetailPageNew />
    </RefreshConfigProvider>
  );
}