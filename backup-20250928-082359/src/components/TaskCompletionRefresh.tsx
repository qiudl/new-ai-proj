import React, { useState, useCallback } from 'react';
import { message } from 'antd';
import RefreshWithCountdown from './RefreshWithCountdown';
import { useRefreshConfig } from '../contexts/RefreshConfigContext';

export interface TaskCompletionRefreshProps {
  /** 获取完成情况数据的函数 */
  onRefreshCompletionStats: () => Promise<void> | void;
  /** 是否显示进度环 */
  showProgress?: boolean;
  /** 按钮大小 */
  size?: 'small' | 'middle' | 'large';
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** 自定义类名 */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

export const TaskCompletionRefresh: React.FC<TaskCompletionRefreshProps> = ({
  onRefreshCompletionStats,
  showProgress = true,
  size = 'small',
  style,
  className,
  disabled = false
}) => {
  const { config } = useRefreshConfig();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleRefresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      
      await onRefreshCompletionStats();
      
      if (config.enableDebugLogs) {
        console.log('Task completion stats refreshed successfully');
      }
      
    } catch (err) {
      console.error('Failed to refresh task completion stats:', err);
      setError(true);
      
      if (config.enableErrorNotifications) {
        message.error('刷新任务完成情况失败', config.errorNotificationDuration / 1000);
      }
    } finally {
      setLoading(false);
    }
  }, [onRefreshCompletionStats, config]);

  return (
    <RefreshWithCountdown
      onRefresh={handleRefresh}
      interval={config.completionStatsInterval}
      tooltip="任务完成情况自动刷新"
      size={size}
      disabled={disabled}
      showProgress={showProgress}
      style={style}
      className={className}
      enableVisibilityDetection={config.enableVisibilityDetection}
      loading={loading}
      error={error}
    />
  );
};

export default TaskCompletionRefresh;
