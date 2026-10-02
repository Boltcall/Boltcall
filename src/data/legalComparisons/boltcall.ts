import type { TableData } from './types';

/** Boltcall plans, shared by every legal comparison page. Source: src/components/Pricing.tsx, src/lib/tokens.ts. */
export const boltcallPlansTable: TableData = {
  title: 'Boltcall plans (flat monthly price, shared credit pool)',
  note: 'One monthly credit pool is shared across calls, texts and chat. 1 AI voice minute uses 10 credits, so the voice-minute figures below assume the whole pool is spent on voice. Setup is free. There is no per-call fee and no per-case fee.',
  columns: ['Plan', 'Price per month', 'Credits per month', 'AI voice minutes if used only on voice'],
  rows: [
    ['Starter', '$549', '1,000', 'About 100'],
    ['Pro', '$897', '3,000', 'About 300'],
    ['Ultimate', '$4,997', '10,000', 'About 1,000'],
    ['Enterprise', 'Custom', 'Custom', 'Custom'],
  ],
};
