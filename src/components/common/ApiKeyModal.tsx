import React, { useState } from 'react';
import { Check, Cpu, ShieldCheck, X, Zap } from 'lucide-react';
import { ApiConfig } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: ApiConfig;
  onSaveConfig: (newConfig: ApiConfig) => void;
}

export const ApiKeyModal: React.FC<Props> = ({ isOpen, onClose, config, onSaveConfig }) => {
  const [mode, setMode] = useState<'live' | 'simulated'>(config.mode === 'simulated' ? 'simulated' : 'live');
  if (!isOpen) return null;

  const save = () => {
    onSaveConfig({ mode, geminiApiKey: '', model: 'server-managed', temperature: config.temperature ?? 0.3 });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <Cpu className="h-5 w-5 text-emerald-400" />
            <div><h3 className="font-semibold">Cấu hình Động cơ AI</h3><p className="text-xs text-slate-400">API key được quản lý an toàn trên máy chủ</p></div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-5 p-6">
          <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            <p>Không nhập hoặc lưu API key trong trình duyệt. Live AI sử dụng credential được cấu hình trong môi trường triển khai của máy chủ.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setMode('live')} className={`rounded-xl border p-4 text-left ${mode === 'live' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between font-semibold text-slate-900"><span>Live AI (Server-Managed)</span>{mode === 'live' && <Check className="h-4 w-4 text-emerald-600" />}</div>
              <p className="mt-1 text-xs text-slate-500">OpenAI/Gemini do máy chủ quản lý tự động.</p>
            </button>
            <button type="button" onClick={() => setMode('simulated')} className={`rounded-xl border p-4 text-left ${mode === 'simulated' ? 'border-amber-500 bg-amber-50' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between font-semibold text-slate-900"><span className="flex items-center gap-1"><Zap className="h-4 w-4" />Mô phỏng</span>{mode === 'simulated' && <Check className="h-4 w-4 text-amber-600" />}</div>
              <p className="mt-1 text-xs text-slate-500">Không gọi dịch vụ AI bên ngoài.</p>
            </button>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Hủy</button>
            <button type="button" onClick={save} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Lưu cấu hình</button>
          </div>
        </div>
      </div>
    </div>
  );
};
