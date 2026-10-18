import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Shield } from 'lucide-react';
import { api } from '../lib/api';

export function AuditLogsPage() {
  const logsQuery = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.listAuditLogs(),
  });

  const logs = logsQuery.data?.logs ?? [];

  return (
    <div className="space-y-6">
      <Link
        to="/audit-checklist"
        className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to audit checklist
      </Link>

      <div className="flex items-start gap-4">
        <div className="rounded-2xl bg-emerald-100 p-4 text-emerald-700">
          <Shield className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Activity log</h2>
          <p className="mt-1 text-slate-600">
            Who changed records and when — separate from the readiness checklist
          </p>
        </div>
      </div>

      <section className="card overflow-hidden p-0">
        {logsQuery.isLoading ? (
          <p className="p-6 text-slate-600">Loading audit logs...</p>
        ) : logs.length === 0 ? (
          <p className="p-6 text-slate-600">No audit entries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-6 py-4 font-semibold">Timestamp</th>
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Action</th>
                  <th className="px-6 py-4 font-semibold">Table</th>
                  <th className="px-6 py-4 font-semibold">Record</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-slate-900">{log.user?.email ?? log.userId}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{log.action}</td>
                    <td className="px-6 py-4 text-slate-600">{log.tableName}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{log.recordId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
