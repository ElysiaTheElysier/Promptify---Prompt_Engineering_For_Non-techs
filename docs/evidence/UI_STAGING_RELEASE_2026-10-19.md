# Promptify UI fixes — staging release 2026-10-19

## Kết quả phát hành

Đã phát hành frontend Intrepid lên Firebase Hosting staging. Giữ theme, logo, màu và font hiện tại. Không triển khai backend, migration, IAM, Firestore rules hay production; không ghi dữ liệu QA lên cloud trong lần kiểm này.

- URL: https://ai-transformation-510302-intrepid-staging.web.app/
- Project: `ai-transformation-510302`; site: `ai-transformation-510302-intrepid-staging`.
- Hosting version: `3fe0c8430a40f330` → **`bd3d1de0dd412dde`**.
- Cloud Run vẫn là `promptify-intrepid-api-00005-tez`, toàn bộ service specification/traffic không đổi.
- Default Hosting site vẫn có 0 releases. Không thao tác Vercel production.
- Phát hành từ workspace có thay đổi chưa commit; hash mã nguồn và dist được lưu để truy vết, không tự commit/push các thay đổi có sẵn của dự án.

## Các lỗi đã sửa

| Khu vực | Thay đổi |
| --- | --- |
| Điều hướng chung | Thu gọn menu mobile; giữ chọn lớp dễ truy cập; trạng thái mở có aria-expanded; đóng menu khi chuyển trang. |
| UI-09 | Sửa selector CSS bị gắn sai phần tử; Broadcast xếp dọc và nằm trong card; legend dễ đọc; roster thành thẻ có nhãn; tên/phòng ban xuống dòng đúng; sửa đường viền chồng tên; header mobile không che nội dung khi cuộn. |
| UI-11 directory | Thống kê 2×2 trên mobile; danh sách thành thẻ; giảm khoảng trống và số nút luôn hiển thị. |
| UI-11 editor | Save hiển thị trực tiếp; tác vụ phụ trong More actions trên mobile; menu hoạt động trên desktop và khi đổi breakpoint; tab strip cuộn riêng; phòng ban/checkmark cùng hàng. |
| UI-11 tài liệu | SOP và material thành thẻ trên mobile, nhãn trên trường nhập; version/date đủ chiều rộng; có trạng thái SOP rỗng. Desktop vẫn dùng bảng. |
| Footer | Bỏ copyright lặp trong UI-09/10/11/12/14/15; giữ footer chung và nút Privacy. Không bỏ footer chức năng của Compare. |
| Compare | Mặc định hai attempt mới nhất theo thứ tự phiên bản; OLDER/NEWER tính theo A/B thực tế; đảo A/B và chọn cùng phiên bản hiển thị đúng. Giữ delta B−A, prompt/output diff và restore. |
| Restore → Workspace | Bản ghi cũ thiếu stopSequences từng làm màn hình trắng; nay bổ sung mặc định và kiểm tra tham số trước khi khôi phục. Không thay đổi dữ liệu đã lưu. |

Các agent GPT-6 Luna xử lý phần UI-09, UI-11 và Compare/footer ở phiên trước. Primary review, tích hợp, sửa lỗi selector/menu/legacy restore, kiểm tra và phát hành. Không thay đổi app MVP.

## Kiểm tra

- Typecheck, lint, boundary checks, build và local smoke: PASS.
- Offline test allowlist: **38/38 PASS**; không chạy live test hoặc maintenance script có ghi dữ liệu.
- Trình duyệt Edge headless, profile tạm độc lập, dữ liệu hư cấu và chặn request ngoài localhost: **26 captures** ở 360×800, 390×844 và 1280×800; không lỗi JavaScript, không tràn ngang toàn trang.
- Kiểm UI-09 broadcast/roster; UI-11 directory và đủ 5 tab; menu; chỉnh/lưu material; dirty guard chọn Stay; SOP rỗng; footer đúng một bản.
- Compare: mặc định V1/V2, đảo A/B, SAME, Output Result Diff và Restore bản ghi legacy về Workspace: PASS.
- Sau deploy: **23 HTTP/asset checks PASS**. Route UI-04/05/11 và toàn bộ JS/CSS khớp byte/hash với dist; API product/generate/evaluate trả 401 khi chưa đăng nhập.
- API `/health`: 200/ok; `/readyz`: 200/ready.
- Trang đăng nhập của bản staging mới render trên desktop/mobile trong trình duyệt tạm, không lỗi JavaScript; không thực hiện OAuth hay ghi dữ liệu.

