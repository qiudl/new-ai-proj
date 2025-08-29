import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Tooltip, Typography, Space, Progress } from 'antd';
import { ReloadOutlined, PauseCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useRefreshConfig } from '../contexts/RefreshConfigContext';

const { Text } = Typography;

export interface RefreshWithCountdownProps {
  /** 刷新回调函数 */
  onRefresh: () => void | Promise<void>;
  /** 刷新间隔（秒），如果不提供则使用全局配置 */
  interval?: number;
  /** 提示文本 */
  tooltip?: string;
  /** 按钮大小 */
  size?: 'small' | 'middle' | 'large';
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否显示进度环 */
  showProgress?: boolean;
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** 自定义类名 */
  className?: string;
  /** 是否启用页面可见性检测 */
  enableVisibilityDetection?: boolean;
  /** 加载状态 */
  loading?: boolean;
  /** 错误状态 */
  error?: boolean;
}

export const RefreshWithCountdown: React.FC<RefreshWithCountdownProps> = ({
  onRefresh,
  interval,
  tooltip = "自动刷新倒计时",
  size = 'small',
  disabled = false,
  showProgress = true,
  style,
  className,
  enableVisibilityDetection = true,
  loading = false,
  error = false
}) => {
  const { config } = useRefreshConfig();
  const [countdown, setCountdown] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 使用配置的刷新间隔，如果没有传入interval参数
  const effectiveInterval = interval || config.completionStatsInterval || 20;
  
  // 清理定时器
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 开始倒计时
  const startCountdown = useCallback(() => {
    if (effectiveInterval <= 0 || disabled) return;
    
    clearTimer();
    setCountdown(effectiveInterval);
    
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // 倒计时结束，执行刷新
          onRefresh();
          return effectiveInterval; // 重新开始倒计时
        }
        return prev - 1;
      });
    }, 1000);
  }, [effectiveInterval, disabled, clearTimer, onRefresh]);

  // 手动刷新
  const handleManualRefresh = useCallback(async () => {
    clearTimer();
    setCountdown(0);
    await onRefresh();
    // 刷新完成后重新开始倒计时
    setTimeout(startCountdown, 100);
  }, [clearTimer, onRefresh, startCountdown]);

  // 暂停/恢复倒计时
  const togglePause = useCallback(() => {
    setIsPaused(prev => {
      const newIsPaused = !prev;
      if (newIsPaused) {
        clearTimer();
      } else {
        startCountdown();
      }
      return newIsPaused;
    });
  }, [clearTimer, startCountdown]);

  // 页面可见性检测
  useEffect(() => {
    if (!enableVisibilityDetection) return;

    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      
      if (visible && !isPaused) {
        // 页面变为可见时，重新开始倒计时
        startCountdown();
      } else {
        // 页面不可见时，暂停倒计时
        clearTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enableVisibilityDetection, isPaused, startCountdown, clearTimer]);

  // 初始化和重启倒计时
  useEffect(() => {
    if (!disabled && isVisible && !isPaused) {
      startCountdown();
    }
    
    return clearTimer;
  }, [effectiveInterval, disabled, isVisible, isPaused, startCountdown, clearTimer]);

  // 计算进度百分比
  const progressPercent = effectiveInterval > 0 ? 
    Math.round(((effectiveInterval - countdown) / effectiveInterval) * 100) : 0;

  // 格式化倒计时显示
  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return '刷新中...';
    return `${seconds}s`;
  };

  // 构建提示内容
  const buildTooltipContent = () => {
    const baseContent = tooltip;
    const statusInfo = isPaused ? '已暂停' : `下次刷新: ${formatCountdown(countdown)}`;
    const intervalInfo = `刷新间隔: ${effectiveInterval}秒`;
    
    return (
      <div>
        <div>{baseContent}</div>
        <div style={{ marginTop: 4, fontSize: '12px', opacity: 0.8 }}>
          {statusInfo}
        </div>
        <div style={{ fontSize: '12px', opacity: 0.8 }}>
          {intervalInfo}
        </div>
        {error && (
          <div style={{ marginTop: 4, color: '#ff4d4f', fontSize: '12px' }}>
            上次刷新失败
          </div>
        )}
      </div>
    );
  };

  if (effectiveInterval <= 0) {
    // 如果间隔为0，只显示手动刷新按钮
    return (
      <Tooltip title="手动刷新">
        <Button
          type="text"
          icon={<ReloadOutlined />}
          size={size}
          onClick={handleManualRefresh}
          loading={loading}
          disabled={disabled}
          style={style}
          className={className}
        />
      </Tooltip>
    );
  }

  return (
    <Space size={4} style={style} className={className}>
      <Tooltip title={buildTooltipContent()}>
        <Button
          type="text"
          icon={<ReloadOutlined spin={loading} />}
          size={size}
          onClick={handleManualRefresh}
          loading={loading}
          disabled={disabled}
          style={{
            color: error ? '#ff4d4f' : undefined
          }}
        />
      </Tooltip>
      
      {showProgress && countdown > 0 && (
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <Progress
            type="circle"
            percent={progressPercent}
            size={size === 'small' ? 20 : size === 'large' ? 28 : 24}
            strokeWidth={size === 'small' ? 8 : 6}
            showInfo={false}
            strokeColor={{
              '0%': '#87d068',
              '50%': '#1890ff',
              '100%': '#f50'
            }}
            style={{ marginRight: 4 }}
          />
          <Text
            style={{
              fontSize: size === 'small' ? '10px' : size === 'large' ? '12px' : '11px',
              color: '#666',
              minWidth: size === 'small' ? '16px' : '20px',
              textAlign: 'center'
            }}
          >
            {formatCountdown(countdown)}
          </Text>
        </div>
      )}

      {!showProgress && countdown > 0 && (
        <Text
          style={{
            fontSize: size === 'small' ? '11px' : size === 'large' ? '13px' : '12px',
            color: '#666'
          }}
        >
          {formatCountdown(countdown)}
        </Text>
      )}

      <Tooltip title={isPaused ? '继续倒计时' : '暂停倒计时'}>
        <Button
          type="text"
          icon={isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
          size={size}
          onClick={togglePause}
          disabled={disabled}
          style={{
            fontSize: size === 'small' ? '12px' : '14px',
            opacity: 0.6
          }}
        />
      </Tooltip>
    </Space>
  );
};

export default RefreshWithCountdown;
