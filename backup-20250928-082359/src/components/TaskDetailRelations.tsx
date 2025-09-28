import React, { useCallback } from 'react';
import { Card, Button, Space, Badge, Tooltip, Typography, Tag } from 'antd';
import { 
  BranchesOutlined, 
  PlusOutlined, 
  ImportOutlined, 
  InboxOutlined,
  UpOutlined,
  DownOutlined
} from '@ant-design/icons';
import { Task } from '../types/task';

interface TaskRelationsPanelProps {
  task: Task;
  parentTask: Task | null;
  subtasks: Task[];
  siblingTasks: Task[];
  expandedSubtasks: boolean;
  expandedSiblings: boolean;
  onCreateSubtask: () => void;
  onCreateSibling: () => void;
  onBulkCreateSubTasks: () => void;
  onBulkImportSubtasks: () => void;
  onArchiveTask: () => void;
  onNavigateToTask: (taskId: number, projectId: number) => void;
  onToggleSubtasks: () => void;
  onToggleSiblings: () => void;
  getStatusConfig: (status: string) => { icon: React.ReactNode };
}

/**
 * 任务关系面板组件
 * 显示父任务、子任务、兄弟任务等关系信息
 */
export const TaskRelationsPanel: React.FC<TaskRelationsPanelProps> = React.memo(({
  task,
  parentTask,
  subtasks,
  siblingTasks,
  expandedSubtasks,
  expandedSiblings,
  onCreateSubtask,
  onCreateSibling,
  onBulkCreateSubTasks,
  onBulkImportSubtasks,
  onArchiveTask,
  onNavigateToTask,
  onToggleSubtasks,
  onToggleSiblings,
  getStatusConfig
}) => {
  const handleNavigateToTask = useCallback((taskId: number, projectId: number) => {
    onNavigateToTask(taskId, projectId);
  }, [onNavigateToTask]);

  // 缓存相关任务总数计算，避免每次渲染都重新计算
  const relatedTasksCount = React.useMemo(() => {
    return (parentTask ? 1 : 0) + subtasks.length + siblingTasks.length;
  }, [parentTask, subtasks.length, siblingTasks.length]);

  return (
    <>
      {/* 快速操作 */}
      <Card title="快速操作" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button 
            block 
            icon={<BranchesOutlined />}
            onClick={onCreateSubtask}
          >
            创建子任务
          </Button>
          <Button 
            block 
            icon={<BranchesOutlined />}
            onClick={onCreateSibling}
            style={{ color: '#fa8c16', borderColor: '#fa8c16' }}
          >
            创建兄弟任务
          </Button>
          <Button 
            block 
            icon={<BranchesOutlined />}
            onClick={onBulkCreateSubTasks}
            type="primary"
            ghost
          >
            手工批量创建子任务
          </Button>
          <Button 
            block 
            icon={<ImportOutlined />}
            onClick={onBulkImportSubtasks}
          >
            批量导入任务
          </Button>
          <Button 
            block 
            icon={<InboxOutlined />}
            onClick={onArchiveTask}
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
              count={relatedTasksCount} 
              showZero={false}
              
            />
          </Space>
        }
        style={{ marginBottom: '16px' }}
      >
        <Space direction="vertical" style={{ width: '100%', gap: '16px' }}>
          {/* 父任务 */}
          {parentTask && (
            <ParentTaskSection 
              parentTask={parentTask}
              onNavigate={handleNavigateToTask}
              getStatusConfig={getStatusConfig}
            />
          )}

          {/* 子任务 */}
          {subtasks.length > 0 && (
            <SubtasksSection 
              subtasks={subtasks}
              expanded={expandedSubtasks}
              onToggle={onToggleSubtasks}
              onNavigate={handleNavigateToTask}
              getStatusConfig={getStatusConfig}
            />
          )}

          {/* 兄弟任务 */}
          {siblingTasks.length > 0 && (
            <SiblingsSection 
              siblings={siblingTasks}
              expanded={expandedSiblings}
              onToggle={onToggleSiblings}
              onNavigate={handleNavigateToTask}
              getStatusConfig={getStatusConfig}
            />
          )}

          {/* 无相关任务时的提示 */}
          {!parentTask && subtasks.length === 0 && siblingTasks.length === 0 && (
            <EmptyRelationsPlaceholder />
          )}
        </Space>
      </Card>
    </>
  );
});

TaskRelationsPanel.displayName = 'TaskRelationsPanel';

