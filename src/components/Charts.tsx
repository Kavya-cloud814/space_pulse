import React, { useState } from 'react';

export interface SeriesConfig {
  label: string;
  color: string;
  unit: string;
  values: Array<number | null>;
}

interface DualTrendChartProps {
  title: string;
  timestamps: string[];
  series: SeriesConfig[];
  height?: number;
}

export const DualTrendChart: React.FC<DualTrendChartProps> = ({
  title,
  timestamps,
  series,
  height = 150,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const width = 460;
  const padX = 28;
  const padY = 18;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const hasAnyValid = series.some((s) => s.values.some((v) => v !== null));

  const buildPath = (vals: Array<number | null>) => {
    const nums = vals.filter((v): v is number => v !== null);
    if (nums.length === 0) return '';
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const span = max - min || 1;
    const n = vals.length;

    let d = '';
    vals.forEach((v, i) => {
      if (v === null) return;
      const x = padX + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
      const y = padY + plotH - ((v - min) / span) * plotH;
      d += d === '' ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    return d;
  };

  return (
    <div className="cosmic-panel rounded-xl p-4 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-[#F4F0FF]">{title}</h4>
        <span className="text-[11px] font-mono text-[#658BAA]">SIMULATED DATA</span>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs">
        {series.map((s) => {
          const idx = hoverIdx !== null && hoverIdx < s.values.length ? hoverIdx : s.values.length - 1;
          const val = idx >= 0 ? s.values[idx] : null;
          return (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-[#91A1B8]">{s.label}:</span>
              <span className="font-mono tabular-nums font-semibold text-[#F3F8FB]">
                {val !== null && val !== undefined ? `${val} ${s.unit}` : 'Awaiting'}
              </span>
            </div>
          );
        })}
      </div>

      {!hasAnyValid ? (
        <div className="h-[130px] flex items-center justify-center rounded-lg bg-[#090D19]/50 border border-white/5 text-xs text-[#658BAA]">
          Awaiting simulated sensor data
        </div>
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto overflow-visible cursor-crosshair"
            onMouseLeave={() => setHoverIdx(null)}
          >
            {/* Subtle horizontal reference lines */}
            {[0.25, 0.5, 0.75].map((r) => (
              <line
                key={r}
                x1={padX}
                x2={width - padX}
                y1={padY + plotH * r}
                y2={padY + plotH * r}
                stroke="rgba(145,161,184,0.12)"
                strokeDasharray="3 3"
              />
            ))}

            {series.map((s) => (
              <path
                key={s.label}
                d={buildPath(s.values)}
                fill="none"
                stroke={s.color}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {/* Hover snap zones */}
            {timestamps.map((_, i) => {
              const x = padX + (timestamps.length <= 1 ? plotW / 2 : (i / (timestamps.length - 1)) * plotW);
              const sliceW = Math.max(10, plotW / Math.max(1, timestamps.length));
              return (
                <rect
                  key={i}
                  x={x - sliceW / 2}
                  y={padY}
                  width={sliceW}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(i)}
                />
              );
            })}

            {hoverIdx !== null && timestamps[hoverIdx] && (
              <line
                x1={padX + (timestamps.length <= 1 ? plotW / 2 : (hoverIdx / (timestamps.length - 1)) * plotW)}
                x2={padX + (timestamps.length <= 1 ? plotW / 2 : (hoverIdx / (timestamps.length - 1)) * plotW)}
                y1={padY}
                y2={padY + plotH}
                stroke="rgba(116, 199, 232, 0.45)"
                strokeWidth="1"
              />
            )}
          </svg>
          {hoverIdx !== null && timestamps[hoverIdx] && (
            <div className="text-[11px] font-mono text-[#74C7E8] text-right">
              {new Date(timestamps[hoverIdx]).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface EcgWaveformProps {
  points: number[];
  rhythm: string;
  heartRate: number | null;
}

export const EcgWaveformChart: React.FC<EcgWaveformProps> = ({ points, rhythm, heartRate }) => {
  const width = 340;
  const height = 74;
  const midY = height / 2 + 4;

  const d =
    points.length > 0
      ? points
          .map((p, idx) => {
            const x = (idx / Math.max(1, points.length - 1)) * width;
            const y = midY - p * 26;
            return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
          })
          .join(' ')
      : `M 0 ${midY} L ${width} ${midY}`;

  const stroke =
    rhythm === 'Signal Unavailable'
      ? '#658BAA'
      : rhythm === 'Irregular Spike'
        ? '#FF5874'
        : rhythm === 'Elevated Variability'
          ? '#FFC857'
          : '#36D6C4';

  return (
    <div className="rounded-lg bg-[#090D19]/70 border border-white/10 p-3">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-[#91A1B8]">ECG Waveform · <span className="text-[#F3F8FB] font-medium">{rhythm}</span></span>
        <span className="font-mono tabular-nums text-[#74C7E8]">
          {heartRate !== null ? `${heartRate} BPM` : 'Unavailable'}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16">
        <line x1={0} x2={width} y1={midY} y2={midY} stroke="rgba(145,161,184,0.12)" />
        <path d={d} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
};
