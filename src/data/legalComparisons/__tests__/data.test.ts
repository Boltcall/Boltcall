import smithAi from '../smithAi';
import ruby from '../ruby';
import answeringLegal from '../answeringLegal';
import lexReception from '../lexReception';
import abbyConnect from '../abbyConnect';
import {
  ROUNDUP,
  SERVICES,
  HOW_TO_CHOOSE,
  FAQ as ROUNDUP_FAQ,
  MENTIONS,
  METHODOLOGY,
  ROUNDUPS,
  RELATED,
  SOURCES as ROUNDUP_SOURCES,
} from '../lawFirmRoundup';

// Each entry: a comparison data set with its own sources table.
// Add each new head-to-head data file to the first list.
const headToHead = [smithAi, ruby, answeringLegal, lexReception, abbyConnect];
const pages = [
  ...headToHead.map((d) => ({ name: d.competitor, sources: d.sources, blob: d })),
  {
    name: 'Law firm answering services roundup',
    sources: ROUNDUP_SOURCES,
    blob: { ROUNDUP, SERVICES, HOW_TO_CHOOSE, FAQ: ROUNDUP_FAQ, MENTIONS, METHODOLOGY, ROUNDUPS, RELATED },
  },
];

describe.each(pages.map((p) => [p.name, p] as const))('%s legal comparison data', (_, page) => {
  const json = JSON.stringify(page.blob);
  const cited = [...json.matchAll(/"src":\[([^\]]*)\]/g)].flatMap((m) => JSON.parse(`[${m[1]}]`) as string[]);

  it('cites only sources that exist, and lists no unused source', () => {
    const ids = Object.keys(page.sources);
    expect(cited.filter((id) => !ids.includes(id))).toEqual([]);
    expect(ids.filter((id) => !cited.includes(id))).toEqual([]);
  });

  it('has no em dashes in copy', () => {
    expect(json).not.toContain('—');
  });
});
