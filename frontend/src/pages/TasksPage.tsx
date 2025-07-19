import React, { useState, useEffect } from 'react';
import { Button, Table, Tag, Space, Dropdown, message, Modal, Switch, Select } from 'antd';
import { PlusOutlined, ImportOutlined, MoreOutlined, EditOutlined, DeleteOutlined, BranchesOutlined, UnorderedListOutlined, EyeOutlined, AppstoreAddOutlined, CaretRightOutlined, CaretDownOutlined, HistoryOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { Task, TaskRequest, TaskStatus } from '../types/task';
import { TaskService } from '../services/taskService';
import TaskModal from '../components/TaskModal';
import HierarchicalTaskList from '../components/HierarchicalTaskList';

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

  const projectIdNum = parseInt(projectId || '0');

  // Load tasks from API
  const loadTasks = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      let response;
      if (projectIdNum) {
        // Load tasks for specific project
        response = await TaskService.getTasks(projectIdNum, {
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
      
      setPagination({
        current: response.pagination?.page || page,
        pageSize: response.pagination?.page_size || pageSize,
        total: response.pagination?.total || 0,
      });
    } catch (error: any) {
      console.error('Error loading tasks:', error);
      message.error(error.message || '获取任务列表失败');
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

  // Load tasks on component mount and when projectId changes
  useEffect(() => {
    loadTasks();
  }, [projectIdNum]); // Note: loadTasks is stable due to useCallback dependency management

  // Handle task creation
  const handleCreateTask = async (taskData: TaskRequest) => {
    setModalLoading(true);
    try {
      // Add parent_id if creating a subtask
      const requestData = parentTaskForNew 
        ? { ...taskData, parent_id: parentTaskForNew.id }
        : taskData;
      
      // Use parent task's project_id if creating a subtask, otherwise use projectIdNum
      const projectId = parentTaskForNew ? parentTaskForNew.project_id : projectIdNum;
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
      // Use the editing task's project_id if projectIdNum is not available (for global task list)
      const projectId = projectIdNum || editingTask.project_id;
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
          // Use the task's project_id if projectIdNum is not available (for global task list)
          const projectId = projectIdNum || task.project_id;
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
    setEditingTask(task);
    setTaskModalVisible(true);
  };

  // Handle create new task
  const handleNewTask = () => {
    setEditingTask(undefined);
    setParentTaskForNew(undefined);
    setTaskModalVisible(true);
  };

  // Handle create subtask
  const handleCreateSubTask = (parentTask: Task) => {
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
          // Use the task's project_id if projectIdNum is not available (for global task list)
          const projectId = projectIdNum || task.project_id;
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

  // Handle quick status change
  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    try {
      const projectId = projectIdNum || task.project_id;
      await TaskService.updateTask(projectId, task.id, { 
        ...task, 
        status: newStatus 
      });
      message.success('任务状态更新成功');
      
      // Refresh task list and clear expanded subtasks cache to reflect changes
      setSubTasks(new Map());
      setExpandedTasks(new Set());
      loadTasks(pagination.current, pagination.pageSize);
    } catch (error: any) {
      message.error(error.message || '状态更新失败');
    }
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'red';
      case 'medium':
        return 'orange';
      case 'low':
        return 'blue';
      default:
        return 'default';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return '未知';
    }
  };

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Task & { isSubTask?: boolean; depth?: number }) => {
        const depth = record.depth || 0;
        const isSubTask = depth > 0;
        const getIndentSymbol = (d: number) => {
          if (d === 0) return '';
          if (d === 1) return '├─ ';
          return '│ '.repeat(d - 1) + '└─ ';
        };
        
        return (
          <div style={{ paddingLeft: depth * 16 }}>
            <div style={{ 
              fontWeight: isSubTask ? 400 : 500,
              color: isSubTask ? '#666' : '#000'
            }}>
              <span style={{ color: '#999', marginRight: 4, fontFamily: 'monospace' }}>
                {getIndentSymbol(depth)}
              </span>
              {text}
            </div>
            <div style={{ color: '#8c8c8c', fontSize: 12, paddingLeft: depth * 4 }}>
              {record.description}
            </div>
          </div>
        );
      },
    },
    ...(projectId ? [] : [{
      title: '项目',
      dataIndex: 'project_name',
      key: 'project_name',
      render: (name: string) => name || '未知项目',
    }]),
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: TaskStatus, record: Task) => (
        <Space>
          <Tag color={getStatusColor(status)}>
            {getStatusText(status)}
          </Tag>
          <Select
            value={status}
            size="small"
            style={{ width: 90 }}
            onChange={(newStatus: TaskStatus) => handleStatusChange(record, newStatus)}
            options={[
              { value: 'todo', label: '待办' },
              { value: 'in_progress', label: '进行中' },
              { value: 'completed', label: '已完成' },
              { value: 'cancelled', label: '已取消' },
            ]}
          />
        </Space>
      ),
    },
    {
      title: '负责人',
      dataIndex: 'assignee_name',
      key: 'assignee_name',
      render: (name: string) => name || '未分配',
    },
    {
      title: '截止时间',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (date: string) => date || '无',
    },
    {
      title: '优先级',
      key: 'priority',
      render: (_: any, record: Task) => {
        const priority = record.custom_fields?.priority || 'medium';
        return (
          <Tag color={getPriorityColor(priority)}>
            {getPriorityText(priority)}
          </Tag>
        );
      },
    },
    {
      title: '标签',
      key: 'tags',
      render: (_: any, record: Task) => {
        const tags = record.custom_fields?.tags || [];
        return (
          <div>
            {tags.slice(0, 2).map((tag: string) => (
              <Tag key={tag} style={{ marginBottom: 2, fontSize: '12px' }}>
                {tag}
              </Tag>
            ))}
            {tags.length > 2 && <Tag style={{ fontSize: '12px' }}>+{tags.length - 2}</Tag>}
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
          {/* 子任务按钮 - 放在原来查看的位置 */}
          <Button
            type="text"
            size="small"
            icon={<AppstoreAddOutlined />}
            onClick={() => handleCreateSubTask(record)}
            title="添加子任务"
          />
          
          {/* 展开/收起按钮 - 只对有子任务的显示 */}
          {(record.custom_fields?.children_count || 0) > 0 && (
            <Button
              type="text"
              size="small"
              icon={expandedTasks.has(record.id) ? <CaretDownOutlined /> : <CaretRightOutlined />}
              onClick={() => handleToggleExpand(record)}
              title={expandedTasks.has(record.id) ? "收起子任务" : "展开子任务"}
            />
          )}
          
          {/* 更多操作下拉菜单 */}
          <Dropdown
            menu={{
              items: [
                {
                  key: 'view',
                  label: '查看',
                  icon: <EyeOutlined />,
                  onClick: () => handleViewTask(record),
                },
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
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">任务列表</h1>
            <p className="page-description">
              {projectId ? `项目ID: ${projectId}` : '所有项目'}
            </p>
          </div>
          <Space>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UnorderedListOutlined />
              <Switch
                checked={hierarchicalView}
                onChange={setHierarchicalView}
                checkedChildren={<BranchesOutlined />}
                unCheckedChildren={<UnorderedListOutlined />}
              />
              <BranchesOutlined />
              <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                {hierarchicalView ? '层级视图' : '列表视图'}
              </span>
            </div>
            <Button
              type="default"
              icon={<ImportOutlined />}
              onClick={() => navigate(`/projects/${projectId}/bulk-import`)}
            >
              批量导入
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleNewTask}>
              创建任务
            </Button>
          </Space>
        </div>
      </div>

      {hierarchicalView && projectIdNum ? (
        <HierarchicalTaskList
          projectId={projectIdNum}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          onCreateSubTask={handleCreateSubTask}
          loading={loading}
        />
      ) : (
        <Table
          dataSource={buildExpandedDataSource()}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
          }}
          onChange={handleTableChange}
          rowClassName={(record: Task & { isSubTask?: boolean; depth?: number }) => {
            const depth = record.depth || 0;
            const baseClass = depth > 0 ? 'subtask-row' : 'main-task-row';
            const depthClass = depth > 0 ? `task-hierarchy-item depth-${depth}` : '';
            return `${baseClass} ${depthClass}`.trim();
          }}
        />
      )}

      <TaskModal
        visible={taskModalVisible}
        task={editingTask}
        projectId={projectIdNum}
        onOk={editingTask ? handleUpdateTask : handleCreateTask}
        onCancel={handleModalClose}
        loading={modalLoading}
        parentTask={parentTaskForNew}
        allowParentSelection={!editingTask && !parentTaskForNew}
      />
    </div>
  );
};

export default TasksPage;