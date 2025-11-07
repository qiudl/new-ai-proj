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
  Progress,
  message,
  Alert,
  Input
} from 'antd';
import {
  ClockCircleOutlined,
  BulbOutlined,
  ReloadOutlined,
  StarOutlined,
  CheckOutlined,
  RightOutlined,
  DownOutlined,
  InfoCircleOutlined,
  SyncOutlined,
  CarryOutOutlined,
  SmileOutlined,
  SearchOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useDailyFocusTasks } from '../hooks/useDailyFocusTasks';
import { DailyFocusTask } from '../types/dailyFocusTask';
import { Task } from '../types/task';
import { taskService, TaskService } from '../services/taskService';

const { Title, Text } = Typography;
const { Panel } = Collapse;

// ✅ FIXED - Added enableBulkActions and maxTasks properties (TS2322)
interface DailyFocusTasksProps {
  title?: string;
  showHeader?: boolean;
  maxHeight?: number;
  compact?: boolean;
  showStats?: boolean;
  enableBulkActions?: boolean;
  maxTasks?: number;
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
    refreshFocusTasks,
    autoCarryOverTasks,
    addFocusTask
  } = useDailyFocusTasks();

  // Component state
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);
  const [taskChildren, setTaskChildren] = useState<Record<number, Task[]>>({});
  const [loadingChildren, setLoadingChildren] = useState<Record<number, boolean>>({});
  const [isCarryingOver, setIsCarryingOver] = useState(false);
  const [showInitMessage, setShowInitMessage] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filteredRecommendations, setFilteredRecommendations] = useState<Task[]>([]);
  const [addingTasks, setAddingTasks] = useState<Set<number>>(new Set());

  // Load recommendations on mount
  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  // Filter recommendations based on search
  useEffect(() => {
    if (!recommendations) {
      setFilteredRecommendations([]);
      return;
    }

    if (!searchKeyword.trim()) {
      setFilteredRecommendations(recommendations);
      return;
    }

    const keyword = searchKeyword.toLowerCase();
    const filtered = recommendations.filter(task => 
      task.title?.toLowerCase().includes(keyword) ||
      task.description?.toLowerCase().includes(keyword)
    );
    setFilteredRecommendations(filtered);
  }, [recommendations, searchKeyword]);

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchKeyword(value);
  };

  // Handle adding task to daily focus
  const handleAddToFocus = async (task: Task) => {
    if (!task.id) return;
    
    setAddingTasks(prev => new Set(prev).add(task.id));
    
    try {
      await addFocusTask({
        task_id: task.id,
        priority: 'medium',
        notes: `从智能推荐添加: ${task.title}`
      });
      
      message.success(`已将"${task.title}"添加到今日主要任务`);
      
      // Refresh recommendations to remove added task
      await loadRecommendations(searchKeyword);
      
    } catch (error) {
      message.error('添加任务失败，请重试');
    } finally {
      setAddingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(task.id);
        return newSet;
      });
    }
  };

  // Hide initial message after some time
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowInitMessage(false);
    }, 5000); // Hide after 5 seconds

    return () => clearTimeout(timer);
  }, []);

  // Manual carry-over function
  const handleManualCarryOver = async () => {
    setIsCarryingOver(true);
    try {
      const result = await autoCarryOverTasks();
      if (result.success && result.count > 0) {
        message.success(`${result.message} 🎉`);
      } else if (result.success && result.count === 0) {
        message.info('昨日没有需要延续的任务');
      } else {
        message.warning(result.message);
      }
    } catch (error) {
      message.error('任务延续失败，请稍后重试');
    } finally {
      setIsCarryingOver(false);
    }
  };

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
        const responseObj = response as any;
        if (responseObj.data && Array.isArray(responseObj.data)) {
          childrenArray = responseObj.data;
          console.log(`[DailyFocusTasks] Found children in response.data, count: ${childrenArray.length}`);
        } else if (Array.isArray(responseObj.data?.data)) {
          childrenArray = responseObj.data.data;
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
      const focusTask = focusTasks?.find(ft => ft.task_id === taskId);
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

  // Render recommendations modal with search and add functionality
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
      width={700}
    >
      <div style={{ marginBottom: '16px' }}>
        <Alert
          message="🤖 智能推荐算法"
          description="基于任务优先级、截止时间、进行状态和您的工作习惯，为您推荐以下任务"
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        
        {/* Search Input */}
        <Input
          placeholder="搜索推荐任务..."
          prefix={<SearchOutlined />}
          value={searchKeyword}
          onChange={(e) => handleSearchChange(e.target.value)}
          style={{ marginBottom: '16px' }}
          allowClear
        />
        
        {filteredRecommendations && filteredRecommendations.length === 0 && !searchKeyword && (
          <Alert
            message="暂无推荐任务"
            description="当前没有合适的任务推荐。您可以稍后再试或手动选择任务。"
            type="warning"
            showIcon
            icon={<SmileOutlined />}
          />
        )}
        
        {filteredRecommendations && filteredRecommendations.length === 0 && searchKeyword && (
          <Alert
            message="未找到匹配的任务"
            description={`没有找到包含 "${searchKeyword}" 的推荐任务。`}
            type="info"
            showIcon
          />
        )}
      </div>
      
      <List
        dataSource={filteredRecommendations}
        renderItem={(task) => (
          <List.Item
            actions={[
              <Button
                key="add"
                type="primary"
                icon={<PlusOutlined />}
                size="small"
                loading={addingTasks.has(task.id)}
                onClick={() => handleAddToFocus(task)}
              >
                设为主要任务
              </Button>
            ]}
          >
            <div style={{ flex: 1 }}>
              <div>
                <Text 
                  strong 
                  style={{ cursor: 'pointer', color: '#1890ff' }}
                  onClick={() => navigate(`/projects/${task.project_id}/tasks/${task.id}`)}
                >
                  #{task.id} {task.title}
                </Text>
                {task.priority && (
                  <Tag color={
                    task.priority === 'high' ? 'red' :
                    task.priority === 'medium' ? 'orange' : 
                    'blue'
                  } style={{ marginLeft: '8px', fontSize: '11px' }}>
                    {task.priority === 'high' ? '高优先级' :
                     task.priority === 'medium' ? '中优先级' : '低优先级'}
                  </Tag>
                )}
                {task.due_date && (
                  <>
                    <ClockCircleOutlined style={{ marginLeft: '8px', marginRight: '4px' }} />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      截止: {new Date(task.due_date).toLocaleDateString()}
                    </Text>
                  </>
                )}
              </div>
            </div>
          </List.Item>
        )}
      />
    </Modal>
  );

  // Render stats
  const renderStats = () => {
    if (!showStats) return null;

    // Use stats from hook if available, otherwise calculate from focusTasks
    const totalTasks = stats?.total_count ?? focusTasks?.length ?? 0;
    const completedTasks = stats?.completed_count ?? focusTasks?.filter(task => task.completed_at)?.length ?? 0;
    const completionRate = stats?.completion_rate ?? (totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);

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
          {title} ({focusTasks?.length || 0})
        </Title>
        
        <Space>
          <Tooltip title="延续昨日任务">
            <Button
              type="text"
              icon={<CarryOutOutlined />}
              onClick={handleManualCarryOver}
              loading={isCarryingOver}
            />
          </Tooltip>
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

        {/* Initialization info */}
        {showInitMessage && !loading && (
          <Alert
            message="✨ 智能助手正在为您初始化"
            description="正在自动延续昨日未完成任务并加载智能推荐..."
            type="info"
            icon={<SyncOutlined spin />}
            showIcon
            closable
            onClose={() => setShowInitMessage(false)}
            style={{ marginBottom: '16px' }}
          />
        )}

        <div style={{ height: maxHeight, overflow: 'auto' }}>
          {(!focusTasks || focusTasks.length === 0) ? (
            <div>
              <Empty
                description="暂无今日主要任务"
                style={{ padding: '40px 0' }}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Space direction="vertical">
                  <Button
                    type="primary"
                    icon={<BulbOutlined />}
                    onClick={() => setShowRecommendations(true)}
                  >
                    查看智能推荐
                  </Button>
                  {!loading && (
                    <Button
                      type="default"
                      icon={<CarryOutOutlined />}
                      onClick={handleManualCarryOver}
                      loading={isCarryingOver}
                    >
                      延续昨日任务
                    </Button>
                  )}
                </Space>
              </Empty>
              
              {recommendations && recommendations.length > 0 && (
                <Alert
                  message={`💡 系统为您推荐了 ${recommendations.length} 个任务`}
                  description="点击上方「查看智能推荐」按钮查看详情"
                  type="success"
                  showIcon
                  style={{ margin: '16px 0' }}
                />
              )}
            </div>
          ) : (
            <Spin spinning={loading}>
              <div style={{ padding: '8px 0' }}>
                {focusTasks?.map(renderTaskPanel)}
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