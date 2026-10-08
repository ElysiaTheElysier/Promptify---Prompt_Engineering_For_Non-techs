import React, { useEffect, useRef, useState } from 'react';
import { Lock, X } from 'lucide-react';
import { PromptifyMark } from '../common/PromptifyMark';
import { StagingLogin } from './StagingLogin';

interface Props { onClose: () => void; onGoogle: () => Promise<void>; busy: boolean; error: string | null }
export function EnterpriseSignIn({ onClose, onGoogle, busy, error }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [lang, setLang] = useState<'en' | 'vi'>('en');
  const t = (en: string, vi: string) => lang === 'en' ? en : vi;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => { dialog.current?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={dialog} aria-labelledby="enterprise-sign-in-title" onCancel={onClose}
    className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/40">
    <header className="flex items-center justify-between border-b border-slate-200 p-5">
      <div className="flex items-center gap-3"><PromptifyMark className="h-9 w-9" /><strong>Promptify</strong></div>
      <div className="flex gap-2"><button type="button" onClick={() => setLang(lang === 'en' ? 'vi' : 'en')} className="rounded-lg border border-slate-200 px-3 py-2" aria-label="Change language">{lang.toUpperCase()}</button>
        <button type="button" onClick={onClose} aria-label={t('Close sign in', 'Đóng đăng nhập')} className="rounded-lg p-2"><X size={20} /></button></div>
    </header>
    <main className="p-6 sm:p-8">
      <Lock className="mb-4 text-emerald-700" size={28} />
      <h1 id="enterprise-sign-in-title" className="text-2xl font-bold">{t('Enterprise Sign In', 'Đăng nhập Doanh nghiệp')}</h1>
      <p className="mt-3 text-slate-600">{t('Access your Department Training Zone', 'Truy cập Khu vực Đào tạo Phòng ban')}</p>
      <section className="my-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <h2 className="font-semibold text-emerald-900">{t('Single Sign-On', 'Đăng nhập SSO')}</h2>
        <p className="mt-2 text-sm text-emerald-900">{t('Use your Google Workspace account. Your assigned classes are checked after authentication.', 'Dùng tài khoản Google Workspace. Quyền vào lớp được kiểm tra sau khi xác thực.')}</p>
      </section>
      {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
      <button type="button" disabled={busy} onClick={() => void onGoogle()} className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
        {busy ? t('Verifying OAuth Token…', 'Đang xác thực OAuth…') : t('Continue with Google Workspace', 'Tiếp tục với Google Workspace')}
      </button>
      <StagingLogin />
    </main>
  </dialog>;
}
