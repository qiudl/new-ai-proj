import React, { useState, useCallback } from 'react';
import { message } from 'antd';
import RefreshWithCountdown from './RefreshWithCountdown';
import { useRefreshConfig } from '../contexts/RefreshConfigContext';

export interface UnifiedTaskRefreshProps {
  /** 刷新任务完成情况统计的函数 */
  onRefreshCompletionStats?: () => Promise<void> | void;
  /** 刷新子任务数据的函数 */
  onRefreshSubtasks?: () => Promise<void> | void;
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
  /** 自定义提示文本 */
  tooltip?: string;
}

export const UnifiedTaskRefresh: React.FC<UnifiedTaskRefreshProps> = ({
  onRefreshCompletionStats,
  onRefreshSubtasks,
  showProgress = true,
  size = 'small',
  style,
  className,
  disabled = false,
  tooltip = "任务数据自动刷新"
}) => {
  const { config } = useRefreshConfig();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleRefresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      
      // 同时执行两个刷新函数
      const refreshPromises: Promise<void>[] = [];
      
      if (onRefreshCompletionStats) {
        refreshPromises.push(Promise.resolve(onRefreshCompletionStats()));
      }
      
      if (onRefreshSubtasks) {
        refreshPromises.push(Promise.resolve(onRefreshSubtasks()));
      }
      
      // 等待所有刷新操作完成
      await Promise.all(refreshPromises);
      
      if (config.enableDebugLogs) {
        console.log('Unified task refresh completed successfully');
      }
      
    } catch (err) {
      console.error('Failed to refresh task data:', err);
      setError(true);
      
      if (config.enableErrorNotifications) {
        message.error('刷新任务数据失败', config.errorNotificationDuration / 1000);
      }
    } finally {
      setLoading(false);
    }
  }, [onRefreshCompletionStats, onRefreshSubtasks, config]);

  return (
    <RefreshWithCountdown
      onRefresh={handleRefresh}
      interval={config.completionStatsInterval}
      tooltip={tooltip}
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

export default UnifiedTaskRefresh;