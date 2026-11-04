# Slide bài giảng trong Promptify Intrepid

Bản giao việc cho Claude · 04/11/2026 · Phạm vi thực hiện ngay: code và kiểm thử local/offline trong `apps/promptify-intrepid`. Các bước staging ở cuối là kịch bản nghiệm thu cần chủ dự án cho phép riêng.

## 1. Kết quả sản phẩm

Giảng viên thêm một bộ slide vào lớp một lần, dùng lại cho nhiều lab. Mỗi lớp có thể có nhiều bộ và tối đa một bộ mặc định. Khi soạn lab trong Studio, giảng viên có thể giữ bộ mặc định, chọn một bộ riêng của cùng lớp hoặc tắt slide cho lab. Các thiết lập này thuộc cặp lớp–lab vì hai lớp có thể dùng chung một bài trong chương trình.

| Thiết lập của giảng viên | Hành vi học viên cần thấy |
|---|---|
| Chưa cấu hình gì | Lab hiện và hoạt động như hiện tại |
| Lớp có bộ mặc định, lab chưa cấu hình | Có tab Slides, mở từ trang 1 |
| Lab dùng bộ mặc định, đặt trang 13–24 | Mở lần đầu ở trang 13, hiển thị “Phần của bài: 13–24” |
| Lab chọn bộ riêng | Mở bản đã xuất bản của bộ đó, dù lớp có đổi bộ mặc định |
| Lab tắt slide hoặc chưa có bộ nào được xuất bản để hiển thị | Ẩn tab Slides với học viên |

Khoảng trang giúp điều hướng. Học viên có quyền mở bộ slide được xem toàn bộ PDF. Giảng viên cần tách tài liệu nếu có trang chứa đáp án, ghi chú nội bộ hoặc nội dung chỉ dành cho lớp khác. Cho phép bỏ trống khoảng trang để dùng cả bộ. Nếu chỉ nhập trang đầu, mặc định tới cuối bộ. Số trang trên giao diện tính từ 1.

## 2. Luồng giảng viên và học viên

**Quản lý lớp → Slide bài giảng.** Đặt mục này ở giao diện quản lý lớp mà giảng viên đang sử dụng. Hiện tên lớp được chọn, danh sách bộ slide, số trang, bản đang dùng, nhãn “Mặc định” và số lab đang dùng. Cho giảng viên có quyền chỉnh sửa chọn một trong hai nguồn:

1. **Tải PDF từ máy.** Chọn file, nhập hoặc sửa tên hiển thị, tải lên, xem trước và bấm Xuất bản. Không cần kết nối Drive cho luồng này.
2. **Chọn từ Google Drive.** Liệt kê PDF và Google Slides trong nguồn đã được cho phép của lớp. PDF được sao chép nguyên bản. Google Slides được xuất thành PDF. Nếu lớp chưa có thư mục được cấp quyền, giải thích cách liên hệ người quản trị và vẫn cho tải PDF từ máy. PPTX được hướng dẫn xuất PDF hoặc chuyển sang Google Slides.

Khi thay file PDF hoặc bấm **Lấy bản mới từ Drive**, tạo bản nháp mới. Màn xem trước hiển thị số trang cũ/mới và các lab bị ảnh hưởng; giảng viên rà lại khoảng trang rồi mới xuất bản đồng loạt. Nếu có khoảng trang vượt giới hạn của bản mới, cho sửa ngay trên bản nháp hoặc hủy. Bản đang dùng và các mốc trang cũ vẫn phục vụ cho tới khi lần xuất bản mới thành công. Kể cả khi tổng số trang bằng nhau, nhắc rà lại vì nội dung có thể đã chuyển trang.

**Studio → mở lab → Học liệu → Slide bài giảng.** Cho chọn “Theo mặc định của lớp / Chọn bộ khác / Tắt cho bài này”, nhập trang bắt đầu và kết thúc, xem trước tại đúng trang rồi lưu. Dùng cơ chế báo thay đổi chưa lưu và kiểm tra revision của Studio khi có thể. Nếu đổi bộ mặc định của lớp, hiển thị các lab kế thừa bị ảnh hưởng và kiểm lại mốc trang trước khi lưu. Khi gỡ một bộ đang dùng, yêu cầu chọn bộ thay thế hoặc xác nhận tắt slide ở các lab bị ảnh hưởng. Hiển thị tác động trước khi áp dụng.

**Lab → cột giữa → Prompt | Slides.** Prompt là tab mở đầu. Chỉ tải PDF và mã viewer khi người dùng bấm Slides. Giữ prompt, vị trí con trỏ nếu khả thi, attempt đang chọn và kết quả khi chuyển tab. Trong cùng lần mở lab, quay lại Slides phải trở về trang vừa xem. Khi đổi lớp, lab hoặc phiên bản, bỏ trạng thái xem cũ và mở đúng phần được gán. Viewer có trang trước/sau, số trang hiện tại/tổng số, nút “Về phần của bài”, vừa chiều ngang và toàn màn hình. Esc thoát toàn màn hình. Phím mũi tên chỉ đổi trang khi focus ở viewer. Có nhãn EN/VI, trạng thái đang tải, lỗi và Thử lại. Giữ hai cột còn lại của lab sử dụng được ở chế độ thường.

