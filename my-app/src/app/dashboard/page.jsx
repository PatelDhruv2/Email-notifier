import { Suspense } from 'react';
import Dashboard from './Dashboard';

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="text-white">Loading Dashboard...</div>}>
      <Dashboard />
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';
