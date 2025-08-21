import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { workNotesService } from '../workNotesService';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';

describe('workNotesService routes', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.restore();
  });

  it('calls POST /work-notes/:id/copy when copying a note', async () => {
    const id = 123;
    const url = `${API_BASE_URL}/work-notes/${id}/copy`;
    mock.onPost(url).reply(200, { success: true, message: 'ok', data: { id: 456 } });

    const res = await workNotesService.copyWorkNote(id);
    expect(res).toBeTruthy();
  });

  it('calls POST /work-notes/:id/toggle-template when toggling template', async () => {
    const id = 789;
    const url = `${API_BASE_URL}/work-notes/${id}/toggle-template`;
    mock.onPost(url).reply(200, { success: true, message: 'ok', data: { id } });

    const res = await workNotesService.toggleTemplate(id);
    expect(res).toBeTruthy();
  });
});
