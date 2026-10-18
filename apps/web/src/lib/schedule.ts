export type ScheduleViewMode = 'day' | 'week' | 'month';

export interface StaffColor {
  bg: string;
  text: string;
  border: string;
  dot: string;
  ring: string;
}

const STAFF_COLOR_PALETTE: StaffColor[] = [
  {
    bg: 'bg-sky-100',
    text: 'text-sky-900',
    border: 'border-sky-300',
    dot: 'bg-sky-500',
    ring: 'ring-sky-200',
  },
  {
    bg: 'bg-violet-100',
    text: 'text-violet-900',
    border: 'border-violet-300',
    dot: 'bg-violet-500',
    ring: 'ring-violet-200',
  },
  {
    bg: 'bg-amber-100',
    text: 'text-amber-900',
    border: 'border-amber-300',
    dot: 'bg-amber-500',
    ring: 'ring-amber-200',
  },
  {
    bg: 'bg-rose-100',
    text: 'text-rose-900',
    border: 'border-rose-300',
    dot: 'bg-rose-500',
    ring: 'ring-rose-200',
  },
  {
    bg: 'bg-teal-100',
    text: 'text-teal-900',
    border: 'border-teal-300',
    dot: 'bg-teal-500',
    ring: 'ring-teal-200',
  },
  {
    bg: 'bg-orange-100',
    text: 'text-orange-900',
    border: 'border-orange-300',
    dot: 'bg-orange-500',
    ring: 'ring-orange-200',
  },
  {
    bg: 'bg-indigo-100',
    text: 'text-indigo-900',
    border: 'border-indigo-300',
    dot: 'bg-indigo-500',
    ring: 'ring-indigo-200',
  },
  {
    bg: 'bg-lime-100',
    text: 'text-lime-900',
    border: 'border-lime-300',
    dot: 'bg-lime-600',
    ring: 'ring-lime-200',
  },
];

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfMonth(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfMonth(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function toDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatWeekRange(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const endLabel = end.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startLabel} – ${endLabel}`;
}

export function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

export function formatDayHeading(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDayShort(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatShiftRange(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  return `${start.toLocaleTimeString([], timeOptions)} – ${end.toLocaleTimeString([], timeOptions)}`;
}

export function combineDateAndTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export function splitShiftDateTime(iso: string): { date: string; time: string } {
  const value = new Date(iso);
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return {
    date: toDateInput(value),
    time: `${hours}:${minutes}`,
  };
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function shiftDayKey(iso: string): string {
  return toDateInput(new Date(iso));
}

export function getViewRange(viewMode: ScheduleViewMode, anchorDate: Date): { start: Date; end: Date } {
  if (viewMode === 'day') {
    return { start: anchorDate, end: anchorDate };
  }

  if (viewMode === 'week') {
    const start = startOfWeek(anchorDate);
    return { start, end: addDays(start, 6) };
  }

  const monthStart = startOfMonth(anchorDate);
  const gridStart = startOfWeek(monthStart);
  return { start: gridStart, end: addDays(gridStart, 41) };
}

export function getMonthGridDays(anchorDate: Date): Date[] {
  const monthStart = startOfMonth(anchorDate);
  const gridStart = startOfWeek(monthStart);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export function buildStaffColorMap(staffIds: string[]): Map<string, StaffColor> {
  const uniqueIds = [...new Set(staffIds)].sort();
  const map = new Map<string, StaffColor>();

  uniqueIds.forEach((staffId, index) => {
    map.set(staffId, STAFF_COLOR_PALETTE[index % STAFF_COLOR_PALETTE.length]);
  });

  return map;
}

export function getStaffColor(
  staffId: string,
  colorMap: Map<string, StaffColor>,
): StaffColor {
  return (
    colorMap.get(staffId) ?? {
      bg: 'bg-slate-100',
      text: 'text-slate-900',
      border: 'border-slate-300',
      dot: 'bg-slate-500',
      ring: 'ring-slate-200',
    }
  );
}

export function sortShiftsByStart<T extends { startAt: string }>(shifts: T[]): T[] {
  return [...shifts].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
}

export function groupShiftsByDay<T extends { startAt: string }>(
  shifts: T[],
  days: Date[],
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const day of days) {
    grouped.set(toDateInput(day), []);
  }
  for (const shift of shifts) {
    const key = shiftDayKey(shift.startAt);
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(shift);
  }
  for (const [key, dayShifts] of grouped) {
    grouped.set(key, sortShiftsByStart(dayShifts));
  }
  return grouped;
}

export function navigateAnchorDate(
  viewMode: ScheduleViewMode,
  anchorDate: Date,
  direction: -1 | 1,
): Date {
  if (viewMode === 'day') {
    return addDays(anchorDate, direction);
  }
  if (viewMode === 'week') {
    return addDays(anchorDate, direction * 7);
  }
  return addMonths(anchorDate, direction);
}

export function formatViewLabel(viewMode: ScheduleViewMode, anchorDate: Date): string {
  if (viewMode === 'day') {
    return anchorDate.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
  if (viewMode === 'week') {
    const start = startOfWeek(anchorDate);
    return formatWeekRange(start, addDays(start, 6));
  }
  return formatMonthLabel(anchorDate);
}
