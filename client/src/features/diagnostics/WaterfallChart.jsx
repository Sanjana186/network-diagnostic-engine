import React, { useState } from 'react';
import { Info } from 'lucide-react';

/**
 * WaterfallChart Component - Harmonious Spectrum Edition
 * Uses an analogous cyan-to-violet spectrum so all phases complement each other
 * naturally without clashing.
 */
export function WaterfallChart({ data }) {
  const [hoveredStage, setHoveredStage] = useState(null);

  if (!data || !data.timings) return null;

  const { timings, target } = data;

  // 1. Calculate sequential phase offsets
  const dnsStart = 0;
  const dnsDuration = timings.dnsLookup || 0;

  const tcpStart = dnsDuration;
  const tcpDuration = timings.tcpConnection || 0;

  const tlsStart = tcpStart + tcpDuration;
  const tlsDuration = timings.tlsHandshake || 0;

  const ttfbStart = tlsStart + tlsDuration;
  const ttfbDuration = timings.ttfb || 0;

  const downloadStart = ttfbStart + ttfbDuration;
  const downloadDuration = timings.dataTransfer || 0;

  const total = timings.totalDuration > 0 
    ? timings.totalDuration 
    : Math.max(downloadStart + downloadDuration, 1);

  // Harmonious Analogous Spectrum (Cyan -> Sky -> Indigo -> Violet -> Purple)
  const stages = [
    {
      id: 'dnsLookup',
      code: '01',
      name: 'DNS Resolution',
      shortName: 'DNS',
      offset: dnsStart,
      duration: dnsDuration,
      color: '#06b6d4',      // Crisp Cyan
      subtleColor: '#0891b2',
      glow: 'shadow-cyan-500/20',
      desc: 'OS resolver queries nameservers to resolve IP address',
    },
    {
      id: 'tcpConnection',
      code: '02',
      name: 'TCP Handshake',
      shortName: 'TCP',
      offset: tcpStart,
      duration: tcpDuration,
      color: '#0ea5e9',      // Sky Blue
      subtleColor: '#0284c7',
      glow: 'shadow-sky-500/20',
      desc: 'Layer-4 3-way handshake establishing raw socket connection',
    },
    {
      id: 'tlsHandshake',
      code: '03',
      name: 'TLS Negotiation',
      shortName: 'TLS',
      offset: tlsStart,
      duration: tlsDuration,
      color: '#6366f1',      // Electric Indigo
      subtleColor: '#4f46e5',
      glow: 'shadow-indigo-500/20',
      desc: target?.protocol === 'https:' 
        ? 'SSL/TLS cipher suite negotiation & certificate validation' 
        : 'Plain HTTP - No encryption overhead (0 ms)',
    },
    {
      id: 'ttfb',
      code: '04',
      name: 'Server Response (TTFB)',
      shortName: 'TTFB',
      offset: ttfbStart,
      duration: ttfbDuration,
      color: '#8b5cf6',      // Iris Violet
      subtleColor: '#7c3aed',
      glow: 'shadow-violet-500/20',
      desc: 'HTTP request headers sent; waiting for server processing & 1st byte',
    },
    {
      id: 'dataTransfer',
      code: '05',
      name: 'Content Download',
      shortName: 'Stream',
      offset: downloadStart,
      duration: downloadDuration,
      color: '#a855f7',      // Royal Purple
      subtleColor: '#9333ea',
      glow: 'shadow-purple-500/20',
      desc: 'Consuming response body chunks until socket stream closes',
    },
  ];

  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="border border-white/10 bg-[#0d0f17] rounded-lg p-5 font-sans">
      {/* Title & Timeline Metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <h3 className="text-xs font-mono font-bold text-white tracking-widest uppercase">
              Request Waterfall // Timeline Deconstruction
            </h3>
          </div>
          <p className="text-[11px] font-mono text-slate-400 mt-0.5">
            Sequential socket lifecycle hand-offs across OSI layers 4 through 7
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-slate-300">
            TOTAL TIME: <strong className="text-white">{total.toFixed(2)} ms</strong>
          </div>
        </div>
      </div>

      {/* Main Waterfall Container */}
      <div className="space-y-1">
        {/* Top Timeline Ruler Bar */}
        <div className="grid grid-cols-12 gap-2 pb-2 text-[10px] font-mono text-slate-400 border-b border-white/5">
          <div className="col-span-4 sm:col-span-3 text-slate-400 font-semibold uppercase tracking-wider">
            Network Stage
          </div>
          <div className="col-span-8 sm:col-span-9 relative h-4">
            {ticks.map((t) => {
              const msVal = (t * total).toFixed(1);
              return (
                <div
                  key={t}
                  className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `${t * 100}%` }}
                >
                  <span className="text-slate-400">{msVal}ms</span>
                  <div className="w-px h-1.5 bg-white/15 mt-0.5"></div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stage Timeline Lanes */}
        <div className="relative divide-y divide-white/[0.04]">
          {/* Subtle Background Vertical Laser Gridlines */}
          <div className="absolute inset-y-0 left-0 right-0 grid grid-cols-12 gap-2 pointer-events-none">
            <div className="col-span-4 sm:col-span-3"></div>
            <div className="col-span-8 sm:col-span-9 relative h-full">
              {ticks.map((t) => (
                <div
                  key={t}
                  className="absolute inset-y-0 w-px border-l border-dashed border-white/[0.05]"
                  style={{ left: `${t * 100}%` }}
                ></div>
              ))}
            </div>
          </div>

          {/* Sequential Stage Rows */}
          {stages.map((st) => {
            const isHovered = hoveredStage === st.id;
            const leftPct = Math.max(0, Math.min(100, (st.offset / total) * 100));
            const widthPct = Math.max(0.8, Math.min(100 - leftPct, (st.duration / total) * 100));
            const ratioPct = ((st.duration / total) * 100).toFixed(1);

            return (
              <div
                key={st.id}
                onMouseEnter={() => setHoveredStage(st.id)}
                onMouseLeave={() => setHoveredStage(null)}
                className={`grid grid-cols-12 gap-2 items-center py-2.5 px-1 rounded transition-colors relative z-10 ${
                  isHovered ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                }`}
              >
                {/* Stage Info (Left Column) */}
                <div className="col-span-4 sm:col-span-3 flex items-center justify-between pr-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {st.code}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: st.color }} />
                    <span className="text-xs font-mono font-medium text-slate-200 truncate">
                      {st.name}
                    </span>
                  </div>
                  <div className="hidden sm:flex items-center gap-1 font-mono text-[10px] text-slate-400">
                    <span>{ratioPct}%</span>
                  </div>
                </div>

                {/* Timeline Track (Right Column) */}
                <div className="col-span-8 sm:col-span-9 relative h-7 flex items-center">
                  {/* Subtle track background */}
                  <div className="w-full h-1.5 bg-white/[0.02] rounded-full"></div>

                  {/* Connecting line from start of request to this phase */}
                  {st.offset > 0 && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-px bg-white/10"
                      style={{
                        left: 0,
                        width: `${leftPct}%`,
                      }}
                    ></div>
                  )}

                  {/* Harmonious Phase Bar */}
                  <div
                    className={`absolute h-4 rounded-sm flex items-center px-1.5 shadow-md transition-all duration-200 cursor-pointer ${st.glow}`}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      backgroundColor: st.color,
                      minWidth: '22px',
                      opacity: hoveredStage && !isHovered ? 0.4 : 1,
                      transform: isHovered ? 'scaleY(1.15)' : 'scaleY(1)',
                    }}
                  >
                    {/* Duration text inside bar */}
                    {widthPct > 12 ? (
                      <span className="text-[9px] font-mono font-bold text-slate-950 truncate select-none">
                        {st.duration.toFixed(1)}ms
                      </span>
                    ) : null}
                  </div>

                  {/* Outside duration label for narrow bars */}
                  {widthPct <= 12 && (
                    <span
                      className="absolute text-[10px] font-mono text-slate-400 pl-1.5 select-none pointer-events-none"
                      style={{
                        left: `${leftPct + widthPct}%`,
                      }}
                    >
                      {st.duration.toFixed(1)}ms
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Inspection Drawer */}
      <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
        {hoveredStage ? (
          (() => {
            const active = stages.find((s) => s.id === hoveredStage);
            const startMs = active.offset.toFixed(2);
            const endMs = (active.offset + active.duration).toFixed(2);
            const pct = ((active.duration / total) * 100).toFixed(1);
            return (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-300">
                <span className="text-white font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: active.color }} />
                  {active.code} // {active.name.toUpperCase()}
                </span>
                <span className="text-slate-400">
                  DURATION: <strong className="text-white">{active.duration.toFixed(2)} ms</strong> ({pct}%)
                </span>
                <span className="text-slate-400">
                  SPAN: <strong className="text-white">{startMs} ms → {endMs} ms</strong>
                </span>
                <span className="text-slate-400 hidden md:inline">
                  {active.desc}
                </span>
              </div>
            );
          })()
        ) : (
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Hover over any stage row to inspect exact microsecond offsets and socket details</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span>OSI LAYERS: 4 (TCP) • 5/6 (TLS) • 7 (HTTP)</span>
        </div>
      </div>
    </div>
  );
}

export default WaterfallChart;
