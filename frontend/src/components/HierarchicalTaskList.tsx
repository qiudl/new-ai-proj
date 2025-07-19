import React, { useState, useEffect } from 'react';
import { Button, Table, Tag, Space, Dropdown, message, Tooltip, Modal } from 'antd';
import { 
  MoreOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  PlusOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  BranchesOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { Task } from '../types/task';
import { TaskService } from '../services/taskService';

interface HierarchicalTaskListProps {
  projectId: number;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onCreateSubTask: (parentTask: Task) => void;
  loading?: boolean;
}

interface ExpandedTaskItem extends Task {
  children?: Task[];
  expanded?: boolean;
  level?: number;
}

const HierarchicalTaskList: React.FC<HierarchicalTaskListProps> = ({
  projectId,
  onEditTask,
  onDeleteTask,
  onCreateSubTask,
  loading = false,
}) => {
  const [tasks, setTasks] = useState<ExpandedTaskItem[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<Set<number>>(new Set());
  const [loadingChildren, setLoadingChildren] = useState<Set<number>>(new Set());

  // Load root tasks
  const loadRootTasks = async () => {
    try {
      const response = await TaskService.getRootTasks(projectId, { page: 1, page_size: 100 });
      // Ensure response.data is an array
      const rootTasksData = Array.isArray(response.data) ? response.data : [];
      const rootTasks = rootTasksData.map((task) => ({
        ...task,
        level: 0,
        expanded: false,
        children: [],
      }));
      setTasks(rootTasks);
      console.log('Root tasks loaded:', rootTasks); // Debug log
    } catch (error: any) {
      console.error('Error loading root tasks:', error);
      message.error(error.message || '获取任务列表失败');
      // Set empty array on error
      setTasks([]);
    }
  };

  // Load children for a specific task
  const loadTaskChildren = async (parentTask: ExpandedTaskItem) => {
    if (!parentTask || !parentTask.id || loadingChildren.has(parentTask.id)) return;

    setLoadingChildren(prev => new Set(prev).add(parentTask.id));
    try {
      const children = await TaskService.getTaskChildren(projectId, parentTask.id);
      // Ensure children is an array and contains valid objects
      const childrenArray = Array.isArray(children) ? children.filter(child => child && typeof child === 'object') : [];
      const childrenWithLevel = childrenArray.map(child => ({
        ...child,
        level: (parentTask.level || 0) + 1,
        expanded: false,
        children: [],
      }));

      setTasks(prevTasks => {
        const updateTaskChildren = (taskList: ExpandedTaskItem[]): ExpandedTaskItem[] => {
          if (!Array.isArray(taskList)) return [];
          
          return taskList.map(task => {
            if (!task || typeof task !== 'object') return task;
            
            if (task.id === parentTask.id) {
              return {
                ...task,
                children: childrenWithLevel,
                expanded: true,
              };
            }
            if (Array.isArray(task.children) && task.children.length > 0) {
              return {
                ...task,
                children: updateTaskChildren(task.children),
              };
            }
            return task;
          });
        };
        return updateTaskChildren(prevTasks);
      });

      setExpandedKeys(prev => new Set(prev).add(parentTask.id));
    } catch (error: any) {
      console.error('Error loading task children:', error);
      message.error(error.message || '获取子任务失败');
    } finally {
      setLoadingChildren(prev => {
        const newSet = new Set(prev);
        newSet.delete(parentTask.id);
        return newSet;
      });
    }
  };

  // Toggle task expansion
  const toggleExpand = async (task: ExpandedTaskItem) => {
    if (expandedKeys.has(task.id)) {
      // Collapse
      setExpandedKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(task.id);
        return newSet;
      });
      setTasks(prevTasks => {
        const collapseTask = (taskList: ExpandedTaskItem[]): ExpandedTaskItem[] => {
          return taskList.map(t => {
            if (t.id === task.id) {
              return { ...t, expanded: false };
            }
            if (t.children && t.children.length > 0) {
              return { ...t, children: collapseTask(t.children) };
            }
            return t;
          });
        };
        return collapseTask(prevTasks);
      });
    } else {
      // Expand
      if (!task.children || task.children.length === 0) {
        await loadTaskChildren(task);
      } else {
        setExpandedKeys(prev => new Set(prev).add(task.id));
        setTasks(prevTasks => {
          const expandTask = (taskList: ExpandedTaskItem[]): ExpandedTaskItem[] => {
            return taskList.map(t => {
              if (t.id === task.id) {
                return { ...t, expanded: true };
              }
              if (t.children && t.children.length > 0) {
                return { ...t, children: expandTask(t.children) };
              }
              return t;
            });
          };
          return expandTask(prevTasks);
        });
      }
    }
  };

  // Flatten tasks for table display
  const flattenTasks = (taskList: ExpandedTaskItem[]): ExpandedTaskItem[] => {
    // Ensure taskList is an array
    if (!Array.isArray(taskList)) {
      console.warn('Task list is not an array:', taskList);
      return [];
    }

    const result: ExpandedTaskItem[] = [];
    
    const flatten = (tasks: ExpandedTaskItem[]) => {
      if (!Array.isArray(tasks)) return;
      
      tasks.forEach(task => {
        result.push(task);
        if (task.expanded && Array.isArray(task.children)) {
          flatten(task.children);
        }
      });
    };
    
    flatten(taskList);
    return result;
  };

  useEffect(() => {
    loadRootTasks();
  }, [projectId]);

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
      width: '40%', // 明确设置宽度
      render: (text: string, record: ExpandedTaskItem) => {
        const hasChildren = (record.custom_fields?.children_count || 0) > 0;
        const isExpanded = expandedKeys.has(record.id);
        const isLoadingChild = loadingChildren.has(record.id);
        const level = record.level || 0;
        
        return (
          <div style={{ 
            paddingLeft: level * 28,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%'
          }}>
            {/* 展开/折叠按钮 - 只有当任务有子任务时才显示 */}
            {hasChildren ? (
              <Tooltip title={isExpanded ? '折叠子任务' : '展开子任务'}>
                <Button
                  type="text"
                  size="small"
                  className="task-expand-btn"
                  icon={isLoadingChild ? <LoadingOutlined /> : (isExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />)}
                  onClick={() => toggleExpand(record)}
                  style={{ 
                    padding: 0, 
                    minWidth: 20, 
                    height: 20,
                    color: '#1890ff',
                    fontSize: '14px',
                    flexShrink: 0
                  }}
                />
              </Tooltip>
            ) : (
              <div style={{ width: 20, height: 20, flexShrink: 0 }} />
            )}
            
            {/* 层级标识 */}
            {level > 0 && (
              <BranchesOutlined 
                style={{ 
                  color: '#8c8c8c', 
                  fontSize: 12,
                  marginRight: 4,
                  flexShrink: 0
                }} 
              />
            )}
            
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontWeight: level === 0 ? 600 : 500,
                fontSize: level === 0 ? '15px' : '14px',
                color: level === 0 ? '#262626' : '#595959',
                lineHeight: '1.4',
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8
              }}>
                <span style={{ wordBreak: 'break-word' }}>{text}</span>
                {hasChildren && (
                  <Tag 
                    color="blue" 
                    style={{ 
                      fontSize: 11,
                      padding: '0 6px',
                      lineHeight: '18px',
                      height: '18px',
                      flexShrink: 0
                    }}
                  >
                    {record.custom_fields?.children_count} 子任务
                  </Tag>
                )}
              </div>
              {record.description && (
                <div style={{ 
                  color: '#8c8c8c', 
                  fontSize: 12,
                  marginTop: 2,
                  lineHeight: '1.3',
                  wordBreak: 'break-word'
                }}>
                  {record.description.length > 50 
                    ? `${record.description.substring(0, 50)}...` 
                    : record.description
                  }
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '负责人',
      dataIndex: 'assignee_name',
      key: 'assignee_name',
      width: 120,
      render: (name: string, record: ExpandedTaskItem) => 
        record.custom_fields?.assignee_name || name || '未分配',
    },
    {
      title: '截止时间',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 120,
      render: (date: string) => date || '无',
    },
    {
      title: '优先级',
      key: 'priority',
      width: 80,
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
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: ExpandedTaskItem) => {
        const handleDeleteConfirm = () => {
          Modal.confirm({
            title: '确认删除',
            content: (
              <div>
                <p>确定要删除任务 <strong>"{record.title}"</strong> 吗？</p>
                {(record.custom_fields?.children_count || 0) > 0 && (
                  <p style={{ color: '#ff4d4f' }}>
                    ⚠️ 此任务包含 {record.custom_fields?.children_count} 个子任务，删除后子任务也会被删除
                  </p>
                )}
                <p style={{ color: '#8c8c8c', fontSize: '12px' }}>此操作无法撤销</p>
              </div>
            ),
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            onOk: () => onDeleteTask(record),
          });
        };

        return (
          <Space size="small">
            <Tooltip title="添加子任务">
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => onCreateSubTask(record)}
                style={{ color: '#52c41a' }}
              />
            </Tooltip>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'edit',
                    label: '编辑任务',
                    icon: <EditOutlined />,
                    onClick: () => onEditTask(record),
                  },
                  {
                    type: 'divider',
                  },
                  {
                    key: 'delete',
                    label: '删除任务',
                    icon: <DeleteOutlined />,
                    danger: true,
                    onClick: handleDeleteConfirm,
                  },
                ],
              }}
            >
              <Button type="text" size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  const flattenedTasks = flattenTasks(tasks);

  return (
    <div>
      {flattenedTasks.length === 0 && !loading ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          color: '#8c8c8c'
        }}>
          <BranchesOutlined style={{ fontSize: '48px', marginBottom: '16px', color: '#d9d9d9' }} />
          <h4 style={{ color: '#8c8c8c', marginBottom: '8px' }}>暂无任务</h4>
          <p style={{ fontSize: '14px' }}>点击上方"新建任务"按钮创建第一个任务</p>
        </div>
      ) : (
        <Table
          dataSource={flattenedTasks}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="middle"
          showHeader={true}
          className="task-hierarchy-table"
          scroll={{ x: 800 }}
          tableLayout="fixed"
          rowClassName={(record: ExpandedTaskItem) => {
            const level = record.level || 0;
            if (level === 0) return 'root-task-row fade-in';
            return `child-task-row level-${level} fade-in`;
          }}
        />
      )}
    </div>
  );
};

export default HierarchicalTaskList;