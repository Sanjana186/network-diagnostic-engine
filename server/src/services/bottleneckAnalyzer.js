const DNS_ABSOLUTE_THRESHOLD_MS = 100;
const DNS_TOTAL_RATIO_THRESHOLD = 0.25;
const TCP_THRESHOLD_MS = 200;
const TLS_TO_TCP_RATIO_THRESHOLD = 1.5;
const TTFB_TOTAL_RATIO_THRESHOLD = 0.4;
const DOWNLOAD_MIN_PAYLOAD_BYTES = 100 * 1024;
const DOWNLOAD_MIN_THROUGHPUT_KBPS = 1000;
const CRITICAL_TOTAL_RATIO_THRESHOLD = 0.5;

const STAGE_RECOMMENDATIONS = {
  dns: 'Evaluate resolver latency and DNS caching; review authoritative DNS and CDN DNS configuration.',
  tcp: 'Investigate network distance and routing; consider connection reuse where appropriate.',
  tls: 'Review TLS configuration and handshake overhead; consider session resumption.',
  ttfb: 'Investigate backend processing, database queries, caching, and server-side rendering.',
  dataTransfer: 'Consider response compression, payload optimization, CDN delivery, and available bandwidth.'
};

const STAGE_NAMES = {
  dns: 'DNS lookup',
  tcp: 'TCP connection',
  tls: 'TLS negotiation',
  ttfb: 'TTFB',
  dataTransfer: 'Content download'
};

function getNonNegativeFinite(source, key) {
  if (!source || typeof source !== 'object') {
    return null;
  }

  const value = source[key];
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function getPercentage(duration, totalDuration) {
  if (duration === null || totalDuration === null || totalDuration <= 0) {
    return null;
  }

  const percentage = (duration / totalDuration) * 100;
  return Number.isFinite(percentage) ? percentage : null;
}

function evaluateStages(timings, metrics) {
  const dnsDuration = getNonNegativeFinite(timings, 'dnsLookup');
  const tcpDuration = getNonNegativeFinite(timings, 'tcpConnection');
  const tlsDuration = getNonNegativeFinite(timings, 'tlsHandshake');
  const ttfbDuration = getNonNegativeFinite(timings, 'ttfb');
  const dataTransferDuration = getNonNegativeFinite(timings, 'dataTransfer');
  const totalDuration = getNonNegativeFinite(timings, 'totalDuration');
  const contentLengthBytes = getNonNegativeFinite(metrics, 'contentLengthBytes');

  const rawThroughput = getNonNegativeFinite(metrics, 'throughputKbps');
  const derivedThroughput = contentLengthBytes !== null &&
    dataTransferDuration !== null &&
    dataTransferDuration > 0
    ? (contentLengthBytes * 8) / dataTransferDuration
    : null;
  const throughputKbps = rawThroughput !== null
    ? rawThroughput
    : (Number.isFinite(derivedThroughput) ? derivedThroughput : null);

  const flaggedStages = [];
  const addStage = (key, duration) => {
    if (duration !== null && duration > 0) {
      flaggedStages.push({
        key,
        name: STAGE_NAMES[key],
        duration,
        percentage: getPercentage(duration, totalDuration)
      });
    }
  };

  const dnsPercentage = getPercentage(dnsDuration, totalDuration);
  if (
    dnsDuration !== null &&
    dnsDuration > 0 &&
    (
      dnsDuration > DNS_ABSOLUTE_THRESHOLD_MS ||
      (dnsPercentage !== null && dnsPercentage > DNS_TOTAL_RATIO_THRESHOLD * 100)
    )
  ) {
    addStage('dns', dnsDuration);
  }

  if (tcpDuration !== null && tcpDuration > TCP_THRESHOLD_MS) {
    addStage('tcp', tcpDuration);
  }

  // V1 flags TLS as significantly higher when it exceeds 1.5 times the measured TCP duration.
  // Missing TLS or TCP measurements cannot establish this comparison.
  if (
    tlsDuration !== null &&
    tlsDuration > 0 &&
    tcpDuration !== null &&
    tlsDuration > tcpDuration * TLS_TO_TCP_RATIO_THRESHOLD
  ) {
    addStage('tls', tlsDuration);
  }

  const ttfbPercentage = getPercentage(ttfbDuration, totalDuration);
  if (
    ttfbDuration !== null &&
    ttfbDuration > 0 &&
    ttfbPercentage !== null &&
    ttfbPercentage > TTFB_TOTAL_RATIO_THRESHOLD * 100
  ) {
    addStage('ttfb', ttfbDuration);
  }

  if (
    dataTransferDuration !== null &&
    dataTransferDuration > 0 &&
    contentLengthBytes !== null &&
    contentLengthBytes >= DOWNLOAD_MIN_PAYLOAD_BYTES &&
    throughputKbps !== null &&
    throughputKbps < DOWNLOAD_MIN_THROUGHPUT_KBPS
  ) {
    addStage('dataTransfer', dataTransferDuration);
  }

  return flaggedStages;
}

function buildSummary(primary, otherStages) {
  const percentageText = primary.percentage === null
    ? `${primary.duration.toFixed(1)} ms; total duration unavailable`
    : `${primary.duration.toFixed(1)} ms, ${primary.percentage.toFixed(1)}% of total duration`;
  const otherText = otherStages.length > 0
    ? ` Other flagged stages: ${otherStages.map((stage) => stage.name).join(', ')}.`
    : '';

  return `${primary.name} is the primary flagged stage (${percentageText}).${otherText}`;
}

/**
 * Applies deterministic V1 rules to the probe timings and response metrics.
 * The total-duration ratios require a valid positive total; missing measurements
 * are left unevaluated rather than inferred.
 */
export function analyzeBottlenecks(input = {}) {
  const timings = input && typeof input === 'object' ? input.timings : null;
  const metrics = input && typeof input === 'object' ? input.metrics : null;
  const flaggedStages = evaluateStages(timings, metrics);

  if (flaggedStages.length === 0) {
    return {
      primaryBottleneck: 'none',
      severity: 'optimal',
      summary: 'No bottlenecks were detected by the configured V1 rules.',
      recommendations: []
    };
  }

  // Fixed evaluation order makes ties deterministic; only a strictly longer stage replaces the current primary.
  const primary = flaggedStages.reduce((slowest, stage) =>
    stage.duration > slowest.duration ? stage : slowest
  );
  const severity = primary.percentage !== null &&
    primary.percentage > CRITICAL_TOTAL_RATIO_THRESHOLD * 100
    ? 'critical'
    : 'moderate';
  const recommendations = [primary, ...flaggedStages.filter((stage) => stage !== primary)]
    .map((stage) => STAGE_RECOMMENDATIONS[stage.key]);

  return {
    primaryBottleneck: primary.key,
    severity,
    summary: buildSummary(primary, flaggedStages.filter((stage) => stage !== primary)),
    recommendations
  };
}

export default analyzeBottlenecks;
