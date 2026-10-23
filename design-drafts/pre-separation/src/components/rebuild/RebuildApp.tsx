import React from 'react';
import ReviewScreen from './ReviewScreen';
import manifest from './review-manifest.json';
import { PromptifyMark } from '../common/PromptifyMark';
import './review.css';

export default function RebuildApp() {
  if (new URLSearchParams(location.search).get('view') !== 'inventory') return <ReviewScreen />;
  return <div className="min-h-[100dvh] bg-slate-50 text-slate-900">
    <header className="flex items-center gap-4 border-b bg-white px-6 py-5">
      <PromptifyMark className="h-10 w-10" />
      <div><h1 className="text-xl font-bold">Promptify · 16 UI from the Word review</h1>
        <p className="text-sm text-slate-600">Final version of each screen, including all later code updates.</p></div>
      <a className="ml-auto text-emerald-700" href="/">Live app</a>
    </header>
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        This rebuild is a UI review with the document's demo data. Authentication, model execution,
        uploads, roster synchronization, credentials and analytics are simulated here.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {manifest.screens.map(screen => <a key={screen.ui_id}
          href={'/rebuild?ui=' + screen.ui_id.slice(3)}
          className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-emerald-600 focus-visible:outline-emerald-600">
          <span className="font-mono text-sm text-emerald-700">{screen.ui_id}</span>
          <h2 className="mt-2 font-semibold">{screen.title.replace(/^Promptify(?: Intrepid)? - /, '')}</h2>
          <p className="mt-3 text-xs text-slate-500">Word line {screen.document_line} · final source block {screen.selected_block + 1}</p>
        </a>)}
      </div>
    </main>
  </div>;
}
