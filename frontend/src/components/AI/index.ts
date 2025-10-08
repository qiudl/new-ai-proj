/**
 * AI组件导出
 */

// 新的统一AI描述生成对话框（推荐使用）
export { default as UnifiedAIDescriptionModal } from './UnifiedAIDescriptionModal';
export type {
  UnifiedAIDescriptionModalProps,
  GenerationMode,
  StyleOption,
  GenerationConfig,
  GenerationResult,
  GenerationProgress,
} from './UnifiedAIDescriptionModal';

// AI描述按钮
export { default as AIDescriptionButton } from './AIDescriptionButton';

// 旧组件（已废弃，保留用于向后兼容）
/** @deprecated 请使用 UnifiedAIDescriptionModal 代替 */
export { default as AIDescriptionModal } from './AIDescriptionModal';
