import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Card, 
  Space, 
  Typography, 
  Button, 
  Badge, 
  Alert, 
  Tooltip,
  Switch,
  notification,
  Tag,
  Divider
} from 'antd';
import {
  WifiOutlined,
  DisconnectOutlined,
  ReloadOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  SoundOutlined,
  BellOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { TaskTimelineEvent } from '../../types/timeline';
import { TimelineWebSocketManager } from '../../utils/WebSocketManager';
import EnhancedTaskTimelineV2 from './EnhancedTaskTimelineV2';
import { TimelinePerformanceUtils } from '../../utils/TimelinePerformanceUtils';

const { Text, Title } = Typography;

interface RealTimeTimelineProps {
  taskId?: number;
  websocketUrl?: string;
  initialEvents?: TaskTimelineEvent[];
  enableSound?: boolean;
  enableNotifications?: boolean;
  maxEvents?: number;
  autoScroll?: boolean;
  onNewEvent?: (event: TaskTimelineEvent) => void;
}

interface ConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastConnected?: Date;
  reconnectAttempts?: number;
}

const RealTimeTimeline: React.FC<RealTimeTimelineProps> = ({
  taskId,
  websocketUrl = process.env.REACT_APP_WEBSOCKET_URL || `ws:///ws/timeline`,
  initialEvents = [],
  enableSound = true,
  enableNotifications = false,
  maxEvents = 1000,
  autoScroll = true,
  onNewEvent
}) => {
  const [events, setEvents] = useState<TaskTimelineEvent[]>(initialEvents);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ status: 'disconnected' });
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(enableSound);
  const [notificationsEnabled, setNotificationsEnabled] = useState(enableNotifications);
  const [newEventCount, setNewEventCount] = useState(0);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(autoScroll);
  
  // WebSocket管理器引用
  const wsManagerRef = useRef<TimelineWebSocketManager | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const lastEventTimeRef = useRef<Date>(new Date());
  
  // 音频通知
  const audioContextRef = useRef<AudioContext | null>(null);

  // 防抖的事件更新函数
  const debouncedUpdateEvents = useMemo(
    () => TimelinePerformanceUtils.debounce((newEvents: TaskTimelineEvent[]) => {
      setEvents(prevEvents => {
        const combinedEvents = [...newEvents, ...prevEvents];
        // 限制最大事件数量
        const limitedEvents = combinedEvents.slice(0, maxEvents);
        return limitedEvents;
      });
    }, 200),
    [maxEvents]
  );

  // 播放通知音效
  const playNotificationSound = useCallback(async (type: 'new' | 'update' | 'error' = 'new') => {
    if (!soundEnabled) return;
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // 不同类型的事件使用不同的音调
      const frequencies = {
        new: [800, 1000],
        update: [600, 800], 
        error: [400, 200]
      };
      
      const [freq1, freq2] = frequencies[type];
      
      oscillator.frequency.setValueAtTime(freq1, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(freq2, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.error('播放通知音效失败:', error);
    }
  }, [soundEnabled]);

  // 显示桌面通知
  const showDesktopNotification = useCallback((event: TaskTimelineEvent) => {
    if (!notificationsEnabled) return;
    
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('时间线新事件', {
        body: `${event.event_type}: ${event.description}`,
        icon: '/favicon.ico',
        tag: `timeline-${event.id}`,
        requireInteraction: false
      });
      
      setTimeout(() => notification.close(), 5000);
    }
  }, [notificationsEnabled]);

  // 自动滚动到顶部
  const scrollToTop = useCallback(() => {
    if (isAutoScrollEnabled && timelineRef.current) {
      timelineRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isAutoScrollEnabled]);

  // 初始化WebSocket连接
  useEffect(() => {
    const wsManager = new TimelineWebSocketManager(websocketUrl, taskId);
    wsManagerRef.current = wsManager;

    // 设置连接状态处理器
    wsManager.setConnectionStatusHandler((status) => {
      setConnectionStatus(prev => ({
        ...prev,
        status,
        lastConnected: status === 'connected' ? new Date() : prev.lastConnected,
        reconnectAttempts: wsManager.getStats().reconnectAttempts
      }));
    });

    // 设置事件处理器
    wsManager.setEventHandlers({
      onNewEvent: (event: TaskTimelineEvent) => {
        if (isPaused) return;
        
        console.log('收到新事件:', event);
        
        // 更新新事件计数
        setNewEventCount(prev => prev + 1);
        
        // 更新事件列表
        debouncedUpdateEvents([event]);
        
        // 播放通知音效
        playNotificationSound('new');
        
        // 显示桌面通知
        showDesktopNotification(event);
        
        // 自动滚动
        setTimeout(scrollToTop, 100);
        
        // 调用外部回调
        onNewEvent?.(event);
        
        lastEventTimeRef.current = new Date();
      },
      
      onEventUpdated: (event: TaskTimelineEvent) => {
        if (isPaused) return;
        
        console.log('事件已更新:', event);
        
        setEvents(prevEvents => 
          prevEvents.map(e => e.id === event.id ? event : e)
        );
        
        playNotificationSound('update');
      },
      
      onEventDeleted: (eventId: number) => {
        if (isPaused) return;
        
        console.log('事件已删除:', eventId);
        
        setEvents(prevEvents => 
          prevEvents.filter(e => e.id !== eventId)
        );
      },
      
      onBulkUpdate: (newEvents: TaskTimelineEvent[]) => {
        if (isPaused) return;
        
        console.log('批量更新:', newEvents.length, '个事件');
        
        setNewEventCount(prev => prev + newEvents.length);
        debouncedUpdateEvents(newEvents);
        
        // 批量更新只播放一次音效
        playNotificationSound('new');
        setTimeout(scrollToTop, 100);
        
        lastEventTimeRef.current = new Date();
      }
    });

    // 建立连接
    wsManager.connect().catch(error => {
      console.error('WebSocket连接失败:', error);
      notification.error({
        message: 'WebSocket连接失败',
        description: '无法建立实时连接，请检查网络或稍后重试',
        duration: 5
      });
    });

    return () => {
      wsManager.disconnect();
    };
  }, [websocketUrl, taskId, isPaused, debouncedUpdateEvents, playNotificationSound, showDesktopNotification, scrollToTop, onNewEvent]);

  // 请求通知权限
  useEffect(() => {
    if (notificationsEnabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [notificationsEnabled]);

  // 手动刷新
  const handleRefresh = useCallback(() => {
    wsManagerRef.current?.requestRefresh(taskId);
    setNewEventCount(0);
  }, [taskId]);

  // 重新连接
  const handleReconnect = useCallback(() => {
    if (wsManagerRef.current) {
      wsManagerRef.current.disconnect();
      setTimeout(() => {
        wsManagerRef.current?.connect();
      }, 1000);
    }
  }, []);

  // 清空新事件计数
  const handleClearNotifications = useCallback(() => {
    setNewEventCount(0);
  }, []);

  // 获取连接状态样式
  const getConnectionStatusConfig = useMemo(() => {
    switch (connectionStatus.status) {
      case 'connecting':
        return { color: 'orange', icon: <WifiOutlined spin />, text: '连接中...' };
      case 'connected':
        return { color: 'green', icon: <WifiOutlined />, text: '已连接' };
      case 'disconnected':
        return { color: 'default', icon: <DisconnectOutlined />, text: '未连接' };
      case 'error':
        return { color: 'red', icon: <DisconnectOutlined />, text: '连接错误' };
      default:
        return { color: 'default', icon: <DisconnectOutlined />, text: '未知状态' };
    }
  }, [connectionStatus.status]);

  // 计算连接统计
  const connectionStats = useMemo(() => {
    const stats = wsManagerRef.current?.getStats();
    const timeSinceLastEvent = lastEventTimeRef.current ? 
      Date.now() - lastEventTimeRef.current.getTime() : 0;
    
    return {
      ...stats,
      timeSinceLastEvent: Math.floor(timeSinceLastEvent / 1000), // 秒
      totalEvents: events.length
    };
  }, [connectionStatus, events.length]);

  return (
    <div ref={timelineRef}>
      {/* 连接状态和控制面板 */}
      <Card  style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Badge 
              status={getConnectionStatusConfig.color as any} 
              text={
                <Space size={4}>
                  {getConnectionStatusConfig.icon}
                  <Text strong>{getConnectionStatusConfig.text}</Text>
                </Space>
              }
            />
            
            {newEventCount > 0 && (
              <Badge count={newEventCount} style={{ backgroundColor: '#52c41a' }}>
                <Button 
                   
                  icon={<BellOutlined />}
                  onClick={handleClearNotifications}
                >
                  新事件
                </Button>
              </Badge>
            )}
            
            <Tag color="blue">
              {events.length}/{maxEvents} 事件
            </Tag>
          </Space>
          
          <Space>
            <Tooltip title={isPaused ? '恢复接收事件' : '暂停接收事件'}>
              <Button
                
                type={isPaused ? 'primary' : 'default'}
                icon={isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                onClick={() => setIsPaused(!isPaused)}
              >
                {isPaused ? '恢复' : '暂停'}
              </Button>
            </Tooltip>
            
            <Tooltip title="手动刷新">
              <Button
                
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                disabled={connectionStatus.status !== 'connected'}
              />
            </Tooltip>
            
            <Tooltip title="重新连接">
              <Button
                
                icon={<ThunderboltOutlined />}
                onClick={handleReconnect}
                disabled={connectionStatus.status === 'connected'}
              />
            </Tooltip>
          </Space>
        </div>
        
        <Divider style={{ margin: '8px 0' }} />
        
        {/* 设置选项 */}
        <Space wrap>
          <Space size={4}>
            <SoundOutlined />
            <Text style={{ fontSize: 12 }}>音效:</Text>
            <Switch 
              
              checked={soundEnabled} 
              onChange={setSoundEnabled} 
            />
          </Space>
          
          <Space size={4}>
            <BellOutlined />
            <Text style={{ fontSize: 12 }}>通知:</Text>
            <Switch 
              
              checked={notificationsEnabled} 
              onChange={setNotificationsEnabled} 
            />
          </Space>
          
          <Space size={4}>
            <Text style={{ fontSize: 12 }}>自动滚动:</Text>
            <Switch 
              
              checked={isAutoScrollEnabled} 
              onChange={setIsAutoScrollEnabled} 
            />
          </Space>
          
          <Divider type="vertical" style={{ margin: '0 4px' }} />
          
          <Text style={{ fontSize: 11, color: '#666' }}>
            最后事件: {connectionStats?.timeSinceLastEvent}秒前
          </Text>
          
          {connectionStatus.status === 'connected' && connectionStatus.lastConnected && (
            <Text style={{ fontSize: 11, color: '#666' }}>
              连接时间: {connectionStatus.lastConnected.toLocaleTimeString()}
            </Text>
          )}
        </Space>
      </Card>
      
      {/* 连接问题提示 */}
      {connectionStatus.status === 'error' && (
        <Alert
          message="WebSocket连接异常"
          description="实时更新功能暂时不可用，您可以点击刷新按钮手动更新数据"
          type="warning"
          showIcon
          closable
          style={{ marginBottom: 16 }}
          action={
            <Button  onClick={handleReconnect}>
              重新连接
            </Button>
          }
        />
      )}
      
      {isPaused && (
        <Alert
          message="实时更新已暂停"
          description="点击恢复按钮重新开始接收实时事件"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      
      {/* 时间线组件 */}
      <EnhancedTaskTimelineV2
        events={events}
        showFilters={true}
        enableGrouping={true}
        enableSearch={true}
        enableAdvancedSearch={true}
        showEventCount={true}
        compactMode={false}
        maxHeight={600}
        onRefresh={handleRefresh}
        onEventClick={(event) => {
          console.log('点击事件:', event);
          // 可以在这里添加事件详情弹窗
        }}
      />
    </div>
  );
};

export default RealTimeTimeline;