import React, { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { useTaskListUrlState } from '../useUrlState';

function Fixture({ apply }: { apply?: boolean }) {
  const [filters, setFilters] = useTaskListUrlState();
  const [sp] = useSearchParams();

  useEffect(() => {
    if (apply) {
      setFilters({ status: 'in_progress', priority: 'high', assignee_id: 42, q: 'foo' });
    }
  }, [apply, setFilters]);

  return (
    <div>
      <div data-testid="tfilters">{sp.get('tfilters') || ''}</div>
      <div data-testid="status">{(filters as any).status || ''}</div>
      <div data-testid="priority">{(filters as any).priority || ''}</div>
      <div data-testid="assignee">{(filters as any).assignee_id ?? ''}</div>
      <div data-testid="q">{(filters as any).q || ''}</div>
    </div>
  );
}

describe('useTaskListUrlState (Alpha)', () => {
  it('serializes filters into tfilters param', async () => {
    render(
      <MemoryRouter initialEntries={["/tasks"]}>
        <Fixture apply />
      </MemoryRouter>
    );

    await waitFor(() => {
      const v = (screen.getByTestId('tfilters') as HTMLElement).textContent || '';
      // tfilters value should decode to an inner querystring
      expect(v).toContain('status=in_progress');
      expect(v).toContain('priority=high');
      expect(v).toContain('assignee_id=42');
      expect(v).toContain('q=foo');
    });
  });

  it('deserializes from tfilters param on first load', async () => {
    const encoded = 'status=in_progress&priority=low&assignee_id=7&q=bar';
    render(
      <MemoryRouter initialEntries={[`/tasks?tfilters=${encodeURIComponent(encoded)}`]}>
        <Fixture />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('in_progress');
      expect(screen.getByTestId('priority').textContent).toBe('low');
      expect(screen.getByTestId('assignee').textContent).toBe('7');
      expect(screen.getByTestId('q').textContent).toBe('bar');
    });
  });
});
