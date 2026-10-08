import React, { useState } from 'react';
import { supabase, supabaseUrl } from '../../services/supabaseClient';

// Local staging access uses real Supabase sessions and normal application/RLS checks.
// Production builds never show this form, including builds with --mode rebuild.
export const StagingLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const enabled = import.meta.env.DEV && import.meta.env.MODE === 'rebuild'
    && supabaseUrl === 'https://aixhryqzgpptuhstiflx.supabase.co';
  if (!enabled) return null;
  return <section className="relative z-10 mx-auto my-6 w-full max-w-md rounded-xl border border-emerald-200 bg-white p-6">
    <h2 className="text-lg font-semibold text-slate-900">Đăng nhập thử nghiệm Rebuild</h2>
    <p className="mt-2 text-sm text-slate-600">Dùng tài khoản học viên hoặc giảng viên trong project thử nghiệm.</p>
    <form className="mt-4 space-y-3" onSubmit={async event => {
      event.preventDefault();
      if (busy) return;
      setBusy(true); setError('');
      try {
        const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (result.error) throw result.error;
        setPassword('');
      } catch (cause) {
        const code = (cause as { code?: string })?.code;
        setError(code === 'invalid_credentials' ? 'Email hoặc mật khẩu không đúng.'
          : code === 'email_not_confirmed' ? 'Tài khoản chưa xác nhận email. Kiểm tra Auto Confirm trong project thử nghiệm.'
          : 'Không kết nối hoặc xác thực được với project thử nghiệm. Kiểm tra cấu hình Supabase và thử lại.');
      }
      finally { setBusy(false); }
    }}>
      <label className="block text-sm text-slate-700">Email
        <input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} disabled={busy} className="mt-1 block w-full rounded-lg border border-slate-300 p-2 focus:outline-emerald-600" />
      </label>
      <label className="block text-sm text-slate-700">Mật khẩu
        <input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} disabled={busy} className="mt-1 block w-full rounded-lg border border-slate-300 p-2 focus:outline-emerald-600" />
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-emerald-700 p-3 font-semibold text-white disabled:opacity-60">{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
    </form>
  </section>;
};
