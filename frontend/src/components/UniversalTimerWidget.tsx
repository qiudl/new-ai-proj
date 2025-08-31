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
  ProjectOutlined,
  UserOutlined,
  ThunderboltOutlined,
  EyeInvisibleOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined
} from '@ant-design/icons';
import { useTimer } from '../contexts/TimerContext';
import useKeyboardShortcuts, { createTimerShortcuts } from '../hooks/useKeyboardShortcuts';
import { personalTimerService } from '../services/personalTimerService';
import { useUnifiedTimer } from '../hooks/useUnifiedTimer';
import type { TimerStatus, TimerSuggestion, TimerTemplate } from '../types/timer';
import dayjs from 'dayjs';

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
  // 计时器核心状态 - 使用统一的TimerContext
  const { timerState, startTimer, stopTimer, pauseTimer, resumeTimer } = useTimer();
  const {
    activeTimers,
    refreshActiveTimers,
    pauseTimerById,
    resumeTimerById,
    stopTimerById,
    pauseAll,
    resumeAll,
    stopAll,
  } = useUnifiedTimer();
  
  // 表单状态 - 先定义状态变量
  const [quickTitle, setQuickTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [estimatedMinutes, setEstimatedMinutes] = useState(25);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // UI状态
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [_showSettings, setShowSettings] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [suggestions, setSuggestions] = useState<TimerSuggestion[]>([]);
  const [templates, setTemplates] = useState<TimerTemplate[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [hasMoreTasks, setHasMoreTasks] = useState(false);
  const [loadingMoreTasks, setLoadingMoreTasks] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hoveredTimerId, setHoveredTimerId] = useState<number | null>(null);
  
  // 从timerState提取状态 - 在状态变量定义之后
  const isRunning = timerState.isRunning;
  const isPaused = timerState.isPaused;
  const elapsedSeconds = timerState.elapsedSeconds || 0;
  const currentTimer = (isRunning || isPaused) && timerState.taskTitle ? {
    status: isRunning ? (isPaused ? 'paused' : 'running') : 'stopped',
    target_title: timerState.taskTitle,
    category: selectedCategory, // 现在可以安全使用
    id: timerState.taskId
  } : null;

  // Refs
  const timerRef = useRef<NodeJS.Timeout>();
  const widgetRef = useRef<HTMLDivElement>(null);

  // 辅助函数 - 必须在处理函数之前定义
  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    // 始终显示小时:分钟:秒格式
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 格式化日期显示 - 年月日星期
  const formatCurrentDate = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const date = now.getDate().toString().padStart(2, '0');
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekdays[now.getDay()];
    
    return `${year}年${month}月${date}日 星期${weekday}`;
  };

  // 模拟数据加载函数 - 替代useUnifiedTimer的数据获取方法
  const getSuggestions = async (): Promise<TimerSuggestion[]> => {
    // 返回模拟的建议数据
    return [
      { id: 1, title: '🚀 继续昨天的工作', category: '工作', estimated_minutes: 25, tags: ['开发'], confidence: 0.8, reasoning: '基于历史记录' },
      { id: 2, title: '📖 学习新技术', category: '学习', estimated_minutes: 30, tags: ['学习'], confidence: 0.7, reasoning: '建议学习' },
      { id: 3, title: '💼 开会准备', category: '会议', estimated_minutes: 15, tags: ['准备'], confidence: 0.9, reasoning: '日程提醒' },
      { id: 4, title: '🔧 代码重构', category: '开发', estimated_minutes: 45, tags: ['重构'], confidence: 0.6, reasoning: '代码质量' }
    ];
  };

  const getTemplates = async (): Promise<TimerTemplate[]> => {
    // 返回模拟的模板数据
    return [];
  };

