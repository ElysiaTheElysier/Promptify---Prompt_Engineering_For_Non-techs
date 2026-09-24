import React, { useState } from 'react';
import { 
  Play, 
  Sliders, 
  Sparkles, 
  Copy, 
  Check, 
  GitCompare, 
  FileText, 
  Layers, 
  ChevronDown,
  ChevronUp,
  Award,
  Zap,
  Compass
} from 'lucide-react';
import { LabStep, ApiConfig, PromptRun } from '../../types';
import { executePromptStream, evaluatePromptRubric } from '../../services/llmService';
import { RubricScorecard } from '../common/RubricScorecard';
import { LearningBadges } from '../common/LearningBadges';
import { MiniChallengeCard } from '../common/MiniChallengeCard';
import { MarkdownView } from '../common/MarkdownView';

interface Props {
  labs: LabStep[];
  apiConfig: ApiConfig;
  onRecordRun: (run: PromptRun) => void;
  onOpenCompare: (lab: LabStep) => void;
  onActiveContextChange?: (lab: LabStep, prompt: string, runCount: number) => void;
  onOpenTutorial?: () => void;
  initialPrompt?: string;
}

export const PlaygroundView: React.FC<Props> = ({
  labs,
  apiConfig,
  onRecordRun,
  onOpenCompare,
  onActiveContextChange,
  onOpenTutorial,
  initialPrompt,
}) => {
  const [selectedLabId, setSelectedLabId] = useState<string>(labs[0].id);
  const currentLab = labs.find((l) => l.id === selectedLabId) || labs[0];

  // Đếm số lần chạy theo từng bài lab
  const [runCountsByLab, setRunCountsByLab] = useState<Record<string, number>>({});
  const currentLabRunCount = runCountsByLab[currentLab.id] || 0;

  const [systemPrompt, setSystemPrompt] = useState<string>(currentLab.systemInstruction || 'You are a professional enterprise AI assistant.');
  const [userPrompt, setUserPrompt] = useState<string>(initialPrompt || currentLab.baselinePrompt);

  React.useEffect(() => {
    if (initialPrompt) {
      setUserPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  // Cập nhật ngữ cảnh cho AI Coach
  React.useEffect(() => {
    if (onActiveContextChange) {
      onActiveContextChange(currentLab, userPrompt, currentLabRunCount);
    }
  }, [currentLab.id, userPrompt, currentLabRunCount]);
  const [output, setOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isDataCopied, setIsDataCopied] = useState<boolean>(false);
  const [showFullProblem, setShowFullProblem] = useState<boolean>(true);
  const [showSystemBox, setShowSystemBox] = useState<boolean>(true);
  const [temperature, setTemperature] = useState<number>(apiConfig.temperature ?? 0.3);
  const [scoreResult, setScoreResult] = useState<ReturnType<typeof evaluatePromptRubric> | null>(null);
  const [metrics, setMetrics] = useState<{ tokens: number; latency: number; mode: string } | null>(null);

  // Khi chuyển bài, tự động nạp prompt ban đầu của bài đó
  const handleSelectLab = (labId: string) => {
    setSelectedLabId(labId);
    const lab = labs.find((l) => l.id === labId) || labs[0];
    setUserPrompt(lab.baselinePrompt);
    setSystemPrompt(lab.systemInstruction || 'You are a professional enterprise AI assistant.');
    setOutput('');
    setMetrics(null);
    setScoreResult(null);
  };

  const rubricAudit = evaluatePromptRubric(userPrompt);

  const handleRun = async () => {
    setIsRunning(true);
    setOutput('');

    // Tăng số lượt chạy của bài lab hiện tại
    setRunCountsByLab(prev => ({
      ...prev,
      [currentLab.id]: (prev[currentLab.id] || 0) + 1
    }));

    // Đánh giá và chấm điểm prompt ngay khi chạy
    const evaluatedScore = evaluatePromptRubric(userPrompt);
    setScoreResult(evaluatedScore);

    try {
      const result = await executePromptStream(
        userPrompt,
        systemPrompt,
        currentLab,
        { ...apiConfig, temperature },
        (chunk) => {
          setOutput(chunk);
        }
      );

      setMetrics({
        tokens: result.tokenCount,
        latency: result.latencyMs,
        mode: result.mode
      });

      onRecordRun({
        id: `run-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('vi-VN'),
        labId: currentLab.id,
        promptText: userPrompt,
        systemInstruction: systemPrompt,
        output: result.output,
        tokenCount: result.tokenCount,
        latencyMs: result.latencyMs,
        mode: result.mode,
        versionTag: userPrompt.length > 250 ? 'improved' : 'baseline'
      });
    } catch (err) {
      console.error(err);
      setOutput('An error occurred while executing prompt.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyOutput = () => {
    navigator.clipboard.writeText(output);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  const handleCopySampleData = () => {
    if (currentLab.sampleInputContext) {
      navigator.clipboard.writeText(currentLab.sampleInputContext);
      setIsDataCopied(true);
      setTimeout(() => setIsDataCopied(false), 1500);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      {/* 1. THANH CHỌN BÀI THỰC HÀNH NGANG */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-full">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 px-2 flex-shrink-0 flex items-center gap-1">
            <Layers className="w-4 h-4 text-slate-400" /> Select Practice Lesson:
          </span>
          {labs.map((lab) => (
            <button
              key={lab.id}
              onClick={() => handleSelectLab(lab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedLabId === lab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Lesson {lab.order}: {lab.badge}
            </button>
          ))}
        </div>
      </div>

      {/* 2. KHUNG ĐỀ BÀI ĐẦY ĐỦ (KHÔNG BỊ MẤT ĐẦU BÀI THEO YÊU CẦU CỦA USER) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all" data-tour="tour-scenario">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
              0{currentLab.order}
            </div>
            <div>
              <h3 className="font-bold text-sm md:text-base text-white">{currentLab.title}</h3>
              <p className="text-xs text-slate-400">{currentLab.focusSkill}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenTutorial && (
              <button
                onClick={onOpenTutorial}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition flex items-center gap-1.5"
                title="Review guided tutorial walkthrough"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tutorial</span>
              </button>
            )}
            <button
              onClick={() => setUserPrompt(currentLab.baselinePrompt)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              Load Baseline Prompt
            </button>
            <button
              onClick={() => setUserPrompt(currentLab.improvedPrompt)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
            >
              Load Standard Prompt
            </button>
            <button
              onClick={() => setShowFullProblem(!showFullProblem)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs flex items-center gap-1 pl-2 border-l border-slate-700"
            >
              {showFullProblem ? 'Collapse Brief' : 'View Full Brief'}
              {showFullProblem ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Nội dung đề bài chi tiết */}
        {showFullProblem && (
          <div className="p-5 bg-slate-50 border-t border-slate-200 space-y-3 text-xs md:text-sm">
            <div className="space-y-1">
              <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <FileText className="w-4 h-4 text-emerald-600" /> Business Scenario (Brief):
              </span>
              <div className="text-slate-700 leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                <MarkdownView content={currentLab.scenario} />
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 text-xs font-medium">
              <div className="font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                <span>🎯 Core Objectives:</span>
              </div>
              <MarkdownView content={currentLab.taskGoal} />
            </div>

            {/* Dữ liệu mẫu nếu có */}
            {currentLab.sampleInputContext && (
              <div 
                data-tour="tour-data"
                className="space-y-1.5 pt-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-600 uppercase tracking-wider">
                    Attached Sample Dataset:
                  </span>
                  <button
                    onClick={handleCopySampleData}
                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                  >
                    {isDataCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {isDataCopied ? 'Copied Data' : 'Copy Sample Data'}
                  </button>
                </div>
                <pre className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-mono text-slate-800 whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {currentLab.sampleInputContext}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. PHÒNG THỰC NGHIỆM 2 CỘT (DUAL PLAYGROUND) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        {/* CỘT TRÁI: CẤU HÌNH & SOẠN PROMPT (6 CỘT) */}
        <div className="lg:col-span-6 flex flex-col space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col space-y-4">
            {/* Chỉ dẫn hệ thống */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                  System Instructions & Expert Role
                </label>
                <button
                  onClick={() => setShowSystemBox(!showSystemBox)}
                  className="text-[11px] text-slate-500 hover:text-slate-800"
                >
                  {showSystemBox ? 'Collapse' : 'Expand'}
                </button>
              </div>
              {showSystemBox && (
                <textarea
                  rows={2}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Define expert role for the AI..."
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/70 text-slate-900"
                />
              )}
            </div>

            {/* Ô soạn Prompt */}
            <div className="flex-1 flex flex-col space-y-1.5" data-tour="tour-prompt">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  User Prompt
                </label>
                <span className="text-[11px] font-mono text-slate-400">
                  {userPrompt.length} ký tự • ~{Math.round(userPrompt.length / 4)} tokens
                </span>
              </div>
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Enter your prompt here..."
                className="w-full flex-1 min-h-[220px] p-3.5 text-xs md:text-sm font-mono text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed shadow-inner"
              />

              {/* Huy hiệu hành vi prompt */}
              <LearningBadges promptText={userPrompt} runCount={currentLabRunCount} />
            </div>

            {/* Thanh chỉnh độ sáng tạo */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Creativity (Temperature)</span>
                <span className="font-mono font-bold text-indigo-600">{temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0.0 (Precise / Analytical)</span>
                <span>1.0 (Creative writing)</span>
              </div>
            </div>

            {/* Nút Thực thi */}
            <button
              onClick={handleRun}
              disabled={isRunning || !userPrompt.trim()}
              data-tour="tour-run"
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-xs md:text-sm shadow-md transition flex items-center justify-center gap-2 hover:shadow-lg"
            >
              <Play className={`w-4 h-4 ${isRunning ? 'animate-spin' : 'fill-white'}`} />
              {isRunning ? 'Evaluating prompt...' : '▶ Run Prompt & Evaluate'}
            </button>
          </div>

          {/* Bảng chấm điểm thu gọn */}
          <RubricScorecard audit={rubricAudit} compact={true} />
        </div>

        {/* CỘT PHẢI: KẾT QUẢ TỪ AI & CHẤM ĐIỂM (6 CỘT) */}
        <div className="lg:col-span-6 flex flex-col space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col space-y-3" data-tour="tour-output">
            {/* Header kết quả */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Model Output
                </span>
                {isRunning && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                    Streaming response...
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {metrics && (
                  <span className="text-[11px] font-mono text-slate-500">
                    {metrics.tokens} tokens • {metrics.latency} ms
                  </span>
                )}
                {output && (
                  <button
                    onClick={handleCopyOutput}
                    className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {isCopied ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
            </div>

            {/* Điểm số trực tiếp sau khi chạy */}
            {scoreResult && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-xs flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-700">Quality Score:</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-xs border ${
                    scoreResult.totalScore >= 80 
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                      : scoreResult.totalScore >= 50 
                      ? 'bg-amber-100 text-amber-800 border-amber-300' 
                      : 'bg-rose-100 text-rose-800 border-rose-300'
                  }`}>
                    {scoreResult.totalScore}/100 Points
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 italic line-clamp-1">{scoreResult.actionableAdvice}</span>
              </div>
            )}

            {/* Vùng hiển thị kết quả AI */}
            <div className="flex-1 bg-slate-50/80 rounded-xl p-4 border border-slate-200 text-xs md:text-sm text-slate-800 leading-relaxed overflow-y-auto min-h-[360px]">
              {output ? (
                <div className="leading-relaxed">
                  <MarkdownView content={output} />
                  {isRunning && (
                    <span className="inline-block w-2 h-4 bg-emerald-600 animate-pulse ml-1 align-middle" />
                  )}
                </div>
              ) : isRunning ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2 py-16">
                  <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-medium">Calling AI model and compiling evaluation...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2 py-20 text-center">
                  <Sparkles className="w-8 h-8 text-slate-300" />
                  <p className="text-xs font-medium text-slate-500">No response generated yet.</p>
                  <p className="text-[11px] text-slate-400 max-w-sm">
                    Review the brief above, craft your prompt, and click <strong className="text-slate-700">"Run Prompt & Evaluate"</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* Mini Challenge tùy chọn ở cuối bài */}
            <MiniChallengeCard
              challenge={currentLab.miniChallenge}
              onApplyChallengePrompt={(s) => setUserPrompt(s)}
            />

            {/* Chú thích định dạng */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 flex-shrink-0">
              <span>Standard Markdown table support</span>
              <span className="text-slate-400">
                {currentLabRunCount < 2 
                  ? '💡 Run 1 more attempt to unlock A/B Comparison' 
                  : `${currentLabRunCount} attempts recorded`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
