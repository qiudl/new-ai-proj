import { useMemo } from 'react';
import { Grid } from 'antd';
import { 
  calculateMaxAvailableHeight, 
  ModalHeightConfig
} from '../utils/modalHeightManager';

const { useBreakpoint } = Grid;

interface UseUnifiedModalProps {
  width?: number | string;
  centered?: boolean;
  heightConfig?: ModalHeightConfig;
  enableHeightManagement?: boolean;
}

interface UnifiedModalConfig {
  width: number | string;
  className: string;
  styles: {
    body: React.CSSProperties;
  };
  centered: boolean;
}

/**
 * 增强的Modal配置Hook
 * 集成了高度管理和响应式设计
 */
export const useUnifiedModal = (props: UseUnifiedModalProps = {}): UnifiedModalConfig => {
  const screens = useBreakpoint();
  const {
    width = 600,
    centered = true,
    heightConfig = {},
    enableHeightManagement = true
  } = props;

  // 移除自动高度管理的初始化 - 改为在App级别全局初始化

  return useMemo(() => {
    const isMobile = !screens.md; // < 768px

    // 确定Modal宽度 - 移动端自适应，桌面端保持原宽度
    let modalWidth: number | string = width;
    if (isMobile) {
      modalWidth = Math.min(typeof width === 'number' ? width : 600, window.innerWidth - 32);
    }

    // 计算最大可用高度
    const maxHeight = calculateMaxAvailableHeight({
      maxHeightRatio: 0.9,
      topMargin: 20,
      bottomMargin: 20,
      ...heightConfig
    });

    // 样式类名 - 包含高度管理标识
    const className = enableHeightManagement ? 'unified-modal modal-height-managed' : 'unified-modal';

    // 设置body样式 - 智能高度管理
    const bodyStyle: React.CSSProperties = {
      maxHeight: isMobile ? 'calc(100vh - 180px)' : `${maxHeight}px`,
      overflowY: 'auto',
      overflowX: 'hidden',
      paddingRight: '8px',
      // 自定义滚动条样式
      scrollbarWidth: 'thin',
      scrollbarColor: '#c1c1c1 #f1f1f1'
    };

    return {
      width: modalWidth,
      className,
      styles: {
        body: bodyStyle
      },
      centered
    };
  }, [screens, width, centered, heightConfig, enableHeightManagement]);
};

export default useUnifiedModal;