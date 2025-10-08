/**
 * TaskDetailSidebar - 任务详情侧边栏
 * 包含: 计时器警告、正在计时的任务列表、快速操作、基本信息、文档概览
 */

import React, { useMemo, useState, useCallback } from 'react';
import { Card, Space, Alert, Typography } from 'antd';
import {
  WarningOutlined,
  StopOutlined,
  InboxOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import MVPTaskDetailTimer from '../../../../components/MVPTaskDetailTimer';
import { TaskDetailInfo } from '../../../../components/TaskDetailBasicInfo';
import TaskDocumentWidget from '../../../../components/TaskDocumentWidget';
import { TaskRelationsPanel } from '../../../../components/TaskDetailRelations';
import { useTaskDetailContext } from '../../hooks/useTaskDetailContext';
import { useTimer } from '../../../../contexts/TimerContext';
import dayjs from 'dayjs';

const { Text } = Typography;

export interface TaskDetailSidebarProps {
  projectId: number;
  onCreateSubtask: () => void;
  onCreateSibling?: () => void;
  onBulkCreateSubTasks?: () => void;
  onBulkImportSubtasks: () => void;
  onArchiveTask?: () => void;
  onNavigateToTask?: (taskId: number, projectId: number) => void;
}

/**
 * TaskDetailSidebar组件
 */
const TaskDetailSidebar: React.FC<TaskDetailSidebarProps> = ({
  projectId,
  onCreateSubtask,
  onCreateSibling,
  onBulkCreateSubTasks,
  onBulkImportSubtasks,
  onArchiveTask,
  onNavigateToTask
}) => {
  const { task, relations, loading, actions } = useTaskDetailContext();
  const { currentTimer, activeTimers } = useTimer();

  // State for expanded sections
  const [expandedSubtasks, setExpandedSubtasks] = useState(true);
  const [expandedSiblings, setExpandedSiblings] = useState(false);

  // 如果没有任务数据，不渲染
  if (!task) {
    return null;
  }

  // 计算剩余时间
  const timeRemaining = useMemo(() => {
    if (!task?.due_date) return null;

    const now = dayjs();
    const dueDate = dayjs(task.due_date);
    const diffDays = dueDate.diff(now, 'day');

    if (diffDays < 0) {
      return { text: `已逾期 ${Math.abs(diffDays)} 天`, type: 'danger' as const };
    } else if (diffDays === 0) {
      return { text: '今天到期', type: 'warning' as const };
    } else if (diffDays <= 3) {
      return { text: `${diffDays} 天后到期`, type: 'warning' as const };
    } else {
      return { text: `${diffDays} 天后到期`, type: 'normal' as const };
    }
  }, [task?.due_date]);

  // 状态配置
  const statusConfigs = useMemo(
    () => ({
      todo: {
        color: '#d9d9d9',
        text: '待开始',
        icon: <PlayCircleOutlined />,
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
      on_hold: {
        color: '#faad14',
        text: '暂停',
        icon: <PauseCircleOutlined />,
        bgColor: '#fffbe6'
      },
      cancelled: {
        color: '#ff4d4f',
        text: '已取消',
        icon: <StopOutlined />,
        bgColor: '#fff2f0'
      },
      archived: {
        color: '#8c8c8c',
        text: '已归档',
        icon: <InboxOutlined />,
        bgColor: '#f0f0f0'
      }
    }),
    []
  );

  const getStatusConfig = (status: string) => {
    return (
      statusConfigs[status as keyof typeof statusConfigs] || statusConfigs.todo
    );
  };

  // 优先级配置
  const priorityConfigs = useMemo(
    () => ({
      high: { color: '#ff4d4f', text: '高' },
      medium: { color: '#fa8c16', text: '中' },
      low: { color: '#52c41a', text: '低' },
      default: { color: '#d9d9d9', text: '未知' }
    }),
    []
  );

  const getPriorityConfig = (priority: string) => {
    return (
      priorityConfigs[priority as keyof typeof priorityConfigs] ||
      priorityConfigs.default
    );
  };

  const statusConfig = getStatusConfig(task.status);
  const priorityConfig = getPriorityConfig(task.custom_fields?.priority || 'medium');

  // 检查当前任务是否正在计时
  const isCurrentTaskTiming = currentTimer?.task_id === task.id;

  // 获取其他正在计时的任务（排除当前任务）
  const otherActiveTimers = useMemo(() => {
    if (!activeTimers || activeTimers.length === 0) return [];
    return activeTimers.filter((timer) => timer.task_id !== task.id);
  }, [activeTimers, task.id]);

  // Default handlers
  const handleCreateSibling = useCallback(() => {
    if (onCreateSibling) {
      onCreateSibling();
    }
    // Note: actions.setUI is not available in this context,
    // so we rely on the parent to provide onCreateSibling
  }, [onCreateSibling]);

  const handleBulkCreateSubTasks = useCallback(() => {
    if (onBulkCreateSubTasks) {
      onBulkCreateSubTasks();
    }
    // Note: Rely on parent to provide handler
  }, [onBulkCreateSubTasks]);

  const handleArchiveTask = useCallback(() => {
    if (onArchiveTask) {
      onArchiveTask();
    }
    // Note: Rely on parent to provide handler
  }, [onArchiveTask]);

  const handleNavigateToTask = useCallback(
    (taskId: number, navProjectId: number) => {
      if (onNavigateToTask) {
        onNavigateToTask(taskId, navProjectId);
      } else {
        window.location.href = `/projects/${navProjectId}/tasks/${taskId}`;
      }
    },
    [onNavigateToTask]
  );

  return (
    <>
      {/* 任务计时器 */}
      <MVPTaskDetailTimer
        taskId={task.id}
        taskTitle={task.title}
        taskStatus={task.status}
        projectId={projectId}
        style={{ marginBottom: '16px' }}
      />

      {/* 计时器警告 - 当有其他任务正在计时时显示 */}
      {!isCurrentTaskTiming && otherActiveTimers.length > 0 && (
        <Alert
          message="其他任务正在计时"
          description={
            <div>
              <div style={{ marginBottom: '8px' }}>
                您有 {otherActiveTimers.length} 个其他任务正在计时，建议先停止其他任务的计时。
              </div>
              <div style={{ fontSize: '12px' }}>
                {otherActiveTimers.map((timer, index) => (
                  <div key={timer.id} style={{ marginTop: '4px' }}>
                    {index + 1}. {timer.task_title || `任务 ${timer.task_id}`}
                  </div>
                ))}
              </div>
            </div>
          }
          type="warning"
          icon={<WarningOutlined />}
          style={{ marginBottom: '16px' }}
          showIcon
        />
      )}

      {/* 正在计时的任务列表卡片 */}
      {otherActiveTimers.length > 0 && (
        <Card
          title="正在计时的任务"
          style={{ marginBottom: '16px' }}
          size="small"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {otherActiveTimers.map((timer) => (
              <div
                key={timer.id}
                style={{
                  padding: '8px',
                  background: '#f0f2f5',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              >
                <div style={{ fontWeight: 500, marginBottom: '4px' }}>
                  {timer.task_title || `任务 ${timer.task_id}`}
                </div>
                <div style={{ color: '#8c8c8c' }}>
                  {timer.description || '无描述'}
                </div>
              </div>
            ))}
          </Space>
        </Card>
      )}

      {/* 快速操作和相关任务 */}
      <TaskRelationsPanel
        task={task}
        parentTask={relations.parent}
        subtasks={relations.subtasks}
        siblingTasks={relations.siblings}
        expandedSubtasks={expandedSubtasks}
        expandedSiblings={expandedSiblings}
        onCreateSubtask={onCreateSubtask}
        onCreateSibling={handleCreateSibling}
        onBulkCreateSubTasks={handleBulkCreateSubTasks}
        onBulkImportSubtasks={onBulkImportSubtasks}
        onArchiveTask={handleArchiveTask}
        onNavigateToTask={handleNavigateToTask}
        onToggleSubtasks={() => setExpandedSubtasks(!expandedSubtasks)}
        onToggleSiblings={() => setExpandedSiblings(!expandedSiblings)}
        getStatusConfig={getStatusConfig}
      />

      {/* 任务基本信息 */}
      <TaskDetailInfo
        task={task}
        projectInfo={loading.initial ? null : undefined}
        parentTask={relations.parent}
      />

      {/* 任务文档小部件 */}
      <div style={{ marginBottom: '16px' }}>
        <TaskDocumentWidget
          projectId={projectId}
          taskId={task.id}
          compact={false}
          showTitle={true}
        />
      </div>

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
    </>
  );
};

TaskDetailSidebar.displayName = 'TaskDetailSidebar';

export default TaskDetailSidebar;
