import assert from 'node:assert/strict';

import { checkHelpSourcesResolve } from '../support-source-checks.mjs';

const okResults = await checkHelpSourcesResolve(
  [
    {
      title: 'Plans and billing',
      url: 'https://boltcall.mintlify.app/account/plans',
    },
    {
      title: 'Workspace KB',
      url: '/v2/knowledge#abc',
    },
  ],
  {
    siteUrl: 'https://boltcall.org',
    fetchImpl: async (url) => ({
      status: String(url).includes('/missing') ? 404 : 200,
    }),
  },
);

assert.deepEqual(okResults, [
  {
    title: 'Plans and billing',
    url: 'https://boltcall.mintlify.app/account/plans',
    status: 200,
  },
  {
    title: 'Workspace KB',
    url: 'https://boltcall.org/v2/knowledge#abc',
    status: 200,
  },
]);

await assert.rejects(
  () =>
    checkHelpSourcesResolve(
      [{ title: 'Broken doc', url: 'https://boltcall.mintlify.app/missing' }],
      {
        siteUrl: 'https://boltcall.org',
        fetchImpl: async () => ({ status: 404 }),
      },
    ),
  /Broken doc.*returned 404/,
);

await assert.rejects(
  () =>
    checkHelpSourcesResolve([{ title: 'No URL' }], {
      siteUrl: 'https://boltcall.org',
      fetchImpl: async () => ({ status: 200 }),
    }),
  /missing a URL/,
);

console.log('support source checks tests passed');
