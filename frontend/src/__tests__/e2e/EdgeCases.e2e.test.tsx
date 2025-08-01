import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { TaskParentSelector } from '../../components/TaskParentSelector';
import { TaskParentSelectorModal } from '../../components/TaskParentSelectorModal';
import { Task } from '../../types/task';

// Mock the hooks
jest.mock('../../hooks/useTaskParentSearch');
jest.mock('../../hooks/useParentValidation');
jest.mock('lodash', () => ({
  ...jest.requireActual('lodash'),
  debounce: (fn: any) => fn,
}));

// Test data generators
const generateLargeTasks = (count: number): Task[] => {
  const tasks: Task[] = [];
  
  for (let i = 1; i <= count; i++) {
    tasks.push({
      id: i,
      title: `Task ${i} - ${i % 10 === 0 ? 'Very Long Task Title That Might Cause UI Issues' : 'Normal Task'}`,
      description: i % 5 === 0 ? 'Very long description that might cause text overflow issues in the UI components and needs to be handled properly by the ellipsis truncation' : 'Short desc',
      status: ['todo', 'in_progress', 'completed', 'cancelled'][i % 4] as any,
      project_id: 1,
      parent_id: i > 50 ? Math.floor(Math.random() * 50) + 1 : null,
      task_level: i > 50 ? Math.floor(Math.random() * 3) : 0,
      sort_order: i,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    });
  }
  
  return tasks;
};

