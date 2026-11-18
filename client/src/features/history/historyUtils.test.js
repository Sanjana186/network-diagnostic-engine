import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createHistoryRecord,
  getHistoryByHostname,
  isValidHistoryRecord,
  normalizeHostname
} from './historyUtils.js';

const VALID_URL = 'https://Example.COM:8443/path?check=1#result';
const TIMING_FIELDS = [
  'dnsLookup',
  'tcpConnection',
  'tlsHandshake',
  'ttfb',
  'dataTransfer',
  'totalDuration'
];
const METRIC_FIELDS = ['statusCode', 'contentLengthBytes', 'throughputKbps'];

function makeDiagnosticResponse() {
  return {
    target: { url: VALID_URL },
    timings: {
      dnsLookup: 4,
      tcpConnection: 12,
      tlsHandshake: 18,
      ttfb: 25,
      dataTransfer: 40,
      totalDuration: 99
    },
    metrics: {
      statusCode: 200,
      contentLengthBytes: 2048,
      throughputKbps: 160
    },
    analysis: {
      primaryBottleneck: 'none',
      severity: 'optimal',
      summary: 'No significant bottleneck detected.',
      recommendations: []
    }
  };
}

function makeHistoryRecord({
  id = 'record-1',
  timestamp = '2025-01-02T03:04:05.000Z',
  hostname = 'example.com',
  url,
  result
} = {}) {
  const diagnosticResult = result ?? makeDiagnosticResponse();
  if (result === undefined && url !== undefined) {
    diagnosticResult.target.url = url;
  }

  return {
    id,
    timestamp,
    hostname,
    result: diagnosticResult
  };
}

