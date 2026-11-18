import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearStoredHistory,
  DIAGNOSTIC_HISTORY_STORAGE_KEY,
  loadHistory,
  readHistoryResult,
  saveHistory
} from './historyStorage.js';

const historyKey = DIAGNOSTIC_HISTORY_STORAGE_KEY;

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe('loadHistory', () => {
  it('returns the stored array when history contains valid JSON', () => {
    const records = [{ id: 'one' }, { id: 'two' }];
    window.localStorage.setItem(historyKey, JSON.stringify(records));

    expect(loadHistory()).toEqual(records);
  });

  it('returns an empty array when the history key is empty', () => {
    expect(loadHistory()).toEqual([]);
  });

  it('returns an empty array when stored JSON is malformed', () => {
    window.localStorage.setItem(historyKey, '{malformed');

    expect(loadHistory()).toEqual([]);
  });

  it('returns an empty array when stored JSON is not an array', () => {
    window.localStorage.setItem(historyKey, JSON.stringify({ record: 'one' }));

    expect(loadHistory()).toEqual([]);
  });

  it('returns an empty array when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(loadHistory()).toEqual([]);
  });

  it('returns an empty array when reading from storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('read failed');
    });

    expect(loadHistory()).toEqual([]);
  });
});

describe('saveHistory', () => {
  it('serializes records under the exported history key', () => {
    const records = [{ id: 'one', hostname: 'example.com' }];

    expect(saveHistory(records)).toEqual({ success: true });
    expect(window.localStorage.getItem(historyKey)).toBe(JSON.stringify(records));
  });

  it('saves an empty array', () => {
    expect(saveHistory([])).toEqual({ success: true });
    expect(window.localStorage.getItem(historyKey)).toBe('[]');
  });

  it('rejects non-array input', () => {
    expect(saveHistory(null)).toEqual({ success: false, error: 'invalid_records' });
  });

  it('reports serialization failures without replacing existing history', () => {
    const existing = JSON.stringify([{ id: 'preserve' }]);
    window.localStorage.setItem(historyKey, existing);
    const cyclicRecord = {};
    cyclicRecord.self = cyclicRecord;

    expect(saveHistory([cyclicRecord])).toEqual({
      success: false,
      error: 'serialization_failed'
    });
    expect(window.localStorage.getItem(historyKey)).toBe(existing);
  });

  it('reports a storage read failure and does not attempt to write', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('read failed');
    });

    expect(saveHistory([{ id: 'one' }])).toEqual({
      success: false,
      error: 'storage_read_failed'
    });
    expect(setItem).not.toHaveBeenCalled();
  });

  it('reports a storage write exception', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('write failed');
    });

    expect(saveHistory([{ id: 'one' }])).toEqual({
      success: false,
      error: 'storage_write_failed'
    });
  });

  it('reports unavailable localStorage', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(saveHistory([{ id: 'one' }])).toEqual({
      success: false,
      error: 'storage_unavailable'
    });
  });
});

describe('readHistoryResult', () => {
  it('returns a success result containing the parsed records', () => {
    const records = [{ id: 'one' }, { id: 'two' }];
    window.localStorage.setItem(historyKey, JSON.stringify(records));

    expect(readHistoryResult()).toEqual({ success: true, records });
  });

  it('distinguishes empty storage from a failed read', () => {
    expect(readHistoryResult()).toEqual({ success: true, records: [] });

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('read failed');
    });
    expect(readHistoryResult()).toEqual({
      success: false,
      records: [],
      error: 'storage_read_failed'
    });
  });

  it('reports malformed JSON as a storage read failure', () => {
    window.localStorage.setItem(historyKey, '{malformed');

    expect(readHistoryResult()).toEqual({
      success: false,
      records: [],
      error: 'storage_read_failed'
    });
  });

  it('reports valid JSON with a non-array top level as invalid stored data', () => {
    window.localStorage.setItem(historyKey, JSON.stringify({ record: 'one' }));

    expect(readHistoryResult()).toEqual({
      success: false,
      records: [],
      error: 'invalid_stored_data'
    });
  });

  it('reports a non-string storage result as a storage read failure', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(42);

    expect(readHistoryResult()).toEqual({
      success: false,
      records: [],
      error: 'storage_read_failed'
    });
  });

  it('reports unavailable localStorage', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(readHistoryResult()).toEqual({
      success: false,
      records: [],
      error: 'storage_unavailable'
    });
  });
});

describe('clearStoredHistory', () => {
  it('removes only the history key and preserves unrelated entries', () => {
    window.localStorage.setItem(historyKey, JSON.stringify([{ id: 'one' }]));
    window.localStorage.setItem('unrelated-key', 'keep me');

    expect(clearStoredHistory()).toEqual({ success: true });
    expect(window.localStorage.getItem(historyKey)).toBeNull();
    expect(window.localStorage.getItem('unrelated-key')).toBe('keep me');
  });

  it('reports unavailable localStorage', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(clearStoredHistory()).toEqual({
      success: false,
      error: 'storage_unavailable'
    });
  });

  it('reports a removal exception', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('remove failed');
    });

    expect(clearStoredHistory()).toEqual({
      success: false,
      error: 'storage_remove_failed'
    });
  });
});
