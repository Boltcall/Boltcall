# Boltcall release workflow

## Normal release policy (2026-10-04)

Noam requested no mandatory human reviews for normal releases. Use `integrate-boltcall-pr.yml` (Integrate CI Verified Boltcall PR): it executes trusted main code, checks the latest successful PR CI for the exact head, publishes `atlas-owner-integration` as an informational CI attestation, and merges with GitHub's SHA precondition. It does not use a reviewer-gated environment. `deploy-main.yml` then tests, builds/prerenders, deploys, and verifies main automatically, including after GitHub-token integration merges. Branch protection requires `test`, not the historical owner-approval status. Keep PR protection, credential isolation and the deployment concurrency lock.

The older prepared-manifest workflow below is a separate optional path; its reviewer environments are not part of normal merge/main deployment. Do not send routine releases through that legacy approval path. The status context retains its historical name for compatibility but is no longer a required branch check.

Atlas proposes an exact PR, prepares a tested build, and dispatches a deployment request. GitHub owns integration and deployment authority. Production verification requires NJ44's separate browser acceptance and a fresh Netlify/public-marker check.

## One-time owner configuration

1. Configure `production` and `production-verification` environments. Each must have exactly one required reviewer: GitHub user NJ44, numeric ID `77395319`; administrator bypass must be disabled. Use custom deployment branch policies with exactly `main` of type `branch`. The scripts inspect both the reviewer and branch policies and fail closed on drift.
2. Protect `main` with required PRs, the `test` check, and required status `atlas-owner-integration`, binding both check contexts to the GitHub Actions App (integration ID `15368`). The owner-approved integration job publishes that status for the exact reviewed head; it does not need a repository-wide GitHub Actions bypass. A separately configured repository-admin bypass may preserve explicit operator session closure, but the runtime identity must never qualify for it. Use a non-owner bot/App identity with no status/check writing, workflow writing, administration, or pending-deployment approval permission. Workflow defaults are not a permission ceiling: untrusted PR code must never run with status-writing credentials. Pending-deployment review uses Deployments write, so removing only Actions write is insufficient. Do not give the worker NJ44's broad OAuth token.
3. Stop Netlify Git builds for site `8ec31e2a-c9cf-42e7-9b3d-7b7c04ed2613`. Netlify's separate Git integration can bypass a manual-only GitHub workflow. Both deployment and final verification require `build_settings.stop_builds === true`; CLI deployments remain the explicit release path. Check other deploy hooks/tokens separately.
4. Keep `NETLIFY_AUTH_TOKEN` in GitHub secrets, available only to the trusted release workflow. The AIOS worker never receives it. The site ID and production URL are fixed in reviewed source. The prep job uses checked-in public Supabase configuration defaults, without production credentials.
5. Land these workflows and scripts into main before enabling the Atlas Boltcall adapter. The first pipeline installation must be reviewed/landed by the owner because the old main has no PR CI or integration workflow. All subsequent PRs must pass `pr-tests.yml` for their exact current head before integration.

## Workflow contracts

| Workflow | Manual inputs | Run title |
| --- | --- | --- |
| `integrate-boltcall-pr.yml` | `pr_number`, `source_sha`, `request_id` | `Integrate PR <number> head <sha> request <id>` |
| `prepare-boltcall-release.yml` | `source_sha` | `Prepare <sha>` |
| `netlify-production-deploy.yml` | `release_id`, `manifest_hash`, `request_id` | `Release <release> request <id> manifest <hash>` |

PR CI runs on `pull_request` only, with contents read, no secrets and no persisted checkout credential. It runs `npm ci`, typecheck, the full Vitest suite, and `build:fast`. Integration reads the current PR and latest associated PR CI, waits at the owner environment, reads them again, makes a draft ready when needed, publishes `atlas-owner-integration: success` on that exact head, and merges using GitHub's SHA precondition. The status links to the validated integration run ID. Only the protected `merge` job receives `statuses: write`; inspection, failed gates/CI, and already-merged recovery never publish the status. A changed head, newer failed/pending CI, unknown gate, or conflict is refused. A failed or uncertain status response stops the merge.

