# Promptify Product and Business Gap Analysis

## 1. Phạm vi và nguồn đối chiếu

Tài liệu này đối chiếu định hướng kinh doanh mới với trạng thái sản phẩm đã audit, để người phụ trách sản phẩm quyết định phạm vi trước khi đi tiếp. Kết luận chính: Promptify đã có nền tảng thực hành phù hợp với định hướng Learning Product; các khoảng trống lớn nằm ở thương mại hóa, quản trị doanh nghiệp, đo năng lực và hiệu quả đào tạo, vận hành học liệu/lớp học, và chia sẻ tri thức trong tổ chức.

**As-Is:** chỉ lấy từ `docs/as-is-audit/`, audit ngày 2026-10-05 tại local commit `06a45056dac2cd0f1c7396b675495fd34364f4c9`. Audit chưa chứng nhận trạng thái deployment hoặc database production. Pha này không đọc lại code để thay đổi baseline.

**To-Be:** file người dùng cung cấp: [Prompt Eng for AI Engineer vs Business Users __ Linh Phạm + Khang + Dương (5).docx](<C:/Users/Admin/Downloads/Prompt Eng for AI Engineer vs Business Users __ Linh Phạm + Khang + Dương (5).docx>). Tiêu đề bên trong là “KẾ HOẠCH CẬP NHẬT TÀI LIỆU BRD & PRD DỰ ÁN PROMPTIFY (REFINED BUSINESS VERSION)”. Trong tài liệu này, gọi nguồn đó là **Refined BRD**. Đây là tài liệu trộn định hướng kinh doanh, nhận định As-Is, đề xuất kỹ thuật, schema và roadmap; các lớp nội dung này được phân biệt khi đối chiếu.

**Tham chiếu As-Is dùng trong ma trận:**

| Mã | Nguồn audit | Phạm vi bằng chứng |
| --- | --- | --- |
| A01 | [01_SYSTEM_OVERVIEW.md](../as-is-audit/01_SYSTEM_OVERVIEW.md) | Định vị hiện tại, curriculum, nguồn dữ liệu và giới hạn audit |
| A02 | [02_FEATURE_INVENTORY.md](../as-is-audit/02_FEATURE_INVENTORY.md) | 33 capability và mức Real / Partial / Mock |
| A03 | [03_DATABASE_AND_SQL.md](../as-is-audit/03_DATABASE_AND_SQL.md) | Các khái niệm user, learner, enrollment, class, course, progress hiện có |
| A05 | [05_USER_FLOWS.md](../as-is-audit/05_USER_FLOWS.md) | Luồng learner/instructor và ý nghĩa completion |
| A06 | [06_AI_FLOW.md](../as-is-audit/06_AI_FLOW.md) | Run, Judge, rubric, control data và mô phỏng |
| A07 | [07_ACCESS_CONTROL.md](../as-is-audit/07_ACCESS_CONTROL.md) | Phạm vi quyền, hết hạn và độ tin cậy điểm |
| A08 | [08_TECH_DEBT_AND_RISKS.md](../as-is-audit/08_TECH_DEBT_AND_RISKS.md) | Giới hạn hiện tại ảnh hưởng trải nghiệm/quản trị |
| A10 | [10_AS_IS_EXECUTIVE_SUMMARY.md](../as-is-audit/10_AS_IS_EXECUTIVE_SUMMARY.md) | Tổng kết và các điểm chưa xác nhận |

Không tạo PRD/SAD, target architecture, kế hoạch migration hoặc backlog implementation. Những câu hướng dẫn triển khai, SQL và checkbox `[x]` trong DOCX là nội dung nguồn, không phải lệnh thực thi hay bằng chứng đã nghiệm thu.

## 2. Refined BRD muốn sản phẩm trở thành gì

### 2.1. Định vị sản phẩm

Theo §1–1.1, Promptify hướng tới một **nền tảng học và thực hành Prompt Engineering cho nhân sự nghiệp vụ**, gắn với công việc ngân hàng và doanh nghiệp. Giá trị là giúp người học tự điều khiển AI và hiểu vì sao prompt hiệu quả, qua vòng lặp **Thử → Sửa → So sánh → Hiểu**.

Luồng học gồm bảy bước: Scenario → Prompt → Run → Output → Improve & Rerun → Compare → Learn. Người học viết prompt, quan sát đầu ra, cải tiến và đối chiếu hai lần thử. Control Data và cấu hình mô hình được cố định để tập trung việc học vào biến số prompt (§1.1).

As-Is đã là webapp học/thực hành cho người dùng nghiệp vụ (A01/A10). Vì vậy không lấy mô tả trong Refined BRD rằng sản phẩm hiện chỉ là công cụ AI chung chung làm kết luận hiện trạng. Hướng mới củng cố giá trị học tập và mở rộng năng lực thương mại B2B; không có căn cứ yêu cầu thay toàn bộ sản phẩm hiện có.

### 2.2. Target users và stakeholders

