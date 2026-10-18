import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Download, Shield } from 'lucide-react';
import type { AuditChecklistDomain, AuditChecklistItemResult } from '@afh/shared';
import { api, ApiError } from '../lib/api';
import { isEmployer } from '../lib/permissions';
import { useAuthStore } from '../stores/auth.store';

const DOMAIN_LABELS: Record<AuditChecklistDomain, string> = {
  staff: 'Staff files',
  clients: 'Client records',
  operations: 'Safety & operations',
  records: 'Hours & scheduling',
};

function statusBadge(status: AuditChecklistItemResult['status']): string {
  switch (status) {
    case 'pass':
    case 'complete':
      return 'bg-emerald-100 text-emerald-800';
    case 'warn':
      return 'bg-amber-100 text-amber-900';
    case 'not_applicable':
      return 'bg-slate-100 text-slate-600';
    default:
      return 'bg-red-100 text-red-800';
  }
}

function statusLabel(status: AuditChecklistItemResult['status']): string {
  switch (status) {
    case 'pass':
      return 'Ready';
    case 'complete':
      return 'Confirmed';
    case 'warn':
      return 'Recommended';
    case 'not_applicable':
      return 'N/A';
    case 'pending':
      return 'Pending';
    default:
      return 'Needs fix';
  }
}

export function AuditChecklistPage() {
  const user = useAuthStore((state) => state.user)!;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canEditManual = isEmployer(user.role);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const readinessQuery = useQuery({
    queryKey: ['audit-readiness'],
    queryFn: () => api.getAuditReadiness(),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      itemKey,
      status,
    }: {
      itemKey: string;
      status: 'complete' | 'pending' | 'not_applicable';
    }) => api.updateManualChecklistItem(itemKey, { status }),
    onSuccess: (data) => {
      queryClient.setQueryData(['audit-readiness'], data);
    },
  });

  const readiness = readinessQuery.data?.readiness;

  const grouped = useMemo(() => {
    if (!readiness) {
      return new Map<AuditChecklistDomain, AuditChecklistItemResult[]>();
    }
    const map = new Map<AuditChecklistDomain, AuditChecklistItemResult[]>();
    for (const item of readiness.items) {
      const list = map.get(item.domain) ?? [];
      list.push(item);
      map.set(item.domain, list);
    }
    return map;
  }, [readiness]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-emerald-100 p-4 text-emerald-700">
            <ClipboardList className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Audit checklist</h2>
            <p className="mt-1 max-w-xl text-slate-600">
              Oregon adult foster home–oriented readiness review. Auto checks use your roster, clients, and
              hours; confirm manual items when records are on file.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="btn-primary inline-flex items-center justify-center gap-2"
            onClick={async () => {
              setDownloadError(null);
              try {
                await api.downloadAuditPacket();
              } catch (error) {
                setDownloadError(error instanceof ApiError ? error.message : 'Download failed.');
              }
            }}
          >
            <Download className="h-5 w-5" />
            Download audit packet
          </button>
          <Link
            to="/audit-logs"
            className="btn-secondary inline-flex items-center justify-center gap-2 text-center"
          >
            <Shield className="h-5 w-5" />
            Activity log
          </Link>
        </div>
      </div>

      {downloadError ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{downloadError}</p>
      ) : null}

      {readinessQuery.isLoading || !readiness ? (
        <p className="text-slate-600">Loading checklist…</p>
      ) : (
        <>
          <section className="card">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                  Overall readiness
                </p>
                <p className="mt-1 text-4xl font-bold text-slate-900">{readiness.percentReady}%</p>
                <p className="mt-2 text-sm text-slate-600">
                  {readiness.passCount} ready · {readiness.warnCount} recommended ·{' '}
                  {readiness.failCount + readiness.pendingCount} need attention
                </p>
              </div>
              <p className="text-xs text-slate-500">
                Updated {new Date(readiness.generatedAt).toLocaleString()}
              </p>
            </div>
          </section>

          {(['staff', 'clients', 'operations', 'records'] as AuditChecklistDomain[]).map((domain) => {
            const items = grouped.get(domain) ?? [];
            const domainStats = readiness.byDomain[domain];
            return (
              <section key={domain} className="card">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{DOMAIN_LABELS[domain]}</h3>
                  <span className="text-sm text-slate-600">
                    {domainStats.pass}/{domainStats.total} ready
                  </span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <li key={item.key} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900">{item.label}</p>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge(item.status)}`}>
                            {statusLabel(item.status)}
                          </span>
                          {item.kind === 'manual' ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                              Supervisor confirms
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{item.summary}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.fixHref && item.status !== 'pass' && item.status !== 'complete' ? (
                          <button
                            type="button"
                            className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-100"
                            onClick={() => navigate(item.fixHref!)}
                          >
                            Fix
                          </button>
                        ) : null}
                        {canEditManual && item.kind === 'manual' ? (
                          <>
                            <button
                              type="button"
                              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                              disabled={updateMutation.isPending}
                              onClick={() =>
                                updateMutation.mutate({ itemKey: item.key, status: 'complete' })
                              }
                            >
                              Mark done
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                              disabled={updateMutation.isPending}
                              onClick={() =>
                                updateMutation.mutate({ itemKey: item.key, status: 'not_applicable' })
                              }
                            >
                              N/A
                            </button>
                          </>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
