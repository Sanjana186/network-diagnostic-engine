export const DIAGNOSTIC_HISTORY_STORAGE_KEY = 'network-diagnostic-engine:history:v1';

function getLocalStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

export function readHistoryResult() {
  const storage = getLocalStorage();
  if (!storage) {
    return { success: false, records: [], error: 'storage_unavailable' };
  }

  try {
    const storedValue = storage.getItem(DIAGNOSTIC_HISTORY_STORAGE_KEY);
    if (storedValue === null) {
      return { success: true, records: [] };
    }

    if (typeof storedValue !== 'string') {
      return { success: false, records: [], error: 'storage_read_failed' };
    }

    const records = JSON.parse(storedValue);
    return Array.isArray(records)
      ? { success: true, records }
      : { success: false, records: [], error: 'invalid_stored_data' };
  } catch {
    return { success: false, records: [], error: 'storage_read_failed' };
  }
}

export function loadHistory() {
  return readHistoryResult().records;
}

export function saveHistory(records) {
  if (!Array.isArray(records)) {
    return { success: false, error: 'invalid_records' };
  }

  const storage = getLocalStorage();
  if (!storage) {
    return { success: false, error: 'storage_unavailable' };
  }

  try {
    const existingValue = storage.getItem(DIAGNOSTIC_HISTORY_STORAGE_KEY);
    if (existingValue !== null && typeof existingValue !== 'string') {
      return { success: false, error: 'storage_read_failed' };
    }
  } catch {
    return { success: false, error: 'storage_read_failed' };
  }

  let serializedRecords;
  try {
    serializedRecords = JSON.stringify(records);
    if (typeof serializedRecords !== 'string') {
      return { success: false, error: 'serialization_failed' };
    }
  } catch {
    return { success: false, error: 'serialization_failed' };
  }

  try {
    storage.setItem(DIAGNOSTIC_HISTORY_STORAGE_KEY, serializedRecords);
    return { success: true };
  } catch {
    return { success: false, error: 'storage_write_failed' };
  }
}

export function clearStoredHistory() {
  const storage = getLocalStorage();
  if (!storage) {
    return { success: false, error: 'storage_unavailable' };
  }

  try {
    storage.removeItem(DIAGNOSTIC_HISTORY_STORAGE_KEY);
    return { success: true };
  } catch {
    return { success: false, error: 'storage_remove_failed' };
  }
}
