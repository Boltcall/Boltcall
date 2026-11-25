# Boltcall website outage watchdog

The production n8n workflow checks the live homepage every minute from East US.
Its second probe runs in the North Europe Azure Logic App deployed from
`scripts/site-watchdog-eu-probe.json`. Both probes require HTTP 200 and a Boltcall
page title. Two consecutive rounds that fail in both regions open one incident.
A missing probe result does not authorize rollback. Two healthy regions close an
incident and trigger a recovery notice.

The workflow sends Telegram directly and sends Atlas a scoped incident event.
Delivery retries on later ticks use the same incident ID. The workflow can also
dispatch `site-outage-recovery.yml` on main. n8n stores its credentials in encrypted
credential records. Provide a repository-specific Actions-write token as
`BOLTCALL_WATCHDOG_GITHUB_TOKEN` when available.

Restore runs inside the normal Netlify production concurrency group. Normal
deploys record the verified prior deploy ID and SHA on their Netlify deploy
record. Recovery rechecks the public site, current immutable deploy, predecessor,
and exact GitHub run. A healthy immutable current deploy with a failing public
domain is a domain issue. Both failed immutable deploys mean there is no proven
rollback target. A single attempted restore places a hold on the failed SHA.
Both release paths honor the hold. A lost restore response requires readback
before considering further action.

## Rollout and drill

- Deploy the regional probe template. Pass its signed callback to the n8n
  setup script in the `BOLTCALL_WATCHDOG_EU_CALLBACK` process environment.
- Run `node scripts/site-watchdog-n8n.mjs drill` to exercise the real one-minute
  scheduler and Telegram on simulated failure and recovery. Deactivate the
  drill after both messages are recorded.
- Run `node scripts/site-watchdog-n8n.mjs observe` for live monitoring and
  read-only GitHub dispatch. Confirm Atlas receipts and record alert timing.
- After the bad-deploy and domain/provider drills pass, use `live` and set
  `BOLTCALL_WATCHDOG_AUTO_RESTORE=true` in Boltcall's GitHub Actions variables.
  Any new deploy must stay in the usual protected release path. Inspect
  the exact GitHub run and the public release marker for outcome evidence.
