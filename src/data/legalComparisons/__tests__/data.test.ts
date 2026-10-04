import smithAi from '../smithAi';
import ruby from '../ruby';
import answeringLegal from '../answeringLegal';
import lexReception from '../lexReception';
import abbyConnect from '../abbyConnect';
import {

// Add each new legal comparison data file here.
const pages = [smithAi, ruby, answeringLegal, lexReception, abbyConnect, { name: smithAi.competitor, sources: smithAi.sources, blob: smithAi }, {
    name: 'Law firm answering services roundup', sources: ROUNDUP_SOURCES, blob: { ROUNDUP, SERVICES, HOW_TO_CHOOSE, FAQ: ROUNDUP_FAQ, MENTIONS, METHODOLOGY, ROUNDUPS, RELATED }, }, ];

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
