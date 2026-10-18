import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, LogIn, LogOut, Search, UserPlus } from 'lucide-react';
import { api, ApiError, formatHours, formatTime } from '../lib/api';
import { isEmployer } from '../lib/permissions';
import { combineDateAndTime, toDateInput } from '../lib/schedule';
import { useAuthStore } from '../stores/auth.store';

export function StaffDashboard() {
  const user = useAuthStore((state) => state.user)!;
  const queryClient = useQueryClient();
  const canManageHours = isEmployer(user.role);
  const [showConfirmCheckout, setShowConfirmCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSuccess, setManualSuccess] = useState<string | null>(null);
  const canCheckIn = Boolean(user.staffId);

  const [staffSearch, setStaffSearch] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [workDate, setWorkDate] = useState(() => toDateInput(new Date()));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [notes, setNotes] = useState('');

  const rosterQuery = useQuery({
    queryKey: ['staff-roster'],
    queryFn: () => api.listStaffRoster(),
    enabled: canManageHours,
  });

  const roster = rosterQuery.data?.roster ?? [];

  const filteredRoster = useMemo(() => {
    const query = staffSearch.trim().toLowerCase();
    if (!query) {
      return roster;
    }
    return roster.filter((member) => {
      const name = `${member.firstName} ${member.lastName}`.toLowerCase();
      return name.includes(query) || member.email.toLowerCase().includes(query);
    });
  }, [roster, staffSearch]);

  const selectedStaff = roster.find((member) => member.id === selectedStaffId);

  const shiftQuery = useQuery({
    queryKey: ['current-shift'],
    queryFn: () => api.getCurrentShift(),
    refetchInterval: 30000,
    enabled: !canManageHours,
  });

  const checkInMutation = useMutation({
    mutationFn: () => api.checkIn(),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['current-shift'] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Check-in failed. Please try again.');
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: () => api.checkOut(),
    onSuccess: () => {
      setError(null);
      setShowConfirmCheckout(false);
      queryClient.invalidateQueries({ queryKey: ['current-shift'] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Check-out failed. Please try again.');
    },
  });

  const manualMutation = useMutation({
    mutationFn: () =>
      api.createManualTimesheet({
        staffId: selectedStaffId,
        date: workDate,
        checkInTime: combineDateAndTime(workDate, startTime),
        checkOutTime: combineDateAndTime(workDate, endTime),
        notes: notes.trim() || undefined,
      }),
    onSuccess: (data) => {
      setManualError(null);
      const name = selectedStaff
        ? `${selectedStaff.firstName} ${selectedStaff.lastName}`
        : 'Employee';
      const hours = data.timesheet.hoursWorked ?? 0;
      setManualSuccess(`Saved ${formatHours(Number(hours))} for ${name}.`);
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['staff-roster'] });
      setTimeout(() => setManualSuccess(null), 4000);
    },
    onError: (err) => {
      setManualSuccess(null);
      setManualError(err instanceof ApiError ? err.message : 'Unable to save hours.');
    },
  });

  const isOnDuty = Boolean(shiftQuery.data?.openTimesheet);
  const elapsed = shiftQuery.data?.elapsedHours ?? 0;
  const dailyTotal = shiftQuery.data?.dailyTotalHours ?? 0;

  return (
    <div className="space-y-6">
      {canManageHours ? (
        <section className="card">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-sky-100 p-4 text-sky-700">
              <UserPlus className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
                Enter staff hours
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">Record hours for an employee</h2>
              <p className="mt-2 text-slate-600">
                Choose someone from your roster and enter the shift they worked.
              </p>
            </div>
          </div>

          <form
            className="mt-8 space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              setManualError(null);
              setManualSuccess(null);
              if (!selectedStaffId) {
                setManualError('Please select an employee.');
                return;
              }
              manualMutation.mutate();
            }}
          >
            <div>
              <label htmlFor="staffSearch" className="mb-2 block text-sm font-semibold text-slate-800">
                Find employee
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="staffSearch"
                  className="input pl-12"
                  placeholder="Type a name to narrow the list…"
                  value={staffSearch}
                  onChange={(event) => setStaffSearch(event.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="employeeSelect" className="mb-2 block text-sm font-semibold text-slate-800">
                Employee
              </label>
              <select
                id="employeeSelect"
                className="input text-base"
                value={selectedStaffId}
                onChange={(event) => setSelectedStaffId(event.target.value)}
                required
                size={Math.min(6, Math.max(3, filteredRoster.length))}
              >
                <option value="">Select an employee…</option>
                {filteredRoster.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.firstName} {member.lastName}
                  </option>
                ))}
              </select>
              {filteredRoster.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No employees match that search.</p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="workDate" className="mb-2 block text-sm font-semibold text-slate-800">
                  Date worked
                </label>
                <input
                  id="workDate"
                  type="date"
                  className="input"
                  value={workDate}
                  onChange={(event) => setWorkDate(event.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="startTime" className="mb-2 block text-sm font-semibold text-slate-800">
                  Check in
                </label>
                <input
                  id="startTime"
                  type="time"
                  className="input"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="endTime" className="mb-2 block text-sm font-semibold text-slate-800">
                  Check out
                </label>
                <input
                  id="endTime"
                  type="time"
                  className="input"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="hourNotes" className="mb-2 block text-sm font-semibold text-slate-800">
                Notes (optional)
              </label>
              <input
                id="hourNotes"
                className="input"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="e.g. Covered evening shift"
              />
            </div>

            {manualError ? (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {manualError}
              </p>
            ) : null}

            {manualSuccess ? (
              <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{manualSuccess}</p>
            ) : null}

            <button type="submit" className="btn-primary w-full text-lg" disabled={manualMutation.isPending}>
              {manualMutation.isPending ? 'Saving…' : 'Save hours'}
            </button>
          </form>
        </section>
      ) : null}

      {!canManageHours ? (
      <section className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
              Caregiver staff check-in
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              {isOnDuty ? 'You are checked in' : 'You are off duty'}
            </h2>
            {isOnDuty && shiftQuery.data?.openTimesheet ? (
              <p className="mt-2 text-slate-600">
                Started at {formatTime(shiftQuery.data.openTimesheet.checkInTime)}
              </p>
            ) : (
              <p className="mt-2 text-slate-600">Tap check in when your shift begins.</p>
            )}
          </div>
          <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-800">
            <Clock className="h-8 w-8" />
          </div>
        </div>

        {canCheckIn ? (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Elapsed this shift</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{formatHours(elapsed)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Total today</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {formatHours(dailyTotal + (isOnDuty ? elapsed : 0))}
                </p>
              </div>
            </div>

            <div className="mt-8">
              {error ? (
                <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {error}
                </p>
              ) : null}

              {!isOnDuty ? (
                <button
                  type="button"
                  className="btn-primary w-full text-lg"
                  onClick={() => checkInMutation.mutate()}
                  disabled={checkInMutation.isPending}
                >
                  <LogIn className="mr-2 h-5 w-5" />
                  {checkInMutation.isPending ? 'Checking in...' : 'Check In'}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-danger w-full text-lg"
                  onClick={() => setShowConfirmCheckout(true)}
                >
                  <LogOut className="mr-2 h-5 w-5" />
                  Check Out
                </button>
              )}
            </div>
          </>
        ) : (
          <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Your account is not linked to a staff profile. Contact your supervisor.
          </p>
        )}
      </section>
      ) : null}

      {showConfirmCheckout ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="card w-full max-w-md" role="dialog" aria-modal="true">
            <h3 className="text-xl font-bold text-slate-900">Confirm check out?</h3>
            <p className="mt-2 text-slate-600">
              You have worked {formatHours(elapsed)} this shift. Are you sure you want to check out?
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => setShowConfirmCheckout(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger flex-1"
                onClick={() => checkOutMutation.mutate()}
                disabled={checkOutMutation.isPending}
              >
                {checkOutMutation.isPending ? 'Checking out...' : 'Yes, check out'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
