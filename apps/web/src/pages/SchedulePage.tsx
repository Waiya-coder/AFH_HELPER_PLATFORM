import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { ScheduleShift, ScheduleShiftRequest, StaffMember } from '@afh/shared';
import { ScheduleDayView, ScheduleMonthView, ScheduleWeekView } from '../components/schedule/ScheduleViews';
import { ScheduleLegend } from '../components/schedule/ShiftCard';
import { api, ApiError } from '../lib/api';
import { isEmployer } from '../lib/permissions';
import {
  addDays,
  buildStaffColorMap,
  combineDateAndTime,
  getMonthGridDays,
  getStaffColor,
  getViewRange,
  groupShiftsByDay,
  navigateAnchorDate,
  formatViewLabel,
  splitShiftDateTime,
  startOfWeek,
  toDateInput,
  type ScheduleViewMode,
} from '../lib/schedule';
import { useAuthStore } from '../stores/auth.store';

interface ShiftFormState {
  staffId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
}

const VIEW_OPTIONS: Array<{ id: ScheduleViewMode; label: string }> = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

const DEFAULT_SHIFT_FORM = (): ShiftFormState => ({
  staffId: '',
  date: toDateInput(new Date()),
  startTime: '09:00',
  endTime: '17:00',
  notes: '',
});

function toPayload(form: ShiftFormState): ScheduleShiftRequest {
  return {
    staffId: form.staffId,
    startAt: combineDateAndTime(form.date, form.startTime),
    endAt: combineDateAndTime(form.date, form.endTime),
    notes: form.notes.trim() || undefined,
  };
}

function formFromShift(shift: ScheduleShift): ShiftFormState {
  const start = splitShiftDateTime(shift.startAt);
  const end = splitShiftDateTime(shift.endAt);
  return {
    staffId: shift.staffId,
    date: start.date,
    startTime: start.time,
    endTime: end.time,
    notes: shift.notes ?? '',
  };
}

function staffDisplayName(staff?: ScheduleShift['staff']): string {
  if (!staff) {
    return 'Staff member';
  }
  return `${staff.firstName} ${staff.lastName}`;
}

