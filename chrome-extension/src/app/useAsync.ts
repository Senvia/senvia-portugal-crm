import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Fetch-on-mount with loading, error and a manual reload.
 *
 * Carries a run token so a superseded request can't paint over a newer one —
 * the same class of bug that made the contact panel show the previous chat's
 * data when switching quickly.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const runRef = useRef(0);

  const run = useCallback(async () => {
    const run = ++runRef.current;
    const superseded = () => runRef.current !== run;

    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      if (superseded()) return;
      setData(result);
    } catch (e) {
      if (!superseded()) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (!superseded()) setLoading(false);
    }
    // `fn` is a fresh closure every render; `deps` are the real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void run();
  }, [run]);

  return { data, loading, error, reload: run };
}
