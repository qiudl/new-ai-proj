import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import TaskDetailPage from '../TaskDetailPageNew';
import { TaskService } from '../../services/taskService';

// Mock lightweight child components and contexts to reduce render surface
jest.mock('../../components/MVPTaskDetailTimer', () => () => <div data-testid="mock-timer" />);
jest.mock('../../components/TaskDetailDescendantsTreeV2', () => ({
  TaskDetailDescendantsTreeV2: () => <div data-testid="mock-tree" />,
}));
jest.mock('../../components/UnifiedTaskDocumentArea', () => () => <div data-testid="mock-doc-area" />);
jest.mock('../../components/TaskDetailRelations', () => () => <div data-testid="mock-relations" />);
jest.mock('../../components/TaskInfoEditor', () => () => <div data-testid="mock-info-editor" />);
jest.mock('../../components/TaskDocumentWidget', () => () => <div data-testid="mock-doc-widget" />);
// Mock components that pull in ESM-only deps (react-markdown etc.)
jest.mock('../../components/TaskModal', () => () => <div data-testid="mock-task-modal" />);
jest.mock('../../components/TaskSummaryEditor', () => () => <div data-testid="mock-summary-editor" />);
jest.mock('../../components/MarkdownRenderer', () => () => <div data-testid="mock-markdown" />);
// Mock Timer context
jest.mock('../../contexts/TimerContext', () => ({ useTimer: () => ({ refreshTimer: jest.fn() }) }));

// Mock axios-based API module to avoid ESM transform issues in tests
jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  },
}));

// Mock services used by the page
jest.mock('../../services/projectService', () => ({
  projectService: {
    getProject: jest.fn().mockResolvedValue({ id: 1, name: 'Demo Project' }),
  },
}));

// Helper to mount the page under route
function renderWithRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/projects/:projectId/tasks/:taskId" element={<TaskDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

// Build a minimal Task object compatible with page usage
const baseTask = {
  id: 555,
  project_id: 1,
  title: '修复时间线显示',
  description: '',
  status: 'todo',
  custom_fields: {},
  task_level: 0,
  sort_order: 0,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

const sampleEvent = {
  id: 101,
  task_id: 555,
  event_type: 'created',
  event_date: '2025-09-12T00:00:00Z',
  description: 'Task created',
  username: 'Alice',
};

describe('TaskDetailPageNew timeline integration', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('shows empty state when timeline returns wrapped null data', async () => {
    // Arrange mocks
    jest.spyOn(TaskService, 'getTask' as any).mockResolvedValue(baseTask);
    jest.spyOn(TaskService, 'getTaskChildren' as any).mockResolvedValue([]);
    jest.spyOn(TaskService, 'getTaskUpdates' as any).mockResolvedValue({ data: [], pagination: { page: 1, page_size: 20, total: 0, total_pages: 0, has_next: false, has_prev: false } });
    // Simulate backend-style payload that contains data: null
    jest
      .spyOn(TaskService, 'getTaskTimeline' as any)
      .mockResolvedValue({ success: true, data: { data: null, pagination: { page: 1, page_size: 50, total: 0, total_pages: 0, has_next: false, has_prev: false }, message: 'ok' } });

    // Act
    renderWithRoute('/projects/1/tasks/555');

    // Assert - wait for the empty timeline placeholder to show up
    await waitFor(() => {
      expect(screen.getByText('暂无时间线数据')).toBeInTheDocument();
    });
  });

  it('renders timeline events when service returns data array', async () => {
    // Arrange mocks
    jest.spyOn(TaskService, 'getTask' as any).mockResolvedValue(baseTask);
    jest.spyOn(TaskService, 'getTaskChildren' as any).mockResolvedValue([]);
    jest.spyOn(TaskService, 'getTaskUpdates' as any).mockResolvedValue({ data: [], pagination: { page: 1, page_size: 20, total: 0, total_pages: 0, has_next: false, has_prev: false } });
    // Return normalized PaginatedResponse shape
    jest
      .spyOn(TaskService, 'getTaskTimeline' as any)
      .mockResolvedValue({ data: [sampleEvent], pagination: { page: 1, page_size: 20, total: 1, total_pages: 1, has_next: false, has_prev: false } });

    // Act
    renderWithRoute('/projects/1/tasks/555');

    // Assert - the event description should appear
    await waitFor(() => {
      expect(screen.getByText('Task created')).toBeInTheDocument();
    });
  });
});