| Nhóm | Nhu cầu được nêu trong Refined BRD | Điểm chưa rõ |
| --- | --- | --- |
| Cán bộ ngân hàng non-tech | CSKH, Truyền thông & Thương hiệu, Thẩm định & Quản lý Tín dụng; thực hành tình huống theo nghiệp vụ (§1.1) | Nhóm ưu tiên pilot và mức nền tảng AI đầu vào — **Needs confirmation** |
| Nhân viên văn phòng/nghiệp vụ B2B | Áp dụng AI vào văn bản, dữ liệu và quy trình làm việc (§1.1–1.2) | Ngành/phòng ban đầu tiên ngoài ngân hàng — **Needs confirmation** |
| Người trải nghiệm BASIC | Học 1–2 bài nền tảng, tham gia lớp public, hạn mức AI và thời hạn thử nghiệm (§1.3) | Trải nghiệm cá nhân hay được doanh nghiệp mời; điều kiện chuyển đổi — **Needs confirmation** |
| Enterprise Admin / L&D Manager / PIC | Quản lý nhân sự theo tổ chức, cấp quyền, theo dõi năng lực và hiệu quả đào tạo (§1.3, §2.2–2.4) | Ai mua, ai vận hành lớp, ai được xem dữ liệu cá nhân — **Needs confirmation** |
| Giảng viên / chuyên gia nội dung | Dạy và quản lý học liệu; vendor_tutor được nêu trong mở rộng đối tác (§2.5, §4.3) | Quyền tác giả, giảng dạy, duyệt và sở hữu nội dung — **Needs confirmation** |
| Partner / đối tác tuyển sinh | Referral, chuyển đổi trả phí, báo cáo chia sẻ doanh thu (§2.5, §4.3) | Partner và doanh nghiệp khách hàng có phải cùng loại chủ thể — **Needs confirmation** |

Tên file có “AI Engineer”, nhưng nội dung định hướng xác định người dùng trọng tâm là non-tech/business. Không tự bổ sung AI Engineer như một persona sản phẩm riêng.

### 2.3. Core learning value

Ba trụ cột ở §1.2:

1. **LLM Foundation for Business:** hiểu LLM theo cách không đòi hỏi lập trình; Zero-shot, One-shot, Few-shot; cấu trúc bảy thành phần Role, Context, Task, Constraint, Format, Example, Evidence.
2. **Text Generation Control:** kiểm soát vai trò, bối cảnh, định dạng, độ dài, văn phong và ràng buộc; đầu ra có thể đưa vào công việc.
3. **Workflow AI Integration & Grounding:** bám tài liệu/quy định, xử lý PII trước khi gửi AI và suy luận có cấu trúc cho nhiệm vụ phức tạp.

Giá trị học tập cần phân biệt ba kết quả: đã tham gia/thực hành, đã hiểu hoặc đạt năng lực, và đã tạo hiệu quả trong công việc. Refined BRD nêu cả ba nhưng chưa định nghĩa phép đo đủ rõ để coi chúng tương đương.

### 2.4. Business và B2B needs chính

- **Freemium → Enterprise:** BASIC miễn phí và ADVANCE trả phí, khác bài học, quyền AI, hạn mức và quản trị (§1.3, §2.1).
- **Tổ chức ba cấp:** Client → Branch → Department, phục vụ quản lý và báo cáo theo đơn vị (§2.2).
- **Vận hành lớp nhanh:** đồng bộ roster và quyền truy cập từ Google Sheets; nạp tài liệu nghiệp vụ từ nguồn doanh nghiệp (§2.3).
- **Chứng minh hiệu quả đào tạo:** pre/post Mastery, tỷ lệ hoàn thành, tuân thủ định dạng/ràng buộc và giờ làm việc tiết kiệm (§2.4).
- **Tri thức dùng chung:** thư viện prompt theo PERSONAL / DEPARTMENT / ENTERPRISE (§2.4).
- **Mở rộng đối tác:** partner/vendor_tutor, referral và chia sẻ doanh thu (§2.5).
- **Học liệu thực tế:** chuẩn hóa slide/workshop/hands-on của Agribank và Intrepid (§2.6).
- **B2B onboarding:** thu thập MST, PIC, nhu cầu và KPI; đề xuất lộ trình phù hợp (§2.2, §4.3).

### 2.5. Chỉ tiêu được nêu và trạng thái xác nhận

