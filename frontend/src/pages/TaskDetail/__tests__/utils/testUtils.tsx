/**
 * Test utility functions for TaskDetail module
 */

import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { Task, TaskDocument, TaskStatus, TaskPriority } from '../../types';

// ========== Test Wrapper Components ==========

interface TestProviderProps {
  children: ReactNode;
  initialEntries?: string[];
  queryClient?: QueryClient;
}

/**
 * All-in-one provider wrapper for tests
 */
export const TestProvider: React.FC<TestProviderProps> = ({ 
  children, 
  initialEntries = ['/'],
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })
}) => {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider locale={{ locale: 'en' }}>
          {children}
        </ConfigProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

// ========== Custom Render Functions ==========

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
  queryClient?: QueryClient;
}

/**
 * Custom render function with all providers
 */
export const renderWithProviders = (
  ui: ReactElement,
  options?: CustomRenderOptions
): RenderResult => {
  const { initialEntries, queryClient, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => (
      <TestProvider initialEntries={initialEntries} queryClient={queryClient}>
        {children}
      </TestProvider>
    ),
    ...renderOptions
  });
};

// ========== Mock Data Generators ==========

let idCounter = 1;

/**
 * Generate a mock Task object
 */
export const createMockTask = (overrides?: Partial<Task>): Task => ({
  id: idCounter++,
  project_id: 1,
  title: `Test Task ${idCounter}`,
  description: 'Test task description',
  status: 'todo' as TaskStatus,
  priority: 'medium' as TaskPriority,
  assignee_id: 1,
  parent_id: undefined,
  due_date: '2024-12-31',
  tags: ['test'],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  task_level: 1,
  sort_order: 0,
  children_count: 0,
  depth: 0,
  has_children: false,
  estimated_hours: 8,
  actual_hours: 0,
  completion_percentage: 0,
  ...overrides
});

/**
 * Generate a mock TaskDocument object
 */
export const createMockDocument = (overrides?: Partial<TaskDocument>): TaskDocument => ({
  id: idCounter++,
  task_id: 1,
  project_id: 1,
  title: `Test Document ${idCounter}`,
  content: '# Test Document\n\nThis is test content.',
  type: 'general',
  format: 'markdown',
  status: 'draft',
  version: 1,
  size: 1024,
  created_by: 1,
  created_by_name: 'Test User',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  tags: ['test'],
  visibility: 'team',
  is_template: false,
  ...overrides
});

/**
 * Generate multiple mock tasks
 */
export const createMockTasks = (count: number, overrides?: Partial<Task>): Task[] => {
  return Array.from({ length: count }, () => createMockTask(overrides));
};

/**
 * Generate a task hierarchy
 */
export const createMockTaskHierarchy = (depth: number = 3, breadth: number = 2): Task[] => {
  const tasks: Task[] = [];
  
  const createLevel = (parentId: number | undefined, level: number) => {
    if (level > depth) return;
    
    for (let i = 0; i < breadth; i++) {
      const task = createMockTask({
        parent_id: parentId,
        task_level: level,
        depth: level,
        has_children: level < depth,
        children_count: level < depth ? breadth : 0
      });
      
      tasks.push(task);
      
      if (level < depth) {
        createLevel(task.id, level + 1);
      }
    }
  };
  
  createLevel(undefined, 1);
  return tasks;
};

// ========== Async Test Helpers ==========

/**
 * Wait for async operations with timeout
 */
export const waitForAsync = (ms: number = 100): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry assertion until it passes or timeout
 */
export const retryAssertion = async (
  assertion: () => void | Promise<void>,
  timeout: number = 3000,
  interval: number = 100
): Promise<void> => {
  const startTime = Date.now();
  let lastError: Error | undefined;

  while (Date.now() - startTime < timeout) {
    try {
      await assertion();
      return;
    } catch (error) {
      lastError = error as Error;
      await waitForAsync(interval);
    }
  }

  throw lastError || new Error('Assertion timeout');
};

// ========== Mock API Responses ==========

export const mockApiSuccess = <T>(data: T, delay: number = 0) => {
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

// ========== Event Simulation Helpers ==========

/**
 * Simulate file upload
 */
export const createMockFile = (
  name: string = 'test.txt',
  size: number = 1024,
  type: string = 'text/plain'
): File => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

/**
 * Simulate drag event
 */
export const createDragEvent = (files: File[]): Partial<DragEvent> => ({
  dataTransfer: {
    files: files as any,
    items: files.map(file => ({
      kind: 'file',
      type: file.type,
      getAsFile: () => file
    })) as any,
    types: ['Files'],
    dropEffect: 'copy',
    effectAllowed: 'all',
    clearData: jest.fn(),
    getData: jest.fn(),
    setData: jest.fn(),
    setDragImage: jest.fn()
  } as any,
  preventDefault: jest.fn(),
  stopPropagation: jest.fn()
});

// ========== Assertion Helpers ==========

/**
 * Assert element has specific styles
 */
export const expectStyles = (element: HTMLElement, styles: Partial<CSSStyleDeclaration>) => {
  Object.entries(styles).forEach(([key, value]) => {
    expect(element.style[key as any]).toBe(value);
  });
};

/**
 * Assert element has specific classes
 */
export const expectClasses = (element: HTMLElement, ...classes: string[]) => {
  classes.forEach(className => {
    expect(element).toHaveClass(className);
  });
};

// ========== Debug Helpers ==========

/**
 * Pretty print component tree for debugging
 */
export const debugComponent = (container: HTMLElement) => {
  console.log('=== Component Debug Output ===');
  console.log(container.innerHTML.replace(/>/g, '>\n'));
  console.log('==============================');
};

/**
 * Log all data-testid elements
 */
export const logTestIds = (container: HTMLElement) => {
  const elements = container.querySelectorAll('[data-testid]');
  console.log('=== Available Test IDs ===');
  elements.forEach(el => {
    console.log(`- ${el.getAttribute('data-testid')}`);
  });
  console.log('==========================');
};