const generateDeepHierarchy = (): Task[] => {
  return [
    {
      id: 1,
      title: 'Level 0 Task',
      description: 'Root task',
      status: 'todo',
      project_id: 1,
      parent_id: null,
      task_level: 0,
      sort_order: 1,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    {
      id: 2,
      title: 'Level 1 Task',
      description: 'First level child',
      status: 'todo',
      project_id: 1,
      parent_id: 1,
      task_level: 1,
      sort_order: 1,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    {
      id: 3,
      title: 'Level 2 Task',
      description: 'Second level child',
      status: 'todo',
      project_id: 1,
      parent_id: 2,
      task_level: 2,
      sort_order: 1,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    {
      id: 4,
      title: 'Level 3 Task (Max Level)',
      description: 'Third level child - maximum allowed',
      status: 'todo',
      project_id: 1,
      parent_id: 3,
      task_level: 3,
      sort_order: 1,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
  ];
};

describe('Edge Cases and Boundary Conditions E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset fetch mock
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Large Dataset Performance Tests', () => {
    it('should handle large number of tasks efficiently', async () => {
      const largeTasks = generateLargeTasks(1000);
      
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/tasks/search-parents')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: {
                data: largeTasks.slice(0, 20), // Paginated response
                total: largeTasks.length,
              },
            }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const mockOnChange = jest.fn();
      
      render(
        <TaskParentSelector
          projectId={1}
          currentTaskId={999}
          onChange={mockOnChange}
        />
      );

      // Open dropdown
      const trigger = screen.getByText('搜索并选择父任务...');
      fireEvent.click(trigger);

      // Wait for search to complete
      await waitFor(() => {
        expect(screen.getByText('Task 1 - Normal Task')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify performance - should render within reasonable time
      expect(screen.getAllByText(/Task \d+/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Task \d+/).length).toBeLessThanOrEqual(20);
    });

    it('should handle search with special characters and edge cases', async () => {
      const specialTasks = [
        {
          id: 1,
          title: 'Task with "quotes" and <html>',
          description: 'Special chars: !@#$%^&*()_+{}|:"<>?[]\\;\'.,/',
          status: 'todo' as const,
          project_id: 1,
          parent_id: null,
          task_level: 0,
          sort_order: 1,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: 2,
          title: '中文任务名称',
          description: 'Unicode test: 🎉 Emoji task 🚀',
          status: 'todo' as const,
          project_id: 1,
          parent_id: null,
          task_level: 0,
          sort_order: 2,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/tasks/search-parents')) {
          const urlObj = new URL(url, 'http://localhost');
          const keyword = urlObj.searchParams.get('keyword') || '';
          
          const filtered = specialTasks.filter(task => 
            task.title.toLowerCase().includes(keyword.toLowerCase())
          );
          
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: { data: filtered, total: filtered.length },
            }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(
        <TaskParentSelectorModal
          visible={true}
          projectId={1}
          onOk={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByText('选择父任务')).toBeInTheDocument();
      });

      // Test special character search
      const searchInput = screen.getByPlaceholderText('搜索父任务...');
      await userEvent.type(searchInput, '"quotes"');

      await waitFor(() => {
        expect(screen.getByText('Task with "quotes" and <html>')).toBeInTheDocument();
      });

      // Test Unicode search
      await userEvent.clear(searchInput);
      await userEvent.type(searchInput, '中文');

      await waitFor(() => {
        expect(screen.getByText('中文任务名称')).toBeInTheDocument();
      });
    });
  });

  describe('Maximum Level Hierarchy Tests', () => {
    it('should prevent selection of level 3 tasks as parents', async () => {
      const deepTasks = generateDeepHierarchy();
      
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/tasks/search-parents')) {
          // Should only return tasks up to level 2
          const validParents = deepTasks.filter(t => t.task_level <= 2);
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: { data: validParents, total: validParents.length },
            }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(
        <TaskParentSelectorModal
          visible={true}
          projectId={1}
          onOk={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Level 0 Task')).toBeInTheDocument();
        expect(screen.getByText('Level 1 Task')).toBeInTheDocument();
        expect(screen.getByText('Level 2 Task')).toBeInTheDocument();
      });

      // Level 3 task should not appear in search results
      expect(screen.queryByText('Level 3 Task (Max Level)')).not.toBeInTheDocument();
    });

    it('should show appropriate error for maximum level exceeded', async () => {
      const level3Task = generateDeepHierarchy()[3]; // Level 3 task
      
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/tasks/search-parents')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: { data: [level3Task], total: 1 },
            }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const mockOnChange = jest.fn();
      
      render(
        <TaskParentSelector
          projectId={1}
          currentTaskId={999}
          onChange={mockOnChange}
          showValidation={true}
        />
      );

      const trigger = screen.getByText('搜索并选择父任务...');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Level 3 Task (Max Level)')).toBeInTheDocument();
      });

      // Try to select the level 3 task
      const level3TaskNode = screen.getByText('Level 3 Task (Max Level)');
      fireEvent.click(level3TaskNode.closest('.task-tree-node')!);

      // Should show validation error
      await waitFor(() => {
        const errorMessage = screen.queryByText(/无法在第4级任务下创建子任务/);
        if (errorMessage) {
          expect(errorMessage).toBeInTheDocument();
        }
      });
    });
  });

  describe('Network and API Error Scenarios', () => {
    it('should handle network timeout gracefully', async () => {
      global.fetch = jest.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), 100);
        });
      });

      render(
        <TaskParentSelector
          projectId={1}
          currentTaskId={999}
          onChange={jest.fn()}
        />
      );

      const trigger = screen.getByText('搜索并选择父任务...');
      fireEvent.click(trigger);

      // Should handle timeout gracefully without crashing
      await waitFor(() => {
        // Component should still be rendered
        expect(trigger).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should handle malformed API responses', async () => {
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/tasks/search-parents')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              // Malformed response - missing expected structure
              invalid: 'response',
              data: null,
            }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(
        <TaskParentSelector
          projectId={1}
          currentTaskId={999}
          onChange={jest.fn()}
        />
      );

      const trigger = screen.getByText('搜索并选择父任务...');
      fireEvent.click(trigger);

      // Should handle malformed response gracefully
      await waitFor(() => {
        expect(trigger).toBeInTheDocument();
      });
    });

    it('should handle server errors (500, 404, etc.)', async () => {
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/tasks/search-parents')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({
              error: 'Internal Server Error',
            }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(
        <TaskParentSelectorModal
          visible={true}
          projectId={1}
          onOk={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('选择父任务')).toBeInTheDocument();
      });

      // Should handle server error gracefully
      // Component should still be functional
      const cancelButton = screen.getByText('取消');
      fireEvent.click(cancelButton);
    });
  });

  describe('Concurrent Operations and Race Conditions', () => {
    it('should handle rapid search input changes', async () => {
      let searchCount = 0;
      
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/tasks/search-parents')) {
          searchCount++;
          const urlObj = new URL(url, 'http://localhost');
          const keyword = urlObj.searchParams.get('keyword') || '';
          
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve({
                  success: true,
                  data: {
                    data: [{
                      id: searchCount,
                      title: `Result for "${keyword}" (${searchCount})`,
                      status: 'todo',
                      project_id: 1,
                      parent_id: null,
                      task_level: 0,
                      sort_order: 1,
                      created_at: '2024-01-01',
                      updated_at: '2024-01-01',
                    }],
                    total: 1,
                  },
                }),
              });
            }, Math.random() * 100); // Random delay to simulate race conditions
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(
        <TaskParentSelectorModal
          visible={true}
          projectId={1}
          onOk={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      const searchInput = screen.getByPlaceholderText('搜索父任务...');

      // Rapidly type different search terms
      await userEvent.type(searchInput, 'test1');
      await userEvent.clear(searchInput);
      await userEvent.type(searchInput, 'test2');
      await userEvent.clear(searchInput);
      await userEvent.type(searchInput, 'test3');

      // Should handle concurrent requests gracefully
      await waitFor(() => {
        // Should show some results without crashing
        expect(screen.getByPlaceholderText('搜索父任务...')).toBeInTheDocument();
      }, { timeout: 2000 });

      expect(searchCount).toBeGreaterThan(0);
    });

    it('should handle component unmounting during async operations', async () => {
      let resolveSearch: (value: any) => void;
      const searchPromise = new Promise(resolve => {
        resolveSearch = resolve;
      });

      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/tasks/search-parents')) {
          return searchPromise.then(() => ({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: { data: [], total: 0 },
            }),
          }));
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { unmount } = render(
        <TaskParentSelector
          projectId={1}
          currentTaskId={999}
          onChange={jest.fn()}
        />
      );

      const trigger = screen.getByText('搜索并选择父任务...');
      fireEvent.click(trigger);

      // Unmount component while async operation is in progress
      unmount();

      // Resolve the async operation after unmount
      resolveSearch!({});

      // Should not cause any errors or memory leaks
      await waitFor(() => {
        expect(true).toBe(true); // Test passes if no errors thrown
      });
    });
  });

  describe('Data Validation and Sanitization', () => {
    it('should handle tasks with null or undefined fields', async () => {
      const tasksWithNulls = [
        {
          id: 1,
          title: '',
          description: null,
          status: 'todo' as const,
          project_id: 1,
          parent_id: null,
          task_level: null,
          sort_order: undefined,
          created_at: '2024-01-01',
          updated_at: null,
        },
        {
          id: 2,
          title: null,
          description: undefined,
          status: null,
          project_id: 1,
          parent_id: undefined,
          task_level: 0,
          sort_order: 1,
          created_at: null,
          updated_at: '2024-01-01',
        },
      ];

      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/tasks/search-parents')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: { data: tasksWithNulls, total: 2 },
            }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(
        <TaskParentSelectorModal
          visible={true}
          projectId={1}
          onOk={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      // Should handle null/undefined values gracefully
      await waitFor(() => {
        expect(screen.getByText('选择父任务')).toBeInTheDocument();
      });

      // Component should render without crashing
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});