| Chỉ tiêu trong nguồn | Cách dùng ở pha này |
| --- | --- |
| Mastery từ 50% lên >80%; completion >85% (§1.2, §2.4) | Mục tiêu kinh doanh được nêu; baseline, công cụ đo, mẫu số và thời điểm đo **Needs confirmation** |
| Thiết lập/cấp quyền L&D từ 60 phút xuống <5 phút (§1.2, §2.3) | Mục tiêu giảm công vận hành; điểm bắt đầu/kết thúc và phạm vi thao tác **Needs confirmation** |
| Sync 50 học viên trong chu kỳ 5 phút (§4.1) | Kịch bản nghiệm thu được đề xuất; 5 phút có phải SLA bắt buộc **Needs confirmation** |
| Dashboard trả kết quả lọc trong <1.5 giây; chia sẻ prompt xuất hiện ngay (§4.2) | Kỳ vọng trải nghiệm; tải dữ liệu, quy mô và nghĩa của “ngay” **Needs confirmation** |
| ADVANCE không giới hạn lượt trong thời gian class active (§1.3) | Chính sách gói được nêu nhưng mâu thuẫn ví dụ max_daily_prompts=100 ở §3.2; **Needs confirmation** |
| Hơn 80% người dùng nghiệp vụ có nhu cầu AI cao (§1) | Nhận định trong nguồn chưa có dẫn chứng đi kèm; không dùng như số liệu đã kiểm chứng |

## 3. Quy tắc quyết định

- **KEEP:** giữ capability/giá trị hiện có phù hợp với To-Be. Không có nghĩa toàn bộ implementation đã đạt tiêu chuẩn Enterprise.
- **REBUILD:** capability đã có nhưng hành vi, phạm vi, chính sách hoặc kết quả sử dụng chưa đáp ứng To-Be. Đây là quyết định ở mức sản phẩm; không mặc định viết lại toàn bộ code hay đổi kiến trúc.
- **NEW:** thêm một capability nghiệp vụ chưa có bằng chứng trong audit. Có thể tận dụng nền tảng hiện tại; không mặc định xây lại từ đầu.
- **DROP:** bỏ một capability hoặc chính sách hiện tại khi có căn cứ kinh doanh rõ ràng. Refined BRD chưa yêu cầu bỏ dứt khoát một tính năng cụ thể; ma trận không tạo DROP để đủ nhãn.

Các quyết định là đề xuất cho phạm vi sản phẩm. Nhãn **Needs confirmation** chỉ phần chưa được nguồn xác định đủ rõ; không dùng đề xuất kỹ thuật để lấp khoảng trống đó.

## 4. Ma trận Requirement / Capability