function makeMutatedResponse(mutator) {
  const result = makeDiagnosticResponse();
  mutator(result);
  return result;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('normalizeHostname', () => {
  it.each([
    ['HTTP URL', 'http://example.com', 'example.com'],
    ['HTTPS URL', 'https://example.com', 'example.com'],
    ['uppercase hostname', 'https://EXAMPLE.COM', 'example.com'],
    ['trailing dot', 'https://example.com./', 'example.com'],
    ['path, query and fragment', 'https://example.com/a?b=1#part', 'example.com'],
    ['port', 'https://example.com:8443/a', 'example.com'],
    ['bracketed IPv6 hostname', 'https://[2001:DB8::1]:8443/path', '[2001:db8::1]']
  ])('normalizes a valid %s', (_description, url, expected) => {
    expect(normalizeHostname(url)).toBe(expected);
  });

  it('normalizes equivalent URLs to the same hostname', () => {
    expect(normalizeHostname('http://EXAMPLE.com:80/one'))
      .toBe(normalizeHostname('https://example.COM./two?x=1'));
  });

  it.each([
    '',
    '   ',
    'example.com/path',
    'https://',
    'https://[invalid',
    'mailto:user@example.com'
  ])('returns null for invalid or hostless URL input %j', (url) => {
    expect(normalizeHostname(url)).toBeNull();
  });

  it.each([null, undefined, 42, {}, ['https://example.com']])(
    'returns null for non-string URL input %j',
    (url) => {
      expect(normalizeHostname(url)).toBeNull();
    }
  );
});

describe('createHistoryRecord', () => {
  it('creates the expected record structure and derives the normalized hostname', () => {
    const result = makeDiagnosticResponse();
    const record = createHistoryRecord(result);

    expect(Object.keys(record).sort()).toEqual(['hostname', 'id', 'result', 'timestamp']);
    expect(record.id).toEqual(expect.any(String));
    expect(record.id.trim()).not.toBe('');
    expect(record.hostname).toBe('example.com');
    expect(record.result).toBe(result);
    expect(Date.parse(record.timestamp)).not.toBeNaN();
    expect(new Date(record.timestamp).toISOString()).toBe(record.timestamp);
  });

  it('generates distinct IDs for independently created records', () => {
    const first = createHistoryRecord(makeDiagnosticResponse());
    const second = createHistoryRecord(makeDiagnosticResponse());

    expect(first.id).not.toBe(second.id);
  });

  it('does not modify the diagnostic response', () => {
    const result = makeDiagnosticResponse();
    const original = structuredClone(result);

    const record = createHistoryRecord(result);

    expect(result).toEqual(original);
    expect(record.result).toBe(result);
  });

  it('accepts zero-valued measurements', () => {
    const result = makeDiagnosticResponse();
    result.timings = Object.fromEntries(TIMING_FIELDS.map((field) => [field, 0]));
    result.metrics = Object.fromEntries(METRIC_FIELDS.map((field) => [field, 0]));

    expect(createHistoryRecord(result).result).toBe(result);
  });

  const invalidCreationCases = [
    ['null response', () => null],
    ['array response', () => []],
    ['missing target', () => makeMutatedResponse((result) => { delete result.target; })],
    ['null target', () => makeMutatedResponse((result) => { result.target = null; })],
    ['invalid target URL', () => makeMutatedResponse((result) => { result.target.url = 'not a URL'; })],
    ['missing target URL', () => makeMutatedResponse((result) => { delete result.target.url; })],
    ...TIMING_FIELDS.flatMap((field) => [
      [
        `missing timing ${field}`,
        () => makeMutatedResponse((result) => { delete result.timings[field]; })
      ],
      [
        `negative timing ${field}`,
        () => makeMutatedResponse((result) => { result.timings[field] = -1; })
      ]
    ]),
    ['non-finite timing value', () => makeMutatedResponse((result) => { result.timings.ttfb = Infinity; })],
    ...METRIC_FIELDS.flatMap((field) => [
      [
        `missing metric ${field}`,
        () => makeMutatedResponse((result) => { delete result.metrics[field]; })
      ],
      [
        `invalid metric ${field}`,
        () => makeMutatedResponse((result) => { result.metrics[field] = -1; })
      ]
    ]),
    ['non-finite metric value', () => makeMutatedResponse((result) => { result.metrics.throughputKbps = NaN; })],
    ['missing analysis', () => makeMutatedResponse((result) => { delete result.analysis; })],
    ['empty primary bottleneck', () => makeMutatedResponse((result) => { result.analysis.primaryBottleneck = ' '; })],
    ['empty severity', () => makeMutatedResponse((result) => { result.analysis.severity = ''; })],
    ['empty summary', () => makeMutatedResponse((result) => { result.analysis.summary = ''; })],
    ['non-array recommendations', () => makeMutatedResponse((result) => { result.analysis.recommendations = 'none'; })],
    ['non-string recommendation', () => makeMutatedResponse((result) => { result.analysis.recommendations = [1]; })]
  ];

  it.each(invalidCreationCases)('rejects %s', (_description, makeInvalidResult) => {
    expect(() => createHistoryRecord(makeInvalidResult())).toThrow(TypeError);
  });
});

describe('isValidHistoryRecord', () => {
  it('accepts a complete valid history record', () => {
    expect(isValidHistoryRecord(makeHistoryRecord())).toBe(true);
  });

  it.each([
    null,
    undefined,
    [],
    'record'
  ])('rejects malformed record input %j', (record) => {
    expect(isValidHistoryRecord(record)).toBe(false);
  });

  const invalidRecordCases = [
    ['missing id', (record) => { delete record.id; }],
    ['empty id', (record) => { record.id = ''; }],
    ['whitespace id', (record) => { record.id = '  '; }],
    ['non-string id', (record) => { record.id = 1; }],
    ['missing timestamp', (record) => { delete record.timestamp; }],
    ['empty timestamp', (record) => { record.timestamp = ''; }],
    ['invalid timestamp', (record) => { record.timestamp = 'not a date'; }],
    ['missing hostname', (record) => { delete record.hostname; }],
    ['empty hostname', (record) => { record.hostname = ''; }],
    ['uppercase non-normalized hostname', (record) => { record.hostname = 'EXAMPLE.COM'; }],
    ['trailing-dot non-normalized hostname', (record) => { record.hostname = 'example.com.'; }],
    ['malformed hostname', (record) => { record.hostname = 'example.com/path'; }],
    ['hostname inconsistent with target URL', (record) => { record.hostname = 'other.example'; }],
    ['missing result', (record) => { delete record.result; }],
    ['null result', (record) => { record.result = null; }],
    ['missing target', (record) => { delete record.result.target; }],
    ['null target', (record) => { record.result.target = null; }],
    ['invalid target URL', (record) => { record.result.target.url = 'invalid URL'; }],
    ['missing timings object', (record) => { delete record.result.timings; }],
    ['null timings object', (record) => { record.result.timings = null; }],
    ['missing metrics object', (record) => { delete record.result.metrics; }],
    ['null metrics object', (record) => { record.result.metrics = null; }],
    ['missing analysis object', (record) => { delete record.result.analysis; }],
    ['null analysis object', (record) => { record.result.analysis = null; }],
    ['missing primary bottleneck', (record) => { delete record.result.analysis.primaryBottleneck; }],
    ['empty primary bottleneck', (record) => { record.result.analysis.primaryBottleneck = ' '; }],
    ['missing severity', (record) => { delete record.result.analysis.severity; }],
    ['empty severity', (record) => { record.result.analysis.severity = ''; }],
    ['missing summary', (record) => { delete record.result.analysis.summary; }],
    ['empty summary', (record) => { record.result.analysis.summary = ''; }],
    ['missing recommendations', (record) => { delete record.result.analysis.recommendations; }],
    ['non-array recommendations', (record) => { record.result.analysis.recommendations = 'none'; }],
    ['non-string recommendation', (record) => { record.result.analysis.recommendations = ['valid', null]; }]
  ];

  it.each(invalidRecordCases)('rejects a record with %s', (_description, invalidate) => {
    const record = makeHistoryRecord();
    invalidate(record);

    expect(isValidHistoryRecord(record)).toBe(false);
  });

  it.each(TIMING_FIELDS)('rejects a missing %s timing', (field) => {
    const record = makeHistoryRecord();
    delete record.result.timings[field];

    expect(isValidHistoryRecord(record)).toBe(false);
  });

  it.each(TIMING_FIELDS)('rejects a negative %s timing', (field) => {
    const record = makeHistoryRecord();
    record.result.timings[field] = -1;

    expect(isValidHistoryRecord(record)).toBe(false);
  });

  it.each([
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['string', '10']
  ])('rejects non-finite or non-numeric timing values (%s)', (_label, value) => {
    const record = makeHistoryRecord();
    record.result.timings.dnsLookup = value;

    expect(isValidHistoryRecord(record)).toBe(false);
  });

  it.each(METRIC_FIELDS)('rejects a missing %s metric', (field) => {
    const record = makeHistoryRecord();
    delete record.result.metrics[field];

    expect(isValidHistoryRecord(record)).toBe(false);
  });

  it.each(METRIC_FIELDS)('rejects an invalid %s metric', (field) => {
    const record = makeHistoryRecord();
    record.result.metrics[field] = -1;

    expect(isValidHistoryRecord(record)).toBe(false);
  });

  it('rejects a non-finite metric value', () => {
    const record = makeHistoryRecord();
    record.result.metrics.contentLengthBytes = Infinity;

    expect(isValidHistoryRecord(record)).toBe(false);
  });

  it('accepts zero-valued timing and metric fields', () => {
    const record = makeHistoryRecord();
    record.result.timings = Object.fromEntries(TIMING_FIELDS.map((field) => [field, 0]));
    record.result.metrics = Object.fromEntries(METRIC_FIELDS.map((field) => [field, 0]));

    expect(isValidHistoryRecord(record)).toBe(true);
  });
});

describe('getHistoryByHostname', () => {
  it('filters matching records and sorts them newest first', () => {
    const older = makeHistoryRecord({
      id: 'older',
      timestamp: '2025-01-01T00:00:00.000Z'
    });
    const newer = makeHistoryRecord({
      id: 'newer',
      timestamp: '2025-01-03T00:00:00.000Z'
    });
    const otherHost = makeHistoryRecord({
      id: 'other',
      hostname: 'other.example',
      url: 'https://other.example/path'
    });

    expect(getHistoryByHostname([older, otherHost, newer], 'example.com'))
      .toEqual([newer, older]);
  });

  it('matches hostnames case-insensitively and ignores a trailing dot', () => {
    const record = makeHistoryRecord();

    expect(getHistoryByHostname([record], 'EXAMPLE.COM.')).toEqual([record]);
  });

  it('returns all matching records when a hostname has multiple records', () => {
    const records = [
      makeHistoryRecord({ id: 'one', timestamp: '2025-01-01T00:00:00.000Z' }),
      makeHistoryRecord({ id: 'two', timestamp: '2025-01-02T00:00:00.000Z' }),
      makeHistoryRecord({
        id: 'other',
        hostname: 'other.example',
        url: 'https://other.example/'
      })
    ];

    expect(getHistoryByHostname(records, 'example.com').map(({ id }) => id))
      .toEqual(['two', 'one']);
  });

  it('returns an empty array for empty input or no matching records', () => {
    expect(getHistoryByHostname([], 'example.com')).toEqual([]);
    expect(getHistoryByHostname([makeHistoryRecord()], 'missing.example')).toEqual([]);
  });

  it('excludes invalid records', () => {
    const valid = makeHistoryRecord({ id: 'valid' });
    const invalid = makeHistoryRecord({ id: 'invalid' });
    invalid.result.timings.totalDuration = -1;

    expect(getHistoryByHostname([valid, invalid], 'example.com')).toEqual([valid]);
  });

  it.each([
    null,
    undefined,
    'example.com',
    {}
  ])('returns an empty array for non-array records input %j', (records) => {
    expect(getHistoryByHostname(records, 'example.com')).toEqual([]);
  });

  it.each(['', '   ', 'example.com/path', 'https://example.com', null, 42])(
    'returns an empty array for invalid hostname input %j',
    (hostname) => {
      expect(getHistoryByHostname([makeHistoryRecord()], hostname)).toEqual([]);
    }
  );

  it('does not mutate the source array and preserves input order for timestamp ties', () => {
    const first = makeHistoryRecord({
      id: 'first',
      timestamp: '2025-01-02T00:00:00.000Z'
    });
    const second = makeHistoryRecord({
      id: 'second',
      timestamp: '2025-01-02T00:00:00.000Z'
    });
    const records = [first, second];

    const matches = getHistoryByHostname(records, 'example.com');

    expect(matches).toEqual([first, second]);
    expect(matches).not.toBe(records);
    expect(records).toEqual([first, second]);
  });
});
