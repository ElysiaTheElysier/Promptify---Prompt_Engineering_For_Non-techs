import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { PromptifyMark } from '../common/PromptifyMark';

export function ProfileConfirmation({ onComplete, onLogout }: { onComplete: () => void; onLogout: () => void }) {
  const [profile,setProfile] = useState<{ full_name:string; email:string; role:string; department?:string }>();
  const [name,setName] = useState(''),[error,setError] = useState(''),[busy,setBusy] = useState(false);
  useEffect(() => { let active=true;
    void supabase.rpc('rebuild_my_profile').then(({ data,error }) => {
      if (!active) return;
      if(error) setError('Chưa tải được hồ sơ. Kiểm tra migration 020 và kết nối database.');
      else {setProfile(data);setName(data.full_name);}
    }); return () => {active=false;};
  },[]);
  return <main className="min-h-screen bg-slate-50 px-4 py-12"><section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-9">
    <div className="flex items-center gap-3"><PromptifyMark className="h-10 w-10"/><strong>Promptify</strong></div>
    <h1 className="mt-8 text-2xl font-bold text-slate-950">Profile Confirmation · Xác nhận hồ sơ</h1>
    <p className="mt-3 text-slate-600">Kiểm tra thông tin trước khi vào khu vực đào tạo phòng ban.</p>
    {error&&<p role="alert" className="mt-4 text-red-700">{error}</p>}
    {profile&&<form className="mt-6 space-y-4" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{
      const result=await supabase.rpc('rebuild_confirm_profile',{p_full_name:name.trim()});
      if(result.error)throw result.error;onComplete();
    }catch{setError('Chưa lưu được hồ sơ. Vui lòng thử lại.');}finally{setBusy(false);}}}>
      <label className="block text-sm font-medium">Họ và tên<input required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 p-3"/></label>
      <dl className="space-y-3 rounded-xl bg-slate-50 p-4 text-sm"><div><dt>Email doanh nghiệp</dt><dd className="font-semibold break-all">{profile.email}</dd></div><div><dt>Phòng ban được ghi danh</dt><dd className="font-semibold">{profile.department||'Chưa được ghi danh vào phòng ban'}</dd></div><div><dt>Vai trò do hệ thống cấp</dt><dd className="font-semibold">{profile.role}</dd></div></dl>
      <button disabled={busy} className="w-full rounded-xl bg-emerald-700 p-3 font-semibold text-white disabled:opacity-60">{busy?'Đang lưu…':'Xác nhận và tiếp tục'}</button>
    </form>}
    <button type="button" onClick={onLogout} className="mt-4 text-sm text-slate-600 underline">Đăng xuất</button>
  </section></main>;
}
