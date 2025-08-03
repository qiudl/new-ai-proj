// UniversalTimerWidget - 统一计时器组件
// 任务#243: 前端通用组件开发 - 核心计时器组件
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  Button,
  Progress,
  Typography,
  Space,
  Dropdown,
  Menu,
  Input,
  Select,
  Tag,
  Tooltip,
  Modal,
  Slider,
  Badge,
  notification,
  Avatar
} from 'antd';
import {
  PlayCircleOutlined,
  PauseOutlined,
  StopOutlined,
  SettingOutlined,
  ClockCircleOutlined,
  BulbOutlined,
  HistoryOutlined,
  TagOutlined,
  ProjectOutlined,
  UserOutlined,
  ThunderboltOutlined,
  EyeInvisibleOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined
} from '@ant-design/icons';
import { useUnifiedTimer } from '../hooks/useUnifiedTimer';
import useKeyboardShortcuts, { createTimerShortcuts } from '../hooks/useKeyboardShortcuts';
import type { TimerStatus, TimerSuggestion, TimerTemplate } from '../types/timer';

const { Title, Text } = Typography;
const { Option } = Select;

interface UniversalTimerWidgetProps {
  // 组件配置
  size?: 'compact' | 'normal' | 'expanded';
  showSuggestions?: boolean;
  showHistory?: boolean;
  allowFullscreen?: boolean;
  embedded?: boolean;
  
  // 默认值
  defaultTaskType?: 'project_task' | 'personal_task' | 'quick_timer' | 'pomodoro';
  defaultCategory?: string;
  presetTaskId?: number;
  
  // 事件回调
  onTimerStart?: (timerData: any) => void;
  onTimerStop?: (timerData: any) => void;
  onTimerUpdate?: (status: TimerStatus) => void;
  onSuggestionSelect?: (suggestion: TimerSuggestion) => void;
}

