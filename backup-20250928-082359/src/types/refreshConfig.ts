// Refresh configuration types - independent file to avoid circular dependencies

// 刷新间隔预设值（秒）
export const REFRESH_INTERVALS = {
  DISABLED: 0,
  FAST: 15,
  NORMAL: 30,
  SLOW: 60,
  VERY_SLOW: 120
} as const;

export type RefreshInterval = typeof REFRESH_INTERVALS[keyof typeof REFRESH_INTERVALS];

// 刷新配置接口
export interface RefreshConfig {
  /** 默认刷新间隔（秒） */
  defaultInterval: RefreshInterval;
  /** 任务完成情况刷新间隔（秒） */
  completionStatsInterval: RefreshInterval;
  /** 子任务树刷新间隔（秒） */
  taskTreeInterval: RefreshInterval;
  /** 是否启用页面可见性检测 */
  enableVisibilityDetection: boolean;
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试间隔（毫秒） */
  retryInterval: number;
  /** 是否启用错误通知 */
  enableErrorNotifications: boolean;
  /** 错误通知持续时间（毫秒） */
  errorNotificationDuration: number;
  /** 是否启用调试日志 */
  enableDebugLogs: boolean;
}

// 默认配置 - 平衡性能和用户体验
export const DEFAULT_REFRESH_CONFIG: RefreshConfig = {
  defaultInterval: REFRESH_INTERVALS.NORMAL,  // 30秒
  completionStatsInterval: REFRESH_INTERVALS.FAST, // 15秒，保持较快刷新体验
  taskTreeInterval: REFRESH_INTERVALS.NORMAL, 
  enableVisibilityDetection: true,
  maxRetries: 2,                             
  retryInterval: 3000,                       
  enableErrorNotifications: true,
  errorNotificationDuration: 3000,           
  enableDebugLogs: false
};
