import React from 'react';
import { X, History, Download, Copy, Check, Clock, Cpu, BarChart2, Trash2 } from 'lucide-react';
import { PromptRun } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  history: PromptRun[];
  onClearHistory: () => void;
}

export const HistoryDrawer: React.FC<Props> = ({ isOpen, onClose, history, onClearHistory }) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const totalTokens = history.reduce((acc, curr) => acc + curr.tokenCount, 0);
  const avgLatency = history.length > 0
    ? Math.round(history.reduce((acc, curr) => acc + curr.latencyMs, 0) / history.length)
    : 0;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleExportMarkdown = () => {
    let content = `# PROMPT ENGINEERING TELEMETRY LOG\n`;
    content += `Export Time: ${new Date().toLocaleString('en-US')}\n`;
    content += `Total Runs: ${history.length} | Total Tokens: ${totalTokens}\n\n`;
    content += `---\n\n`;

    history.forEach((item, index) => {
      content += `## Run #${history.length - index} [${item.labId.toUpperCase()}] - ${item.timestamp}\n`;
      content += `**Mode:** ${item.mode} | **Latency:** ${item.latencyMs}ms | **Tokens:** ${item.tokenCount}\n\n`;
      content += `### Prompt:\n\`\`\`\n${item.promptText}\n\`\`\`\n\n`;
      content += `### Output:\n${item.output}\n\n`;
      content += `---\n\n`;
    });

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `prompt_history_export_${Date.now()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/50 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="font-bold text-sm">Telemetry History & Analytics</h3>
                <p className="text-[11px] text-slate-400">{history.length} runs recorded in this session</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Telemetry Stats Bar */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-100 border-b border-slate-200 text-center">
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Runs</span>
              <span className="text-sm font-bold text-slate-800">{history.length}</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Tokens</span>
              <span className="text-sm font-bold text-indigo-600">{totalTokens}</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Avg Latency</span>
              <span className="text-sm font-bold text-emerald-600">{avgLatency} ms</span>
            </div>
          </div>

          {/* Action Bar */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
            <button
              onClick={handleExportMarkdown}
              disabled={history.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-semibold shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5" /> Export Markdown (.md)
            </button>
            <button
              onClick={onClearHistory}
              disabled={history.length === 0}
              className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition"
              title="Clear history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* History List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <BarChart2 className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs">No prompt runs recorded yet in this session.</p>
                <p className="text-[11px] text-slate-400">Click "Run Prompt" in any lesson to record telemetry!</p>
              </div>
            ) : (
              history.map((item, idx) => (
                <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">
                      #{history.length - idx} • {item.labId.toUpperCase()}
                    </span>
                    <span>{item.timestamp}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Prompt:</span>
                    <p className="font-mono text-slate-700 line-clamp-2 bg-white p-1.5 rounded border border-slate-200">
                      {item.promptText}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200 text-slate-500">
                    <span>{item.tokenCount} tokens • {item.latencyMs}ms</span>
                    <button
                      onClick={() => handleCopy(item.output, item.id)}
                      className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy Output
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