Preparation accepts a full 40-character source SHA already in main. Its unprivileged `validate` job runs typecheck, the full suite, the full production/prerender/SEO build, and static function bundling with the pinned Netlify CLI 26.2.0 toolchain. `release-functions.mjs` resolves checked-in production configuration offline and captures schedules, timeouts, runtime versions and streaming metadata in the retained function manifest. In-source configuration keeps Netlify's normal precedence over TOML. It archives `dist/`, `.netlify-fn-build/`, and `netlify.toml` as `payload.tar.gz`. A separate publisher runs code from trusted workflow main, creates a write-once draft GitHub release, uploads `release-manifest.json`, and downloads it again to verify the exact bytes. Only then does it publish the evidence as a prerelease with `make_latest:false`; it never executes the prepared artifact. GitHub hides draft releases from read-only callers, so completed evidence must be published for Atlas and deployment inspection to read it without write permission. Preparation never deploys production.

Function preparation makes two bounded bundler passes before freezing. The first captures effective runtime metadata; the second uses the supported `includedFiles` configuration to include `.netlify-runtime-contracts/<function>.json` in each ZIP, preserving ordinary TOML include patterns. The canonical JSON contains only schema version, Node runtime, API version, invocation mode, timeout (or null for the platform default), and bootstrap version. It contains no paths, timestamps, release IDs, secrets or digests. Preparation reads each final ZIP to require exactly one contract with the expected bytes and rejects metadata changes between passes. An unchanged source and runtime contract reproduce the same ZIP hash in the same checkout; changed checkout paths can affect pre-existing esbuild source comments and are not normalized.

The contract makes runtime metadata part of the function digest. Netlify can reuse a cached digest without requesting another function upload, while runtime and invocation settings travel on that upload. Updating metadata alone therefore may retain older cached settings. The local real-CLI regression seeds a Node 24/non-streaming cache entry, proves metadata alone reuses it, then proves the contract changes the actual ZIP hash and uploads Node 22/streaming settings; identical preview and production maps remain required. A timeout-only change also changes the ZIP hash. No runtime API overrides are used. Nonempty in-source `config.includedFiles` overrides TOML includes in the pinned bundler; if that override omits the contract, preparation deliberately fails before freezing. Existing source files are never rewritten to bypass that precedence.

Deployment jobs are `inspect`, `owner-review`, `deploy`, `owner-verification`, and `final-verification`. The initial inspection verifies the reviewed manifest bytes, source ancestry, successful exact preparation attempt/jobs and retained artifact metadata. After owner approval, deployment repeats these checks, verifies the downloaded artifact and payload hashes, and injects one release marker. It uploads the retained files/functions as an unpublished preview, verifies it, then uploads the identical content once with the CLI's supported `--prod --no-build` command. The production deploy has a different ID. No push trigger exists and the concurrency group does not cancel an in-flight release.

After verifying the payload digest, deployment validates the retained function manifest and every archive path. Immediately before invoking Netlify it creates `.netlify/functions/manifest.json`, changing only the relocated ZIP paths and the temporary cache timestamp; original manifest bytes and ZIPs stay unchanged. This is required because CLI 26 only recognizes that cache location and expires caches after two minutes. A guard atomically refreshes only the derived timestamp every 30 seconds while the command runs, refuses substituted metadata, aborts the command on refresh failure, and stops its timer on success or failure. Uploading the ZIP directory without its metadata loses v2 streaming mode and causes Netlify 502 responses.

CLI 26.2.0 also detects a JavaScript workspace root independently of the subprocess working directory. Deployment therefore runs from the trusted checkout with `--cwd=<absolute prepared payload directory>`; those directories must differ or the CLI discards the explicit override. `CONTEXT=production` selects production settings without rebuilding (`--context` is incompatible with `--no-build`). This makes the CLI discover the prepared cache instead of silently falling back to metadata-free ZIP uploads.

The pinned CLI sends `draft:true` when creating a preview but defaults to `draft:false` when finalizing its files/functions. The official OpenAPI schema defines a `draft` boolean on both writes. `scripts/netlify-draft.mjs` checks CLI 26.2.0 and the exact SHA256 of `dist/utils/deploy/deploy-site.js`, then changes that default only for the explicit preview mode. Production mode retains `draft:false` and requires `--prod --no-build`. Both modes reject conflicting flags, aliases, lock overrides and unexpected options before loading CLI code. The installed CLI is never edited. Toolchain upgrades must deliberately revalidate or remove the compatibility hook; changed versions or source hashes fail closed.

