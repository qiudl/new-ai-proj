/**
 * Modal统一配置Hook
 *
 * 提供统一的Modal配置，解决以下问题：
 * 1. 垂直居中显示
 * 2. 长内容自动滚动
 * 3. 响应式宽度
 * 4. 统一的样式规范
 *
 * @example
 * ```tsx
 * import { useModalConfig } from '../hooks/useModalConfig';
 *
 * const MyModal: React.FC = () => {
 *   const modalConfig = useModalConfig({ width: 800 });
 *
 *   return (
 *     <Modal
 *       {...modalConfig}
 *       title="示例弹窗"
 *       open={visible}
 *       onCancel={onCancel}
 *     >
 *       内容...
 *     </Modal>
 *   );
 * };
 * ```
 */

import { ModalProps } from 'antd';
import { useResponsive, getResponsiveModalWidth } from './useResponsive';

export interface ModalConfigOptions {
  /**
   * 弹窗宽度
   * @default 700
   */
  width?: number | string;

  /**
   * 内容区域最大高度
   * @default 'calc(100vh - 300px)'
   */
  maxHeight?: string;

  /**
   * 是否垂直居中显示
   * @default true
   */
  centered?: boolean;

  /**
   * 额外的body样式
   */
  bodyStyle?: React.CSSProperties;

  /**
   * 是否禁用内容滚动
   * 某些场景下可能需要禁用（如嵌套滚动）
   * @default false
   */
  disableScroll?: boolean;
}

/**
 * 获取统一的Modal配置
 *
 * 该Hook提供了项目中所有Modal组件的标准配置：
 * - 默认垂直居中
 * - 自动处理长内容滚动
 * - 响应式宽度
 * - 为滚动条预留空间
 *
 * @param options - 配置选项
 * @returns Modal组件的props配置
 */
export const useModalConfig = (
  options: ModalConfigOptions = {}
): Partial<ModalProps> => {
  const {
    width = 700,
    maxHeight = 'calc(100vh - 300px)',
    centered = true,
    bodyStyle = {},
    disableScroll = false,
  } = options;

  const responsive = useResponsive();

  const bodyStyles: React.CSSProperties = {
    ...(disableScroll
      ? {}
      : {
          maxHeight,
          overflowY: 'auto' as const,
          paddingRight: '8px', // 为滚动条预留空间
        }),
    ...bodyStyle,
  };

  return {
    centered,
    width: getResponsiveModalWidth(typeof width === 'string' ? 700 : width, responsive),
    style: { top: 80 }, // 调整顶部偏移，确保上下边距均衡
    styles: {
      body: bodyStyles,
    },
  };
};

/**
 * 预定义的Modal尺寸配置
 */
export const MODAL_SIZES = {
  small: 520,
  medium: 700,
  large: 900,
  xlarge: 1200,
} as const;

/**
 * 快捷配置函数
 */
export const useSmallModalConfig = () => useModalConfig({ width: MODAL_SIZES.small });
export const useMediumModalConfig = () => useModalConfig({ width: MODAL_SIZES.medium });
export const useLargeModalConfig = () => useModalConfig({ width: MODAL_SIZES.large });
export const useXLargeModalConfig = () => useModalConfig({ width: MODAL_SIZES.xlarge });