// 父任务区域
const ParentTaskSection: React.FC<{
  parentTask: Task;
  onNavigate: (taskId: number, projectId: number) => void;
  getStatusConfig: (status: string) => { icon: React.ReactNode };
}> = React.memo(({ parentTask, onNavigate, getStatusConfig }) => (
  <div style={{ 
    padding: '12px', 
    background: '#f6ffed', 
    borderRadius: '6px',
    border: '1px solid #b7eb8f'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
      <Badge status="processing" />
      <Typography.Text strong style={{ fontSize: '13px', color: '#389e0d' }}>父任务</Typography.Text>
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
      onClick={() => onNavigate(parentTask.id, parentTask.project_id)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Tag color="blue" style={{ margin: 0, fontSize: '10px', padding: '0 4px', lineHeight: '16px' }}>
          #{parentTask.id}
        </Tag>
        {getStatusConfig(parentTask.status).icon}
        <span>{parentTask.title}</span>
      </div>
    </Button>
  </div>
));

// 子任务区域
const SubtasksSection: React.FC<{
  subtasks: Task[];
  expanded: boolean;
  onToggle: () => void;
  onNavigate: (taskId: number, projectId: number) => void;
  getStatusConfig: (status: string) => { icon: React.ReactNode };
}> = React.memo(({ subtasks, expanded, onToggle, onNavigate, getStatusConfig }) => (
  <div style={{ 
    padding: '12px', 
    background: '#e6f7ff', 
    borderRadius: '6px',
    border: '1px solid #91d5ff'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
      <Badge status="processing" />
      <Typography.Text strong style={{ fontSize: '13px', color: '#1890ff' }}>
        子任务 ({subtasks.length})
      </Typography.Text>
      {subtasks.length > 3 && (
        <Button 
          type="link" 
           
          style={{ fontSize: '12px', padding: 0 }}
          onClick={() => {
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
      {(expanded ? subtasks : subtasks.slice(0, 3)).map((subtask) => (
        <TaskLinkButton
          key={subtask.id}
          task={subtask}
          onNavigate={onNavigate}
          getStatusConfig={getStatusConfig}
          backgroundColor="rgba(255,255,255,0.6)"
        />
      ))}
      {subtasks.length > 3 && (
        <ExpandButton 
          expanded={expanded}
          onToggle={onToggle}
          count={subtasks.length - 3}
          type="子任务"
        />
      )}
    </Space>
  </div>
));

// 兄弟任务区域  
const SiblingsSection: React.FC<{
  siblings: Task[];
  expanded: boolean;
  onToggle: () => void;
  onNavigate: (taskId: number, projectId: number) => void;
  getStatusConfig: (status: string) => { icon: React.ReactNode };
}> = React.memo(({ siblings, expanded, onToggle, onNavigate, getStatusConfig }) => (
  <div style={{ 
    padding: '12px', 
    background: '#fff7e6', 
    borderRadius: '6px',
    border: '1px solid #ffd591'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
      <Badge status="default" />
      <Typography.Text strong style={{ fontSize: '13px', color: '#d46b08' }}>
        同级任务 ({siblings.length})
      </Typography.Text>
    </div>
    <Space direction="vertical" style={{ width: '100%' }}>
      {(expanded ? siblings : siblings.slice(0, 3)).map((sibling) => (
        <TaskLinkButton
          key={sibling.id}
          task={sibling}
          onNavigate={onNavigate}
          getStatusConfig={getStatusConfig}
          backgroundColor="rgba(255,255,255,0.6)"
        />
      ))}
      {siblings.length > 3 && (
        <ExpandButton 
          expanded={expanded}
          onToggle={onToggle}
          count={siblings.length - 3}
          type="同级任务"
        />
      )}
    </Space>
  </div>
));

// 任务链接按钮
const TaskLinkButton: React.FC<{
  task: Task;
  onNavigate: (taskId: number, projectId: number) => void;
  getStatusConfig: (status: string) => { icon: React.ReactNode };
  backgroundColor?: string;
}> = React.memo(({ task, onNavigate, getStatusConfig, backgroundColor = 'rgba(255,255,255,0.6)' }) => (
  <Button 
    type="link" 
    style={{ 
      padding: '4px 8px', 
      height: 'auto', 
      fontSize: '13px',
      textAlign: 'left',
      width: '100%',
      justifyContent: 'flex-start',
      background: backgroundColor,
      borderRadius: '4px'
    }}
    onClick={() => onNavigate(task.id, task.project_id)}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Tag color="blue" style={{ margin: 0, fontSize: '10px', padding: '0 4px', lineHeight: '16px' }}>
        #{task.id}
      </Tag>
      {getStatusConfig(task.status).icon}
      <span style={{ flex: 1, minWidth: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
        {task.title}
      </span>
    </div>
  </Button>
));

// 展开/收起按钮
const ExpandButton: React.FC<{
  expanded: boolean;
  onToggle: () => void;
  count: number;
  type: string;
}> = React.memo(({ expanded, onToggle, count, type }) => (
  <Button 
    type="link" 
    
    onClick={onToggle}
    style={{ 
      padding: '0 8px', 
      fontSize: '12px', 
      height: 'auto',
      color: '#8c8c8c',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    }}
  >
    {expanded ? (
      <>
        收起
        <UpOutlined style={{ fontSize: '10px' }} />
      </>
    ) : (
      <>
        还有 {count} 个{type}...
        <DownOutlined style={{ fontSize: '10px' }} />
      </>
    )}
  </Button>
));

// 空状态占位符
const EmptyRelationsPlaceholder: React.FC = React.memo(() => (
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
));

export default TaskRelationsPanel;
