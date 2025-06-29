import { Suspense } from 'react';
import Dashboard from './Dashboard';
export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading Dashboard...</div>}>
      <Dashboard />
    </Suspense>
  );
}