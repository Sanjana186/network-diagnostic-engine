import { useState, useRef, useCallback } from 'react';

/**
 * Computes mathematical average of stage timings across multiple runs
 */
function computeAverageResults(runs) {
  if (!runs || runs.length === 0) return null;
  if (runs.length === 1) return runs[0];

  const count = runs.length;
  const base = runs[0];

  const sumTimings = {
    dnsLookup: 0,
    tcpConnection: 0,
    tlsHandshake: 0,
    ttfb: 0,
    dataTransfer: 0,
    totalDuration: 0,
  };

  let sumContentLength = 0;
  let sumThroughput = 0;

  runs.forEach((r) => {
    sumTimings.dnsLookup += r.timings.dnsLookup || 0;
    sumTimings.tcpConnection += r.timings.tcpConnection || 0;
    sumTimings.tlsHandshake += r.timings.tlsHandshake || 0;
    sumTimings.ttfb += r.timings.ttfb || 0;
    sumTimings.dataTransfer += r.timings.dataTransfer || 0;
    sumTimings.totalDuration += r.timings.totalDuration || 0;

    sumContentLength += r.metrics.contentLengthBytes || 0;
    sumThroughput += r.metrics.throughputKbps || 0;
  });

  const avgTimings = {
    dnsLookup: Number((sumTimings.dnsLookup / count).toFixed(2)),
    tcpConnection: Number((sumTimings.tcpConnection / count).toFixed(2)),
    tlsHandshake: Number((sumTimings.tlsHandshake / count).toFixed(2)),
    ttfb: Number((sumTimings.ttfb / count).toFixed(2)),
    dataTransfer: Number((sumTimings.dataTransfer / count).toFixed(2)),
    totalDuration: Number((sumTimings.totalDuration / count).toFixed(2)),
  };

  const avgMetrics = {
    statusCode: base.metrics.statusCode,
    contentLengthBytes: Math.round(sumContentLength / count),
    throughputKbps: Number((sumThroughput / count).toFixed(2)),
    httpVersion: base.metrics.httpVersion,
  };

  // Re-evaluate bottleneck on the averaged timings
  const stageEntries = [
    { name: 'DNS Resolution', key: 'dnsLookup', time: avgTimings.dnsLookup },
    { name: 'TCP Connection', key: 'tcpConnection', time: avgTimings.tcpConnection },
    { name: 'TLS Handshake', key: 'tlsHandshake', time: avgTimings.tlsHandshake },
    { name: 'Server Response (TTFB)', key: 'ttfb', time: avgTimings.ttfb },
    { name: 'Content Download', key: 'dataTransfer', time: avgTimings.dataTransfer },
  ];

  const slowest = stageEntries.reduce((max, curr) => curr.time > max.time ? curr : max, stageEntries[0]);
  const percentageOfTotal = avgTimings.totalDuration > 0
    ? Number(((slowest.time / avgTimings.totalDuration) * 100).toFixed(1))
    : 0;

  const analysis = {
    primaryBottleneck: slowest.key,
    bottleneckName: slowest.name,
    durationMs: slowest.time,
    percentageOfTotal: percentageOfTotal,
    severity: percentageOfTotal > 50 ? 'critical' : (percentageOfTotal > 30 ? 'moderate' : 'optimal'),
    summary: `${slowest.name} averaged ${slowest.time}ms across ${count} runs (${percentageOfTotal}% of total latency).`,
    recommendations: [
      `Persistent bottleneck across ${count} test runs identified at ${slowest.name}.`
    ]
  };

  return {
    ...base,
    isMultiRun: true,
    runCount: count,
    runs: runs,
    timings: avgTimings,
    metrics: avgMetrics,
    analysis: base.analysis || analysis,
  };
}

/**
 * Custom React hook managing single and multi-run diagnostic probes.
 */
export function useDiagnostic() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null); // { current: 1, total: 3 }
  const abortControllerRef = useRef(null);

  const runSingle = async (targetUrl, signal) => {
    const response = await fetch('/api/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetUrl }),
      signal: signal,
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.message || `Request failed with status ${response.status}`);
    }
    return json;
  };

  const run = useCallback(async (targetUrl, options = {}) => {
    const totalRuns = options.runs || 1;

    // Cancel any previous in-flight diagnostic request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    setProgress({ current: 1, total: totalRuns });

    const collectedRuns = [];

    try {
      for (let i = 1; i <= totalRuns; i++) {
        setProgress({ current: i, total: totalRuns });
        const runResult = await runSingle(targetUrl, controller.signal);
        collectedRuns.push(runResult);

        // Small 250ms pause between runs to allow socket teardown
        if (i < totalRuns) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }

      const finalData = totalRuns > 1 
        ? computeAverageResults(collectedRuns) 
        : collectedRuns[0];

      setData(finalData);
      setLoading(false);
      setProgress(null);
      return finalData;
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Diagnostic request cancelled');
        return null;
      }

      setError(err.message || 'An error occurred during network analysis.');
      setLoading(false);
      setProgress(null);
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
    setProgress(null);
  }, []);

  return {
    data,
    loading,
    error,
    progress,
    run,
    reset,
  };
}

export default useDiagnostic;
