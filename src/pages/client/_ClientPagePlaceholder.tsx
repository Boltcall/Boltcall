/**
 * _ClientPagePlaceholder — temporary stub used by the client-portal-wiring
 * branch.
 *
 * The 10 actual /client/* pages are being implemented in parallel branches
 * (client-home-ask, client-welcome-agent, client-calls-insights,
 * client-ads-reports, client-circle-approvals-settings). This wiring branch
 * commits the routing skeleton + sidebar + gate, and each parallel branch
 * overwrites its assigned page file when it merges.
 *
 * When ALL parallel client branches have merged, this placeholder file may
 * be deleted — nothing else imports it.
 */
import React from 'react';

interface ClientPagePlaceholderProps {
  /** Page title shown in the placeholder card. */
  title: string;
  /** Short description of what this page will contain. */
  description: string;
}

const ClientPagePlaceholder: React.FC<ClientPagePlaceholderProps> = ({
  title,
  description,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
        <p className="text-sm text-zinc-500">{description}</p>
      </div>
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center">
        <p className="text-sm text-zinc-600">
          This page is being prepared by your account strategist.
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          Coming online shortly.
        </p>
      </div>
    </div>
  );
};

export default ClientPagePlaceholder;
