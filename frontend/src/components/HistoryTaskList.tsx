import React, { useState, useEffect, useCallback } from 'react';
import { 
  List, 
  Typography, 
  Tag, 
  Space, 
  Button, 
  Empty, 
  Spin, 
  Tooltip,
  Modal,
  message,
  Popconfirm 
} from 'antd';
import { 
  ClockCircleOutlined, 
  PlayCircleOutlined, 
  CheckCircleOutlined,
  PauseCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { HistoryTask } from '../types/historyTask';
import { HistoryTaskService } from '../services/historyTaskService';
import { useTimer } from '../contexts/TimerContext';

const { Text, Title } = Typography;

interface HistoryTaskListProps {
  maxHeight?: string;
  showHeader?: boolean;
  limit?: number;
  refreshTrigger?: number;
}

const HistoryTaskList: React.FC<HistoryTaskListProps> = ({ 
  maxHeight = '400px',
  showHeader = true,
  limit = 20,
  refreshTrigger = 0
}) => {
  const [historyTasks, setHistoryTasks] = useState<HistoryTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<HistoryTask | null>(null);
  const [taskTimeHistory, setTaskTimeHistory] = useState<any>(null);
  
  const { startTimer, timerState } = useTimer();

  // 加载历史任务列表
  const loadHistoryTasks = useCallback(async () => {
    try {
      setLoading(true);
      const tasks = await HistoryTaskService.getHistoryTasks(limit);
      setHistoryTasks(tasks);
    } catch (error) {
      console.error('加载历史任务失败:', error);
      message.error('加载历史任务失败');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  // 初始加载和刷新触发
  useEffect(() => {
    loadHistoryTasks();
  }, [loadHistoryTasks, refreshTrigger]);

  // 开始计时历史任务
  const handleStartTimer = useCallback(async (task: HistoryTask) => {
    try {
      if (timerState.isRunning) {
        Modal.confirm({
          title: '当前有正在进行的计时',
          content: '开始新的计时会停止当前计时，是否继续？',
          onOk: async () => {
            await startTimer(task.task_id);
            message.success(`开始计时: ${task.task_title}`);
          }
        });
      } else {
        await startTimer(task.task_id);
        message.success(`开始计时: ${task.task_title}`);
      }
    } catch (error) {
      console.error('开始计时失败:', error);
      message.error('开始计时失败');
    }
  }, [startTimer, timerState.isRunning]);

  // 查看任务详细计时历史
  const handleViewDetails = useCallback(async (task: HistoryTask) => {
    try {
      setSelectedTask(task);
      setDetailModalVisible(true);
      
      // 加载详细的计时历史
      const history = await HistoryTaskService.getTaskTimeHistory(task.task_id);
      setTaskTimeHistory(history);
    } catch (error) {
      console.error('加载任务详情失败:', error);
      message.error('加载任务详情失败');
    }
  }, []);

  // 删除历史记录
  const handleDeleteHistory = useCallback(async (task: HistoryTask) => {
    try {
      const success = await HistoryTaskService.deleteHistoryEntry(task.id);
      if (success) {
        message.success('删除成功');
        loadHistoryTasks(); // 重新加载列表
      } else {
        message.error('删除失败');
      }
    } catch (error) {
      console.error('删除历史记录失败:', error);
      message.error('删除失败');
    }
  }, [loadHistoryTasks]);

  // 获取状态标签
  const getStatusTag = (status: HistoryTask['status']) => {
    switch (status) {
      case 'completed':
        return <Tag color="success" icon={<CheckCircleOutlined />}>已完成</Tag>;
      case 'in_progress':
        return <Tag color="processing" icon={<PlayCircleOutlined />}>进行中</Tag>;
      case 'paused':
        return <Tag color="warning" icon={<PauseCircleOutlined />}>已暂停</Tag>;
      default:
        return <Tag color="default">未知</Tag>;
    }
  };

  // 格式化时间显示
  const formatTimeDisplay = (seconds: number, formattedTime: string) => {
    if (seconds < 3600) {
      // 小于1小时，显示分:秒
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    return formattedTime; // 大于1小时，显示完整格式
  };

  // 计算相对时间
  const getRelativeTime = (lastUpdated: string) => {
    const now = new Date();
    const updated = new Date(lastUpdated);
    const diffMs = now.getTime() - updated.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return '今天';
    } else if (diffDays === 1) {
      return '昨天';
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return updated.toLocaleDateString();
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {showHeader && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '12px',
          paddingBottom: '8px',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <Title level={5} style={{ margin: 0 }}>
            <ClockCircleOutlined style={{ marginRight: '8px' }} />
            历史任务
          </Title>
          <Button 
            type="text" 
            size="small"
            icon={<ReloadOutlined />}
            onClick={loadHistoryTasks}
            loading={loading}
          >
            刷新
          </Button>
        </div>
      )}
      
      <div style={{ 
        flex: 1, 
        overflow: 'hidden',
        maxHeight: showHeader ? `calc(${maxHeight} - 60px)` : maxHeight
      }}>
        <Spin spinning={loading}>
          {historyTasks.length === 0 ? (
            <Empty 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无历史任务"
              style={{ paddingTop: '40px' }}
            />
          ) : (
            <List
              size="small"
              dataSource={historyTasks}
              style={{ height: '100%', overflow: 'auto' }}
              renderItem={(task) => (
                <List.Item
                  style={{ 
                    padding: '12px 0',
                    borderBottom: '1px solid #f5f5f5'
                  }}
                  actions={[
                    <Tooltip title="开始计时">
                      <Button 
                        type="text" 
                        size="small"
                        icon={<PlayCircleOutlined />}
                        onClick={() => handleStartTimer(task)}
                        disabled={timerState.isRunning && timerState.taskId === task.task_id}
                      />
                    </Tooltip>,
                    <Tooltip title="查看详情">
                      <Button 
                        type="text" 
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewDetails(task)}
                      />
                    </Tooltip>,
                    <Popconfirm
                      title="确定删除这条历史记录吗？"
                      onConfirm={() => handleDeleteHistory(task)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Tooltip title="删除记录">
                        <Button 
                          type="text" 
                          size="small"
                          icon={<DeleteOutlined />}
                          danger
                        />
                      </Tooltip>
                    </Popconfirm>
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Tooltip title={task.task_title}>
                          <Text strong style={{ 
                            fontSize: '14px',
                            maxWidth: '200px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block'
                          }}>
                            {task.task_title}
                          </Text>
                        </Tooltip>
                        {getStatusTag(task.status)}
                      </div>
                    }
                    description={
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          项目: {task.project_name}
                        </Text>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            <ClockCircleOutlined style={{ marginRight: '4px' }} />
                            {formatTimeDisplay(task.total_seconds, task.formatted_time)}
                          </Text>
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            {getRelativeTime(task.last_updated)}
                          </Text>
                        </div>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Spin>
      </div>

      {/* 任务详情模态框 */}
      <Modal
        title={`任务计时历史 - ${selectedTask?.task_title}`}
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedTask(null);
          setTaskTimeHistory(null);
        }}
        footer={null}
        width={600}
      >
        {selectedTask && (
          <div>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <div>
                <Text strong>项目：</Text>
                <Text>{selectedTask.project_name}</Text>
              </div>
              <div>
                <Text strong>总计时：</Text>
                <Text>{selectedTask.formatted_time}</Text>
              </div>
              <div>
                <Text strong>状态：</Text>
                {getStatusTag(selectedTask.status)}
              </div>
              
              {taskTimeHistory && (
                <div>
                  <Title level={5}>计时记录</Title>
                  {taskTimeHistory.sessions && taskTimeHistory.sessions.length > 0 ? (
                    <List
                      size="small"
                      dataSource={taskTimeHistory.sessions}
                      renderItem={(session: any) => (
                        <List.Item>
                          <List.Item.Meta
                            title={session.date}
                            description={`${session.start_time} - ${session.end_time} (${session.duration})`}
                          />
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Text type="secondary">暂无详细计时记录</Text>
                  )}
                </div>
              )}
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default HistoryTaskList;