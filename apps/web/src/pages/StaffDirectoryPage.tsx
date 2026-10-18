import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Users, X } from 'lucide-react';
import type { CprStatus, StaffRosterEntry } from '@afh/shared';
import {
  api,
  ApiError,
  cprBadgeClass,
  cprExpiredClass,
  cprExpiredLabel,
  cprStatusLabel,
  formatDisplayDate,
  formatTotalHours,
} from '../lib/api';
import { isEmployer } from '../lib/permissions';
import { useAuthStore } from '../stores/auth.store';

type CprFilter = 'all' | CprStatus;

const CPR_SORT_ORDER: Record<CprStatus, number> = {
  expired: 0,
  expiring_soon: 1,
  missing: 2,
  valid: 3,
};

const FILTER_OPTIONS: Array<{ id: CprFilter; label: string }> = [
  { id: 'all', label: 'All employees' },
  { id: 'expired', label: 'Expired' },
  { id: 'expiring_soon', label: 'Expiring soon' },
  { id: 'valid', label: 'Valid' },
  { id: 'missing', label: 'Not on file' },
];

function sortRoster(entries: StaffRosterEntry[]): StaffRosterEntry[] {
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
      return 'bg-red-50/70';
    case 'expiring_soon':
      return 'bg-amber-50/70';
    default:
      return undefined;
  }
}

