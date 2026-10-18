import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FileText,
  Sun,
  Users,
} from 'lucide-react';
import { AccessDeniedDialog } from '../components/AccessDeniedDialog';
import { ComingSoonDialog } from '../components/ComingSoonDialog';
import { TileCard } from '../components/TileCard';
import { COMPLIANCE_TILES, TODAY_TILES, type HomeTile } from '../config/homeTiles';
import { api } from '../lib/api';
import { canAccessRoles, isEmployer } from '../lib/permissions';
import { useAuthStore } from '../stores/auth.store';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user)!;
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [deniedTile, setDeniedTile] = useState<HomeTile | null>(null);
  const [comingSoonTile, setComingSoonTile] = useState<HomeTile | null>(null);

  const staffQuery = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.listStaff(),
    enabled: isEmployer(user.role),
  });

  const facilityQuery = useQuery({
    queryKey: ['facility-me'],
    queryFn: () => api.getFacilityInfo(),
    enabled: isEmployer(user.role),
  });

  const staff = staffQuery.data?.staff ?? [];
  const onDuty = staff.filter((member) => member.status === 'on_duty').length;
  const activeStaff = staff.filter((member) => member.status !== 'archived').length;
  const caregiverCount = staff.filter(
    (member) => member.status !== 'archived' && member.role === 'Caregiver',
  ).length;
  const isStaffOnly = user.role === 'staff';
  const todayTiles = isStaffOnly
    ? TODAY_TILES.filter((tile) => tile.id === 'staff-hours')
    : TODAY_TILES;

  function handleTileClick(tile: HomeTile) {
    const allowed = canAccessRoles(user.role, tile.allowedRoles);

    if (!allowed) {
      setDeniedTile(tile);
      return;
    }

    if (tile.comingSoon || !tile.href) {
      setComingSoonTile(tile);
      return;
    }

    navigate(tile.href);
  }

  return (
    <div className="space-y-8 pb-24">
      {/* Welcome banner */}
      <section className="rounded-2xl bg-gradient-to-r from-sky-50 to-emerald-50 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-600">
              <Sun className="h-7 w-7" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-800">
                {isStaffOnly
                  ? `${greeting()}! Ready to log your hours?`
                  : `${greeting()}! Let's help you care for others.`}
              </p>
              <p className="mt-1 text-slate-600">
                {isStaffOnly ? 'Tap Enter Staff Hours to check in or out.' : 'Choose a task below to support your home and team.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-sm">
            <CalendarDays className="h-5 w-5 text-sky-600" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Today</p>
              <p className="text-sm font-semibold text-slate-800">{todayLabel()}</p>
            </div>
          </div>
        </div>
      </section>

      {isEmployer(user.role) && caregiverCount === 0 && !staffQuery.isLoading ? (
        <section className="rounded-2xl border-2 border-violet-200 bg-violet-50 px-5 py-4">
          <p className="text-sm font-semibold text-violet-900">Start with your team</p>
          <p className="mt-1 text-slate-700">
            You don&apos;t have any caregivers on the roster yet. Add each employee in{' '}
            <button
              type="button"
              className="font-semibold text-violet-800 underline hover:text-violet-950"
              onClick={() => navigate('/staff')}
            >
              My Employees
            </button>{' '}
            before they can sign in and log hours.
          </p>
        </section>
      ) : null}

      {facilityQuery.data?.facility.joinCode && !isStaffOnly ? (
        <section className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4">
          <p className="text-sm font-semibold text-sky-900">Caregiver facility code</p>
          <p className="mt-1 text-slate-600">
            After you add someone in My Employees, share this code for caregiver sign-in:{' '}
            <span className="font-mono text-lg font-bold text-sky-800">
              {facilityQuery.data.facility.joinCode}
            </span>
          </p>
        </section>
      ) : null}

      {/* Today */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-slate-900">Today</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {todayTiles.map((tile) => (
            <TileCard
              key={tile.id}
              tile={tile}
              locked={!canAccessRoles(user.role, tile.allowedRoles)}
              comingSoon={Boolean(tile.comingSoon)}
              onClick={() => handleTileClick(tile)}
            />
          ))}
        </div>
      </section>

      {!isStaffOnly ? (
        <section>
          <h2 className="mb-4 text-xl font-bold text-slate-900">Stay Audit Ready</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {COMPLIANCE_TILES.map((tile) => (
              <TileCard
                key={tile.id}
                tile={tile}
                compact
                locked={!canAccessRoles(user.role, tile.allowedRoles)}
                comingSoon={Boolean(tile.comingSoon)}
                onClick={() => handleTileClick(tile)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {!isStaffOnly ? (
        <section className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">At a Glance</h2>
          {isEmployer(user.role) ? (
            <button
              type="button"
              className="text-sm font-semibold text-sky-700 hover:text-sky-800"
              onClick={() => navigate('/timesheets')}
            >
              View details <ChevronRight className="inline h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {isEmployer(user.role) ? (
            <>
              <GlanceCard
                icon={CheckCircle2}
                iconClass="text-emerald-600"
                value={String(Math.max(0, activeStaff - onDuty))}
                label="Off duty today"
                sub="Staff not checked in"
              />
              <GlanceCard
                icon={Users}
                iconClass="text-emerald-600"
                value={String(onDuty)}
                label="On duty now"
                sub="Checked in"
              />
              <GlanceCard
                icon={FileText}
                iconClass="text-amber-600"
                value="—"
                label="Expiring soon"
                sub="Next 30 days"
              />
              <GlanceCard
                icon={CheckCircle2}
                iconClass="text-sky-600"
                value="—"
                label="Audit readiness"
                sub="Coming soon"
              />
            </>
          ) : (
            <>
              <GlanceCard
                icon={CheckCircle2}
                iconClass="text-emerald-600"
                value="✓"
                label="Your hours"
                sub="Tap Enter Staff Hours"
              />
              <GlanceCard
                icon={FileText}
                iconClass="text-sky-600"
                value="—"
                label="Employee hours"
                sub="View & export timesheets"
              />
            </>
          )}
        </div>
      </section>
      ) : null}

      {!isStaffOnly && canAccessRoles(user.role, ['supervisor', 'admin', 'auditor']) ? (
        <button
          type="button"
          className="flex w-full items-center gap-4 rounded-2xl border-2 border-sky-200 bg-sky-50 p-5 text-left transition-colors hover:bg-sky-100"
          onClick={() => navigate('/timesheets')}
        >
          <div className="rounded-xl bg-sky-600 p-3 text-white">
            <FileText className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <p className="text-lg font-bold text-slate-900">Prepare for Audit</p>
            <p className="text-slate-600">Export timesheet records (CSV or PDF)</p>
          </div>
          <ChevronRight className="h-6 w-6 text-sky-700" />
        </button>
      ) : null}

      {deniedTile ? (
        <AccessDeniedDialog
          title={deniedTile.title}
          accessLabel={deniedTile.accessLabel}
          demoHint={
            deniedTile.id === 'employees'
              ? 'The employee CPR table lives here. Go back to Welcome and sign in as Supervisor.'
              : undefined
          }
          onSwitchAccount={
            deniedTile.id === 'employees'
              ? () => {
                  clearAuth();
                  navigate('/login', { state: { prefillEmail: 'supervisor@demo.afh' } });
                }
              : undefined
          }
          onClose={() => setDeniedTile(null)}
        />
      ) : null}

      {comingSoonTile ? (
        <ComingSoonDialog
          title={comingSoonTile.title}
          onClose={() => setComingSoonTile(null)}
        />
      ) : null}
    </div>
  );
}

function GlanceCard({
  icon: Icon,
  iconClass,
  value,
  label,
  sub,
}: {
  icon: typeof CheckCircle2;
  iconClass: string;
  value: string;
  label: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <Icon className={`h-6 w-6 ${iconClass}`} />
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <p className="font-semibold text-slate-800">{label}</p>
      <p className="text-sm text-slate-500">{sub}</p>
    </div>
  );
}
