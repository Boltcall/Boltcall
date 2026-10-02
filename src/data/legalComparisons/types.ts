/**
 * Data shape for law-firm comparison pages (rendered by
 * src/components/compare/LegalComparisonPage.tsx).
 *
 * Rules for every data file:
 * - Every competitor fact is a Cited value: a plain string for Boltcall facts,
 *   or { text, src: [sourceId] } for competitor facts. The template renders the
 *   numbered footnote marker and the Sources list from `sources`.
 * - Source ids must exist in `sources`. Footnote numbers follow the order of
 *   the `sources` object.
 * - No em dashes in any string. No claim that is not on the vendor's public page.
 */

/** A string, or a string with footnote source ids. */
export type Cited = string | { text: string; src: string[] };

export interface Source {
  /** Page title of the vendor page */
  title: string;
  url: string;
}

export interface TableData {
  title: string;
  /** Unit and context note shown under the table title */
  note?: Cited;
  columns: string[];
  rows: Cited[][];
}

export interface LegalComparisonData {
  /** Short competitor name, e.g. "Smith.ai" */
  competitor: string;
  /** Route path, e.g. /compare/boltcall-vs-smith-ai */
  path: string;
  /** Used for JSON-LD script ids, e.g. "smith-ai" */
  slug: string;
  title: string;
  description: string;
  h1: string;
  publishDate: string; // YYYY-MM-DD
  modifiedDate: string; // YYYY-MM-DD
  /** Human readable, e.g. "October 2, 2026" */
  verifiedLabel: string;
  intro: string[];
  answer: { query: string; definition: string; stat: string; outcome: string };
  glance: { label: string; boltcall: Cited; competitor: Cited }[];
  pricing: {
    intro: string;
    /** Competitor plan tables, each with its own billing unit */
    competitorTables: TableData[];
    boltcallTable: TableData;
    /** Clearly labelled illustration with stated assumptions (no crossover claims) */
    illustration?: { title: string; assumptions: string[]; table: TableData; takeaway: string };
  };
  competitorWins: Cited[];
  boltcallWins: Cited[];
  /** Boltcall limits, stated plainly */
  boltcallLimits: Cited[];
  whoShouldChoose: { competitor: string[]; boltcall: string[] };
  legalSpecifics: { topic: string; boltcall: Cited; competitor: Cited }[];
  faq: { q: string; a: Cited }[];
  methodology: string[];
  related: { label: string; href: string }[];
  sources: Record<string, Source>;
}
