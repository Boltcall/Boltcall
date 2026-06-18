import * as React from 'react';
import * as RechartsPrimitive from 'recharts';

import { cn } from '../../lib/utils';

const THEMES = { light: '', dark: '.dark' } as const;

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType<{ className?: string }>;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />');
  }

  return context;
}

type ChartContainerProps = React.ComponentProps<'div'> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children'];
};

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: ChartContainerProps) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(([, itemConfig]) => itemConfig.theme || itemConfig.color);

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof THEMES] || itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .filter(Boolean)
  .join('\n')}
}
`,
          )
          .join('\n'),
      }}
    />
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;
const ChartLegend = RechartsPrimitive.Legend;

type TooltipPayloadItem = {
  color?: string;
  dataKey?: string | number;
  name?: string;
  value?: unknown;
  payload?: Record<string, unknown> & { fill?: string };
};

type TooltipContentProps = React.ComponentProps<'div'> & {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: React.ReactNode;
  labelFormatter?: (label: React.ReactNode, payload: TooltipPayloadItem[]) => React.ReactNode;
  formatter?: (
    value: unknown,
    name: string,
    item: TooltipPayloadItem,
    index: number,
    payload: TooltipPayloadItem['payload'],
  ) => React.ReactNode;
  color?: string;
  indicator?: 'dot' | 'line';
  hideIndicator?: boolean;
  hideLabel?: boolean;
  nameKey?: string;
  labelKey?: string;
};

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = 'dot',
  hideIndicator = false,
  hideLabel = false,
  label,
  labelFormatter,
  formatter,
  color,
  nameKey,
  labelKey,
}: TooltipContentProps) {
  const { config } = useChart();

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null;
    }

    const [item] = payload;
    const key = `${labelKey || item?.dataKey || item?.name || 'value'}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const value =
      !labelKey && typeof label === 'string'
        ? config[label as keyof typeof config]?.label || label
        : itemConfig?.label;

    if (labelFormatter) {
      return <div className="font-medium text-foreground">{labelFormatter(value, payload)}</div>;
    }

    return value ? <div className="font-medium text-foreground">{value}</div> : null;
  }, [config, hideLabel, label, labelFormatter, labelKey, payload]);

  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div
      className={cn(
        'grid min-w-[11rem] gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs shadow-xl',
        className,
      )}
    >
      {tooltipLabel}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = `${nameKey || item.name || item.dataKey || 'value'}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);
          const indicatorColor = color || item.payload?.fill || item.color || 'currentColor';

          return (
            <div key={`${item.dataKey ?? item.name ?? 'value'}-${index}`} className="flex items-center gap-2">
              {!hideIndicator ? (
                <span
                  className={cn('shrink-0 rounded-sm', indicator === 'dot' ? 'h-2.5 w-2.5' : 'h-0.5 w-3')}
                  style={{ backgroundColor: indicatorColor }}
                />
              ) : null}
              <span className="flex-1 text-muted-foreground">{itemConfig?.label || item.name}</span>
              {formatter && item.value !== undefined && item.name ? (
                <span>{formatter(item.value, item.name, item, index, item.payload)}</span>
              ) : (
                <span className="font-mono font-medium tabular-nums text-foreground">
                  {typeof item.value === 'number' ? item.value.toLocaleString() : String(item.value ?? '')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type LegendPayloadItem = {
  color?: string;
  dataKey?: string | number;
  value?: string;
};

type LegendContentProps = React.ComponentProps<'div'> & {
  payload?: LegendPayloadItem[];
  verticalAlign?: 'top' | 'bottom';
  hideIcon?: boolean;
  nameKey?: string;
};

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = 'bottom',
  nameKey,
}: LegendContentProps) {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-center gap-4',
        verticalAlign === 'top' ? 'pb-3' : 'pt-3',
        className,
      )}
    >
      {payload.map((item) => {
        const key = `${nameKey || item.dataKey || 'value'}`;
        const itemConfig = getPayloadConfigFromPayload(config, item, key);

        return (
          <div key={item.value} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon className="h-3 w-3" />
            ) : (
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: item.color }} />
            )}
            <span>{itemConfig?.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== 'object' || payload === null) {
    return undefined;
  }

  const payloadPayload =
    'payload' in payload && typeof payload.payload === 'object' && payload.payload !== null
      ? payload.payload
      : undefined;

  let configLabelKey = key;

  if (key in payload && typeof payload[key as keyof typeof payload] === 'string') {
    configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === 'string'
  ) {
    configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string;
  }

  return configLabelKey in config ? config[configLabelKey] : config[key as keyof typeof config];
}

export {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
};
