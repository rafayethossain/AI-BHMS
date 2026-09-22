import { useCallback, useState } from 'react';

export function useOptimistic<T extends { id: string }>(initial: T[]) {
  const [items, setItems] = useState<T[]>(initial);

  const optimistic = useCallback(
    async (
      id: string,
      patch: Partial<T>,
      mutate: (id: string) => Promise<T>,
    ): Promise<T> => {
      const previous = items.find((i) => i.id === id);
      if (!previous) {
        const next = await mutate(id);
        setItems((prev) =>
          prev.some((i) => i.id === id)
            ? prev.map((i) => (i.id === id ? next : i))
            : [...prev, next],
        );
        return next;
      }
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch, id: i.id } : i)));
      try {
        const next = await mutate(id);
        setItems((prev) => prev.map((i) => (i.id === id ? next : i)));
        return next;
      } catch (err) {
        setItems((prev) => prev.map((i) => (i.id === id ? previous : i)));
        throw err;
      }
    },
    [items],
  );

  return { items, setItems, optimistic };
}