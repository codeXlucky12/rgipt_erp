import { useState, useEffect, useCallback } from 'react';
import { fetchErpPage } from '../services/api';
import { isLoginPage } from '../utils/parsers';

/**
 * Generic hook to fetch and parse an ERP page.
 * @param {string} erpPath - ERP page path or full URL
 * @param {Function} parser - function(html: string) => data
 * @param {boolean} [skip] - if true, skip the fetch
 */
export function useErpData(erpPath, parser, skip = false) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (skip || !erpPath) return;
    setLoading(true);
    setError(null);
    try {
      const html = await fetchErpPage(erpPath);
      if (isLoginPage(html)) {
        throw new Error('SESSION_EXPIRED');
      }
      const parsed = parser(html);
      setData(parsed);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [erpPath, parser, skip]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
