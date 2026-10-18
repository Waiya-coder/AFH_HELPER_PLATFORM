import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Heart, Plus, Search } from 'lucide-react';
import type { ClientSummary } from '@afh/shared';
import {
  CLIENT_DOCUMENT_ACCEPT,
  CLIENT_DOCUMENT_MAX_MB,
  isAllowedClientDocument,
} from '@afh/shared';
import { api, ApiError } from '../lib/api';
import { isEmployer } from '../lib/permissions';
import { useAuthStore } from '../stores/auth.store';

export function ClientsPage() {
  const user = useAuthStore((state) => state.user)!;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canManage = isEmployer(user.role);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [careDocument, setCareDocument] = useState<File | null>(null);

  const clientsQuery = useQuery({
    queryKey: ['clients', search],
    queryFn: () => api.listClients(search || undefined),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (careDocument) {
        const check = isAllowedClientDocument(
          careDocument.name,
          careDocument.type,
          careDocument.size,
        );
        if (!check.ok) {
          throw new ApiError(check.message ?? 'Invalid file', 400);
        }
      }

      const data = await api.createClient({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth,
      });

      if (careDocument) {
        await api.uploadClientDocument(data.client.id, careDocument);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowForm(false);
      setFormError(null);
      setCareDocument(null);
      navigate(`/clients/${data.client.id}`);
    },
    onError: (error) => {
      setFormError(error instanceof ApiError ? error.message : 'Unable to create client.');
    },
  });

  const clients = clientsQuery.data?.clients ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-rose-100 p-4 text-rose-700">
            <Heart className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Clients</h2>
            <p className="mt-1 text-slate-600">
              {canManage
                ? 'Create client profiles, care plans, and assign caregivers.'
                : 'Clients assigned to you and their care information.'}
            </p>
          </div>
        </div>

        {canManage ? (
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2 self-start"
            onClick={() => {
              setShowForm((open) => !open);
              setFormError(null);
            }}
          >
            <Plus className="h-5 w-5" />
            {showForm ? 'Cancel' : 'Add client'}
          </button>
        ) : null}
      </div>

      {showForm && canManage ? (
        <section className="card">
          <h3 className="text-lg font-bold text-slate-900">New client</h3>
          <form
            className="mt-4 grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              setFormError(null);
              createMutation.mutate();
            }}
          >
            <div>
              <label htmlFor="clientFirstName" className="mb-2 block text-sm font-semibold text-slate-800">
                First name
              </label>
              <input
                id="clientFirstName"
                className="input"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="clientLastName" className="mb-2 block text-sm font-semibold text-slate-800">
                Last name
              </label>
              <input
                id="clientLastName"
                className="input"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="clientDob" className="mb-2 block text-sm font-semibold text-slate-800">
                Date of birth
              </label>
              <input
                id="clientDob"
                type="date"
                className="input max-w-xs"
                value={dateOfBirth}
                onChange={(event) => setDateOfBirth(event.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="clientCareDoc" className="mb-2 block text-sm font-semibold text-slate-800">
                Care plan or hospital document (optional)
              </label>
              <input
                id="clientCareDoc"
                type="file"
                className="input file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold"
                accept={CLIENT_DOCUMENT_ACCEPT}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setCareDocument(file);
                  setFormError(null);
                }}
              />
              <p className="mt-1 text-xs text-slate-500">
                PDF, Word, PowerPoint, Excel, images, and similar files up to {CLIENT_DOCUMENT_MAX_MB}{' '}
                MB.
              </p>
              {careDocument ? (
                <p className="mt-1 text-sm font-medium text-slate-700">Selected: {careDocument.name}</p>
              ) : null}
            </div>
            {formError ? (
              <p className="sm:col-span-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</p>
            ) : null}
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create and open profile'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-12"
          placeholder="Search clients by name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <section className="card divide-y divide-slate-100 p-0">
        {clientsQuery.isLoading ? (
          <p className="p-6 text-slate-600">Loading clients...</p>
        ) : clients.length === 0 ? (
          <p className="p-6 text-slate-600">
            {canManage ? 'No clients yet. Add a client to get started.' : 'No clients assigned to you yet.'}
          </p>
        ) : (
          clients.map((client) => (
            <Link
              key={client.id}
              to={`/clients/${client.id}`}
              className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
            >
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {client.firstName} {client.lastName}
                </p>
                <p className="text-sm text-slate-600">
                  Age {client.age} · DOB {client.dateOfBirth}
                </p>
                {client.assignedStaff.length > 0 ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Assigned:{' '}
                    {client.assignedStaff.map((s: ClientSummary['assignedStaff'][number]) => `${s.firstName} ${s.lastName}`).join(', ')}
                  </p>
                ) : null}
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
