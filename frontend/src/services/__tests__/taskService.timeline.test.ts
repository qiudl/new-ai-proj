import { TaskService } from '../taskService';
import { TimelineEvent } from '../../types/task';

const mockGet = jest.fn();

jest.mock('../api', () => ({
  __esModule: true,
  default: { get: (...args: any[]) => mockGet(...args) },
}));

describe('TaskService timeline response parsing', () => {
  const sampleEvent: TimelineEvent = {
    id: 101,
    task_id: 555,
    event_type: 'created',
    event_date: '2025-09-12T00:00:00Z',
    description: 'Task created',
    username: 'Alice',
  };

  const sampleEvent2: TimelineEvent = {
    id: 102,
    task_id: 555,
    event_type: 'updated',
    event_date: '2025-09-12T01:00:00Z',
    description: 'Task updated',
    username: 'Bob',
  };

  beforeEach(() => {
    mockGet.mockReset();
  });

  describe('getTaskTimeline', () => {
    const pid = 1;
    const tid = 555;
    const params = { page: 1, page_size: 50 } as any;

    it('handles wrapped array payload: { success, data: TimelineEvent[] }', async () => {
      mockGet.mockResolvedValueOnce({ success: true, data: [sampleEvent, sampleEvent2] });
      const res = await TaskService.getTaskTimeline(pid, tid, params);
      expect(res.data).toHaveLength(2);
      expect(res.data[0].id).toBe(101);
      expect(res.pagination.page).toBe(1);
      expect(res.pagination.page_size).toBe(50);
    });

    it('handles wrapped object payload with data+pagination', async () => {
      const pagination = { page: 2, page_size: 10, total: 1, total_pages: 1, has_next: false, has_prev: false };
      mockGet.mockResolvedValueOnce({ success: true, data: { data: [sampleEvent], pagination } });
      const res = await TaskService.getTaskTimeline(pid, tid, { page: 2, page_size: 10 } as any);
      expect(res.data).toHaveLength(1);
      expect(res.data[0].id).toBe(101);
      expect(res.pagination).toEqual(pagination);
    });

    it('handles wrapped object payload with events+pagination', async () => {
      const pagination = { page: 1, page_size: 20, total: 2, total_pages: 1, has_next: false, has_prev: false };
      mockGet.mockResolvedValueOnce({ success: true, data: { events: [sampleEvent, sampleEvent2], pagination } });
      const res = await TaskService.getTaskTimeline(pid, tid, { page: 1, page_size: 20 } as any);
      expect(res.data).toHaveLength(2);
      expect(res.pagination).toEqual(pagination);
    });

    it('handles unwrapped direct array', async () => {
      mockGet.mockResolvedValueOnce([sampleEvent]);
      const res = await TaskService.getTaskTimeline(pid, tid, params);
      expect(res.data).toHaveLength(1);
      expect(res.data[0].description).toBe('Task created');
      expect(res.pagination.page_size).toBe(50);
    });

    it('handles unwrapped PaginatedResponse { data, pagination }', async () => {
      const pagination = { page: 3, page_size: 5, total: 1, total_pages: 1, has_next: false, has_prev: false };
      mockGet.mockResolvedValueOnce({ data: [sampleEvent], pagination });
      const res = await TaskService.getTaskTimeline(pid, tid, { page: 3, page_size: 5 } as any);
      expect(res.data).toHaveLength(1);
      expect(res.pagination).toEqual(pagination);
    });

    it('handles nested { data: { data, pagination } }', async () => {
      const pagination = { page: 1, page_size: 10, total: 1, total_pages: 1, has_next: false, has_prev: false };
      mockGet.mockResolvedValueOnce({ data: { data: [sampleEvent], pagination } });
      const res = await TaskService.getTaskTimeline(pid, tid, { page: 1, page_size: 10 } as any);
      expect(res.data).toHaveLength(1);
      expect(res.pagination).toEqual(pagination);
    });

    it('handles wrapped null data with pagination -> returns empty data', async () => {
      const pagination = { page: 1, page_size: 50, total: 0, total_pages: 0, has_next: false, has_prev: false };
      mockGet.mockResolvedValueOnce({ success: true, data: { data: null, pagination, message: 'ok' } });
      const res = await TaskService.getTaskTimeline(pid, tid, params);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBe(0);
      // pagination may be computed fallback; just ensure it exists and has page/page_size
      expect(res.pagination.page).toBe(1);
      expect(res.pagination.page_size).toBe(50);
    });

    it('handles unknown shapes gracefully -> empty data', async () => {
      mockGet.mockResolvedValueOnce({ some: 'unknown' });
      const res = await TaskService.getTaskTimeline(pid, tid, params);
      expect(res.data).toEqual([]);
      expect(res.pagination.page).toBe(1);
    });
  });

  describe('getProjectTimeline', () => {
    const pid = 1;

    it('handles wrapped array payload for project timeline', async () => {
      mockGet.mockResolvedValueOnce({ success: true, data: [sampleEvent] });
      const res = await TaskService.getProjectTimeline(pid, { page: 1, page_size: 25 } as any);
      expect(res.data.length).toBe(1);
      expect(res.pagination.page_size).toBe(25);
    });

    it('handles unwrapped { events, pagination } for project timeline', async () => {
      const pagination = { page: 2, page_size: 10, total: 2, total_pages: 1, has_next: false, has_prev: false };
      mockGet.mockResolvedValueOnce({ events: [sampleEvent, sampleEvent2], pagination });
      const res = await TaskService.getProjectTimeline(pid, { page: 2, page_size: 10 } as any);
      expect(res.data.length).toBe(2);
      expect(res.pagination).toEqual(pagination);
    });
  });
});

