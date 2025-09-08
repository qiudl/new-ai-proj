/**
 * ErrorHandler单元测试
 * 测试统一错误处理、API错误解析、用户通知等功能
 */

import { 
  ErrorHandler, 
  ErrorType, 
  ErrorLevel, 
  AppError,
  showError, 
  showMessage, 
  showValidationErrors,
  handleAsyncError,
  parseApiError,
  useErrorHandler,
  useFormErrorHandler
} from '../errorHandler';
import { renderHook, act } from '@testing-library/react';

// Mock antd components
const mockNotification = {
  error: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
  success: jest.fn(),
};

const mockMessage = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
};

jest.mock('antd', () => ({
  notification: mockNotification,
  message: mockMessage,
}));

describe('ErrorHandler', () => {
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('parseApiError', () => {
    test('应该正确解析网络错误', () => {
      const networkError = {
        code: 'ERR_NETWORK',
        message: 'Network Error'
      };

      const result = ErrorHandler.parseApiError(networkError);

      expect(result).toMatchObject({
        type: ErrorType.NETWORK,
        level: ErrorLevel.ERROR,
        code: 'ERR_NETWORK',
        message: '网络连接失败，请检查网络连接后重试',
        context: { originalError: networkError }
      });
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    test('应该正确解析401认证错误', () => {
      const authError = {
        response: {
          status: 401,
          data: {
            code: 'UNAUTHORIZED',
            message: 'Token expired',
            details: 'JWT token has expired'
          }
        }
      };

      const result = ErrorHandler.parseApiError(authError);

      expect(result).toMatchObject({
        type: ErrorType.PERMISSION,
        level: ErrorLevel.ERROR,
        code: 'UNAUTHORIZED',
        message: '登录已过期，请重新登录',
        details: 'JWT token has expired'
      });
    });

    test('应该正确解析验证错误', () => {
      const validationError = {
        response: {
          status: 422,
          data: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            field: 'email',
            validation_errors: {
              email: ['Email is required', 'Invalid email format'],
              name: ['Name is too short']
            }
          }
        }
      };

      const result = ErrorHandler.parseApiError(validationError);

      expect(result).toMatchObject({
        type: ErrorType.VALIDATION,
        level: ErrorLevel.WARNING,
        code: 'VALIDATION_ERROR',
        message: '输入数据格式不正确',
        field: 'email',
        context: {
          status: 422,
          validationErrors: {
            email: ['Email is required', 'Invalid email format'],
            name: ['Name is too short']
          }
        }
      });
    });

    test('应该正确解析404错误', () => {
      const notFoundError = {
        response: {
          status: 404,
          data: {
            message: 'Task not found'
          }
        }
      };

      const result = ErrorHandler.parseApiError(notFoundError);

      expect(result).toMatchObject({
        type: ErrorType.NOT_FOUND,
        level: ErrorLevel.ERROR,
        code: 'HTTP_404',
        message: 'Task not found'
      });
    });

    test('应该正确解析服务器错误', () => {
      const serverError = {
        response: {
          status: 500,
          data: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database connection failed'
          }
        }
      };

      const result = ErrorHandler.parseApiError(serverError);

      expect(result).toMatchObject({
        type: ErrorType.SERVER,
        level: ErrorLevel.ERROR,
        code: 'INTERNAL_SERVER_ERROR',
        message: '服务器内部错误，请稍后重试'
      });
    });

    test('应该正确解析超时错误', () => {
      const timeoutError = {
        response: {
          status: 408,
          data: {
            message: 'Request timeout'
          }
        }
      };

      const result = ErrorHandler.parseApiError(timeoutError);

      expect(result).toMatchObject({
        type: ErrorType.TIMEOUT,
        level: ErrorLevel.ERROR,
        code: 'HTTP_408',
        message: 'Request timeout'
      });
    });

    test('应该处理没有响应数据的错误', () => {
      const error = {
        response: {
          status: 500,
          statusText: 'Internal Server Error'
        }
      };

      const result = ErrorHandler.parseApiError(error);

      expect(result.message).toBe('服务器内部错误，请稍后重试');
    });

    test('应该使用错误码映射的友好消息', () => {
      const error = {
        response: {
          status: 400,
          data: {
            code: 'TASK_NOT_FOUND',
            message: 'Task with ID 123 not found'
          }
        }
      };

      const result = ErrorHandler.parseApiError(error);

      expect(result.message).toBe('任务不存在或已被删除');
    });
  });

  describe('showError', () => {
    test('应该显示错误通知', () => {
      const error: AppError = {
        type: ErrorType.VALIDATION,
        level: ErrorLevel.ERROR,
        message: '测试错误消息'
      };

      ErrorHandler.showError(error);

      expect(mockNotification.error).toHaveBeenCalledWith({
        message: '操作失败',
        description: '测试错误消息',
        placement: 'topRight',
        duration: 4.5
      });
    });

    test('应该显示警告通知', () => {
      const error: AppError = {
        type: ErrorType.VALIDATION,
        level: ErrorLevel.WARNING,
        message: '验证警告'
      };

      ErrorHandler.showError(error);

      expect(mockNotification.warning).toHaveBeenCalledWith({
        message: '输入验证警告',
        description: '验证警告',
        placement: 'topRight',
        duration: 4.5
      });
    });

    test('应该显示信息通知', () => {
      const error: AppError = {
        type: ErrorType.UNKNOWN,
        level: ErrorLevel.INFO,
        message: '信息消息'
      };

      ErrorHandler.showError(error);

      expect(mockNotification.info).toHaveBeenCalledWith({
        message: '提示信息',
        description: '信息消息',
        placement: 'topRight',
        duration: 4.5
      });
    });

    test('应该显示成功通知', () => {
      const success: AppError = {
        type: ErrorType.UNKNOWN,
        level: ErrorLevel.SUCCESS,
        message: '操作成功'
      };

      ErrorHandler.showError(success);

      expect(mockNotification.success).toHaveBeenCalledWith({
        message: '操作成功',
        description: '操作成功',
        placement: 'topRight',
        duration: 4.5
      });
    });

    test('应该支持字符串错误消息', () => {
      ErrorHandler.showError('简单错误消息');

      expect(mockNotification.error).toHaveBeenCalledWith({
        message: '操作失败',
        description: '简单错误消息',
        placement: 'topRight',
        duration: 4.5
      });
    });

    test('应该支持自定义选项', () => {
      const error: AppError = {
        type: ErrorType.UNKNOWN,
        level: ErrorLevel.ERROR,
        message: '自定义错误'
      };

      ErrorHandler.showError(error, {
        message: '自定义标题',
        duration: 10,
        placement: 'bottomRight'
      });

      expect(mockNotification.error).toHaveBeenCalledWith({
        message: '自定义标题',
        description: '自定义错误',
        placement: 'bottomRight',
        duration: 10
      });
    });
  });

  describe('showMessage', () => {
    test('应该显示成功消息', () => {
      ErrorHandler.showMessage('成功消息', 'success');
      expect(mockMessage.success).toHaveBeenCalledWith('成功消息');
    });

    test('应该显示错误消息', () => {
      ErrorHandler.showMessage('错误消息', 'error');
      expect(mockMessage.error).toHaveBeenCalledWith('错误消息');
    });

    test('应该显示警告消息', () => {
      ErrorHandler.showMessage('警告消息', 'warning');
      expect(mockMessage.warning).toHaveBeenCalledWith('警告消息');
    });

    test('应该显示默认信息消息', () => {
      ErrorHandler.showMessage('信息消息');
      expect(mockMessage.info).toHaveBeenCalledWith('信息消息');
    });
  });

  describe('showValidationErrors', () => {
    test('应该显示数组形式的验证错误', () => {
      const errors = {
        email: ['Email is required', 'Invalid format'],
        name: ['Name is required']
      };

      ErrorHandler.showValidationErrors(errors);

      expect(mockNotification.warning).toHaveBeenCalledWith({
        message: '表单验证错误',
        description: expect.any(Object),
        placement: 'topRight',
        duration: 6
      });
    });

    test('应该显示字符串形式的验证错误', () => {
      const errors = {
        email: 'Email is invalid',
        name: 'Name is required'
      };

      ErrorHandler.showValidationErrors(errors);

      expect(mockNotification.warning).toHaveBeenCalled();
    });
  });

  describe('handleAsyncError', () => {
    test('应该处理成功的异步操作', async () => {
      const successfulOperation = jest.fn().mockResolvedValue('success result');

      const result = await ErrorHandler.handleAsyncError(successfulOperation);

      expect(result).toBe('success result');
      expect(successfulOperation).toHaveBeenCalled();
    });

    test('应该处理失败的异步操作', async () => {
      const failingOperation = jest.fn().mockRejectedValue({
        response: {
          status: 500,
          data: { message: 'Server error' }
        }
      });

      const result = await ErrorHandler.handleAsyncError(failingOperation);

      expect(result).toBeNull();
      expect(mockNotification.error).toHaveBeenCalled();
    });

    test('应该支持自定义错误处理', async () => {
      const customErrorHandler = jest.fn();
      const failingOperation = jest.fn().mockRejectedValue(new Error('Test error'));

      await ErrorHandler.handleAsyncError(failingOperation, {
        onError: customErrorHandler,
        showError: false
      });

      expect(customErrorHandler).toHaveBeenCalledWith(expect.any(Object));
      expect(mockNotification.error).not.toHaveBeenCalled();
    });

    test('应该支持自定义错误消息', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Original error'));

      await ErrorHandler.handleAsyncError(failingOperation, {
        customMessage: '自定义错误消息'
      });

      expect(mockNotification.error).toHaveBeenCalledWith(
        expect.objectContaining({
          description: '自定义错误消息'
        })
      );
    });

    test('应该在认证错误时记录信息', async () => {
      const authError = {
        response: {
          status: 401,
          data: { code: 'UNAUTHORIZED', message: 'Token expired' }
        }
      };
      const failingOperation = jest.fn().mockRejectedValue(authError);

      await ErrorHandler.handleAsyncError(failingOperation);

      expect(consoleSpy).toHaveBeenCalledWith('需要重新登录');
    });
  });

  describe('全局错误处理器', () => {
    test('应该设置全局错误监听器', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

      ErrorHandler.setupGlobalErrorHandler();

      expect(addEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function));

      addEventListenerSpy.mockRestore();
    });
  });

  describe('快捷方法', () => {
    test('showError快捷方法应该工作', () => {
      showError('快捷错误消息');
      expect(mockNotification.error).toHaveBeenCalled();
    });

    test('showMessage快捷方法应该工作', () => {
      showMessage('快捷消息');
      expect(mockMessage.info).toHaveBeenCalled();
    });

    test('showValidationErrors快捷方法应该工作', () => {
      showValidationErrors({ field: 'error' });
      expect(mockNotification.warning).toHaveBeenCalled();
    });

    test('handleAsyncError快捷方法应该工作', async () => {
      const operation = jest.fn().mockResolvedValue('result');
      const result = await handleAsyncError(operation);
      expect(result).toBe('result');
    });

    test('parseApiError快捷方法应该工作', () => {
      const error = { code: 'TEST_ERROR' };
      const result = parseApiError(error);
      expect(result).toHaveProperty('type');
    });
  });

  describe('useErrorHandler Hook', () => {
    test('应该提供错误处理方法', () => {
      const { result } = renderHook(() => useErrorHandler());

      expect(result.current).toHaveProperty('handleError');
      expect(result.current).toHaveProperty('handleAsyncOperation');
      expect(result.current).toHaveProperty('showError');
      expect(result.current).toHaveProperty('showMessage');
      expect(result.current).toHaveProperty('showValidationErrors');
    });

    test('handleError应该解析并显示错误', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = { response: { status: 400, data: { message: 'Bad request' } } };

      act(() => {
        result.current.handleError(error);
      });

      expect(mockNotification.warning).toHaveBeenCalled();
    });

    test('handleAsyncOperation应该处理成功操作', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const successOperation = jest.fn().mockResolvedValue('success');
      const onSuccess = jest.fn();

      await act(async () => {
        const operationResult = await result.current.handleAsyncOperation(
          successOperation,
          { onSuccess }
        );
        expect(operationResult).toBe('success');
      });

      expect(onSuccess).toHaveBeenCalledWith('success');
    });

    test('handleAsyncOperation应该处理失败操作', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const failOperation = jest.fn().mockRejectedValue(new Error('Fail'));
      const onError = jest.fn();

      await act(async () => {
        const operationResult = await result.current.handleAsyncOperation(
          failOperation,
          { onError }
        );
        expect(operationResult).toBeNull();
      });

      expect(onError).toHaveBeenCalled();
    });
  });

  describe('useFormErrorHandler Hook', () => {
    test('应该提供表单错误处理方法', () => {
      const { result } = renderHook(() => useFormErrorHandler());

      expect(result.current).toHaveProperty('handleFormSubmitError');
      expect(result.current).toHaveProperty('handleError');
    });

    test('应该处理表单验证错误', () => {
      const { result } = renderHook(() => useFormErrorHandler());
      const mockForm = {
        setFields: jest.fn()
      };
      
      const validationError = {
        response: {
          status: 422,
          data: {
            validation_errors: {
              email: ['Invalid email'],
              name: ['Required']
            }
          }
        }
      };

      act(() => {
        result.current.handleFormSubmitError(validationError, mockForm);
      });

      expect(mockForm.setFields).toHaveBeenCalledWith([
        { name: 'email', errors: ['Invalid email'] },
        { name: 'name', errors: ['Required'] }
      ]);
    });

    test('应该处理非验证错误', () => {
      const { result } = renderHook(() => useFormErrorHandler());
      const serverError = {
        response: {
          status: 500,
          data: { message: 'Server error' }
        }
      };

      act(() => {
        result.current.handleFormSubmitError(serverError);
      });

      expect(mockNotification.error).toHaveBeenCalled();
    });
  });
});