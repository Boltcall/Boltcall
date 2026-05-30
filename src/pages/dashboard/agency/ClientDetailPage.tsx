/**
 * ClientDetailPage — full per-client view: intake calls, artifacts, events,
 * knowledge, billing. Reads the :id param to load the agency_clients row
 * and pulls related data via authedFetch from netlify functions.
 */
import React from 'react';
import { useParams, Link } from 'react-router-dom';

const ClientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="p-6 max-w-5xl">
      <header className="mb-6">
        <Link
          to="/dashboard/agency/clients"
          className="text-sm text-zinc-500 hover:text-zinc-900"
        >
          ← All clients
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Client <span className="font-mono text-base text-zinc-600">{id}</span>
        </h1>
      </header>

      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 p-12 text-center">
        <p className="text-sm text-zinc-500">
          Client detail surface coming online — intake, artifacts, events, knowledge.
        </p>
      </div>
    </div>
  );
};

export default ClientDetailPage;
