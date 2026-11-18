import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  clearStoredHistory: vi.fn(),
  readHistoryResult: vi.fn(),
  saveHistory: vi.fn(),
  createHistoryRecord: vi.fn(),
  getHistoryByHostname: vi.fn(),
  isValidHistoryRecord: vi.fn()
}));

vi.mock('./historyStorage.js', () => ({
  clearStoredHistory: mocks.clearStoredHistory,
  readHistoryResult: mocks.readHistoryResult,
  saveHistory: mocks.saveHistory
}));

vi.mock('./historyUtils.js', () => ({
  createHistoryRecord: mocks.createHistoryRecord,
  getHistoryByHostname: mocks.getHistoryByHostname,
  isValidHistoryRecord: mocks.isValidHistoryRecord
}));

import { useDiagnosticHistory } from './useDiagnosticHistory.js';

function makeResult(hostname = 'example.com', extra = {}) {
  return {
    target: { url: `https://${hostname}/diagnostic` },
    timings: { totalDuration: 100 },
    ...extra
  };
}

function makeRecord(id, { hostname = 'example.com', valid = true, result } = {}) {
  return {
    id,
    timestamp: `2025-01-0${id.length}T00:00:00.000Z`,
    hostname,
    valid,
    result: result ?? makeResult(hostname)
  };
}

function mountHistory() {
  return renderHook(() => useDiagnosticHistory());
}

