import React, { useState, useEffect } from 'react';
import { Button, Table, Tag, Space, Dropdown, message, Modal, Switch, Select, Card, Col, Row, Input, DatePicker } from 'antd';
import { PlusOutlined, ImportOutlined, MoreOutlined, EditOutlined, DeleteOutlined, EyeOutlined, AppstoreAddOutlined, CaretRightOutlined, CaretDownOutlined, HistoryOutlined, MenuOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Task, TaskRequest, TaskStatus } from '../types/task';
import { TaskService } from '../services/taskService';
import TaskModal from '../components/TaskModal';
import HierarchicalTaskList from '../components/HierarchicalTaskList';
import ProjectSelector from '../components/ProjectSelector';
import { Project } from '../types/project';

// CSS动画样式
const syncAnimation = `
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .sync-indicator {
    animation: pulse 1.5s infinite;
  }
  .sync-success {
    animation: fadeIn 0.3s ease-out;
  }
`;

// 添加CSS样式到文档
if (typeof document !== 'undefined') {
  const styleId = 'task-sync-animations';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = syncAnimation;
    document.head.appendChild(style);
  }
}

const TasksPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  // State management
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [modalLoading, setModalLoading] = useState(false);
  const [hierarchicalView, setHierarchicalView] = useState(true);
  const [parentTaskForNew, setParentTaskForNew] = useState<Task | undefined>();
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [subTasks, setSubTasks] = useState<Map<number, Task[]>>(new Map());
  
  // 编辑状态管理
  const [editingFields, setEditingFields] = useState<Map<string, boolean>>(new Map());
  
  // 状态联动加载状态
  const [statusSyncLoading, setStatusSyncLoading] = useState<Set<number>>(new Set());
  
  // 防抖机制，避免快速连续更新
  const [updateTimeouts, setUpdateTimeouts] = useState<Map<string, NodeJS.Timeout>>(new Map());
  
  // 项目筛选相关状态
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>();
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  
  // 全局统计状态
  const [globalStats, setGlobalStats] = useState<{
    totalTasks: number;
    todoTasks: number;
    inProgressTasks: number;
    completedTasks: number;
    projectCount: number;
  }>({
    totalTasks: 0,
    todoTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
    projectCount: 0
  });

  const projectIdNum = parseInt(projectId || '0');
  
  // 如果URL中有projectId，使用URL中的项目ID，否则使用选择的项目ID
  const effectiveProjectId = projectIdNum || selectedProjectId;

  // Load tasks from API
  const loadTasks = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      let response;
      if (effectiveProjectId) {
        // Load tasks for specific project
        response = await TaskService.getTasks(effectiveProjectId, {
          page,
          page_size: pageSize,
        });
      } else {
        // Load all tasks across projects
        response = await TaskService.getAllTasks({
          page,
          page_size: pageSize,
        });
      }
      
      // Ensure response and response.data exist and is an array
      if (!response || !response.data) {
        console.warn('Invalid response structure:', response);
        setTasks([]);
        setPagination({
          current: page,
          pageSize: pageSize,
          total: 0,
        });
        return;
      }
      
      const tasksData = Array.isArray(response.data) ? response.data : [];
      setTasks(tasksData);
      
      // 修复分页计算，确保total不会超过实际需要的页数
      const actualTotal = response.pagination?.total || 0;
      const currentPageData = tasksData.length;
      
      // 如果当前页数据少于pageSize且不是第一页，说明这是最后一页
      const adjustedTotal = (page > 1 && currentPageData < pageSize) 
        ? (page - 1) * pageSize + currentPageData 
        : actualTotal;
      
      
      setPagination({
        current: response.pagination?.page || page,
        pageSize: response.pagination?.page_size || pageSize,
        total: adjustedTotal,
      });
    } catch (error: any) {
      console.error('Error loading tasks:', error);
      
      // 提供更详细的错误信息
      let errorMessage = '获取任务列表失败';
      if (error.message?.includes('Network')) {
        errorMessage = '网络连接失败，请检查网络状态';
      } else if (error.message?.includes('timeout')) {
        errorMessage = '请求超时，请稍后重试';
      } else if (error.message?.includes('404')) {
        errorMessage = '项目不存在或已被删除';
      } else if (error.message?.includes('401') || error.message?.includes('403')) {
        errorMessage = '权限不足，请重新登录';
      }
      
      message.error(errorMessage);
      // Set empty array on error to prevent undefined state
      setTasks([]);
      setPagination({
        current: page,
        pageSize: pageSize,
        total: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  // 获取全局统计数据
  const loadGlobalStats = async () => {
    if (effectiveProjectId) return; // 只在全局模式下获取统计
    
    try {
      // 获取不分页的全局任务数据用于统计
      const response = await TaskService.getAllTasks({
        page: 1,
        page_size: 1000 // 获取足够多的数据用于统计
      });
      
      if (response && response.data) {
        const allTasks = response.data;
        const stats = {
          totalTasks: response.pagination?.total || allTasks.length,
          todoTasks: allTasks.filter(task => task.status === 'todo').length,
          inProgressTasks: allTasks.filter(task => task.status === 'in_progress').length,
          completedTasks: allTasks.filter(task => task.status === 'completed').length,
          projectCount: new Set(allTasks.map(task => task.project_id)).size
        };
        setGlobalStats(stats);
      }
    } catch (error) {
      console.error('Error loading global stats:', error);
    }
  };

  // 在全局模式下加载统计数据
  useEffect(() => {
    if (!effectiveProjectId) {
      loadGlobalStats();
    }
  }, [effectiveProjectId]);

  // Load tasks on component mount
  useEffect(() => {
    loadTasks();
  }, [effectiveProjectId]); // 当有效项目ID变化时重新加载任务
  
  // 默认加载全局任务（如果没有指定项目）
  useEffect(() => {
    if (!projectId && !selectedProjectId) {
      // 默认加载全局任务
      loadTasks();
    }
  }, []); // 仅在组件挂载时执行一次
  
  // 项目选择处理函数
  const handleProjectChange = (projectId: number, project?: Project) => {
    setSelectedProjectId(projectId);
    setSelectedProject(project);
    // 清空展开状态和子任务缓存
    setExpandedTasks(new Set());
    setSubTasks(new Map());
  };
  
  // 处理项目清除（回到全局视图）
  const handleProjectClear = () => {
    setSelectedProjectId(undefined);
    setSelectedProject(undefined);
    setExpandedTasks(new Set());
    setSubTasks(new Map());
    // 重新加载全局任务
    loadTasks();
  };

  // Handle task creation
  const handleCreateTask = async (taskData: TaskRequest) => {
    setModalLoading(true);
    try {
      // 严格验证项目关联要求
      const projectId = parentTaskForNew ? parentTaskForNew.project_id : effectiveProjectId;
      
      if (!projectId || projectId <= 0) {
        message.error('任务必须关联一个有效项目，请先选择项目');
        return;
      }
      
      // Add parent_id if creating a subtask
      const requestData = parentTaskForNew 
        ? { ...taskData, parent_id: parentTaskForNew.id }
        : taskData;
      
      // 子任务额外验证：确保父任务和子任务在同一项目中
      if (parentTaskForNew) {
        if (parentTaskForNew.project_id !== projectId) {
          message.error('子任务必须与父任务属于同一项目');
          return;
        }
        
        if (!requestData.parent_id) {
          message.error('创建子任务时父任务关联失败');
          return;
        }
      }
      
      await TaskService.createTask(projectId, requestData);
      message.success(parentTaskForNew ? '子任务创建成功' : '任务创建成功');
      setTaskModalVisible(false);
      setParentTaskForNew(undefined);
      
      // Refresh task list and clear expanded subtasks cache to reflect changes
      setSubTasks(new Map());
      setExpandedTasks(new Set());
      
      if (hierarchicalView) {
        // Force refresh of hierarchical view
        window.location.reload();
      } else {
        loadTasks(pagination.current, pagination.pageSize);
      }
    } catch (error: any) {
      message.error(error.message || '任务创建失败');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle task update
  const handleUpdateTask = async (taskData: TaskRequest) => {
    if (!editingTask) return;
    
    setModalLoading(true);
    try {
      // 严格验证项目关联
      const projectId = effectiveProjectId || editingTask.project_id;
      
      if (!projectId || projectId <= 0) {
        message.error('任务缺少有效的项目关联，无法更新');
        return;
      }
      
      // 如果修改了父任务关联，验证新的父任务是否在同一项目中
      if (taskData.parent_id && taskData.parent_id !== editingTask.parent_id) {
        // 这里可以添加额外的父任务项目验证逻辑
        // 但由于我们没有直接访问所有任务列表，暂时依赖后端验证
      }
      
      await TaskService.updateTask(projectId, editingTask.id, taskData);
      message.success('任务更新成功');
      setTaskModalVisible(false);
      setEditingTask(undefined);
      
      // Refresh task list and clear expanded subtasks cache to reflect changes
      setSubTasks(new Map());
      setExpandedTasks(new Set());
      loadTasks(pagination.current, pagination.pageSize);
    } catch (error: any) {
      message.error(error.message || '任务更新失败');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle task deletion
  const handleDeleteTask = (task: Task) => {
    const hasChildren = (task.custom_fields?.children_count || 0) > 0;
    const deleteMessage = hasChildren 
      ? `确定要删除任务"${task.title}"吗？\n\n⚠️ 删除此任务将同时删除其所有子任务，此操作不可撤销。`
      : `确定要删除任务"${task.title}"吗？此操作不可撤销。`;
    
    Modal.confirm({
      title: '确认删除',
      content: deleteMessage,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          // Use the task's project_id if effectiveProjectId is not available (for global task list)
          const projectId = effectiveProjectId || task.project_id;
          await TaskService.deleteTask(projectId, task.id);
          const successMessage = hasChildren 
            ? '任务及其所有子任务删除成功' 
            : '任务删除成功';
          message.success(successMessage);
          
          // Refresh task list and clear expanded subtasks cache to reflect changes
          setSubTasks(new Map());
          setExpandedTasks(new Set());
          loadTasks(pagination.current, pagination.pageSize);
        } catch (error: any) {
          message.error(error.message || '任务删除失败');
        }
      },
    });
  };

  // Handle edit task
  const handleEditTask = (task: Task) => {
    // 确保任务有有效的项目ID
    if (!task.project_id) {
      message.error('无法编辑此任务：缺少项目信息');
      return;
    }
    setEditingTask(task);
    setTaskModalVisible(true);
  };

  // Handle create new task
  const handleNewTask = () => {
    if (!effectiveProjectId) {
      message.warning('全局模式下请先从上方选择一个项目，然后新建任务');
      return;
    }
    setEditingTask(undefined);
    setParentTaskForNew(undefined);
    setTaskModalVisible(true);
  };

  // Handle create subtask
  const handleCreateSubTask = (parentTask: Task) => {
    // 严格验证父任务的项目ID
    if (!parentTask.project_id || parentTask.project_id <= 0) {
      message.error('无法为此任务创建子任务：父任务缺少有效的项目信息');
      return;
    }
    
    // 在全局模式下，额外验证项目选择
    if (!effectiveProjectId) {
      message.warning('建议先从项目选择器中选择对应项目，确保子任务正确关联');
    }
    
    setEditingTask(undefined);
    setParentTaskForNew(parentTask);
    setTaskModalVisible(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setTaskModalVisible(false);
    setEditingTask(undefined);
    setParentTaskForNew(undefined);
  };

  // Handle pagination change
  const handleTableChange = (paginationParams: any) => {
    loadTasks(paginationParams.current, paginationParams.pageSize);
  };

  // Handle task expand/collapse
  const handleToggleExpand = async (task: Task) => {
    const taskId = task.id;
    const newExpandedTasks = new Set(expandedTasks);
    
    if (expandedTasks.has(taskId)) {
      // Collapse
      newExpandedTasks.delete(taskId);
      setExpandedTasks(newExpandedTasks);
    } else {
      // Expand - load subtasks if not already loaded
      if (!subTasks.has(taskId)) {
        try {
          // Use the task's project_id if effectiveProjectId is not available (for global task list)
          const projectId = effectiveProjectId || task.project_id;
          const children = await TaskService.getTaskChildren(projectId, taskId);
          const newSubTasks = new Map(subTasks);
          newSubTasks.set(taskId, children);
          setSubTasks(newSubTasks);
        } catch (error: any) {
          message.error(error.message || '获取子任务失败');
          return;
        }
      }
      newExpandedTasks.add(taskId);
      setExpandedTasks(newExpandedTasks);
    }
  };

  // Handle view task details
  const handleViewTask = (task: Task) => {
    navigate(`/projects/${task.project_id}/tasks/${task.id}`);
  };

  // 计算父任务应该的状态
  const calculateParentStatus = (childrenStatuses: TaskStatus[]): TaskStatus => {
    if (childrenStatuses.length === 0) return 'todo';
    
    const statusCounts = childrenStatuses.reduce((acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<TaskStatus, number>);
    
    // 如果所有子任务都已完成
    if (statusCounts.completed === childrenStatuses.length) {
      return 'completed';
    }
    
    // 如果所有子任务都是待办
    if (statusCounts.todo === childrenStatuses.length) {
      return 'todo';
    }
    
    // 如果有任何子任务在进行中，或者是混合状态
    if (statusCounts.in_progress > 0 || (statusCounts.todo > 0 && statusCounts.completed > 0)) {
      return 'in_progress';
    }
    
    // 如果所有子任务都已取消
    if (statusCounts.cancelled === childrenStatuses.length) {
      return 'cancelled';
    }
    
    // 默认返回进行中
    return 'in_progress';
  };

  // 更新父任务状态
  const updateParentTaskStatus = async (parentTaskId: number, projectId: number) => {
    try {
      // 添加加载状态
      setStatusSyncLoading(prev => new Set(prev).add(parentTaskId));
      
      // 获取所有子任务
      const children = await TaskService.getTaskChildren(projectId, parentTaskId);
      if (children.length === 0) return;
      
      // 计算父任务应该的状态
      const childrenStatuses = children.map(child => child.status);
      const newParentStatus = calculateParentStatus(childrenStatuses);
      
      // 获取父任务当前信息
      const parentTask = tasks.find(t => t.id === parentTaskId);
      if (!parentTask || parentTask.status === newParentStatus) return;
      
      // 更新父任务状态
      await TaskService.updateTask(projectId, parentTaskId, {
        ...parentTask,
        status: newParentStatus
      });
      
      message.success(`父任务"${parentTask.title}"状态自动更新为"${getStatusText(newParentStatus)}"`, 2);
      console.log(`父任务 ${parentTaskId} 状态自动更新为: ${newParentStatus}`);
      
      // 递归更新上级父任务（如果有的话）
      if (parentTask.parent_id) {
        await updateParentTaskStatus(parentTask.parent_id, projectId);
      }
      
    } catch (error: any) {
      console.error('更新父任务状态失败:', error);
      
      // 区分不同类型的错误
      let errorMessage = '父任务状态自动更新失败';
      if (error.message?.includes('Network')) {
        errorMessage = '网络异常，父任务状态同步失败';
      } else if (error.message?.includes('404')) {
        errorMessage = '父任务不存在，状态同步跳过';
      } else if (error.message?.includes('403')) {
        errorMessage = '权限不足，无法更新父任务状态';
      }
      
      message.warning({
        content: `⚠️ ${errorMessage}`,
        duration: 3,
      });
    } finally {
      // 移除加载状态
      setStatusSyncLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(parentTaskId);
        return newSet;
      });
    }
  };


  // 确认父任务状态变更是否要联动子任务
  const confirmParentStatusChange = async (parentTask: Task, newStatus: TaskStatus): Promise<boolean> => {
    return new Promise(async (resolve) => {
      let title = '';
      let content = '';
      let childrenCount = 0;
      
      try {
        // 获取子任务数量以提供更准确的信息
        const projectId = effectiveProjectId || parentTask.project_id;
        const children = await TaskService.getTaskChildren(projectId, parentTask.id);
        childrenCount = children.length;
        
        switch (newStatus) {
          case 'completed':
            title = '完成父任务';
            content = `将父任务"${parentTask.title}"标记为已完成。

该任务有 ${childrenCount} 个子任务，是否同时将所有子任务也标记为已完成？

💡 提示：这将帮助您快速完成整个任务组`;
            break;
          case 'todo':
            title = '重置父任务';
            content = `将父任务"${parentTask.title}"重置为待办。

是否同时将所有已完成的子任务也重置为待办？

💡 提示：这将重新打开已完成的子任务`;
            break;
          case 'cancelled':
            title = '取消父任务';
            content = `将父任务"${parentTask.title}"标记为已取消。

该任务有 ${childrenCount} 个子任务，是否同时取消所有子任务？

⚠️ 注意：这将取消整个任务组`;
            break;
          default:
            resolve(false);
            return;
        }
        
        Modal.confirm({
          title,
          content,
          okText: '是，同时更新子任务',
          cancelText: '否，只更新父任务',
          okType: newStatus === 'cancelled' ? 'danger' : 'primary',
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
          width: 480,
        });
      } catch (error) {
        console.error('获取子任务信息失败:', error);
        // 如果获取子任务失败，使用简化版本
        Modal.confirm({
          title: `${newStatus === 'completed' ? '完成' : newStatus === 'todo' ? '重置' : '取消'}父任务`,
          content: `将父任务"${parentTask.title}"标记为"${getStatusText(newStatus)}"，是否同时更新所有子任务？`,
          okText: '是，同时更新子任务',
          cancelText: '否，只更新父任务',
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      }
    });
  };

  // 批量更新子任务状态
  const updateChildrenTasksStatus = async (parentTask: Task, newStatus: TaskStatus, projectId: number) => {
    try {
      const children = await TaskService.getTaskChildren(projectId, parentTask.id);
      let updatedCount = 0;
      
      for (const child of children) {
        let shouldUpdate = false;
        
        switch (newStatus) {
          case 'completed':
            shouldUpdate = child.status !== 'completed';
            break;
          case 'todo':
            shouldUpdate = child.status === 'completed';
            break;
          case 'cancelled':
            shouldUpdate = child.status !== 'cancelled';
            break;
          case 'in_progress':
            shouldUpdate = child.status !== 'in_progress';
            break;
        }
        
        if (shouldUpdate) {
          await TaskService.updateTask(projectId, child.id, {
            ...child,
            status: newStatus
          });
          updatedCount++;
          
          // 递归更新子任务的子任务
          if ((child.custom_fields?.children_count || 0) > 0) {
            const recursiveCount = await updateChildrenTasksStatus(child, newStatus, projectId);
            updatedCount += recursiveCount;
          }
        }
      }
      
      if (updatedCount > 0) {
        message.success(
          `成功批量更新 ${updatedCount} 个子任务状态为"${getStatusText(newStatus)}"`, 
          3
        );
      }
      
      return updatedCount;
    } catch (error) {
      console.error('批量更新子任务状态失败:', error);
      message.error('批量更新子任务状态失败');
      return 0;
    }
  };

  // 编辑字段辅助函数
  const getFieldKey = (taskId: number, field: string) => `${taskId}_${field}`;
  
  const isFieldEditing = (taskId: number, field: string) => {
    return editingFields.get(getFieldKey(taskId, field)) || false;
  };
  
  const setFieldEditing = (taskId: number, field: string, editing: boolean) => {
    const newMap = new Map(editingFields);
    newMap.set(getFieldKey(taskId, field), editing);
    setEditingFields(newMap);
  };

  // 异步更新字段值
  const handleFieldUpdate = async (task: Task, field: string, value: any) => {
    const updateKey = `${task.id}_${field}`;
    
    // 清除之前的防抖超时
    const existingTimeout = updateTimeouts.get(updateKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // 乐观更新：立即更新UI
    if (field === 'status') {
      setTasks(prevTasks => 
        prevTasks.map(t => 
          t.id === task.id ? { ...t, status: value } : t
        )
      );
    }
    
    try {
      const projectId = effectiveProjectId || task.project_id;
      
      // 构建更新请求对象 - 只包含必要字段，避免发送所有task数据
      const updateData: any = {
        title: task.title,
        description: task.description,
        status: task.status,
        assignee_id: task.assignee_id,
        due_date: task.due_date,
        custom_fields: task.custom_fields || {},
        parent_id: task.parent_id,
        sort_order: task.sort_order
      };
      
      // 根据字段类型更新对应的数据
      if (field === 'status') {
        updateData.status = value;
        
        // 添加同步状态标识
        setStatusSyncLoading(prev => {
          const newSet = new Set(prev);
          newSet.add(task.id);
          return newSet;
        });
        
        // 如果是状态更新，需要处理父子任务联动
        const isParentTask = (task.custom_fields?.children_count || 0) > 0;
        if (isParentTask) {
          const shouldUpdateChildren = await confirmParentStatusChange(task, value);
          if (shouldUpdateChildren) {
            await updateChildrenTasksStatus(task, value, projectId);
          }
        }
      } else if (field === 'due_date') {
        // 确保日期格式正确 - 已经是正确格式的字符串或null
        updateData.due_date = value;
      } else if (field === 'priority') {
        updateData.custom_fields = { ...updateData.custom_fields, priority: value };
      } else if (field === 'tags') {
        updateData.custom_fields = { ...updateData.custom_fields, tags: value };
      } else {
        console.warn('Unsupported field for update:', field);
        message.error(`${getFieldDisplayName(field)}暂不支持编辑`);
        setFieldEditing(task.id, field, false);
        return;
      }
      
      console.log('Updating field:', field, 'with value:', value);
      console.log('Update data:', updateData);
      
      await TaskService.updateTask(projectId, task.id, updateData);
      
      // 如果是子任务状态更新，自动更新父任务状态
      if (field === 'status' && task.parent_id) {
        await updateParentTaskStatus(task.parent_id, projectId);
      }
      
      // 显示成功消息并添加特殊样式
      if (field === 'status') {
        message.success({
          content: (
            <span className="sync-success">
              状态联动更新成功 ✨
            </span>
          ),
          duration: 2,
        });
      } else {
        message.success(`${getFieldDisplayName(field)}更新成功`);
      }
      
      // 刷新任务列表
      loadTasks(pagination.current, pagination.pageSize);
    } catch (error: any) {
      console.error('Field update error:', error);
      
      // 提供重试选项对于网络错误
      if (error.message?.includes('Network') || error.message?.includes('timeout')) {
        Modal.confirm({
          title: '网络错误',
          content: `${getFieldDisplayName(field)}更新失败，可能是网络问题。是否要重试？`,
          okText: '重试',
          cancelText: '取消',
          onOk: () => {
            // 重试更新
            setTimeout(() => {
              handleFieldUpdate(task, field, value);
            }, 1000);
          },
        });
      } else {
        // 其他错误直接显示错误信息
        let errorMessage = `${getFieldDisplayName(field)}更新失败`;
        if (error.message?.includes('404')) {
          errorMessage = '任务不存在或已被删除';
        } else if (error.message?.includes('403')) {
          errorMessage = '权限不足，无法修改此任务';
        } else if (error.message?.includes('400')) {
          errorMessage = '数据格式错误，请检查输入内容';
        }
        
        message.error(errorMessage);
      }
    } finally {
      // 清除编辑状态
      setFieldEditing(task.id, field, false);
      
      // 清除同步状态标识
      if (field === 'status') {
        setStatusSyncLoading(prev => {
          const newSet = new Set(prev);
          newSet.delete(task.id);
          return newSet;
        });
      }
      
      // 清除防抖超时
      const updateKey = `${task.id}_${field}`;
      setUpdateTimeouts(prev => {
        const newMap = new Map(prev);
        newMap.delete(updateKey);
        return newMap;
      });
    }
  };

  // 获取字段显示名称
  const getFieldDisplayName = (field: string): string => {
    const fieldNames = {
      'status': '状态',
      'assignee_name': '负责人',
      'assignee': '负责人',
      'due_date': '截止时间',
      'priority': '优先级',
      'tags': '标签'
    };
    return fieldNames[field as keyof typeof fieldNames] || '字段';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'processing';
      case 'todo':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'in_progress':
        return '进行中';
      case 'todo':
        return '待办';
      default:
        return '未知';
    }
  };


  const columns = [
    {
      title: '任务名称',
      dataIndex: 'title',
      key: 'title',
      width: effectiveProjectId ? '40%' : '30%',
      render: (text: string, record: Task & { isSubTask?: boolean; depth?: number }) => {
        const depth = record.depth || 0;
        const isSubTask = depth > 0;
        const hasChildren = (record.custom_fields?.children_count || 0) > 0;
        const isExpanded = expandedTasks.has(record.id);
        
        return (
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            {/* 展开/收起按钮和缩进合并区域 */}
            <div style={{ 
              width: Math.max(20, depth * 20), 
              flexShrink: 0, 
              marginTop: '2px',
              paddingLeft: depth > 0 ? (depth - 1) * 16 : 0,
              display: 'flex',
              justifyContent: depth > 0 ? 'flex-end' : 'flex-start'
            }}>
              {hasChildren ? (
                <Button
                  type="text"
                  size="small"
                  icon={isExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
                  onClick={() => handleToggleExpand(record)}
                  style={{ 
                    padding: 0, 
                    minWidth: '16px', 
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                />
              ) : (
                <span style={{ 
                  display: 'inline-block', 
                  width: '16px', 
                  height: '16px',
                  color: '#d9d9d9',
                  fontSize: '12px',
                  textAlign: 'center',
                  lineHeight: '16px'
                }}>
                  {depth > 0 ? '•' : ''}
                </span>
              )}
            </div>
            
            {/* 任务内容 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontWeight: isSubTask ? 400 : 500,
                color: isSubTask ? '#666' : '#000',
                marginBottom: '2px',
                lineHeight: '20px'
              }}>
                {text}
              </div>
              {record.description && (
                <div style={{ 
                  color: '#8c8c8c', 
                  fontSize: 12, 
                  lineHeight: '1.3',
                  maxWidth: '300px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {record.description}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    
    // 项目列 - 只在全局视图显示，并且优化样式
    ...(!effectiveProjectId ? [{
      title: '所属项目',
      dataIndex: 'project_name',
      key: 'project_name',
      width: '15%',
      render: (name: string, record: Task) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: `hsl(${(record.project_id * 137.5) % 360}, 70%, 60%)`
          }} />
          <span style={{ 
            fontWeight: 500,
            color: '#262626'
          }}>
            {name || '未知项目'}
          </span>
        </div>
      ),
    }] : []),

    // 优先级列 - 异步编辑
    {
      title: '优先级',
      dataIndex: 'custom_fields',
      key: 'priority',
      width: '10%',
      render: (customFields: any, record: Task) => {
        const priority = customFields?.priority as string;
        const isEditing = isFieldEditing(record.id, 'priority');
        
        const priorityConfig = {
          high: { color: '#ff4d4f', icon: '🔥', text: '高' },
          medium: { color: '#fa8c16', icon: '⚡', text: '中' },
          low: { color: '#52c41a', icon: '📝', text: '低' }
        };
        
        return (
          <div 
            style={{ 
              position: 'relative',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              if (!isEditing) {
                const editIcon = e.currentTarget.querySelector('.edit-icon') as HTMLElement;
                if (editIcon) editIcon.style.opacity = '1';
              }
            }}
            onMouseLeave={(e) => {
              if (!isEditing) {
                const editIcon = e.currentTarget.querySelector('.edit-icon') as HTMLElement;
                if (editIcon) editIcon.style.opacity = '0';
              }
            }}
            onClick={() => {
              if (!isEditing) {
                setFieldEditing(record.id, 'priority', true);
              }
            }}
          >
            {isEditing ? (
              <Select
                value={priority}
                size="small"
                style={{ width: '90px' }}
                autoFocus
                onChange={(value) => handleFieldUpdate(record, 'priority', value)}
                onBlur={() => setFieldEditing(record.id, 'priority', false)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setFieldEditing(record.id, 'priority', false);
                  }
                }}
                options={[
                  { value: 'high', label: '🔥 高' },
                  { value: 'medium', label: '⚡ 中' },
                  { value: 'low', label: '📝 低' },
                ]}
              />
            ) : (
              <>
                {(() => {
                  const config = priorityConfig[priority as keyof typeof priorityConfig];
                  return config ? (
                    <Tag color={config.color} style={{ border: 'none', fontWeight: 500 }}>
                      {config.icon} {config.text}
                    </Tag>
                  ) : (
                    <Tag color="default">-</Tag>
                  );
                })()}
                <EditOutlined 
                  className="edit-icon"
                  style={{ 
                    position: 'absolute',
                    right: '-4px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    fontSize: '12px',
                    color: '#1890ff',
                    cursor: 'pointer'
                  }}
                />
              </>
            )}
          </div>
        );
      },
    },
    // 状态列 - 内联编辑设计
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: '12%',
      render: (status: TaskStatus, record: Task) => {
        const isEditing = isFieldEditing(record.id, 'status');
        const isSyncing = statusSyncLoading.has(record.id);
        
        return (
          <div 
            style={{ 
              position: 'relative',
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              opacity: isSyncing ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!isEditing && !isSyncing) {
                const editIcon = e.currentTarget.querySelector('.edit-icon') as HTMLElement;
                if (editIcon) editIcon.style.opacity = '1';
              }
            }}
            onMouseLeave={(e) => {
              if (!isEditing && !isSyncing) {
                const editIcon = e.currentTarget.querySelector('.edit-icon') as HTMLElement;
                if (editIcon) editIcon.style.opacity = '0';
              }
            }}
            onClick={() => {
              if (!isEditing && !isSyncing) {
                setFieldEditing(record.id, 'status', true);
              }
            }}
          >
            {isSyncing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Tag color={getStatusColor(status)} style={{ fontWeight: 500 }}>
                  {getStatusText(status)}
                </Tag>
                <span className="sync-indicator" style={{ 
                  fontSize: '12px', 
                  color: '#1890ff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#1890ff'
                  }} />
                  同步中...
                </span>
              </div>
            ) : isEditing ? (
              <Select
                value={status}
                size="small"
                style={{ width: '100px' }}
                autoFocus
                onChange={(newStatus: TaskStatus) => handleFieldUpdate(record, 'status', newStatus)}
                onBlur={() => setFieldEditing(record.id, 'status', false)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setFieldEditing(record.id, 'status', false);
                  }
                }}
                options={[
                  { value: 'todo', label: '待办' },
                  { value: 'in_progress', label: '进行中' },
                  { value: 'completed', label: '已完成' },
                  { value: 'cancelled', label: '已取消' },
                ]}
              />
            ) : (
              <>
                <Tag color={getStatusColor(status)} style={{ fontWeight: 500 }}>
                  {getStatusText(status)}
                </Tag>
                <EditOutlined 
                  className="edit-icon"
                  style={{ 
                    position: 'absolute',
                    right: '-4px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    fontSize: '12px',
                    color: '#1890ff',
                    cursor: 'pointer'
                  }}
                />
              </>
            )}
          </div>
        );
      },
    },
    
    // 负责人列 - 暂时只显示，不支持编辑（需要用户管理功能）
    {
      title: '负责人',
      dataIndex: 'assignee_name',
      key: 'assignee_name',
      width: '12%',
      render: (name: string, record: Task) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: name ? '#1890ff' : '#d9d9d9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            color: 'white',
            fontWeight: 500
          }}>
            {name ? name.charAt(0).toUpperCase() : '?'}
          </div>
          <span style={{ 
            color: name ? '#262626' : '#8c8c8c',
            fontSize: '13px'
          }}>
            {name || '未分配'}
          </span>
        </div>
      ),
    },
    
    // 截止时间列 - 异步编辑
    {
      title: '截止时间',
      dataIndex: 'due_date',
      key: 'due_date',
      width: '12%',
      render: (date: string, record: Task) => {
        const isEditing = isFieldEditing(record.id, 'due_date');
        
        return (
          <div 
            style={{ 
              position: 'relative',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              if (!isEditing) {
                const editIcon = e.currentTarget.querySelector('.edit-icon') as HTMLElement;
                if (editIcon) editIcon.style.opacity = '1';
              }
            }}
            onMouseLeave={(e) => {
              if (!isEditing) {
                const editIcon = e.currentTarget.querySelector('.edit-icon') as HTMLElement;
                if (editIcon) editIcon.style.opacity = '0';
              }
            }}
            onClick={() => {
              if (!isEditing) {
                setFieldEditing(record.id, 'due_date', true);
              }
            }}
          >
            {isEditing ? (
              <DatePicker
                size="small"
                defaultValue={date ? dayjs(date) : undefined}
                autoFocus
                style={{ width: '130px' }}
                onChange={(dateValue) => {
                  // dateValue是dayjs对象或null
                  const isoDate = dateValue ? dateValue.format('YYYY-MM-DD') : null;
                  handleFieldUpdate(record, 'due_date', isoDate);
                }}
                onBlur={() => setFieldEditing(record.id, 'due_date', false)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setFieldEditing(record.id, 'due_date', false);
                  }
                }}
                allowClear
              />
            ) : (
              <>
                {date ? (() => {
                  const dueDate = new Date(date);
                  const now = new Date();
                  const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  
                  let color = '#8c8c8c';
                  let bgColor = '#fafafa';
                  let icon = '📅';
                  
                  if (diffDays < 0) {
                    color = '#ff4d4f';
                    bgColor = '#fff2f0';
                    icon = '⚠️';
                  } else if (diffDays <= 3) {
                    color = '#fa8c16';
                    bgColor = '#fff7e6';
                    icon = '⏰';
                  }
                  
                  return (
                    <div style={{
                      padding: '2px 8px',
                      backgroundColor: bgColor,
                      borderRadius: '4px',
                      fontSize: '12px',
                      color,
                      fontWeight: 500,
                      display: 'inline-block'
                    }}>
                      {icon} {dueDate.toLocaleDateString()}
                    </div>
                  );
                })() : (
                  <span style={{ color: '#8c8c8c' }}>未设置</span>
                )}
                <EditOutlined 
                  className="edit-icon"
                  style={{ 
                    position: 'absolute',
                    right: '-4px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    fontSize: '12px',
                    color: '#1890ff',
                    cursor: 'pointer'
                  }}
                />
              </>
            )}
          </div>
        );
      },
    },
    // 创建时间列 - 只在全局视图显示
    ...(!effectiveProjectId ? [{
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: '12%',
      render: (date: string) => {
        if (!date) return '-';
        const createDate = new Date(date);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - createDate.getTime()) / (1000 * 60 * 60 * 24));
        
        let timeText = '';
        if (diffDays === 0) {
          timeText = '今天';
        } else if (diffDays === 1) {
          timeText = '昨天';
        } else if (diffDays < 7) {
          timeText = `${diffDays}天前`;
        } else {
          timeText = createDate.toLocaleDateString();
        }
        
        return (
          <span style={{ color: '#8c8c8c', fontSize: '13px' }}>
            {timeText}
          </span>
        );
      },
    }] : []),

    // 标签列 - 异步编辑
    {
      title: '标签',
      key: 'tags',
      width: effectiveProjectId ? '12%' : '10%',
      render: (_: any, record: Task) => {
        const tags = record.custom_fields?.tags || [];
        const isEditing = isFieldEditing(record.id, 'tags');
        
        return (
          <div 
            style={{ 
              position: 'relative',
              cursor: 'pointer',
              minHeight: '24px'
            }}
            onMouseEnter={(e) => {
              if (!isEditing) {
                const editIcon = e.currentTarget.querySelector('.edit-icon') as HTMLElement;
                if (editIcon) editIcon.style.opacity = '1';
              }
            }}
            onMouseLeave={(e) => {
              if (!isEditing) {
                const editIcon = e.currentTarget.querySelector('.edit-icon') as HTMLElement;
                if (editIcon) editIcon.style.opacity = '0';
              }
            }}
            onClick={() => {
              if (!isEditing) {
                setFieldEditing(record.id, 'tags', true);
              }
            }}
          >
            {isEditing ? (
              <Input
                size="small"
                defaultValue={Array.isArray(tags) ? tags.join(', ') : ''}
                autoFocus
                style={{ width: '150px' }}
                placeholder="用逗号分隔标签"
                onPressEnter={(e) => {
                  const value = (e.target as HTMLInputElement).value;
                  const tagArray = value.split(',').map(tag => tag.trim()).filter(tag => tag);
                  handleFieldUpdate(record, 'tags', tagArray);
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  const tagArray = value.split(',').map(tag => tag.trim()).filter(tag => tag);
                  const originalTags = Array.isArray(tags) ? tags.join(', ') : '';
                  if (value !== originalTags) {
                    handleFieldUpdate(record, 'tags', tagArray);
                  } else {
                    setFieldEditing(record.id, 'tags', false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setFieldEditing(record.id, 'tags', false);
                  }
                }}
              />
            ) : (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                  {Array.isArray(tags) && tags.length > 0 ? (
                    <>
                      {tags.slice(0, 2).map((tag: string) => (
                        <Tag 
                          key={tag} 
                          style={{ 
                            marginBottom: 2, 
                            fontSize: '11px',
                            padding: '0 6px',
                            lineHeight: '18px',
                            borderRadius: '9px'
                          }}
                          color="blue"
                        >
                          {tag}
                        </Tag>
                      ))}
                      {tags.length > 2 && (
                        <Tag style={{ 
                          fontSize: '11px',
                          padding: '0 6px',
                          lineHeight: '18px',
                          borderRadius: '9px'
                        }}>
                          +{tags.length - 2}
                        </Tag>
                      )}
                    </>
                  ) : (
                    <span style={{ color: '#8c8c8c', fontSize: '12px' }}>无标签</span>
                  )}
                </div>
                <EditOutlined 
                  className="edit-icon"
                  style={{ 
                    position: 'absolute',
                    right: '-4px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    fontSize: '12px',
                    color: '#1890ff',
                    cursor: 'pointer'
                  }}
                />
              </>
            )}
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: Task & { isSubTask?: boolean; depth?: number }) => (
        <Space size="small">
          {/* 添加子任务按钮 */}
          <Button
            type="text"
            size="small"
            icon={<AppstoreAddOutlined />}
            onClick={() => handleCreateSubTask(record)}
            title="添加子任务"
          />
          
          {/* 查看按钮 - 外显 */}
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewTask(record)}
            title="查看详情"
          />
          
          {/* 更多操作下拉菜单 */}
          <Dropdown
            menu={{
              items: [
                {
                  key: 'history',
                  label: '更新历史',
                  icon: <HistoryOutlined />,
                  onClick: () => navigate(`/projects/${record.project_id}/tasks/${record.id}?tab=history`),
                },
                {
                  key: 'edit',
                  label: '编辑',
                  icon: <EditOutlined />,
                  onClick: () => handleEditTask(record),
                },
                {
                  key: 'delete',
                  label: '删除',
                  icon: <DeleteOutlined />,
                  danger: true,
                  onClick: () => handleDeleteTask(record),
                },
              ],
            }}
          >
            <Button type="text" size="small" icon={<MoreOutlined />} title="更多操作" />
          </Dropdown>
        </Space>
      ),
    },
  ];

  // Build expanded data source including subtasks
  const buildExpandedDataSource = () => {
    // Ensure tasks is always an array
    if (!Array.isArray(tasks)) {
      console.warn('Tasks is not an array:', tasks);
      return [];
    }

    const result: (Task & { isSubTask?: boolean; depth?: number })[] = [];
    
    // Recursive function to add tasks and their expanded children
    const addTaskWithChildren = (task: Task, depth: number) => {
      if (!task || typeof task !== 'object') {
        console.warn('Invalid task object:', task);
        return;
      }
      
      result.push({ ...task, isSubTask: depth > 0, depth });
      
      // Add expanded subtasks recursively
      if (expandedTasks.has(task.id)) {
        const children = subTasks.get(task.id) || [];
        if (Array.isArray(children)) {
          children.forEach(child => {
            if (child && typeof child === 'object') {
              addTaskWithChildren(child, depth + 1);
            }
          });
        }
      }
    };
    
    // Only add root tasks (tasks without parent_id) from the main tasks list
    // This prevents duplicate display when subtasks are also in the main list
    const rootTasks = tasks.filter(task => task && typeof task === 'object' && !task.parent_id);
    if (Array.isArray(rootTasks)) {
      rootTasks.forEach(task => {
        if (task && typeof task === 'object') {
          addTaskWithChildren(task, 0);
        }
      });
    }
    
    return result;
  };

  return (
    <div className="page-container">
      {/* 项目选择卡片 - 增强样式 */}
      {!projectId && (
        <Card 
          style={{
            marginBottom: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}
        >
          <Row gutter={[24, 16]} align="middle">
            <Col xs={24} sm={12} md={10} lg={8}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px', 
                  fontWeight: 600,
                  color: 'white',
                  fontSize: '16px'
                }}>
                  选择项目
                </label>
                <ProjectSelector
                  value={selectedProjectId}
                  onChange={(projectId, project) => {
                    if (projectId) {
                      handleProjectChange(projectId, project);
                    } else {
                      handleProjectClear();
                    }
                  }}
                  style={{ width: '100%' }}
                  placeholder="全部项目"
                  allowClear
                />
              </div>
            </Col>
            
            {selectedProject && (
              <Col xs={24} sm={12} md={14} lg={16}>
                <div style={{ 
                  padding: '16px 20px',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                    <strong>当前项目:</strong> {selectedProject.name}
                  </div>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>
                    {selectedProject.description || '暂无描述'}
                  </div>
                </div>
              </Col>
            )}
          </Row>
        </Card>
      )}
      
      {/* 现代化头部卡片 */}
      <Card 
        style={{
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: '12px',
          border: 'none'
        }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div>
                <h1 style={{ 
                  margin: 0, 
                  fontSize: '24px', 
                  fontWeight: 600, 
                  color: '#262626' 
                }}>
                  {effectiveProjectId ? '任务列表' : '全局任务列表'}
                </h1>
                <p style={{ 
                  margin: '4px 0 0 0', 
                  color: '#8c8c8c',
                  fontSize: '14px'
                }}>
                  {projectId ? `项目: ${projectId}` : 
                   selectedProject ? `项目: ${selectedProject.name}` : 
                   '全部项目 - 跨项目任务管理'}
                </p>
              </div>
              
              {/* 统计信息 */}
              {!effectiveProjectId && globalStats.totalTasks > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{
                    padding: '6px 12px',
                    backgroundColor: '#f0f9ff',
                    border: '1px solid #91d5ff',
                    borderRadius: '16px',
                    fontSize: '13px',
                    color: '#1890ff',
                    fontWeight: 500
                  }}>
                    📊 {globalStats.projectCount} 个项目
                  </div>
                  <div style={{
                    padding: '6px 12px',
                    backgroundColor: '#f6ffed',
                    border: '1px solid #b7eb8f',
                    borderRadius: '16px',
                    fontSize: '13px',
                    color: '#52c41a',
                    fontWeight: 500
                  }}>
                    ✅ {globalStats.completedTasks} 已完成
                  </div>
                  <div style={{
                    padding: '6px 12px',
                    backgroundColor: '#fff7e6',
                    border: '1px solid #ffd591',
                    borderRadius: '16px',
                    fontSize: '13px',
                    color: '#fa8c16',
                    fontWeight: 500
                  }}>
                    ⏳ {globalStats.inProgressTasks} 进行中
                  </div>
                  <div style={{
                    padding: '6px 12px',
                    backgroundColor: '#fafafa',
                    border: '1px solid #d9d9d9',
                    borderRadius: '16px',
                    fontSize: '13px',
                    color: '#8c8c8c',
                    fontWeight: 500
                  }}>
                    📝 {globalStats.todoTasks} 待开始
                  </div>
                </div>
              )}
              
              {/* 单项目任务数量徽章 */}
              {effectiveProjectId && tasks.length > 0 && (
                <div style={{
                  padding: '4px 12px',
                  backgroundColor: '#e6f7ff',
                  border: '1px solid #91d5ff',
                  borderRadius: '16px',
                  fontSize: '14px',
                  color: '#1890ff',
                  fontWeight: 500
                }}>
                  共 {tasks.length} 个任务
                </div>
              )}
            </div>
          </Col>
          
          <Col>
            <Space size="large">
              {/* 视图切换 - 现代化设计 */}
              {effectiveProjectId && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  padding: '8px 16px',
                  backgroundColor: '#fafafa',
                  borderRadius: '20px',
                  border: '1px solid #d9d9d9'
                }}>
                  <MenuOutlined 
                    style={{ 
                      color: hierarchicalView ? '#1890ff' : '#8c8c8c',
                      fontSize: '16px',
                      transition: 'color 0.3s'
                    }} 
                  />
                  <Switch
                    checked={hierarchicalView}
                    onChange={setHierarchicalView}
                    checkedChildren="层级"
                    unCheckedChildren="列表"
                    style={{ fontWeight: 500 }}
                  />
                  <AppstoreOutlined 
                    style={{ 
                      color: !hierarchicalView ? '#1890ff' : '#8c8c8c',
                      fontSize: '16px',
                      transition: 'color 0.3s'
                    }} 
                  />
                </div>
              )}

              <Button
                type="default"
                icon={<ImportOutlined />}
                onClick={() => {
                  if (!effectiveProjectId) {
                    message.warning('全局模式下请先从上方选择一个项目，然后进行批量导入');
                    return;
                  }
                  navigate(`/projects/${effectiveProjectId}/bulk-import`);
                }}
                style={{ height: '40px' }}
              >
                批量导入
              </Button>
              
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  if (!effectiveProjectId) {
                    message.warning('全局模式下请先从上方选择一个项目，然后新建任务');
                    return;
                  }
                  handleNewTask();
                }}
                size="large"
                style={{ 
                  height: '40px',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(24,144,255,0.3)'
                }}
              >
                新建任务
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 任务内容区域 */}
      {effectiveProjectId ? (
        <Card
          style={{
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            borderRadius: '12px',
            border: 'none',
            minHeight: '500px'
          }}
        >
          {hierarchicalView ? (
            <div>
              <div style={{ 
                marginBottom: '16px', 
                padding: '12px 16px',
                backgroundColor: '#f0f9ff',
                borderRadius: '6px',
                border: '1px solid #bae7ff'
              }}>
                <strong style={{ color: '#1890ff' }}>层级视图</strong>
                <span style={{ marginLeft: '8px', color: '#666' }}>
                  点击箭头图标展开/折叠子任务，点击 + 号添加子任务，点击 ⋯ 进行更多操作
                </span>
              </div>
              <HierarchicalTaskList
                projectId={effectiveProjectId}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onCreateSubTask={handleCreateSubTask}
                loading={loading}
              />
            </div>
          ) : (
            <div>
              <div style={{ 
                marginBottom: '16px', 
                padding: '12px 16px',
                backgroundColor: '#f6ffed',
                borderRadius: '6px',
                border: '1px solid #b7eb8f'
              }}>
                <strong style={{ color: '#52c41a' }}>列表视图</strong>
                <span style={{ marginLeft: '8px', color: '#666' }}>
                  完整的任务列表，支持分页、排序和搜索功能
                </span>
              </div>
              <Table
                dataSource={buildExpandedDataSource()}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={pagination.total > pagination.pageSize ? {
                  ...pagination,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
                } : false}
                onChange={handleTableChange}
                rowClassName={(record: Task & { isSubTask?: boolean; depth?: number }) => {
                  const depth = record.depth || 0;
                  const baseClass = depth > 0 ? 'subtask-row' : 'main-task-row';
                  const depthClass = depth > 0 ? `task-hierarchy-item depth-${depth}` : '';
                  return `${baseClass} ${depthClass}`.trim();
                }}
                expandable={{
                  childrenColumnName: 'nonExistentField' // 禁用默认的展开功能
                }}
              />
            </div>
          )}
        </Card>
      ) : (
        // 全局任务视图
        <Card
          style={{
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            borderRadius: '12px',
            border: 'none',
            minHeight: '500px'
          }}
        >
          <div style={{ 
            marginBottom: '16px', 
            padding: '12px 16px',
            backgroundColor: '#f0f9ff',
            borderRadius: '6px',
            border: '1px solid #bae7ff'
          }}>
            <strong style={{ color: '#1890ff' }}>全局任务视图</strong>
            <span style={{ marginLeft: '8px', color: '#666' }}>
              显示所有项目的任务，支持筛选、搜索和跨项目管理
            </span>
          </div>
          
          {/* 全局任务表格 */}
          <Table
            dataSource={buildExpandedDataSource()}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={pagination.total > pagination.pageSize ? {
              ...pagination,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
            } : false}
            onChange={handleTableChange}
            rowClassName={(record: Task & { isSubTask?: boolean; depth?: number }) => {
              const depth = record.depth || 0;
              const baseClass = depth > 0 ? 'subtask-row' : 'main-task-row';
              const depthClass = depth > 0 ? `task-hierarchy-item depth-${depth}` : '';
              return `${baseClass} ${depthClass}`.trim();
            }}
            expandable={{
              childrenColumnName: 'nonExistentField' // 禁用默认的展开功能
            }}
          />
        </Card>
      )}

      {(() => {
        const modalProjectId = effectiveProjectId || parentTaskForNew?.project_id || editingTask?.project_id;
        
        // 如果模态框应该显示但没有有效的项目ID，显示错误提示
        if (taskModalVisible && !modalProjectId) {
          // 自动关闭模态框并显示错误
          setTimeout(() => {
            setTaskModalVisible(false);
            setEditingTask(undefined);
            setParentTaskForNew(undefined);
            message.error('操作失败：缺少项目信息，请刷新页面后重试');
          }, 0);
          return null;
        }
        
        return modalProjectId && taskModalVisible ? (
          <TaskModal
            visible={taskModalVisible}
            task={editingTask}
            projectId={modalProjectId}
            onOk={editingTask ? handleUpdateTask : handleCreateTask}
            onCancel={handleModalClose}
            loading={modalLoading}
            parentTask={parentTaskForNew}
            allowParentSelection={!editingTask && !parentTaskForNew}
          />
        ) : null;
      })()}
    </div>
  );
};

export default TasksPage;