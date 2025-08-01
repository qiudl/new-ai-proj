import React, { useState } from 'react';
import { Card, List, Button, Space, Typography, Progress, Tag, Tooltip, message, Modal, Dropdown } from 'antd';
import { 
  PlayCircleOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  StarOutlined, 
  StarFilled,
  MoreOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  TargetOutlined
} from '@ant-design/icons';
import { personalTimerService } from '../services/personalTimerService';

const { Text } = Typography;

interface UserTimerTaskResponse {
  id: number;
  title: string;
  description?: string;
  category: string;
  priority: string;
  status: string;
  color: string;
  is_favorite: boolean;
  total_time_seconds: number;
  target_time_seconds: number;
  formatted_total_time: string;
  formatted_target_time: string;
  completion_percent: number;
  created_at: string;
  updated_at: string;
}

interface PersonalTimerTaskListProps {
  tasks: UserTimerTaskResponse[];
  loading?: boolean;
  isTimerRunning?: boolean;
  onStartTimer?: (taskId: number) => void;
  onEditTask?: (task: UserTimerTaskResponse) => void;
  onDeleteTask?: (taskId: number) => void;
  onRefresh?: () => void;
}

const PersonalTimerTaskList: React.FC<PersonalTimerTaskListProps> = ({
  tasks,
  loading = false,
  isTimerRunning = false,
  onStartTimer,
  onEditTask,
  onDeleteTask,
  onRefresh
}) => {
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // 切换收藏状态
  const handleToggleFavorite = async (task: UserTimerTaskResponse) => {
    try {
      setActionLoading(task.id);
      await personalTimerService.toggleFavoriteUserTimerTask(task.id, !task.is_favorite);
      message.success(task.is_favorite ? '已取消收藏' : '已添加到收藏');
      onRefresh?.();
    } catch (error) {
      message.error('操作失败');
      console.error('Failed to toggle favorite:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // 删除任务
  const handleDeleteTask = (task: UserTimerTaskResponse) => {
    Modal.confirm({
      title: '确认删除任务',
      content: `确定要删除任务"${task.title}"吗？此操作不可恢复。`,
      okText: '确定删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        onDeleteTask?.(task.id);
      }
    });
  };

  // 获取优先级颜色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#f5222d';
      case 'medium': return '#faad14';
      case 'low': return '#52c41a';
      default: return '#d9d9d9';
    }
  };

  // 获取优先级标签
  const getPriorityTag = (priority: string) => {
    const colors = {
      high: 'red',
      medium: 'orange',
      low: 'green'
    };
    const labels = {
      high: '高',
      medium: '中',
      low: '低'
    };
    return (
      <Tag color={colors[priority as keyof typeof colors]} size="small">
        {labels[priority as keyof typeof labels] || priority}
      </Tag>
    );
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const colors = {
      active: 'green',
      paused: 'orange',
      completed: 'blue',
      archived: 'default'
    };
    const labels = {
      active: '活跃',
      paused: '暂停',
      completed: '完成',
      archived: '归档'
    };
    return (
      <Tag color={colors[status as keyof typeof colors]} size="small">
        {labels[status as keyof typeof labels] || status}
      </Tag>
    );
  };

  return (
    <Card 
      title={
        <Space>
          <ClockCircleOutlined />
          <span>个人计时任务</span>
          <Text type="secondary">({tasks.length})</Text>
        </Space>
      }
      loading={loading}
      extra={
        <Button type="primary" size="small" onClick={() => onEditTask?.({} as UserTimerTaskResponse)}>
          新建任务
        </Button>
      }
    >
      <List
        dataSource={tasks}
        renderItem={(task) => {
          const menuItems = [
            {
              key: 'edit',
              label: '编辑任务',
              icon: <EditOutlined />,
              onClick: () => onEditTask?.(task)
            },
            {
              key: 'favorite',
              label: task.is_favorite ? '取消收藏' : '添加收藏',
              icon: task.is_favorite ? <StarOutlined /> : <StarFilled />,
              onClick: () => handleToggleFavorite(task)
            },
            {
              type: 'divider' as const
            },
            {
              key: 'delete',
              label: '删除任务',
              icon: <DeleteOutlined />,
              danger: true,
              onClick: () => handleDeleteTask(task)
            }
          ];

          return (
            <List.Item
              style={{
                padding: '16px',
                border: '1px solid #f0f0f0',
                borderRadius: '8px',
                marginBottom: '8px',
                background: task.is_favorite ? '#fff9e6' : '#fafafa'
              }}
              actions={[
                <Button
                  key="start"
                  type="primary"
                  size="small"
                  icon={<PlayCircleOutlined />}
                  onClick={() => onStartTimer?.(task.id)}
                  disabled={isTimerRunning}
                  loading={actionLoading === task.id}
                >
                  开始
                </Button>,
                <Dropdown
                  key="more"
                  menu={{ items: menuItems }}
                  trigger={['click']}
                >
                  <Button 
                    size="small" 
                    icon={<MoreOutlined />}
                    loading={actionLoading === task.id}
                  />
                </Dropdown>
              ]}
            >
              <List.Item.Meta
                avatar={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div 
                      style={{ 
                        width: '12px', 
                        height: '12px', 
                        borderRadius: '50%', 
                        backgroundColor: task.color
                      }}
                    />
                    {task.is_favorite && (
                      <StarFilled style={{ color: '#faad14', fontSize: '14px' }} />
                    )}
                  </div>
                }
                title={
                  <Space>
                    <Text strong>{task.title}</Text>
                    {getPriorityTag(task.priority)}
                    {getStatusTag(task.status)}
                  </Space>
                }
                description={
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    {task.description && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {task.description}
                      </Text>
                    )}
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <Space size="small">
                        <ClockCircleOutlined style={{ color: '#666' }} />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {task.formatted_total_time}
                        </Text>
                      </Space>
                      
                      {task.target_time_seconds > 0 && (
                        <Space size="small">
                          <TargetOutlined style={{ color: '#666' }} />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            目标: {task.formatted_target_time}
                          </Text>
                        </Space>
                      )}
                      
                      <Space size="small">
                        <TrophyOutlined style={{ color: '#666' }} />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {task.category}
                        </Text>
                      </Space>
                    </div>

                    {task.target_time_seconds > 0 && (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            完成进度
                          </Text>
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            {Math.round(task.completion_percent)}%
                          </Text>
                        </div>
                        <Progress
                          percent={task.completion_percent}
                          size="small"
                          showInfo={false}
                          strokeColor={
                            task.completion_percent >= 100 ? '#52c41a' :
                            task.completion_percent >= 50 ? '#1890ff' : '#faad14'
                          }
                        />
                      </div>
                    )}
                  </Space>
                }
              />
            </List.Item>
          );
        }}
        locale={{
          emptyText: (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <ClockCircleOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
              <div style={{ color: '#999', marginBottom: '16px' }}>
                还没有个人计时任务
              </div>
              <Button type="primary" onClick={() => onEditTask?.({} as UserTimerTaskResponse)}>
                创建第一个任务
              </Button>
            </div>
          )
        }}
      />
    </Card>
  );
};

export default PersonalTimerTaskList;