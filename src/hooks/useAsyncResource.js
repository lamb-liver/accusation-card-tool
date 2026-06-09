import { useCallback, useEffect, useState } from 'react';
import { ShareWallApiError } from '../api/shareWallApi.js';
import { formatShareWallError } from '../utils/formatShareWallError.js';

/**
 * @template T
 * @param {() => Promise<T>} loader
 * @param {{ enabled?: boolean }} [options]
 */
export function useAsyncResource(loader, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(
    async ({ retry = false } = {}) => {
      if (retry) {
        setIsRetrying(true);
      } else {
        setIsLoading(true);
      }
      setIsError(false);
      setErrorMessage('');
      try {
        const result = await loader();
        setData(result);
      } catch (error) {
        setIsError(true);
        setErrorMessage(formatShareWallError(error, '載入失敗'));
        if (!(error instanceof ShareWallApiError && error.status === 429)) {
          setData(null);
        }
      } finally {
        setIsLoading(false);
        setIsRetrying(false);
      }
    },
    [loader],
  );

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      setIsRetrying(false);
      return undefined;
    }
    load();
    return undefined;
  }, [load, enabled]);

  const reload = useCallback(() => load({ retry: true }), [load]);

  return { data, isLoading, isRetrying, isError, errorMessage, reload };
}
