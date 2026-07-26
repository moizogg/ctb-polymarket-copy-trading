'use client';

import { useQuery } from '@tanstack/react-query';
import { api, API_URL } from '@/lib/api';
import { useVisibleRefetchInterval } from '@/hooks/use-visible-refetch';

export function ApiBanner() {
  const interval = useVisibleRefetchInterval(8_000);
  const healthQ = useQuery({
    queryKey: ['health'],
    queryFn: () => api.health(),
    refetchInterval: interval,
    retry: 1,
  });

  if (!healthQ.isError) return null;

  return (
    <div className="border-b border-red-500/40 bg-red-500/15 px-4 py-2 text-center text-xs text-red-200">
      Cannot reach API at{' '}
      <code className="text-red-100">{API_URL}</code>. Start the Nest backend
      (port 3000).{' '}
      <button
        type="button"
        className="underline hover:text-white"
        onClick={() => healthQ.refetch()}
      >
        Retry
      </button>
    </div>
  );
}
