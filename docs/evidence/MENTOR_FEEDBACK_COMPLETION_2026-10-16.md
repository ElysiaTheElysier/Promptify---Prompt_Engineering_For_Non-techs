# Hoàn thiện feedback giảng viên — 16/10/2026

> Cập nhật tiếp: [kiểm tra backend và tích hợp thật local](BACKEND_VALIDATION_2026-10-16.md). Đã tìm thấy credential legacy ở root, thử Generate/Judge thật và kiểm 21 tình huống HTTP trên backend local cô lập. Các giới hạn dưới đây mô tả lượt trước.

Phạm vi: `apps/promptify-intrepid`. Nguồn: [transcript](../meetings/MEETING_TRANSCRIPT_2026-10-12.md), [review video](../meetings/MEETING_REVIEW_2026-10-12.md), [đối chiếu trước sửa](../meetings/MEETING_CODE_GAPS_2026-10-15.md). Đây là trạng thái source/local; chưa deploy, chưa chạy migration hoặc ghi dữ liệu live. Giữ nguyên các thay đổi tách hai app có sẵn, không sửa MVP.

## Đối chiếu và phần đã làm

| Bằng chứng video | Yêu cầu | Kết quả trong code |
| --- | --- | --- |
| 00:00:47–00:07:52 | Chọn tài khoản, hỗ trợ email ngoài roster | Giữ account picker; giữ classId qua OAuth; contact cấu hình theo lớp; form yêu cầu hỗ trợ dùng Firebase identity đã xác minh dù chưa provision; inbox cho manager/admin đúng scope. Bỏ email cố định ở màn từ chối. |
| 00:08:33–00:12:43 | Login chậm, dropdown phòng ban | Có Server-Timing để đo API và department từ workbook; chưa kết luận xử lý xong độ trễ OAuth thật vì không có cấu hình chạy live. |
| 00:13:15–00:25:33 | Roster nhiều tab, đồng bộ theo lịch | Template tải XLSX gồm Sync, Users, Department, SOPs, Main PIC, Report; mapping v1 cố định và kiểm header/schema/HTTPS/department; worker xét mốc Sync và throttle hiện có. Roster + metadata hoàn tất trong một transaction, lỗi metadata rollback roster. Giữ tương thích nguồn Sheet cũ. |
| 00:28:51–00:31:24 | Hồ sơ thiếu thông tin, sửa đúng chỗ | Employee ID/office location nhập và lưu theo tài khoản; profile riêng trong navigation; giữ confirm/correction department. Bỏ trường dấu gạch lặp và email quản lý mẫu trong card. |
| 00:33:08–00:37:43 | Hồ sơ tập trung, metric thật | Profile dialog; thời gian học lấy từ event active_time theo lớp/bài, giới hạn idle/visibility và mức ghi trên server. |
| 00:37:43–00:41:38 | Pillar/category, chi tiết bài và lịch khóa | Bộ lọc pillar cho lab/học liệu; ID bài thay title, label có mã bài để phân biệt trùng tên; bài khóa chỉ công khai metadata lịch, không đưa nội dung/system instruction vào snapshot learner. |
| 00:43:34–00:44:03 | Run/Compare nổi bật | Thêm Run new attempt ngay toolbar; Compare chính, khóa khi chưa đủ hai lượt; giữ phím tắt/nút Run cạnh canvas. |
| 00:44:44–00:45:23 | Theo dõi click | Event whitelist Run/Compare/Hint/Solution/Resource/Save/scaffold/SOP và active_time; batching, dedup UUID, class/lesson scope, rate limit; không lưu prompt/file vào event. |
| 00:49:09–00:53:34 | Studio save, sandbox và variables | Save tại chỗ/dirty state; chặn sandbox khi chưa lưu, xóa kết quả cũ khi đổi cấu hình. Variables nhập ở workspace, server bind có kiểm kiểu, lưu template và values trong attempt và replay. |
| 00:59:01–01:00:38 | Scaffold đếm sai và Run khuất | Nhận diện tag ở đầu dòng thay tìm substring; Run trên toolbar. |
| 01:00:45–01:01:42 | Output/log/score rõ | Log giới hạn vùng cuộn; bỏ output sandbox và Save bị lặp; sửa params/variables/context làm score cũ mất hiệu lực, chọn lại history đúng dữ liệu mới phục hồi. |
| 01:03:20–01:06:04 | Attempt mới và compare dùng dữ liệu đã lưu | Run thành công kết thúc request ID, Run lại tạo lượt mới; retry lỗi giữ ID. Compare/history dùng stored attempts. |
| 01:06:14–01:09:16 | Context SOP đúng đoạn | Truyền context thực sau retrieval vào provider, đóng băng snapshot/hash cùng context; có test provider nhận retrieved context. PDF deep-link/trang với tài liệu thật vẫn cần UAT. |
| 01:12:49–01:13:18 | Header/ngôn ngữ/thao tác lặp | Giữ thanh chung; ẩn brand/language trùng bên trong màn; dropdown lớp đầy chiều ngang màn hẹp; chuyển màn về đầu trang. |
| 01:15:26–01:16:20 | Báo cáo hiệu quả | Form thời gian trước/sau + tần suất; báo cáo event và ước tính theo lớp, export JSON gồm kỳ đo và phương pháp. Đổi nhãn khỏi “audited ROI”: đây là hiệu quả tự khai báo. |

