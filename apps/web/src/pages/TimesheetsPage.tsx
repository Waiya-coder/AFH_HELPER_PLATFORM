import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { api, formatHours, formatTime } from '../lib/api';

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 14);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

export function TimesheetsPage() {
  const [range, setRange] = useState(defaultDateRange);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

  const timesheetsQuery = useQuery({
    queryKey: ['timesheets', range.startDate, range.endDate],
    queryFn: () => api.listTimesheets(range),
  });

  async function handleExport(format: 'csv' | 'pdf') {
    setExporting(format);
    try {
      await api.exportTimesheets({ ...range, format });
    } finally {
      setExporting(null);
    }
  }

  const timesheets = timesheetsQuery.data?.timesheets ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Employee hours</h2>
        <p className="mt-1 text-slate-600">Review hours and export audit-ready reports</p>
      </div>

      <section className="card space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Date range</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="startDate" className="mb-2 block text-sm font-medium text-slate-700">
              Start date
            </label>
            <input
              id="startDate"
              type="date"
              className="input"
              value={range.startDate}
              onChange={(event) => setRange({ ...range, startDate: event.target.value })}
            />
          </div>
          <div>
            <label htmlFor="endDate" className="mb-2 block text-sm font-medium text-slate-700">
              End date
            </label>
            <input
              id="endDate"
              type="date"
              className="input"
              value={range.endDate}
              onChange={(event) => setRange({ ...range, endDate: event.target.value })}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={() => handleExport('csv')}
            disabled={exporting !== null}
          >
            <FileSpreadsheet className="mr-2 h-5 w-5" />
            {exporting === 'csv' ? 'Exporting CSV...' : 'Export CSV'}
          </button>
          <button
            type="button"
            className="btn-primary flex-1"
            onClick={() => handleExport('pdf')}
            disabled={exporting !== null}
          >
            <FileText className="mr-2 h-5 w-5" />
            {exporting === 'pdf' ? 'Exporting PDF...' : 'Export PDF'}
          </button>
        </div>
      </section>

      <section className="card overflow-hidden p-0">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <Download className="h-5 w-5 text-emerald-700" />
          <h3 className="text-lg font-semibold text-slate-900">Timesheet records</h3>
        </div>

        {timesheetsQuery.isLoading ? (
          <p className="p-6 text-slate-600">Loading timesheets...</p>
        ) : timesheets.length === 0 ? (
          <p className="p-6 text-slate-600">No timesheets found for this date range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Staff</th>
                  <th className="px-6 py-4 font-semibold">Check in</th>
                  <th className="px-6 py-4 font-semibold">Check out</th>
                  <th className="px-6 py-4 font-semibold">Hours</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {timesheets.map((sheet) => (
                  <tr key={sheet.id}>
                    <td className="px-6 py-4 text-slate-900">{sheet.date}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {sheet.staff?.firstName} {sheet.staff?.lastName}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{formatTime(sheet.checkInTime)}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {sheet.checkOutTime ? formatTime(sheet.checkOutTime) : '—'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {sheet.hoursWorked != null ? formatHours(sheet.hoursWorked) : '—'}
                    </td>
                    <td className="px-6 py-4 capitalize text-slate-600">{sheet.status}</td>
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
