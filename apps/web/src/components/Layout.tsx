import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, HelpCircle, Home, LogOut } from 'lucide-react';
import type { Role } from '@afh/shared';
import { canAccessRoute, roleLabel } from '../lib/permissions';
import { useAuthStore } from '../stores/auth.store';

const PAGE_TITLES: Record<string, string> = {
  '/home': 'Home',
  '/my-profile': 'My Profile',
  '/my-shift': 'Staff Hours',
  '/schedule': 'Schedule',
  '/staff': 'My Employees',
  '/clients': 'Clients',
  '/timesheets': 'Employee Hours',
  '/training': 'Training & Credentials',
  '/audit-checklist': 'Audit Checklist',
  '/audit-logs': 'Activity Log',
};

export function ProtectedLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isHome =
    location.pathname === '/home' || (user.role === 'staff' && location.pathname === '/my-shift');

  if (!canAccessRoute(user.role as Role, location.pathname)) {
    const fallback = user.role === 'staff' ? '/my-shift' : '/home';
    return <Navigate to={fallback} replace state={{ accessDenied: location.pathname }} />;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            {!isHome ? (
              <button
                type="button"
                onClick={() => navigate(user.role === 'staff' ? '/my-shift' : '/home')}
                className="rounded-xl p-2 text-slate-600 hover:bg-slate-100"
                aria-label={user.role === 'staff' ? 'Back to check-in' : 'Back to home'}
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
            ) : null}

            <Link to={user.role === 'staff' ? '/my-shift' : '/home'} className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-600 text-lg font-bold text-white">
                AFH
              </div>
              <div>
                <p className="text-lg font-bold leading-tight text-sky-800">AFH Helper</p>
                <p className="hidden text-xs text-slate-500 sm:block">Adult foster home care</p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="hidden rounded-xl p-2 text-slate-500 hover:bg-slate-100 sm:block"
              aria-label="Help"
            >
              <HelpCircle className="h-6 w-6" />
            </button>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-900">{user.email}</p>
              <p className="text-xs text-slate-500">{roleLabel(user.role as Role)}</p>
            </div>
            <button
              type="button"
              onClick={clearAuth}
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Log out"
            >
              <LogOut className="h-6 w-6" />
            </button>
          </div>
        </div>

        {!isHome && PAGE_TITLES[location.pathname] ? (
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-2">
            <p className="mx-auto max-w-5xl text-sm font-medium text-slate-600">
              {PAGE_TITLES[location.pathname]}
            </p>
          </div>
        ) : null}
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>

      {/* Mobile home shortcut */}
      {!isHome ? (
        <button
          type="button"
          onClick={() => navigate(user.role === 'staff' ? '/my-shift' : '/home')}
          className="fixed bottom-4 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg hover:bg-sky-700 sm:hidden"
          aria-label={user.role === 'staff' ? 'Go to check-in' : 'Go to home'}
        >
          <Home className="h-6 w-6" />
        </button>
      ) : null}

      <footer className="mx-auto max-w-5xl px-4 pb-8 pt-4 text-center text-xs text-slate-500">
        Your data is secure and private. Need help? Contact your administrator.
      </footer>
    </div>
  );
}
