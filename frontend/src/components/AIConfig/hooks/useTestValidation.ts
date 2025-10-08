import { useState, useCallback } from 'react';
import { message } from 'antd';
import { AIConfigTestService } from '@/services/aiConfigTestService';
import type { ValidationTestRequest, ValidationTestResponse } from '@/types/aiConfig';

export interface UseTestValidationReturn {
  validating: boolean;
  validationResult: ValidationTestResponse | null;
  performValidation: (request: ValidationTestRequest) => Promise<boolean>;
  resetValidation: () => void;
}

export function useTestValidation(): UseTestValidationReturn {
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationTestResponse | null>(null);

  /**
   * 执行验证测试
   */
  const performValidation = useCallback(async (request: ValidationTestRequest): Promise<boolean> => {
    setValidating(true);
    setValidationResult(null);

    try {
      const result = await AIConfigTestService.performValidationTest(request);
      setValidationResult(result);

      if (result.success) {
        message.success('验证测试成功');
        return true;
      } else {
        message.error(`验证测试失败: ${result.error || '未知错误'}`);
        return false;
      }
    } catch (error) {
      console.error('Validation test failed:', error);
      const errorResult: ValidationTestResponse = {
        success: false,
        responseTime: 0,
        error: error instanceof Error ? error.message : '验证测试失败'
      };
      setValidationResult(errorResult);
      message.error('验证测试失败');
      return false;
    } finally {
      setValidating(false);
    }
  }, []);

  /**
   * 重置验证状态
   */
  const resetValidation = useCallback(() => {
    setValidationResult(null);
  }, []);

  return {
    validating,
    validationResult,
    performValidation,
    resetValidation
  };
}
