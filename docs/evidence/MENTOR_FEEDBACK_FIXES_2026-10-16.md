# Sửa feedback thầy và các lỗi UI

> Ghi chép lượt sửa trước. Trạng thái mới nhất và phần đã hoàn thiện tiếp nằm trong [báo cáo hoàn thiện](MENTOR_FEEDBACK_COMPLETION_2026-10-16.md). Các mục “còn thiếu” dưới đây là trạng thái tại thời điểm lượt trước.

## Đã sửa ở Intrepid

- RAG: context sau retrieval được truyền cho AI; snapshot/hash cho Judge lưu đúng ngữ cảnh đó. Giữ canonical fallback và kiểm quyền trước provider. Test evidence được đổi để kiểm context retrieved thực sự được sử dụng.
- Run: sau khi server trả kết quả thành công, request ID được kết thúc; lần bấm Run tiếp tạo attempt mới dù prompt giống nhau. Request lỗi vẫn giữ ID để retry tránh gọi provider trùng. Chặn bấm chồng bằng activeWrite.
- Studio đang chạy (`ProductionStudioSource`): thêm nút Lưu cấu hình ngay trên màn, trạng thái chưa lưu, cảnh báo khi đóng tab; sandbox bị chặn khi cấu hình chưa lưu. Chỉnh cấu hình hoặc sandbox prompt sẽ xóa kết quả test cũ để không gán kết quả sai. Test handler offline xác nhận chưa lưu không gọi sandbox và sau lưu mới chạy được.
- Học liệu chung: thêm bộ lọc pillar; lọc bài học bằng ID thay vì title để hai bài cùng tên không bị trộn.
- Workspace: Compare được nâng thành nút chính và chỉ mở khi có tối thiểu hai attempt; Run giữ nút chính.
- Link Help ở UI-01 đã nối mailto tới contact L&D vốn có trong UI-03, thay link `#`. Đây là contact hiện có; chưa phải routing hỗ trợ theo từng đối tác.

## Các lỗi/góp ý UI thầy nêu trong video

| Timestamp | Góp ý | Trạng thái sau lượt sửa |
| --- | --- | --- |
| 00:00:47–00:07:52 | Google login cần chọn tài khoản rõ, email ngoài roster có hướng dẫn hỗ trợ | Account picker đã có; link hỗ trợ không còn `#`. Contact theo client/class và form theo dõi yêu cầu còn thiếu. |
| 00:08:33–00:12:43 | Đăng nhập chậm; có tài khoản không thấy dropdown phòng ban | Chưa tái hiện trên OAuth/live; không kết luận đã sửa tốc độ từ test offline. |
| 00:28:51–00:31:24 | Nút xác nhận/sửa hồ sơ nên nằm trong card, cho cập nhật thông tin thiếu | Luồng confirm/correction đã có; chưa sửa bố cục card hay bổ sung employee ID/office location ở lượt này. |
| 00:33:08–00:37:43 | Gom thông tin riêng tư vào profile; card resume/tiến độ/metric rõ | Resume có sẵn; profile tập trung và timeSpent thật còn thiếu. |
| 00:37:43–00:41:38 | Pillar/category, chi tiết lab, trạng thái khóa/lịch phải rõ | Đã bổ sung pillar filter học liệu và ID bài; lịch/quyền có code, cần kiểm dữ liệu 7 lab và browser UAT. |
| 00:43:34–00:44:03 | Run và Compare chưa đủ nổi bật | Compare đã nâng thành nút chính bên cạnh toolbar; Run đã là nút chính. Chưa có đối chiếu screenshot sau sửa. |
| 00:49:30–00:53:34 | Rubric 100%, sandbox đúng cấu hình, Save rõ tránh thay đổi nhầm | Đã thêm Save tại chỗ, dirty state và guard sandbox trên Studio đang mount. |
| 00:59:01–01:00:38 | Nút chèn scaffold chưa tốt, nhận diện đếm sai, nút chạy bị khuất ở prototype | V7 hiện có chip dialog và Run riêng; lỗi đếm/nút khuất trong prototype chưa được tái hiện trên app hiện tại. |
| 01:00:45–01:01:42 | Vùng output/log cần cuộn, ẩn/mở score hợp lý | V7 có log/score dạng details; cần visual UAT, không cam kết cung cấp suy luận nội bộ của provider. |
| 01:03:20–01:06:04 | Chuyển attempt và compare phải dùng dữ liệu đã lưu; mỗi run ngữ cảnh mới | Đã sửa kết thúc request sau thành công để tạo lượt mới; history/compare có sẵn. |
| 01:06:14–01:09:16 | Chèn đúng đoạn/trang SOP, citation thay đổi theo đoạn | Đã sửa context RAG đưa vào provider; viewer deep-link từng trang còn cần test với PDF thật. |
| 01:12:49–01:13:18 | Header/icon/ngôn ngữ/sign-out bị lặp | Chưa thay cấu trúc navigation; cần kiểm từng màn và quyền trước khi gỡ thao tác. |

## Kiểm tra và phần còn lại

Build/typecheck PASS; lint PASS với cảnh báo vòng type Workspace đã có; boundaries PASS; 33/33 test offline hiện có PASS. Test mới `verify_mentor_studio.mjs` PASS và đã thêm vào allowlist. Dev/API smoke PASS khi cho phép truy cập localhost (lần chạy sandbox bị chặn kết nối localhost).

Chưa có browser visual UAT/OAuth/DB/provider live. Không deploy, migration hoặc sửa MVP. Các file trước khi sửa được giữ trong ignored `outputs/mentor-feedback-baseline`.

Các khoảng cách trong báo cáo `MEETING_CODE_GAPS_2026-10-15.md` chưa được coi là hoàn tất toàn bộ: template roster đa tab/lịch theo mốc, variables binding, click analytics, contact theo đối tác, field hồ sơ, KPI/ROI và cloud rollout vẫn cần triển khai riêng. Lượt này hoàn tất các bản sửa cụ thể liệt kê ở trên; không tạo dữ liệu đo lường hoặc contact đối tác giả.
