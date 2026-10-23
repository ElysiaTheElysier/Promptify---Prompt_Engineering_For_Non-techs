import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { PromptifyMark } from '../common/PromptifyMark';
export function AccessDenied({onRetry,onLogout}:{onRetry:()=>void;onLogout:()=>void}){
 return <main className="min-h-screen bg-slate-50 px-4 py-12"><section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8"><PromptifyMark className="h-10 w-10"/><ShieldAlert className="mt-8 text-amber-700" size={32}/><h1 className="mt-4 text-2xl font-bold text-slate-950">Access Guard · Chưa xác minh được quyền truy cập</h1><p className="mt-4 text-slate-600">Hệ thống chưa tải hoặc liên kết được hồ sơ với tài khoản đã đăng nhập. Vui lòng thử lại; nếu vẫn gặp lỗi, liên hệ người phụ trách đào tạo để kiểm tra hồ sơ và ghi danh.</p><div className="mt-6 flex flex-wrap gap-3"><button onClick={onRetry} className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white">Kiểm tra lại</button><button onClick={onLogout} className="rounded-xl border border-slate-300 px-5 py-3">Đăng xuất</button></div></section></main>;
}