| Requirement / Capability và nguồn To-Be | As-Is status từ audit | Decision | Reason |
| --- | --- | --- | --- |
| R01. Learning Product cho non-tech/business (§1–1.1) | Đã tập trung học/thực hành cho người dùng nghiệp vụ, có learner/instructor flow (A01/A05/A10) | KEEP | Định vị cốt lõi đã phù hợp; cần củng cố giá trị học và phạm vi B2B, không mặc định thay sản phẩm |
| R02. Scenario → Prompt → Run → Output → Improve/Rerun (§1.1) | Có brief/task/data/editor, live output và nhiều lần thử (A02/A05) | KEEP | Đây là nền của vòng lặp học mới; giữ trải nghiệm thực hành chủ động |
| R03. Compare Before/After giữa V1/V2 thật và rút bài học (§1.1) | Compare attempts thật có; reference compare dùng sample và nhận xét business heuristic (A02/A05) | REBUILD | Cần đảm bảo người học nhận biết và đối chiếu hai lượt thực hành thật; tiêu chí “Hiểu” sau compare **Needs confirmation** |
| R04. Control Data và cấu hình cố định để prompt là biến học tập (§1.1) | Có sample input; system instruction còn chỉnh được; nhiều provider/model fallback; attempt thiếu snapshot đầy đủ (A05/A06) | REBUILD | Điều kiện thử nghiệm chưa bảo đảm chỉ prompt thay đổi. Model khác nhau giữa tier và bài có cấu hình nâng cao cần chốt ngoại lệ |
| R05. Bảy thành phần prompt và khung gợi ý (§1.1–1.2) | Structure/highlight bảy thành phần, autocomplete và snippet theo bài đã có (A02) | KEEP | Đáp ứng hướng dẫn viết prompt cho non-tech. Evidence và Grounding cần thống nhất cách gọi, không tự tạo thành phần thứ tám |
| R06. Foundation, Zero/One/Few-shot, text control, grounding (§1.2) | Có curriculum, nội dung tester và LAB; không có bằng chứng full mapping ba trụ cột mới (A01/A02) | REBUILD | Giữ nội dung phù hợp rồi chuẩn hóa coverage/lộ trình; danh mục bắt buộc và chuẩn đầu ra **Needs confirmation** |
| R07. Judge feedback năm tiêu chí 0–2, tổng 0–10 (§2.4) | Live Judge/retry có; hợp đồng điểm và phản hồi đã có; độ tin cậy score còn giới hạn (A02/A06/A07) | KEEP | Giữ capability phản hồi rubric cho thực hành. Dùng làm chứng nhận năng lực phải qua R18, không chỉ đổi thang điểm |
| R08. Coach giúp hiểu nguyên lý sau thực hành (§1.1) | Coach rule-based/clipboard, chưa conversational LLM (A02/A05) | REBUILD | Cần chốt coaching outcome và cách giải thích theo bài/lượt chạy; BRD chưa đủ để quyết định conversational AI có bắt buộc hay không |
| R09. PII scrubbing trước khi gửi AI (§1.2) | Detect/redact heuristic, có tên mẫu/regex; không bảo đảm ngăn dữ liệu nhạy cảm gửi đi (A02/A06/A07) | REBUILD | Mục tiêu an toàn nghiệp vụ vượt khả năng trợ giúp hiện tại; loại dữ liệu và policy cảnh báo/chặn **Needs confirmation** |
| R10. Dùng output trong báo cáo/Excel/Sheets (§1.2) | Có output Markdown/copy và kiểm định dạng; không có bằng chứng nghiệm thu paste đúng mọi công cụ (A01/A02) | REBUILD | Cần chứng minh khả năng dùng trong công việc với mẫu đích. Không tự thêm tích hợp API Sheets vào capability copy/paste |
| R11. BASIC 1–2 bài, ADVANCE 6–8 bài/ngành (§1.3, §2.1) | Có enrollment và published curriculum; chưa có tier thương mại/lesson entitlement (A02/A03/A05) | NEW | Quyền truy cập theo lớp không tương đương quyền gói. Danh mục bài và đơn vị mua gói **Needs confirmation** |
| R12. Giới hạn AI và quyền sử dụng khác nhau theo gói (§1.3) | Live/simulated và cấu hình provider có; chưa có quyền AI/quota theo BASIC/ADVANCE (A02/A06) | NEW | Đây là quyền lợi gói mới. Số lượt, reset và ADVANCE “unlimited” **Needs confirmation**; model cụ thể chưa là lựa chọn triển khai được duyệt |
| R13. Hết hạn thử nghiệm/lớp và hành vi read-only/paywall (§1.3, §2.1) | Có class dates/enrollment status nhưng kiểm expiration chưa nhất quán (A02/A07) | REBUILD | Cần chính sách quyền sau hết hạn cho từng hành động; read-only hay ngắt hoàn toàn được nêu như lựa chọn, **Needs confirmation** |
| R14. Thu phí, kích hoạt ADVANCE và chuyển đổi BASIC → Enterprise (§1.3, §2.1, §4.3) | Không có commercial subscription/payment/conversion flow trong audit (A02/A03) | NEW | Có nhu cầu thương mại hóa, nhưng nguồn chưa chốt mua theo cá nhân, seat, class hay hợp đồng và quy trình thanh toán/kích hoạt |
| R15. Client → Branch → Department và quản lý theo tổ chức (§1.3, §2.2) | Có client/class và department mô tả; chưa có hierarchy/membership B2B đầy đủ (A03/A07) | REBUILD | Giữ các khái niệm client/class/course, mở rộng hành vi quản trị tổ chức; không giả định clients hoàn toàn chưa tồn tại |
| R16. Quyền Enterprise Admin/L&D Manager/giảng viên theo phạm vi (§2.2–2.4, §4.2) | Learner/instructor/admin; admin dùng cùng shell; instructor scope global (A02/A05/A07) | REBUILD | Quản trị khách hàng B2B đòi hỏi phạm vi tổ chức và trách nhiệm rõ ràng; quyền xem xuyên đơn vị **Needs confirmation** |
| R17. Pre-course và Post-course Mastery, mục tiêu >80% (§1.2, §2.4) | Có Judge score từng attempt/best score; chưa có assessment pre/post; completion là persisted run (A05/A06/A07) | NEW | Đo kiến thức/năng lực trước-sau là capability mới; không thể coi Judge x10 là phép đo Mastery đã hợp lệ |
| R18. Báo cáo completion và mức đạt học tập đủ tin cậy (§1.2, §2.4) | Progress/attempts/KPI có thật; enrollment completed, lesson completed và điểm có nghĩa khác nhau (A05/A07/A10) | REBUILD | Phải thống nhất định nghĩa “hoàn thành”, “đạt” và “tiến bộ” trước khi dùng mục tiêu >85% và >80% |
| R19. L&D analytics lọc theo branch/department, tuân thủ và giờ tiết kiệm (§2.4, §4.2) | Dashboard có tiến độ/activity snapshot; chưa có ROI/time-saving hoặc báo cáo branch/department (A02/A05) | NEW | Đây là thông tin quản trị mới; công thức ROI, dữ liệu nguồn và quyền truy cập **Needs confirmation** |
| R20. Enterprise Prompt Library PERSONAL/DEPARTMENT/ENTERPRISE (§1.3, §2.4) | Save/search/star/copy local; chưa có chia sẻ tổ chức, scope hoặc nạp editor bảo đảm (A02/A05) | REBUILD | Giữ tiện ích tạo/lưu/tìm prompt, thay đổi trải nghiệm sở hữu/chia sẻ để trở thành tài sản tri thức dùng chung |
| R21. BASIC library browser-local (§1.3) | Library local hiện có, storage chưa tách account (A02/A05/A07) | KEEP | Phương thức lưu local được nguồn nêu cho BASIC; không mặc định giữ giới hạn lẫn dữ liệu người dùng. Quan hệ với library PERSONAL khi nâng gói **Needs confirmation** |
| R22. Đồng bộ roster, mã lớp và thời hạn từ Google Sheets (§2.3, §4.1) | Enrollment thủ công thật và public self-enroll; chưa có auto roster sync (A02/A05) | NEW | Tự động hóa khâu vận hành mới; quy tắc thêm/sửa/xóa/thu hồi và quyền ưu tiên nguồn **Needs confirmation** |
| R23. Nạp tài liệu nghiệp vụ từ nguồn doanh nghiệp làm control/grounding (§2.3) | Lesson context/resources có thể quản lý; chưa có tự nạp từ nguồn doanh nghiệp (A01/A02) | NEW | Thêm khả năng đưa học liệu được phép dùng vào bài; không mặc định nhu cầu này yêu cầu retrieval/vector DB/agent |
| R24. Course/module/lesson, xuất bản và giảng viên quản lý nội dung (§2.6) | Curriculum management đã có thật (A02/A03/A05) | KEEP | Cấu trúc và công việc biên tập hiện tại phù hợp chuẩn hóa học liệu; việc bổ sung chương trình đầy đủ là R25 |
| R25. Số hóa đầy đủ Agribank 4 giờ và Intrepid từ slide/workshop/hands-on (§2.6, §4.1) | Có 8 LAB specs, tester lessons và 22 Markdown; audit chưa chứng minh bao phủ toàn bộ hai chương trình (A01/A03) | REBUILD | Khoảng trống là độ đầy đủ/chính xác của học liệu. Bộ slide gốc, phiên bản và quyền sử dụng **Needs confirmation** |
| R26. MST/PIC/AI Discovery và đề xuất lộ trình B2B (§2.2, §4.3) | Có clients/classes nhưng chưa có onboarding discovery/lộ trình đề xuất (A02/A03) | NEW | Thu thập nhu cầu và hỗ trợ chọn chương trình là capability mới. AI gợi ý hay tự phê duyệt lộ trình **Needs confirmation** |
| R27. Partner/vendor_tutor và portal đối tác (§2.5, §4.3) | Ba role hiện có; chưa có đối tác thương mại hoặc portal tương ứng (A02/A03/A05) | NEW | Chủ thể nghiệp vụ và phạm vi công việc mới; cần tách recruiter, author và trainer trước khi xác định quyền |
| R28. Referral, paid conversion và chia sẻ doanh thu theo hợp đồng (§2.5, §4.3) | Audit không có tracking referral/revenue sharing (A02/A03) | NEW | Nhu cầu kinh doanh được nêu rõ nhưng thiếu attribution, cơ sở doanh thu, hoàn tiền và đối soát; chưa đủ implement |

