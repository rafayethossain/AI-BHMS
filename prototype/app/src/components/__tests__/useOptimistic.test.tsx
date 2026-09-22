import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useOptimistic } from '../useOptimistic';

type Row = { id: string; status: string; name?: string };

describe('useOptimistic', () => {
  it('applies the patch optimistically before the server call settles', async () => {
    let resolve!: (r: Row) => void;
    const mutate = vi.fn<(id: string) => Promise<Row>>(
      () =>
        new Promise<Row>((res) => {
          resolve = res;
        }),
    );
    const { result } = renderHook(() => useOptimistic<Row>([{ id: 'd-1', status: 'active' }]));

    let promise!: Promise<Row>;
    act(() => {
      promise = result.current.optimistic('d-1', { status: 'archived' }, mutate);
    });

    expect(result.current.items[0].status).toBe('archived');
    expect(mutate).toHaveBeenCalledWith('d-1');

    act(() => resolve({ id: 'd-1', status: 'archived' }));
    await act(async () => {
      await promise;
    });
    expect(result.current.items[0].status).toBe('archived');
  });

  it('keeps the authoritative row returned by mutate on success', async () => {
    const { result } = renderHook(() =>
      useOptimistic<Row>([{ id: 'd-1', status: 'active', name: 'A' }]),
    );

    let promise!: Promise<Row>;
    act(() => {
      promise = result.current.optimistic(
        'd-1',
        { status: 'archived' },
        () => Promise.resolve({ id: 'd-1', status: 'archived', name: 'B' }),
      );
    });
    await act(async () => {
      await promise;
    });

    expect(result.current.items[0]).toEqual({ id: 'd-1', status: 'archived', name: 'B' });
  });

  it('rolls the row back to its previous value and rethrows when mutate rejects', async () => {
    const { result } = renderHook(() =>
      useOptimistic<Row>([{ id: 'd-1', status: 'active', name: 'A' }]),
    );
    const failing = vi.fn<(id: string) => Promise<Row>>(() => Promise.reject(new Error('boom')));

    let caught: unknown;
    act(() => {
      result.current.optimistic('d-1', { status: 'archived' }, failing).catch((e) => {
        caught = e;
      });
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.items[0]).toEqual({ id: 'd-1', status: 'active', name: 'A' });
    expect(failing).toHaveBeenCalledTimes(1);
    expect((caught as Error).message).toBe('boom');
  });

  it('inserts the authoritative row when the id was not in the local list', async () => {
    const { result } = renderHook(() => useOptimistic<Row>([{ id: 'd-1', status: 'active' }]));

    let promise!: Promise<Row>;
    act(() => {
      promise = result.current.optimistic(
        'd-2',
        { status: 'draft' },
        () => Promise.resolve({ id: 'd-2', status: 'draft' }),
      );
    });
    await act(async () => {
      await promise;
    });

    expect(result.current.items.map((i) => i.id)).toContain('d-2');
  });
});