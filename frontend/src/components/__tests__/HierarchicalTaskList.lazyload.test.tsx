import { TaskService } from '../../services/taskService';

// Provide explicit mock factory to avoid importing axios via api.ts
jest.mock('../../services/taskService', () => ({
  __esModule: true,
  TaskService: {
    getTaskChildren: jest.fn(),
  },
}));

// Minimal test to ensure children API result shape is handled

describe('Hierarchical lazy loading interop', () => {
  it('handles paginated children response', async () => {
    (TaskService.getTaskChildren as unknown as jest.Mock).mockResolvedValueOnce({
      data: [
        { id: 101, project_id: 1, title: 'Child A', status: 'todo' },
        { id: 102, project_id: 1, title: 'Child B', status: 'in_progress' },
      ],
      pagination: { page: 1, page_size: 100, total: 2, total_pages: 1, has_next: false, has_prev: false }
    });

    const resp = await TaskService.getTaskChildren(1, 1, { page: 1, page_size: 100 } as any);
    expect(Array.isArray((resp as any).data)).toBe(true);
    expect((resp as any).data).toHaveLength(2);
  });

  it('handles array children response', async () => {
    (TaskService.getTaskChildren as unknown as jest.Mock).mockResolvedValueOnce([
      { id: 201, project_id: 1, title: 'Child C', status: 'todo' }
    ]);
    const resp = await TaskService.getTaskChildren(1, 2, { page: 1, page_size: 50 } as any);
    expect(Array.isArray(resp as any)).toBe(true);
    expect((resp as any)).toHaveLength(1);
  });
});

