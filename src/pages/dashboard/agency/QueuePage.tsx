/**
 * QueuePage — opinionated decision surface for Agency OS.
 *
 * This is the "Killer Feature #5" surface (Phase D stub). Future phases will
 * render artifacts from agency_artifacts ranked by:
 *   predicted_impact × reversibility × confidence
 *
 * Each card will surface confidence, reasoning_trace, retrieved_context,
 * alternatives_rejected, adversarial_review, predicted_impact, base_rate,
 * and one-click rollback. Keyboard-driven (J/K/A/R/E/D/N) with bulk actions.
 * Target: sub-15-min/day at 10 clients.
 */
import React from 'react';

const QueuePage: React.FC = () => {
  return (
    <div className="p-6 max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Queue</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Opinionated decision surface — ranked by predicted impact × reversibility ×
          confidence. Keyboard-driven: J/K navigate, A approve, R reject, E edit, D defer.
        </p>
      </header>

      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 p-12 text-center">
        <p className="text-sm text-zinc-500">
          Queue surface coming online. Artifacts will render here once Phase D
          wiring is complete.
        </p>
      </div>
    </div>
  );
};

export default QueuePage;
