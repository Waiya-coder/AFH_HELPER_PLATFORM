import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { api, statusBadgeClass, statusLabel } from '../lib/api';

export function SupervisorDashboard() {
  const staffQuery = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.listStaff(),
  });

  const staff = staffQuery.data?.staff ?? [];
  const onDuty = staff.filter((member) => member.status === 'on_duty').length;
  const offDuty = staff.filter((member) => member.status === 'off_duty').length;
  const onBreak = staff.filter((member) => member.status === 'on_break').length;
  const active = staff.filter((member) => member.status !== 'archived').length;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-bold text-slate-900">Staffing overview</h2>
        <p className="mt-1 text-slate-600">Live status across your facility</p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <p className="text-sm text-slate-500">Total active staff</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{active}</p>
        </div>
        <div className="card border-emerald-200 bg-emerald-50">
          <p className="text-sm text-emerald-700">On duty</p>
          <p className="mt-2 text-3xl font-bold text-emerald-900">{onDuty}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Off duty</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{offDuty}</p>
        </div>
        <div className="card border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-700">On break</p>
          <p className="mt-2 text-3xl font-bold text-amber-900">{onBreak}</p>
        </div>
      </div>

      <section className="card">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Current staff status</h3>
              <p className="text-sm text-slate-600">Color-coded for quick recognition</p>
            </div>
          </div>
        </div>

        {staffQuery.isLoading ? (
          <p className="text-slate-600">Loading staff...</p>
        ) : staff.length === 0 ? (
          <p className="text-slate-600">No staff members yet. Add staff from the directory.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {staff
              .filter((member) => member.status !== 'archived')
              .map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-sm text-slate-500">{member.role}</p>
                  </div>
                  <span className={statusBadgeClass(member.status)}>{statusLabel(member.status)}</span>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
