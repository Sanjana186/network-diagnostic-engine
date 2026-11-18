import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Clock3,
  RotateCcw,
  Trash2,
  X
} from 'lucide-react';
import { useDiagnosticHistory } from './useDiagnosticHistory.js';

function formatDuration(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? `${value.toFixed(2)} ms`
    : 'Unavailable';
}

function formatTimestamp(value) {
  const timestamp = typeof value === 'string' ? new Date(value) : null;
  if (!timestamp || !Number.isFinite(timestamp.getTime())) {
    return 'Time unavailable';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(timestamp);
}

function formatLabel(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return 'Unavailable';
  }

  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function severityClass(severity) {
  switch (typeof severity === 'string' ? severity.toLowerCase() : '') {
    case 'critical':
      return 'border-rose-500/40 bg-rose-500/10 text-rose-300';
    case 'moderate':
    case 'medium':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
    case 'optimal':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
    default:
      return 'border-white/10 bg-white/5 text-slate-300';
  }
}

export function HistoryPanel() {
  const {
    history,
    isLoading,
    storageError,
    deleteRecord,
    clearHistory
  } = useDiagnosticHistory();
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [operationError, setOperationError] = useState('');
  const records = Array.isArray(history) ? history : [];

  const handleDelete = (id) => {
    const outcome = deleteRecord(id);
    if (outcome?.success === true) {
      setPendingDeleteId(null);
      setOperationError('');
      return;
    }

    setPendingDeleteId(null);
    setOperationError('This diagnostic could not be deleted. Please try again.');
  };

  const handleClear = () => {
    const outcome = clearHistory();
    if (outcome?.success === true) {
      setConfirmClear(false);
      setOperationError('');
      return;
    }

    setConfirmClear(false);
    setOperationError('History could not be cleared. Please try again.');
  };

  return (
    <section
      aria-labelledby="diagnostic-history-heading"
      className="space-y-4"
    >
      <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-indigo-400">
            <Activity aria-hidden="true" className="h-3.5 w-3.5" />
            Stored diagnostics
          </div>
          <h2
            id="diagnostic-history-heading"
            className="text-xl font-bold tracking-tight text-white"
          >
            History
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Previous network diagnostic runs saved in this browser.
          </p>
        </div>

        {records.length > 0 && !isLoading && (
          confirmClear ? (
            <div
              aria-label="Confirm clearing diagnostic history"
              className="flex flex-wrap items-center gap-2 rounded border border-rose-500/30 bg-rose-950/20 p-2"
              role="group"
            >
              <span className="mr-1 text-xs text-rose-200">
                Clear all {records.length} runs?
              </span>
              <button
                className="rounded border border-white/15 px-2.5 py-1.5 text-xs text-slate-200 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
                onClick={() => setConfirmClear(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded border border-rose-500/40 bg-rose-500/15 px-2.5 py-1.5 text-xs font-semibold text-rose-200 transition-colors hover:bg-rose-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-300"
                onClick={handleClear}
                type="button"
              >
                Confirm clear
              </button>
            </div>
          ) : (
            <button
              className="inline-flex items-center justify-center gap-2 self-start rounded border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-rose-500/40 hover:text-rose-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400 sm:self-auto"
              onClick={() => {
                setOperationError('');
                setConfirmClear(true);
                setPendingDeleteId(null);
              }}
              type="button"
            >
              <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
              Clear history
            </button>
          )
        )}
      </div>

      {storageError && (
        <div
          className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-950/20 p-3 text-xs text-amber-100"
          role="alert"
        >
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p>
            Browser storage could not be accessed or updated. History may be unavailable, and changes may not be saved.
          </p>
        </div>
      )}

      {operationError && (
        <div
          className="flex items-start justify-between gap-3 rounded-lg border border-rose-500/40 bg-rose-950/20 p-3 text-xs text-rose-100"
          role="alert"
        >
          <p>{operationError}</p>
          <button
            aria-label="Dismiss history operation error"
            className="rounded p-0.5 text-rose-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-300"
            onClick={() => setOperationError('')}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      )}

      {isLoading ? (
        <div
          aria-live="polite"
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0d0f17] p-5 text-sm text-slate-300"
          role="status"
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4 animate-spin text-indigo-300" />
          Loading diagnostic history…
        </div>
      ) : records.length > 0 ? (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {records.map((record, index) => {
            const result = record?.result ?? {};
            const target = result.target ?? {};
            const timings = result.timings ?? {};
            const metrics = result.metrics ?? {};
            const analysis = result.analysis ?? {};
            const hostname = typeof record?.hostname === 'string' && record.hostname
              ? record.hostname
              : typeof target.url === 'string' && target.url
                ? target.url
                : 'Unknown target';
            const statusCode = typeof metrics.statusCode === 'number' &&
              Number.isFinite(metrics.statusCode)
              ? metrics.statusCode
              : 'Unavailable';
            const recordId = typeof record?.id === 'string' ? record.id : '';
            const isConfirmingDelete = pendingDeleteId === recordId && recordId !== '';

            return (
              <li
                className="min-w-0 rounded-lg border border-white/10 bg-[#0d0f17] p-4 transition-colors hover:border-white/20"
                key={`${recordId || 'history-record'}-${index}`}
              >
                <article aria-label={`Diagnostic history for ${hostname}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="break-all font-mono text-sm font-semibold text-white">
                        {hostname}
                      </h3>
                      {typeof target.url === 'string' && target.url !== hostname && (
                        <p className="mt-1 break-all text-[11px] text-slate-500">
                          {target.url}
                        </p>
                      )}
                      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Clock3 aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                        <time dateTime={typeof record.timestamp === 'string' ? record.timestamp : undefined}>
                          {formatTimestamp(record.timestamp)}
                        </time>
                      </p>
                    </div>

                    {isConfirmingDelete ? (
                      <div
                        aria-label={`Confirm deleting history for ${hostname}`}
                        className="flex shrink-0 flex-wrap items-center gap-2"
                        role="group"
                      >
                        <span className="text-xs text-rose-200">Delete this run?</span>
                        <button
                          className="rounded border border-white/15 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
                          onClick={() => setPendingDeleteId(null)}
                          type="button"
                        >
                          Cancel
                        </button>
                        <button
                          className="rounded border border-rose-500/40 bg-rose-500/15 px-2.5 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-300"
                          onClick={() => handleDelete(recordId)}
                          type="button"
                        >
                          Confirm delete
                        </button>
                      </div>
                    ) : (
                      <button
                        aria-label={`Delete diagnostic for ${hostname}`}
                        className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded border border-white/10 px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:border-rose-500/40 hover:text-rose-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
                        onClick={() => {
                          setOperationError('');
                          setConfirmClear(false);
                          setPendingDeleteId(recordId);
                        }}
                        type="button"
                      >
                        <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    )}
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-white/5 pt-3 sm:grid-cols-3">
                    <div>
                      <dt className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                        HTTP status
                      </dt>
                      <dd className="mt-1 font-mono text-sm text-slate-200">
                        {statusCode}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                        Total duration
                      </dt>
                      <dd className="mt-1 font-mono text-sm text-slate-200">
                        {formatDuration(timings.totalDuration)}
                      </dd>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <dt className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                        Primary bottleneck
                      </dt>
                      <dd className="mt-1">
                        <span className="inline-flex rounded border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-200">
                          {formatLabel(analysis.primaryBottleneck)}
                        </span>
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    {typeof analysis.summary === 'string' && analysis.summary.trim() !== '' && (
                      <p className="min-w-0 flex-1 text-xs leading-relaxed text-slate-400">
                        {analysis.summary}
                      </p>
                    )}
                    <span className={`rounded border px-2 py-1 text-[10px] font-mono uppercase ${severityClass(analysis.severity)}`}>
                      {formatLabel(analysis.severity)}
                    </span>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      ) : storageError ? (
        <p
          className="rounded-lg border border-white/10 bg-[#0d0f17] p-4 text-sm text-slate-400"
          role="status"
        >
          History entries cannot be displayed until browser storage is available.
        </p>
      ) : (
        <div className="rounded-lg border border-white/10 bg-[#0d0f17] p-6 text-center">
          <Activity aria-hidden="true" className="mx-auto h-6 w-6 text-slate-500" />
          <h3 className="mt-3 text-sm font-semibold text-slate-200">
            No diagnostic history yet
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Previous diagnostic runs will appear here.
          </p>
        </div>
      )}
    </section>
  );
}

export default HistoryPanel;