Cảnh báo còn có sẵn: vòng tham chiếu type Workspace và các bundle lớn hơn 500 kB. Các kiểm tra không có lỗi chặn build. Không mở rộng sang tái cấu trúc bundle trong đợt sửa UI này.

## Governance và bằng chứng

Trước deploy đã xác minh tài khoản `demo.biz@intrepid.asia`, chụp lại baseline mới sau khi người dùng tự reauthenticate. Mỗi lệnh cloud dùng project/site staging tường minh. Chỉ deploy `hosting` với `firebase.staging.json`; giữ nguyên rewrite `/api/**` tới service staging.

Evidence tại `apps/promptify-intrepid/outputs/staging-release-2026-10-19/`:

- `before/`, `after/`: project, enabled APIs, project/resource IAM, Cloud Run, SQL/settings/backups, Artifact Registry, service accounts, secret metadata/version references, storage, Firestore database/index/rules, Scheduler, Logging, asset inventory/IAM, Firebase web apps/Auth/Google provider/Hosting và BigQuery datasets.
- `comparison.json`: **21/21 invariant checks PASS**, bao gồm toàn bộ Cloud Run service, runtime/SQL attachment/settings, IAM, bucket/secret policies, rules, domains và default Hosting.
- `additional-comparison.json`: **10/10 so sánh cấu hình bổ sung PASS**, cùng 2 mục thiếu payload baseline được ghi rõ; không che giấu các trường metadata thay đổi theo thời gian. Chuẩn hóa wrapper `value/Count` do PowerShell serialize mảng, không sửa snapshot raw để ép kết quả khớp.
- `deploy-hosting.json`, `release-summary.json`, `hosting-live-http-checks.json`, `api-health.json`, `browser-public-checks.json`.
- `offline-tests.log`, `local-ui-checks.json`, `artifact-hashes.json`.
- Ảnh kiểm tra và chương trình QA local tại `outputs/ui-fixes-2026-10-19/`.
- `governance-evidence.zip` và `governance-evidence.zip.sha256`: bản đóng gói evidence đã rà secret/token.

Script capture cũ có lỗi serialize danh sách rỗng: manifest báo lệnh Firestore composite indexes và Scheduler đã thành công, nhưng không tạo file cho kết quả rỗng. Đã sửa script để ghi `[]` và chụp lại **after**. Giữ nguyên baseline gốc; không tạo ngược payload trước deploy. Hai mục này được ghi là thiếu payload baseline trong đối chiếu bổ sung. Snapshot after xác nhận cả hai danh sách rỗng. Baseline checkpoint cũ cũng được giữ riêng.

Firestore `earliestVersionTime` và `etag` có thể dịch chuyển do cửa sổ retention; đối chiếu cấu hình bổ sung tách hai trường này và giữ nguyên snapshot raw. `updateTime` cùng các cấu hình database vẫn không đổi.

Không đọc secret payload/private key. Token dùng gọi API chỉ tồn tại trong bộ nhớ; hashConfig và Google provider clientSecret được che trước khi ghi snapshot. Bộ evidence đã rà dấu hiệu token/private key/clientSecret không che.

## Giới hạn còn lại

Computer-use vẫn lỗi khởi tạo kernel assets (os error 3). Vì vậy lần này không tự đăng nhập lại learner/admin để kiểm các luồng ghi dữ liệu trên staging. Kết quả UI có tương tác ở trên dùng component thật với adapter dữ liệu hư cấu local; kiểm sau deploy chứng minh bundle giống bản đã kiểm và trang đăng nhập hoạt động. Không gọi đó là nghiệm thu authenticated backend đầy đủ.

Run prompt 503 “service is not ready” còn là vấn đề provider/model/location/budget của backend; đợt này không bật AI/billing hoặc thay quyền để xử lý. Nội dung Privacy còn mô tả hạ tầng Vercel/Supabase cũ; chưa chỉnh nội dung chính sách trong đợt này.
