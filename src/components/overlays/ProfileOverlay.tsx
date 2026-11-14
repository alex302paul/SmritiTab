import { Check, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSmriti } from "../../context/SmritiContext";
import { getInitials } from "../../services/browserApi";

export function ProfileOverlay() {
  const { profile, updateProfile, closeOverlay } = useSmriti();
  const [draft, setDraft] = useState(profile);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  const dirty =
    draft.name !== profile.name ||
    draft.tagline !== profile.tagline ||
    draft.email !== profile.email;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name: draft.name.trim() || "Guest",
      tagline: draft.tagline.trim(),
      email: draft.email.trim(),
    });
    setSavedToast(true);
    window.setTimeout(() => setSavedToast(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Profile"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeOverlay();
      }}
      className="animate-smriti-fade fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-md sm:p-6"
    >
      <div className="smriti-glass-adaptive animate-smriti-scale w-full max-w-md overflow-hidden rounded-3xl">
        <header className="flex items-center gap-3 border-b border-slate-900/10 px-6 py-4 dark:border-white/10">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-white">
            <User className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
              Profile
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Stored locally on this device
            </p>
          </div>
          <button
            type="button"
            onClick={closeOverlay}
            aria-label="Close Profile"
            className="grid h-8 w-8 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-900/8 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form onSubmit={handleSave} className="space-y-5 p-6">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-orange-500 text-xl font-semibold text-white shadow-lg shadow-indigo-500/20">
              {getInitials(draft.name || "Guest")}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-slate-900 dark:text-white">
                {draft.name || "Guest"}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {draft.tagline || "Add a personal tagline below."}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="smriti-profile-name"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Name
            </label>
            <input
              id="smriti-profile-name"
              type="text"
              value={draft.name}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              placeholder="Your name"
              maxLength={60}
              className="w-full rounded-xl border border-slate-900/10 bg-white/80 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-slate-900/60 dark:text-white"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Used for your personal greeting in focus mode.
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="smriti-profile-tagline"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Tagline
            </label>
            <input
              id="smriti-profile-tagline"
              type="text"
              value={draft.tagline}
              onChange={(e) => setDraft((p) => ({ ...p, tagline: e.target.value }))}
              placeholder="Make space for what matters."
              maxLength={160}
              className="w-full rounded-xl border border-slate-900/10 bg-white/80 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-slate-900/60 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="smriti-profile-email"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Email <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="smriti-profile-email"
              type="email"
              value={draft.email}
              onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))}
              placeholder="you@example.com"
              maxLength={120}
              className="w-full rounded-xl border border-slate-900/10 bg-white/80 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-slate-900/60 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            {savedToast ? (
              <span role="status" className="text-xs font-medium text-emerald-500">
                Profile saved.
              </span>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={!dirty}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-40"
            >
              <Check className="h-3.5 w-3.5" />
              Save profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
