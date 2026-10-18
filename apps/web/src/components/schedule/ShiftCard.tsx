import { Pencil, Trash2 } from 'lucide-react';
import type { ScheduleShift } from '@afh/shared';
import type { StaffColor } from '../../lib/schedule';
import { formatShiftRange } from '../../lib/schedule';

function staffLabel(staff?: ScheduleShift['staff']): string {
  if (!staff) {
    return 'Staff member';
  }
  return `${staff.firstName} ${staff.lastName}`;
}

interface ShiftCardProps {
  shift: ScheduleShift;
  color: StaffColor;
  showStaffName: boolean;
  canManage: boolean;
  compact?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deletePending?: boolean;
}

export function ShiftCard({
  shift,
  color,
  showStaffName,
  canManage,
  compact = false,
  onEdit,
  onDelete,
  deletePending = false,
}: ShiftCardProps) {
  if (compact) {
    return (
      <div
        role={canManage ? 'button' : undefined}
        tabIndex={canManage ? 0 : undefined}
        className={`w-full rounded-lg border px-2 py-1 text-left text-xs font-medium ${color.bg} ${color.text} ${color.border} ${canManage ? 'cursor-pointer hover:opacity-90' : ''}`}
        onClick={(event) => {
          event.stopPropagation();
          if (canManage) {
            onEdit();
          }
        }}
        onKeyDown={(event) => {
          if (canManage && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            event.stopPropagation();
            onEdit();
          }
        }}
      >
        <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${color.dot}`} />
        {showStaffName ? `${staffLabel(shift.staff).split(' ')[0]} ` : ''}
        {formatShiftRange(shift.startAt, shift.endAt)}
      </div>
    );
  }

  return (
    <li
      className={`rounded-xl border px-4 py-3 shadow-sm ring-1 ${color.bg} ${color.border} ${color.ring}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-3 w-3 shrink-0 rounded-full ${color.dot}`} aria-hidden />
            {showStaffName ? (
              <p className={`font-semibold ${color.text}`}>{staffLabel(shift.staff)}</p>
            ) : (
              <p className={`font-semibold ${color.text}`}>
                {formatShiftRange(shift.startAt, shift.endAt)}
              </p>
            )}
          </div>
          {showStaffName ? (
            <p className={`mt-1 text-sm font-medium ${color.text}`}>
              {formatShiftRange(shift.startAt, shift.endAt)}
            </p>
          ) : null}
          {shift.notes ? <p className="mt-1 text-sm text-slate-600">{shift.notes}</p> : null}
        </div>

        {canManage ? (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-500 hover:bg-white/70"
              aria-label={`Edit shift for ${staffLabel(shift.staff)}`}
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-lg p-2 text-red-500 hover:bg-red-50"
              aria-label={`Delete shift for ${staffLabel(shift.staff)}`}
              onClick={onDelete}
              disabled={deletePending}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}

interface ScheduleLegendProps {
  entries: Array<{ staffId: string; label: string; color: StaffColor }>;
}

export function ScheduleLegend({ entries }: ScheduleLegendProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map((entry) => (
        <span
          key={entry.staffId}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${entry.color.bg} ${entry.color.text} ${entry.color.border}`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${entry.color.dot}`} aria-hidden />
          {entry.label}
        </span>
      ))}
    </div>
  );
}
