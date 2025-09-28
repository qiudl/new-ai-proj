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
 * 提取任务名称中的编号部分（不含标题）
 * @param taskName 任务名称
 * @returns 编号部分，如果不符合格式则返回null
 */
export const extractTaskNamePrefix = (taskName: string): string | null => {
  // 匹配格式：任何内容：标题
  const match = taskName.match(/^(.+)：.+$/);
  return match ? match[1] : null;
};

/**
 * 生成子任务的完整名称
 * @param parentTaskId 父任务ID
 * @param index 任务序号索引（从0开始）
 * @param title 任务标题
 * @param parentTaskName 父任务的完整名称，用于判断是否为根任务
 * @param weekNumber 可选的周数，默认使用当前周数
 * @returns 生成的任务名称
 */
export const generateSubTaskName = (
  parentTaskId: number,
  index: number,
  title: string,
  parentTaskName?: string,
  weekNumber?: number
): string => {
  const sequence = formatSequenceNumber(index);
  
  // 情况一：父任务是根任务（没有父任务名称或父任务名称不符合子任务格式）
  if (!parentTaskName) {
    const week = weekNumber || getCurrentWeekNumber();
    return `${week}周-#${parentTaskId}-${sequence}：${title}`;
  }
  
  // 提取父任务名称的编号部分
  const parentPrefix = extractTaskNamePrefix(parentTaskName);
  
  // 情况二：父任务是子任务，继承父任务的编号前缀
  if (parentPrefix) {
    return `${parentPrefix}-${sequence}：${title}`;
  }
  
  // 如果无法解析父任务名称，回退到情况一
  const week = weekNumber || getCurrentWeekNumber();
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
  prefix?: string;
  isValidFormat: boolean;
  taskLevel?: number; // 任务层级，1为一级子任务，2为二级子任务等
} => {
  // 首先提取标题部分
  const titleMatch = taskName.match(/^(.+)：(.+)$/);
  if (!titleMatch) {
    return { isValidFormat: false };
  }
  
  const prefix = titleMatch[1];
  const title = titleMatch[2];
  
  // 匹配一级子任务格式：数字周-#数字-数字
  const level1Regex = /^(\d+)周-#(\d+)-(\d+)$/;
  const level1Match = prefix.match(level1Regex);
  
  if (level1Match) {
    return {
      weekNumber: parseInt(level1Match[1]),
      parentTaskId: parseInt(level1Match[2]),
      sequence: parseInt(level1Match[3]),
      title,
      prefix,
      isValidFormat: true,
      taskLevel: 1,
    };
  }
  
  // 匹配多级子任务格式：数字周-#数字-数字-数字...
  const multiLevelRegex = /^(\d+)周-#(\d+)-(.+)$/;
  const multiLevelMatch = prefix.match(multiLevelRegex);
  
  if (multiLevelMatch) {
    const sequenceParts = multiLevelMatch[3].split('-');
    const taskLevel = sequenceParts.length;
    const sequence = parseInt(sequenceParts[sequenceParts.length - 1]);
    
    return {
      weekNumber: parseInt(multiLevelMatch[1]),
      parentTaskId: parseInt(multiLevelMatch[2]),
      sequence,
      title,
      prefix,
      isValidFormat: true,
      taskLevel,
    };
  }
  
  return { isValidFormat: false };
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
 * @param parentTaskName 父任务的完整名称
 * @param weekNumber 可选的周数
 * @param sequence 可选的序号
 * @returns 预览文本
 */
export const getTaskNamePreview = (
  parentTaskId: number,
  title: string,
  parentTaskName?: string,
  weekNumber?: number,
  sequence?: number
): string => {
  if (!title.trim()) {
    return '请输入任务标题';
  }
  
  const seq = sequence !== undefined ? formatSequenceNumber(sequence) : 'XX';
  
  // 情况一：父任务是根任务
  if (!parentTaskName) {
    const week = weekNumber || getCurrentWeekNumber();
    return `${week}周-#${parentTaskId}-${seq}：${title.trim()}`;
  }
  
  // 提取父任务名称的编号部分
  const parentPrefix = extractTaskNamePrefix(parentTaskName);
  
  // 情况二：父任务是子任务，继承父任务的编号前缀
  if (parentPrefix) {
    return `${parentPrefix}-${seq}：${title.trim()}`;
  }
  
  // 如果无法解析父任务名称，回退到情况一
  const week = weekNumber || getCurrentWeekNumber();
  return `${week}周-#${parentTaskId}-${seq}：${title.trim()}`;
};

/**
 * 批量生成子任务名称
 * @param parentTaskId 父任务ID
 * @param titles 任务标题数组
 * @param parentTaskName 父任务的完整名称
 * @param weekNumber 可选的周数
 * @returns 生成的任务名称数组
 */
export const generateBatchSubTaskNames = (
  parentTaskId: number,
  titles: string[],
  parentTaskName?: string,
  weekNumber?: number
): string[] => {
  return titles.map((title, index) => 
    generateSubTaskName(parentTaskId, index, title, parentTaskName, weekNumber)
  );
};