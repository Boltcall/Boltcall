/**
 * ClientListPage — directory of every agency_clients row.
 *
 * Will surface client name, status, plan, last activity, pending artifacts,
 * with click-through to ClientDetailPage.
 */
import React from 'react';
import { Link } from 'react-router-dom';

const ClientListPage: React.FC = () => {
  return (
    <div className="p-6 max-w-5xl">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Clients</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Every client running on Agency OS.
          </p>
        </div>
      </header>

      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 p-12 text-center">
        <p className="text-sm text-zinc-500">
          Client directory coming online. Detail view:{' '}
          <Link
            to="/dashboard/agency/clients/sample"
            className="text-blue-600 hover:underline"
          >
            /dashboard/agency/clients/:id
          </Link>
          .
        </p>
      </div>
    </div>
  );
};

export default ClientListPage;
