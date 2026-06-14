import { useEffect, useState } from 'react';

/**
 * Returns `true` for `ms` milliseconds then `false`, to demo skeleton
 * loading states over the local mock data.
 */
export function useFakeLoading(ms = 900): boolean {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return loading;
}
