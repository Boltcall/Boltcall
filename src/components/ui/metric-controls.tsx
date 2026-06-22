import type { ChartView } from './metric-chart';
import { cn } from '../../lib/utils';

export interface PeriodOption {
  label: string;
  points?: number;
}

interface ViewToggleProps {
  value: ChartView;
  onChange: (view: ChartView) => void;
}

interface PeriodSelectProps {
  value: string;
  options: PeriodOption[];
  onChange: (option: PeriodOption) => void;
  accentText?: string;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  const options: ChartView[] = ['curve', 'bars'];

  return (
    <div className="pointer-events-auto inline-flex items-center rounded-full border border-slate-200/80 bg-white/85 p-1 shadow-sm">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            'rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors',
            value === option
              ? 'bg-slate-900 text-white'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
          )}
          aria-pressed={value === option}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function PeriodSelect({ value, options, onChange, accentText }: PeriodSelectProps) {
  if (options.length <= 1) {
    return (
      <span
        className="rounded-full border border-slate-200/80 bg-white/85 px-3 py-1 text-[11px] font-medium shadow-sm"
        style={accentText ? { color: accentText } : undefined}
      >
        {value}
      </span>
    );
  }

  return (
    <label className="pointer-events-auto relative inline-flex items-center">
      <span className="sr-only">Metric period</span>
      <select
        className="rounded-full border border-slate-200/80 bg-white/85 px-3 py-1 text-[11px] font-medium shadow-sm outline-none transition focus:border-slate-300"
        style={accentText ? { color: accentText } : undefined}
        value={value}
        onChange={(event) => {
          const next = options.find((option) => option.label === event.target.value);
          if (next) onChange(next);
        }}
      >
        {options.map((option) => (
          <option key={option.label} value={option.label}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
