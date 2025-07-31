import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Typography, Button, message, Tooltip } from 'antd';
import { QuestionCircleOutlined, BugOutlined, ClockCircleOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
// 统一定时器系统
import { useTimer } from '../contexts/TimerContext';
import EnhancedTimerCard from '../components/EnhancedTimerCard';
import EnhancedHierarchicalTaskTree from '../components/EnhancedHierarchicalTaskTree';
import TimerErrorBoundary from '../components/TimerErrorBoundary';
import TimerDebugModal from '../components/TimerDebugModal';
import TimeManagementGuide from '../components/TimeManagementGuide';
import '../styles/DashboardSimplified.css';

const { Title, Text } = Typography;

const DashboardPage: React.FC = () => {
  // 内存优化: 使用refs管理mounted状态
  const isMountedRef = useRef(true);
  
  const [showGuide, setShowGuide] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  
  // 浮动定时器显示状态
  const [floatingTimerVisible, setFloatingTimerVisible] = useState(true);
  
  // 获取定时器状态
  const { timerState } = useTimer();
  
  // 简化的状态管理
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 从localStorage恢复浮动定时器可见性状态
  useEffect(() => {
    try {
      const savedHidden = localStorage.getItem('floatingTimerHidden');
      if (savedHidden) {
        setFloatingTimerVisible(!JSON.parse(savedHidden));
      }
    } catch (error) {
      console.warn('Failed to restore floating timer visibility:', error);
    }
  }, []);

  // 切换浮动定时器显示/隐藏
  const toggleFloatingTimer = useCallback(() => {
    const newHidden = floatingTimerVisible;
    setFloatingTimerVisible(!newHidden);
    
    try {
      localStorage.setItem('floatingTimerHidden', JSON.stringify(newHidden));
      
      // 触发storage事件通知浮动定时器组件
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'floatingTimerHidden',
        newValue: JSON.stringify(newHidden),
        oldValue: JSON.stringify(!newHidden)
      }));
      
      if (newHidden) {
        message.info('浮动定时器已隐藏');
      } else {
        message.success('浮动定时器已显示');
      }
    } catch (error) {
      console.error('Failed to save floating timer visibility:', error);
    }
  }, [floatingTimerVisible]);

  // 简化的刷新逻辑
  const handleRefresh = useCallback(() => {
    if (!isMountedRef.current) return;
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Title level={2} style={{ margin: 0, color: '#262626' }}>
              时间管理
            </Title>
            <Button
              type="text"
              icon={<QuestionCircleOutlined />}
              onClick={() => setShowGuide(true)}
              title="查看使用指南"
              style={{ color: '#8c8c8c' }}
            />
            <Button
              type="text"
              icon={<BugOutlined />}
              onClick={() => setShowDebug(true)}
              title="定时器调试"
              style={{ color: '#8c8c8c' }}
            />
            <Tooltip 
              title={
                !timerState.isRunning 
                  ? '当前没有运行中的定时器' 
                  : floatingTimerVisible 
                    ? '隐藏浮动定时器' 
                    : '显示浮动定时器'
              }
            >
              <Button
                type="text"
                icon={
                  timerState.isRunning ? (
                    floatingTimerVisible ? <EyeOutlined /> : <EyeInvisibleOutlined />
                  ) : (
                    <ClockCircleOutlined />
                  )
                }
                onClick={toggleFloatingTimer}
                disabled={!timerState.isRunning}
                title={
                  !timerState.isRunning 
                    ? '当前没有运行中的定时器' 
                    : floatingTimerVisible 
                      ? '隐藏浮动定时器' 
                      : '显示浮动定时器'
                }
                style={{ 
                  color: timerState.isRunning 
                    ? (floatingTimerVisible ? '#52c41a' : '#8c8c8c') 
                    : '#d9d9d9' 
                }}
              />
            </Tooltip>
          </div>
          <Text type="secondary">
            管理您的项目、任务和工作时间
          </Text>
        </div>
      </div>

      {/* 不限高度的2列布局 */}
      <div className="dashboard-simplified-layout" style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', // 左右各50%宽度
        gap: '24px',
        height: 'calc(100vh - 140px)', // 占满剩余空间
        marginBottom: '24px'
      }}>
        {/* 左侧：任务计时 */}
        <div className="timer-section" style={{
          background: '#fafafa',
          border: '1px solid #d9d9d9',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ 
            marginBottom: '16px',
            borderBottom: '1px solid #e8e8e8',
            paddingBottom: '12px'
          }}>
            <Title level={3} style={{ margin: 0, color: '#262626' }}>
              任务计时
            </Title>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              开始、暂停、停止任务计时
            </Text>
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <TimerErrorBoundary>
              <EnhancedTimerCard showHistory={true} />
            </TimerErrorBoundary>
          </div>
        </div>

        {/* 右侧：我的任务 */}
        <div className="tasks-section" style={{
          background: '#f9f0ff',
          border: '1px solid #d3adf7',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ 
            marginBottom: '16px',
            borderBottom: '1px solid #e8e8e8',
            paddingBottom: '12px'
          }}>
            <Title level={3} style={{ margin: 0, color: '#262626' }}>
              我的任务
            </Title>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              查看和管理所有任务
            </Text>
          </div>
          
          <div style={{ 
            flex: 1, 
            overflow: 'hidden'
          }}>
            <TimerErrorBoundary>
              <EnhancedHierarchicalTaskTree 
                height="100%" 
                showProjectInfo={true}
                compactMode={true}
              />
            </TimerErrorBoundary>
          </div>
        </div>
      </div>

      {/* 使用指南模态框 */}
      <TimeManagementGuide
        visible={showGuide}
        onClose={() => setShowGuide(false)}
      />
      
      {/* 定时器调试模态框 */}
      <TimerDebugModal
        visible={showDebug}
        onClose={() => setShowDebug(false)}
      />
    </div>
  );
};

export default DashboardPage;