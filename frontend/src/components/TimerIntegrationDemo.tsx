// TimerIntegrationDemo - 统一计时器系统集成示例
// 任务#243: 前端通用组件开发 - 组件集成示例
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Typography,
  Divider,
  Alert,
  Badge,
  Tabs,
  Modal,
  notification,
  Affix,
  FloatButton
} from 'antd';
import {
  ClockCircleOutlined,
  SettingOutlined,
  BulbOutlined,
  HistoryOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  ThunderboltOutlined,
  FullscreenOutlined
} from '@ant-design/icons';

// 导入统一计时器组件
import { UniversalTimerWidget } from './UniversalTimerWidget';
import { SmartSuggestionsPanel } from './SmartSuggestionsPanel';
import { UserTimerPreferences } from './UserTimerPreferences';
import { useUnifiedTimer } from '../hooks/useUnifiedTimer';
import { unifiedTimerService } from '../services/unifiedTimerService';
import type { TimerSuggestion, TimerStatus } from '../types/timer';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface TimerIntegrationDemoProps {
  embedded?: boolean;
  showControls?: boolean;
  defaultLayout?: 'grid' | 'sidebar' | 'fullscreen';
}

export const TimerIntegrationDemo: React.FC<TimerIntegrationDemoProps> = ({
  embedded = false,
  showControls = true,
  defaultLayout = 'grid'
}) => {
  // 统一计时器状态
  const {
    currentTimer,
    isRunning,
    isPaused,
    elapsedSeconds,
    getSuggestions,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer
  } = useUnifiedTimer();

  // 本地状态
  const [layout, setLayout] = useState(defaultLayout);
  const [showPreferences, setShowPreferences] = useState(false);
  const [suggestions, setSuggestions] = useState<TimerSuggestion[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('widget');
  const [timerStats, setTimerStats] = useState<any>(null);

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [suggestionsResponse, recentResponse, statsResponse] = await Promise.all([
        unifiedTimerService.getSuggestions(),
        unifiedTimerService.getRecentTasks(5),
        unifiedTimerService.getTimerStats('7d')
      ]);

      if (suggestionsResponse.success) {
        setSuggestions(suggestionsResponse.data || []);
      }
      if (recentResponse.success) {
        setRecentTasks(recentResponse.data || []);
      }
      if (statsResponse.success) {
        setTimerStats(statsResponse.data);
      }
    } catch (error) {
      console.error('数据加载失败:', error);
      notification.error({
        message: '数据加载失败',
        description: '部分功能可能无法正常使用'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // 计时器事件处理
  const handleTimerStart = (timerData: any) => {
    notification.success({
      message: '计时器已启动',
      description: `开始计时: ${timerData.target_title || '未知任务'}`
    });
    loadData(); // 重新加载数据
  };

  const handleTimerStop = (timerData: any) => {
    notification.info({
      message: '计时器已停止',
      description: `任务完成，总计时: ${formatDuration(timerData.duration_seconds || 0)}`
    });
    loadData(); // 重新加载数据
  };

  const handleTimerUpdate = (status: TimerStatus) => {
    console.log('计时器状态更新:', status);
  };

  const handleSuggestionSelect = (suggestion: TimerSuggestion) => {
    notification.info({
      message: '选择了智能建议',
      description: `准备开始: ${suggestion.title}`
    });
  };

  const handleSuggestionFeedback = (suggestionId: number, rating: number, feedback?: string) => {
    notification.success({
      message: '反馈已提交',
      description: '感谢您的反馈，这将帮助我们改进推荐算法'
    });
  };

  // 格式化时长
  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}小时${mins}分钟`;
    }
    return `${mins}分钟${secs}秒`;
  };

  // 刷新建议
  const refreshSuggestions = async () => {
    try {
      const response = await unifiedTimerService.getSuggestions();
      if (response.success) {
        setSuggestions(response.data || []);
        notification.success({
          message: '建议已刷新',
          description: '获取了新的智能建议'
        });
      }
    } catch (error) {
      notification.error({
        message: '刷新失败',
        description: '无法获取新的建议'
      });
    }
  };

  // 组件初始化
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 渲染统计卡片
  const renderStatsCard = () => (
    <Card title="今日统计"  loading={loading}>
      {timerStats ? (
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
              {timerStats.total_hours || 0}h
            </Title>
            <Text type="secondary">总计时长</Text>
          </div>
          <Row gutter={8}>
            <Col span={12} style={{ textAlign: 'center' }}>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  {timerStats.total_sessions || 0}
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>会话次数</Text>
              </div>
            </Col>
            <Col span={12} style={{ textAlign: 'center' }}>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  {timerStats.avg_session_minutes || 0}m
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>平均时长</Text>
              </div>
            </Col>
          </Row>
        </Space>
      ) : (
        <Text type="secondary">暂无统计数据</Text>
      )}
    </Card>
  );

  // 渲染最近任务卡片
  const renderRecentTasksCard = () => (
    <Card title="最近任务"  loading={loading}>
      {recentTasks.length > 0 ? (
        <Space direction="vertical" style={{ width: '100%' }} >
          {recentTasks.map((task, index) => (
            <div
              key={index}
              style={{
                padding: '8px',
                background: '#f5f5f5',
                borderRadius: 4,
                cursor: 'pointer'
              }}
              onClick={() => {
                notification.info({
                  message: '点击任务',
                  description: `您点击了任务: ${task.task_title}`
                });
              }}
            >
              <div style={{ fontWeight: 500, fontSize: 12 }}>
                {task.task_title}
              </div>
              <div style={{ fontSize: 11, color: '#666' }}>
                {task.category} • {formatDuration(task.total_seconds)}
              </div>
            </div>
          ))}
        </Space>
      ) : (
        <Text type="secondary">暂无最近任务</Text>
      )}
    </Card>
  );

  // 渲染网格布局
  const renderGridLayout = () => (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} md={8}>
        <UniversalTimerWidget
          size="normal"
          showSuggestions={false}
          showHistory={false}
          onTimerStart={handleTimerStart}
          onTimerStop={handleTimerStop}
          onTimerUpdate={handleTimerUpdate}
        />
      </Col>
      
      <Col xs={24} sm={12} md={8}>
        <SmartSuggestionsPanel
          suggestions={suggestions}
          loading={loading}
          onSuggestionSelect={handleSuggestionSelect}
          onRefresh={refreshSuggestions}
          onFeedback={handleSuggestionFeedback}
          compact={false}
        />
      </Col>
      
      <Col xs={24} sm={12} md={8}>
        <Space direction="vertical" style={{ width: '100%' }}>
          {renderStatsCard()}
          {renderRecentTasksCard()}
        </Space>
      </Col>
    </Row>
  );

  // 渲染侧边栏布局
  const renderSidebarLayout = () => (
    <Row gutter={16}>
      <Col span={16}>
        <UniversalTimerWidget
          size="expanded"
          showSuggestions={true}
          showHistory={true}
          onTimerStart={handleTimerStart}
          onTimerStop={handleTimerStop}
          onTimerUpdate={handleTimerUpdate}
        />
      </Col>
      <Col span={8}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <SmartSuggestionsPanel
            suggestions={suggestions}
            loading={loading}
            onSuggestionSelect={handleSuggestionSelect}
            onRefresh={refreshSuggestions}
            onFeedback={handleSuggestionFeedback}
            compact={true}
          />
          {renderStatsCard()}
          {renderRecentTasksCard()}
        </Space>
      </Col>
    </Row>
  );

  // 渲染全屏布局
  const renderFullscreenLayout = () => (
    <div style={{ height: '100vh', padding: 20 }}>
      <Row justify="center">
        <Col span={12}>
          <UniversalTimerWidget
            size="expanded"
            showSuggestions={true}
            showHistory={true}
            allowFullscreen={true}
            onTimerStart={handleTimerStart}
            onTimerStop={handleTimerStop}
            onTimerUpdate={handleTimerUpdate}
          />
        </Col>
      </Row>
    </div>
  );

  // 渲染标签页内容
  const renderTabContent = () => {
    switch (layout) {
      case 'sidebar':
        return renderSidebarLayout();
      case 'fullscreen':
        return renderFullscreenLayout();
      default:
        return renderGridLayout();
    }
  };

  if (embedded) {
    return (
      <div style={{ padding: 16 }}>
        {renderTabContent()}
        
        {/* 偏好设置模态框 */}
        <UserTimerPreferences
          visible={showPreferences}
          onClose={() => setShowPreferences(false)}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, minHeight: '100vh', background: '#f0f2f5' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <ClockCircleOutlined style={{ marginRight: 8 }} />
          统一计时器系统演示
          {currentTimer && (
            <Badge 
              count={isRunning ? (isPaused ? '暂停中' : '运行中') : '已停止'} 
              color={isRunning ? (isPaused ? '#faad14' : '#52c41a') : '#d9d9d9'}
              style={{ marginLeft: 16 }}
            />
          )}
        </Title>
        <Paragraph type="secondary">
          这是一个完整的统一计时器系统演示，展示了所有组件的集成使用方式。
          包含智能建议、用户偏好设置、统计数据等功能。
        </Paragraph>
      </div>

      {/* 控制面板 */}
      {showControls && (
        <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: '12px 16px' }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <Text strong>布局模式：</Text>
                <Button.Group>
                  <Button 
                    type={layout === 'grid' ? 'primary' : 'default'}
                    
                    onClick={() => setLayout('grid')}
                  >
                    网格
                  </Button>
                  <Button 
                    type={layout === 'sidebar' ? 'primary' : 'default'}
                    
                    onClick={() => setLayout('sidebar')}
                  >
                    侧边栏
                  </Button>
                  <Button 
                    type={layout === 'fullscreen' ? 'primary' : 'default'}
                    
                    onClick={() => setLayout('fullscreen')}
                    icon={<FullscreenOutlined />}
                  >
                    全屏
                  </Button>
                </Button.Group>
              </Space>
            </Col>
            <Col>
              <Space>
                <Button 
                  icon={<BulbOutlined />}
                  onClick={refreshSuggestions}
                  loading={loading}
                  
                >
                  刷新建议
                </Button>
                <Button 
                  icon={<SettingOutlined />}
                  onClick={() => setShowPreferences(true)}
                  
                >
                  偏好设置
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* 系统状态提示 */}
      {currentTimer && (
        <Alert
          message="计时器状态"
          description={
            <Space>
              <Text>当前任务：{currentTimer.target_title}</Text>
              <Text>•</Text>
              <Text>状态：{isPaused ? '暂停中' : isRunning ? '运行中' : '已停止'}</Text>
              <Text>•</Text>
              <Text>时长：{formatDuration(elapsedSeconds)}</Text>
            </Space>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          closable
        />
      )}

      {/* 主要内容区域 */}
      <div>
        {renderTabContent()}
      </div>

      {/* 浮动按钮组 */}
      <FloatButton.Group
        trigger="hover"
        type="primary"
        style={{ right: 24 }}
        icon={<ThunderboltOutlined />}
      >
        <FloatButton
          icon={<SettingOutlined />}
          tooltip="偏好设置"
          onClick={() => setShowPreferences(true)}
        />
        <FloatButton
          icon={<BulbOutlined />}
          tooltip="刷新建议"
          onClick={refreshSuggestions}
        />
        <FloatButton
          icon={<DashboardOutlined />}
          tooltip="回到网格视图"
          onClick={() => setLayout('grid')}
        />
      </FloatButton.Group>

      {/* 偏好设置模态框 */}
      <UserTimerPreferences
        visible={showPreferences}
        onClose={() => setShowPreferences(false)}
      />

      {/* 固定的迷你计时器 */}
      {currentTimer && layout !== 'fullscreen' && (
        <Affix style={{ position: 'fixed', bottom: 20, left: 20 }}>
          <UniversalTimerWidget
            size="compact"
            embedded={true}
            showSuggestions={false}
            showHistory={false}
            allowFullscreen={false}
          />
        </Affix>
      )}
    </div>
  );
};

export default TimerIntegrationDemo;