Ma trận có **6 KEEP / 12 REBUILD / 10 NEW / 0 DROP** trên 28 đơn vị yêu cầu. Đây là cách chia phạm vi phân tích, không là số feature/tickets cần phát triển. Các hàng NEW/REBUILD chưa xác nhận không tự trở thành cam kết phát hành.

### 4.1. Capability hiện có mà BRD chưa quyết định giữ hay bỏ

| Capability | Quyết định business hiện có trong nguồn |
| --- | --- |
| Google Login cụ thể | Cơ chế identity hiện có hỗ trợ learner flow; nguồn không chốt nhà cung cấp đăng nhập cho B2B — **Needs confirmation**, không tự đề xuất đổi |
| Tutorial, hints, solution | Hỗ trợ thực hành hiện tại; chưa chốt yêu cầu mở trợ giúp/ảnh hưởng assessment — **Needs confirmation**, chưa có căn cứ DROP |
| Simulated mode và sample reference compare | Nguồn nhấn mạnh run và compare thật, nhưng không cấm demo/onboarding — **Needs confirmation** về phạm vi giữ mẫu minh họa |
| History/export/clear | Nguồn nói về library/analytics, chưa quy định lịch sử cá nhân, thời gian lưu hoặc export — **Needs confirmation** |
| Notebook legacy không reachable | Nguồn không yêu cầu Notebook và không chỉ đạo xóa code; không suy diễn DROP hoặc kích hoạt lại |

## 5. Năm gap quan trọng nhất

Ưu tiên dưới đây là đánh giá product/business phục vụ quyết định phạm vi, dựa trên định hướng và mức ảnh hưởng; không là lịch sprint hay kế hoạch kỹ thuật được duyệt. Nhu cầu đối tác/revenue sharing vẫn được ghi đầy đủ ở R27–R28; nguồn đặt nó ở P2 (§4.3), nên chưa đưa vào năm gap nền tảng.

### G1. Quyền lợi gói và chuyển đổi thương mại chưa được định nghĩa và vận hành

**To-Be:** BASIC/ADVANCE khác nội dung, AI, hạn mức, thời hạn và quản trị (§1.3, §2.1). **As-Is:** quyền dựa trên enrollment/published course, chưa có gói thương mại hoặc thu phí; expiration còn partial (A02/A07).

