import React, { useState, useEffect } from 'react';
import {
  Card,
  Collapse,
  Button,
  Typography,
  Empty,
  Tooltip,
  Modal,
  Spin,
  Row,
  Col,
  Statistic,
  Space,
  Tag,
  List,
  Progress
} from 'antd';
import {
  ClockCircleOutlined,
  BulbOutlined,
  ReloadOutlined,
  StarOutlined,
  CheckOutlined,
  RightOutlined,
  DownOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useDailyFocusTasks } from '../hooks/useDailyFocusTasks';
import { DailyFocusTask } from '../types/dailyFocusTask';
import { Task } from '../types/task';
import { taskService, TaskService } from '../services/taskService';

const { Title, Text } = Typography;
const { Panel } = Collapse;

interface DailyFocusTasksProps {
  title?: string;
  showHeader?: boolean;
  maxHeight?: number;
  compact?: boolean;
  showStats?: boolean;
}

const DailyFocusTasks: React.FC<DailyFocusTasksProps> = ({
  title = '今日主要任务',
  showHeader = true,
  maxHeight = 400,
  compact = false,
  showStats = true
}) => {
  const navigate = useNavigate();
  
  const {
    focusTasks,
    loading,
    error,
    recommendations,
    stats,
    loadRecommendations,
    refreshFocusTasks
  } = useDailyFocusTasks();

  // Component state
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);
  const [taskChildren, setTaskChildren] = useState<Record<number, Task[]>>({});
  const [loadingChildren, setLoadingChildren] = useState<Record<number, boolean>>({});

  // Load recommendations on mount
  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  // Handle task click
  const handleTaskClick = (task: DailyFocusTask) => {
    if (task.task_id && task.project_id) {
      navigate(`/projects/${task.project_id}/tasks/${task.task_id}`);
    }
  };

  // Load children tasks
  const loadTaskChildren = async (taskId: number, projectId: number) => {
    console.log(`[DailyFocusTasks] Loading children for task ${taskId}, project ${projectId}`);
    
    if (taskChildren[taskId] || loadingChildren[taskId]) {
      console.log(`[DailyFocusTasks] Task ${taskId} already loaded or loading, skipping`);
      return; // Already loaded or loading
    }

    setLoadingChildren(prev => ({ ...prev, [taskId]: true }));
    try {
      console.log(`[DailyFocusTasks] Calling TaskService.getTaskChildren(${projectId}, ${taskId})`);
      const response = await TaskService.getTaskChildren(projectId, taskId);
      console.log(`[DailyFocusTasks] API response for task ${taskId}:`, response);
      
      // Handle different response structures
      let childrenArray: Task[] = [];
      if (Array.isArray(response)) {
        childrenArray = response;
        console.log(`[DailyFocusTasks] Response is array, children count: ${childrenArray.length}`);
      } else if (response && typeof response === 'object') {
        // Handle API response: {data: {data: [...], pagination: ...}}
        if (response.data && Array.isArray(response.data)) {
          childrenArray = response.data;
          console.log(`[DailyFocusTasks] Found children in response.data, count: ${childrenArray.length}`);
        } else if (Array.isArray(response.data?.data)) {
          childrenArray = response.data.data;
          console.log(`[DailyFocusTasks] Found children in response.data.data, count: ${childrenArray.length}`);
        } else {
          console.log(`[DailyFocusTasks] No children found in response structure:`, response);
        }
      }
      console.log(`[DailyFocusTasks] Final children array for task ${taskId}:`, childrenArray);
      setTaskChildren(prev => ({ ...prev, [taskId]: childrenArray }));
    } catch (error) {
      console.error(`[DailyFocusTasks] Failed to load task children for task ${taskId}:`, error);
      setTaskChildren(prev => ({ ...prev, [taskId]: [] }));
    } finally {
      setLoadingChildren(prev => ({ ...prev, [taskId]: false }));
    }
  };

  // Get task status color and text
  const getTaskStatusInfo = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      'completed': { color: 'success', text: '已完成' },
      'in_progress': { color: 'processing', text: '进行中' },
      'todo': { color: 'default', text: '待办' },
      'blocked': { color: 'error', text: '阻塞' },
      'on_hold': { color: 'warning', text: '暂停' },
      'testing': { color: 'cyan', text: '测试中' },
      'cancelled': { color: 'error', text: '已取消' }
    };
    return statusMap[status] || { color: 'default', text: status };
  };

  // Calculate task progress based on status and children
  const getTaskProgress = (task: DailyFocusTask): number => {
    // If task has explicit progress, use it
    if (typeof task.task_progress === 'number') {
      return task.task_progress;
    }
    
    // Calculate based on status
    const statusProgressMap: Record<string, number> = {
      'completed': 100,
      'testing': 90,
      'in_progress': 50,
      'todo': 0,
      'blocked': 25,
      'on_hold': 25,
      'cancelled': 0
    };
    
    return statusProgressMap[task.task_status || 'todo'] || 0;
  };

  // Get progress status for color
  const getProgressStatus = (progress: number) => {
    if (progress >= 100) return 'success';
    if (progress >= 80) return 'active';
    if (progress >= 50) return 'normal';
    return 'exception';
  };

  // Handle collapse change
  const handleCollapseChange = async (activeKeys: string | string[]) => {
    const keys = Array.isArray(activeKeys) ? activeKeys : [activeKeys];
    setExpandedTasks(keys);
    
    // Load children for newly expanded tasks
    for (const key of keys) {
      const taskId = parseInt(key);
      const focusTask = focusTasks.find(ft => ft.task_id === taskId);
      if (focusTask && focusTask.project_id && !taskChildren[taskId]) {
        await loadTaskChildren(taskId, focusTask.project_id);
      }
    }
  };

  // Render subtask item
  const renderSubTask = (task: Task) => {
    const progress = task.progress || 0;
    const statusInfo = getTaskStatusInfo(task.status);
    
    return (
      <div 
        key={task.id}
        style={{
          padding: '8px 16px',
          marginBottom: '6px',
          background: '#f9f9f9',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
        onClick={() => navigate(`/projects/${task.project_id}/tasks/${task.id}`)}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '4px'
        }}>
          <Text style={{ fontSize: '12px', flex: 1 }}>
            <RightOutlined style={{ marginRight: '4px', fontSize: '10px' }} />
            #{task.id} {task.title}
          </Text>
          <Space>
            <Tag color={statusInfo.color} style={{ fontSize: '10px' }}>
              {statusInfo.text}
            </Tag>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {progress}%
            </Text>
          </Space>
        </div>
        <Progress 
          percent={progress} 
          size="small" 
          status={getProgressStatus(progress)}
          showInfo={false}
        />
      </div>
    );
  };

  // Render main task panel with OKR-like styling
  const renderTaskPanel = (focusTask: DailyFocusTask) => {
    const progress = getTaskProgress(focusTask);
    const statusInfo = getTaskStatusInfo(focusTask.task_status || 'todo');
    const children = taskChildren[focusTask.task_id] || [];
    const isLoading = loadingChildren[focusTask.task_id];
    const hasChildren = children.length > 0;
    const isExpanded = expandedTasks.includes(focusTask.task_id.toString());
    // Always show expand arrow - we'll determine if there are children when clicked
    const showExpandArrow = true;
    
    const taskStyle = {
      marginBottom: '12px',
      padding: '16px',
      background: '#fff',
      borderRadius: '8px',
      border: '1px solid #d9d9d9',
      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
    };

    return (
      <div key={focusTask.task_id} style={taskStyle}>
        {/* 任务标题行 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: hasChildren || focusTask.notes ? '12px' : '0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            {/* 展开/收起箭头 - 始终显示以便用户可以加载子任务 */}
            {showExpandArrow && (
              <Button
                type="text"
                size="small"
                icon={isExpanded ? <DownOutlined /> : <RightOutlined />}
                onClick={() => {
                  const newExpandedTasks = isExpanded 
                    ? expandedTasks.filter(id => id !== focusTask.task_id.toString())
                    : [...expandedTasks, focusTask.task_id.toString()];
                  handleCollapseChange(newExpandedTasks);
                }}
                style={{ padding: '0px 4px', minWidth: '20px' }}
              />
            )}
            
            {/* 任务标题和状态 */}
            <Space>
              <Text 
                strong 
                style={{ fontSize: '14px', cursor: 'pointer' }}
                onClick={() => handleTaskClick(focusTask)}
              >
                #{focusTask.task_id} {focusTask.task_title}
              </Text>
              <Tag color={statusInfo.color}>
                {statusInfo.text}
              </Tag>
            </Space>
          </div>

          {/* 进度信息 */}
          <Space>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              进度: {progress}%
            </Text>
            <Progress 
              percent={progress} 
              size="small" 
              style={{ width: '100px' }}
              status={getProgressStatus(progress)}
            />
          </Space>
        </div>

        {/* 任务描述 */}
        {focusTask.notes && (
          <div style={{ marginBottom: isExpanded || hasChildren ? '12px' : '0', paddingLeft: isExpanded || hasChildren ? '28px' : '0px' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {focusTask.notes}
            </Text>
          </div>
        )}

        {/* 子任务列表 */}
        {isExpanded && (
          <div style={{ paddingLeft: '28px' }}>
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <Spin size="small" />
                <Text type="secondary" style={{ marginLeft: '8px', fontSize: '12px' }}>
                  加载子任务中...
                </Text>
              </div>
            ) : hasChildren ? (
              <>
                <Text strong style={{ fontSize: '13px', marginBottom: '8px', display: 'block' }}>
                  子任务 ({children.length}):
                </Text>
                {children.map(renderSubTask)}
              </>
            ) : (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                暂无子任务
              </Text>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render recommendations modal - simplified
  const renderRecommendationsModal = () => (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BulbOutlined style={{ color: '#1890ff' }} />
          智能推荐任务
        </div>
      }
      open={showRecommendations}
      onCancel={() => setShowRecommendations(false)}
      footer={null}
      width={600}
    >
      <div style={{ marginBottom: '16px' }}>
        <Text type="secondary">
          基于任务优先级、截止时间和完成状态，为您推荐以下任务：
        </Text>
      </div>
      
      <List
        dataSource={recommendations}
        renderItem={(task) => (
          <List.Item>
            <List.Item.Meta
              title={`#${task.id} ${task.title}`}
              description={task.description}
            />
          </List.Item>
        )}
      />
    </Modal>
  );

  // Render stats
  const renderStats = () => {
    if (!showStats) return null;

    // Calculate accurate stats from actual focusTasks data
    const totalTasks = focusTasks.length;
    const completedTasks = focusTasks.filter(task => task.completed_at).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return (
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Statistic
            title="总任务"
            value={totalTasks}
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: '#1890ff', fontSize: '16px' }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="已完成"
            value={completedTasks}
            prefix={<CheckOutlined />}
            valueStyle={{ color: '#52c41a', fontSize: '16px' }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="完成率"
            value={completionRate}
            suffix="%"
            prefix={<StarOutlined />}
            valueStyle={{ color: '#fa8c16', fontSize: '16px' }}
          />
        </Col>
      </Row>
    );
  };

  // Render header - simplified
  const renderHeader = () => {
    if (!showHeader) return null;

    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>
          {title} ({focusTasks.length})
        </Title>
        
        <Space>
          <Tooltip title="智能推荐">
            <Button
              type="text"
              icon={<BulbOutlined />}
              onClick={() => setShowRecommendations(true)}
            />
          </Tooltip>
          <Tooltip title="刷新">
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={refreshFocusTasks}
              loading={loading}
            />
          </Tooltip>
        </Space>
      </div>
    );
  };

  if (error) {
    return (
      <Card title={renderHeader()}>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Text type="danger">{error}</Text>
          <div style={{ marginTop: '16px' }}>
            <Button onClick={refreshFocusTasks} loading={loading}>
              重新加载
            </Button>
          </div>
        </div>
      </Card>
    );
  }

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
        {renderStats()}

        <div style={{ height: maxHeight, overflow: 'auto' }}>
          {focusTasks.length === 0 ? (
            <Empty
              description="暂无今日主要任务"
              style={{ padding: '40px 0' }}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button
                type="primary"
                icon={<BulbOutlined />}
                onClick={() => setShowRecommendations(true)}
              >
                查看推荐任务
              </Button>
            </Empty>
          ) : (
            <Spin spinning={loading}>
              <div style={{ padding: '8px 0' }}>
                {focusTasks.map(renderTaskPanel)}
              </div>
            </Spin>
          )}
        </div>
      </Card>

      {renderRecommendationsModal()}
    </>
  );
};

export default DailyFocusTasks;