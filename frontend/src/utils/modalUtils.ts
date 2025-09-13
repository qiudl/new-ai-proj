/**
 * Modal工具函数，统一管理模态框的z-index层级
 */
import React from 'react';
import { Modal } from 'antd';
import type { ModalFuncProps } from 'antd';

/**
 * 创建标准确认对话框
 */
export const createStandardModal = (props: ModalFuncProps) => {
  return Modal.confirm({
    ...props,
    wrapClassName: `${props.wrapClassName || ''} standard-modal`.trim(),
  });
};

/**
 * 创建关键操作确认对话框（如删除等）
 */
export const createCriticalModal = (props: ModalFuncProps) => {
  return Modal.confirm({
    ...props,
    wrapClassName: `${props.wrapClassName || ''} critical-modal`.trim(),
  });
};

/**
 * 创建删除确认对话框
 */
export const createDeleteConfirmModal = (props: {
  title?: string;
  content: string | React.ReactNode;
  onConfirm: () => Promise<void> | void;
  onCancel?: () => void;
}) => {
  return createCriticalModal({
    title: props.title || '确认删除',
    content: props.content,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: props.onConfirm,
    onCancel: props.onCancel,
  });
};

/**
 * 创建警告确认对话框
 */
export const createWarningModal = (props: ModalFuncProps) => {
  return Modal.confirm({
    ...props,
    wrapClassName: `${props.wrapClassName || ''} critical-modal`.trim(),
  });
};