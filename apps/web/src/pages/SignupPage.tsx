import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import { useState } from 'react';

export function SignupPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    facilityName: '',
    facilityAddress: '',
    facilityContactInfo: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    password: '',
    confirmPassword: '',
  });

  const signupMutation = useMutation({
    mutationFn: () => {
      if (form.password !== form.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      return api.register({
        facilityName: form.facilityName,
        facilityAddress: form.facilityAddress || undefined,
        facilityContactInfo: form.facilityContactInfo || undefined,
        adminFirstName: form.adminFirstName,
        adminLastName: form.adminLastName,
        adminEmail: form.adminEmail,
        password: form.password,
      });
    },
    onSuccess: (data) => {
      setAuth(data.accessToken, data.refreshToken, data.user);
      navigate('/home');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to create account. Please try again.');
      }
    },
  });

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="card w-full max-w-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Building2 className="h-7 w-7" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            AFH Helper
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Register your facility</h1>
          <p className="mt-2 text-slate-600">
            Create your home&apos;s account. You&apos;ll sign in as <strong>Supervisor</strong> with
            your email, add employees yourself, and share each employee&apos;s login details with
            your team.
          </p>
        </div>

        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            signupMutation.mutate();
          }}
        >
          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold text-slate-900">Facility details</legend>

            <div>
              <label htmlFor="facilityName" className="mb-2 block text-sm font-medium text-slate-700">
                Facility name *
              </label>
              <input
                id="facilityName"
                className="input"
                value={form.facilityName}
                onChange={(event) => updateField('facilityName', event.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="facilityAddress" className="mb-2 block text-sm font-medium text-slate-700">
                Address
              </label>
              <input
                id="facilityAddress"
                className="input"
                value={form.facilityAddress}
                onChange={(event) => updateField('facilityAddress', event.target.value)}
              />
            </div>

            <div>
              <label htmlFor="facilityContactInfo" className="mb-2 block text-sm font-medium text-slate-700">
                Contact phone or email
              </label>
              <input
                id="facilityContactInfo"
                className="input"
                value={form.facilityContactInfo}
                onChange={(event) => updateField('facilityContactInfo', event.target.value)}
              />
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold text-slate-900">Supervisor sign-in</legend>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="adminFirstName" className="mb-2 block text-sm font-medium text-slate-700">
                  First name *
                </label>
                <input
                  id="adminFirstName"
                  className="input"
                  value={form.adminFirstName}
                  onChange={(event) => updateField('adminFirstName', event.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="adminLastName" className="mb-2 block text-sm font-medium text-slate-700">
                  Last name *
                </label>
                <input
                  id="adminLastName"
                  className="input"
                  value={form.adminLastName}
                  onChange={(event) => updateField('adminLastName', event.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="adminEmail" className="mb-2 block text-sm font-medium text-slate-700">
                Email *
              </label>
              <input
                id="adminEmail"
                type="email"
                className="input"
                value={form.adminEmail}
                onChange={(event) => updateField('adminEmail', event.target.value)}
                autoComplete="email"
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
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-slate-700">
                  Confirm password *
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="input"
                  value={form.confirmPassword}
                  onChange={(event) => updateField('confirmPassword', event.target.value)}
                  minLength={8}
                  autoComplete="new-password"
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

          <button type="submit" className="btn-primary w-full" disabled={signupMutation.isPending}>
            {signupMutation.isPending ? 'Creating account...' : 'Create facility account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-emerald-700 hover:text-emerald-800">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