The integration check runs both actual CLI modes against a loopback API with real function ZIPs and blocks nonlocal HTTP/fetch destinations. It verifies preview POST/PUT use `draft:true`, production POST/PUT use `draft:false`, IDs differ, and static/function maps match exactly, including generated `netlify.toml`. It checks uploaded runtime, streaming mode, build metadata, schedules, timeouts and ZIP digests, and proves content mutation stops before production finalization. The vendor module and prepared ZIPs remain unchanged. Synthetic functions throw if executed, so preparation and upload cannot accidentally invoke them.

The local CLI fixture requests static files as well as function archives and simulates an HTTP 422 upload rejection. This verifies that the CLI cancels its one draft and the release runner retains the subprocess exit status and terminal error. Failure diagnostics redact credential environment values, authorization/cookie headers, URL credentials and common secret fields, then retain at most 6,000 output characters. Command arguments and raw error objects are excluded. Because CLI `--json` suppresses its detailed API-response warnings, the same hash-pinned child hook wraps `deploySite` to emit a `NETLIFY_RELEASE_ERROR` JSON record before rethrowing the identical error. The record selects only HTTP status, error code (100 characters), and redacted message (2,000 characters); it never serializes headers, request options, environment, stack, or the full response. Native cancellation still runs. Errors outside that wrapped upload/finalization stage can still supply only the CLI's terminal description. A canceled deploy with no receipt remains an uncertain failed request and must never be replayed automatically.

Preview verification requires the immutable `https://<preview-id>--boltcall.netlify.app` URL, unpublished status and `deploy-preview` context, exact function inventory, ZIP digests, runtime, invocation mode, build metadata and schedules. It verifies the release marker and requires HTTP 401 from unauthenticated GETs to `saas-v2-leads`, `saas-v2-calls`, and `retell-agents`. Production verification repeats the metadata/marker/function checks against a distinct, currently published ID with `production` context. Function timeouts are verified at the real CLI upload boundary; Netlify's inspected deploy response does not expose them for independent live verification.

The upload hook persists each ID before hashing/finalization, using an atomic receipt write with file synchronization. At the actual preview PUT boundary it records a canonical SHA256 fingerprint of every static-file digest, function digest, function configuration, schedule and retained runtime setting. This includes the CLI-generated resolved `netlify.toml`. Before the production PUT it recomputes that fingerprint, requires an exact match, and rechecks the original production pointer, stopped Git builds and deployment lock. A mismatch cancels the newly created candidate without finalizing it. The same prepared directory/cache is reused; neither phase rebuilds the artifact.

Netlify applies function environment variables by deployment context. `CONTEXT=production` selects local configuration but does not turn a preview into a production deployment. Four effective Boltcall function variables were marked secret in the 2026-09-09 metadata audit; official API documentation says external clients cannot read production secret values. This workflow therefore leaves secret inheritance to Netlify's normal production deployment, without copying variables, changing encryption flags, or substituting local credentials. Preview tests cannot prove production-only secrets or integrations work.

Before either upload, the workflow verifies and records the previous production deployment's runtime metadata, public marker state and three function responses. If the production upload or immediate verification fails, it inspects the published pointer. If the previous ID remains current, it reads the exact candidate ID/site/context and rechecks the pointer once. It records failure only for a terminal `error` candidate with `published_at:null`; preparing, ready, unreadable or unconfirmed cancellation remains uncertain because accepted work may publish later. CLI cancellation is best-effort and does not prove the candidate stopped. If this request's own production ID is current, including during that bounded reconciliation, it persists `restoration_requested`, sends one official restore POST for the captured known-good ID, and verifies its pointer, metadata, marker and functions. If another ID is current, it records uncertainty and does not overwrite it. A lost restore response is never retried automatically. A defective production deploy can be briefly visible before detection and restoration. Netlify provides no compare-and-swap publishing/restoration precondition, so avoid out-of-band publication while this workflow runs.

## Manifest and artifacts

The release ID and tag are `boltcall-<source first 12>-<preparation run ID>-<preparation attempt>`. Manifest SHA256 is over the exact UTF-8 asset bytes, including its final newline. An incomplete or mismatched upload stays in draft. Existing identities are never overwritten or resumed; prepare a fresh release after publication failure, including releases created by the old draft-only publisher.

