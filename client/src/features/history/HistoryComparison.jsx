import { AlertTriangle, ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { normalizeHostname } from './historyUtils.js';

const TIMING_FIELDS = [
  { key: 'dnsLookup', label: 'DNS lookup' },
  { key: 'tcpConnection', label: 'TCP connection' },
  { key: 'tlsHandshake', label: 'TLS handshake' },
  { key: 'ttfb', label: 'Time to first byte (TTFB)' },
  { key: 'dataTransfer', label: 'Content download' },
  { key: 'totalDuration', label: 'Total duration' }
];

function isValidMeasurement(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return 'Unavailable';
  }

  const magnitude = Math.abs(value);
  if (magnitude !== 0 && (magnitude < 0.000001 || magnitude >= 1_000_000_000)) {
    return value.toExponential(9);
  }

  return new Intl.NumberFormat(undefined, { maximumSignificantDigits: 10 }).format(value);
}

function formatMilliseconds(value) {
  return isValidMeasurement(value) ? `${formatNumber(value)} ms` : 'Unavailable';
}

function formatMetric(value, unit = '') {
  if (!isValidMeasurement(value)) {
    return 'Unavailable';
  }
  return unit ? `${formatNumber(value)} ${unit}` : formatNumber(value);
}

function formatTimestamp(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    : null;
}

function getTimingComparison(previousValue, currentValue) {
  if (!isValidMeasurement(previousValue) || !isValidMeasurement(currentValue)) {
    return {
      difference: null,
      percentage: null,
      direction: 'Unavailable'
    };
  }

  const signedDifference = currentValue - previousValue;
  const percentage = previousValue === 0
    ? null
    : ((currentValue - previousValue) / previousValue) * 100;

  return {
    difference: Math.abs(signedDifference),
    percentage: percentage !== null && Number.isFinite(percentage) ? percentage : null,
    direction: signedDifference > 0
      ? 'Increased'
      : signedDifference < 0
        ? 'Decreased'
        : 'Unchanged'
  };
}

function formatPercentage(comparison, previousValue) {
  if (comparison.percentage !== null) {
    const value = comparison.percentage;
    return `${value > 0 ? '+' : ''}${formatNumber(value)}%`;
  }

  if (comparison.direction === 'Unavailable') {
    return 'Unavailable';
  }

  return previousValue === 0
    ? 'N/A (previous value was 0 ms)'
    : 'Unavailable';
}

function directionStyle(direction) {
  switch (direction) {
    case 'Increased':
      return 'text-amber-300';
    case 'Decreased':
      return 'text-cyan-300';
    case 'Unchanged':
      return 'text-slate-300';
    default:
      return 'text-slate-500';
  }
}

function DirectionIndicator({ direction }) {
  const Icon = direction === 'Increased'
    ? ArrowUp
    : direction === 'Decreased'
      ? ArrowDown
      : direction === 'Unchanged'
        ? Minus
        : null;

  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${directionStyle(direction)}`}>
      {Icon && <Icon aria-hidden="true" className="h-3.5 w-3.5" />}
      {direction}
    </span>
  );
}

function validateComparison(currentResult, previousRecord) {
  if (!currentResult) {
    return { message: 'Run a diagnostic to compare it with a previous result.' };
  }

  if (!previousRecord) {
    return { message: 'Select a previous diagnostic run to compare.' };
  }

  const previousResult = previousRecord.result;
  if (!previousResult || typeof previousResult !== 'object') {
    return { message: 'The selected history record has no diagnostic result to compare.' };
  }

  const currentHostname = normalizeHostname(currentResult?.target?.url);
  const recordHostname = typeof previousRecord.hostname === 'string'
    ? normalizeHostname(`https://${previousRecord.hostname}`)
    : null;
  const previousResultHostname = normalizeHostname(previousResult?.target?.url);

  if (!currentHostname || !recordHostname || !previousResultHostname) {
    return { message: 'Comparison is unavailable because a target URL or hostname is invalid.' };
  }

  if (recordHostname !== previousResultHostname) {
    return { message: 'The selected history record has inconsistent hostname information.' };
  }

  if (currentHostname !== recordHostname) {
    return {
      message: `Comparisons are limited to the same domain. Current: ${currentHostname}; selected: ${recordHostname}.`
    };
  }

  return {
    currentHostname,
    previousResult
  };
}

