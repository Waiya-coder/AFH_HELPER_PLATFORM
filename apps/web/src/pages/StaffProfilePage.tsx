import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { UserCircle } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

export function StaffProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user)!;
  const updateUser = useAuthStore((state) => state.updateUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    cprIssueDate: '',
    cprExpirationDate: '',
  });

  useEffect(() => {
    if (user.profileComplete === true) {
      navigate('/my-shift', { replace: true });
    }
  }, [navigate, user.profileComplete]);

  const profileMutation = useMutation({
    mutationFn: () => api.completeStaffProfile(form),
    onSuccess: () => {
      updateUser({ profileComplete: true });
      navigate('/my-shift');
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 401) {
        clearAuth();
        navigate('/login', {
          replace: true,
          state: { message: 'Your session expired. Please sign in again.' },
        });
        return;
      }

      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Unable to save your profile. Please try again.');
      }
    },
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <section className="card text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
          <UserCircle className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Set up your profile</h2>
        <p className="mt-2 text-slate-600">
          One quick step before you can check in. Add your name and CPR training dates.
        </p>
        <p className="mt-2 text-sm text-slate-500">Signed in as {user.email}</p>
      </section>

      <section className="card">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            profileMutation.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              className="input"
              placeholder="First name"
              value={form.firstName}
              onChange={(event) => setForm({ ...form, firstName: event.target.value })}
              required
            />
            <input
              className="input"
              placeholder="Last name"
              value={form.lastName}
              onChange={(event) => setForm({ ...form, lastName: event.target.value })}
              required
            />
          </div>

          <div>
            <label htmlFor="cprStart" className="mb-2 block text-sm font-medium text-slate-700">
              CPR training start date
            </label>
            <input
              id="cprStart"
              type="date"
              className="input"
              value={form.cprIssueDate}
              onChange={(event) => setForm({ ...form, cprIssueDate: event.target.value })}
              required
            />
          </div>

          <div>
            <label htmlFor="cprEnd" className="mb-2 block text-sm font-medium text-slate-700">
              CPR training expiration date
            </label>
            <input
              id="cprEnd"
              type="date"
              className="input"
              value={form.cprExpirationDate}
              onChange={(event) => setForm({ ...form, cprExpirationDate: event.target.value })}
              required
            />
          </div>

          {error ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="btn-primary w-full" disabled={profileMutation.isPending}>
            {profileMutation.isPending ? 'Saving...' : 'Save profile & check in'}
          </button>
        </form>
      </section>
    </div>
  );
}