export const UniversalTimerWidget: React.FC<UniversalTimerWidgetProps> = ({
  size = 'normal',
  showSuggestions = true,
  showHistory = true,
  allowFullscreen = true,
  embedded = false,
  defaultTaskType = 'project_task',
  defaultCategory = '工作',
  presetTaskId,
  onTimerStart,
  onTimerStop,
  onTimerUpdate,
  onSuggestionSelect
}) => {
  // 计时器核心状态
  const {
    currentTimer,
    isRunning,
    isPaused,
    elapsedSeconds,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    getSuggestions,
    getTemplates,
    getRecentTasks
  } = useUnifiedTimer();

  // UI状态
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [suggestions, setSuggestions] = useState<TimerSuggestion[]>([]);
  const [templates, setTemplates] = useState<TimerTemplate[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);

  // 表单状态
  const [quickTitle, setQuickTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [estimatedMinutes, setEstimatedMinutes] = useState(25);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Refs
  const timerRef = useRef<NodeJS.Timeout>();
  const widgetRef = useRef<HTMLDivElement>(null);

  // 键盘快捷键
  const timerShortcuts = createTimerShortcuts({
    startTimer: () => {
      if (!isRunning) {
        handleStart();
      } else if (isPaused) {
        handleResume();
      } else {
        handlePause();
      }
    },
    stopTimer: handleStop,
    pauseTimer: () => {
      if (isRunning && !isPaused) {
        handlePause();
      } else if (isPaused) {
        handleResume();
      }
    },
    showHelp: () => {
      Modal.info({
        title: '快捷键帮助',
        content: (
          <div>
            <p><strong>Ctrl/Cmd + S:</strong> 开始/暂停/恢复计时</p>
            <p><strong>Ctrl/Cmd + E:</strong> 停止计时</p>
            <p><strong>Ctrl/Cmd + P:</strong> 暂停/恢复计时</p>
            <p><strong>Shift + ?:</strong> 显示此帮助</p>
            <p><strong>F11:</strong> 切换全屏模式</p>
            <p><strong>Escape:</strong> 退出全屏/关闭弹窗</p>
          </div>
        )
      });
    },
    toggleFocus: () => allowFullscreen && setIsFullscreen(!isFullscreen)
  });

  useKeyboardShortcuts(timerShortcuts, { enabled: !embedded });

  // 初始化数据
  useEffect(() => {
    loadInitialData();
  }, []);

  // 计时器状态变化通知
  useEffect(() => {
    if (currentTimer && onTimerUpdate) {
      onTimerUpdate(currentTimer);
    }
  }, [currentTimer, onTimerUpdate]);

  // 自动保存定时器
  useEffect(() => {
    if (isRunning && !isPaused) {
      timerRef.current = setInterval(() => {
        // 本地时间更新逻辑
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, isPaused]);

  const loadInitialData = async () => {
    try {
      const [suggestionsData, templatesData, recentData] = await Promise.all([
        getSuggestions(),
        getTemplates(),
        getRecentTasks(10)
      ]);
      
      setSuggestions(suggestionsData);
      setTemplates(templatesData);
      setRecentTasks(recentData);
    } catch (error) {
      console.error('加载初始数据失败:', error);
      notification.error({
        message: '数据加载失败',
        description: '无法加载计时器数据，请刷新页面重试'
      });
    }
  };

  const handlePlayPause = () => {
    if (isRunning && !isPaused) {
      handlePause();
    } else if (isPaused) {
      handleResume();
    } else {
      handleStart();
    }
  };

  const handleStart = async () => {
    if (!quickTitle.trim() && !selectedTemplate && !presetTaskId) {
      setShowQuickStart(true);
      return;
    }

    try {
      const timerData = {
        task_type: defaultTaskType,
        task_id: presetTaskId || undefined,
        title: quickTitle || templates.find(t => t.id === selectedTemplate)?.default_title || '快速计时',
        category: selectedCategory,
        estimated_minutes: estimatedMinutes,
        tags: selectedTags,
        template_id: selectedTemplate,
        auto_stop_others: true
      };

      const result = await startTimer(timerData);
      
      notification.success({
        message: '计时器已启动',
        description: `开始计时: ${timerData.title}`
      });

      if (onTimerStart) {
        onTimerStart(result);
      }

      setShowQuickStart(false);
    } catch (error) {
      notification.error({
        message: '启动失败',
        description: error instanceof Error ? error.message : '计时器启动失败'
      });
    }
  };

  const handlePause = async () => {
    try {
      await pauseTimer();
      notification.info({
        message: '计时器已暂停',
        description: '点击恢复继续计时'
      });
    } catch (error) {
      notification.error({
        message: '暂停失败',
        description: error instanceof Error ? error.message : '计时器暂停失败'
      });
    }
  };

  const handleResume = async () => {
    try {
      await resumeTimer();
      notification.success({
        message: '计时器已恢复',
        description: '继续计时中...'
      });
    } catch (error) {
      notification.error({
        message: '恢复失败',
        description: error instanceof Error ? error.message : '计时器恢复失败'
      });
    }
  };

  const handleStop = () => {
    Modal.confirm({
      title: '确认停止计时',
      content: '确定要停止当前计时吗？计时数据将被保存。',
      okText: '停止',
      cancelText: '取消',
      onOk: async () => {
        try {
          const result = await stopTimer();
          
          notification.success({
            message: '计时器已停止',
            description: `本次计时 ${formatDuration(elapsedSeconds)}，数据已保存`
          });

          if (onTimerStop) {
            onTimerStop(result);
          }

          // 重置状态
          setQuickTitle('');
          setSelectedTemplate(null);
        } catch (error) {
          notification.error({
            message: '停止失败',
            description: error instanceof Error ? error.message : '计时器停止失败'
          });
        }
      }
    });
  };

  const handleSuggestionClick = (suggestion: TimerSuggestion) => {
    setQuickTitle(suggestion.title);
    setSelectedCategory(suggestion.category);
    setEstimatedMinutes(suggestion.estimated_minutes || 25);
    setSelectedTags(suggestion.tags || []);
    
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion);
    }

    // 自动启动
    setTimeout(() => handleStart(), 100);
  };

  const handleTemplateSelect = (templateId: number) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setQuickTitle(template.default_title || '');
      setSelectedCategory(template.default_category || defaultCategory);
      setEstimatedMinutes(template.default_duration_minutes || 25);
      setSelectedTags(template.default_tags || []);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (): number => {
    if (!currentTimer || !estimatedMinutes) return 0;
    const estimatedSeconds = estimatedMinutes * 60;
    return Math.min((elapsedSeconds / estimatedSeconds) * 100, 100);
  };

  const getTimerStatusColor = (): string => {
    if (isPaused) return '#faad14'; // orange
    if (isRunning) return '#52c41a'; // green
    return '#d9d9d9'; // gray
  };

  const renderMainControls = () => (
    <Space size="large" className="timer-main-controls">
      <Button
        type="primary"
        size={size === 'compact' ? 'middle' : 'large'}
        icon={isRunning && !isPaused ? <PauseOutlined /> : <PlayCircleOutlined />}
        onClick={handlePlayPause}
        loading={false}
        disabled={false}
      >
        {isRunning && !isPaused ? '暂停' : isPaused ? '恢复' : '开始'}
      </Button>
      
      {isRunning && (
        <Button
          size={size === 'compact' ? 'middle' : 'large'}
          icon={<StopOutlined />}
          onClick={handleStop}
          danger
        >
          停止
        </Button>
      )}
      
      <Button
        size={size === 'compact' ? 'middle' : 'large'}
        icon={<SettingOutlined />}
        onClick={() => setShowSettings(true)}
      >
        设置
      </Button>
    </Space>
  );

  const renderTimerDisplay = () => (
    <div className="timer-display" style={{ textAlign: 'center', margin: '16px 0' }}>
      <Badge status={isRunning ? 'processing' : 'default'} color={getTimerStatusColor()}>
        <Title level={size === 'compact' ? 4 : 2} style={{ margin: 0, fontFamily: 'monospace' }}>
          {formatDuration(elapsedSeconds)}
        </Title>
      </Badge>
      
      {currentTimer && (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary">{currentTimer.target_title}</Text>
          {currentTimer.category && (
            <Tag color="blue" style={{ marginLeft: 8 }}>
              {currentTimer.category}
            </Tag>
          )}
        </div>
      )}
      
      {estimatedMinutes > 0 && (
        <Progress
          percent={getProgressPercentage()}
          showInfo={false}
          strokeColor={getTimerStatusColor()}
          style={{ marginTop: 12 }}
        />
      )}
    </div>
  );

  const renderSuggestions = () => {
    if (!showSuggestions || suggestions.length === 0) return null;

    return (
      <div className="timer-suggestions" style={{ marginTop: 16 }}>
        <Text strong>
          <BulbOutlined /> 智能建议
        </Text>
        <div style={{ marginTop: 8 }}>
          {suggestions.slice(0, 3).map((suggestion, index) => (
            <Tag
              key={index}
              color="processing"
              style={{ marginBottom: 4, cursor: 'pointer' }}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <ClockCircleOutlined /> {suggestion.title}
            </Tag>
          ))}
        </div>
      </div>
    );
  };

  const renderRecentTasks = () => {
    if (!showHistory || recentTasks.length === 0) return null;

    return (
      <div className="timer-recent" style={{ marginTop: 16 }}>
        <Text strong>
          <HistoryOutlined /> 最近任务
        </Text>
        <div style={{ marginTop: 8 }}>
          {recentTasks.slice(0, 5).map((task, index) => (
            <div
              key={index}
              style={{
                padding: '4px 8px',
                borderRadius: 4,
                background: '#f5f5f5',
                marginBottom: 4,
                cursor: 'pointer',
                fontSize: '12px'
              }}
              onClick={() => {
                setQuickTitle(task.task_title);
                setSelectedCategory(task.category || defaultCategory);
              }}
            >
              <Space size="small">
                {task.target_type === 'project_task' ? <ProjectOutlined /> : <UserOutlined />}
                <Text style={{ fontSize: 12 }}>{task.task_title}</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {formatDuration(task.total_seconds)}
                </Text>
              </Space>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderQuickStartModal = () => (
    <Modal
      title="快速开始计时"
      open={showQuickStart}
      onOk={handleStart}
      onCancel={() => setShowQuickStart(false)}
      okText="开始计时"
      cancelText="取消"
      width={500}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Text strong>任务标题</Text>
          <Input
            placeholder="请输入任务标题"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            autoFocus
          />
        </div>
        
        <div>
          <Text strong>分类</Text>
          <Select
            value={selectedCategory}
            onChange={setSelectedCategory}
            style={{ width: '100%' }}
          >
            <Option value="工作">工作</Option>
            <Option value="学习">学习</Option>
            <Option value="开发">开发</Option>
            <Option value="会议">会议</Option>
            <Option value="休息">休息</Option>
            <Option value="其他">其他</Option>
          </Select>
        </div>
        
        <div>
          <Text strong>预计时长 ({estimatedMinutes} 分钟)</Text>
          <Slider
            min={5}
            max={180}
            value={estimatedMinutes}
            onChange={setEstimatedMinutes}
            marks={{
              5: '5分',
              25: '25分',
              60: '1小时',
              120: '2小时',
              180: '3小时'
            }}
          />
        </div>

        {templates.length > 0 && (
          <div>
            <Text strong>使用模板</Text>
            <Select
              placeholder="选择计时模板"
              value={selectedTemplate}
              onChange={handleTemplateSelect}
              style={{ width: '100%' }}
              allowClear
            >
              {templates.map(template => (
                <Option key={template.id} value={template.id}>
                  <Space>
                    <Avatar size="small" icon={<ThunderboltOutlined />} />
                    {template.name}
                    <Text type="secondary">({template.default_duration_minutes}分钟)</Text>
                  </Space>
                </Option>
              ))}
            </Select>
          </div>
        )}
      </Space>
    </Modal>
  );

  // 根据size和状态决定渲染方式
  const cardClass = `universal-timer-widget ${size} ${isFullscreen ? 'fullscreen' : ''} ${isMinimized ? 'minimized' : ''}`;
  
  const cardExtra = (
    <Space>
      {allowFullscreen && (
        <Tooltip title={isFullscreen ? '退出全屏' : '全屏'}>
          <Button
            type="text"
            size="small"
            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={() => setIsFullscreen(!isFullscreen)}
          />
        </Tooltip>
      )}
      
      <Tooltip title={isMinimized ? '展开' : '最小化'}>
        <Button
          type="text"
          size="small"
          icon={<EyeInvisibleOutlined />}
          onClick={() => setIsMinimized(!isMinimized)}
        />
      </Tooltip>
    </Space>
  );

  if (isMinimized) {
    return (
      <div ref={widgetRef} className={cardClass} style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}>
        <Card size="small" extra={cardExtra}>
          <Space>
            <Badge status={isRunning ? 'processing' : 'default'} color={getTimerStatusColor()}>
              <Text style={{ fontFamily: 'monospace' }}>
                {formatDuration(elapsedSeconds)}
              </Text>
            </Badge>
            <Button size="small" type="primary" onClick={handlePlayPause}>
              {isRunning && !isPaused ? <PauseOutlined /> : <PlayCircleOutlined />}
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  return (
    <div ref={widgetRef} className={cardClass}>
      <Card
        title={
          <Space>
            <ClockCircleOutlined />
            统一计时器
            {currentTimer && (
              <Tag color={isRunning ? 'green' : 'default'}>
                {isPaused ? '已暂停' : isRunning ? '运行中' : '已停止'}
              </Tag>
            )}
          </Space>
        }
        extra={!embedded ? cardExtra : null}
        size={size === 'compact' ? 'small' : 'default'}
        style={{
          ...(isFullscreen ? {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            margin: 0,
            borderRadius: 0
          } : {})
        }}
      >
        {renderTimerDisplay()}
        {renderMainControls()}
        {!isFullscreen && renderSuggestions()}
        {!isFullscreen && renderRecentTasks()}
        {renderQuickStartModal()}
      </Card>
    </div>
  );
};

export default UniversalTimerWidget;