**Business impact:** chưa thực hiện được phễu Free → Paid/Enterprise và chưa thể hứa quyền lợi gói nhất quán. **Decision:** NEW cho entitlement/quota/conversion, REBUILD chính sách hết hạn. **Needs confirmation:** ai mua gói, mua cho ai, kích hoạt bằng gì; 1–2/6–8 bài nào; unlimited hay 100 lượt/ngày; hết hạn được đọc/lưu/export/chạy lại đến mức nào.

### G2. Quản trị và ranh giới dữ liệu doanh nghiệp chưa đáp ứng mô hình B2B ba cấp

**To-Be:** quản lý Client/Branch/Department và báo cáo đúng đơn vị (§2.2, §4.2). **As-Is:** đã có clients/classes và enrollment; department mô tả, instructor scope global; chưa có đầy đủ membership/hierarchy/admin riêng (A03/A05/A07).

**Business impact:** chưa có cơ sở để phân trách nhiệm và bảo đảm khách hàng chỉ thấy dữ liệu thuộc phạm vi được phép. **Decision:** REBUILD trải nghiệm quản trị theo tổ chức, giữ nền class/course/enrollment. **Needs confirmation:** quản lý trung tâm so với branch/department; học viên thuộc nhiều đơn vị; giảng viên nội bộ/ngoài doanh nghiệp được xem gì.

### G3. Chỉ số thực hành hiện tại chưa chứng minh Mastery hoặc ROI đào tạo

**To-Be:** pre/post Mastery >80%, completion >85%, tuân thủ và giờ tiết kiệm (§1.2, §2.4). **As-Is:** điểm Judge theo lượt, progress/completion và activity có; completed là run được lưu, không là đạt năng lực; độ tin cậy score còn giới hạn (A05/A06/A07).

**Business impact:** L&D chưa có phép đo đáng tin để kết luận người học tiến bộ hay đầu tư đào tạo có hiệu quả. **Decision:** NEW assessment/impact reporting, REBUILD ý nghĩa completion. **Needs confirmation:** đo kiến thức hay chất lượng prompt/output; pre/post tương đương ra sao; tiêu chí đạt; baseline và công thức giờ tiết kiệm. Không tự coi rubric 0–10 nhân 10 là Mastery.

### G4. Vận hành lớp và học liệu thực tế chưa đạt mục tiêu triển khai nhanh

**To-Be:** tự động roster/quyền từ Sheet, nạp tài liệu nghiệp vụ và số hóa Agribank/Intrepid; mục tiêu công vận hành <5 phút (§1.2, §2.3, §2.6, §4.1). **As-Is:** enrollment/curriculum editor có thật nhưng thao tác chủ yếu thủ công; có seeds/specs, chưa có bằng chứng full chương trình hoặc auto sync (A01/A02/A05).

**Business impact:** mở rộng workshop/lớp B2B còn phụ thuộc thao tác và chuẩn bị nội dung, chưa chứng minh tốc độ hay độ sát thực cam kết. **Decision:** NEW automation/intake, REBUILD coverage học liệu, KEEP curriculum management. **Needs confirmation:** nguồn roster chuẩn, xung đột sửa thủ công, tài liệu gốc/quyền dùng, người duyệt bài, và <5 phút đo công người hay độ trễ hệ thống.

### G5. Prompt chưa trở thành tài sản tri thức dùng chung có kiểm soát

**To-Be:** PERSONAL/DEPARTMENT/ENTERPRISE library, đồng nghiệp đúng phạm vi thấy và sử dụng prompt SOP (§2.4, §4.2). **As-Is:** library lưu browser, chưa có chia sẻ tổ chức; thao tác nạp prompt vào editor chưa nối đúng; browser data chưa tách account (A02/A05/A07).

**Business impact:** chưa bảo đảm kiến thức được tái sử dụng xuyên thiết bị/đồng nghiệp, kiểm soát phạm vi hoặc tồn tại sau khi người tạo rời tổ chức. **Decision:** REBUILD library workflow, giữ tiện ích save/search/copy. **Needs confirmation:** ai được publish/sửa/duyệt SOP; sở hữu khi chuyển đơn vị/nghỉ việc; PERSONAL liên hệ thế nào với BASIC local; migration dữ liệu cũ có yêu cầu giữ nguyên không.

## 6. Năm thứ nên giữ lại

