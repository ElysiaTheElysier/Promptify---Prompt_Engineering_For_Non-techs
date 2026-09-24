import React, { useState } from 'react';
import { 
  History, 
  ArrowLeft, 
  Download, 
  Trash2, 
  Clock, 
  Copy, 
  Check, 
  Sparkles
} from 'lucide-react';
import { PromptRun, ClassCohort } from '../../types';
import { MarkdownView } from '../common/MarkdownView';

interface Props {
  cohort: ClassCohort;
  history: PromptRun[];
  onClearHistory: () => void;
  onBackToDashboard: () => void;
}

export const PromptHistoryView: React.FC<Props> = ({
  cohort,
  history,
  onClearHistory,
  onBackToDashboard,
}) => {
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(
    history.length > 0 ? history[0].id : null
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const selectedRun = history.find((r) => r.id === selectedRecordId) || history[0];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleExportMarkdown = () => {
    let content = `# PROMPT ENGINEERING EXECUTION LOG\n`;
    content += `Course: ${cohort.name}\n`;
    content += `Exported: ${new Date().toISOString()}\n`;
    content += `Total attempts: ${history.length}\n\n`;
    content += `---\n\n`;

    history.forEach((item, index) => {
      content += `## Attempt #${history.length - index} [${item.labId.toUpperCase()}] - ${item.timestamp}\n`;
      content += `**Mode:** ${item.mode} | **Latency:** ${item.latencyMs}ms | **Tokens:** ${item.tokenCount}\n\n`;
      content += `### Prompt:\n\`\`\`\n${item.promptText}\n\`\`\`\n\n`;
      content += `### AI Output:\n${item.output}\n\n`;
      content += `---\n\n`;
    });

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `prompt_history_${cohort.id}_${Date.now()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition mb-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-600" />
            <span>Prompt Execution History</span>
          </h1>
          <p className="text-xs text-slate-500">
            Review execution history, compare prompts, and inspect responses across iterations
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <>
              <button
                onClick={handleExportMarkdown}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
                title="Download execution history as a Markdown file"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Markdown</span>
              </button>

              <button
                onClick={onClearHistory}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer"
                title="Clear all execution history"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            </>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <History className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">No execution records yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            When you execute a prompt in a lesson workspace, prompt versions and AI responses are automatically logged here.
          </p>
          <button
            onClick={onBackToDashboard}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <span>Start Practice</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: List of runs (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 space-y-2 max-h-[750px] overflow-y-auto">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Attempt History ({history.length})</span>
              <span className="text-[11px] font-normal text-slate-400">Newest on top</span>
            </div>

            {history.map((item, index) => {
              const isSelected = selectedRun && selectedRun.id === item.id;
              const runNumber = history.length - index;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedRecordId(item.id)}
                  className={`p-3 rounded-xl border transition cursor-pointer text-left space-y-1.5 ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-400 ring-1 ring-indigo-400/50 shadow-xs'
                      : 'bg-slate-50/50 border-slate-200/80 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">
                      Attempt #{runNumber}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.timestamp}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700 font-mono font-medium">
                      {item.labId.toUpperCase()}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                      {item.versionTag}
                    </span>
                    <span className="text-slate-400">
                      • {item.mode === 'openai' ? 'OpenAI' : item.mode === 'simulated' ? 'Simulated' : 'Gemini'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 font-mono bg-white p-1.5 rounded border border-slate-200/60">
                    {item.promptText}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Right Column: Selected Run Details (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
            {selectedRun && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Attempt Details [Lesson: {selectedRun.labId.toUpperCase()}]
                    </h3>
                    <p className="text-xs text-slate-500">
                      Executed at: {selectedRun.timestamp} • Engine: {selectedRun.mode}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 font-mono">
                      {selectedRun.tokenCount} tokens
                    </span>
                    <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 font-mono">
                      {selectedRun.latencyMs}ms
                    </span>
                  </div>
                </div>

                {/* 1. Prompt Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Submitted Prompt Text
                    </span>
                    <button
                      onClick={() => handleCopy(selectedRun.promptText, `p_${selectedRun.id}`)}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      {copiedId === `p_${selectedRun.id}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Prompt</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="text-xs font-mono bg-slate-900 text-slate-100 p-4 rounded-xl whitespace-pre-wrap leading-relaxed border border-slate-800">
                    {selectedRun.promptText}
                  </pre>
                </div>

                {/* 2. Output Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>AI Model Response</span>
                    </span>
                    <button
                      onClick={() => handleCopy(selectedRun.output, `o_${selectedRun.id}`)}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      {copiedId === `o_${selectedRun.id}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Output</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-800 overflow-x-auto">
                    <MarkdownView content={selectedRun.output} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
