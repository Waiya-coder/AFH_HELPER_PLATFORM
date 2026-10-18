import type { ScheduleShift } from '@afh/shared';
import type { StaffColor } from '../../lib/schedule';
import { formatDayHeading, getStaffColor, isSameDay, toDateInput } from '../../lib/schedule';
import { ShiftCard } from './ShiftCard';

interface ScheduleDayViewProps {
  day: Date;
  shifts: ScheduleShift[];
  colorMap: Map<string, StaffColor>;
  showStaffName: boolean;
  canManage: boolean;
  onAddShift: () => void;
  onEditShift: (shift: ScheduleShift) => void;
  onDeleteShift: (shiftId: string) => void;
  deletePending: boolean;
}

export function ScheduleDayView({
  day,
  shifts,
  colorMap,
  showStaffName,
  canManage,
  onAddShift,
  onEditShift,
  onDeleteShift,
  deletePending,
}: ScheduleDayViewProps) {
  const isToday = isSameDay(day, new Date());

  return (
    <div
      className={`rounded-2xl border p-5 ${
        isToday ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-slate-50'
      }`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xl font-bold text-slate-900">{formatDayHeading(day)}</p>
          <p className="text-sm text-slate-500">
            {shifts.length} shift{shifts.length === 1 ? '' : 's'} scheduled
          </p>
        </div>
        {canManage ? (
          <button type="button" className="btn-secondary" onClick={onAddShift}>
            Add shift
          </button>
        ) : null}
      </div>

      {shifts.length === 0 ? (
        <p className="text-slate-500">No shifts scheduled for this day.</p>
      ) : (
        <ul className="space-y-3">
          {shifts.map((shift) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              color={getStaffColor(shift.staffId, colorMap)}
              showStaffName={showStaffName}
              canManage={canManage}
              onEdit={() => onEditShift(shift)}
              onDelete={() => onDeleteShift(shift.id)}
              deletePending={deletePending}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

interface ScheduleWeekViewProps {
  days: Date[];
  shiftsByDay: Map<string, ScheduleShift[]>;
  colorMap: Map<string, StaffColor>;
  showStaffName: boolean;
  canManage: boolean;
  onAddShift: (day: Date) => void;
  onEditShift: (shift: ScheduleShift) => void;
  onDeleteShift: (shiftId: string) => void;
  onSelectDay: (day: Date) => void;
  deletePending: boolean;
}

export function ScheduleWeekView({
  days,
  shiftsByDay,
  colorMap,
  showStaffName,
  canManage,
  onAddShift,
  onEditShift,
  onDeleteShift,
  onSelectDay,
  deletePending,
}: ScheduleWeekViewProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {days.map((day) => {
        const key = toDateInput(day);
        const dayShifts = shiftsByDay.get(key) ?? [];
        const isToday = isSameDay(day, new Date());

        return (
          <div
            key={key}
            className={`rounded-2xl border p-4 ${
              isToday ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <button
                type="button"
                className="text-left"
                onClick={() => onSelectDay(day)}
              >
                <p className="font-semibold text-slate-900 hover:text-emerald-700">
                  {formatDayHeading(day)}
                </p>
                <p className="text-sm text-slate-500">{dayShifts.length} shift(s)</p>
              </button>
              {canManage ? (
                <button
                  type="button"
                  className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-emerald-700 shadow-sm hover:bg-emerald-50"
                  onClick={() => onAddShift(day)}
                >
                  Add
                </button>
              ) : null}
            </div>

            {dayShifts.length === 0 ? (
              <p className="text-sm text-slate-500">No shifts scheduled.</p>
            ) : (
              <ul className="space-y-3">
                {dayShifts.map((shift) => (
                  <ShiftCard
                    key={shift.id}
                    shift={shift}
                    color={getStaffColor(shift.staffId, colorMap)}
                    showStaffName={showStaffName}
                    canManage={canManage}
                    onEdit={() => onEditShift(shift)}
                    onDelete={() => onDeleteShift(shift.id)}
                    deletePending={deletePending}
                  />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ScheduleMonthViewProps {
  anchorDate: Date;
  days: Date[];
  shiftsByDay: Map<string, ScheduleShift[]>;
  colorMap: Map<string, StaffColor>;
  showStaffName: boolean;
  canManage: boolean;
  onSelectDay: (day: Date) => void;
  onEditShift: (shift: ScheduleShift) => void;
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function ScheduleMonthView({
  anchorDate,
  days,
  shiftsByDay,
  colorMap,
  showStaffName,
  canManage,
  onSelectDay,
  onEditShift,
}: ScheduleMonthViewProps) {
  const currentMonth = anchorDate.getMonth();

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = toDateInput(day);
          const dayShifts = shiftsByDay.get(key) ?? [];
          const isToday = isSameDay(day, new Date());
          const inCurrentMonth = day.getMonth() === currentMonth;
          const visibleShifts = dayShifts.slice(0, 3);
          const hiddenCount = dayShifts.length - visibleShifts.length;

          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              className={`min-h-[7.5rem] cursor-pointer border-b border-r border-slate-200 p-2 text-left transition-colors hover:bg-slate-50 ${
                inCurrentMonth ? 'bg-white' : 'bg-slate-50/80'
              } ${isToday ? 'ring-2 ring-inset ring-emerald-400' : ''}`}
              onClick={() => onSelectDay(day)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectDay(day);
                }
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                    isToday
                      ? 'bg-emerald-600 text-white'
                      : inCurrentMonth
                        ? 'text-slate-900'
                        : 'text-slate-400'
                  }`}
                >
                  {day.getDate()}
                </span>
                {dayShifts.length > 0 ? (
                  <span className="text-xs font-medium text-slate-500">{dayShifts.length}</span>
                ) : null}
              </div>

              <div className="space-y-1">
                {visibleShifts.map((shift) => (
                  <ShiftCard
                    key={shift.id}
                    shift={shift}
                    color={getStaffColor(shift.staffId, colorMap)}
                    showStaffName={showStaffName}
                    canManage={canManage}
                    compact
                    onEdit={() => onEditShift(shift)}
                    onDelete={() => undefined}
                  />
                ))}
                {hiddenCount > 0 ? (
                  <p className="px-1 text-xs font-medium text-slate-500">+{hiddenCount} more</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
