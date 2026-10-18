import { Lock, X } from 'lucide-react';

interface AccessDeniedDialogProps {
  title: string;
  accessLabel: string;
  demoHint?: string;
  onClose: () => void;
  onSwitchAccount?: () => void;
}

export function AccessDeniedDialog({
  title,
  accessLabel,
  demoHint,
  onClose,
  onSwitchAccount,
}: AccessDeniedDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
      <div
        className="card w-full max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="access-denied-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Lock className="h-6 w-6" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <h3 id="access-denied-title" className="mt-4 text-xl font-bold text-slate-900">
          {title} is restricted
        </h3>
        <p className="mt-2 text-base text-slate-600">
          This option is only available to <strong>{accessLabel}</strong>. If you need access,
          please ask your facility administrator.
        </p>

        {demoHint ? (
          <p className="mt-4 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-900">{demoHint}</p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3">
          {onSwitchAccount ? (
            <button type="button" className="btn-primary w-full" onClick={onSwitchAccount}>
              Switch to Employer sign-in
            </button>
          ) : null}
          <button type="button" className="btn-secondary w-full" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
