import { afterEach, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const temporaryRoot = path.join(root, 'node_modules', '.tmp');
const directories = [];

afterEach(async () => {
  for (const directory of directories.splice(0)) {
    if (path.dirname(directory) !== temporaryRoot) throw Error('Runtime fixture escaped the test directory');
    await fs.rm(directory, { recursive: true, force: true });
  }
});

it('loads the deployed agent-tools ESM entry with external Day.js plugins and handles early responses', async () => {
  await fs.mkdir(temporaryRoot, { recursive: true });
  const directory = await fs.mkdtemp(path.join(temporaryRoot, 'agent-tools-runtime-'));
  directories.push(directory);
  const entry = path.join(directory, 'agent-tools.mjs');
  // Netlify leaves Day.js imports for Node's ESM loader. Bundling them into
  // the test would hide extensionless plugin imports, as the old tests did.
  const buildOptions = {
    entryPoints: [path.join(root, 'netlify/functions/agent-tools.ts')],
    outfile: entry,
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    external: ['dayjs', 'dayjs/*'],
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
    logLevel: 'silent',
  };
  const script = `
    const { build } = await import('esbuild');
    await build(${JSON.stringify(buildOptions)});
    const { default: handler } = await import(${JSON.stringify(pathToFileURL(entry).href)});
    const statuses = [];
    for (const method of ['GET', 'OPTIONS', 'POST']) {
      const response = await handler(new Request('https://boltcall.org/.netlify/functions/agent-tools', {
        method, ...(method === 'POST' ? { body: '{}', headers: { 'content-type': 'application/json' } } : {}),
      }), { params: {} });
      statuses.push(response.status);
    }
    console.log(JSON.stringify(statuses));
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: root,
    env: { ...process.env, RETELL_API_KEY: '', AGENT_TOOLS_SHARED_SECRET: '', RETELL_TOOL_SECRET: '' },
    encoding: 'utf8',
    timeout: 15_000,
    windowsHide: true,
  });
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout.trim())).toEqual([405, 200, 401]);
});
