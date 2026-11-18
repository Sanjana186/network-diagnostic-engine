const REQUIRED_TIMING_FIELDS = [
  'dnsLookup',
  'tcpConnection',
  'tlsHandshake',
  'ttfb',
  'dataTransfer',
  'totalDuration'
];

const REQUIRED_METRIC_FIELDS = [
  'statusCode',
  'contentLengthBytes',
  'throughputKbps'
];

let fallbackIdSequence = 0;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonNegativeFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function normalizeParsedHostname(hostname) {
  let normalized = hostname.toLowerCase();
  while (normalized.endsWith('.')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized || null;
}

function normalizeHostnameValue(hostname) {
  if (typeof hostname !== 'string' || hostname.trim() === '') {
    return null;
  }

  const value = hostname.trim();
  if (
    value.includes('/') ||
    value.includes('?') ||
    value.includes('#') ||
    value.includes('@') ||
    (!value.startsWith('[') && value.includes(':')) ||
    (value.startsWith('[') && !value.endsWith(']'))
  ) {
    return null;
  }

  try {
    const parsedUrl = new URL(`http://${value}`);
    return normalizeParsedHostname(parsedUrl.hostname);
  } catch {
    return null;
  }
}

function isDiagnosticResponse(result) {
  try {
    if (!isObject(result) || !isObject(result.target)) {
      return false;
    }

    if (normalizeHostname(result.target.url) === null) {
      return false;
    }

    if (
      !isObject(result.timings) ||
      !REQUIRED_TIMING_FIELDS.every((field) =>
        isNonNegativeFiniteNumber(result.timings[field])
      )
    ) {
      return false;
    }

    if (
      !isObject(result.metrics) ||
      !REQUIRED_METRIC_FIELDS.every((field) =>
        isNonNegativeFiniteNumber(result.metrics[field])
      )
    ) {
      return false;
    }

    const analysis = result.analysis;
    return isObject(analysis) &&
      typeof analysis.primaryBottleneck === 'string' &&
      analysis.primaryBottleneck.trim() !== '' &&
      typeof analysis.severity === 'string' &&
      analysis.severity.trim() !== '' &&
      typeof analysis.summary === 'string' &&
      analysis.summary.trim() !== '' &&
      Array.isArray(analysis.recommendations) &&
      analysis.recommendations.every((recommendation) => typeof recommendation === 'string');
  } catch {
    return false;
  }
}

function createRecordId() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }

  fallbackIdSequence += 1;
  return `history-${Date.now().toString(36)}-${fallbackIdSequence.toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function normalizeHostname(url) {
  if (typeof url !== 'string' || url.trim() === '') {
    return null;
  }

  try {
    const parsedUrl = new URL(url.trim());
    return normalizeParsedHostname(parsedUrl.hostname);
  } catch {
    return null;
  }
}

export function createHistoryRecord(result) {
  if (!isDiagnosticResponse(result)) {
    throw new TypeError('A complete diagnostic response with a valid target URL is required.');
  }

  return {
    id: createRecordId(),
    timestamp: new Date().toISOString(),
    hostname: normalizeHostname(result.target.url),
    result
  };
}

export function isValidHistoryRecord(record) {
  try {
    if (!isObject(record)) {
      return false;
    }

    if (typeof record.id !== 'string' || record.id.trim() === '') {
      return false;
    }

    if (
      typeof record.timestamp !== 'string' ||
      record.timestamp.trim() === '' ||
      !Number.isFinite(Date.parse(record.timestamp))
    ) {
      return false;
    }

    if (
      typeof record.hostname !== 'string' ||
      normalizeHostnameValue(record.hostname) !== record.hostname
    ) {
      return false;
    }

    return isDiagnosticResponse(record.result) &&
      normalizeHostname(record.result.target.url) === record.hostname;
  } catch {
    return false;
  }
}

export function getHistoryByHostname(records, hostname) {
  try {
    if (!Array.isArray(records)) {
      return [];
    }

    const normalizedHostname = normalizeHostnameValue(hostname);
    if (normalizedHostname === null) {
      return [];
    }

    return records
      .filter((record) =>
        isValidHistoryRecord(record) && record.hostname === normalizedHostname
      )
      .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp));
  } catch {
    return [];
  }
}