## 3. Thứ tự thực hiện

### A. Đọc code và chốt điểm tích hợp

- Làm theo AGENTS.md. Kiểm tra git status, đọc tài liệu bắt buộc và handoff mới nhất. Đối chiếu các cập nhật 02–03/11 trong `docs/evidence/RELEASE_ACCEPTANCE_2026-11-02.md`. Bảo toàn thay đổi của người khác.
- Lần theo UI đang render từ `ProductionApp.tsx` đến quản lý lớp, `ProductionStudioSource.tsx` và `ProductionWorkspaceV7.tsx`. Xác định vị trí tab giữa thực tế để giữ nguyên state editor khi đổi tab.
- Kiểm tra `productionServerService.ts`, `codelabLifecycleService.ts`, `workspaceSourcePolicyService.ts`, `driveFolderService.ts`, `sopIngestionService.ts` và `cloudStorageService.ts`. Hiện luồng SOP có upload riêng tư và kiểm nguồn Drive. Bộ lọc Drive chưa nhận Google Slides, còn nhánh export hiện xử lý Google Doc và Sheet. Việc hỗ trợ Slides chỉ mở rộng cho luồng học liệu.

### B. Mô hình dữ liệu và quyền

Dùng migration mới cùng rollback. Số dự kiến là 024 vì hiện repo kết thúc ở 023; kiểm tra lại trước khi tạo. Các thực thể logic bên dưới có thể gộp vào cấu trúc hiện có nếu vẫn bảo đảm ràng buộc ở database.

| Dữ liệu | Nội dung tối thiểu |
|---|---|
| Bộ slide của lớp | ID, class ID, tên, người tạo, phiên bản đã xuất bản, thời điểm cập nhật |
| Phiên bản PDF | Deck ID, loại nguồn, Drive file ID nếu có, object key và generation, kích thước, hash, số trang, trạng thái, người tạo |
| Mặc định lớp | Tối đa một deck của chính lớp đó |
| Gán theo lab | Khóa lớp + lab, chế độ kế thừa/chỉ định/tắt, deck nếu chỉ định, khoảng trang, revision |

Kiểm tra lab thuộc khóa học của lớp, deck và version cùng phạm vi. Ràng buộc tham chiếu và transaction phải ngăn việc gắn ID của lớp khác kể cả khi gọi API trực tiếp. Chỉ editor được phân công hoặc admin phù hợp mới sửa. Khi học viên mở slide, xác minh Firebase identity, quyền đọc lớp hiện tại, khả năng mở lab theo trạng thái/lịch/tier và phiên bản đã xuất bản. Dùng cùng quy tắc đọc hiện có đối với lớp đã kết thúc. Phân biệt quyền xem bản nháp của giảng viên và quyền xem của học viên. Áp RLS/grant theo cách repo đang dùng, kiểm tra cả các nhánh dùng service identity.

### C. Upload, import và xuất bản

- API cấp quyền upload ngắn hạn cho đúng object do server tạo. Trình duyệt gửi bytes trực tiếp tới kho riêng tư. Khi hoàn tất, server đối chiếu phiên upload, quyền editor, kích thước thực, định dạng PDF đọc được và số trang. Từ chối file rỗng, hỏng hoặc có mật khẩu nếu viewer không thể mở. Dùng key mới cho từng phiên bản và giữ nguyên bản đã xuất bản.
- Với Drive, kiểm quyền **cả lúc chọn lẫn lúc cập nhật**. Chỉ lấy file sau khi xác minh nguồn thuộc lớp. Có thể cấp Viewer cho tài khoản dịch vụ ở thư mục cha, nhưng chỉ liên kết thư mục con đúng lớp trong cấu hình cho phép. Ở MVP dùng cơ chế duyệt nguồn hiện có. Việc nhập Folder URL không tự cấp quyền trên Drive hoặc cho phép mở rộng phạm vi nguồn.
- PDF tải trực tiếp hoặc PDF có sẵn trên Drive: đề xuất tối đa 25 MiB như giới hạn file hiện tại. Google Slides dùng `files.export` với `application/pdf`; API Google giới hạn **10 MB cho dữ liệu được xuất**. Nếu vượt giới hạn, hướng dẫn xuất PDF thủ công rồi tải từ máy. Học viên đọc bản PDF riêng tư đã lưu nên không cần quyền Drive. [Google Drive files.export](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/export)
- Tách các thao tác chuẩn bị upload, hoàn tất/import, xem trước, xuất bản, đổi mặc định, lưu gán lab và mở bản đã xuất bản. Có thể dùng endpoint action hiện có. Payload phía học viên chỉ cần class ID + lesson ID; server tự xác định deck/version mà học viên được xem. Snapshot của lab chỉ cần metadata nhẹ. Cấp quyền đọc file theo yêu cầu khi mở; không lưu signed URL vào DB hoặc log. Nếu chọn signed URL, dùng TTL ngắn, xét lại quyền khi xin URL mới và ghi rõ URL đã cấp dùng được đến lúc hết hạn.
- Dùng request ID cho thao tác có thể gửi lại. Double-click hoặc retry sau lỗi mạng không tạo hai bản xuất bản. Kiểm tra quyền/revision lần cuối, đổi version và các mốc trang đã rà trong cùng transaction. Nếu Drive bị xóa file, thu hồi quyền, export lỗi hoặc upload dở, bản cũ vẫn xem được. Bản nháp hỏng không xuất hiện cho học viên.
- Giữ asset học liệu tách biệt với SOP, bao gồm đường dẫn lưu và quyền truy cập. Upload slide không chạy extraction để làm RAG, embedding, Gemini hoặc Judge. Nếu phải chỉnh bucket CORS, quyền hoặc cấu hình cloud, ghi rõ thay đổi cần thiết để xét ở bước staging.