1. **Luồng tự viết và cải tiến prompt trong tình huống nghiệp vụ.** Có scenario/task/data/editor/run/output thật; phù hợp trực tiếp §1.1. Giữ việc người học tự thực hành, không tự biến toàn bộ bài thành auto-answer (A02/A05).
2. **Attempts/versioning và nền so sánh hai lần chạy.** Đã lưu prompt/output theo lesson/class và có A/B compare; phù hợp vòng lặp sửa–so sánh. Giữ lịch sử thực hành, đồng thời phân biệt mẫu demo với lượt thật (A02/A05).
3. **Structure guidance bảy thành phần.** Phát hiện/highlight và gợi ý theo bài hỗ trợ người mới; phù hợp Structure Chips trong BRD. Không cần đổi thành AI gọi mỗi lần gõ để chứng minh giá trị học (A02).
4. **Mô hình nội dung Course → Module → Lesson và công cụ quản lý/xuất bản.** Nền quản trị giáo trình đã có; phù hợp số hóa chương trình ngành. Giữ năng lực biên tập và tái dùng course cho class, không coi curriculum hiện chưa tồn tại (A02/A03/A05).
5. **Live generation và feedback rubric có tách mô phỏng.** Run/Judge/retry thật hỗ trợ vòng lặp học; mô phỏng không được ghi thành completion thật. Giữ capability này, nhưng không coi feedback từng attempt là pre/post assessment đã chuẩn hóa (A02/A06/A10).

“Nên giữ” là giữ giá trị/capability. Các vấn đề audit về quyền, dữ liệu và độ tin cậy không được bỏ qua khi capability đó phục vụ ADVANCE/Enterprise.

## 7. Những requirement cần human confirm trước khi implement

| ID | Nội dung cần xác nhận | Vì sao chưa đủ rõ |
| --- | --- | --- |
| C01 | Pilot phục vụ nhóm nào trước: ngân hàng/phòng ban nào, corporate hay public BASIC? Ai là buyer/PIC? | Target broad; chưa có nhóm đầu tiên hoặc quy mô pilot |
| C02 | Gói gắn với user, seat, class, tổ chức hay hợp đồng? Giá, thời hạn, trial và activation? | §1.3 nói gói, §3 nói subscription user, revenue log lại theo class; chưa có quy tắc thống nhất |
| C03 | BASIC chính xác bao nhiêu bài và bài nào? ADVANCE 6 hay 8 bài, theo ngành nào? | Dải 1–2/6–8 chưa là entitlement danh mục |
| C04 | ADVANCE unlimited hay max_daily_prompts=100? BASIC quota bao nhiêu, reset theo ngày/phiên? | §1.3 và JSON ví dụ §3.2 khác nhau; chưa rõ request lỗi/Judge/retry có tính lượt |
| C05 | Hết hạn/thu hồi ảnh hưởng Run, Judge, sửa prompt, xem attempts, library, export thế nào? | Read-only, ngắt ghi và paywall được nêu nhưng không thành một lifecycle rule rõ |
| C06 | Control Data/system/config cố định đến đâu? Bài học tham số hoặc model cao cấp có ngoại lệ? | §1.1 chỉ prompt biến đổi, §1.3 model khác theo tier; chưa rõ điều kiện compare hợp lệ |
| C07 | Coach phải làm người học hiểu điều gì; cần tương tác tự do hay feedback hướng dẫn theo bài? | Cách nêu AI Judge/Coach chưa quyết định hành vi/chuẩn sư phạm; multi-agent là giải pháp được đề xuất |
| C08 | Mastery là kiến thức LLM, kỹ năng prompt, chất lượng output hay tổ hợp? Pre/post đo thế nào? | Điểm Judge và % Mastery bị quy đổi trực tiếp trong nguồn mà chưa có assessment validity |
| C09 | Completion >85% tính trên ai, khoảng thời gian nào; mở bài, run, đạt điểm hay hoàn tất assessment? | As-Is có nhiều nghĩa completion; không có definition/mẫu số To-Be |
| C10 | Giờ tiết kiệm/ROI lấy từ tự khai, phép đo tác vụ, đối chứng hay hệ số? Ai xác thực? | Nguồn nêu ước tính nhưng thiếu công thức, dữ liệu và quy trình kiểm chứng |
| C11 | Quyền Enterprise Admin/L&D/instructor/partner/vendor_tutor ở mỗi cấp? Một người có nhiều đơn vị/role? | Nêu persona/hierarchy nhưng chưa có responsibility và visibility rules |
| C12 | Source roster chuẩn và quy tắc conflict/withdrawal khi row bị xóa, trùng email, đổi lớp hoặc hết hạn? | Chỉ có ví dụ add/update50; chưa quy định tác động vận hành đầy đủ |
| C13 | Mục tiêu <5 phút tính thao tác admin hay provisioning delay? Sync5 phút và dashboard<1.5s có bắt buộc? | Business KPI, lịch worker và latency acceptance chưa có điều kiện đo/quy mô |
| C14 | Bộ slide/lab Agribank/Intrepid nào là chuẩn, phiên bản nào, có được dùng dữ liệu thực không; ai duyệt? | DOCX mô tả ingest, không cung cấp học liệu gốc/coverage checklist/phê duyệt quyền dùng |
| C15 | PII phải phát hiện loại nào, cảnh báo hay chặn? Tài liệu nội bộ nào được gửi AI bên ngoài? | Giá trị bảo mật được nêu nhưng policy dữ liệu/ngoại lệ/trách nhiệm chưa rõ |
| C16 | Library scope ai publish/duyệt/sửa/xóa? Sở hữu khi rời tổ chức và chuyển BASIC→ADVANCE? | Scope đọc không đủ mô tả vòng đời tài sản tri thức; BASIC local vs PERSONAL tập trung chưa thống nhất |
| C17 | B2B Discovery AI chỉ gợi ý hay tự quyết lộ trình; cần người duyệt và quyền override? | §2.2/§4.3 nói đề xuất tự động nhưng chưa chốt trách nhiệm/quyết định cuối |
| C18 | Referral attribution, hợp đồng/seat/class là đơn vị doanh thu, net/gross, thuế/hoàn tiền, đối soát/chi trả? | Chỉ có rate/example và sự kiện payment success; thiếu quy tắc thương mại để tính đúng |
| C19 | Roadmap P0/P1/P2 và 6 sprint là quyết định đã duyệt hay đề xuất trong DOCX? | Chưa có evidence capacity, owner hoặc sign-off; checkbox[x] không chứng minh delivered |
| C20 | Model/provider cụ thể và các giải pháp kỹ thuật trong DOCX có phải constraint bắt buộc đã duyệt? | Đây là technical proposal; chưa tự chọn architecture hoặc xác nhận model tồn tại/khả dụng ở phase product |

