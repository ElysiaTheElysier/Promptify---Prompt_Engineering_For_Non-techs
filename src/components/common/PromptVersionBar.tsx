import React from 'react';
import { History, GitCompare, BookmarkPlus, RotateCcw } from 'lucide-react';
import { PromptVersion } from '../../types';

interface Props {
  versions: PromptVersion[];
  selectedVersionNumber: number;
  onSelectVersion: (versionNumber: number) => void;
  onRestorePrompt?: (promptText: string) => void;
  onOpenCompare?: () => void;
  onSaveToLibrary?: (version: PromptVersion) => void;
  currentPromptText?: string;
  className?: string;
}

export const PromptVersionBar: React.FC<Props> = ({
  versions,
  selectedVersionNumber,
  onSelectVersion,
  onRestorePrompt,
  onOpenCompare,
  onSaveToLibrary,
  className = '',
}) => {
  if (versions.length === 0) return null;

  const currentVersion = versions.find(v => v.versionNumber === selectedVersionNumber) || versions[versions.length - 1];
  const isLatest = currentVersion.versionNumber === versions[versions.length - 1].versionNumber;

  return (
    <div className={`p-2 bg-slate-50/90 border border-slate-200/90 rounded-xl flex flex-wrap items-center justify-between gap-2.5 font-sans ${className}`}>
      {/* 1. Left: Attempt Selector & Restore Action */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-slate-500">
          <History className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="text-xs font-semibold text-slate-700 shrink-0">Attempt History:</span>
        </div>

        <select
          value={selectedVersionNumber || versions[versions.length - 1]?.versionNumber}
          onChange={(e) => onSelectVersion(Number(e.target.value))}
          className="bg-white border border-slate-300 hover:border-slate-400 text-slate-800 font-medium py-1 px-2.5 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none cursor-pointer shadow-2xs transition"
          title="Select an attempt to inspect prompt and evaluation"
        >
          {versions.map((ver) => (
            <option key={ver.id || ver.versionNumber} value={ver.versionNumber}>
              Attempt {ver.versionNumber} {ver.versionNumber === versions.length ? '(Latest)' : ''} {ver.aiEvaluation ? `• ${ver.aiEvaluation.total}/10 pts` : ''} {ver.timestamp ? `(${ver.timestamp})` : ''}
            </option>
          ))}
        </select>

        <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">
          ({versions.length} attempt{versions.length > 1 ? 's' : ''})
        </span>

        {/* Restore button when an older version is selected */}
        {!isLatest && onRestorePrompt && (
          <button
            type="button"
            onClick={() => onRestorePrompt(currentVersion.promptText)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium text-xs transition shadow-2xs cursor-pointer active:scale-95"
            title="Load this prompt version into the composer to iterate further"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>Restore this version</span>
          </button>
        )}
      </div>

      {/* 2. Right: Compare & Save Actions */}
      <div className="flex items-center gap-2">
        {/* A/B Compare (visible when >= 2 attempts exist) */}
        {versions.length >= 2 && onOpenCompare && (
          <button
            type="button"
            onClick={onOpenCompare}
            data-tour="tour-compare"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold text-xs transition shadow-2xs cursor-pointer active:scale-95"
            title="Open side-by-side comparison to observe prompt diffs and metric gains"
          >
            <GitCompare className="w-3.5 h-3.5 text-emerald-600" />
            <span>Compare Attempts</span>
          </button>
        )}

        {/* Save to Prompt Library */}
        {onSaveToLibrary && (
          <button
            type="button"
            onClick={() => onSaveToLibrary(currentVersion)}
            data-tour="tour-library"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 font-medium text-xs transition shadow-2xs cursor-pointer active:scale-95"
            title="Save this prompt to the SOP Library for team reuse"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-amber-600" />
            <span>Save to Library</span>
          </button>
        )}
      </div>
    </div>
  );
};