beforeEach(() => {
  vi.resetAllMocks();

  mocks.readHistoryResult.mockReturnValue({ success: true, records: [] });
  mocks.saveHistory.mockReturnValue({ success: true });
  mocks.clearStoredHistory.mockReturnValue({ success: true });
  mocks.isValidHistoryRecord.mockImplementation((record) => record?.valid === true);
  mocks.createHistoryRecord.mockImplementation((result) => ({
    id: `created-${mocks.createHistoryRecord.mock.calls.length}`,
    timestamp: '2025-02-01T00:00:00.000Z',
    hostname: new URL(result.target.url).hostname.toLowerCase(),
    valid: true,
    result
  }));
  mocks.getHistoryByHostname.mockImplementation((records, hostname) => {
    if (typeof hostname !== 'string' || hostname.trim() === '' || /[/?#@]/.test(hostname)) {
      return [];
    }

    const normalizedHostname = hostname.trim().toLowerCase().replace(/\.+$/, '');
    return records
      .filter((record) => record.hostname === normalizedHostname)
      .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('initial loading', () => {
  it('starts loading, loads history, and finishes loading without persisting', () => {
    const storedRecords = [makeRecord('first'), makeRecord('second')];
    mocks.readHistoryResult.mockReturnValue({
      success: true,
      records: storedRecords
    });
    const loadingStates = [];

    const { result } = renderHook(() => {
      const state = useDiagnosticHistory();
      loadingStates.push(state.isLoading);
      return state;
    });

    expect(loadingStates[0]).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.history).toEqual(storedRecords);
    expect(result.current.history).not.toBe(storedRecords);
    expect(result.current.storageError).toBe(false);
    expect(mocks.saveHistory).not.toHaveBeenCalled();
    expect(mocks.clearStoredHistory).not.toHaveBeenCalled();
  });

  it('filters invalid records without writing the filtered list back', () => {
    const validRecord = makeRecord('valid');
    const invalidRecord = makeRecord('invalid', { valid: false });
    mocks.readHistoryResult.mockReturnValue({
      success: true,
      records: [validRecord, invalidRecord]
    });

    const { result } = mountHistory();

    expect(result.current.history).toEqual([validRecord]);
    expect(result.current.storageError).toBe(false);
    expect(mocks.isValidHistoryRecord).toHaveBeenNthCalledWith(
      1,
      validRecord,
      0,
      [validRecord, invalidRecord]
    );
    expect(mocks.isValidHistoryRecord).toHaveBeenNthCalledWith(
      2,
      invalidRecord,
      1,
      [validRecord, invalidRecord]
    );
    expect(mocks.saveHistory).not.toHaveBeenCalled();
  });

  it('finishes loading with an empty history when storage is empty', () => {
    const { result } = mountHistory();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.history).toEqual([]);
    expect(result.current.storageError).toBe(false);
    expect(mocks.readHistoryResult).toHaveBeenCalledTimes(1);
    expect(mocks.saveHistory).not.toHaveBeenCalled();
  });

  it('blocks adding a record before the initial loading effect completes', () => {
    let addOutcome;
    renderHook(() => {
      const state = useDiagnosticHistory();
      if (state.isLoading) {
        addOutcome = state.addRecord(makeResult());
      }
      return state;
    });

    expect(addOutcome).toEqual({ success: false, error: 'history_unavailable' });
    expect(mocks.createHistoryRecord).not.toHaveBeenCalled();
    expect(mocks.saveHistory).not.toHaveBeenCalled();
  });

  it('reports a failed storage read without treating it as writable empty history', () => {
    mocks.readHistoryResult.mockReturnValue({
      success: false,
      records: [],
      error: 'storage_read_failed'
    });

    const { result } = mountHistory();
    let addOutcome;
    let deleteOutcome;
    let clearOutcome;
    act(() => {
      addOutcome = result.current.addRecord(makeResult());
      deleteOutcome = result.current.deleteRecord('record-id');
      clearOutcome = result.current.clearHistory();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.history).toEqual([]);
    expect(result.current.storageError).toBe(true);
    expect(addOutcome).toEqual({ success: false, error: 'history_unavailable' });
    expect(deleteOutcome).toEqual({ success: false, error: 'history_unavailable' });
    expect(clearOutcome).toEqual({ success: false, error: 'history_unavailable' });
    expect(mocks.createHistoryRecord).not.toHaveBeenCalled();
    expect(mocks.saveHistory).not.toHaveBeenCalled();
    expect(mocks.clearStoredHistory).not.toHaveBeenCalled();
  });

  it('handles a thrown storage read and still completes loading', () => {
    mocks.readHistoryResult.mockImplementation(() => {
      throw new Error('read failed');
    });

    const { result } = mountHistory();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.history).toEqual([]);
    expect(result.current.storageError).toBe(true);
    expect(mocks.saveHistory).not.toHaveBeenCalled();
  });
});

describe('addRecord', () => {
  it('creates, persists, and then exposes a new record', () => {
    const { result } = mountHistory();
    const initialHistory = result.current.history;
    const diagnosticResult = makeResult();
    let outcome;

    mocks.saveHistory.mockImplementation((nextHistory) => {
      expect(result.current.history).toBe(initialHistory);
      expect(nextHistory).toHaveLength(1);
      return { success: true };
    });

    act(() => {
      outcome = result.current.addRecord(diagnosticResult);
    });

    expect(outcome).toEqual({
      success: true,
      record: expect.objectContaining({ result: diagnosticResult }),
      duplicate: false
    });
    expect(mocks.createHistoryRecord).toHaveBeenCalledWith(diagnosticResult);
    expect(mocks.saveHistory).toHaveBeenCalledWith([outcome.record]);
    expect(result.current.history).toEqual([outcome.record]);
    expect(result.current.history).not.toBe(initialHistory);
    expect(result.current.storageError).toBe(false);
    expect(diagnosticResult).toEqual(makeResult());
  });

  it('returns the existing record for the exact same response object', () => {
    const { result } = mountHistory();
    const diagnosticResult = makeResult();
    let firstOutcome;
    let duplicateOutcome;

    act(() => {
      firstOutcome = result.current.addRecord(diagnosticResult);
    });
    act(() => {
      duplicateOutcome = result.current.addRecord(diagnosticResult);
    });

    expect(duplicateOutcome).toEqual({
      success: true,
      record: firstOutcome.record,
      duplicate: true
    });
    expect(mocks.createHistoryRecord).toHaveBeenCalledTimes(1);
    expect(mocks.saveHistory).toHaveBeenCalledTimes(1);
    expect(result.current.history).toEqual([firstOutcome.record]);
  });

  it('stores a distinct response object even when its contents are identical', () => {
    const { result } = mountHistory();
    const firstResult = makeResult();
    const secondResult = structuredClone(firstResult);
    let firstOutcome;
    let secondOutcome;

    act(() => {
      firstOutcome = result.current.addRecord(firstResult);
    });
    act(() => {
      secondOutcome = result.current.addRecord(secondResult);
    });

    expect(secondOutcome.success).toBe(true);
    expect(secondOutcome.duplicate).toBe(false);
    expect(secondOutcome.record).not.toBe(firstOutcome.record);
    expect(secondOutcome.record.result).toBe(secondResult);
    expect(result.current.history).toEqual([secondOutcome.record, firstOutcome.record]);
    expect(mocks.saveHistory).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid diagnostic results without persisting', () => {
    const { result } = mountHistory();
    mocks.createHistoryRecord.mockImplementation(() => {
      throw new TypeError('invalid result');
    });
    let outcome;

    act(() => {
      outcome = result.current.addRecord({ target: null });
    });

    expect(outcome).toEqual({ success: false, error: 'invalid_result' });
    expect(result.current.history).toEqual([]);
    expect(mocks.saveHistory).not.toHaveBeenCalled();
  });

  it('does not update history when persistence fails', () => {
    const existing = makeRecord('existing');
    mocks.readHistoryResult.mockReturnValue({ success: true, records: [existing] });
    mocks.saveHistory.mockReturnValue({
      success: false,
      error: 'storage_write_failed'
    });
    const { result } = mountHistory();
    const originalHistory = result.current.history;
    let outcome;

    act(() => {
      outcome = result.current.addRecord(makeResult());
    });

    expect(outcome).toEqual({ success: false, error: 'storage_write_failed' });
    expect(result.current.history).toBe(originalHistory);
    expect(result.current.history).toEqual([existing]);
    expect(result.current.storageError).toBe(true);
    expect(mocks.saveHistory).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'existing' })])
    );
    expect(mocks.getHistoryByHostname).not.toHaveBeenCalled();
  });
});

