// @ts-nocheck
import React, { useState } from 'react';
import {
  Card,
  List,
  Tag,
  Button,
  Space,
  Progress,
  Statistic,
  Badge,
  Tooltip,
  Dropdown,
  Modal,
  DatePicker,
  Input,
  message,
  Row,
  Col,
  Typography,
  Divider,
  Empty,
  Avatar,
  Checkbox
} from 'antd';
import {
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CheckOutlined,
  CalendarOutlined,
  MoreOutlined,
  PlayCircleOutlined,
  FireOutlined,
  TrophyOutlined,
  ReloadOutlined,
  FilterOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { MenuProps } from 'antd';
import { useTodayTasks } from '../hooks/useTodayTasks';
import { Task } from '../types/task';
import { useTimer } from '../contexts/TimerContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface TodayTasksCardProps {
  title?: string;
  showHeader?: boolean;
  maxHeight?: number;
  compact?: boolean;
  filters?: any;
  showStats?: boolean;
  enableBulkActions?: boolean;
}

const TodayTasksCard: React.FC<TodayTasksCardProps> = ({
  title = '今日任务',
  showHeader = true,
  maxHeight = 400,
  compact = false,
  filters,
  showStats = true,
  enableBulkActions = false
}) => {
  const navigate = useNavigate();
  const { startTimer, timerState } = useTimer();
  
  const {
    todayTasks,
    stats,
    loading,
    error,
    refreshTasks,
    markCompleted,
    postponeTask,
    bulkOperation,
    getTodayTaskLabels,
    totalCount,
    urgentCount,
    inProgressCount,
    overdueCount
  } = useTodayTasks({
    autoRefresh: true,
    refreshInterval: 60000,
    filters
  });

  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [postponeModalVisible, setPostponeModalVisible] = useState(false);
  const [postponingTaskId, setPostponingTaskId] = useState<number | null>(null);
  const [newDueDate, setNewDueDate] = useState<dayjs.Dayjs | null>(null);
  const [postponeReason, setPostponeReason] = useState('');

  // 获取任务优先级颜色
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return '#ff4d4f';
      case 'medium': return '#fa8c16';
      case 'low': return '#52c41a';
      default: return '#d9d9d9';
    }
  };

  // 获取任务状态图标
  const getStatusIcon = (task: Task) => {
    if (task.status === 'completed') {
      return <CheckOutlined style={{ color: '#52c41a' }} />;
    }
    if (task.status === 'in_progress') {
      return <PlayCircleOutlined style={{ color: '#1890ff' }} />;
    }
    if (task.due_date && new Date(task.due_date) < new Date()) {
      return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
    }
    return <ClockCircleOutlined style={{ color: '#d9d9d9' }} />;
  };

  // 处理任务点击
  const handleTaskClick = (task: Task) => {
    // 根据任务的项目ID导航到任务详情
    if (task.project_id) {
      navigate(`/projects/${task.project_id}/tasks/${task.id}`);
    } else {
      navigate(`/tasks/${task.id}`);
    }
  };

  // 处理开始计时
  const handleStartTimer = async (task: Task) => {
    try {
      await startTimer(task.id, task.title);
      message.success(`开始计时: ${task.title}`);
    } catch (error) {
      message.error('启动计时器失败');
    }
  };

  // 处理完成任务
  const handleCompleteTask = async (taskId: number) => {
    await markCompleted(taskId);
  };

  // 处理延期任务
  const handlePostponeTask = (taskId: number) => {
    setPostponingTaskId(taskId);
    setPostponeModalVisible(true);
  };

  // 确认延期
  const confirmPostpone = async () => {
    if (!postponingTaskId || !newDueDate) return;
    
    await postponeTask(
      postponingTaskId, 
      newDueDate.format('YYYY-MM-DD'),
      postponeReason
    );
    
    setPostponeModalVisible(false);
    setPostponingTaskId(null);
    setNewDueDate(null);
    setPostponeReason('');
  };

  // 任务操作菜单
  const getTaskMenuItems = (task: Task): MenuProps['items'] => [
    {
      key: 'timer',
      label: '开始计时',
      icon: <PlayCircleOutlined />,
      onClick: () => handleStartTimer(task),
      disabled: timerState.isRunning && timerState.taskId !== task.id
    },
    {
      key: 'complete',
      label: '标记完成',
      icon: <CheckOutlined />,
      onClick: () => handleCompleteTask(task.id),
      disabled: task.status === 'completed'
    },
    {
      key: 'postpone',
      label: '延期任务',
      icon: <CalendarOutlined />,
      onClick: () => handlePostponeTask(task.id)
    },
    {
      type: 'divider'
    },
    {
      key: 'detail',
      label: '查看详情',
      onClick: () => handleTaskClick(task)
    }
  ];

  // 批量操作菜单
  const bulkActionItems: MenuProps['items'] = [
    {
      key: 'complete',
      label: `批量完成 (${selectedTasks.length})`,
      icon: <CheckOutlined />,
      onClick: () => bulkOperation(selectedTasks, 'complete'),
      disabled: selectedTasks.length === 0
    },
    {
      key: 'high-priority',
      label: `设为高优先级 (${selectedTasks.length})`,
      icon: <FireOutlined />,
      onClick: () => bulkOperation(selectedTasks, 'priority', { priority: 'high' }),
      disabled: selectedTasks.length === 0
    }
  ];

  // 渲染任务项
  const renderTaskItem = (task: Task) => {
    const labels = getTodayTaskLabels(task);
    const isSelected = selectedTasks.includes(task.id);
    const isCurrentTimer = timerState.taskId === task.id && timerState.isRunning;

    return (
      <List.Item
        key={task.id}
        className={`today-task-item ${isCurrentTimer ? 'timer-active' : ''}`}
        style={{
          padding: compact ? '8px 16px' : '12px 16px',
          cursor: 'pointer',
          backgroundColor: isSelected ? '#f0f8ff' : undefined,
          border: isCurrentTimer ? '2px solid #52c41a' : undefined,
          borderRadius: isCurrentTimer ? '6px' : undefined
        }}
        onClick={() => handleTaskClick(task)}
        actions={[
          <Dropdown 
            menu={{ items: getTaskMenuItems(task) }} 
            trigger={['click']}
            key="actions"
          >
            <Button 
              type="text" 
              icon={<MoreOutlined />} 
              size="small"
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        ]}
      >
        <List.Item.Meta
          avatar={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {enableBulkActions && (
                <Checkbox
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    if (e.target.checked) {
                      setSelectedTasks([...selectedTasks, task.id]);
                    } else {
                      setSelectedTasks(selectedTasks.filter(id => id !== task.id));
                    }
                  }}
                />
              )}
              <Avatar size="small" icon={getStatusIcon(task)} />
            </div>
          }
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ 
                fontWeight: 500,
                color: task.status === 'completed' ? '#8c8c8c' : '#262626',
                textDecoration: task.status === 'completed' ? 'line-through' : 'none'
              }}>
                {task.title}
              </span>
              {isCurrentTimer && (
                <Badge status="processing" text="计时中" />
              )}
            </div>
          }
          description={
            <div style={{ marginTop: '4px' }}>
              <Space size="small" wrap>
                {labels.map(label => {
                  let color = 'default';
                  if (label === '已逾期') color = 'red';
                  else if (label === '今日到期') color = 'orange';
                  else if (label === '进行中') color = 'blue';
                  else if (label === '今日创建') color = 'green';
                  else if (label === '今日更新') color = 'purple';
                  
                  return (
                    <Tag key={label} color={color}>
                      {label}
                    </Tag>
                  );
                })}
                
                {task.custom_fields?.priority && (
                  <Tag 
                    color={getPriorityColor(task.custom_fields.priority)}
                  >
                    {task.custom_fields.priority === 'high' ? '高优先级' : 
                     task.custom_fields.priority === 'medium' ? '中优先级' : '低优先级'}
                  </Tag>
                )}
                
                {task.due_date && (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    到期: {dayjs(task.due_date).format('MM-DD')}
                  </Text>
                )}
              </Space>
            </div>
          }
        />
      </List.Item>
    );
  };

  // 渲染统计信息
  const renderStats = () => {
    if (!showStats || !stats) return null;

    return (
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Statistic
            title="总任务"
            value={totalCount}
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: '#1890ff', fontSize: '18px' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="紧急任务"
            value={urgentCount}
            prefix={<FireOutlined />}
            valueStyle={{ color: '#ff4d4f', fontSize: '18px' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="进行中"
            value={inProgressCount}
            prefix={<PlayCircleOutlined />}
            valueStyle={{ color: '#52c41a', fontSize: '18px' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="已逾期"
            value={overdueCount}
            prefix={<ExclamationCircleOutlined />}
            valueStyle={{ color: '#ff4d4f', fontSize: '18px' }}
          />
        </Col>
      </Row>
    );
  };

  // 渲染头部
  const renderHeader = () => {
    if (!showHeader) return null;

    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Title level={4} style={{ margin: 0 }}>
            {title}
          </Title>
          <Badge count={totalCount} showZero={false} />
          {urgentCount > 0 && (
            <Tooltip title="紧急任务">
              <Badge count={urgentCount} style={{ backgroundColor: '#ff4d4f' }} />
            </Tooltip>
          )}
        </div>
        
        <Space>
          {enableBulkActions && selectedTasks.length > 0 && (
            <Dropdown menu={{ items: bulkActionItems }}>
              <Button size="small">
                批量操作 ({selectedTasks.length})
              </Button>
            </Dropdown>
          )}
          <Tooltip title="刷新">
            <Button
              type="text"
              icon={<ReloadOutlined />}
              size="small"
              onClick={refreshTasks}
              loading={loading}
            />
          </Tooltip>
        </Space>
      </div>
    );
  };

  return (
    <>
      <Card
        title={renderHeader()}
        size={compact ? 'small' : 'default'}
        style={{ height: '100%' }}
        styles={{
          body: {
            padding: compact ? '8px' : '16px',
            height: showHeader ? 'calc(100% - 56px)' : '100%',
            overflow: 'hidden'
          }
        }}
      >
        {error && (
          <div style={{ marginBottom: 16 }}>
            <Text type="danger">{error}</Text>
          </div>
        )}

        {renderStats()}

        <div style={{ height: maxHeight, overflow: 'auto' }}>
          {todayTasks.length === 0 ? (
            <Empty
              description="暂无今日任务"
              style={{ padding: '40px 0' }}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" onClick={() => navigate('/projects')}>
                去创建任务
              </Button>
            </Empty>
          ) : (
            <List
              dataSource={todayTasks}
              renderItem={renderTaskItem}
              loading={loading}
              size={compact ? 'small' : 'default'}
            />
          )}
        </div>
      </Card>

      {/* 延期任务模态框 */}
      <Modal
        title="延期任务"
        open={postponeModalVisible}
        onOk={confirmPostpone}
        onCancel={() => {
          setPostponeModalVisible(false);
          setPostponingTaskId(null);
          setNewDueDate(null);
          setPostponeReason('');
        }}
        okText="确认延期"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>新的到期日期:</Text>
            <DatePicker
              value={newDueDate}
              onChange={setNewDueDate}
              style={{ width: '100%', marginTop: '8px' }}
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </div>
          
          <div>
            <Text strong>延期原因 (可选):</Text>
            <TextArea
              value={postponeReason}
              onChange={(e) => setPostponeReason(e.target.value)}
              placeholder="请输入延期原因..."
              rows={3}
              style={{ marginTop: '8px' }}
            />
          </div>
        </Space>
      </Modal>
    </>
  );
};

export default TodayTasksCard;