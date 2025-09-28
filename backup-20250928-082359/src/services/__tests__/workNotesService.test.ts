import { workNotesService } from '../workNotesService';
import api from '../api';

jest.mock('../api');

const mockApi = api as jest.Mocked<typeof api>;

describe('workNotesService routes', () => {
  beforeEach(() => {
    mockApi.post.mockReset();
  });

  it('calls POST /work-notes/:id/copy when copying a note', async () => {
    const id = 123;
    mockApi.post.mockResolvedValueOnce({ data: { success: true, message: 'ok', data: { id: 456 } } });

    const res = await workNotesService.copyWorkNote(id);
    expect(mockApi.post).toHaveBeenCalledWith(`/work-notes/${id}/copy`, {});
    expect(res).toBeTruthy();
  });

  it('calls POST /work-notes/:id/toggle-template when toggling template', async () => {
    const id = 789;
    mockApi.post.mockResolvedValueOnce({ data: { success: true, message: 'ok', data: { id } } });

    const res = await workNotesService.toggleTemplate(id);
    expect(mockApi.post).toHaveBeenCalledWith(`/work-notes/${id}/toggle-template`, {});
    expect(res).toBeTruthy();
  });
});
