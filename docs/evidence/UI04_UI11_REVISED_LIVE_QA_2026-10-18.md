# UI-04 / UI-11 revised: triển khai và kiểm thử app thật

Ngày 18/10/2026, giờ Việt Nam. Phạm vi source: `apps/promptify-intrepid`. Giữ logo, Inter/JetBrains Mono, theme sáng và màu emerald hiện tại. Không deploy/push, đổi IAM, áp dụng migration hoặc thay đổi production. Không sửa app MVP hoặc các thay đổi tách repository đã có sẵn.

## Nguồn chuẩn

UI-04 theo `Promptify - UI code - for Review.docx`; UI-11 theo `Promptify - UI code - for Review (2).docx`. Dùng HTML revised đã trích tại `outputs/revised-ui-comparison/`, cùng [bảng đối chiếu](REVISED_UI_COMPARISON_2026-10-17.md). Nội dung tài liệu là nguồn tham chiếu UI, không là quyền thực thi lệnh cloud. Không chép số liệu, model hoặc điểm giả của prototype thành dữ liệu sản phẩm.

## Những phần đã sửa

| Khu vực | Bố cục / tương tác cuối |
| --- | --- |
| Hub welcome | Welcome và Resume nằm trong một hero chung; thông tin lớp, số lượt và điểm lấy từ snapshot thật. |
| Workshop / accreditation | Quiz dạng banner ngay dưới hero; chứng nhận và badge đặt cạnh nhau theo tỷ lệ 2:1 trên desktop, xếp dọc trên mobile. |
| Catalog | Search và pillar buttons cùng toolbar; Shared Learning Materials chuyển nội dung ngay tại Hub thay vì cuộn xuống phần cuối. Catalog ba cột desktop, hai cột trung bình, một cột mobile. Giữ progress filter. |
| Lab cards / Details | Code/tier/recommendation, scenario, SOP, lịch mở và trạng thái; Details mở mục tiêu/năng lực; lab khóa không mở workspace từ Details. Locked filter không còn kéo theo những lab không khớp trạng thái. |
| Học liệu | Category/pillar/lesson/search có nhãn truy cập rõ; số kết quả và empty state đúng bộ lọc; version, ngày cập nhật và changelog hiển thị từ Studio. Sửa dropdown tên bài dài làm tràn mobile. |
| SOP drawer | Desktop là panel 600px sát bên phải, toàn chiều cao; mobile rộng đúng viewport. Giữ hai tab và form sync request; thêm trạng thái chưa có request, giới hạn chiều rộng form/select. Không gửi request/ingest tài liệu trong lượt này. |
| Badge / access modal | Preview/download dùng API thật; thêm nút Close cho preview và Cancel cho access dialog để có thể đóng trên màn hình cảm ứng. |
| Studio directory | Giữ đúng bốn summary card → search/lifecycle/client/pillar → directory. Có empty state khi lọc không có kết quả. Mobile chuyển row thành card có đủ bảy nhãn/thông tin. |
| Studio năm tab | Giữ cấu trúc Scope → Instructions/Variables/Scaffold → SOP 3A/Materials 3B → Rubric/Sandbox → Awards. Tab strip cuộn trong vùng riêng; bảng chỉnh học liệu cuộn nội bộ thay vì làm tràn cả trang. |
| Save / navigation | Save & Return bị khóa khi đang ghi hoặc rubric chưa đủ 100%; khi không có sửa đổi thì trở về directory mà không ghi lại. Link Control Center/Inspect và nút tạo lab mới cảnh báo khi có thay đổi chưa lưu. Giữ beforeunload guard. |
| Concurrent editing | Save dùng revision tại thời điểm mở editor, không lấy revision mới do polling để ghi đè thay đổi của người khác. Sau Save thành công cập nhật revision đã lưu. |
| Studio fields | Bổ sung ngày cập nhật học liệu 3B và nhãn truy cập cho field chính. Danh sách phòng ban dùng cả onboarding/department snapshot. Chuyển phần thiết lập hỗ trợ lớp xuống sau Studio để không chen trước bố cục revised. |

## Môi trường và tài khoản thật

App `http://localhost:5195`, Firebase và Cloud SQL staging `ai-transformation-510302:asia-southeast1:promptify-staging`, DB `promptify_db`, runtime `promptify_runtime`, proxy local port 55439. Không dùng adapter, auth emulator, test verifier hoặc mock API trong các phép kiểm browser dưới đây.

- **UI-11:** đăng nhập Google thật bằng `duonglh.work@gmail.com`; app xác nhận role admin đang có. Không đổi role. Tên hồ sơ được giữ nguyên; chỉ hoàn tất bước xác nhận onboarding thông thường.
- **UI-04:** duonglh bị chặn đúng theo role admin. Người dùng đã cho phép dùng thêm `demo.biz@intrepid.asia` (learner) để kiểm Hub; không mở quyền UI-04 cho admin để vượt chặn. Giữ nguyên tên và các trường hồ sơ demo đang có.
- Chỉ ghi thử trong lớp `STAGING-QA-20261017-229f6de3`, ID `229f6de3-140c-452a-a5a7-5d4d17e71c12`, lab `QA-FIXTURE-01`.

