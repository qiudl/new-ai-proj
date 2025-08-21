import axios from 'axios';
import { workNotesService } from '../workNotesService';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';

describe('workNotesService routes', () => {
  beforeEach(() => {
    mockedAxios.post.mockReset();
  });

  it('calls POST /work-notes/:id/copy when copying a note', async () => {
    const id = 123;
    const url = `${API_BASE_URL}/work-notes/${id}/copy`;
    mockedAxios.post.mockResolvedValueOnce({ data: { success: true, message: 'ok', data: { id: 456 } } } as any);

    const res = await workNotesService.copyWorkNote(id);
    expect(mockedAxios.post).toHaveBeenCalledWith(url, {}, expect.any(Object));
    expect(res).toBeTruthy();
  });

  it('calls POST /work-notes/:id/toggle-template when toggling template', async () => {
    const id = 789;
    const url = `${API_BASE_URL}/work-notes/${id}/toggle-template`;
    mockedAxios.post.mockResolvedValueOnce({ data: { success: true, message: 'ok', data: { id } } } as any);

    const res = await workNotesService.toggleTemplate(id);
    expect(mockedAxios.post).toHaveBeenCalledWith(url, {}, expect.any(Object));
    expect(res).toBeTruthy();
  });
});
