import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardDescription, CardHeader, CardTitle } from '../ui/card-shadcn';

/** Exposed so tests can reset between scenarios. */
export function __resetV2OptInGateCache(): void {
  return;
}

interface V2OptInGateProps {
  children: React.ReactNode;
}

const V2OptInGate: React.FC<V2OptInGateProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>
              You need to be signed in to use the new dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default V2OptInGate;
