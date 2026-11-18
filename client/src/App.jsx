import React, { useState } from 'react';
import { 
  Activity, 
  Terminal, 
  Zap, 
  AlertTriangle, 
  RefreshCw, 
  Server,
  History,
  GitCompare,
  Layers
} from 'lucide-react';
import { useDiagnostic } from './features/diagnostics/hooks/useDiagnostic';
import { UrlForm } from './features/diagnostics/UrlForm';
import { MetricCards } from './features/diagnostics/MetricCards';
import { WaterfallChart } from './features/diagnostics/WaterfallChart';
import { useDiagnosticHistory } from './features/history/useDiagnosticHistory';
import { HistoryPanel } from './features/history/HistoryPanel';
import { HistoryComparison } from './features/history/HistoryComparison';
import { CustomCursor } from './components/ui/CustomCursor';

function App() {
  const [inputUrl, setInputUrl] = useState('https://example.com');
  const [activeTab, setActiveTab] = useState('probe'); // 'probe' | 'history' | 'compare'
  const [comparisonTargetId, setComparisonTargetId] = useState('');

  const { data, loading, error, run } = useDiagnostic();
  const { history, addRecord } = useDiagnosticHistory();

  const presets = [
    'https://example.com',
    'https://github.com',
    'https://cloudflare.com',
    'https://wikipedia.org'
  ];

  const handleExecute = async (urlToRun) => {
    const raw = urlToRun || inputUrl;
    if (!raw.trim()) return;

    let formatted = raw.trim();
    if (!/^https?:\/\//i.test(formatted)) {
      formatted = `https://${formatted}`;
      setInputUrl(formatted);
    }

    try {
      const result = await run(formatted);
      if (result) {
        addRecord(result);
      }
    } catch (err) {
      // Error handled by useDiagnostic
    }
  };

  const handleFormSubmit = () => {
    handleExecute(inputUrl);
  };

  const handlePresetClick = (preset) => {
    setInputUrl(preset);
    handleExecute(preset);
  };

  // Find previous runs matching current domain for quick comparison
  const currentHostname = data?.target?.hostname;
  const matchingHistoryRecords = currentHostname
    ? history.filter(
        (r) =>
          r.hostname === currentHostname ||
          r.result?.target?.hostname === currentHostname
      )
    : [];

  const selectedComparisonRecord = comparisonTargetId
    ? history.find((r) => r.id === comparisonTargetId)
    : (matchingHistoryRecords.length > 1 ? matchingHistoryRecords[1] : null);

  return (
    <div className="min-h-screen bg-[#07080c] text-slate-100 flex flex-col font-sans bg-tech-grid">
      <CustomCursor />
      {/* Technical Header / Masthead */}
      <header className="border-b border-white/10 bg-[#07080c]/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 bg-white text-black font-mono font-bold text-xs flex items-center justify-center rounded">
              ND
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="font-mono text-xs font-bold tracking-wider uppercase text-white">
                NETWORK DIAGNOSTIC ENGINE
              </span>
              <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                // FULL_STACK_V1
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-1 bg-white/5 border border-white/10 p-0.5 rounded font-mono text-xs">
            <button
              onClick={() => setActiveTab('probe')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                activeTab === 'probe' 
                  ? 'bg-white text-black font-semibold' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>PROBE</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                activeTab === 'history' 
                  ? 'bg-white text-black font-semibold' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>HISTORY ({history.length})</span>
            </button>
            {data && (
              <button
                onClick={() => setActiveTab('compare')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                  activeTab === 'compare' 
                    ? 'bg-white text-black font-semibold' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>COMPARE</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Title Section */}
        <div className="border-b border-white/10 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="text-[11px] font-mono tracking-widest text-cyan-400 uppercase mb-1">
                SYSTEM TELEMETRY &amp; LATENCY DECONSTRUCTION
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Inspect Request Latencies &amp; Network Bottlenecks
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-2xl font-normal leading-relaxed">
                Probe endpoints to isolate millisecond delays across OSI layers: DNS resolution, TCP handshake, TLS negotiation, TTFB, and data streaming.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <Server className="w-3.5 h-3.5" />
              <span>SSRF-PROTECTED SOCKET ENGINE</span>
            </div>
          </div>
        </div>

        {/* TAB 1: LIVE PROBE */}
        {activeTab === 'probe' && (
          <div className="space-y-6">
            {/* Engineer 2's UrlForm Component */}
            <div className="border border-white/10 bg-[#0d0f17] rounded-lg p-3 sm:p-4 shadow-2xl">
              <UrlForm
                value={inputUrl}
                onChange={setInputUrl}
                onSubmit={handleFormSubmit}
                loading={loading}
              />

              {/* Quick Presets */}
              <div className="mt-3 pt-2.5 border-t border-white/5 flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
                <span className="text-slate-400">PRESETS:</span>
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePresetClick(p)}
                    className="px-2 py-0.5 rounded bg-white/5 border border-white/5 hover:border-white/20 text-slate-300 hover:text-white transition-colors"
                  >
                    {p.replace('https://', '')}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="border border-rose-500/50 bg-rose-950/20 rounded-lg p-4 flex items-start gap-3 text-rose-200 font-mono text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-rose-300 block uppercase">ERROR // PROBE_EXECUTION_FAILURE</span>
                  <p className="mt-0.5 text-rose-300/80">{error}</p>
                </div>
              </div>
            )}

            {/* Live Diagnostics Results */}
            {data && (
              <div className="space-y-6">
                {/* Hardware & Network Specification Strip */}
                <div className="border border-white/10 bg-[#0d0f17] rounded-lg px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">ENDPOINT:</span>
                    <span className="text-white font-bold">{data.target.url}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-slate-400">
                    <span>RESOLVED_IP: <strong className="text-slate-200">{data.target.ip}</strong></span>
                    <span>PORT: <strong className="text-slate-200">{data.target.port}</strong></span>
                    <span>SCHEME: <strong className="text-slate-200">{data.target.protocol.toUpperCase()}</strong></span>
                    <span>HTTP_VER: <strong className="text-slate-200">{data.metrics.httpVersion || '1.1'}</strong></span>
                  </div>
                </div>

                {/* Metric Cards */}
                <MetricCards data={data} />

                {/* Waterfall Timeline */}
                <WaterfallChart data={data} />
              </div>
            )}

            {/* Empty State */}
            {!data && !loading && !error && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                <div className="border border-white/10 bg-[#0d0f17] rounded-lg p-5">
                  <div className="text-[10px] font-mono text-slate-400 mb-2">01 // LAYER 4 - 7 TELEMETRY</div>
                  <h3 className="text-sm font-bold text-white mb-1">Native Socket Hooks</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Directly hooks into Node.js socket events, tracking microsecond timings across DNS, TCP, TLS, and TTFB.
                  </p>
                </div>

                <div className="border border-white/10 bg-[#0d0f17] rounded-lg p-5">
                  <div className="text-[10px] font-mono text-slate-400 mb-2">02 // SEQUENTIAL OFFSETS</div>
                  <h3 className="text-sm font-bold text-white mb-1">Waterfall Timeline</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Visualizes exact sequential phase offsets with in-bar labels and interactive microsecond inspection.
                  </p>
                </div>

                <div className="border border-white/10 bg-[#0d0f17] rounded-lg p-5">
                  <div className="text-[10px] font-mono text-slate-400 mb-2">03 // SSRF &amp; HEURISTICS</div>
                  <h3 className="text-sm font-bold text-white mb-1">Security &amp; Analysis</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Blocks private RFC-1918 subnets, cloud metadata, and applies deterministic V1 bottleneck rules.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DIAGNOSTIC HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <HistoryPanel />
          </div>
        )}

        {/* TAB 3: BENCHMARK COMPARISON */}
        {activeTab === 'compare' && (
          <div className="space-y-6">
            <div className="border border-white/10 bg-[#0d0f17] rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                    Historical Benchmark Comparison
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Compare current probe against previous diagnostic runs for {currentHostname}
                  </p>
                </div>

                {matchingHistoryRecords.length > 0 && (
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-slate-400">Select Past Run:</span>
                    <select
                      value={comparisonTargetId}
                      onChange={(e) => setComparisonTargetId(e.target.value)}
                      className="bg-[#07080c] border border-white/10 rounded px-2.5 py-1 text-slate-200 text-xs focus:outline-none"
                    >
                      {matchingHistoryRecords.map((rec) => (
                        <option key={rec.id} value={rec.id}>
                          {new Date(rec.timestamp).toLocaleTimeString()} ({rec.result?.timings?.totalDuration}ms)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Render Engineer 2's HistoryComparison Component */}
              <HistoryComparison
                currentResult={data}
                previousRecord={selectedComparisonRecord}
              />
            </div>
          </div>
        )}
      </main>

      {/* Technical Footer */}
      <footer className="border-t border-white/10 bg-[#07080c] py-4 text-[11px] font-mono text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>REACT JS CAPSTONE // NETWORK DIAGNOSTIC ENGINE</div>
          <div className="text-slate-400">VERSION 1.0.0 // ENGINEER 1 &amp; 2 FULLY INTEGRATED</div>
        </div>
      </footer>
    </div>
  );
}

export default App;