describe('getHistoryByHostname', () => {
  it('delegates filtering and returns matching records for normalized hostnames', () => {
    const matching = makeRecord('matching', { hostname: 'example.com' });
    const other = makeRecord('other', { hostname: 'other.example' });
    mocks.readHistoryResult.mockReturnValue({
      success: true,
      records: [matching, other]
    });
    const { result } = mountHistory();
    const currentHistory = result.current.history;

    expect(result.current.getHistoryByHostname('EXAMPLE.COM.')).toEqual([matching]);
    expect(mocks.getHistoryByHostname).toHaveBeenCalledWith(
      currentHistory,
      'EXAMPLE.COM.'
    );
    expect(result.current.history).toBe(currentHistory);
  });

  it('returns an empty result for no matches, empty history, and invalid hostnames', () => {
    const { result } = mountHistory();

    expect(result.current.getHistoryByHostname('missing.example')).toEqual([]);
    expect(result.current.getHistoryByHostname('https://example.com')).toEqual([]);
    expect(result.current.getHistoryByHostname('')).toEqual([]);
    expect(result.current.history).toEqual([]);
  });

  it('does not mutate the history or record objects while filtering', () => {
    const record = makeRecord('one');
    mocks.readHistoryResult.mockReturnValue({ success: true, records: [record] });
    const { result } = mountHistory();
    const originalHistory = result.current.history;

    result.current.getHistoryByHostname('example.com');

    expect(result.current.history).toBe(originalHistory);
    expect(result.current.history[0]).toBe(record);
    expect(record).toEqual(makeRecord('one'));
  });
});

