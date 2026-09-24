import React, { useState } from 'react';
import { X, BookmarkPlus, Check, Sparkles, Building2 } from 'lucide-react';
import { PromptVersion, LabStep, SavedPromptTemplate } from '../../types';
import { savePromptToLibrary } from '../../services/businessEvaluationService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lab: LabStep;
  version: PromptVersion;
  currentCohortName?: string;
  onSavedSuccess?: (savedItem: SavedPromptTemplate) => void;
}

export const SavePromptModal: React.FC<Props> = ({
  isOpen,
  onClose,
  lab,
  version,
  currentCohortName = 'Enterprise Review Cohort',
  onSavedSuccess,
}) => {
  const [title, setTitle] = useState<string>(() => {
    return `${lab.title} - Attempt ${version.versionNumber} (Optimized)`;
  });
  const [useCase, setUseCase] = useState<string>(lab.taskGoal);
  const [department, setDepartment] = useState<string>(currentCohortName);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  React.useEffect(() => {
    if (isOpen) {
      setTitle(`${lab.title} - Attempt ${version.versionNumber} (Optimized)`);
      setUseCase(lab.taskGoal);
      setIsSaved(false);
    }
  }, [isOpen, version, lab]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const saved = savePromptToLibrary({
      title: title.trim(),
      businessUseCase: useCase.trim(),
      labId: lab.id,
      promptText: version.promptText,
      systemInstruction: version.systemInstruction,
      techniqueUsed: version.techniqueUsed || `Lesson ${lab.order} Technique`,
      versionNumber: version.versionNumber,
      businessEvaluation: version.businessEvaluation,
      department: department.trim(),
      author: 'Business Specialist',
      isRecommended: true,
      sampleOutputSnippet: version.output.slice(0, 150) + '...',
    });

    setIsSaved(true);
    setTimeout(() => {
      if (onSavedSuccess) onSavedSuccess(saved);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn font-sans">
      <div data-tour="tour-library-demo" className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scaleUp">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
              <BookmarkPlus className="w-4 h-4 text-slate-950" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">Save to Prompt Library (SOP)</h3>
              <p className="text-[11px] text-slate-400">Package proven prompts for team collaboration and reuse</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          {/* Prompt Title */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800 block">
              Prompt Template Name:
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-900"
              placeholder="e.g. Prompt for SME financial statement analysis"
            />
          </div>

          {/* Business Use Case */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800 block">
              Business Use Case:
            </label>
            <input
              type="text"
              value={useCase}
              onChange={(e) => setUseCase(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-700"
              placeholder="Target operational context or purpose..."
            />
          </div>

          {/* Department / Function */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800 block">
              Department / Function:
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-700"
              placeholder="e.g. Risk Management / Operations"
            />
          </div>

          {/* Prompt Preview */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-semibold">Prompt Content (Attempt {version.versionNumber}):</span>
              <span className="font-mono">{version.promptText.length} chars</span>
            </div>
            <pre className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-mono text-[11px] max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {version.promptText}
            </pre>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaved}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition shadow-xs cursor-pointer"
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>Saved Successfully!</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-4 h-4 text-slate-950" />
                  <span>Save to Library</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
