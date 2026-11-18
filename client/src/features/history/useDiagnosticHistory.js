import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearStoredHistory,
  readHistoryResult,
  saveHistory
} from './historyStorage.js';
import {
  createHistoryRecord,
  getHistoryByHostname as filterHistoryByHostname,
  isValidHistoryRecord
} from './historyUtils.js';

export function useDiagnosticHistory() {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storageError, setStorageError] = useState(false);
  const historyRef = useRef([]);
  const initialReadSucceededRef = useRef(false);

  useEffect(() => {
    if (!initialReadSucceededRef.current) {
      try {
        const readResult = readHistoryResult();
        if (readResult.success && Array.isArray(readResult.records)) {
          const validRecords = readResult.records.filter(isValidHistoryRecord);
          historyRef.current = validRecords;
          setHistory(validRecords);
          setStorageError(false);
          initialReadSucceededRef.current = true;
        } else {
          setStorageError(true);
        }
      } catch {
        setStorageError(true);
      }
    }

    setIsLoading(false);
  }, []);

  const persistHistory = useCallback((nextHistory) => {
    const result = saveHistory(nextHistory);
    if (!result || result.success !== true) {
      setStorageError(true);
      return {
        success: false,
        error: result && result.error ? result.error : 'storage_write_failed'
      };
    }

    historyRef.current = nextHistory;
    setHistory(nextHistory);
    setStorageError(false);
    return { success: true };
  }, []);

  const addRecord = useCallback((result) => {
    if (!initialReadSucceededRef.current) {
      return { success: false, error: 'history_unavailable' };
    }

    const existingRecord = historyRef.current.find((record) => record.result === result);
    if (existingRecord) {
      return { success: true, record: existingRecord, duplicate: true };
    }

    let record;
    try {
      record = createHistoryRecord(result);
    } catch {
      return { success: false, error: 'invalid_result' };
    }

    const persistence = persistHistory([record, ...historyRef.current]);
    return persistence.success
      ? { success: true, record, duplicate: false }
      : persistence;
  }, [persistHistory]);

  const getHistoryByHostname = useCallback((hostname) =>
    filterHistoryByHostname(historyRef.current, hostname), []);

  const deleteRecord = useCallback((id) => {
    if (!initialReadSucceededRef.current) {
      return { success: false, error: 'history_unavailable' };
    }
    if (typeof id !== 'string' || id.trim() === '') {
      return { success: false, error: 'invalid_id' };
    }

    const currentHistory = historyRef.current;
    const nextHistory = currentHistory.filter((record) => record.id !== id);
    if (nextHistory.length === currentHistory.length) {
      return { success: true, deleted: false };
    }

    const persistence = persistHistory(nextHistory);
    return persistence.success
      ? { success: true, deleted: true }
      : persistence;
  }, [persistHistory]);

  const clearHistory = useCallback(() => {
    if (!initialReadSucceededRef.current) {
      setStorageError(true);
      return { success: false, error: 'history_unavailable' };
    }

    const result = clearStoredHistory();
    if (!result || result.success !== true) {
      setStorageError(true);
      return {
        success: false,
        error: result && result.error ? result.error : 'storage_remove_failed'
      };
    }

    historyRef.current = [];
    setHistory([]);
    setStorageError(false);
    return { success: true };
  }, []);

  return {
    history,
    isLoading,
    storageError,
    addRecord,
    getHistoryByHostname,
    deleteRecord,
    clearHistory
  };
}

export default useDiagnosticHistory;
