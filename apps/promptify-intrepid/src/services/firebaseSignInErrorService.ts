// Show actionable, non-sensitive guidance without exposing provider payloads/tokens.
export function firebaseSignInError(error:unknown,language:string):string {
 const code=String((error as {code?:string})?.code||'');
 const en=language==='en';
 if(code==='auth/unauthorized-domain')return en?'This address is not enabled for Google sign-in. For local testing, open localhost instead of 127.0.0.1.':'Địa chỉ này chưa được phép đăng nhập Google. Khi thử local, hãy mở localhost thay cho 127.0.0.1.';
 if(code==='auth/popup-blocked')return en?'The browser blocked the Google sign-in window. Allow popups for this site and try again.':'Trình duyệt đã chặn cửa sổ đăng nhập Google. Hãy cho phép popup cho trang này rồi thử lại.';
 if(code==='auth/popup-closed-by-user'||code==='auth/cancelled-popup-request')return en?'Google sign-in was not completed. Open the sign-in window again to continue.':'Đăng nhập Google chưa hoàn tất. Hãy mở lại cửa sổ đăng nhập để tiếp tục.';
 if(code==='auth/network-request-failed')return en?'Cannot connect to Google sign-in. Check your connection and try again.':'Không kết nối được dịch vụ đăng nhập Google. Kiểm tra kết nối rồi thử lại.';
 return en?'Unable to sign in. Please try again.':'Không đăng nhập được. Vui lòng thử lại.';
}