Ước tính: giờ tiết kiệm/tuần = (phút trước − phút sau) × số lần/tuần ÷ 60; giá trị/năm = giờ × chi phí/giờ cấu hình × 52. Lấy mẫu mới nhất mỗi user/lớp/bài trong kỳ; không gọi là lợi nhuận hay ROI được kiểm toán. Không tự điền giá trị khi thiếu dữ liệu.

SOP URL từ Sheet là tham chiếu; không tự đưa thành nội dung AI đã phê duyệt. Không tự thu hồi quyền/xóa user vắng khỏi Sheet. Report tab chứa URL báo cáo; phiên bản này export trong app, chưa ghi báo cáo ngược vào Sheet.

## Bằng chứng kiểm tra

- Offline suite: **35/35 PASS**, gồm DB PostgreSQL offline với DDL migration thật, scope hồ sơ/manager/support/event, idempotency, công thức outcome, rollback sync và retrieval context.
- Build/typecheck PASS; lint/architecture PASS, boundaries negative tests PASS. Có cảnh báo vòng type Workspace có sẵn và bundle >500 kB; chưa tối ưu tải trang từ kết quả đo live.
- Dev/API smoke PASS: assets, entry/routes và từ chối request không đăng nhập; không gọi provider/DB live.
- Browser mở app thật tại localhost:5193, kiểm public entry. Sau đăng nhập dùng harness localhost:5194 mount component thật với adapter in-memory, banner **LOCAL UI REVIEW · FICTIONAL DATA · NO LIVE API**. Harness không được import vào production.
- Thử Run cùng prompt hai lần thấy V1/V2, Compare bật; lưu profile; Studio dirty → Save → sandbox; tải workbook và đọc lại đủ sáu tab; học liệu hai bài trùng title lọc độc lập; Analytics render.
- Kiểm màn hẹp: clientWidth/scrollWidth cùng 520 px, không tràn ngang trong workspace đã xem. Chưa tuyên bố đã kiểm mọi kích thước di động.
- Ảnh: [workspace](../../apps/promptify-intrepid/outputs/mentor-ui-proof/workspace.png), [hồ sơ](../../apps/promptify-intrepid/outputs/mentor-ui-proof/profile.png). Ảnh và harness ở outputs được ignore; dữ liệu hoàn toàn hư cấu.

## Implementation plan và phần còn phụ thuộc môi trường

1. **Đã xong trong source:** các thay đổi trên, migration cộng thêm `gcp/sql/006_mentor_feedback.sql`, kiểm thử offline và UI review local.
2. **Trước rollout, làm ở công việc được phép riêng:** backup và duyệt migration 006; chạy trên staging đã cấu hình Firebase/Cloud SQL/Sheet service account. Không áp dụng migration tự động khi khởi động app. Thiếu bảng thì read trả featureAvailable=false, form liên quan bị khóa.
3. **UAT staging cần dữ liệu/tài khoản thật:** OAuth nhiều account và account ngoài roster; đo login từng chặng; hai lớp chồng lịch; import Sheet v1 và job scheduler theo mốc; SOP PDF đúng trang/citation; Generate/Judge/RAG provider thật; reload và quyền learner/trainer/head/admin; kiểm số liệu analytics theo kỳ.
4. **Sau UAT mới xét triển khai:** xác nhận cấu hình/Root Directory chỉ Intrepid, migration và domain/alias đúng commit. Chưa push/deploy hay đổi env/domain/DB trong lượt này.

Không có credential app/backend trong workspace (chỉ `.env.example`), nên không thể khẳng định live OAuth, provider, scheduler hay dữ liệu Production đã hoạt động. Đây là giới hạn xác minh, không dùng dữ liệu fixture để chứng minh kết nối thật.
