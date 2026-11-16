import React from 'react';
import { 
  Globe, 
  Cpu, 
  Lock, 
  Clock, 
  Download, 
  AlertTriangle 
} from 'lucide-react';

/**
 * MetricCards Component - Harmonious Spectrum Edition
 * Synchronized with the WaterfallChart's analogous color palette (Cyan -> Sky -> Indigo -> Violet -> Purple).
 */
export function MetricCards({ data }) {
  if (!data || !data.timings) return null;

  const { timings, metrics, analysis, target } = data;
  const total = timings.totalDuration || 1;

  const stages = [
    {
      index: '01',
      key: 'dnsLookup',
      title: 'DNS RESOLUTION',
      subtitle: 'OS Nameserver Lookup',
      value: timings.dnsLookup,
      icon: Globe,
      accent: 'text-cyan-400',
      barColor: 'bg-cyan-400',
      dotColor: '#06b6d4',
    },
    {
      index: '02',
      key: 'tcpConnection',
      title: 'TCP HANDSHAKE',
      subtitle: 'SYN / SYN-ACK / ACK',
      value: timings.tcpConnection,
      icon: Cpu,
      accent: 'text-sky-400',
      barColor: 'bg-sky-400',
      dotColor: '#0ea5e9',
    },
    {
      index: '03',
      key: 'tlsHandshake',
      title: 'TLS NEGOTIATION',
      subtitle: target.protocol === 'https:' ? 'Cipher & Cert Exchange' : 'Plain HTTP (Bypassed)',
      value: timings.tlsHandshake,
      icon: Lock,
      accent: 'text-indigo-400',
      barColor: 'bg-indigo-400',
      dotColor: '#6366f1',
    },
    {
      index: '04',
      key: 'ttfb',
      title: 'SERVER TTFB',
      subtitle: 'Time To First Byte',
      value: timings.ttfb,
      icon: Clock,
      accent: 'text-violet-400',
      barColor: 'bg-violet-400',
      dotColor: '#8b5cf6',
    },
    {
      index: '05',
      key: 'dataTransfer',
      title: 'DATA TRANSFER',
      subtitle: 'Content Stream Download',
      value: timings.dataTransfer,
      icon: Download,
      accent: 'text-purple-400',
      barColor: 'bg-purple-400',
      dotColor: '#a855f7',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Telemetry Strip */}
      <div className="border border-white/10 bg-[#0d0f17] rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border-l-2 border-cyan-500 pl-3">
          <div className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">Total Latency</div>
          <div className="text-2xl font-mono font-bold text-white mt-0.5">
            {timings.totalDuration} <span className="text-xs text-slate-400 font-normal">ms</span>
          </div>
        </div>

        <div className="border-l-2 border-emerald-500 pl-3">
          <div className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">HTTP Status</div>
          <div className="text-2xl font-mono font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            {metrics.statusCode || 200} <span className="text-xs text-slate-400 font-normal">OK</span>
          </div>
        </div>

        <div className="border-l-2 border-indigo-500 pl-3">
          <div className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">Payload Size</div>
          <div className="text-2xl font-mono font-bold text-white mt-0.5">
            {(metrics.contentLengthBytes / 1024).toFixed(2)} <span className="text-xs text-slate-400 font-normal">KB</span>
          </div>
        </div>

        <div className="border-l-2 border-violet-500 pl-3">
          <div className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">Throughput</div>
          <div className="text-2xl font-mono font-bold text-violet-400 mt-0.5">
            {metrics.throughputKbps > 1000 
              ? `${(metrics.throughputKbps / 1000).toFixed(2)}`
              : metrics.throughputKbps} <span className="text-xs text-slate-400 font-normal">{metrics.throughputKbps > 1000 ? 'Mbps' : 'Kbps'}</span>
          </div>
        </div>
      </div>

      {/* Stage-by-Stage Instrument Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {stages.map((stage) => {
          const isBottleneck = analysis?.primaryBottleneck === stage.key;
          const pct = ((stage.value / total) * 100).toFixed(1);
          const Icon = stage.icon;

          return (
            <div
              key={stage.key}
              className={`relative bg-[#0d0f17] border rounded-lg p-4 transition-all ${
                isBottleneck
                  ? 'border-rose-500/80 bg-rose-950/15 shadow-lg shadow-rose-950/20'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              {/* Header: Index + Dot Indicator */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-slate-400 tracking-wider">
                  [{stage.index} // STAGE]
                </span>
                {isBottleneck ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-500/20 border border-rose-500/40 text-rose-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                    BOTTLENECK
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage.dotColor }}></span>
                )}
              </div>

              {/* Title & Icon */}
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-3.5 h-3.5 ${stage.accent}`} />
                <h4 className="text-xs font-semibold text-slate-200 tracking-tight">{stage.title}</h4>
              </div>

              {/* Value */}
              <div className="my-2">
                <span className="text-2xl font-mono font-bold text-white tracking-tight">{stage.value}</span>
                <span className="text-xs font-mono text-slate-400 ml-1">ms</span>
              </div>

              {/* Micro Ratio Bar */}
              <div className="space-y-1 pt-2 border-t border-white/5">
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>RATIO</span>
                  <span className="text-slate-300 font-semibold">{pct}%</span>
                </div>
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${isBottleneck ? 'bg-rose-500' : stage.barColor}`}
                    style={{ width: `${Math.min(parseFloat(pct), 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Subtitle */}
              <div className="mt-2 text-[10px] font-mono text-slate-400 truncate">
                {stage.subtitle}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottleneck Callout Box */}
      {analysis && (
        <div className="border border-white/10 bg-[#0d0f17] rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded border mt-0.5 ${
              analysis.severity === 'critical' 
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
                Diagnostic Analysis // Heuristic Evaluation
              </div>
              <p className="text-sm font-medium text-white mt-0.5">
                {analysis.summary}
              </p>
              {analysis.recommendations && analysis.recommendations[0] && (
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  &gt; RECOMMENDATION: {analysis.recommendations[0]}
                </p>
              )}
            </div>
          </div>
          <div className="shrink-0 px-3 py-1.5 rounded border border-white/10 bg-white/5 text-[11px] font-mono text-slate-300">
            FLAGGED: <span className="text-rose-400 font-bold uppercase">{analysis.primaryBottleneck}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default MetricCards;
