import React, { useState } from 'react';
import { Activity, ShieldCheck, Zap, Globe } from 'lucide-react';

function App() {
  const [url, setUrl] = useState('');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">Network Diagnostic Engine</h1>
              <p className="text-xs text-slate-400">HTTP/HTTPS Latency & Bottleneck Analyzer</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-700/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>API: Ready</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl tracking-tight">
            Analyze Website Network Performance
          </h2>
          <p className="mt-3 text-slate-400 text-sm sm:text-base">
            Deconstruct HTTP/HTTPS requests into DNS resolution, TCP handshake, TLS negotiation, 
            TTFB, and content download to pinpoint exact performance bottlenecks.
          </p>
        </div>

        {/* Input Placeholder Card */}
        <div className="max-w-3xl mx-auto bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-xl mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Globe className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter website URL (e.g., https://example.com)"
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
            </div>
            <button
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              <Zap className="w-4 h-4" />
              <span>Run Diagnostics</span>
            </button>
          </div>
        </div>

        {/* Initial Empty State / Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <div className="p-5 rounded-lg bg-slate-900/40 border border-slate-800/80">
            <div className="text-indigo-400 font-semibold text-sm mb-1">Stage-by-Stage Breakdown</div>
            <p className="text-xs text-slate-400">
              Isolates millisecond timing across DNS lookup, TCP socket creation, SSL/TLS handshake, TTFB, and data transfer.
            </p>
          </div>
          <div className="p-5 rounded-lg bg-slate-900/40 border border-slate-800/80">
            <div className="text-emerald-400 font-semibold text-sm mb-1">Bottleneck Detection</div>
            <p className="text-xs text-slate-400">
              Rule-based heuristic engine flags sluggish stages and provides direct, human-readable troubleshooting advice.
            </p>
          </div>
          <div className="p-5 rounded-lg bg-slate-900/40 border border-slate-800/80">
            <div className="text-amber-400 font-semibold text-sm mb-1">Waterfall Visualization</div>
            <p className="text-xs text-slate-400">
              Interactive Recharts-powered waterfall diagram visualizing cumulative and individual stage duration.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-4 text-center text-xs text-slate-500">
        React JS Course Project | Capstone: Network Diagnostic Engine
      </footer>
    </div>
  );
}

export default App;
