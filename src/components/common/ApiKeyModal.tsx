import React, { useState } from 'react';
import { 
  X, 
  Key, 
  Cpu, 
  Zap, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import { ApiConfig } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: ApiConfig;
  onSaveConfig: (newConfig: ApiConfig) => void;
}

export const ApiKeyModal: React.FC<Props> = ({ isOpen, onClose, config, onSaveConfig }) => {
  const [mode, setMode] = useState<'simulated' | 'gemini'>(config.mode || 'gemini');
  const [apiKey, setApiKey] = useState(config.geminiApiKey || '');
  const [model, setModel] = useState(config.model || 'gemini-2.5-flash');
  const [temperature, setTemperature] = useState(config.temperature ?? 0.3);
  const [isSaved, setIsSaved] = useState(false);

  // Trạng thái hướng dẫn từng bước & kiểm tra kết nối
  const [showStepGuide, setShowStepGuide] = useState<boolean>(true);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);

  if (!isOpen) return null;

  const defaultClassroomKey = import.meta.env.VITE_GEMINI_API_KEY || '';

  const handleTestConnection = async () => {
    const keyToTest = apiKey.trim();
    if (!keyToTest) {
      setTestResult({
        success: false,
        message: 'Vui lòng nhập API key trước khi kiểm tra kết nối.'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    const startTime = performance.now();

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keyToTest}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Ping test' }] }]
        })
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (res.ok) {
        setTestResult({
          success: true,
          message: `Kết nối thành công tới mô hình ${model}! Sẵn sàng gọi API thực tế.`,
          latencyMs
        });
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = data?.error?.message || `Lỗi HTTP ${res.status}: Mã API key không hợp lệ hoặc tài khoản bị giới hạn.`;
        setTestResult({
          success: false,
          message: msg
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Lỗi kết nối mạng: ${err.message || 'Không thể liên lạc tới Google AI Studio.'}`
      });
    } finally {
      setIsTesting(false);
    }
  };

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

  const handleFillClassroomKey = () => {
    setApiKey(defaultClassroomKey);
    setMode('gemini');
    setTestResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto transition-all">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-semibold text-base">Cấu hình Động cơ AI (AI Engine)</h3>
              <p className="text-xs text-slate-400">Kết nối Google Gemini API thật hoặc Chế độ Mô phỏng</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Mode Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Chế độ vận hành</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('gemini')}
                className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  mode === 'gemini'
                    ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20 text-indigo-950'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-700">
                    <Key className="w-4 h-4 text-indigo-600" />
                    Live Gemini API (Khuyên dùng)
                  </span>
                  {mode === 'gemini' && <Check className="w-4 h-4 text-indigo-600 stroke-[3]" />}
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Gọi mô hình AI thật từ Google AI Studio với tốc độ phản hồi cao và độ chuẩn xác nghiệp vụ tối ưu.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('simulated')}
                className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  mode === 'simulated'
                    ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 text-emerald-950'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                    <Zap className="w-4 h-4 text-emerald-600" />
                    Simulated Engine
                  </span>
                  {mode === 'simulated' && <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />}
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Mô phỏng tức thì phản hồi chuẩn cho workshop. Không cần API Key, hoàn toàn miễn phí và không sợ lỗi mạng.
                </p>
              </button>
            </div>
          </div>

          {/* Section: Hướng dẫn chi tiết từng bước (Bước 1 - 2 - 3 - 4) */}
          {mode === 'gemini' && (
            <div className="rounded-xl border border-indigo-200/90 bg-indigo-50/50 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowStepGuide(!showStepGuide)}
                className="w-full p-3.5 flex items-center justify-between text-left text-xs font-bold text-indigo-950 hover:bg-indigo-100/50 transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-indigo-600" />
                  <span>📖 Hướng dẫn 4 bước lấy Google Gemini API Key Miễn Phí (Dành cho người mới)</span>
                </div>
                {showStepGuide ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4 text-indigo-600" />}
              </button>

              {showStepGuide && (
                <div className="p-4 pt-1 border-t border-indigo-100 space-y-3 text-xs text-slate-700">
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        1
                      </span>
                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-900 block">Truy cập cổng Google AI Studio:</span>
                        <p className="text-slate-600 leading-relaxed">
                          Nhấp vào liên kết{' '}
                          <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 underline"
                          >
                            aistudio.google.com/app/apikey <ExternalLink className="w-3 h-3 inline" />
                          </a>{' '}
                          và đăng nhập bằng tài khoản Gmail cá nhân của bạn.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        2
                      </span>
                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-900 block">Tạo khóa API mới:</span>
                        <p className="text-slate-600 leading-relaxed">
                          Bấm nút màu xanh <strong>"Create API key"</strong> ở góc trên màn hình. Chọn một Google Cloud Project có sẵn hoặc bấm <em>"Create API key in new project"</em>.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        3
                      </span>
                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-900 block">Sao chép mã khóa:</span>
                        <p className="text-slate-600 leading-relaxed">
                          Bấm nút <strong>Copy</strong> để sao chép chuỗi mã bắt đầu bằng <code className="bg-indigo-100 px-1 py-0.2 rounded text-indigo-900 font-mono text-[11px]">AIzaSy...</code>.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        4
                      </span>
                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-900 block">Dán vào ô bên dưới & Kiểm tra:</span>
                        <p className="text-slate-600 leading-relaxed">
                          Dán chuỗi khóa vào ô "Google Gemini API Key" bên dưới rồi bấm <strong>⚡ Kiểm tra kết nối</strong> để xác thực tức thì.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Nút hỗ trợ nạp key lớp học */}
                  <div className="pt-2 border-t border-indigo-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      Chưa kịp tạo key riêng?
                    </span>
                    <button
                      type="button"
                      onClick={handleFillClassroomKey}
                      className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-300 shadow-2xs transition flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Dùng Key mẫu của lớp học</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ô nhập API Key & Test Connection */}
          {mode === 'gemini' && (
            <div className="space-y-4 pt-1 animate-fadeIn">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Google Gemini API Key</span>
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    Mở Google AI Studio <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    placeholder="Dán mã khóa AIzaSy... tại đây"
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setTestResult(null);
                    }}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono transition"
                  />
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting || !apiKey.trim()}
                    className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-xs"
                    title="Gọi thử một request ping tới Gemini API để kiểm tra khóa"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang kiểm tra...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 text-amber-300" />
                        <span>⚡ Kiểm tra kết nối</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Kết quả Test Connection */}
                {testResult && (
                  <div className={`p-3 rounded-xl text-xs flex items-start gap-2 animate-fadeIn ${
                    testResult.success 
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-900' 
                      : 'bg-rose-50 border border-rose-300 text-rose-900'
                  }`}>
                    {testResult.success ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 stroke-[3]" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      <p className="font-semibold">{testResult.message}</p>
                      {testResult.latencyMs && (
                        <p className="text-[11px] text-emerald-700">
                          ⏱️ Thời gian phản hồi: <strong>{testResult.latencyMs}ms</strong>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Khóa được lưu cục bộ trên trình duyệt (LocalStorage). Không chia sẻ công khai.</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">Mô hình AI</label>
                  <select
                    value={model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      setTestResult(null);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Thế hệ mới, siêu tốc)</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash (Rất nhanh, ổn định)</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash (Đa phương thức 2.0)</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro (Suy luận sâu)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">Nhiệt độ (Temperature)</label>
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
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Chính xác (0.0)</span>
                    <span>Sáng tạo (1.0)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Notice */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Ghi chú nghiệp vụ:</span>
            </p>
            <p className="leading-relaxed">
              Các bài thực hành của Agribank (như Lab 1 Xóa PII, Lab 2 Context, Lab 3 CoT) đều hỗ trợ thực thi trên cả <strong>Live Gemini API</strong> thật và <strong>Simulated Engine</strong>.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 sticky bottom-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            {isSaved ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" /> Đã lưu cấu hình!
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
