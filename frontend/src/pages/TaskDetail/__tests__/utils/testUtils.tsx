/**
 * 测试工具函数
 * 提供通用的测试辅助功能
 */

import React from 'react';
import { render } from '@testing-library/react';

// 简单的测试工具函数
export const createMockTask = (overrides = {}) => ({
  id: 1,
  title: '测试任务',
  description: '测试描述',
  status: 'todo',
  ...overrides
});

export const mockApiSuccess = (data: any, delay: number = 0) => {
  return jest.fn().mockImplementation(() => 
    delay > 0 
      ? new Promise(resolve => setTimeout(() => resolve({ success: true, data }), delay))
      : Promise.resolve({ success: true, data })
  );
};

export const mockApiError = (message: string = 'API Error', code: string = 'ERROR') => {
  return jest.fn().mockRejectedValue({
    response: {
      status: 400,
      data: {
        success: false,
        error: { code, message }
      }
    }
  });
};

// 简化的测试渲染函数
export const renderWithProviders = (ui: React.ReactElement) => {
  return render(ui);
};