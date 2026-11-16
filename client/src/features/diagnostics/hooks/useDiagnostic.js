import { useState, useRef, useCallback } from 'react';

/**
 * Custom React hook to manage diagnostic test execution and state lifecycle.
 * Supports request cancellation via AbortController.
 */
export function useDiagnostic() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const run = useCallback(async (targetUrl) => {
    // Cancel any previous in-flight diagnostic request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: targetUrl }),
        signal: controller.signal,
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message || `Request failed with status ${response.status}`);
      }

      setData(json);
      setLoading(false);
      return json;
    } catch (err) {
      // Ignore AbortError when request was intentionally cancelled
      if (err.name === 'AbortError') {
        console.log('Diagnostic request cancelled');
        return;
      }

      setError(err.message || 'An error occurred during network analysis.');
      setLoading(false);
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    run,
    reset,
  };
}

export default useDiagnostic;
