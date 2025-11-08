/**
 * 错误处理工具集
 *
 * 使用示例：
 *
 * ```typescript
 * import { ErrorHandler, ErrorType, BusinessErrorCode } from '@/utils/error';
 *
 * // 1. 完整错误处理（记录、显示、上报）
 * try {
 *   await someApiCall();
 * } catch (error) {
 *   ErrorHandler.handle(error, {
 *     customMessage: '操作失败，请稍后重试',
 *     onRetry: () => someApiCall(),
 *   });
 * }
 *
 * // 2. 简化错误处理（仅显示消息）
 * try {
 *   await someApiCall();
 * } catch (error) {
 *   ErrorHandler.showError(error, '保存失败');
 * }
 *
 * // 3. 静默错误处理（仅记录日志）
 * try {
 *   await someApiCall();
 * } catch (error) {
 *   ErrorHandler.silent(error);
 * }
 *
 * // 4. 自定义错误处理
 * try {
 *   await someApiCall();
 * } catch (error) {
 *   const appError = ErrorHandler.handle(error, {
 *     showMessage: true,
 *     logError: true,
 *     reportError: false,
 *     onError: (err) => {
 *       console.log('自定义错误处理', err);
 *     },
 *   });
 *
 *   if (appError.type === ErrorType.BUSINESS) {
 *     // 业务错误的特殊处理
 *   }
 * }
 * ```
 */

// 类型定义（先导出类型）
// 默认导出错误处理器（最常用）
import { ErrorHandler } from './handler';

export { ErrorType, BusinessErrorCode } from './types';
export type { AppError, ErrorHandlerConfig } from './types';

// 错误识别器
export { ErrorIdentifier } from './identifier';

// 错误处理器（确保完整导出）
export { ErrorHandler } from './handler';
export default ErrorHandler;