function ComparisonMessage({ children, error = false }) {
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border p-4 text-sm ${
        error
          ? 'border-amber-500/40 bg-amber-950/20 text-amber-100'
          : 'border-white/10 bg-[#0d0f17] text-slate-300'
      }`}
      role={error ? 'alert' : 'status'}
    >
      {error && (
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
      )}
      <p>{children}</p>
    </div>
  );
}

function ContextMetric({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-mono uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-1 break-words font-mono text-xs text-slate-200">{value}</dd>
    </div>
  );
}

/**
 * Compare the current API response with a selected history record.
 * @param {{ currentResult?: object | null, previousRecord?: { hostname?: string, result?: object, timestamp?: string } | null }} props
 */
export function HistoryComparison({ currentResult, previousRecord }) {
  const comparison = validateComparison(currentResult, previousRecord);

  return (
    <section
      aria-labelledby="history-comparison-heading"
      className="space-y-4"
    >
      <div className="border-b border-white/10 pb-4">
        <div className="mb-1 text-[11px] font-mono uppercase tracking-widest text-indigo-400">
          Historical benchmark
        </div>
        <h2
          className="text-xl font-bold tracking-tight text-white"
          id="history-comparison-heading"
        >
          Diagnostic comparison
        </h2>
      </div>

      {comparison.message ? (
        <ComparisonMessage error={Boolean(currentResult && previousRecord)}>
          {comparison.message}
        </ComparisonMessage>
      ) : (
        <>
          <div className="rounded-lg border border-white/10 bg-[#0d0f17] p-4">
            <p className="text-xs text-slate-300">
              Comparing <strong className="font-mono text-white">{comparison.currentHostname}</strong>
              {' '}with an earlier run for the same domain.
            </p>
            {formatTimestamp(previousRecord.timestamp) && (
              <p className="mt-1 text-[11px] text-slate-400">
                Previous run:{' '}
                <time dateTime={previousRecord.timestamp}>
                  {formatTimestamp(previousRecord.timestamp)}
                </time>
              </p>
            )}
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              Direction describes the measured timing only; a change should be interpreted in the context of its network stage.
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-white/10 bg-[#0d0f17]">
            <table className="w-full min-w-[760px] border-collapse text-left text-xs">
              <caption className="sr-only">
                Previous and current diagnostic timing comparison for {comparison.currentHostname}
              </caption>
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3" scope="col">Timing</th>
                  <th className="px-4 py-3" scope="col">Previous</th>
                  <th className="px-4 py-3" scope="col">Current</th>
                  <th className="px-4 py-3" scope="col">Absolute difference</th>
                  <th className="px-4 py-3" scope="col">Change vs. previous</th>
                  <th className="px-4 py-3" scope="col">Direction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {TIMING_FIELDS.map(({ key, label }) => {
                  const previousValue = comparison.previousResult.timings?.[key];
                  const currentValue = currentResult.timings?.[key];
                  const result = getTimingComparison(previousValue, currentValue);
                  const difference = result.difference === null
                    ? 'Unavailable'
                    : formatMilliseconds(result.difference);

                  return (
                    <tr className="text-slate-300" key={key}>
                      <th className="px-4 py-3 font-medium text-slate-200" scope="row">
                        {label}
                      </th>
                      <td className="whitespace-nowrap px-4 py-3 font-mono">
                        {formatMilliseconds(previousValue)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono">
                        {formatMilliseconds(currentValue)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono">
                        {difference}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono">
                        {formatPercentage(result, previousValue)}
                      </td>
                      <td className="px-4 py-3">
                        <DirectionIndicator direction={result.direction} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <section
            aria-labelledby="comparison-context-heading"
            className="rounded-lg border border-white/10 bg-[#0d0f17] p-4"
          >
            <h3
              className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300"
              id="comparison-context-heading"
            >
              Response context
            </h3>
            <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <ContextMetric
                label="Previous HTTP status"
                value={formatMetric(comparison.previousResult.metrics?.statusCode)}
              />
              <ContextMetric
                label="Current HTTP status"
                value={formatMetric(currentResult.metrics?.statusCode)}
              />
              <ContextMetric
                label="Previous content length"
                value={formatMetric(comparison.previousResult.metrics?.contentLengthBytes, 'bytes')}
              />
              <ContextMetric
                label="Current content length"
                value={formatMetric(currentResult.metrics?.contentLengthBytes, 'bytes')}
              />
              <ContextMetric
                label="Previous throughput"
                value={formatMetric(comparison.previousResult.metrics?.throughputKbps, 'Kbps')}
              />
              <ContextMetric
                label="Current throughput"
                value={formatMetric(currentResult.metrics?.throughputKbps, 'Kbps')}
              />
            </dl>
          </section>
        </>
      )}
    </section>
  );
}

export default HistoryComparison;
