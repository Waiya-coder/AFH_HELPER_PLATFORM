import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { HeartHandshake } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

export function StaffJoinPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    joinCode: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    cprIssueDate: '',
    cprExpirationDate: '',
  });

  const joinMutation = useMutation({
    mutationFn: () => {
      if (form.password !== form.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      return api.registerStaff({
        joinCode: form.joinCode,
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        cprIssueDate: form.cprIssueDate,
        cprExpirationDate: form.cprExpirationDate,
      });
    },
    onSuccess: (data) => {
      setAuth(data.accessToken, data.refreshToken, data.user);
      navigate('/my-shift');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to create your profile. Please try again.');
      }
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="card w-full max-w-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <HeartHandshake className="h-7 w-7" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">AFH Helper</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Create your staff profile</h1>
          <p className="mt-2 text-slate-600">
            Enter your facility code, name, and CPR training dates. After this one-time setup,
            you&apos;ll just check in when you arrive.
          </p>
        </div>

        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            joinMutation.mutate();
          }}
        >
          <div>
            <label htmlFor="joinCode" className="mb-2 block text-sm font-medium text-slate-700">
              Facility code *
            </label>
            <input
              id="joinCode"
              className="input uppercase"
              placeholder="Ask your supervisor for this code"
              value={form.joinCode}
              onChange={(event) => setForm({ ...form, joinCode: event.target.value.toUpperCase() })}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="mb-2 block text-sm font-medium text-slate-700">
                First name *
              </label>
              <input
                id="firstName"
                className="input"
                value={form.firstName}
                onChange={(event) => setForm({ ...form, firstName: event.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="lastName" className="mb-2 block text-sm font-medium text-slate-700">
                Last name *
              </label>
              <input
                id="lastName"
                className="input"
                value={form.lastName}
                onChange={(event) => setForm({ ...form, lastName: event.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
              Email *
            </label>
            <input
              id="email"
              type="email"
              className="input"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
                Password *
              </label>
              <input
                id="password"
                type="password"
                className="input"
                minLength={8}
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                required
              />
            </div>
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Confirm password *
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="input"
                minLength={8}
                value={form.confirmPassword}
                onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
                required
              />
            </div>
          </div>

          <fieldset className="space-y-4 rounded-xl border border-slate-200 p-4">
            <legend className="px-2 text-sm font-semibold text-slate-800">CPR training dates</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="cprIssueDate" className="mb-2 block text-sm font-medium text-slate-700">
                  CPR start date *
                </label>
                <input
                  id="cprIssueDate"
                  type="date"
                  className="input"
                  value={form.cprIssueDate}
                  onChange={(event) => setForm({ ...form, cprIssueDate: event.target.value })}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="cprExpirationDate"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  CPR expiration date *
                </label>
                <input
                  id="cprExpirationDate"
                  type="date"
                  className="input"
                  value={form.cprExpirationDate}
                  onChange={(event) => setForm({ ...form, cprExpirationDate: event.target.value })}
                  required
                />
              </div>
            </div>
          </fieldset>

          {error ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="btn-primary w-full" disabled={joinMutation.isPending}>
            {joinMutation.isPending ? 'Creating profile...' : 'Create profile & continue'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-sky-700 hover:text-sky-800">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