Tất cả C01–C20 hiện là **Needs confirmation**. Không tạo giá, quota, công thức KPI, chính sách dữ liệu hoặc timeline thay cho quyết định human.

## 8. Các chỗ trong Refined BRD cần đọc có điều kiện

### 8.1. Nhận định As-Is không khớp audit

| Nhận định trong Refined BRD | As-Is được dùng ở pha này |
| --- | --- |
| §2.1: Flat curriculum, mọi user cùng truy cập danh sách công khai | A03/A05 xác nhận course/module/lesson, published state và enrollment gating. Khoảng trống là commercial tier, không là curriculum/access control hoàn toàn thiếu |
| §2.2: Chưa có khái niệm doanh nghiệp | A03 đã có clients và class thuộc client/course. Khoảng trống là hierarchy/membership và phạm vi quản trị B2B đầy đủ |
| §2.3: Context hardcoded/đoạn nhập thủ công | A01/A02 có curriculum DB và editor/resources, đồng thời có static fallback. Chưa có automated document intake là gap riêng |
| §2.6: Học liệu mẫu chưa bao phủ hai chương trình | Audit chưa chứng minh full coverage; không thể kết luận tất cả nội dung hiện tại vô giá trị hoặc thiếu một phần cụ thể nếu chưa có bộ nguồn gốc |
| §3: users.id tham chiếu auth.users.id; references users.class_id, users.expiration_timestamp, prompt_sessions | A03 xác nhận identity bridge và enrollment khác mô tả đó; không dùng proposed schema/index như bằng chứng hiện trạng hoặc yêu cầu nghiệp vụ độc lập |

### 8.2. Business outcome và technical proposal

| Outcome được đưa vào gap analysis | Nội dung kỹ thuật trong nguồn không tự biến thành business requirement |
| --- | --- |
| Cấp quyền theo gói, hạn mức và thời hạn | access_tier, user_subscriptions, middleware và schema cụ thể |
| Quản lý roster nhanh, có kết quả/lỗi để vận hành | Worker, Cron/Cloud Scheduler, service account, Redis, exponential backoff, API version và log table |
| Feedback AI hữu ích, phù hợp gói và bảo vệ dữ liệu | Supervisor/Execution/Evaluation multi-agent, Gemini3.8 Flash/Pro, GPT-4o, “sub-second streaming” |
| Thư viện tri thức theo phạm vi tổ chức | Chọn Supabase/Postgres, RLS cụ thể, khóa/FK và index layout |
| Báo cáo L&D đúng đơn vị và có độ trễ chấp nhận | B-Tree, read replica, materialized views và bảng prompt_sessions |
| Học liệu chuẩn hóa đủ coverage | Ingest script, pipeline và hình dạng bảng cụ thể |

Google Sheets roster và tài liệu nghiệp vụ từ Drive/Sheets được giữ là nguồn tích hợp được DOCX nêu. Không tự kết luận mọi integration detail hoặc lịch chạy đề xuất là bắt buộc; cần C12/C13/C20. Không đánh giá tính khả thi kỹ thuật/model/API trong phase này.

## 9. Kết luận và điểm dừng

Giữ nền Learning Product đang có: thực hành theo tình huống, structure guidance, attempts/compare, curriculum management và live feedback. Chốt chính sách thương mại, quyền theo tổ chức, phép đo học tập và vận hành nội dung trước khi chuyển các nhãn NEW/REBUILD thành phạm vi implementation.

Artifact này hoàn thành product/business gap analysis dựa đúng hai nguồn. Các phần SQL/architecture/roadmap trong DOCX chưa được chuyển thành thiết kế hoặc nhiệm vụ triển khai. Dừng sau gap analysis và các câu hỏi human confirmation; chưa tạo PRD/SAD hoặc sửa code.
