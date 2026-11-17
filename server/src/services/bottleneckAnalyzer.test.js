import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { analyzeBottlenecks } from './bottleneckAnalyzer.js';

const analyze = (timings = {}, metrics = {}) =>
  analyzeBottlenecks({ timings, metrics });

describe('analyzeBottlenecks', () => {
  test('returns optimal when no rule is triggered', () => {
    const result = analyze(
      {
        dnsLookup: 50,
        tcpConnection: 100,
        tlsHandshake: 100,
        ttfb: 200,
        dataTransfer: 10,
        totalDuration: 1000
      },
      { contentLengthBytes: 1024, throughputKbps: 1000 }
    );

    assert.equal(result.primaryBottleneck, 'none');
    assert.equal(result.severity, 'optimal');
  });

  test('flags DNS above 100 ms but not at exactly 100 ms', () => {
    const atThreshold = analyze({ dnsLookup: 100, totalDuration: 1000 });
    const aboveThreshold = analyze({ dnsLookup: 100.01, totalDuration: 1000 });

    assert.equal(atThreshold.primaryBottleneck, 'none');
    assert.equal(aboveThreshold.primaryBottleneck, 'dns');
  });

  test('flags DNS above 25% of total duration', () => {
    const atThreshold = analyze({ dnsLookup: 75, totalDuration: 300 });
    const aboveThreshold = analyze({ dnsLookup: 76, totalDuration: 300 });

    assert.equal(atThreshold.primaryBottleneck, 'none');
    assert.equal(aboveThreshold.primaryBottleneck, 'dns');
  });

  test('flags TCP above 200 ms but not at exactly 200 ms', () => {
    const atThreshold = analyze({ tcpConnection: 200, totalDuration: 1000 });
    const aboveThreshold = analyze({ tcpConnection: 200.01, totalDuration: 1000 });

    assert.equal(atThreshold.primaryBottleneck, 'none');
    assert.equal(aboveThreshold.primaryBottleneck, 'tcp');
  });

  test('flags TLS above 1.5 times TCP but not at the exact boundary', () => {
    const atThreshold = analyze({
      tcpConnection: 100,
      tlsHandshake: 150,
      totalDuration: 1000
    });
    const aboveThreshold = analyze({
      tcpConnection: 100,
      tlsHandshake: 150.01,
      totalDuration: 1000
    });

    assert.equal(atThreshold.primaryBottleneck, 'none');
    assert.equal(aboveThreshold.primaryBottleneck, 'tls');
  });

  test('flags TTFB above 40% of total duration', () => {
    const atThreshold = analyze({ ttfb: 400, totalDuration: 1000 });
    const aboveThreshold = analyze({ ttfb: 401, totalDuration: 1000 });

    assert.equal(atThreshold.primaryBottleneck, 'none');
    assert.equal(aboveThreshold.primaryBottleneck, 'ttfb');
  });

  test('flags a large payload with throughput below 1000 Kbps', () => {
    const result = analyze(
      { dataTransfer: 1000, totalDuration: 5000 },
      { contentLengthBytes: 100 * 1024, throughputKbps: 999.99 }
    );

    assert.equal(result.primaryBottleneck, 'dataTransfer');
  });

  test('does not flag a small payload based only on low throughput', () => {
    const result = analyze(
      { dataTransfer: 1000, totalDuration: 5000 },
      { contentLengthBytes: (100 * 1024) - 1, throughputKbps: 1 }
    );

    assert.equal(result.primaryBottleneck, 'none');
  });

  test('derives missing throughput from valid payload size and transfer duration', () => {
    const result = analyze(
      { dataTransfer: 1000, totalDuration: 5000 },
      { contentLengthBytes: 100 * 1024 }
    );

    assert.equal(result.primaryBottleneck, 'dataTransfer');
  });

  test('does not flag TLS when the timing is absent for an HTTP-style result', () => {
    const result = analyze({
      tcpConnection: 100,
      ttfb: 100,
      totalDuration: 1000
    });

    assert.equal(result.primaryBottleneck, 'none');
  });

  test('detects multiple bottlenecks and selects the longest flagged stage', () => {
    const result = analyze({
      dnsLookup: 150,
      tcpConnection: 250,
      tlsHandshake: 0,
      ttfb: 510,
      dataTransfer: 0,
      totalDuration: 1000
    });

    assert.equal(result.primaryBottleneck, 'ttfb');
    assert.equal(result.severity, 'critical');
    assert.equal(result.recommendations.length, 3);
    assert.match(result.summary, /DNS lookup/);
    assert.match(result.summary, /TCP connection/);
  });

  test('resolves equal-duration ties in fixed stage order', () => {
    const result = analyze({
      dnsLookup: 250,
      tcpConnection: 250,
      totalDuration: 1000
    });

    assert.equal(result.primaryBottleneck, 'dns');
    assert.equal(result.recommendations.length, 2);
    assert.match(result.recommendations[0], /resolver latency/);
    assert.match(result.recommendations[1], /network distance/);
  });

  test('uses critical severity only above 50% of total duration', () => {
    const atThreshold = analyze({ tcpConnection: 250, totalDuration: 500 });
    const aboveThreshold = analyze({ tcpConnection: 251, totalDuration: 500 });

    assert.equal(atThreshold.severity, 'moderate');
    assert.equal(aboveThreshold.severity, 'critical');
  });

  test('uses moderate severity for a bottleneck below the critical threshold', () => {
    const result = analyze({ tcpConnection: 250, totalDuration: 1000 });

    assert.equal(result.primaryBottleneck, 'tcp');
    assert.equal(result.severity, 'moderate');
  });

  test('safely ignores missing, null, negative, non-numeric and non-finite values', () => {
    const missing = analyze();
    const malformed = analyze(
      {
        dnsLookup: null,
        tcpConnection: -201,
        tlsHandshake: '151',
        ttfb: Infinity,
        dataTransfer: NaN,
        totalDuration: 1000
      },
      { contentLengthBytes: -1, throughputKbps: '10' }
    );
    const nullInput = analyzeBottlenecks(null);

    assert.equal(missing.primaryBottleneck, 'none');
    assert.equal(malformed.primaryBottleneck, 'none');
    assert.equal(nullInput.primaryBottleneck, 'none');
    assert.doesNotMatch(JSON.stringify(malformed), /NaN|Infinity/);
  });

  test('does not flag zero-duration stages, including downloads', () => {
    const result = analyze(
      {
        dnsLookup: 0,
        tcpConnection: 0,
        tlsHandshake: 0,
        ttfb: 0,
        dataTransfer: 0,
        totalDuration: 0
      },
      { contentLengthBytes: 200 * 1024, throughputKbps: 0 }
    );

    assert.equal(result.primaryBottleneck, 'none');
    assert.equal(result.severity, 'optimal');
  });

  test('zero or invalid total duration does not produce NaN or Infinity', () => {
    const zeroTotal = analyze({ dnsLookup: 101, totalDuration: 0 });
    const invalidTotal = analyze({ dnsLookup: 101, totalDuration: -1 });

    assert.equal(zeroTotal.primaryBottleneck, 'dns');
    assert.equal(zeroTotal.severity, 'moderate');
    assert.equal(invalidTotal.primaryBottleneck, 'dns');
    assert.equal(invalidTotal.severity, 'moderate');
    assert.doesNotMatch(JSON.stringify(zeroTotal), /NaN|Infinity/);
    assert.doesNotMatch(JSON.stringify(invalidTotal), /NaN|Infinity/);
  });

  test('does not mutate the input objects', () => {
    const timings = Object.freeze({
      dnsLookup: 150,
      tcpConnection: 100,
      totalDuration: 1000
    });
    const metrics = Object.freeze({ contentLengthBytes: 2048 });
    const input = Object.freeze({ timings, metrics });
    const before = JSON.stringify(input);

    analyzeBottlenecks(input);

    assert.equal(JSON.stringify(input), before);
  });

  test('returns exactly the four public contract fields', () => {
    const result = analyze({ tcpConnection: 250, totalDuration: 1000 });

    assert.deepEqual(Object.keys(result), [
      'primaryBottleneck',
      'severity',
      'summary',
      'recommendations'
    ]);
  });

  test('returns string recommendations corresponding to each detected stage', () => {
    const cases = [
      {
        timings: { dnsLookup: 101, totalDuration: 1000 },
        metrics: {},
        stage: 'dns',
        recommendation: /resolver latency/
      },
      {
        timings: { tcpConnection: 201, totalDuration: 1000 },
        metrics: {},
        stage: 'tcp',
        recommendation: /network distance/
      },
      {
        timings: { tcpConnection: 100, tlsHandshake: 151, totalDuration: 1000 },
        metrics: {},
        stage: 'tls',
        recommendation: /session resumption/
      },
      {
        timings: { ttfb: 401, totalDuration: 1000 },
        metrics: {},
        stage: 'ttfb',
        recommendation: /server-side rendering/
      },
      {
        timings: { dataTransfer: 1000, totalDuration: 5000 },
        metrics: { contentLengthBytes: 100 * 1024, throughputKbps: 999 },
        stage: 'dataTransfer',
        recommendation: /payload optimization/
      }
    ];

    for (const testCase of cases) {
      const result = analyze(testCase.timings, testCase.metrics);

      assert.equal(result.primaryBottleneck, testCase.stage);
      assert.equal(result.recommendations.length, 1);
      assert.equal(typeof result.recommendations[0], 'string');
      assert.match(result.recommendations[0], testCase.recommendation);
    }
  });
});
