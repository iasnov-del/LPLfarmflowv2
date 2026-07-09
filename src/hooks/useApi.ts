import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';

export function useApi<T = any>(url: string, initialData: any = []) {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiFetch(url);
      setData(result);
      setError(null);
    } catch (err: any) {
      console.error(`Error fetching from ${url}:`, err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}
