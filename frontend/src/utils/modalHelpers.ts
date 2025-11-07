/**
 * Modal帮助工具函数
 * 解决Modal.confirm异步操作时的遮罩层清理问题
 */

import { Modal, message } from 'antd';

export interface ConfirmDeleteOptions {
  title: string;
  content: string;
  okText?: string;
  cancelText?: string;
  onOk: () => Promise<void>;
  onCancel?: () => void;
}

/**
 * 显示删除确认弹窗，正确处理异步操作
 * @param options 确认弹窗配置
 */
export const showDeleteConfirm = (options: ConfirmDeleteOptions) => {
  const {
    title,
    content,
    okText = '删除',
    cancelText = '取消',
    onOk,
    onCancel
  } = options;

  Modal.confirm({
    title,
    content,
    okText,
    cancelText,
    okType: 'danger',
    onOk: async () => {
      try {
        await onOk();
      } catch (error) {
        console.error('删除操作失败:', error);
        message.error('删除失败，请稍后重试');
        throw error; // 重新抛出错误，让Modal知道操作失败
      }
    },
    onCancel
  });
};

/**
 * 显示通用确认弹窗，正确处理异步操作
 */
export interface ConfirmOptions {
  title: string;
  content: string;
  okText?: string;
  cancelText?: string;
  okType?: 'primary' | 'danger' | 'dashed' | 'ghost' | 'default';
  onOk: () => Promise<void>;
  onCancel?: () => void;
}

export const showAsyncConfirm = (options: ConfirmOptions) => {
  const {
    title,
    content,
    okText = '确定',
    cancelText = '取消',
    okType = 'primary',
    onOk,
    onCancel
  } = options;

  // ✅ FIXED - Type assertion for okType to match Modal.confirm (TS2322)
  Modal.confirm({
    title,
    content,
    okText,
    cancelText,
    okType: okType as any,
    onOk: async () => {
      try {
        await onOk();
      } catch (error) {
        console.error('确认操作失败:', error);
        message.error('操作失败，请稍后重试');
        throw error; // 重新抛出错误，让Modal知道操作失败
      }
    },
    onCancel
  });
};