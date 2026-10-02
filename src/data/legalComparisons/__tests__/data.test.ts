import smithAi from '../smithAi';

// Add each new legal comparison data file here.
const pages = [smithAi];

describe.each(pages.map((p) => [p.competitor, p] as const))('%s legal comparison data', (_, page) => {
  const json = JSON.stringify(page);
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
