import { useCallback } from 'react';
import api from '../services/api';
import { logApiError } from '../utils/logger';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  errorCode?: string;
}

export interface UseParentValidationReturn {
  validateParentSelection: (taskId: number | undefined, parentId: number | undefined) => Promise<ValidationResult>;
  validateTaskLevel: (parentLevel: number | undefined) => ValidationResult;
}

/**
 * Hook for validating parent task selection
 * Provides client-side and server-side validation
 */
export const useParentValidation = (): UseParentValidationReturn => {
  /**
   * Validate parent task selection (including circular dependency check)
   */
  const validateParentSelection = useCallback(async (
    taskId: number | undefined,
    parentId: number | undefined
  ): Promise<ValidationResult> => {
    try {
      // Allow clearing parent (setting to null/undefined)
      if (!parentId) {
        return { isValid: true };
      }

      // Prevent self-reference
      if (taskId && taskId === parentId) {
        return {
          isValid: false,
          error: '任务不能将自己设为父任务',
          errorCode: 'SELF_REFERENCE',
        };
      }

      // Server-side circular dependency check (only if task already exists)
      if (taskId) {
        const response = await api.post('/tasks/validate-parent', {
          taskId,
          parentId,
        });

        // response is already unwrapped by axios interceptor
        const { hasCircularDependency, error } = response as unknown as { hasCircularDependency: boolean, error?: string };
        if (hasCircularDependency) {
          return {
            isValid: false,
            error: error || '选择的父任务会创建循环依赖',
            errorCode: 'CIRCULAR_DEPENDENCY',
          };
        }
      }

      return { isValid: true };

    } catch (error) {
      logApiError('validateParentSelection', error, { taskId, parentId });
      
      return {
        isValid: false,
        error: '验证过程中发生错误，请重试',
        errorCode: 'VALIDATION_ERROR',
      };
    }
  }, []);

  /**
   * Validate task level based on parent level
   */
  const validateTaskLevel = useCallback((parentLevel: number | undefined): ValidationResult => {
    // Root task (no parent)
    if (parentLevel === undefined || parentLevel === null) {
      return { isValid: true };
    }

    // Check if parent level allows adding children
    if (parentLevel >= 3) {
      return {
        isValid: false,
        error: '无法在第4级任务下创建子任务（系统支持最多4级）',
        errorCode: 'MAX_LEVEL_EXCEEDED',
      };
    }

    return { isValid: true };
  }, []);

  return {
    validateParentSelection,
    validateTaskLevel,
  };
};