export function SchedulePage() {
  const user = useAuthStore((state) => state.user)!;
  const queryClient = useQueryClient();
  const canManage = isEmployer(user.role);
  const [viewMode, setViewMode] = useState<ScheduleViewMode>('week');
  const [anchorDate, setAnchorDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [staffFilter, setStaffFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ScheduleShift | null>(null);
  const [form, setForm] = useState<ShiftFormState>(DEFAULT_SHIFT_FORM);
  const [error, setError] = useState<string | null>(null);

  const viewRange = useMemo(() => getViewRange(viewMode, anchorDate), [viewMode, anchorDate]);

  const visibleDays = useMemo(() => {
    if (viewMode === 'day') {
      return [anchorDate];
    }
    if (viewMode === 'week') {
      const weekStart = startOfWeek(anchorDate);
      return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
    }
    return getMonthGridDays(anchorDate);
  }, [viewMode, anchorDate]);

  const staffQuery = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.listStaff(),
    enabled: canManage,
  });

  const scheduleQuery = useQuery({
    queryKey: [
      'schedules',
      viewMode,
      toDateInput(viewRange.start),
      toDateInput(viewRange.end),
      staffFilter,
    ],
    queryFn: () =>
      api.listSchedules({
        startDate: toDateInput(viewRange.start),
        endDate: toDateInput(viewRange.end),
        staffId: staffFilter || undefined,
      }),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = toPayload(form);
      if (editingShift) {
        return api.updateScheduleShift(editingShift.id, payload);
      }
      return api.createScheduleShift(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setModalOpen(false);
      setEditingShift(null);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Unable to save shift.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (shiftId: string) => api.deleteScheduleShift(shiftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setModalOpen(false);
      setEditingShift(null);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Unable to delete shift.');
    },
  });

  const shifts = scheduleQuery.data?.shifts ?? [];
  const shiftsByDay = useMemo(
    () => groupShiftsByDay(shifts, visibleDays),
    [shifts, visibleDays],
  );

  const staffOptions: StaffMember[] = staffQuery.data?.staff ?? [];

  const colorMap = useMemo(() => {
    const staffIdsFromShifts = shifts.map((shift) => shift.staffId);
    const staffIdsFromRoster = staffOptions.map((member) => member.id);
    return buildStaffColorMap([...staffIdsFromShifts, ...staffIdsFromRoster]);
  }, [shifts, staffOptions]);

  const legendEntries = useMemo(() => {
    const entries = new Map<string, string>();

    for (const member of staffOptions) {
      entries.set(member.id, `${member.firstName} ${member.lastName}`);
    }
    for (const shift of shifts) {
      if (shift.staff && !entries.has(shift.staffId)) {
        entries.set(shift.staffId, staffDisplayName(shift.staff));
      }
    }

    return [...entries.entries()]
      .map(([staffId, label]) => ({
        staffId,
        label,
        color: getStaffColor(staffId, colorMap),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [staffOptions, shifts, colorMap]);

  const showStaffName = canManage || legendEntries.length > 1;

  function openCreateModal(day?: Date) {
    setEditingShift(null);
    setForm({
      ...DEFAULT_SHIFT_FORM(),
      date: day ? toDateInput(day) : toDateInput(anchorDate),
      staffId: staffFilter || staffOptions[0]?.id || '',
    });
    setError(null);
    setModalOpen(true);
  }

  function openEditModal(shift: ScheduleShift) {
    setEditingShift(shift);
    setForm(formFromShift(shift));
    setError(null);
    setModalOpen(true);
  }

  function goToDay(day: Date) {
    setAnchorDate(day);
    setViewMode('day');
  }

  function resetToToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setAnchorDate(today);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-emerald-100 p-4 text-emerald-700">
            <Calendar className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {canManage ? 'Staff Schedule' : 'My Schedule'}
            </h2>
            <p className="mt-1 text-slate-600">
              {canManage
                ? 'Switch between day, week, and month views. Each person has their own color.'
                : 'See when you are scheduled to work.'}
            </p>
          </div>
        </div>

        {canManage ? (
          <button type="button" className="btn-primary" onClick={() => openCreateModal()}>
            <Plus className="mr-2 h-5 w-5" />
            Add shift
          </button>
        ) : null}
      </div>

      <section className="card space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            {VIEW_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  viewMode === option.id
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                onClick={() => setViewMode(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
              aria-label={`Previous ${viewMode}`}
              onClick={() => setAnchorDate((current) => navigateAnchorDate(viewMode, current, -1))}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-[14rem] text-center">
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
                {viewMode === 'day' ? 'Day' : viewMode === 'week' ? 'Week of' : 'Month'}
              </p>
              <p className="font-semibold text-slate-900">{formatViewLabel(viewMode, anchorDate)}</p>
            </div>
            <button
              type="button"
              className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
              aria-label={`Next ${viewMode}`}
              onClick={() => setAnchorDate((current) => navigateAnchorDate(viewMode, current, 1))}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button type="button" className="btn-secondary" onClick={resetToToday}>
              Today
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          {showStaffName && legendEntries.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Staff colors</p>
              <ScheduleLegend entries={legendEntries} />
            </div>
          ) : null}

          {canManage ? (
            <select
              className="input max-w-xs lg:ml-auto"
              value={staffFilter}
              onChange={(event) => setStaffFilter(event.target.value)}
            >
              <option value="">All staff</option>
              {staffOptions.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.firstName} {member.lastName}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        {scheduleQuery.isLoading ? (
          <p className="text-slate-600">Loading schedule...</p>
        ) : scheduleQuery.isError ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            Unable to load schedule. Please try again.
          </p>
        ) : viewMode === 'day' ? (
          <ScheduleDayView
            day={anchorDate}
            shifts={shiftsByDay.get(toDateInput(anchorDate)) ?? []}
            colorMap={colorMap}
            showStaffName={showStaffName}
            canManage={canManage}
            onAddShift={() => openCreateModal(anchorDate)}
            onEditShift={openEditModal}
            onDeleteShift={(shiftId) => deleteMutation.mutate(shiftId)}
            deletePending={deleteMutation.isPending}
          />
        ) : viewMode === 'week' ? (
          <ScheduleWeekView
            days={visibleDays}
            shiftsByDay={shiftsByDay}
            colorMap={colorMap}
            showStaffName={showStaffName}
            canManage={canManage}
            onAddShift={openCreateModal}
            onEditShift={openEditModal}
            onDeleteShift={(shiftId) => deleteMutation.mutate(shiftId)}
            onSelectDay={goToDay}
            deletePending={deleteMutation.isPending}
          />
        ) : (
          <ScheduleMonthView
            anchorDate={anchorDate}
            days={visibleDays}
            shiftsByDay={shiftsByDay}
            colorMap={colorMap}
            showStaffName={showStaffName}
            canManage={canManage}
            onSelectDay={goToDay}
            onEditShift={openEditModal}
          />
        )}
      </section>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="card w-full max-w-lg" role="dialog" aria-modal="true">
            <h3 className="text-xl font-bold text-slate-900">
              {editingShift ? 'Edit shift' : 'Add shift'}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Pick the staff member, date, and working hours.
            </p>

            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                saveMutation.mutate();
              }}
            >
              <div>
                <label htmlFor="shiftStaff" className="mb-2 block text-sm font-medium text-slate-700">
                  Staff member
                </label>
                <select
                  id="shiftStaff"
                  className="input"
                  value={form.staffId}
                  onChange={(event) => setForm({ ...form, staffId: event.target.value })}
                  required
                >
                  <option value="" disabled>
                    Select staff
                  </option>
                  {staffOptions.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.firstName} {member.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="shiftDate" className="mb-2 block text-sm font-medium text-slate-700">
                  Date
                </label>
                <input
                  id="shiftDate"
                  type="date"
                  className="input"
                  value={form.date}
                  onChange={(event) => setForm({ ...form, date: event.target.value })}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="shiftStart"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Start time
                  </label>
                  <input
                    id="shiftStart"
                    type="time"
                    className="input"
                    value={form.startTime}
                    onChange={(event) => setForm({ ...form, startTime: event.target.value })}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="shiftEnd" className="mb-2 block text-sm font-medium text-slate-700">
                    End time
                  </label>
                  <input
                    id="shiftEnd"
                    type="time"
                    className="input"
                    value={form.endTime}
                    onChange={(event) => setForm({ ...form, endTime: event.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="shiftNotes" className="mb-2 block text-sm font-medium text-slate-700">
                  Notes (optional)
                </label>
                <input
                  id="shiftNotes"
                  className="input"
                  placeholder="Day shift, training, etc."
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                />
              </div>

              {error ? (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={() => {
                    setModalOpen(false);
                    setEditingShift(null);
                    setError(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving...' : editingShift ? 'Save changes' : 'Add shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
