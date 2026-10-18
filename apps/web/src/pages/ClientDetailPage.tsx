import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, FileUp } from 'lucide-react';
import type { ClientSummary } from '@afh/shared';
import {
  CLIENT_DOCUMENT_ACCEPT,
  CLIENT_DOCUMENT_MAX_MB,
  isAllowedClientDocument,
} from '@afh/shared';
import { api, ApiError } from '../lib/api';
import { isEmployer } from '../lib/permissions';
import { useAuthStore } from '../stores/auth.store';

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user)!;
  const queryClient = useQueryClient();
  const canManage = isEmployer(user.role);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const clientQuery = useQuery({
    queryKey: ['client', id],
    queryFn: () => api.getClient(id!),
    enabled: Boolean(id),
  });

  const staffQuery = useQuery({
    queryKey: ['staff-roster'],
    queryFn: () => api.listStaffRoster(),
    enabled: canManage,
  });

  const client = clientQuery.data?.client;

  const [healthProblems, setHealthProblems] = useState('');
  const [needs, setNeeds] = useState('');
  const [dailyCarePlan, setDailyCarePlan] = useState('');
  const [assignedStaffIds, setAssignedStaffIds] = useState<string[]>([]);

  useEffect(() => {
    if (!client) {
      return;
    }
    setHealthProblems(client.healthProblems ?? '');
    setNeeds(client.needs ?? '');
    setDailyCarePlan(client.dailyCarePlan ?? '');
    setAssignedStaffIds(client.assignedStaff.map((s: ClientSummary['assignedStaff'][number]) => s.id));
  }, [client]);

  const saveMutation = useMutation({
    mutationFn: () =>
      api.updateClient(id!, {
        healthProblems: healthProblems.trim() || null,
        needs: needs.trim() || null,
        dailyCarePlan: dailyCarePlan.trim() || null,
        assignedStaffIds,
      }),
    onSuccess: () => {
      setError(null);
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Unable to save changes.');
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const check = isAllowedClientDocument(file.name, file.type, file.size);
      if (!check.ok) {
        throw new ApiError(check.message ?? 'Invalid file', 400);
      }
      return api.uploadClientDocument(id!, file);
    },
    onSuccess: () => {
      setUploadError(null);
      queryClient.invalidateQueries({ queryKey: ['client', id] });
    },
    onError: (err) => {
      setUploadError(err instanceof ApiError ? err.message : 'Upload failed.');
    },
  });

  if (clientQuery.isLoading || !client) {
    return <p className="text-slate-600">Loading client profile...</p>;
  }

  const roster = staffQuery.data?.roster ?? [];

  return (
    <div className="space-y-6">
      <Link to="/clients" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900">
        <ChevronLeft className="h-4 w-4" />
        All clients
      </Link>

      <header className="card">
        <h2 className="text-2xl font-bold text-slate-900">
          {client.firstName} {client.lastName}
        </h2>
        <p className="mt-1 text-slate-600">
          Age {client.age} · Born {client.dateOfBirth}
        </p>
      </header>

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {saved ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Saved.</p>
      ) : null}

      <section className="card space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Care information</h3>

        <div>
          <label htmlFor="healthProblems" className="mb-2 block text-sm font-semibold text-slate-800">
            Health problems
          </label>
          <textarea
            id="healthProblems"
            className="input min-h-24"
            value={healthProblems}
            onChange={(event) => setHealthProblems(event.target.value)}
            readOnly={!canManage}
          />
        </div>

        <div>
          <label htmlFor="needs" className="mb-2 block text-sm font-semibold text-slate-800">
            Needs
          </label>
          <textarea
            id="needs"
            className="input min-h-24"
            value={needs}
            onChange={(event) => setNeeds(event.target.value)}
            readOnly={!canManage}
          />
        </div>

        <div>
          <label htmlFor="dailyCarePlan" className="mb-2 block text-sm font-semibold text-slate-800">
            Daily care plan
          </label>
          <textarea
            id="dailyCarePlan"
            className="input min-h-32"
            value={dailyCarePlan}
            onChange={(event) => setDailyCarePlan(event.target.value)}
            readOnly={!canManage}
            placeholder="What this client needs each day at the home..."
          />
        </div>

        {canManage ? (
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-800">Assigned employees</p>
            <div className="flex flex-wrap gap-2">
              {roster.map((member) => {
                const checked = assignedStaffIds.includes(member.id);
                return (
                  <label
                    key={member.id}
                    className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium ring-1 ${
                      checked ? 'bg-violet-600 text-white ring-violet-600' : 'bg-white text-slate-700 ring-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => {
                        setAssignedStaffIds((current) =>
                          checked ? current.filter((value) => value !== member.id) : [...current, member.id],
                        );
                      }}
                    />
                    {member.firstName} {member.lastName}
                  </label>
                );
              })}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm font-semibold text-slate-800">Assigned caregivers</p>
            <p className="mt-1 text-slate-600">
              {client.assignedStaff.length > 0
                ? client.assignedStaff
                    .map((s: ClientSummary['assignedStaff'][number]) => `${s.firstName} ${s.lastName}`)
                    .join(', ')
                : 'None listed'}
            </p>
          </div>
        )}

        {canManage ? (
          <button
            type="button"
            className="btn-primary"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save profile'}
          </button>
        ) : null}
      </section>

      <section className="card space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Care documents</h3>
        <p className="text-sm text-slate-600">
          Upload hospital care plans, discharge paperwork, or other files (PDF, Word, PowerPoint, Excel,
          images, up to {CLIENT_DOCUMENT_MAX_MB} MB each).
        </p>

        {uploadError ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {uploadError}
          </p>
        ) : null}

        {canManage ? (
          <label className="btn-secondary inline-flex cursor-pointer items-center gap-2">
            <FileUp className="h-5 w-5" />
            {uploadMutation.isPending ? 'Uploading...' : 'Upload document'}
            <input
              type="file"
              accept={CLIENT_DOCUMENT_ACCEPT}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setUploadError(null);
                  uploadMutation.mutate(file);
                }
                event.target.value = '';
              }}
            />
          </label>
        ) : null}

        {client.documents.length === 0 ? (
          <p className="text-sm text-slate-500">No documents uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {client.documents.map((doc: ClientSummary['documents'][number]) => (
              <li key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">{doc.fileName}</p>
                  <p className="text-xs text-slate-500">
                    {doc.category.replace(/_/g, ' ')} · {new Date(doc.uploadDate).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-sm font-semibold text-sky-700 hover:text-sky-800"
                  onClick={() => api.downloadClientDocument(doc.id, doc.fileName)}
                >
                  Download
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
