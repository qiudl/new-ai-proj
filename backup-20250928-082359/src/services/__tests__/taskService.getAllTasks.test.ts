import { TaskService } from '../taskService';

const mockGet = jest.fn().mockResolvedValue({
  data: [],
  pagination: {
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false,
  },
});

jest.mock('../api', () => ({
  __esModule: true,
  default: { get: (...args: any[]) => mockGet(...args) },
}));

describe('TaskService.getAllTasks param mapping (Alpha)', () => {
  beforeEach(() => {
    mockGet.mockClear();
  });

  it('maps q to search and does not force default preset', async () => {
    await TaskService.getAllTasks({
      status: 'in_progress' as any,
      priority: 'high',
      assignee_id: 42,
      q: 'foo',
      page: 2,
      page_size: 30,
    } as any);

    expect(mockGet).toHaveBeenCalledTimes(1);
    const [url, opts] = mockGet.mock.calls[0];
    expect(url).toBe('/tasks');
    expect(opts).toBeTruthy();
    const params = (opts as any).params || {};
    // Should not include a default preset unless explicitly provided by caller
    expect(params.preset).toBeUndefined();
    // 'q' should be mapped to 'search' for backend
    expect(params).toMatchObject({
      status: 'in_progress',
      priority: 'high',
      assignee_id: 42,
      search: 'foo',
      page: 2,
      page_size: 30,
    });
  });
});