export function StaffDirectoryPage() {
  const user = useAuthStore((state) => state.user)!;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [cprFilter, setCprFilter] = useState<CprFilter>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [password, setPassword] = useState('');
  const [cprIssueDate, setCprIssueDate] = useState('');
  const [cprExpirationDate, setCprExpirationDate] = useState('');
  const [createdEmployee, setCreatedEmployee] = useState<{
    firstName: string;
    lastName: string;
    password: string;
  } | null>(null);
  const canManageEmployees = isEmployer(user.role);
  const canViewRoster = canManageEmployees || user.role === 'auditor';

  const rosterQuery = useQuery({
    queryKey: ['staff-roster', search],
    queryFn: () => api.listStaffRoster(search || undefined),
    enabled: canViewRoster,
  });

  const facilityQuery = useQuery({
    queryKey: ['facility-me'],
    queryFn: () => api.getFacilityInfo(),
    enabled: canManageEmployees,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.createStaff({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        hireDate,
        password,
        cprIssueDate: cprIssueDate || undefined,
        cprExpirationDate: cprExpirationDate || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff-roster'] });
      setCreatedEmployee({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password,
      });
      setShowAddForm(false);
      setFormError(null);
      setFirstName('');
      setLastName('');
      setPhone('');
      setHireDate('');
      setPassword('');
      setCprIssueDate('');
      setCprExpirationDate('');
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError('Unable to create employee. Please try again.');
      }
    },
  });

  const roster = rosterQuery.data?.roster ?? [];

  const filteredRoster = useMemo(() => {
    const filtered =
      cprFilter === 'all' ? roster : roster.filter((row) => row.cprStatus === cprFilter);
    return sortRoster(filtered);
  }, [roster, cprFilter]);

  const expiringCount = roster.filter((row) => row.cprStatus === 'expiring_soon').length;
  const expiredCount = roster.filter((row) => row.cprStatus === 'expired').length;
  const missingCount = roster.filter((row) => row.cprStatus === 'missing').length;

  if (!canViewRoster) {
    return (
      <div className="card">
        <h2 className="text-xl font-bold text-slate-900">My Employees</h2>
        <p className="mt-2 text-slate-600">
          This view is only available to facility supervisors and administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-violet-100 p-4 text-violet-700">
            <Users className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">My Employees</h2>
            <p className="mt-1 text-slate-600">
              Add each caregiver here first. They sign in on the welcome screen with the name,
              facility code, and password you set—then they can log hours.
            </p>
          </div>
        </div>

        {canManageEmployees ? (
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2 self-start"
            onClick={() => {
              setShowAddForm((open) => !open);
              setFormError(null);
            }}
          >
            {showAddForm ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {showAddForm ? 'Cancel' : 'Add employee'}
          </button>
        ) : null}
      </div>

      {createdEmployee && facilityQuery.data?.facility.joinCode ? (
        <section className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-5 py-4 text-emerald-950">
          <h3 className="text-lg font-bold">Employee ready to sign in</h3>
          <p className="mt-2 text-sm">
            Share these details with{' '}
            <strong>
              {createdEmployee.firstName} {createdEmployee.lastName}
            </strong>
            . On the app welcome screen, they choose <strong>Caregiver staff</strong> and enter:
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm font-medium">
            <li>
              First / last name: {createdEmployee.firstName} {createdEmployee.lastName}
            </li>
            <li>
              Facility code:{' '}
              <span className="font-mono">{facilityQuery.data.facility.joinCode}</span>
            </li>
            <li>
              Password: <span className="font-mono">{createdEmployee.password}</span>
            </li>
          </ul>
          <button
            type="button"
            className="mt-4 text-sm font-semibold text-emerald-800 underline hover:text-emerald-950"
            onClick={() => setCreatedEmployee(null)}
          >
            Dismiss
          </button>
        </section>
      ) : null}

      {showAddForm && canManageEmployees ? (
        <section className="card">
          <h3 className="text-lg font-bold text-slate-900">New employee</h3>
          <p className="mt-1 text-sm text-slate-600">
            After saving, share the employee&apos;s name, facility code, and password so they can sign in.
          </p>

          <form
            className="mt-6 grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              setFormError(null);
              createMutation.mutate();
            }}
          >
            <div>
              <label htmlFor="newFirstName" className="mb-2 block text-sm font-semibold text-slate-800">
                First name
              </label>
              <input
                id="newFirstName"
                className="input"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="newLastName" className="mb-2 block text-sm font-semibold text-slate-800">
                Last name
              </label>
              <input
                id="newLastName"
                className="input"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="newPhone" className="mb-2 block text-sm font-semibold text-slate-800">
                Phone (optional)
              </label>
              <input
                id="newPhone"
                className="input"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="newHireDate" className="mb-2 block text-sm font-semibold text-slate-800">
                Hire date
              </label>
              <input
                id="newHireDate"
                type="date"
                className="input"
                value={hireDate}
                onChange={(event) => setHireDate(event.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="newPassword" className="mb-2 block text-sm font-semibold text-slate-800">
                Login password
              </label>
              <input
                id="newPassword"
                type="password"
                className="input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
              <p className="mt-1 text-xs text-slate-500">Minimum 6 characters. Share this with the employee.</p>
            </div>
            <div>
              <label htmlFor="newCprIssue" className="mb-2 block text-sm font-semibold text-slate-800">
                CPR registered (optional)
              </label>
              <input
                id="newCprIssue"
                type="date"
                className="input"
                value={cprIssueDate}
                onChange={(event) => setCprIssueDate(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="newCprExpires" className="mb-2 block text-sm font-semibold text-slate-800">
                CPR expires (optional)
              </label>
              <input
                id="newCprExpires"
                type="date"
                className="input"
                value={cprExpirationDate}
                onChange={(event) => setCprExpirationDate(event.target.value)}
              />
            </div>

            {formError ? (
              <p className="sm:col-span-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {formError}
              </p>
            ) : null}

            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Saving...' : 'Create employee'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {(expiredCount > 0 || expiringCount > 0 || missingCount > 0) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {expiredCount > 0 ? (
            <p>
              <strong>{expiredCount}</strong> employee{expiredCount === 1 ? '' : 's'} with expired
              CPR.
            </p>
          ) : null}
          {expiringCount > 0 ? (
            <p>
              <strong>{expiringCount}</strong> employee{expiringCount === 1 ? '' : 's'} with CPR
              expiring within 30 days.
            </p>
          ) : null}
          {missingCount > 0 ? (
            <p>
              <strong>{missingCount}</strong> employee{missingCount === 1 ? '' : 's'} without CPR
              dates on file.
            </p>
          ) : null}
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-12"
            placeholder="Search by name or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                cprFilter === option.id
                  ? 'bg-violet-600 text-white'
                  : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
              onClick={() => setCprFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <section className="card overflow-hidden p-0">
        {rosterQuery.isLoading ? (
          <p className="p-6 text-slate-600">Loading employee roster...</p>
        ) : filteredRoster.length === 0 ? (
          <p className="p-6 text-slate-600">No employees match your search or filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-4 font-semibold">Employee name</th>
                  <th className="px-4 py-4 font-semibold">CPR registered</th>
                  <th className="px-4 py-4 font-semibold">CPR expires</th>
                  <th className="px-4 py-4 font-semibold">CPR expired?</th>
                  <th className="px-4 py-4 font-semibold">CPR status</th>
                  <th className="px-4 py-4 font-semibold">Total hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRoster.map((member) => (
                  <tr key={member.id} className={rowHighlightClass(member.cprStatus)}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-xs text-slate-500">{member.email}</p>
                      <p className="text-xs text-slate-500">{member.role}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {formatDisplayDate(member.cprIssueDate)}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {formatDisplayDate(member.cprExpirationDate)}
                    </td>
                    <td className={`px-4 py-4 ${cprExpiredClass(member.cprStatus)}`}>
                      {cprExpiredLabel(member.cprStatus)}
                    </td>
                    <td className="px-4 py-4">
                      <span className={cprBadgeClass(member.cprStatus)}>
                        {cprStatusLabel(member.cprStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-900">
                      {formatTotalHours(member.totalHoursWorked)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-sm text-slate-500">
        Showing {filteredRoster.length} of {roster.length} employee{roster.length === 1 ? '' : 's'}.
        CPR dates come from each employee&apos;s profile registration.
      </p>
    </div>
  );
}
