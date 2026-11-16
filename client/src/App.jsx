import React, { useState } from 'react';
import { 
  Activity, 
  Terminal, 
  Zap, 
  AlertTriangle, 
  RefreshCw, 
  ArrowRight,
  ShieldCheck,
  Server,
  ExternalLink
} from 'lucide-react';
import { useDiagnostic } from './features/diagnostics/hooks/useDiagnostic';
import { MetricCards } from './features/diagnostics/MetricCards';
import { WaterfallChart } from './features/diagnostics/WaterfallChart';

function App() {
  const [inputUrl, setInputUrl] = useState('https://example.com');
  const { data, loading, error, run } = useDiagnostic();

  const presets = [
    'https://example.com',
    'https://github.com',
    'https://cloudflare.com',
    'https://wikipedia.org'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;
    
    let formatted = inputUrl.trim();
    if (!/^https?:\/\//i.test(formatted)) {
      formatted = `https://${formatted}`;
      setInputUrl(formatted);
    }
    
    run(formatted);
  };

  const handlePresetClick = (preset) => {
    setInputUrl(preset);
    run(preset);
  };

  return (
    <div className="min-h-screen bg-[#07080c] text-slate-100 flex flex-col font-sans bg-tech-grid">
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
                // SPEC_2026.V1
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-[11px] font-mono">
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded bg-white/5 border border-white/10 text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>ENGINE: READY</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              TEAM: 02
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Title Section */}
        <div className="border-b border-white/10 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="text-[11px] font-mono tracking-widest text-indigo-400 uppercase mb-1">
                SYSTEM TELEMETRY & LATENCY DECONSTRUCTION
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Inspect Request Latencies & Network Bottlenecks
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-2xl font-normal leading-relaxed">
                Probe endpoints to isolate millisecond delays across OSI layers: DNS resolution, TCP handshake, TLS negotiation, TTFB, and data streaming.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <Server className="w-3.5 h-3.5" />
              <span>NODE NATIVE PROBES</span>
            </div>
          </div>
        </div>

        {/* Command / Input Bar */}
        <div className="border border-white/10 bg-[#0d0f17] rounded-lg p-3 sm:p-4 shadow-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1 flex items-center bg-[#07080c] border border-white/10 rounded px-3 py-2 focus-within:border-indigo-500 transition-colors">
              <span className="text-xs font-mono text-indigo-400 select-none mr-2">
                TARGET&gt;
              </span>
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={loading}
                className="w-full bg-transparent border-none text-white font-mono text-xs sm:text-sm placeholder-slate-600 focus:outline-none"
              />
              <span className="hidden md:inline-block text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded border border-white/5 bg-white/5">
                HTTP / HTTPS
              </span>
            </div>
            
            <button
              type="submit"
              disabled={loading || !inputUrl.trim()}
              className="px-5 py-2.5 bg-white hover:bg-slate-200 disabled:bg-slate-700 disabled:cursor-not-allowed text-black font-mono font-semibold text-xs rounded transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>PROBING...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-black" />
                  <span>EXECUTE PROBE</span>
                </>
              )}
            </button>
          </form>

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

        {/* Live Diagnostics Dashboard */}
        {data && (
          <div className="space-y-6">
            {/* Target Hardware / Network Specification Bar */}
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

            {/* Metric Cards (Instruments) */}
            <MetricCards data={data} />

            {/* Waterfall Chart (Oscilloscope) */}
            <WaterfallChart data={data} />
          </div>
        )}

        {/* Empty State / Technical Architecture Explainer */}
        {!data && !loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="border border-white/10 bg-[#0d0f17] rounded-lg p-5">
              <div className="text-[10px] font-mono text-slate-400 mb-2">01 // LAYER 4 - 7 TELEMETRY</div>
              <h3 className="text-sm font-bold text-white mb-1">Native Socket Hooks</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Directly hooks into Node.js <code className="text-slate-300 font-mono">dns</code>, <code className="text-slate-300 font-mono">net</code>, and <code className="text-slate-300 font-mono">tls</code> socket events, avoiding synthetic delays from library abstractions.
              </p>
            </div>

            <div className="border border-white/10 bg-[#0d0f17] rounded-lg p-5">
              <div className="text-[10px] font-mono text-slate-400 mb-2">02 // SEQUENTIAL OFFSETS</div>
              <h3 className="text-sm font-bold text-white mb-1">Waterfall Timeline</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Calculates cumulative phase offsets along a single timeline, visualizing exact latency transitions matching modern browser DevTools.
              </p>
            </div>

            <div className="border border-white/10 bg-[#0d0f17] rounded-lg p-5">
              <div className="text-[10px] font-mono text-slate-400 mb-2">03 // DETERMINISTIC HEURISTICS</div>
              <h3 className="text-sm font-bold text-white mb-1">Bottleneck Detection</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Applies rule-based threshold heuristics across latency percentages to pinpoint network transit vs. backend compute bottlenecks.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Technical Footer */}
      <footer className="border-t border-white/10 bg-[#07080c] py-4 text-[11px] font-mono text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>REACT JS CAPSTONE // NETWORK DIAGNOSTIC ENGINE</div>
          <div className="text-slate-400">VERSION 1.0.0 // ENGINEER 1 & 2</div>
        </div>
      </footer>
    </div>
  );
}

export default App;
