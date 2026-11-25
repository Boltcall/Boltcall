import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createHmac } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const workflowName = 'Boltcall website outage watchdog';
const atlasOrigin = 'https://boltcall-aios-vm.eastus2.cloudapp.azure.com';

export function readProbeResults(local, remote) {
  return {
    us: local.statusCode === 200 && /<title>[^<]*Boltcall[^<]*<\/title>/i.test(String(local.data ?? local.body ?? '')),
    eu: remote.statusCode === 200 && typeof remote.body?.healthy === 'boolean' ? remote.body.healthy : null,
  };
}

export function evaluateRound(store, { us, eu, now, dispatch = true }) {
  if (!store.incident) {
    if (us !== false || eu !== false) {
      delete store.lastFailure;
      return null;
    }
    const first = store.lastFailure;
    store.lastFailure = now;
    if (!first || now - first < 30_000 || now - first > 95_000) return null;
    store.incident = { id: 'watchdog-' + first, openedAt: new Date(first).toISOString() };
    delete store.lastFailure;
  }
  const incident = store.incident;
  if (us === true && eu === true && !incident.recoveredAt) incident.recoveredAt = new Date(now).toISOString();
  const state = incident.recoveredAt ? 'recovered' : 'open';
  const telegramState = incident.telegramOpen && state === 'recovered' ? 'recovered' : 'open';
  const atlasState = incident.atlasOpen && state === 'recovered' ? 'recovered' : 'open';
  return {
    id: incident.id, state,
    telegram: !(telegramState === 'open' ? incident.telegramOpen : incident.telegramRecovered),
    atlas: !(atlasState === 'open' ? incident.atlasOpen : incident.atlasRecovered),
    rollback: dispatch && state === 'open' && us === false && eu === false && !incident.dispatched,
    telegramState, atlasState,
    atlasTime: atlasState === 'open' ? incident.openedAt : incident.recoveredAt,
    openedAt: incident.openedAt,
  };
}

export function recordDeliveries(store, plan, { telegram, atlas, rollback }) {
  const incident = store.incident;
  if (incident?.id !== plan.id) return;
  if (telegram) incident[plan.telegramState === 'open' ? 'telegramOpen' : 'telegramRecovered'] = true;
  if (atlas) incident[plan.atlasState === 'open' ? 'atlasOpen' : 'atlasRecovered'] = true;
  if (rollback) incident.dispatched = true;
  // An unavailable Atlas must not suppress notification of the next incident.
  if (incident.recoveredAt && incident.telegramRecovered &&
      (incident.atlasRecovered || Date.now() - Date.parse(incident.recoveredAt) > 5 * 60_000)) delete store.incident;
}

