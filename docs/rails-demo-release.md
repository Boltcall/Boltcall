# Boltcall 3D rails page — release preparation

## Requested page

- Route: `/demo/speed-to-lead`.
- Local preview: `http://127.0.0.1:5188/demo/speed-to-lead` (task-created Vite server).
- Source worktree: `C:/Users/Asus/Desktop/Boltcall_website/worktrees/rails-demo-release-20261029`.
- Branch: `codex/rails-demo-release-20261029`.
- Base: live remote main, `91746e775a39044e39a24f65e0afbfee710a2a2f`, confirmed through public `https://boltcall.org/release.json`.

Only the actual 3D demo is copied from this task's earlier `lead-journey-demo` worktree: MachineScene, scoped CSS, Three.js scene, and the four scene tests. The flat prototype, its preview entry, old standalone Vite configuration, and unrelated original-branch commits are excluded. New page wrapper and lazy route mount the scene within Boltcall. A targeted Lenis exemption prevents scroll manipulation on this full-screen scene. Three.js and its types are pinned in package.json and the lockfile.

The simulated page uses `noindex, follow` metadata and Netlify X-Robots-Tag. `generate-sitemap.mjs` documents its intentional exclusion under the existing demo-page policy. GSC indexing should not be requested for a noindex simulation. No other sitemap route or homepage layout is changed.

## Deployment safeguard — release exception confirmed

The standing user instructions require manual deployment workflows and stopping if a push deploy trigger appears. Current `.github/workflows/deploy-main.yml` has `on.push.branches: [main]` plus workflow_run integration auto-deployment. `docs/atlas-releases.md` describes that normal CI integration flow, but the explicit user stop safeguard takes precedence.

Noam confirmed use of the current auto-deploy pipeline for this release in this chat. Submit only this branch through CI and the exact-head integration workflow; keep deployment concurrency and rollback protection intact. Do not edit workflows to manufacture compliance, bypass checks, deploy an older checkout over live production, or publish local main's unrelated work.

## Validation status

Changed source lint passed. The first focused test attempt failed to start the Vitest forks worker (timeout before any tests ran), not a confirmed test assertion failure. A bounded one-worker retry, repo-wide typecheck and production Vite build were started; inspect their saved logs/results before asserting success.

The one-worker retry completed: **4 scene tests passed**. Repo-wide typecheck and the Vite production build also passed. GitHub CI repeats the full suite and build checks for the exact PR head.

Chrome recovery succeeded in the continuation. The local route renders real WebGL and stage selection updates the geometry and caption. The compact desktop inspection found overlapping controls and stretched statistics; mobile emulation found excessive zoom. These were corrected in the release branch. Before production acceptance, verify the final desktop/mobile view and playback/source controls. No internal browser, Edge, Brave, native computer-use fallback or Chrome CLI workaround was used.

Logs: `C:/Users/Asus/.codex/visualizations/2026/10/28/01a18229-1bb3-7712-a4d8-f5445f49ad8f/rails-release-{lock,tests,typecheck,build}.log`.

Continuation: PR #89 was submitted. Its first clean GitHub typecheck identified the obsolete argument to Three.js `ShapePath.toShapes()`; it was removed, and a forced fresh local repo-wide typecheck passed. The four scene tests and changed-source lint passed again. Final Chrome mobile QA found the booked caption overlapping statistics: mobile stats now use a compact row above the rails, projected captions stay inside the viewport, and the simulation disclaimer sits above playback controls. At 390 × 844 the page has no horizontal overflow and the outcome, stats, and playback controls are separately readable. Resubmit these fixes through exact-head CI; do not bypass a failed required check.

Canonical main is dirty and diverges from remote main; it is left untouched. The original `speed-to-lead-3d-demo` session is also untouched. Keep this worktree and task-created preview for continuation after the release choice.
