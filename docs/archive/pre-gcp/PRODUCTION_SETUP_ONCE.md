# Chuẩn bị quyền và khóa production một lần

Ngày kiểm tra: 08/10/2026. Đây là checklist cấu hình, không phải chứng nhận production.

Đã có: Supabase URL, anon key, service-role key cho database rebuild; Vercel CLI đã đăng nhập. Không cần tạo database hay project Vercel mới bằng tay. Project Vercel rebuild sẽ được tạo riêng khi ứng dụng đã sẵn sàng triển khai.

Sao chép `.env.production-setup.example` thành `.env.production-setup.local` tại root repository. Điền bí mật vào file local, không gửi trong chat. Không dùng tiền tố `VITE_` cho bất kỳ khóa bí mật nào. File local đã được gitignore.

## 1. Quyền cập nhật Supabase

Vào https://supabase.com/dashboard/account/tokens → tạo Personal Access Token, đặt tên `Promptify rebuild setup`, điền vào `SUPABASE_ACCESS_TOKEN` trong file local. Token phải có quyền truy cập project rebuild và chạy cập nhật schema qua Management API. Không cần cung cấp mật khẩu database nếu quyền này hoạt động. Nếu không muốn tạo token, đăng nhập dashboard và chạy SQL migration đã được kiểm tra là phương án thay thế; chưa cần chạy SQL lúc này.

Nguồn: https://supabase.com/docs/guides/platform/access-tokens

## 2. Gemini API

Vào https://aistudio.google.com/api-keys → chọn/import Google Cloud project → Create API key → điền vào `GEMINI_API_KEY`. Bật billing nếu quota hiện tại không đáp ứng số người dùng production. Chỉ cần một nhà cung cấp Gemini cho luồng này; không cần mua thêm OpenAI key. Khóa hiện có ở cấu hình cũ có thể được kiểm tra trước khi yêu cầu tạo mới.

Nguồn: https://ai.google.dev/gemini-api/docs/api-key

## 3. Google Sheets service account

Dùng cùng Google Cloud project ở https://console.cloud.google.com/ nếu thuận tiện:

1. APIs & Services → Library → bật Google Sheets API.
2. IAM & Admin → Service Accounts → Create service account, tên `promptify-sheets`. Không cấp Project Owner/Editor cho tài khoản này chỉ để đọc Sheet.
3. Mở service account → Keys → Add key → Create new key → JSON. Lưu file ở thư mục local ngoài repository, ví dụ `C:\Users\Admin\.promptify\sheets-service-account.json`.
4. Điền đường dẫn tuyệt đối vào `GOOGLE_SERVICE_ACCOUNT_FILE` trong file cấu hình local.
5. Mở Sheet → Share → thêm địa chỉ email của service account (`...@...iam.gserviceaccount.com`) với quyền Viewer. Không cần bật chia sẻ công khai. Nếu sau này yêu cầu xuất kết quả vào Sheet riêng, cấp Editor cho đúng Sheet đích đó.

Nguồn: https://docs.cloud.google.com/iam/docs/keys-create-delete và https://developers.google.com/workspace/sheets/api/quickstart/nodejs

Sheet người dùng cung cấp là sample, tab `Table`, sheetId `403948057`. Readback connector ngày 08/10/2026 xác nhận ba bảng cạnh nhau:

| Bảng | Vùng header | Cột |
| --- | --- | --- |
| Country | A1:D1 | #, Code, Name, Note |
| Department | G1:K1 | #, Department_Name, Decs, Note, Head |
| User | N1:Q1 | ID, Email, Country, Department |

Không giả định sample có Full Name, không suy ra tên từ email, không nhập sample thành production roster. Tích hợp phải xác thực header và dữ liệu trước khi import, phân quyền theo cohort/department. Google Drive connector trong Codex đọc được Sheet không đồng nghĩa server production có credential.

## 4. Google SSO

Google Cloud → Google Auth Platform:

1. Cấu hình Branding và Audience theo tài khoản tổ chức được phép đăng nhập. Chỉ chọn Internal nếu project thuộc đúng Google Workspace tổ chức.
2. Clients → Create client → Web application.
3. Authorized redirect URI: lấy chính xác callback từ Supabase rebuild → Authentication → Sign In / Providers → Google. Không dùng callback của database cũ.
4. Điền Client ID và Client Secret vào `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` trong file local. Hai giá trị sẽ được cấu hình cho Google provider của Supabase; Client Secret không đưa vào browser.
5. Authorized JavaScript origins và Site URL/Redirect URLs sẽ được hoàn tất bằng domain Vercel thật sau khi tạo project. Không nhập domain dự đoán.

Nguồn: https://supabase.com/docs/guides/auth/social-login/auth-google

## Sau khi điền xong

Chỉ báo trong chat: “Đã điền file cấu hình”. Agent sẽ kiểm tra credential mà không in giá trị, hoàn thiện migration, cấu hình OAuth, môi trường Vercel và kiểm thử luồng end-to-end. Những bước này vẫn cần thực hiện; chỉ có khóa không tự làm phần UI/backend còn thiếu trở thành production.

Không cần Vercel API token mới, Google Maps key, Drive API key, SMTP credential hay OpenAI key cho phạm vi hiện tại. Google OAuth và service account là hai credential khác nhau: một dùng đăng nhập người học, một dùng server đọc Sheet.