function buildWorkflow({ eu, atlas, telegram, github, chatId, drill = false, observe = true }) {
  const nodes = [];
  const connections = {};
  function node(name, type, version, parameters, config = {}) {
    nodes.push({ name, id: String(nodes.length + 1), type: 'n8n-nodes-base.' + type,
      typeVersion: version, position: [220 * nodes.length, 0], parameters, ...config });
  }
  function connect(from, to, output = 0) {
    const main = (connections[from] ||= { main: [] }).main;
    while (main.length <= output) main.push([]);
    main[output].push({ node: to, type: 'main', index: 0 });
  }
  function code(name, jsCode) {
    node(name, 'code', 2, { mode: 'runOnceForAllItems', jsCode });
  }
  function http(name, url, { method = 'GET', auth, credential, jsonBody, timeout = 6500, text = false } = {}) {
    node(name, 'httpRequest', 4.2, {
      method, url,
      ...(auth ? { authentication: 'genericCredentialType', genericAuthType: auth } : {}),
      ...(jsonBody ? { sendBody: true, specifyBody: 'json', jsonBody } : {}),
      options: { timeout, response: { response: { fullResponse: true, neverError: true, ...(text ? { responseFormat: 'text' } : {}) } },
        redirect: { redirect: { followRedirects: false } } },
    }, { onError: 'continueRegularOutput', ...(auth ? { credentials: { [auth]: credential } } : {}) });
  }
  function condition(name, key) {
    node(name, 'if', 2.2, { conditions: { options: { caseSensitive: true, typeValidation: 'strict', version: 2 },
      conditions: [{ id: key, leftValue: '={{ $("Classify outage").first().json.' + key + ' }}', rightValue: '',
        operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' } });
  }

  node('Every minute', 'scheduleTrigger', 1.2, { rule: { interval: [{ field: 'minutes', minutesInterval: 1 }] } });
  if (drill) {
    connect('Every minute', 'Classify outage');
  } else {
    http('Probe US', '={{ "https://boltcall.org/?uptime-us=" + Date.now() }}', { text: true });
    http('Probe EU', eu.url, { auth: 'httpQueryAuth', credential: eu.credential, timeout: 10_000 });
    connect('Every minute', 'Probe US');
    connect('Probe US', 'Probe EU');
    connect('Probe EU', 'Classify outage');
  }
  const probes = drill
    ? 'store.drillRounds = (store.drillRounds || 0) + 1; const us = store.drillRounds > 2; const eu = us;'
    : 'const {us, eu} = (' + readProbeResults.toString() + ')($("Probe US").first().json,$("Probe EU").first().json);';
  code('Classify outage', [
    'const store = $getWorkflowStaticData("global");', probes,
    'store.lastRound = { us, eu, at: new Date().toISOString() };',
    'const plan = (' + evaluateRound.toString() + ')(store, {us, eu, now:Date.now(), dispatch:' + (!drill && !!github) + '});',
    'if (!plan) return [];',
    'return [{json:{...plan, us, eu, atlas: plan.atlas && ' + (!drill && !!atlas) + '}}];',
  ].join('\n'));

  condition('Telegram needed', 'telegram');
  node('Send Telegram', 'telegram', 1.2, {
    resource: 'message', operation: 'sendMessage', chatId,
    text: '={{ ' + JSON.stringify(drill ? 'DRILL · ' : '') + ' + ($("Classify outage").first().json.telegramState === "open" ? ' +
      '"Boltcall website is down. US and EU confirmed. Incident " + $("Classify outage").first().json.id + ". First failed check " + $("Classify outage").first().json.openedAt + "."' +
      ' : "Boltcall website recovered. US and EU are healthy. Incident " + $("Classify outage").first().json.id + ".") }}',
    additionalFields: { appendAttribution: false },
  }, { credentials: { telegramApi: telegram }, onError: 'continueRegularOutput' });
  connect('Classify outage', 'Telegram needed');
  connect('Telegram needed', 'Send Telegram');

  condition('Atlas needed', 'atlas');
  const atlasBody = '={{ JSON.stringify({id:$("Classify outage").first().json.id,state:$("Classify outage").first().json.atlasState,detectedAt:$("Classify outage").first().json.atlasTime}) }}';
  if (atlas) http('Notify Atlas', atlasOrigin + '/api/atlas/boltcall-outage', { method: 'POST', auth: 'httpHeaderAuth', credential: atlas, jsonBody: atlasBody });
  connect('Telegram needed', 'Atlas needed', 1);
  connect('Send Telegram', 'Atlas needed');
  if (atlas) connect('Atlas needed', 'Notify Atlas');

  condition('Rollback needed', 'rollback');
  if (github) http('Request recovery', 'https://api.github.com/repos/Boltcall/Boltcall/actions/workflows/site-outage-recovery.yml/dispatches', {
    method: 'POST', auth: 'httpHeaderAuth', credential: github,
    jsonBody: '={{ JSON.stringify({ref:"main",inputs:{incident_id:$("Classify outage").first().json.id,observe_only:"' + observe + '"}}) }}',
  });
  if (atlas) connect('Notify Atlas', 'Rollback needed');
  connect('Atlas needed', 'Rollback needed', 1);
  if (github) {
    connect('Rollback needed', 'Request recovery');
    connect('Request recovery', 'Record delivery');
  }
  connect('Rollback needed', 'Record delivery', 1);

  code('Record delivery', [
    'const store = $getWorkflowStaticData("global"); const plan = $("Classify outage").first().json;',
    'const telegram = $("Send Telegram").isExecuted ? $("Send Telegram").first().json : null;',
    'const atlas = ' + (atlas ? '$("Notify Atlas").isExecuted ? $("Notify Atlas").first().json : null' : 'null') + ';',
    'const rollback = ' + (github ? '$("Request recovery").isExecuted ? $("Request recovery").first().json : null' : 'null') + ';',
    'const delivered = {telegram:telegram?.ok === true || Boolean(telegram?.message_id),' +
      'atlas:atlas?.statusCode === 200 && atlas.body?.ok === true, rollback:[200,201,204].includes(rollback?.statusCode)};',
    'if (' + !atlas + ' && delivered.telegram) delivered.atlas = true;',
    '(' + recordDeliveries.toString() + ')(store, plan, delivered);',
    'return [{json:{id:plan.id,state:plan.state,...delivered,ack:atlas?.body?.acknowledged_at || null,recordedAt:new Date().toISOString()}}];',
  ].join('\n'));

  return { name: workflowName + (drill ? ' DRILL' : ''), nodes, connections, settings: { executionOrder: 'v1', timezone: 'Asia/Jerusalem',
    executionTimeout: 50, saveDataErrorExecution: 'none', saveDataSuccessExecution: drill ? 'all' : 'none', saveExecutionProgress: false } };
}

async function provision() {
  const mode = process.argv[2];
  if (!['drill', 'observe', 'live', 'monitor'].includes(mode)) throw Error('Use drill, monitor, observe or live');
  const env = parseEnv(await readFile(process.env.BOLTCALL_WATCHDOG_ENV_FILE || 'C:/Users/Asus/Desktop/aios-sessions/.env.local', 'utf8'));
  const origin = new URL(env.N8N_URL);
  if (origin.protocol !== 'https:' || !/(^|\.)azurecontainerapps\.io$|(^|\.)boltcall\.org$/.test(origin.hostname)) throw Error('Unexpected n8n origin');
  async function api(path, method = 'GET', body) {
    const response = await fetch(new URL('/api/v1/' + path, origin), {
      method, body: body ? JSON.stringify(body) : undefined, redirect: 'error', signal: AbortSignal.timeout(12000),
      headers: { 'X-N8N-API-KEY': env.N8N_API_KEY, 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw Error('n8n ' + method + ' returned HTTP ' + response.status + ' for ' + path.split('?')[0]);
    return response.status === 204 ? {} : response.json();
  }

  const drill = mode === 'drill';
  const label = workflowName + (drill ? ' DRILL' : '');
  const { data } = await api('workflows?name=' + encodeURIComponent(label) + '&limit=100');
  const matches = data.filter(item => item.name === label);
  if (matches.length > 1) throw Error('Duplicate watchdog workflows; review before provisioning');
  let workflow = matches[0];
  if (workflow?.active) throw Error('Deactivate this exact watchdog workflow before replacing its definition');
  const oldNodes = workflow ? (await api('workflows/' + workflow.id)).nodes : [];
  async function credential(suffix, type, values) {
    const name = label + ' · ' + suffix;
    const existing = oldNodes.map(node => node.credentials?.[type]).find(cred => cred?.name === name);
    if (existing) return existing;
    const created = await api('credentials', 'POST', { name, type, data: values });
    return { id: created.id, name };
  }

  const callback = drill ? null : new URL(process.env.BOLTCALL_WATCHDOG_EU_CALLBACK);
  if (callback && (callback.protocol !== 'https:' || !callback.hostname.endsWith('.logic.azure.com') || !callback.searchParams.has('sig'))) {
    throw Error('Expected the Azure Logic App probe callback');
  }
  const chatId = env.TELEGRAM_CHAT_ID_NOAM || env.TELEGRAM_CHAT_ID;
  if (!/^-?\d{5,22}$/.test(chatId || '')) throw Error('Owner Telegram chat ID is unavailable');
  const telegram = await credential('Telegram alerts', 'telegramApi', { accessToken: env.TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN_CHANNELS });
  let eu;
  if (callback) {
    const sig = callback.searchParams.get('sig');
    callback.searchParams.delete('sig');
    eu = { url: callback.href, credential: await credential('EU probe', 'httpQueryAuth', { name: 'sig', value: sig }) };
  }
  const atlas = ['observe','live'].includes(mode) ? await credential('Atlas', 'httpHeaderAuth', {
    name: 'Authorization',
    value: 'Bearer ' + createHmac('sha256', env.AIOS_LOCAL_TOKEN).update('aios:boltcall-website-watchdog:v1').digest('hex'),
  }) : null;
  const dispatchToken = env.BOLTCALL_WATCHDOG_GITHUB_TOKEN || env.GITHUB_TOKEN;
  const github = atlas && dispatchToken ? await credential('GitHub recovery', 'httpHeaderAuth', {
    name: 'Authorization', value: 'Bearer ' + dispatchToken,
  }) : null;
  if (mode === 'live' && !github) throw Error('Boltcall Actions dispatch token is missing');
  const body = buildWorkflow({ eu, atlas, telegram, github, chatId, drill, observe: mode !== 'live' });
  workflow = workflow ? await api('workflows/' + workflow.id, 'PUT', body) : await api('workflows', 'POST', body);
  const activated = await api('workflows/' + workflow.id + '/activate', 'POST');
  console.log(JSON.stringify({ workflowId: workflow.id, active: activated.active === true, mode, recoveryDispatch: !!github }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  provision().catch(error => { console.error(error.message); process.exitCode = 1; });
}