describe('deleteRecord', () => {
  it('persists deletion before updating state and preserves the remaining order', () => {
    const first = makeRecord('first');
    const removed = makeRecord('removed');
    const last = makeRecord('last');
    mocks.readHistoryResult.mockReturnValue({
      success: true,
      records: [first, removed, last]
    });
    const { result } = mountHistory();
    const originalHistory = result.current.history;
    let outcome;

    mocks.saveHistory.mockImplementation((nextHistory) => {
      expect(result.current.history).toBe(originalHistory);
      expect(nextHistory).toEqual([first, last]);
      return { success: true };
    });

    act(() => {
      outcome = result.current.deleteRecord('removed');
    });

    expect(outcome).toEqual({ success: true, deleted: true });
    expect(result.current.history).toEqual([first, last]);
    expect(result.current.history).not.toBe(originalHistory);
    expect(originalHistory).toEqual([first, removed, last]);
    expect(originalHistory[1]).toBe(removed);
  });

  it('returns success without persisting when the ID does not exist', () => {
    const existing = makeRecord('existing');
    mocks.readHistoryResult.mockReturnValue({ success: true, records: [existing] });
    const { result } = mountHistory();
    let outcome;

    act(() => {
      outcome = result.current.deleteRecord('missing');
    });

    expect(outcome).toEqual({ success: true, deleted: false });
    expect(result.current.history).toEqual([existing]);
    expect(mocks.saveHistory).not.toHaveBeenCalled();
  });

  it.each([null, undefined, '', '  ', 7])('rejects invalid ID %j', (id) => {
    const { result } = mountHistory();
    let outcome;

    act(() => {
      outcome = result.current.deleteRecord(id);
    });

    expect(outcome).toEqual({ success: false, error: 'invalid_id' });
    expect(mocks.saveHistory).not.toHaveBeenCalled();
  });

  it('leaves history unchanged when persistence fails', () => {
    const first = makeRecord('first');
    const second = makeRecord('second');
    mocks.readHistoryResult.mockReturnValue({
      success: true,
      records: [first, second]
    });
    mocks.saveHistory.mockReturnValue({
      success: false,
      error: 'storage_write_failed'
    });
    const { result } = mountHistory();
    const originalHistory = result.current.history;
    let outcome;

    act(() => {
      outcome = result.current.deleteRecord('first');
    });

    expect(outcome).toEqual({ success: false, error: 'storage_write_failed' });
    expect(result.current.history).toBe(originalHistory);
    expect(result.current.history).toEqual([first, second]);
    expect(result.current.storageError).toBe(true);
  });
});

describe('clearHistory', () => {
  it('clears non-empty history after storage removal succeeds', () => {
    const first = makeRecord('first');
    const second = makeRecord('second');
    mocks.readHistoryResult.mockReturnValue({
      success: true,
      records: [first, second]
    });
    const { result } = mountHistory();
    const originalHistory = result.current.history;
    let outcome;

    mocks.clearStoredHistory.mockImplementation(() => {
      expect(result.current.history).toBe(originalHistory);
      return { success: true };
    });

    act(() => {
      outcome = result.current.clearHistory();
    });

    expect(outcome).toEqual({ success: true });
    expect(mocks.clearStoredHistory).toHaveBeenCalledTimes(1);
    expect(result.current.history).toEqual([]);
    expect(result.current.history).not.toBe(originalHistory);
    expect(originalHistory).toEqual([first, second]);
    expect(result.current.storageError).toBe(false);
  });

  it('succeeds when clearing already-empty history', () => {
    const { result } = mountHistory();
    let outcome;

    act(() => {
      outcome = result.current.clearHistory();
    });

    expect(outcome).toEqual({ success: true });
    expect(result.current.history).toEqual([]);
    expect(mocks.clearStoredHistory).toHaveBeenCalledTimes(1);
  });

  it('preserves history when storage clearing fails', () => {
    const record = makeRecord('existing');
    mocks.readHistoryResult.mockReturnValue({ success: true, records: [record] });
    mocks.clearStoredHistory.mockReturnValue({
      success: false,
      error: 'storage_remove_failed'
    });
    const { result } = mountHistory();
    const originalHistory = result.current.history;
    let outcome;

    act(() => {
      outcome = result.current.clearHistory();
    });

    expect(outcome).toEqual({ success: false, error: 'storage_remove_failed' });
    expect(result.current.history).toBe(originalHistory);
    expect(result.current.history).toEqual([record]);
    expect(result.current.storageError).toBe(true);
  });

  it('clears a prior storage error after a later successful clear', () => {
    mocks.saveHistory.mockReturnValue({
      success: false,
      error: 'storage_write_failed'
    });
    const { result } = mountHistory();
    act(() => {
      result.current.addRecord(makeResult());
    });
    expect(result.current.storageError).toBe(true);

    mocks.clearStoredHistory.mockReturnValue({ success: true });
    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.history).toEqual([]);
    expect(result.current.storageError).toBe(false);
  });

  it('blocks clearing when the initial read did not succeed', () => {
    mocks.readHistoryResult.mockReturnValue({
      success: false,
      records: [],
      error: 'storage_read_failed'
    });
    const { result } = mountHistory();
    let outcome;

    act(() => {
      outcome = result.current.clearHistory();
    });

    expect(outcome).toEqual({ success: false, error: 'history_unavailable' });
    expect(result.current.history).toEqual([]);
    expect(result.current.storageError).toBe(true);
    expect(mocks.clearStoredHistory).not.toHaveBeenCalled();
  });
});
