"use client";

import { useEffect } from "react";

export default function ApplicationError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Learning tracker page failed to load.", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-xl rounded-xl border border-rose-200 bg-white p-6 sm:mt-12">
      <p className="text-sm font-semibold text-rose-700">Unable to load this page</p>
      <h1 className="mt-2 text-xl font-semibold text-slate-900">Your saved data was not changed</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        The application could not read or validate its stored data. Check the server logs and JSON backup before taking recovery action.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 min-h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      >
        Try again
      </button>
    </main>
  );
}
