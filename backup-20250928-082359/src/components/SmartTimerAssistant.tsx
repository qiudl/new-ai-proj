import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Card, 
  Switch, 
  Slider, 
  Select, 
  Form, 
  Space, 
  Typography, 
  Alert, 
  Button,
  List,
  Tag,
  Modal,
  InputNumber,
  TimePicker,
  Checkbox,
  message,
  Tooltip,
  Progress
} from 'antd';
import { 
  RobotOutlined, 
  BulbOutlined, 
  ClockCircleOutlined,
  NotificationOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  HeartOutlined,
  EyeOutlined,
  TrophyOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import TimerService from '../services/timerService';
import NotificationService from '../services/notificationService';

const { Title, Text } = Typography;
const { Option } = Select;

interface SmartSettings {
  autoBreakReminder: boolean;
  focusTimeOptimization: boolean;
  productivityAnalysis: boolean;
  adaptiveNotifications: boolean;
  healthReminders: boolean;
  goalTracking: boolean;
  
  // Timing settings
  optimalWorkDuration: number; // minutes
  maxContinuousWork: number; // minutes
  preferredBreakDuration: number; // minutes
  dailyGoal: number; // minutes
  
  // Notification settings
  reminderInterval: number; // minutes
  quietHours: [Dayjs, Dayjs] | null;
  weekendMode: boolean;
  
  // Health settings
  blinkReminder: boolean;
  postureReminder: boolean;
  hydrationReminder: boolean;
  reminderFrequency: number; // minutes
}

interface ProductivityInsight {
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  description: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: Date;
}

interface SmartTimerAssistantProps {
  currentTimerState?: {
    isRunning: boolean;
    elapsedSeconds: number;
    taskTitle?: string;
  };
  onSettingsChange?: (settings: SmartSettings) => void;
}

const SmartTimerAssistant: React.FC<SmartTimerAssistantProps> = ({ 
  currentTimerState, 
  onSettingsChange 
}) => {
  // MEMORY OPTIMIZATION: Use refs for timers and mounted state
  const analysisTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  
  const [settings, setSettings] = useState<SmartSettings>({
    autoBreakReminder: true,
    focusTimeOptimization: true,
    productivityAnalysis: true,
    adaptiveNotifications: true,
    healthReminders: true,
    goalTracking: true,
    
    optimalWorkDuration: 25,
    maxContinuousWork: 90,
    preferredBreakDuration: 5,
    dailyGoal: 240, // 4 hours
    
    reminderInterval: 20,
    quietHours: null,
    weekendMode: false,
    
    blinkReminder: true,
    postureReminder: true,
    hydrationReminder: true,
    reminderFrequency: 30
  });

  const [insights, setInsights] = useState<ProductivityInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [dailyProgress, setDailyProgress] = useState(0);
  const [weeklyStreak, setWeeklyStreak] = useState(0);

  // Load settings from localStorage
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('smartTimerSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        // Convert quiet hours back to dayjs objects
        if (parsed.quietHours) {
          parsed.quietHours = [dayjs(parsed.quietHours[0]), dayjs(parsed.quietHours[1])];
        }
        setSettings({ ...settings, ...parsed });
      }
    } catch (error) {
      console.warn('Failed to load smart timer settings:', error);
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback((newSettings: SmartSettings) => {
    try {
      // Convert dayjs objects to strings for storage
      const settingsToSave = {
        ...newSettings,
        quietHours: newSettings.quietHours ? 
          [newSettings.quietHours[0].toISOString(), newSettings.quietHours[1].toISOString()] : 
          null
      };
      
      localStorage.setItem('smartTimerSettings', JSON.stringify(settingsToSave));
      setSettings(newSettings);
      
      if (onSettingsChange) {
        onSettingsChange(newSettings);
      }
    } catch (error) {
      console.warn('Failed to save smart timer settings:', error);
    }
  }, [onSettingsChange]);

  // Analyze current timer session and generate insights
  const analyzeProductivity = useCallback(async () => {
    if (!settings.productivityAnalysis || !currentTimerState) return;

    setIsAnalyzing(true);
    
    try {
      const newInsights: ProductivityInsight[] = [];
      const { isRunning, elapsedSeconds, taskTitle } = currentTimerState;
      const elapsedMinutes = elapsedSeconds / 60;

      // Check for optimal work duration
      if (isRunning && elapsedMinutes > settings.optimalWorkDuration * 1.5) {
        newInsights.push({
          type: 'warning',
          title: '建议休息',
          description: `您已连续工作 ${Math.round(elapsedMinutes)} 分钟`,
          suggestion: '建议进行短暂休息以保持高效率',
          priority: 'high',
          timestamp: new Date()
        });
      }

      // Check for excessive continuous work
      if (isRunning && elapsedMinutes > settings.maxContinuousWork) {
        newInsights.push({
          type: 'error',
          title: '工作时间过长',
          description: `连续工作已超过 ${settings.maxContinuousWork} 分钟`,
          suggestion: '强烈建议立即休息，避免疲劳工作',
          priority: 'high',
          timestamp: new Date()
        });
      }

      // Productivity pattern analysis
      const currentHour = new Date().getHours();
      if (isRunning && (currentHour >= 14 && currentHour <= 16)) {
        newInsights.push({
          type: 'info',
          title: '下午效率期',
          description: '当前时段通常是效率较高的时间',
          suggestion: '建议处理重要任务',
          priority: 'medium',
          timestamp: new Date()
        });
      }

      // Goal tracking insight
      if (settings.goalTracking && dailyProgress < 50 && currentHour > 15) {
        newInsights.push({
          type: 'warning',
          title: '目标进度提醒',
          description: `今日完成度 ${dailyProgress}%，距离目标还有差距`,
          suggestion: '建议调整计划以确保完成今日目标',
          priority: 'medium',
          timestamp: new Date()
        });
      }

      setInsights(prev => [...newInsights, ...prev.slice(0, 4)]); // Keep only recent 5 insights
    } catch (error) {
      console.error('Failed to analyze productivity:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [settings, currentTimerState, dailyProgress]);

  // Smart break reminder
  const checkBreakReminder = useCallback(() => {
    if (!settings.autoBreakReminder || !currentTimerState?.isRunning) return;

    const elapsedMinutes = currentTimerState.elapsedSeconds / 60;
    
    if (elapsedMinutes > 0 && elapsedMinutes % settings.reminderInterval === 0) {
      NotificationService.notifyMilestone(
        '休息提醒',
        `已连续工作 ${Math.round(elapsedMinutes)} 分钟，建议适当休息`,
        Math.round(elapsedMinutes)
      );
    }
  }, [settings, currentTimerState]);

  // Health reminders
  const triggerHealthReminders = useCallback(() => {
    if (!settings.healthReminders) return;

    const now = new Date();
    const minutes = now.getMinutes();

    // Check reminder frequency
    if (minutes % settings.reminderFrequency !== 0) return;

    // Check quiet hours
    if (settings.quietHours) {
      const currentTime = dayjs(now);
      const [startQuiet, endQuiet] = settings.quietHours;
      
      if (currentTime.isAfter(startQuiet) && currentTime.isBefore(endQuiet)) {
        return; // In quiet hours
      }
    }

    // Weekend mode check
    if (settings.weekendMode && (now.getDay() === 0 || now.getDay() === 6)) {
      return;
    }

    const reminders: string[] = [];
    
    if (settings.blinkReminder) {
      reminders.push('记得眨眼和远眺，保护视力');
    }
    
    if (settings.postureReminder) {
      reminders.push('检查坐姿，保持脊椎挺直');
    }
    
    if (settings.hydrationReminder) {
      reminders.push('记得补充水分');
    }

    if (reminders.length > 0) {
      const randomReminder = reminders[Math.floor(Math.random() * reminders.length)];
      NotificationService.showNotification({
        title: '健康提醒',
        body: randomReminder,
        tag: 'health-reminder'
      });
    }
  }, [settings]);

  // MEMORY OPTIMIZATION: Stop analysis timer
  const stopAnalysisTimer = useCallback(() => {
    if (analysisTimerRef.current) {
      clearInterval(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }
  }, []);

  // Run analysis and checks periodically with proper cleanup
  useEffect(() => {
    // Start analysis timer with memory optimization
    analysisTimerRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      
      analyzeProductivity();
      checkBreakReminder();
      triggerHealthReminders();
    }, 60000); // Every minute

    return () => {
      stopAnalysisTimer();
    };
  }, [analyzeProductivity, checkBreakReminder, triggerHealthReminders, stopAnalysisTimer]);

  // Calculate daily progress (mock implementation) with memory optimization
  useEffect(() => {
    const calculateProgress = () => {
      if (!isMountedRef.current) return;
      
      // In real implementation, this would fetch actual data
      const mockProgress = Math.min(100, (currentTimerState?.elapsedSeconds || 0) / (settings.dailyGoal * 60) * 100);
      setDailyProgress(Math.round(mockProgress));
    };

    calculateProgress();
  }, [currentTimerState, settings.dailyGoal]);

  // CRITICAL: Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopAnalysisTimer();
    };
  }, [stopAnalysisTimer]);

  const handleSettingChange = (key: keyof SmartSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  return (
    <Card
      title={
        <Space>
          <RobotOutlined />
          <span>智能助手</span>
          <Tag color="processing">AI</Tag>
        </Space>
      }
      extra={
        <Button
          type="text"
          icon={<SettingOutlined />}
          onClick={() => setShowSettings(true)}
        />
      }
      
    >
      {/* Goal Progress */}
      {settings.goalTracking && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <Text strong>今日目标进度</Text>
            <Text>{dailyProgress}%</Text>
          </div>
          <Progress 
            percent={dailyProgress} 
            strokeColor={{
              '0%': '#ff4d4f',
              '50%': '#faad14',
              '100%': '#52c41a',
            }}
            
          />
          {weeklyStreak > 0 && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              连续达标 {weeklyStreak} 天 🔥
            </Text>
          )}
        </div>
      )}

      {/* Smart Insights */}
      {insights.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <Title level={5} style={{ marginBottom: '8px' }}>
            <BulbOutlined /> 智能建议
          </Title>
          <List
            
            dataSource={insights.slice(0, 3)}
            renderItem={(insight) => (
              <List.Item style={{ padding: '8px 0' }}>
                <Alert
                  message={insight.title}
                  description={insight.suggestion}
                  type={insight.type}
                  showIcon
                  style={{ width: '100%' }}
                  action={
                    <Tag color={insight.priority === 'high' ? 'red' : insight.priority === 'medium' ? 'orange' : 'blue'}>
                      {insight.priority === 'high' ? '重要' : insight.priority === 'medium' ? '中等' : '一般'}
                    </Tag>
                  }
                />
              </List.Item>
            )}
          />
        </div>
      )}

      {/* Quick Controls */}
      <Space wrap style={{ width: '100%' }}>
        <Tooltip title="自动休息提醒">
          <Switch
            checkedChildren={<ClockCircleOutlined />}
            unCheckedChildren={<ClockCircleOutlined />}
            checked={settings.autoBreakReminder}
            onChange={(checked) => handleSettingChange('autoBreakReminder', checked)}
            
          />
        </Tooltip>
        
        <Tooltip title="健康提醒">
          <Switch
            checkedChildren={<HeartOutlined />}
            unCheckedChildren={<HeartOutlined />}
            checked={settings.healthReminders}
            onChange={(checked) => handleSettingChange('healthReminders', checked)}
            
          />
        </Tooltip>
        
        <Tooltip title="目标追踪">
          <Switch
            checkedChildren={<TrophyOutlined />}
            unCheckedChildren={<TrophyOutlined />}
            checked={settings.goalTracking}
            onChange={(checked) => handleSettingChange('goalTracking', checked)}
            
          />
        </Tooltip>
        
        <Tooltip title="生产力分析">
          <Switch
            checkedChildren={<ThunderboltOutlined />}
            unCheckedChildren={<ThunderboltOutlined />}
            checked={settings.productivityAnalysis}
            onChange={(checked) => handleSettingChange('productivityAnalysis', checked)}
            
          />
        </Tooltip>
      </Space>

      {/* Settings Modal */}
      <Modal
        title="智能助手设置"
        open={showSettings}
        onCancel={() => setShowSettings(false)}
        footer={null}
        width={600}
      >
        <Form layout="vertical">
          <Title level={5}>功能开关</Title>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Checkbox
              checked={settings.focusTimeOptimization}
              onChange={(e) => handleSettingChange('focusTimeOptimization', e.target.checked)}
            >
              专注时间优化
            </Checkbox>
            <Checkbox
              checked={settings.adaptiveNotifications}
              onChange={(e) => handleSettingChange('adaptiveNotifications', e.target.checked)}
            >
              自适应通知
            </Checkbox>
          </Space>

          <Title level={5} style={{ marginTop: '24px' }}>工作设置</Title>
          <Form.Item label="最佳工作时长（分钟）">
            <Slider
              min={15}
              max={60}
              value={settings.optimalWorkDuration}
              onChange={(value) => handleSettingChange('optimalWorkDuration', value)}
              marks={{
                15: '15',
                25: '25',
                45: '45',
                60: '60'
              }}
            />
          </Form.Item>

          <Form.Item label="每日目标（小时）">
            <InputNumber
              min={1}
              max={12}
              value={settings.dailyGoal / 60}
              onChange={(value) => handleSettingChange('dailyGoal', (value || 4) * 60)}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Title level={5} style={{ marginTop: '24px' }}>通知设置</Title>
          <Form.Item label="免打扰时间">
            <TimePicker.RangePicker
              value={settings.quietHours}
              onChange={(times) => handleSettingChange('quietHours', times)}
              format="HH:mm"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item label="周末模式">
            <Switch
              checked={settings.weekendMode}
              onChange={(checked) => handleSettingChange('weekendMode', checked)}
            />
            <Text type="secondary" style={{ marginLeft: '8px' }}>
              周末时暂停大部分提醒
            </Text>
          </Form.Item>

          <Title level={5} style={{ marginTop: '24px' }}>健康提醒</Title>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Checkbox
              checked={settings.blinkReminder}
              onChange={(e) => handleSettingChange('blinkReminder', e.target.checked)}
            >
              <EyeOutlined /> 视力保护提醒
            </Checkbox>
            <Checkbox
              checked={settings.postureReminder}
              onChange={(e) => handleSettingChange('postureReminder', e.target.checked)}
            >
              姿势提醒
            </Checkbox>
            <Checkbox
              checked={settings.hydrationReminder}
              onChange={(e) => handleSettingChange('hydrationReminder', e.target.checked)}
            >
              饮水提醒
            </Checkbox>
          </Space>

          <Form.Item label="健康提醒频率（分钟）" style={{ marginTop: '16px' }}>
            <Select
              value={settings.reminderFrequency}
              onChange={(value) => handleSettingChange('reminderFrequency', value)}
              style={{ width: '100%' }}
            >
              <Option value={15}>15分钟</Option>
              <Option value={30}>30分钟</Option>
              <Option value={45}>45分钟</Option>
              <Option value={60}>60分钟</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default SmartTimerAssistant;