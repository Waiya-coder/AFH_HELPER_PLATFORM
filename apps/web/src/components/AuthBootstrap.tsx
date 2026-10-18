import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const [ready, setReady] = useState(!accessToken && !refreshToken);

  useEffect(() => {
    if (!accessToken && !refreshToken) {
      setReady(true);
      return;
    }

    let cancelled = false;

    api.bootstrapSession().finally(() => {
      if (!cancelled) {
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [accessToken, refreshToken]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}
