import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ChevronLeft, Clock } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { showDemoLoginDefaults } from '../lib/demoDefaults';
import { useAuthStore } from '../stores/auth.store';

export function StaffLoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [firstName, setFirstName] = useState(showDemoLoginDefaults ? 'Jordan' : '');
  const [lastName, setLastName] = useState(showDemoLoginDefaults ? 'Caregiver' : '');
  const [facilityCode, setFacilityCode] = useState(showDemoLoginDefaults ? 'SUNR01' : '');
  const [password, setPassword] = useState(showDemoLoginDefaults ? 'password123' : '');
  const [error, setError] = useState<string | null>(null);

  const loginMutation = useMutation({
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
      <div className="card w-full max-w-md">
        <Link
          to="/login"
          className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <Clock className="h-9 w-9" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Caregiver staff sign in</h1>
          <p className="mt-2 flex items-center justify-center gap-2 text-base text-slate-600">
            <Clock className="h-4 w-4 text-sky-700" aria-hidden />
            Check in and log your hours
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Your supervisor must add you to the roster first
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            loginMutation.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="mb-2 block text-base font-semibold text-slate-800">
                First name
              </label>
              <input
                id="firstName"
                type="text"
                className="input text-lg"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
                required
              />
            </div>
            <div>
              <label htmlFor="lastName" className="mb-2 block text-base font-semibold text-slate-800">
                Last name
              </label>
              <input
                id="lastName"
                type="text"
                className="input text-lg"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="facilityCode" className="mb-2 block text-base font-semibold text-slate-800">
              Facility code
            </label>
            <input
              id="facilityCode"
              type="text"
              className="input text-lg uppercase"
              value={facilityCode}
              onChange={(event) => setFacilityCode(event.target.value.toUpperCase())}
              autoComplete="off"
              placeholder="From your supervisor"
              required
            />
          </div>

          <div>
            <label htmlFor="employeePassword" className="mb-2 block text-base font-semibold text-slate-800">
              Password
            </label>
            <input
              id="employeePassword"
              type="password"
              className="input text-lg"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Set by your supervisor"
              required
            />
          </div>

          {error ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="btn-primary w-full text-lg" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Not on the roster yet? Ask your supervisor to add you under My Employees.
        </p>

        <p className="mt-4 text-center text-xs text-slate-500">
          Demo: Jordan Caregiver · SUNR01 · password123
        </p>
      </div>
    </div>
  );
}
