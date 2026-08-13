import React from 'react';
import type { LucideIcon } from 'lucide-react';
import StatCard from './StatCard';
import { checkAnchor, anchorLabel, type AnchorProps } from '../../../lib/kpiGuard';

// Wraps StatCard with the KPI anchor guard (Allie K Miller video doctrine —
// naked numbers are vanity, always compare to something). Missing anchor ->
// amber left-stripe + no-anchor label. Explicit anchor="none" -> clean.
//
// Adopt incrementally per panel — do NOT rewrite every StatCard usage in one
// PR. Migration proceeds one dashboard section at a time.

interface AnchoredStatCardProps extends AnchorProps {
  tileId: string; // stable id for future telemetry dedup
  label: string;
  value: string | number;
  icon?: LucideIcon;
  caption?: string;
  tone?: 'positive' | 'neutral' | 'negative';
}

const AnchoredStatCard: React.FC<AnchoredStatCardProps> = (props) => {
  const check = checkAnchor(props);
  const anchorLine = anchorLabel(props);

  // Compose the caption: existing caption + anchor label (if visible).
  const composedCaption = [props.caption, anchorLine && anchorLine !== 'no anchor' ? anchorLine : null]
    .filter(Boolean)
    .join(' • ');

  const wrapperStyle: React.CSSProperties = check.ok
    ? {}
    : { borderLeft: '4px solid #f59e0b', borderLeftColor: '#f59e0b' };

  return (
    <div
      style={wrapperStyle}
      title={check.ok ? undefined : 'No comparison anchor set on this tile'}
    >
      <StatCard
        label={props.label}
        value={props.value}
        icon={props.icon}
        caption={composedCaption || (check.ok ? undefined : 'no anchor')}
        tone={props.tone}
      />
    </div>
  );
};

export default AnchoredStatCard;