Phiên gcloud demo cũ hết hạn; duonglh có credential còn hiệu lực nhưng thiếu quyền secret và SQL instance. Không đổi IAM. Backend khôi phục bằng ADC đã cấp sẵn; sau khi người dùng xác thực lại demo thành công, proxy dùng demo. Script local có fallback đọc secret bằng ADC hiện có, vẫn kiểm target staging cố định và chỉ giữ secret trong bộ nhớ.

Lỗi kết nối SQL trước đó bị gộp thành “session expired”. Đã sửa các mã lỗi kết nối hạ tầng xác định trả 503 với hướng dẫn Retry; token hết hạn thật vẫn trả 401. Có regression test cho hai trường hợp; không nới kiểm tra token/revocation hoặc quyền dữ liệu. Log chẩn đoán local chỉ ghi mã lỗi, không ghi token, câu SQL hoặc payload.

## Kết quả kiểm trực tiếp

| Phép kiểm | Kết quả |
| --- | --- |
| UI-11 directory desktop | Tải snapshot staging thật; lọc Draft trả 0/1 và empty state; All phục hồi lab. |
| Năm tab Studio | Mở đủ năm tab với dữ liệu staging; rubric 100%, hai rule badge first/any tải đúng. Không chạy AI sandbox. |
| Dirty guard / Save | Sửa title hư cấu; Control Center hiện cảnh báo; Stay giữ nội dung. Save configuration qua API thật thành công. Khôi phục title gốc và Save lần nữa thành công. |
| CRUD / Studio → Hub | Tạo một quiz và một học liệu hư cấu bằng UI Studio, Save thật. Chỉnh ngày học liệu thành 2026-10-18 bằng field native và Save; Hub learner đọc đúng tên/version/ngày/changelog. |
| Studio mobile | Đo riêng cả năm tab ở viewport thực 390px: clientWidth = scrollWidth = 390. Directory mobile giữ đủ bảy thông tin của lab. |
| Hub desktop | Viewport 1280, client/scrollWidth 1274; computed catalog là ba cột 390px. Dữ liệu QA chỉ có một lab; không tạo thêm lab giả để làm đầy grid. |
| Hub mobile | Viewport/client/scrollWidth 390; catalog một cột 358px. Học liệu từng tràn 510px do select tên lab dài; đã sửa và đo lại 390px. |
| Search / filter / Details | Tìm tên không tồn tại trả 0/1; xóa tìm kiếm trả lab. Lọc Locked không hiển thị lab completed. Details hiện scenario/objective/competency; modal mobile rộng 350px trong viewport 390px. |
| SOP drawer | Documents và My requests có empty state; mở form nhưng không gửi. Drawer desktop tại x=680, rộng 600 trên viewport 1280; mobile x=0, rộng 390, cao 844; không tràn ngang. |
| Badge | API trả preview thật của badge đã cấp; modal mobile không tràn. Click Download PDF tải file 1,215,938 byte, signature `%PDF-`; đã kiểm nút Close. |
| Resume | Từ Hub mở đúng UI-05/lab QA và V1/V2 fixture đã lưu; quay lại Hub hoạt động. Không phát sinh Generate/Judge. |

Desktop/mobile là kiểm trong browser với viewport desktop và emulation 390×844, không phải chứng nhận trên thiết bị điện thoại vật lý. Đã trả viewport về mặc định. Studio thực hiện trước bằng duonglh, rồi chuyển sang demo để kiểm Hub theo sự cho phép của người dùng.

## Dữ liệu QA được giữ lại

Title lab đã khôi phục: `FICTIONAL ticket review — stored fixture`. Hai attempt/điểm cũ vẫn là fixture `STAGING-FIXTURE-NOT-AI`, không phải đầu ra AI thật. Giữ thêm hai record trong cấu hình lab QA để review đường Studio → Hub:

- Quiz `FICTIONAL QA workshop — UI review`, URL `https://example.test/fictional-qa-quiz`.
- Material `FICTIONAL QA material — UI review`, URL `https://example.test/fictional-qa-material`, version `QA-v1`, ngày `2026-10-18`, changelog ghi rõ hư cấu.

Không mở các URL example.test như tài liệu thật. Không sửa lớp business, schema, badge evidence lịch sử hoặc quyền người dùng. Các lần Save làm tăng revision của cấu hình lab QA theo cơ chế hiện có.

## Checks và bằng chứng

37/37 offline tests đạt; bổ sung regression trong test Studio cho revision/conflict và dirty navigation, test Product HTTP cho lỗi kết nối 503 so với token 401. Build/TypeScript, lint/Dependency Cruiser, negative boundary tests và local dev/API smoke đạt. Còn warning vòng type Workspace và chunk trên 500 kB đã có; không giấu warning bằng cách tăng ngưỡng.

Ignored proof folder: `apps/promptify-intrepid/outputs/revised-live-2026-10-18/`. Có `viewport-checks.json`, ảnh Hub desktop/mobile/materials/SOP/badge, ảnh Studio directory/Awards desktop/mobile. Ảnh Studio được chụp khi phần hỗ trợ lớp còn ở phía trên; thay đổi cuối đã chuyển phần đó xuống sau Studio, không thay dữ liệu/năm tab. Ảnh Hub là trạng thái runtime cuối của phiên QA.

Giới hạn: không kiểm ingest SOP thật, external quiz hoạt động, AI Generate/Judge hoặc cấp mới certificate vì không thuộc phép kiểm bố cục này và lớp QA chưa có các dữ liệu/cấu hình tương ứng. Không tuyên bố các nhánh đó đã UAT chỉ từ hình giao diện.
