import React, { useState } from 'react';
import { BookOpen, CheckCircle2, ChevronRight, Sparkles, ArrowDown, Check } from 'lucide-react';
import { LabStep, ApiConfig, PromptRun } from '../../types';
import { NotebookCell } from './NotebookCell';

interface Props {
  labs: LabStep[];
  apiConfig: ApiConfig;
  onRecordRun: (run: PromptRun) => void;
  onOpenCompare: (lab: LabStep) => void;
  onActiveContextChange?: (lab: LabStep, prompt: string, runCount: number) => void;
  onOpenTutorial?: () => void;
  initialLabId?: string;
}

export const NotebookView: React.FC<Props> = ({
  labs,
  apiConfig,
  onRecordRun,
  onOpenCompare,
  onActiveContextChange,
  onOpenTutorial,
  initialLabId,
}) => {
  // Bài lab đang được người học tương tác (để AI Coach nhận biết ngữ cảnh chuẩn xác)
  const [activeLabId, setActiveLabId] = useState<string>(initialLabId || labs[0]?.id || 'lab-1');

  React.useEffect(() => {
    if (initialLabId) {
      setActiveLabId(initialLabId);
      const el = document.getElementById(`lab-${initialLabId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [initialLabId]);

  // Lưu trữ câu lệnh hiện tại và số lần chạy của từng bài
  const [promptsByLab, setPromptsByLab] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    labs.forEach((l) => {
      initial[l.id] = l.baselinePrompt;
    });
    return initial;
  });

  const [runCountsByLab, setRunCountsByLab] = useState<Record<string, number>>({});

  const currentActiveLab = labs.find((l) => l.id === activeLabId) || labs[0];
  const currentPrompt = promptsByLab[activeLabId] || currentActiveLab.baselinePrompt;
  const currentRunCount = runCountsByLab[activeLabId] || 0;

  // Cập nhật ngữ cảnh ra ngoài để AI Coach nắm được vị trí
  React.useEffect(() => {
    if (onActiveContextChange) {
      onActiveContextChange(currentActiveLab, currentPrompt, currentRunCount);
    }
  }, [activeLabId, currentPrompt, currentRunCount]);

  // Bản đồ tên kỹ thuật theo lộ trình chuẩn
  const getStageLabel = (order: number) => {
    switch (order) {
      case 1: return 'Zero-shot';
      case 2: return 'Structured Prompt';
      case 3: return 'One-shot';
      case 4: return 'Few-shot';
      case 5: return 'Grounding';
      default: return `Lesson ${order}`;
    }
  };

  const handleScrollToLab = (labId: string) => {
    setActiveLabId(labId);
    const element = document.getElementById(labId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePromptChange = (labId: string, newPrompt: string) => {
    setPromptsByLab((prev) => ({
      ...prev,
      [labId]: newPrompt,
    }));
  };

  const handleRunCompleted = (labId: string, count: number) => {
    setRunCountsByLab((prev) => ({
      ...prev,
      [labId]: count,
    }));
  };

  const completedCount = Object.values(runCountsByLab).filter((c) => c > 0).length;
  const progressPercent = Math.min(100, Math.round(((currentActiveLab.order - 1 + (currentRunCount > 0 ? 1 : 0.4)) / labs.length) * 100));

  return (
    <div className="min-h-screen bg-[#fafafb] text-slate-900 font-sans pb-24">
      {/* 1. CỘT NỘI DUNG CHÍNH Ở GIỮA (RỘNG KHOẢNG 800 - 900PX) */}
      <div className="max-w-[860px] mx-auto px-4 sm:px-6 pt-6 pb-12 space-y-8">
        
        {/* TIÊU ĐỀ VỞ BÀI TẬP (TỐI GIẢN, KHÔNG DÙNG HERO LỚN) */}
        <div className="pt-2 pb-4 border-b border-slate-200/80 space-y-3">
          {/* Progress bar mảnh ở đầu lesson */}
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-2 uppercase tracking-wider">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>Interactive Workbook · Prompt Engineering</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">
                Lesson {currentActiveLab.order} / {labs.length} · Step {currentRunCount > 0 ? '2' : '1'} / 2
              </span>
              {currentRunCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>Completed</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Standardized Business Prompt Engineering Lab
            </h1>
            <span className="text-xs text-slate-500 font-medium">
              Completed {completedCount}/{labs.length} lessons
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Complete each interactive exercise in order below. Each section represents a live prompt challenge with the AI model.
          </p>

          {/* THANH TIẾN TRÌNH HỌC TẬP (LEARNING PROGRESSION) */}
          <div className="pt-2">
            <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {labs.map((lab, index) => {
                const isActive = activeLabId === lab.id;
                const runCount = runCountsByLab[lab.id] || 0;
                const stage = getStageLabel(lab.order);

                return (
                  <React.Fragment key={lab.id}>
                    <button
                      type="button"
                      onClick={() => handleScrollToLab(lab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all text-xs ${
                        isActive
                          ? 'bg-slate-900 text-white font-semibold shadow-xs'
                          : runCount > 0
                          ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-medium'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                      }`}
                      title={lab.title}
                    >
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold bg-slate-200/50 text-inherit">
                        {lab.order}
                      </span>
                      <span>{stage}</span>
                      {runCount > 0 && (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      )}
                    </button>

                    {index < labs.length - 1 && (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </nav>
          </div>
        </div>

        {/* 2. DÒNG CHẢY CÁC BƯỚC HỌC TẬP TUẦN TỰ (WORKBOOK CELLS) */}
        <div className="space-y-12">
          {labs.map((lab, index) => (
            <NotebookCell
              key={lab.id}
              lab={lab}
              apiConfig={apiConfig}
              isActive={activeLabId === lab.id}
              onActivate={() => setActiveLabId(lab.id)}
              onRecordRun={onRecordRun}
              onOpenCompare={onOpenCompare}
              onPromptChange={(newPrompt) => handlePromptChange(lab.id, newPrompt)}
              onRunCompleted={(count) => handleRunCompleted(lab.id, count)}
              onNextStep={
                index < labs.length - 1
                  ? () => handleScrollToLab(labs[index + 1].id)
                  : undefined
              }
              hasNextStep={index < labs.length - 1}
              onOpenTutorial={onOpenTutorial}
            />
          ))}
        </div>

        {/* Chân trang cuốn vở bài tập */}
        <div className="pt-8 border-t border-slate-200 text-center text-xs text-slate-400 space-y-1">
          <p className="font-medium text-slate-600">
            Learning progression: Zero-shot → Structured Prompt → One-shot → Few-shot → Grounding.
          </p>
          <p>
            All attempts and evaluations are logged to the telemetry stream for review.
          </p>
        </div>
      </div>
    </div>
  );
};
