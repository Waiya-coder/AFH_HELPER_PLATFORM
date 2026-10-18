import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, GraduationCap, Users } from 'lucide-react';
import type { CprStatus, StaffRosterEntry } from '@afh/shared';
import {
  api,
  cprBadgeClass,
  cprExpiredClass,
  cprExpiredLabel,
  cprStatusLabel,
  formatDisplayDate,
} from '../lib/api';
import { isEmployer } from '../lib/permissions';
import { useAuthStore } from '../stores/auth.store';

type AttentionFilter = 'needs_attention' | 'all';

const CPR_SORT_ORDER: Record<CprStatus, number> = {
  expired: 0,
  expiring_soon: 1,
  missing: 2,
  valid: 3,
};

function isCaregiver(entry: StaffRosterEntry): boolean {
  return entry.role === 'staff' && entry.status !== 'archived';
}

function needsAttention(status: CprStatus): boolean {
  return status !== 'valid';
}

function sortByCprStatus(entries: StaffRosterEntry[]): StaffRosterEntry[] {
  return [...entries].sort((a, b) => {
    const statusDiff = CPR_SORT_ORDER[a.cprStatus] - CPR_SORT_ORDER[b.cprStatus];
    if (statusDiff !== 0) {
      return statusDiff;
    }
    const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
    const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
    return nameA.localeCompare(nameB);
  });
}

function rowHighlightClass(status: CprStatus): string | undefined {
  switch (status) {
    case 'expired':
      return 'bg-red-50/80';
    case 'expiring_soon':
      return 'bg-amber-50/80';
    case 'missing':
      return 'bg-orange-50/60';
    default:
      return undefined;
  }
}

export function TrainingCredentialsPage() {
  const user = useAuthStore((state) => state.user)!;
  const canManage = isEmployer(user.role);
  const [filter, setFilter] = useState<AttentionFilter>('needs_attention');

  const rosterQuery = useQuery({
    queryKey: ['staff-roster', 'training'],
    queryFn: () => api.listStaffRoster(),
  });

  const caregivers = useMemo(() => {
    const roster = rosterQuery.data?.roster ?? [];
    return sortByCprStatus(roster.filter(isCaregiver));
  }, [rosterQuery.data?.roster]);

  const counts = useMemo(() => {
    const expired = caregivers.filter((c) => c.cprStatus === 'expired').length;
    const expiringSoon = caregivers.filter((c) => c.cprStatus === 'expiring_soon').length;
    const missing = caregivers.filter((c) => c.cprStatus === 'missing').length;
    const valid = caregivers.filter((c) => c.cprStatus === 'valid').length;
    return { expired, expiringSoon, missing, valid };
  }, [caregivers]);

  const displayed = useMemo(() => {
    if (filter === 'all') {
      return caregivers;
    }
    return caregivers.filter((c) => needsAttention(c.cprStatus));
  }, [caregivers, filter]);

  const allClear =
    caregivers.length > 0 &&
    counts.expired === 0 &&
    counts.expiringSoon === 0 &&
    counts.missing === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-amber-100 p-4 text-amber-800">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Training &amp; Credentials</h2>
            <p className="mt-1 max-w-xl text-slate-600">
              CPR dates for each caregiver are checked automatically. Missing, expired, and
              expiring-within-30-days records are flagged here and on your audit checklist.
            </p>
          </div>
        </div>

        {canManage ? (
          <Link to="/staff" className="btn-primary inline-flex items-center gap-2 self-start">
            <Users className="h-5 w-5" />
            Update in My Employees
          </Link>
        ) : null}
      </div>

      {rosterQuery.isLoading ? (
        <p className="text-slate-600">Loading training status...</p>
      ) : caregivers.length === 0 ? (
        <div className="card">
          <p className="text-slate-700">No caregivers on the roster yet.</p>
          {canManage ? (
            <Link to="/staff" className="mt-3 inline-block font-semibold text-violet-700 hover:text-violet-900">
              Add employees in My Employees
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Expired CPR"
              count={counts.expired}
              tone={counts.expired > 0 ? 'danger' : 'neutral'}
            />
            <SummaryCard
              label="Expiring within 30 days"
              count={counts.expiringSoon}
              tone={counts.expiringSoon > 0 ? 'warn' : 'neutral'}
            />
            <SummaryCard
              label="CPR not on file"
              count={counts.missing}
              tone={counts.missing > 0 ? 'warn' : 'neutral'}
            />
            <SummaryCard
              label="Current CPR"
              count={counts.valid}
              tone={counts.valid === caregivers.length ? 'ok' : 'neutral'}
            />
          </div>

          {allClear ? (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm">
                All {caregivers.length} caregiver{caregivers.length === 1 ? '' : 's'} have CPR on
                file and nothing is expired.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-950">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold">Action needed</p>
                <p className="mt-1">
                  Review flagged caregivers below and enter updated CPR issue and expiration dates
                  {canManage ? ' in My Employees when you add or update records' : ''}.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={filter === 'needs_attention'}
              onClick={() => setFilter('needs_attention')}
              label={`Needs attention (${counts.expired + counts.expiringSoon + counts.missing})`}
            />
            <FilterChip
              active={filter === 'all'}
              onClick={() => setFilter('all')}
              label={`All caregivers (${caregivers.length})`}
            />
          </div>

          <section className="card overflow-hidden p-0">
            {displayed.length === 0 ? (
              <p className="p-6 text-slate-600">
                No caregivers need attention right now. Switch to &quot;All caregivers&quot; to see
                everyone.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-4 font-semibold">Caregiver</th>
                      <th className="px-4 py-4 font-semibold">CPR issued</th>
                      <th className="px-4 py-4 font-semibold">CPR expires</th>
                      <th className="px-4 py-4 font-semibold">Flag</th>
                      <th className="px-4 py-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayed.map((member) => (
                      <tr key={member.id} className={rowHighlightClass(member.cprStatus)}>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-900">
                            {member.firstName} {member.lastName}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {formatDisplayDate(member.cprIssueDate)}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {formatDisplayDate(member.cprExpirationDate)}
                        </td>
                        <td className={`px-4 py-4 font-medium ${cprExpiredClass(member.cprStatus)}`}>
                          {cprExpiredLabel(member.cprStatus)}
                        </td>
                        <td className="px-4 py-4">
                          <span className={cprBadgeClass(member.cprStatus)}>
                            {cprStatusLabel(member.cprStatus)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className="text-sm text-slate-500">
            Orientation and other training logs can still be marked on the{' '}
            <Link to="/audit-checklist" className="font-semibold text-emerald-700 hover:text-emerald-900">
              Audit Checklist
            </Link>
            . Additional certification types may be added in a future update.
          </p>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: 'danger' | 'warn' | 'ok' | 'neutral';
}) {
  const toneClass =
    tone === 'danger'
      ? 'border-red-200 bg-red-50 text-red-900'
      : tone === 'warn'
        ? 'border-amber-200 bg-amber-50 text-amber-950'
        : tone === 'ok'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : 'border-slate-200 bg-white text-slate-800';

  return (
    <div className={`rounded-2xl border px-4 py-4 ${toneClass}`}>
      <p className="text-2xl font-bold tabular-nums">{count}</p>
      <p className="mt-1 text-sm font-medium">{label}</p>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-amber-600 text-white'
          : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