const getRecentTasks = async (limit: number = 5, offset: number = 0): Promise<{tasks: any[], hasMore: boolean}> => {
    try {
      // 使用 unified timer 历史接口，拿到会话（包含 start_time）
      const response = await personalTimerService.getHistory({ limit, offset });

      // 先转换为内部结构，并收集需要补充项目名的 task_id
      const sessions = response.sessions || [];
      const projectTaskIds = new Set<number>();
      const baseTasks = sessions.map((session) => {
        if ((session.task_type === 'project' || session.task_type === 'project_task') && session.task_id) {
          projectTaskIds.add(session.task_id);
        }
        return {
          task_title: session.task_title,
          target_type: session.task_type,
          total_seconds: session.duration_seconds,
          category: session.task_category,
          task_id: session.task_id,
          start_time: session.start_time,
          end_time: session.end_time,
          last_timed_at: session.end_time || session.start_time,
          task_color: session.task_color,
          project_name: undefined as string | undefined,
        };
      });

      // 并行拉取 recent-tasks 作为 task_id -> project_name 的映射（仅用于补全项目名）
      const idToProjectName = new Map<number, string>();
      try {
        const token = localStorage.getItem('token');
        // 为该非关键请求增加快速超时与静默降级，避免阻塞与报错污染
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1500); // 1.5s 超时
        try {
          // 添加 suppressLog=1 参数，配合拦截器降低日志级别
          const recentResp = await fetch(`/api/v1/timer/recent-tasks?limit=50&offset=0&suppressLog=1`, {
            headers: {
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          });
          if (recentResp.ok) {
            const data = await recentResp.json();
            const arr = Array.isArray(data?.tasks) ? data.tasks : [];
            for (const t of arr) {
              if (typeof t?.task_id === 'number' && typeof t?.project_name === 'string') {
                idToProjectName.set(t.task_id, t.project_name);
              }
            }
          }
        } catch (innerErr) {
          // 静默失败（含超时/中断），项目名补全不是强依赖
          // 仅以 warn 输出一次，避免控制台错误噪声
          console.warn('补全项目名失败，继续使用基础数据:', innerErr);
        } finally {
          clearTimeout(timeout);
        }
      } catch (e) {
        // 兜底处理（极少触发）
        console.warn('补全项目名失败（兜底），继续使用基础数据:', e);
      }

      // 填充 project_name，并确保按开始时间倒序排序
      const tasks = baseTasks
        .map(t => ({
          ...t,
          project_name: t.project_name || (
            (t.target_type === 'project' || t.target_type === 'project_task') && typeof t.task_id === 'number'
              ? (idToProjectName.get(t.task_id) || '项目任务')
              : '个人计时'
          ),
        }))
        .sort((a, b) => {
          const ta = a?.start_time ? new Date(a.start_time).getTime() : 0;
          const tb = b?.start_time ? new Date(b.start_time).getTime() : 0;
          return tb - ta; // 开始时间倒序
        });

      const hasMore = sessions.length === limit;
      return { tasks, hasMore };
    } catch (error) {
      console.error('获取最近任务失败:', error);
      // 返回模拟的最近任务数据作为fallback
      const now = Date.now();
      const mockTasks = [
        { task_title: 'API文档优化', target_type: 'project_task', total_seconds: 5100, category: '开发', project_name: '示例项目A', start_time: new Date(now - 60*60*1000).toISOString() },
        { task_title: '数据库设计', target_type: 'project_task', total_seconds: 2700, category: '开发', project_name: '示例项目B', start_time: new Date(now - 2*60*60*1000).toISOString() },
        { task_title: '学习React Hook', target_type: 'personal_task', total_seconds: 1800, category: '学习', project_name: '个人计时', start_time: new Date(now - 3*60*60*1000).toISOString() },
        { task_title: '代码review', target_type: 'project_task', total_seconds: 900, category: '审查', project_name: '示例项目C', start_time: new Date(now - 4*60*60*1000).toISOString() }
      ].slice(offset, offset + limit);

      return { tasks: mockTasks, hasMore: false };
    }
  };

  // 处理函数声明 - 必须在快捷键配置之前定义
  const handleStart = useCallback(async () => {
    if (!quickTitle.trim() && !selectedTemplate && !presetTaskId) {
      setShowQuickStart(true);
      return;
    }

    try {
      const title = quickTitle || templates.find(t => t.id === selectedTemplate)?.default_title || '快速计时';
      
      // 使用TimerContext的startTimer方法
      // 如果有presetTaskId，作为任务计时；否则创建一个临时ID用于个人计时
      const taskId = presetTaskId || Math.floor(Math.random() * 2147483647); // 临时ID，确保在PostgreSQL INTEGER范围内
      const taskType = presetTaskId ? 'project' : 'personal';
      
      const success = await startTimer(taskId, title, taskType);
      
      if (success) {
        notification.success({
          message: '计时器已启动',
          description: `开始计时: ${title}`
        });

        if (onTimerStart) {
          onTimerStart({
            title,
            category: selectedCategory,
            estimated_minutes: estimatedMinutes,
            tags: selectedTags
          });
        }

        setShowQuickStart(false);
      }
    } catch (error) {
      notification.error({
        message: '启动失败',
        description: error instanceof Error ? error.message : '计时器启动失败'
      });
    }
  }, [quickTitle, selectedTemplate, presetTaskId, selectedCategory, estimatedMinutes, selectedTags, templates, startTimer, onTimerStart]);

  const handleStartWithOption = useCallback(async (autoStopOthers: boolean) => {
    if (!quickTitle.trim() && !selectedTemplate && !presetTaskId) {
      setShowQuickStart(true);
      return;
    }
    try {
      const title = quickTitle || templates.find(t => t.id === selectedTemplate)?.default_title || '快速计时';
      const taskId = presetTaskId || Math.floor(Math.random() * 2147483647);
      const taskType = presetTaskId ? 'project' : 'personal';
      const success = await startTimer(taskId, title, taskType, { autoStopOthers });
      if (success) {
        notification.success({ message: '计时器已启动', description: `开始计时: ${title}` });
        if (onTimerStart) {
          onTimerStart({ title, category: selectedCategory, estimated_minutes: estimatedMinutes, tags: selectedTags });
        }
        setShowQuickStart(false);
      }
    } catch (error) {
      notification.error({ message: '启动失败', description: error instanceof Error ? error.message : '计时器启动失败' });
    }
  }, [quickTitle, selectedTemplate, presetTaskId, selectedCategory, estimatedMinutes, selectedTags, templates, startTimer, onTimerStart]);

  const handlePause = useCallback(async () => {
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
  }, [pauseTimer]);

  const handleResume = useCallback(async () => {
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
  }, [resumeTimer]);

  const handleStop = useCallback(() => {
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
            onTimerStop({ success: result, duration: elapsedSeconds });
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
  }, [stopTimer, elapsedSeconds, onTimerStop]);

  // 键盘快捷键配置 - 现在可以安全引用处理函数
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
        getRecentTasks(5, 0) // 初始加载5条
      ]);
      
      setSuggestions(suggestionsData);
      setTemplates(templatesData);
      setRecentTasks(recentData.tasks);
      setHasMoreTasks(recentData.hasMore);
    } catch (error) {
      console.error('加载初始数据失败:', error);
      notification.error({
        message: '数据加载失败',
        description: '无法加载计时器数据，请刷新页面重试'
      });
    }
  };

  const loadMoreTasks = async () => {
    if (loadingMoreTasks || !hasMoreTasks) return;
    
    setLoadingMoreTasks(true);
    try {
      const moreData = await getRecentTasks(5, recentTasks.length);
      setRecentTasks(prev => [...prev, ...moreData.tasks]);
      setHasMoreTasks(moreData.hasMore);
    } catch (error) {
      console.error('加载更多任务失败:', error);
      notification.error({
        message: '加载失败',
        description: '无法加载更多任务，请重试'
      });
    } finally {
      setLoadingMoreTasks(false);
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
      {(!isRunning && !isPaused) ? (
        <Dropdown
          menu={{
            items: [
              { key: 'start-default', label: '并行启动新计时器（遵循默认设置）' },
              { key: 'start-parallel', label: '并行启动新计时器（不停止其他）' },
              { key: 'start-stop-others', label: '启动并自动停止其他计时器' },
            ],
            onClick: ({ key }) => {
              if (key === 'start-default') return handleStart();
              if (key === 'start-parallel') return handleStartWithOption(false);
              if (key === 'start-stop-others') return handleStartWithOption(true);
            }
          }}
        >
          <Button
            type="primary"
            size={size === 'compact' ? 'middle' : 'large'}
            icon={<PlayCircleOutlined />}
          >
            开始
          </Button>
        </Dropdown>
      ) : (
        <Button
          type="primary"
          size={size === 'compact' ? 'middle' : 'large'}
          icon={isRunning && !isPaused ? <PauseOutlined /> : <PlayCircleOutlined />}
          onClick={handlePlayPause}
        >
          {isRunning && !isPaused ? '暂停' : '恢复'}
        </Button>
      )}
      
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

  const renderTimerDisplay = () => {
    // 获取任务详情页链接
    const getTaskLink = () => {
      if (!currentTimer) return null;
      
      // 如果是个人任务(没有 project_id 或 task_id 是临时ID)，不生成链接
      if (!timerState.taskId || timerState.taskId > 2000000) {
        return null;
      }
      
      // 项目任务链接到详情页
      return `/projects/1/tasks/${timerState.taskId}`;
    };

    const taskLink = getTaskLink();

    return (
      <div className="timer-display" style={{ textAlign: 'center', margin: '16px 0' }}>
        {/* 日期显示 - 小字体 */}
        <div style={{ marginBottom: 8 }}>
          <Text 
            type="secondary" 
            style={{ 
              fontSize: '12px', 
              color: '#8c8c8c',
              fontWeight: 400
            }}
          >
            {formatCurrentDate()}
          </Text>
        </div>
        
        {/* 时间显示 - 大字体 小时:分钟:秒 */}
        <Badge status={isRunning ? 'processing' : 'default'} color={getTimerStatusColor()}>
          <Title 
            level={size === 'compact' ? 4 : 1} 
            style={{ 
              margin: 0, 
              fontFamily: 'monospace, "SF Mono", "Monaco", "Inconsolata", "Fira Code", "Fira Mono", "Droid Sans Mono", "Consolas", "Liberation Mono", "Menlo", "Courier", monospace',
              fontSize: size === 'compact' ? '24px' : '36px',
              fontWeight: 600,
              letterSpacing: '2px'
            }}
          >
            {formatDuration(elapsedSeconds)}
          </Title>
        </Badge>
        
        {/* 当前计时任务显示 - 带链接 */}
        {currentTimer && (
          <div style={{ marginTop: 12 }}>
            {taskLink ? (
              <a 
                href={taskLink} 
                style={{ 
                  color: '#1890ff',
                  textDecoration: 'none',
                  fontSize: '16px',
                  fontWeight: 500
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textDecoration = 'none';
                }}
              >
                📋 {currentTimer.target_title}
              </a>
            ) : (
              <Text 
                style={{ 
                  fontSize: '16px', 
                  fontWeight: 500,
                  color: '#595959'
                }}
              >
                👤 {currentTimer.target_title}
              </Text>
            )}
            
            {currentTimer.category && (
              <Tag color="blue" style={{ marginLeft: 8, marginTop: 4 }}>
                {currentTimer.category}
              </Tag>
            )}
          </div>
        )}
        
        {/* 进度条 */}
        {estimatedMinutes > 0 && (
          <Progress
            percent={getProgressPercentage()}
            showInfo={false}
            strokeColor={getTimerStatusColor()}
            style={{ marginTop: 16 }}
          />
        )}
      </div>
    );
  };

  const renderSuggestions = () => {
    if (!showSuggestions) return null;

    // 如果没有真实建议，显示一些模拟的快速开始选项
    const mockSuggestions = suggestions.length > 0 ? suggestions : [
      { title: '🚀 继续昨天的工作', category: '工作', estimated_minutes: 25, tags: ['开发'] },
      { title: '📖 学习新技术', category: '学习', estimated_minutes: 30, tags: ['学习'] },
      { title: '💼 开会准备', category: '会议', estimated_minutes: 15, tags: ['准备'] },
      { title: '🔧 代码重构', category: '开发', estimated_minutes: 45, tags: ['重构'] }
    ];

    return (
      <div className="timer-suggestions" style={{ marginTop: 16 }}>
        <Text strong style={{ fontSize: '14px', color: '#595959' }}>
          <BulbOutlined style={{ color: '#faad14' }} /> 💡 快速开始
        </Text>
        <div style={{ 
          marginTop: 12,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px'
        }}>
          {mockSuggestions.slice(0, 4).map((suggestion, index) => (
            <Button
              key={index}
              size="small"
              style={{ 
                height: 'auto',
                padding: '8px 12px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start'
              }}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <span style={{ fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {suggestion.title}
              </span>
            </Button>
          ))}
        </div>
      </div>
    );
  };

  const renderRecentTasks = () => {
    if (!showHistory) return null;

    return (
      <div className="timer-recent" style={{ marginTop: 24 }}>
        <Text strong style={{ fontSize: '14px', color: '#595959' }}>
          <HistoryOutlined style={{ color: '#52c41a' }} /> 📚 最近任务
        </Text>
        <div style={{ marginTop: 12 }}>
          {recentTasks.map((task, index) => {
            // 获取任务链接
            const getTaskDetailLink = () => {
              if (task.target_type === 'project_task' && task.task_id) {
                return `/projects/1/tasks/${task.task_id}`;
              }
              return null;
            };

            const taskDetailLink = getTaskDetailLink();

            return (
              <div
                key={`${task.task_id || 'temp'}-${index}`}
                style={{
                  padding: '12px',
                  borderRadius: 8,
                  background: '#fafafa',
                  border: '1px solid #f0f0f0',
                  marginBottom: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => {
                  setQuickTitle(task.task_title);
                  setSelectedCategory(task.category || defaultCategory);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f0f0f0';
                  e.currentTarget.style.borderColor = '#d9d9d9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#fafafa';
                  e.currentTarget.style.borderColor = '#f0f0f0';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <div style={{ marginRight: 8 }}>
                      {task.target_type === 'project_task' ? 
                        <ProjectOutlined style={{ color: '#1890ff' }} /> : 
                        <UserOutlined style={{ color: '#52c41a' }} />
                      }
                    </div>
                    <div style={{ flex: 1 }}>
                      {taskDetailLink ? (
                        <a 
                          href={taskDetailLink}
                          onClick={(e) => e.stopPropagation()}
                          style={{ 
                            color: '#1890ff',
                            textDecoration: 'none',
                            fontSize: 13,
                            fontWeight: 500
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.textDecoration = 'underline';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.textDecoration = 'none';
                          }}
                        >
                          {task.task_title}
                        </a>
                      ) : (
                        <Text style={{ fontSize: 13, fontWeight: 500 }}>{task.task_title}</Text>
                      )}
<div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                        📁 {task.project_name || (task.target_type === 'project_task' ? '项目' : '个人计时')}
                        {` • ${task.start_time ? dayjs(task.start_time).format('YYYY-MM-DD HH:mm') : (task.last_timed_at ? dayjs(task.last_timed_at).format('YYYY-MM-DD HH:mm') : '-')}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 12, fontWeight: 500, color: '#262626' }}>
                      {formatDuration(task.total_seconds)}
                    </Text>
                    <Button 
                      type="text" 
                      size="small" 
                      style={{ fontSize: 10, height: 'auto', padding: '2px 4px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // 重新开始这个任务的计时
                        if (task.target_type === 'project_task' && task.task_id) {
                          handleStart();
                        } else {
                          handleStart();
                        }
                      }}
                    >
                      🔄 重新开始
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* 显示更多按钮 */}
          {hasMoreTasks && (
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <Button 
                type="link" 
                size="small"
                loading={loadingMoreTasks}
                onClick={loadMoreTasks}
                style={{ fontSize: 12 }}
              >
                {loadingMoreTasks ? '加载中...' : '显示更多'}
              </Button>
            </div>
          )}
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
              <Text style={{ 
                fontFamily: 'monospace, "SF Mono", "Monaco", "Inconsolata", "Fira Code", "Fira Mono", "Droid Sans Mono", "Consolas", "Liberation Mono", "Menlo", "Courier", monospace',
                fontSize: '14px',
                fontWeight: 600,
                letterSpacing: '1px'
              }}>
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

  // 活动计时列表渲染（并行计时）
  const renderActiveTimers = () => {
    const hasActive = !!activeTimers && activeTimers.length > 0;

    const calcElapsed = (t: any) => {
      try {
        const start = new Date(t.start_time).getTime();
        const now = Date.now();
        const pause = t.pause_total_seconds || 0;
        const raw = Math.max(0, Math.floor((now - start) / 1000) - pause);
        return formatDuration(raw);
      } catch {
        return '00:00:00';
      }
    };

    const formatStart = (t: any) => {
      try {
        return t.start_time ? dayjs(t.start_time).format('YYYY-MM-DD HH:mm') : '';
      } catch {
        return '';
      }
    };

    return (
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text strong style={{ fontSize: '14px', color: '#595959' }}>
            ⏱️ 活动计时（{activeTimers.length}）
          </Text>
          <Space size="small">
            <Button size="small" disabled={!hasActive} onClick={pauseAll}>全部暂停</Button>
            <Button size="small" type="primary" disabled={!hasActive} onClick={resumeAll}>全部继续</Button>
            <Button size="small" danger disabled={!hasActive} onClick={stopAll}>全部完成</Button>
            <Button type="link" size="small" onClick={refreshActiveTimers} style={{ fontSize: 12 }}>刷新</Button>
          </Space>
        </div>
        {!hasActive ? (
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>无活动计时器（请尝试并行启动）</Text>
          </div>
        ) : (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeTimers.map((t) => {
              const startText = formatStart(t);
              const elapsedText = calcElapsed(t);
              const projectId = (t as any).project_id;
              const taskId = (t as any).target_id;
              const linkable = projectId && taskId;

              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Badge color={t.status === 'running' ? '#52c41a' : '#faad14'} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {linkable ? (
                        <a
                          href={`/projects/${projectId}/tasks/${taskId}`}
                          onClick={(e) => { e.preventDefault(); window.location.href = `/projects/${projectId}/tasks/${taskId}`; }}
                          style={{ color: '#1890ff', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}
                          onMouseEnter={() => setHoveredTimerId(t.id)}
                          onMouseLeave={() => setHoveredTimerId(null)}
                        >
                          {taskId ? `#${taskId} ` : ''}{t.target_title}
                        </a>
                      ) : (
                        <span
                          style={{ fontSize: 13, fontWeight: 500, color: '#262626' }}
                          onMouseEnter={() => setHoveredTimerId(t.id)}
                          onMouseLeave={() => setHoveredTimerId(null)}
                        >
                          {taskId ? `#${taskId} ` : ''}{t.target_title}
                        </span>
                      )}
                      {/* 悬停时显示图标操作 */}
                      <span
                        onMouseEnter={() => setHoveredTimerId(t.id)}
                        onMouseLeave={() => setHoveredTimerId(null)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        {hoveredTimerId === t.id && (
                          <>
                            <Tooltip title={t.status === 'running' ? '暂停' : '继续'}>
                              <Button
                                size="small"
                                type={t.status === 'running' ? 'default' : 'primary'}
                                icon={t.status === 'running' ? <PauseOutlined /> : <PlayCircleOutlined />}
                                onClick={() => (t.status === 'running' ? pauseTimerById(t.id) : resumeTimerById(t.id))}
                              />
                            </Tooltip>
                            <Tooltip title="完成">
                              <Button size="small" danger icon={<StopOutlined />} onClick={() => stopTimerById(t.id)} />
                            </Tooltip>
                          </>
                        )}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                      {startText && <span style={{ marginRight: 6 }}>{startText}</span>}已用时 {elapsedText}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={widgetRef} className={cardClass}>
      {embedded ? (
        // Dashboard嵌入模式：不使用Card包装，直接渲染内容
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ 
            marginBottom: '24px',
            borderBottom: '1px solid #e8e8e8',
            paddingBottom: '16px'
          }}>
            <Space>
              <ClockCircleOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
              <Title level={3} style={{ margin: 0, color: '#262626' }}>
                🎯 统一计时器
              </Title>
              {currentTimer && (
                <Tag color={isRunning ? 'green' : 'default'}>
                  {isPaused ? '已暂停' : isRunning ? '运行中' : '已停止'}
                </Tag>
              )}
            </Space>
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {renderTimerDisplay()}
            {renderMainControls()}
            {renderActiveTimers()}
            {renderSuggestions()}
            {renderRecentTasks()}
          </div>
          {renderQuickStartModal()}
        </div>
      ) : (
        // 独立模式：使用Card包装
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
          extra={cardExtra}
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
          {renderActiveTimers()}
          {!isFullscreen && renderSuggestions()}
          {!isFullscreen && renderRecentTasks()}
          {renderQuickStartModal()}
        </Card>
      )}
    </div>
  );
};

export default UniversalTimerWidget;