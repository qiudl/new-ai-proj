import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';

// 启用周数插件
dayjs.extend(weekOfYear);

/**
 * 计算当前日期是一年中的第几周
 * @returns 当前周数
 */
export const getCurrentWeekNumber = (): number => {
  return dayjs().week();
};

/**
 * 格式化序号为两位数字符串
 * @param index 序号索引（从0开始）
 * @returns 格式化的序号字符串（如 "01", "02"）
 */
export const formatSequenceNumber = (index: number): string => {
  return String(index + 1).padStart(2, '0');
};

/**
 * 生成子任务的完整名称
 * @param parentTaskId 父任务ID
 * @param index 任务序号索引（从0开始）
 * @param title 任务标题
 * @param weekNumber 可选的周数，默认使用当前周数
 * @returns 生成的任务名称
 */
export const generateSubTaskName = (
  parentTaskId: number,
  index: number,
  title: string,
  weekNumber?: number
): string => {
  const week = weekNumber || getCurrentWeekNumber();
  const sequence = formatSequenceNumber(index);
  
  // 格式：{第几周}周-#{父任务id}-{自然序号}：任务标题
  return `${week}周-#${parentTaskId}-${sequence}：${title}`;
};

/**
 * 解析任务名称，提取各个组成部分
 * @param taskName 任务名称
 * @returns 解析结果对象
 */
export const parseSubTaskName = (taskName: string): {
  weekNumber?: number;
  parentTaskId?: number;
  sequence?: number;
  title?: string;
  isValidFormat: boolean;
} => {
  // 正则表达式匹配格式：数字周-#数字-数字：标题
  const regex = /^(\d+)周-#(\d+)-(\d+)：(.+)$/;
  const match = taskName.match(regex);
  
  if (!match) {
    return { isValidFormat: false };
  }
  
  return {
    weekNumber: parseInt(match[1]),
    parentTaskId: parseInt(match[2]),
    sequence: parseInt(match[3]),
    title: match[4],
    isValidFormat: true,
  };
};

/**
 * 验证任务名称格式是否正确
 * @param taskName 任务名称
 * @returns 是否符合格式
 */
export const validateSubTaskNameFormat = (taskName: string): boolean => {
  return parseSubTaskName(taskName).isValidFormat;
};

/**
 * 获取任务名称预览
 * @param parentTaskId 父任务ID
 * @param title 任务标题
 * @param weekNumber 可选的周数
 * @param sequence 可选的序号
 * @returns 预览文本
 */
export const getTaskNamePreview = (
  parentTaskId: number,
  title: string,
  weekNumber?: number,
  sequence?: number
): string => {
  if (!title.trim()) {
    return '请输入任务标题';
  }
  
  const week = weekNumber || getCurrentWeekNumber();
  const seq = sequence !== undefined ? formatSequenceNumber(sequence) : 'XX';
  
  return `${week}周-#${parentTaskId}-${seq}：${title.trim()}`;
};

/**
 * 批量生成子任务名称
 * @param parentTaskId 父任务ID
 * @param titles 任务标题数组
 * @param weekNumber 可选的周数
 * @returns 生成的任务名称数组
 */
export const generateBatchSubTaskNames = (
  parentTaskId: number,
  titles: string[],
  weekNumber?: number
): string[] => {
  return titles.map((title, index) => 
    generateSubTaskName(parentTaskId, index, title, weekNumber)
  );
};