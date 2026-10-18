import { Sparkles, X } from 'lucide-react';

interface ComingSoonDialogProps {
  title: string;
  onClose: () => void;
}

export function ComingSoonDialog({ title, onClose }: ComingSoonDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
      <div className="card w-full max-w-md" role="dialog" aria-modal="true">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <Sparkles className="h-6 w-6" />
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

        <h3 className="mt-4 text-xl font-bold text-slate-900">{title}</h3>
        <p className="mt-2 text-base text-slate-600">
          We&apos;re building this next. For now, use the other tools on your home screen.
        </p>

        <button type="button" className="btn-primary mt-6 w-full" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}
