// KPI anchor guard — every stat tile should declare one of:
//   - deltaVsPrior (change vs prior period)
//   - benchmark    (industry / peer comparison)
//   - target       (goal reference)
//   - anchor="none" (explicit opt-out for raw counts)
//
// Doctrine (Allie K Miller video 2026-08-13 insights):
// "I don't care about the number, I care whether the number is good."
// Naked numbers are vanity metrics.
//
// Port of AIOS client/src/lib/kpiGuard.ts (2026-08-13). Kept in sync manually.

export type AnchorMode = 'deltaVsPrior' | 'benchmark' | 'target' | 'none';

export interface AnchorProps {
  deltaVsPrior?: string | number | null;
  benchmark?: string | null;
  target?: string | number | null;
  anchor?: AnchorMode;
}

export interface AnchorCheckResult {
  ok: boolean;
  reason: 'has_delta' | 'has_benchmark' | 'has_target' | 'explicit_none' | 'missing';
}

export function checkAnchor(props: AnchorProps = {}): AnchorCheckResult {
  if (props.anchor === 'none') return { ok: true, reason: 'explicit_none' };
  if (props.deltaVsPrior != null && props.deltaVsPrior !== '') return { ok: true, reason: 'has_delta' };
  if (props.benchmark != null && props.benchmark !== '') return { ok: true, reason: 'has_benchmark' };
  if (props.target != null && props.target !== '') return { ok: true, reason: 'has_target' };
  return { ok: false, reason: 'missing' };
}

export function anchorEventDedupKey(tileId: string, dateIsoDay?: string): string {
  const day = (dateIsoDay || new Date().toISOString()).slice(0, 10);
  return `kpi_anchor_missing:${day}:${tileId}`;
}

export function anchorLabel(props: AnchorProps): string {
  const { reason } = checkAnchor(props);
  switch (reason) {
    case 'has_delta':     return `${props.deltaVsPrior} vs prior`;
    case 'has_benchmark': return `vs ${props.benchmark}`;
    case 'has_target':    return `target: ${props.target}`;
    case 'explicit_none': return '';
    case 'missing':       return 'no anchor';
  }
}
