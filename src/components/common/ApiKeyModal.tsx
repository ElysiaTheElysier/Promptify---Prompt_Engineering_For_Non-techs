import React, { useState } from 'react';
import { X, Key, Cpu, Zap, Check, ShieldCheck, Sparkles, ExternalLink } from 'lucide-react';
import { ApiConfig } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: ApiConfig;
  onSaveConfig: (newConfig: ApiConfig) => void;
}

export const ApiKeyModal: React.FC<Props> = ({ isOpen, onClose, config, onSaveConfig }) => {
  const [mode, setMode] = useState<'simulated' | 'gemini'>(config.mode);
  const [apiKey, setApiKey] = useState(config.geminiApiKey || '');
  const [model, setModel] = useState(config.model || 'gemini-1.5-flash');
  const [temperature, setTemperature] = useState(config.temperature ?? 0.3);
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveConfig({
      mode,
      geminiApiKey: apiKey.trim(),
      model,
      temperature,
    });
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden transition-all">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-semibold text-base">Cấu hình Động cơ AI (AI Engine)</h3>
              <p className="text-xs text-slate-400">Tùy chọn giữa Giả lập đào tạo (Simulated) hoặc Live Gemini API</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Mode Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Chế độ vận hành</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('simulated')}
                className={`flex flex-col items-start p-4 rounded-xl border text-left transition ${
                  mode === 'simulated'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20 text-emerald-950'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                    <Zap className="w-4 h-4 text-emerald-600" />
                    Simulated Engine
                  </span>
                  {mode === 'simulated' && <Check className="w-4 h-4 text-emerald-600" />}
                </div>
                <p className="text-xs text-slate-600">
                  Mô phỏng tức thì phản hồi chuẩn cho workshop. Không cần API Key, hoàn toàn miễn phí và không sợ lỗi mạng.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('gemini')}
                className={`flex flex-col items-start p-4 rounded-xl border text-left transition ${
                  mode === 'gemini'
                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 text-indigo-950'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-700">
                    <Key className="w-4 h-4 text-indigo-600" />
                    Live Gemini (BYOK)
                  </span>
                  {mode === 'gemini' && <Check className="w-4 h-4 text-indigo-600" />}
                </div>
                <p className="text-xs text-slate-600">
                  Kết nối trực tiếp Google AI Studio với API Key cá nhân của bạn để gọi mô hình Gemini thực tế.
                </p>
              </button>
            </div>
          </div>

          {/* If Live Gemini */}
          {mode === 'gemini' && (
            <div className="space-y-4 pt-2 border-t border-slate-100 animate-fadeIn">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    Google Gemini API Key
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    Lấy key miễn phí tại Google AI Studio <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  API Key chỉ lưu tại trình duyệt của bạn (Local Storage), tuyệt đối an toàn.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">Mô hình AI</label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash (Tốc độ cao)</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro (Suy luận sâu)</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash (Thế hệ mới)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">Temperature</label>
                    <span className="text-xs font-mono text-indigo-600 font-bold">{temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>Chính xác (0.1)</span>
                    <span>Sáng tạo (1.0)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Notice */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Khuyến nghị cho buổi Demo & Kiểm thử:
            </p>
            <p>
              Sử dụng <strong>Simulated Engine</strong> để trải nghiệm trọn vẹn toàn bộ các kịch bản so sánh Before/After của Agribank một cách mượt mà nhất.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-xl transition"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow transition flex items-center gap-1.5"
          >
            {isSaved ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Đã lưu!
              </>
            ) : (
              'Áp dụng cấu hình'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

