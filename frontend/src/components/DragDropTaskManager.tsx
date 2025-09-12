// Phase 4: 拖拽任务管理系统 - 支持任务重排序和快速启动计时
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, List, Avatar, Tag, message, Tooltip, Space, Button } from 'antd';
import { 
  DragOutlined, 
  PlayCircleOutlined, 
  ClockCircleOutlined,
  FlagOutlined,
  CheckOutlined,
  PauseCircleOutlined
} from '@ant-design/icons';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Task接口定义
interface Task {
  id: number;
  title: string;
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  estimated_time?: number; // 预估时间（分钟）
  project_name?: string;
  category?: string;
  custom_fields?: {
    priority?: string;
    tags?: string[];
    estimated_hours?: number;
  };
}

// 拖拽任务项组件
interface SortableTaskItemProps {
  task: Task;
  onStartTimer: (task: Task) => void;
  onTaskClick: (task: Task) => void;
  isTimerRunning?: boolean;
  currentTimingTaskId?: number;
}

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({
  task,
  onStartTimer,
  onTaskClick,
  isTimerRunning = false,
  currentTimingTaskId
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    cursor: isDragging ? 'grabbing' : 'grab'
  };

  const isCurrentlyTiming = currentTimingTaskId === task.id;
  const estimatedTime = task.custom_fields?.estimated_hours 
    ? `${task.custom_fields.estimated_hours}h`
    : task.estimated_time 
    ? `${task.estimated_time}m`
    : null;

  const priorityColor = {
    high: '#ff4d4f',
    medium: '#faad14',
    low: '#52c41a'
  }[task.priority || task.custom_fields?.priority || 'medium'];

  const statusIcon = {
    todo: <ClockCircleOutlined style={{ color: '#8c8c8c' }} />,
    in_progress: <PlayCircleOutlined style={{ color: '#1890ff' }} />,
    completed: <CheckOutlined style={{ color: '#52c41a' }} />,
    cancelled: <PauseCircleOutlined style={{ color: '#8c8c8c' }} />
  }[task.status];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`draggable-task-item ${isDragging ? 'dragging' : ''} ${isCurrentlyTiming ? 'timing' : ''}`}
    >
      <Card
        
        hoverable={!isDragging}
        style={{
          marginBottom: 8,
          borderLeft: isCurrentlyTiming ? '4px solid #1890ff' : `4px solid ${priorityColor}`,
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        bodyStyle={{ padding: '12px 16px' }}
        onClick={() => onTaskClick(task)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* 拖拽手柄 */}
          <div
            {...listeners}
            style={{ 
              cursor: 'grab',
              padding: '4px',
              color: '#8c8c8c',
              display: 'flex',
              alignItems: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <DragOutlined />
          </div>

          {/* 任务状态图标 */}
          <div style={{ fontSize: '16px' }}>
            {statusIcon}
          </div>

          {/* 任务信息 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div 
              style={{ 
                fontWeight: 500,
                fontSize: '14px',
                color: '#262626',
                marginBottom: '4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {task.title}
            </div>
            
            <Space size={4} wrap>
              {task.project_name && (
<Tag color="blue">{task.project_name}</Tag>
              )}
              {estimatedTime && (
<Tag icon={<ClockCircleOutlined />}>
                  {estimatedTime}
                </Tag>
              )}
              {(task.priority || task.custom_fields?.priority) && (
<Tag color={priorityColor} icon={<FlagOutlined />}>
                  {(task.priority || task.custom_fields?.priority)?.toUpperCase()}
                </Tag>
              )}
            </Space>
          </div>

          {/* 快速操作按钮 */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <Tooltip title={isCurrentlyTiming ? '正在计时' : '开始计时'}>
              <Button
                type={isCurrentlyTiming ? 'primary' : 'text'}
                
                icon={isCurrentlyTiming ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onStartTimer(task);
                }}
                style={{
                  border: 'none',
                  boxShadow: 'none',
                  color: isCurrentlyTiming ? '#fff' : '#1890ff'
                }}
              />
            </Tooltip>
          </div>
        </div>
      </Card>
    </div>
  );
};

// 主要的拖拽任务管理器组件
interface DragDropTaskManagerProps {
  tasks: Task[];
  onTasksReorder: (reorderedTasks: Task[]) => void;
  onStartTimer: (task: Task) => void;
  onTaskClick: (task: Task) => void;
  isTimerRunning?: boolean;
  currentTimingTaskId?: number;
  height?: number | string;
  enableDropZone?: boolean;
}

const DragDropTaskManager: React.FC<DragDropTaskManagerProps> = ({
  tasks,
  onTasksReorder,
  onStartTimer,
  onTaskClick,
  isTimerRunning = false,
  currentTimingTaskId,
  height = 400,
  enableDropZone = true
}) => {
  const [items, setItems] = useState<Task[]>(tasks);
  const [isDragOverTimer, setIsDragOverTimer] = useState(false);
  const draggedTaskRef = useRef<Task | null>(null);

  // 传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px移动距离后开始拖拽
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 同步外部tasks变化
  useEffect(() => {
    setItems(tasks);
  }, [tasks]);

  // 处理拖拽结束
  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event;
    
    if (!over) {
      setIsDragOverTimer(false);
      draggedTaskRef.current = null;
      return;
    }

    // 检查是否拖拽到计时器区域
    if (over.id === 'timer-drop-zone' && draggedTaskRef.current) {
      const draggedTask = draggedTaskRef.current;
      message.success(`开始为 "${draggedTask.title}" 计时`);
      onStartTimer(draggedTask);
      setIsDragOverTimer(false);
      draggedTaskRef.current = null;
      return;
    }

    // 处理任务重排序
    if (active.id !== over.id) {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedItems = arrayMove(items, oldIndex, newIndex);
        setItems(reorderedItems);
        onTasksReorder(reorderedItems);
        
        message.success('任务顺序已更新');
      }
    }

    setIsDragOverTimer(false);
    draggedTaskRef.current = null;
  }, [items, onTasksReorder, onStartTimer]);

  // 处理拖拽开始
  const handleDragStart = useCallback((event: any) => {
    const draggedTask = items.find(item => item.id === event.active.id);
    draggedTaskRef.current = draggedTask || null;
  }, [items]);

  // 处理拖拽悬停
  const handleDragOver = useCallback((event: any) => {
    const { over } = event;
    setIsDragOverTimer(over?.id === 'timer-drop-zone');
  }, []);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        {/* 任务列表区域 */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            paddingRight: '8px',
            maxHeight: typeof height === 'number' ? `${height}px` : height
          }}
        >
          <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
            {items.map((task) => (
              <SortableTaskItem
                key={task.id}
                task={task}
                onStartTimer={onStartTimer}
                onTaskClick={onTaskClick}
                isTimerRunning={isTimerRunning}
                currentTimingTaskId={currentTimingTaskId}
              />
            ))}
          </SortableContext>

          {items.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#8c8c8c'
              }}
            >
              <ClockCircleOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
              <div>暂无任务</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                添加任务或从其他项目拖拽任务到这里
              </div>
            </div>
          )}
        </div>

        {/* 计时器拖拽投放区域 */}
        {enableDropZone && (
          <div
            id="timer-drop-zone"
            style={{
              marginTop: '12px',
              padding: '16px',
              border: `2px dashed ${isDragOverTimer ? '#1890ff' : '#d9d9d9'}`,
              borderRadius: '8px',
              textAlign: 'center',
              backgroundColor: isDragOverTimer ? '#e6f7ff' : '#fafafa',
              color: isDragOverTimer ? '#1890ff' : '#8c8c8c',
              transition: 'all 0.2s ease',
              fontSize: '14px'
            }}
          >
            <PlayCircleOutlined style={{ fontSize: '20px', marginBottom: '4px' }} />
            <div>
              {isDragOverTimer ? '释放开始计时' : '拖拽任务到这里快速开始计时'}
            </div>
          </div>
        )}
      </DndContext>

      <style>{`
        .draggable-task-item.dragging {
          z-index: 999;
        }
        
        .draggable-task-item.timing .ant-card {
          background: linear-gradient(90deg, #e6f7ff 0%, #ffffff 100%);
          box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
        }
        
        .draggable-task-item:hover .ant-card {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
        }
        
        .draggable-task-item.dragging .ant-card {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
          transform: rotate(3deg);
        }
        
        /* 自定义滚动条样式 */
        .draggable-task-item::-webkit-scrollbar {
          width: 6px;
        }
        
        .draggable-task-item::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 3px;
        }
        
        .draggable-task-item::-webkit-scrollbar-thumb {
          background: rgba(24, 144, 255, 0.3);
          border-radius: 3px;
        }
        
        .draggable-task-item::-webkit-scrollbar-thumb:hover {
          background: rgba(24, 144, 255, 0.5);
        }
      `}</style>
    </div>
  );
};

export default DragDropTaskManager;