import React from 'react';
import { Spin, Tooltip } from 'antd';
import { LoadingOutlined, SyncOutlined, ReloadOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import '../styles/LoadingIndicator.css';

export type LoadingType = 'initial' | 'refresh' | 'manual' | 'auto';
export type LoadingSize = 'small' | 'default' | 'large';
export type LoadingStyle = 'spin' | 'pulse' | 'dots' | 'minimal';

export interface LoadingIndicatorProps {
  /** 是否正在加载 */
  loading?: boolean;
  /** 加载类型 */
  type?: LoadingType;
  /** 加载指示器大小 */
  size?: LoadingSize;
  /** 加载样式 */
  style?: LoadingStyle;
  /** 加载提示文本 */
  tip?: string;
  /** 显示加载时长 */
  showDuration?: boolean;
  /** 加载开始时间 */
  startTime?: Date | null;
  /** 最后更新时间 */
  lastUpdateTime?: Date | null;
  /** 下次更新时间（用于倒计时） */
  nextUpdateTime?: Date | null;
  /** 自定义样式 */
  className?: string;
  /** 内联样式 */
  wrapperStyle?: React.CSSProperties;
  /** 是否显示时间信息 */
  showTimeInfo?: boolean;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  loading = false,
  type = 'refresh',
  size = 'default',
  style = 'spin',
  tip,
  showDuration = false,
  startTime,
  lastUpdateTime,
  nextUpdateTime,
  className,
  wrapperStyle,
  showTimeInfo = false
}) => {
  const [duration, setDuration] = React.useState<number>(0);
  const [countdown, setCountdown] = React.useState<number>(0);

  // 更新加载时长
  React.useEffect(() => {
    if (!loading || !startTime || !showDuration) return;
    
    const timer = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setDuration(diff);
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, startTime, showDuration]);

  // 更新倒计时
  React.useEffect(() => {
    if (!nextUpdateTime) return;
    
    const timer = setInterval(() => {
      const now = new Date();
      const diff = Math.max(0, Math.floor((nextUpdateTime.getTime() - now.getTime()) / 1000));
      setCountdown(diff);
      
      if (diff <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [nextUpdateTime]);

  const getLoadingIcon = () => {
    switch (type) {
      case 'initial':
        return <LoadingOutlined />;
      case 'refresh':
      case 'auto':
        return <SyncOutlined />;
      case 'manual':
        return <ReloadOutlined />;
      default:
        return <LoadingOutlined />;
    }
  };

  const getLoadingTip = () => {
    if (tip) return tip;
    
    switch (type) {
      case 'initial':
        return '初始化加载中...';
      case 'refresh':
        return '刷新数据中...';
      case 'auto':
        return '自动更新中...';
      case 'manual':
        return '手动刷新中...';
      default:
        return '加载中...';
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return '即将更新';
    if (seconds < 60) return `${seconds}s 后更新`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s 后更新`;
  };

  const renderLoadingContent = () => {
    if (style === 'minimal') {
      return (
        <div className={`loading-indicator loading-indicator--minimal loading-indicator--${size}`}>
          <div className="loading-dot-container">
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
          </div>
        </div>
      );
    }

    if (style === 'pulse') {
      return (
        <div className={`loading-indicator loading-indicator--pulse loading-indicator--${size}`}>
          <div className="loading-pulse-ring"></div>
          <div className="loading-pulse-center"></div>
        </div>
      );
    }

    if (style === 'dots') {
      return (
        <div className={`loading-indicator loading-indicator--dots loading-indicator--${size}`}>
          <div className="loading-dots-container">
            <span className="loading-dots-dot"></span>
            <span className="loading-dots-dot"></span>
            <span className="loading-dots-dot"></span>
          </div>
        </div>
      );
    }

    // 默认spin样式
    return (
      <Spin 
        indicator={getLoadingIcon()} 
        size={size}
        tip={getLoadingTip()}
        className={`loading-indicator loading-indicator--spin loading-indicator--${type}`}
      />
    );
  };

  const getTooltipContent = () => {
    const content: React.ReactNode[] = [];
    
    if (loading && showDuration && duration > 0) {
      content.push(
        <div key="duration">
          <ClockCircleOutlined /> 已耗时: {formatDuration(duration)}
        </div>
      );
    }
    
    if (lastUpdateTime) {
      content.push(
        <div key="lastUpdate">
          最后更新: {dayjs(lastUpdateTime).format('HH:mm:ss')}
        </div>
      );
    }
    
    if (countdown > 0 && nextUpdateTime) {
      content.push(
        <div key="countdown">
          {formatCountdown(countdown)}
        </div>
      );
    }
    
    if (content.length === 0) return null;
    
    return (
      <div>
        {content.map((item, index) => (
          <div key={index} style={{ marginBottom: index < content.length - 1 ? '4px' : 0 }}>
            {item}
          </div>
        ))}
      </div>
    );
  };

  const tooltipContent = getTooltipContent();

  const indicator = (
    <div 
      className={`loading-indicator-wrapper ${className || ''}`}
      style={wrapperStyle}
    >
      {renderLoadingContent()}
      {showTimeInfo && !loading && (
        <div className="loading-indicator-time-info">
          {lastUpdateTime && (
            <span className="last-update-time">
              {dayjs(lastUpdateTime).format('HH:mm:ss')} 更新
            </span>
          )}
          {countdown > 0 && nextUpdateTime && (
            <span className="next-update-countdown">
              {formatCountdown(countdown)}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (tooltipContent) {
    return (
      <Tooltip title={tooltipContent} placement="top">
        {indicator}
      </Tooltip>
    );
  }

  return indicator;
};

export default LoadingIndicator;
