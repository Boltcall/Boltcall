/**
 * HealthPage — fleet-wide health monitor for all agency clients.
 *
 * Will surface aggregate signals from agency_events / agency_clients:
 * call success rates, booking rates, agent failures, integration health,
 * and any clients trending into red zones.
 */
import React from 'react';

const HealthPage: React.FC = () => {
  return (
    <div className="p-6 max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Health</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Fleet-wide signals across every client — surfaces the ones trending red.
        </p>
      </header>

      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 p-12 text-center">
        <p className="text-sm text-zinc-500">
          Health dashboard coming online.
        </p>
      </div>
    </div>
  );
};

export default HealthPage;
