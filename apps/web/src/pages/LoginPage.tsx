import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import { ChevronLeft, ClipboardList, Clock } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { showDemoLoginDefaults } from '../lib/demoDefaults';
import { useAuthStore } from '../stores/auth.store';

type LoginRole = 'supervisor' | 'staff';

const ROLE_OPTIONS: Array<{
  id: LoginRole;
  title: string;
  hint?: string;
  icon: LucideIcon;
  cardClass: string;
  buttonClass: string;
}> = [
  {
    id: 'supervisor',
    title: 'Supervisor',
    icon: ClipboardList,
    cardClass: 'border-2 border-emerald-300 bg-emerald-50 hover:bg-emerald-100',
    buttonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
  {
    id: 'staff',
    title: 'Caregiver staff',
    hint: 'Check in and log your hours',
    icon: Clock,
    cardClass: 'border-2 border-sky-300 bg-sky-50 hover:bg-sky-100',
    buttonClass: 'bg-sky-600 hover:bg-sky-700 text-white',
  },
];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);
  const prefillEmail = (location.state as { prefillEmail?: string } | null)?.prefillEmail;
  const [selectedRole, setSelectedRole] = useState<LoginRole | null>(null);
  const [supervisorEmail, setSupervisorEmail] = useState(
    () => prefillEmail ?? (showDemoLoginDefaults ? 'supervisor@demo.afh' : ''),
  );
  const [password, setPassword] = useState(showDemoLoginDefaults ? 'password123' : '');
  const [firstName, setFirstName] = useState(showDemoLoginDefaults ? 'Jordan' : '');
  const [lastName, setLastName] = useState(showDemoLoginDefaults ? 'Caregiver' : '');
  const [facilityCode, setFacilityCode] = useState(showDemoLoginDefaults ? 'SUNR01' : '');
  const [error, setError] = useState<string | null>(
    (location.state as { message?: string } | null)?.message ?? null,
  );

  const activeRole = ROLE_OPTIONS.find((option) => option.id === selectedRole);

  const supervisorLoginMutation = useMutation({
    mutationFn: () => api.login(supervisorEmail, password),
    onSuccess: (data) => {
      setAuth(data.accessToken, data.refreshToken, data.user);
      navigate('/home');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Unable to sign in. Please try again.');
      }
    },
  });

  const staffLoginMutation = useMutation({
    mutationFn: () =>
      api.employeeLogin({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        facilityCode: facilityCode.trim(),
        password,
      }),
    onSuccess: (data) => {
      setAuth(data.accessToken, data.refreshToken, data.user);
      navigate('/my-shift', { replace: true });
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Unable to sign in. Please try again.');
      }
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <div className="card w-full max-w-lg">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            AFH Helper
          </p>
          <p className="mt-1 text-sm text-slate-500">For adult foster homes</p>
          <h1 className="mt-4 text-3xl font-bold text-slate-900">Welcome</h1>
          {!selectedRole ? (
            <p className="mt-2 text-lg text-slate-600">Who is signing in?</p>
          ) : (
            <p className="mt-2 text-lg text-slate-600">Enter your details to continue</p>
          )}
        </div>

        {!selectedRole ? (
          <div className="space-y-3">
            {ROLE_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`flex w-full items-center gap-4 rounded-2xl p-5 transition-transform active:scale-[0.99] ${option.cardClass}`}
                  onClick={() => {
                    setSelectedRole(option.id);
                    setError(null);
                  }}
                >
                  <div
                    className={`rounded-2xl p-3 ${
                      option.id === 'supervisor'
                        ? 'bg-emerald-200 text-emerald-800'
                        : 'bg-sky-200 text-sky-800'
                    }`}
                  >
                    <Icon className="h-8 w-8" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-2xl font-bold text-slate-900">{option.title}</p>
                    {option.hint ? (
                      <p className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-600">
                        <Clock className="h-4 w-4 shrink-0 text-sky-700" aria-hidden />
                        {option.hint}
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        ) : selectedRole === 'supervisor' ? (
          <div className="space-y-5">
            <p className="text-center text-xl font-bold text-slate-900">Supervisor</p>

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                setError(null);
                supervisorLoginMutation.mutate();
              }}
            >
              <div>
                <label htmlFor="supervisorEmail" className="mb-2 block text-base font-semibold text-slate-800">
                  Email
                </label>
                <input
                  id="supervisorEmail"
                  type="email"
                  className="input text-lg"
                  value={supervisorEmail}
                  onChange={(event) => setSupervisorEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-2 block text-base font-semibold text-slate-800">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="input text-lg"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter password"
                  required
                />
              </div>

              {error ? (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                className={`btn w-full text-lg ${activeRole?.buttonClass ?? 'btn-primary'}`}
                disabled={supervisorLoginMutation.isPending}
              >
                {supervisorLoginMutation.isPending ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
              onClick={() => {
                setSelectedRole(null);
                setError(null);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="text-center">
              <p className="text-xl font-bold text-slate-900">Caregiver staff</p>
              <p className="mt-2 flex items-center justify-center gap-2 text-sm text-slate-600">
                <Clock className="h-4 w-4 text-sky-700" aria-hidden />
                You&apos;re signing in to check in and log your hours
              </p>
            </div>

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                setError(null);
                staffLoginMutation.mutate();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="mb-2 block text-sm font-semibold text-slate-800">
                    First name
                  </label>
                  <input
                    id="firstName"
                    className="input"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="mb-2 block text-sm font-semibold text-slate-800">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    className="input"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="facilityCode" className="mb-2 block text-sm font-semibold text-slate-800">
                  Facility code
                </label>
                <input
                  id="facilityCode"
                  className="input uppercase"
                  value={facilityCode}
                  onChange={(event) => setFacilityCode(event.target.value.toUpperCase())}
                  placeholder="From your supervisor"
                  autoComplete="off"
                  required
                />
              </div>
              <div>
                <label htmlFor="staffPassword" className="mb-2 block text-sm font-semibold text-slate-800">
                  Password
                </label>
                <input
                  id="staffPassword"
                  type="password"
                  className="input"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>

              {error ? (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                className="btn w-full text-lg bg-sky-600 text-white hover:bg-sky-700"
                disabled={staffLoginMutation.isPending}
              >
                {staffLoginMutation.isPending ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
              onClick={() => {
                setSelectedRole(null);
                setError(null);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          </div>
        )}

        {!selectedRole ? (
          <p className="mt-8 text-center text-sm text-slate-600">
            New facility?{' '}
            <Link to="/signup" className="font-semibold text-emerald-700 hover:text-emerald-800">
              Register
            </Link>
          </p>
        ) : showDemoLoginDefaults ? (
          <p className="mt-6 text-center text-xs text-slate-500">
            Local demo password: <span className="font-mono font-semibold">password123</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
