export function describeSignInError(cause:unknown):string{
 const e=cause as {code?:string;status?:number;name?:string;message?:string}|null;
 const code=e?.code,message=(e?.message||'').toLowerCase();
 if(code==='invalid_credentials')return 'Email hoặc mật khẩu không đúng.';
 if(code==='email_not_confirmed')return 'Tài khoản chưa xác nhận email trong Supabase.';
 if(message.includes('invalid api key')||message.includes('no api key')||message.includes('invalid jwt'))return 'Khóa Supabase của bản local không hợp lệ. Cần cập nhật anon/publishable key đúng project Promptify-Rebuild; đổi mật khẩu không sửa được lỗi này.';
 if(e?.status===429||code==='over_request_rate_limit')return 'Supabase đang giới hạn số lần đăng nhập. Chờ một lát rồi thử lại.';
 if(e?.name==='AuthRetryableFetchError'||message.includes('failed to fetch')||message.includes('network')||message.includes('fetch failed'))return 'Trình duyệt không kết nối được Supabase Auth. Kiểm tra kết nối mạng hoặc project đang tạm dừng.';
 if(e?.status===401||e?.status===403)return `Supabase Auth từ chối yêu cầu (HTTP ${e.status}). Chưa đủ thông tin để kết luận mật khẩu sai; cần kiểm tra khóa và cấu hình xác thực.`;
 if(e?.status&&e.status>=500)return `Supabase Auth gặp lỗi máy chủ (HTTP ${e.status}).`;
 // Do not display arbitrary provider messages: they may contain user input or secrets.
 const safeCode=code&&/^[a-z_]{1,60}$/.test(code)?` · ${code}`:'';
 return `Chưa đăng nhập được${e?.status?` (HTTP ${e.status})`:''}${safeCode}.`;
}
