import { TaskService } from '../taskService';

const getMock = jest.fn().mockResolvedValue({
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
  default: { get: (...args: any[]) => getMock(...args) },
}));

describe('TaskService.getAllTasks param mapping (Alpha)', () => {
  beforeEach(() => {
    getMock.mockClear();
  });

  it('passes preset and filters to /tasks', async () => {
    await TaskService.getAllTasks({
      status: 'in_progress' as any,
      priority: 'high',
      assignee_id: 42,
      q: 'foo',
      page: 2,
      page_size: 30,
    } as any);

    expect(getMock).toHaveBeenCalledTimes(1);
    const [url, opts] = getMock.mock.calls[0];
    expect(url).toBe('/tasks');
    expect(opts).toBeTruthy();
    const params = (opts as any).params || {};
    expect(params).toMatchObject({
      preset: 'overdue',
      status: 'in_progress',
      priority: 'high',
      assignee_id: 42,
      q: 'foo',
      page: 2,
      page_size: 30,
    });
  });
});