### D. UI giảng viên, sau đó viewer học viên

Hoàn thành một luồng PDF local từ đầu đến cuối trước, rồi nối Google Slides vào cùng bước preview/xuất bản. Dùng component quản lý slide riêng để tránh nhồi thêm logic vào màn Studio. Trình xem PDF.js tải động bằng Vite, gồm worker tương thích với phiên bản thư viện đang dùng. Kiểm bằng build thực tế. Nếu hỗ trợ link trong PDF, bật lớp hiển thị liên kết, giới hạn giao thức an toàn và kiểm bằng file có link thật. Slide hiển thị là trang tĩnh, có thể mất animation, video và speaker notes.

## 4. Nghiệm thu

| Ca kiểm | Điều kiện đạt |
|---|---|
| Một lớp, một deck, hai lab | Upload một lần. Lab A mở trang 1, lab B mở trang 13. Chọn deck riêng cho B chỉ đổi B |
| Hai lớp dùng chung lesson | Cấu hình, metadata, preview và file của lớp A không lộ sang B. Gọi API với ID đoán được vẫn bị chặn |
| Kế thừa và gỡ | Đổi mặc định ảnh hưởng đúng lab kế thừa. Lab có override hoặc tắt giữ hành vi đã chọn. Gỡ deck không để liên kết hỏng |
| Bản nháp và cập nhật | Học viên vẫn xem v1 trong lúc editor chuẩn bị v2. Chặn mốc vượt tổng trang. Sau khi xác nhận, version và mốc trang đổi cùng nhau |
| Quyền và thời hạn | Viewer/learner không upload hoặc publish. Lab khóa, nguồn Drive ngoài lớp và user bị thu hồi quyền đều bị từ chối khi xin quyền mở mới |
| Lỗi và thao tác đồng thời | PDF giả/hỏng/quá lớn, Drive mất quyền, export quá giới hạn, retry upload và hai editor xuất bản cùng lúc đều có kết quả nhất quán |
| Trải nghiệm thực hành | Gõ prompt → xem trang khác → toàn màn hình → Esc → về Prompt. Nháp, attempt và output còn nguyên. Phím mũi tên trong editor vẫn di chuyển con trỏ |
| Hiệu năng và tương thích | Mở lab chưa tải PDF. Worker và trang PDF render được từ bản build. Kiểm laptop 1280×720, màn hẹp, EN/VI, bàn phím và học liệu link cũ |

Thêm test vào allowlist `tests/offline-tests.json`. Kiểm SQL/RLS và transaction bằng PGlite nếu phù hợp. Giả lập Drive/GCS trong offline suite, dùng PDF mẫu vô hại cho kiểm viewer. Chạy từ app: `npm run lint`, `npm run typecheck`, `npm run test:boundaries`, `npm run build`, `npm run test:smoke`, `npm test`. Ghi cụ thể ca nào chỉ kiểm code, ca nào chạy offline, ca nào cần browser hoặc staging.

## 5. Bàn giao và cổng staging

Bàn giao diff local, hướng dẫn thử bằng hai lớp/ít nhất hai lab, kết quả checks, lỗi còn mở, migration + rollback và cấu hình hạ tầng cần thiết. Điểm dừng của nhiệm vụ này là **CODE + OFFLINE**. Deploy, áp migration thật, đổi IAM/cloud, push và chạy live tests chỉ thực hiện khi chủ dự án yêu cầu riêng.

Khi được phép nghiệm thu staging, tuân thủ `docs/04_OPERATIONS.md`. Dùng dữ liệu giả, một PDF và một Google Slides được duyệt. Thử upload/import, xuất bản và cập nhật từ tài khoản editor, mở từ học viên đúng lớp, từ chối học viên lớp khác, kiểm quyền sau thu hồi và xác nhận đóng viewer giữ nháp. Kiểm cả CORS, signed URL/worker trên origin Hosting thực tế; đánh dấu LIVE riêng cho từng ca thực sự đã chạy.
