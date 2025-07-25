import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

// 配置dayjs
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

// 兼容原有函数
export function formatDate(dateString: string | Date, format: string = 'YYYY-MM-DD HH:mm'): string {
  if (!dateString) return '无效日期';
  
  const date = dayjs(dateString);
  if (!date.isValid()) return '无效日期';
  
  return date.format(format.replace('mm', 'mm'));
}

// 增强的相对时间格式化
export function formatRelativeTime(date: string | Date): string {
  if (!date) return '-';
  
  const targetDate = dayjs(date);
  const now = dayjs();
  
  if (!targetDate.isValid()) return '-';
  
  const diffMinutes = now.diff(targetDate, 'minute');
  const diffHours = now.diff(targetDate, 'hour');
  const diffDays = now.diff(targetDate, 'day');
  const diffWeeks = now.diff(targetDate, 'week');
  const diffMonths = now.diff(targetDate, 'month');
  
  // 刚刚（5分钟内）
  if (diffMinutes < 5) {
    return '刚刚';
  }
  
  // X分钟前（1小时内）
  if (diffHours < 1) {
    return `${diffMinutes}分钟前`;
  }
  
  // X小时前（今天内）
  if (diffDays < 1) {
    return `${diffHours}小时前`;
  }
  
  // 昨天
  if (diffDays === 1) {
    return '昨天';
  }
  
  // 前天
  if (diffDays === 2) {
    return '前天';
  }
  
  // X天前（本周内）
  if (diffWeeks < 1) {
    return `${diffDays}天前`;
  }
  
  // X周前（本月内）
  if (diffMonths < 1) {
    return `${diffWeeks}周前`;
  }
  
  // X个月前（本年内）
  if (targetDate.year() === now.year()) {
    return `${diffMonths}个月前`;
  }
  
  // 具体日期（跨年）
  return targetDate.format('YYYY年MM月DD日');
}

/**
 * 获取精确的时间显示（用于tooltip）
 */
export const formatExactTime = (date: string | Date): string => {
  if (!date) return '';
  
  const targetDate = dayjs(date);
  if (!targetDate.isValid()) return '';
  
  return targetDate.format('YYYY年MM月DD日 HH:mm:ss');
};

/**
 * 判断日期是否过期
 */
export const isOverdue = (date: string | Date): boolean => {
  if (!date) return false;
  return dayjs(date).isBefore(dayjs(), 'day');
};

/**
 * 判断日期是否即将到期（3天内）
 */
export const isUpcoming = (date: string | Date): boolean => {
  if (!date) return false;
  const targetDate = dayjs(date);
  const now = dayjs();
  const diffDays = targetDate.diff(now, 'day');
  return diffDays >= 0 && diffDays <= 3;
};

/**
 * 格式化任务更新时间为可排序的时间戳
 */
export const getUpdateTimestamp = (date: string | Date): number => {
  if (!date) return 0;
  return dayjs(date).valueOf();
};

/**
 * 获取时间的颜色样式
 */
export const getTimeStyle = (date: string | Date, type: 'created' | 'updated' | 'due' = 'updated') => {
  if (!date) return { color: '#8c8c8c' };
  
  const now = dayjs();
  const targetDate = dayjs(date);
  const diffHours = now.diff(targetDate, 'hour');
  const diffDays = now.diff(targetDate, 'day');
  
  if (type === 'due') {
    if (isOverdue(date)) {
      return { color: '#ff4d4f', fontWeight: 500 };
    }
    if (isUpcoming(date)) {
      return { color: '#fa8c16', fontWeight: 500 };
    }
    return { color: '#8c8c8c' };
  }
  
  // 创建时间和更新时间的样式
  if (diffHours < 1) {
    return { color: '#52c41a', fontWeight: 500 }; // 绿色 - 最近1小时
  }
  if (diffHours < 24) {
    return { color: '#1890ff', fontWeight: 500 }; // 蓝色 - 今天
  }
  if (diffDays < 7) {
    return { color: '#fa8c16' }; // 橙色 - 本周
  }
  
  return { color: '#8c8c8c' }; // 灰色 - 更早
};