# Boltcall SEO + AEO Operating Playbook

This is the single source of truth for ongoing Boltcall search execution.

Use each tool for one job only:

- `GSC` and `GA4`: what moved.
- `Clarity`: why users got stuck.
- `AnswerThePublic`: what to write or answer next.

Do not use paid SEO-suite data for this routine. Priority comes from Google demand, buyer intent, conversion movement, and observed user behavior.

Use all useful features, but not all at the same cadence:

- `Daily`: fast monitoring and one decision.
- `Weekly`: deeper diagnosis and ranked next steps.
- `Monthly`: instrumentation cleanup, taxonomy resets, and larger content bets.

## Daily Routine

Time budget: 15 to 20 minutes. End with one scorecard, one action list, and exactly one selected action.

1. Open `GSC`.
   - Check non-brand impressions, clicks, CTR, average position, top 3 winning pages, top 3 losing pages, and indexing warnings.
   - Look for demand and CTR problems, not content ideas in isolation.

2. Open `GA4 Reports`.
   - Check sessions, engaged sessions, key events, and conversion movement on demo, audit, and contact paths.
   - Treat GA4 key events as the conversion truth.

3. Open `GA4 Landing Pages`.
   - Pick the one page with the biggest opportunity: high traffic with weak key events, or low engagement on a money page.
   - Prefer improving an existing money page before creating a net-new page.

4. Open `Clarity Dashboard Insights`.
   - Check one priority page for rage clicks, dead clicks, quick backs, excessive scrolling, or low engagement.
   - Use Clarity to explain behavior, not to pick SEO topics.

5. Open `Clarity Heatmaps`.
   - Verify whether headline, CTA, proof, pricing or offer, and FAQ sections are being seen and clicked.

6. Open `Clarity Recordings`.
   - Watch 2 to 3 sessions only when GA4 shows a drop or Clarity flags friction.

7. Open `AnswerThePublic Tracked Keywords`.
   - Monitor the 10 core keywords for fresh questions and recurring buyer language.

8. Open `AnswerThePublic Questions` or `Ideas`.
   - Pull 3 question clusters.
   - Map each cluster to one of: FAQ, blog, landing-page copy, or ad hook.

9. Open `AnswerThePublic AI Models`.
   - Check how AI surfaces phrase the topic.
   - Look for direct-answer language, comparison framing, and buyer-intent wording worth reusing.

10. Use `AnswerThePublic Content Writing` only as a draft helper.
   - ATP can produce a first draft or outline.
   - Final copy must be rewritten into Boltcall voice before publishing.

Daily output:

- `Scorecard`: GSC movement, GA4 engagement/conversion movement, Clarity friction, ATP question clusters.
- `Action list`: page fix, content angle, experiment to watch.
- `Selected action`: exactly one page fix, one content angle, and one experiment to watch tomorrow.

## Weekly Routine

Time budget: 45 to 60 minutes. End with a ranked next-week queue, not a report-only artifact.

1. Review `GSC` 7-day movement.
   - Compare pages gaining or losing impressions.
   - Identify CTR problems, position movement, and indexing issues.
   - Build a ranked page-improvement queue.

2. Review `GA4 Explorations`.
   - Run funnel exploration for homepage to demo, audit, and contact.
   - Run path exploration to inspect the biggest conversion drop-off.

3. Review `GA4 Acquisition`.
   - Check whether organic, direct, referral, paid, or AI/referral traffic quality changed.

4. Review `GA4 Events / Key Events`.
   - Confirm key events still represent real buyer actions.
   - Identify missing CTA, form, phone, demo, or audit events.
   - Review event parameters only when conversion analysis needs more context.

5. Review `Clarity Funnels`.
   - Inspect the main conversion path and the largest drop-off with heatmaps and recordings.

6. Review `Clarity Smart Events`.
   - Add or adjust no-code events only when GA4 is missing important CTA or page interaction context.

7. Review `Clarity Segments / Filters`.
   - Segment priority pages by device, source, country, and new versus returning users.

8. Review `AnswerThePublic AI Models Report`.
   - Check how AI surfaces describe the topic.
   - Identify missing direct answers, citations, comparison language, or source gaps.

9. Review `AnswerThePublic Questions`, `Comparisons`, `Prepositions`, `Alphabeticals`, and `Numbers`.
   - Find comparison, alternative, "best way to", and edge-case angles for landing pages, blog posts, FAQ expansions, and ad hooks.

10. Review ATP search surfaces beyond search-engine questions when relevant.
    - Use `Social Media`, `Shopping`, and `People Also Ask` style discovery surfaces when the topic needs audience language or buying-intent refinement.

11. Use `AnswerThePublic Content Writing` for one weekly draft.
    - Draft only from the strongest validated question cluster.
    - Validate the topic against buyer intent and GSC/GA4 demand first.

Weekly output:

- Ranked page fixes first.
- Content candidates second.
- Citation and source gaps third.

## Monthly Routine

Time budget: 45 to 90 minutes. Use this to reset measurement quality and avoid drift.

1. Review `GA4` event and key-event hygiene.
   - Remove bad or duplicate events.
   - Confirm key events still match real buyer actions.
   - Check whether important event parameters are available for deeper reporting.

2. Review `Clarity` setup and quota discipline.
   - Tighten saved segments and funnel steps.
   - Reserve API quota for the highest-value pages.
   - Keep Clarity API usage best-effort only in automation.

3. Review `AnswerThePublic` topic inventory.
   - Refresh tracked topics and question themes.
   - Use `Compare Data` when available on your plan to spot shifts over time.
   - Review which ATP-driven assets actually created traffic or key events.

4. Review routine fit.
   - Archive weak content angles.
   - Keep the routine biased toward existing money pages before net-new content.

## Decision Rules

- Improve existing money pages before creating net-new pages.
- Use ATP to find language, not to decide priority alone.
- A topic must survive GSC or GA4 demand and buyer-intent checks before it becomes content.
- Use Clarity only to explain user behavior.
- Use GA4 key events as the conversion truth, not sessions alone.
- Use ATP content drafts only after the topic passes buyer-intent and search-demand filters.
- Publish at most one SEO/AEO content asset per week unless existing page fixes are already handled.
- Lead with speed-to-lead framing over generic AI receptionist framing.
- Put direct answers in the first 100 to 150 words.
- Treat FAQ, schema, and internal links as first-line levers.
- Keep `Clarity` and `ATP` as best-effort automation sources; quota or auth failures should warn, not block the daily run.

## Outputs By Tool

- `GSC`: SEO demand, CTR issues, winners and losers, indexing problems.
- `GA4`: traffic quality, engagement, conversion movement, funnel and path behavior, acquisition checks, event and parameter audits.
- `Clarity`: friction, CTA misses, scroll-depth problems, filters, segments, funnels, smart-event context, and recording-backed UX fixes.
- `AnswerThePublic`: tracked keywords, question clusters, AI-model visibility gaps, comparisons, prepositions, alphabeticals, number-led angles, outlines, and draft content.

## Automation Status

- The daily runner is automatic and should save the daily scorecard.
- The weekly runner is automatic and should save the ranked next-week queue.
- The `/ai-visibility-check` page is the founder review surface for both daily and weekly runs, plus ATP fallback editing.
- `Clarity` quota limits and ATP auth failures are non-blocking by design. The routine should degrade to warnings and continue.