```json
{
  "schema_version": 1,
  "project_id": "boltcall",
  "repository": "Boltcall/Boltcall",
  "release_id": "boltcall-<source12>-<run>-<attempt>",
  "source_sha": "<40 hex>",
  "created_at": "<ISO timestamp>",
  "preparation": {
    "run_id": 123,
    "run_attempt": 1,
    "workflow_sha": "<40 hex workflow-main commit>",
    "path": ".github/workflows/prepare-boltcall-release.yml"
  },
  "artifact": {
    "id": 456,
    "name": "boltcall-payload-123-1",
    "digest": "sha256:<64 hex GitHub artifact ZIP hash>",
    "payload_sha256": "<64 hex payload.tar.gz hash>"
  },
  "target": {
    "provider": "netlify",
    "site_id": "8ec31e2a-c9cf-42e7-9b3d-7b7c04ed2613",
    "production_url": "https://boltcall.org"
  },
  "checks": { "typecheck": true, "tests": true, "build": true, "functions": true }
}
```

The booleans alone prove nothing: execution inspects GitHub run/attempt identity, exact source in the run title, the trusted workflow commit, both successful preparation jobs, artifact run origin, digest, and expiry. Payload artifacts expire after 90 days. Reprepare expired evidence; do not rebuild under an old reviewed manifest. A preparation retry that needs a fresh artifact must rerun all jobs; failed-job-only preparation retries will fail closed if their attempt lacks validation/artifact evidence.

Public `https://boltcall.org/release.json` contains `schema_version:1`, `project_id:"boltcall"`, `sha`, `release_id`, `manifest_hash`, `request_id`, numeric `run_id`, numeric deployment `run_attempt`, and fixed `site_id`. The marker is injected after verifying the payload, avoiding circular hashes. It is served with no-store headers.

`deployment-receipt.json` retains all marker fields, the previous production ID, separate preview and production IDs, the upload fingerprint, and the current stage. Stages progress through preview requested/started/finalizing/verified and production requested/started/finalizing/uploaded/published. Successful receipts include separate `preview_receipt` and `production_receipt` records with their distinct IDs, required contexts and matching upload fingerprints; `deploy_id` always identifies production. Failure stages distinguish `production_failed`, `production_uncertain`, `restoration_requested` and `restored`. The existing single-file `boltcall-deployment-<run>-<attempt>` artifact retains this record even on failure. An existing request cannot be resumed; status reads never dispatch automatically.

Final verification requires successful owner-review, deploy and owner-verification jobs in chronological order. It supports a final-job retry using the successful deploy receipt from an earlier attempt. It checks the marker, Netlify site/published deploy ID, production deploy state, and HTTP 401 responses from all three unauthenticated function GETs. Then it writes `verification-receipt.json`, adding numeric `verification_attempt`, `verified_at`, and `owner_accepted:true`. The immutable `boltcall-verification-<run>-<verification attempt>` artifact contains exactly this one root file. AIOS checks its ZIP digest and run origin, both approval jobs, the final job, and the live public marker without holding Netlify credentials.

## Browser acceptance and recovery

At `production-verification`, NJ44 must open the live product in regular Chrome, test the changed workflow, and check the release marker before approving. A successful Actions run alone is not product acceptance. Authenticated API flows, write behavior and changed UI require their own browser exercise; the included automated smoke only checks release identity and function routing. Do not run `smoke:production` casually: its help smoke creates/deletes production users and inserts fixtures.

If final verification fails after browser acceptance, inspect retained receipts and current production before recovery. A final-verification-only retry reuses the existing production deployment and requires both upload receipts with matching fingerprints. A deployment-stage retry checks every prior matching request run and attempt: any retained deployment receipt or previously started deploy job refuses another upload, even when the earlier workflow failed. Missing receipts remain uncertain side effects. Beyond the single bounded restoration inside the original deployment job, recovery requiring a new upload needs a fresh prepared release/request and owner approval. A newer published deployment or changed marker must never be accepted for the old request.

Read-only baseline inspection on 2026-09-09 found Netlify Git integration connected to `Boltcall/Boltcall` main with `stop_builds:false`; its published deploy was `6a9adc04534c5ab4741251ce`. The workflow intentionally refuses deployment while that bypass remains enabled. This implementation does not change cloud settings or deploy by itself.
