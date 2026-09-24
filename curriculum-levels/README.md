# BỘ GIÁO TRÌNH TOÀN TẬP KỸ NGHỆ PROMPT ĐA TẦNG
## (Comprehensive Prompt Engineering Curriculum — 4-Level Persona Framework)

> **Tủ sách tri thức Promptify:** Nền tảng Đào tạo Kỹ nghệ Prompt & Tương tác Trí tuệ Nhân tạo thế hệ mới.  
> **Phương pháp tiếp cận:** Đa tầng nhận thức (Multi-Persona Pedagogical Framework).  
> **Phạm vi đối tượng:** Trẻ em (Kid/ELIF5) 👶 ➔ Người cao tuổi (Senior) 👵 ➔ Dân nghiệp vụ / Non-tech (Business) 💼 ➔ Dân Kỹ thuật (Base Tech) 💻.  
>  
> 📌 **Tài liệu Hướng dẫn Bàn giao & Tiếp nhận:** Đọc ngay [`../HANDOFF.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/HANDOFF.md) để nắm lộ trình học và cách làm bài tập.

---

## 🗺️ Bản Đồ Toàn Diện 14 Kỹ Thuật Prompt (Master Curriculum Map)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ NHÓM 1: CÁC NỀN TẢNG CỐT LÕI (CORE FOUNDATIONS)                                       │
├──────────────────────────┬──────────────────────────┬──────────────────────────────────┤
│ 01. Zero-Shot Prompting  │ 02. Khung 5 Thành tố     │ 03. Few-Shot / In-Context        │
│ Nhập lệnh trực tiếp      │ Role-Context-Task-Con-Fmt│ Học qua các ví dụ mẫu            │
├──────────────────────────┴──────────────────────────┴──────────────────────────────────┤
│ NHÓM 2: CHUỖI SUY NGHĨ & LẬP LUẬN NÂNG CAO (ADVANCED REASONING & THOUGHT CHAINS)       │
├──────────────────────────┬──────────────────────────┬──────────────────────────────────┤
│ 04. Chain-of-Thought CoT │ 05. Tree-of-Thoughts ToT │ 06. Self-Consistency Ensembling  │
│ Suy nghĩ từng bước       │ Cây tư duy, rẽ nhánh     │ Lấy mẫu đa luồng, bỏ phiếu       │
├──────────────────────────┼──────────────────────────┼──────────────────────────────────┤
│ 07. ReAct & Agentic Loop │ 08. Tool & Function Call │ 12. Step-Back & Meta-Prompting   │
│ Vòng lặp Suy nghĩ-Hành động│ Gọi công cụ ngoài       │ Lùi một bước & Dùng AI viết lệnh │
├──────────────────────────┴──────────────────────────┴──────────────────────────────────┤
│ NHÓM 3: ĐIỀU KHIỂN THAM SỐ & ĐỊNH DẠNG DỮ LIỆU (GENERATION CONTROL & STRUCTURED DATA)   │
├─────────────────────────────────────────────────────┬──────────────────────────────────┤
│ 09. Sampling Parameters (T, Top-P, Top-K, Penalties)│ 10. Structured Outputs & JSON    │
│ Núm vặn sáng tạo & nhiệt độ sinh                    │ Ép khuôn bảng, JSON, XML sạch    │
├─────────────────────────────────────────────────────┴──────────────────────────────────┤
│ NHÓM 4: BẢO MẬT DOANH NGHIỆP & RÀNG BUỘC THỰC TẾ (ENTERPRISE DEFENSE & GROUNDING)     │
├──────────────────────────┬──────────────────────────┬──────────────────────────────────┤
│ 11. Grounding & RAG      │ 13. Khử định danh PII    │ 14. Prompt Injection Defense     │
│ Chống bịa đặt bằng tài liệu│ Bảo vệ dữ liệu nhạy cảm │ Phòng thủ mã độc & ép AI phá luật│
└──────────────────────────┴──────────────────────────┴──────────────────────────────────┘
```

---

## 👥 Khung 4 Tầng Nhận Thức (4-Level Persona Framework)

Trong từng file bài học, kiến thức được phân tách thành 4 góc nhìn chuẩn hóa:

| Tầng nhận thức | Tên gọi | Phong cách truyền đạt & Ẩn dụ | Đối tượng mục tiêu |
| :---: | :--- | :--- | :--- |
| **Level 1** | 👶 **Trẻ em (ELIF5 - Like I'm 5)** | Truyện tranh, nhân vật Doraemon, LEGO, lớp mẫu giáo, thần thoại ngộ nghĩnh. Tuyệt đối không dùng thuật ngữ kỹ thuật. | Học sinh tiểu học, người mới hoàn toàn muốn hiểu bản chất trong 30 giây. |
| **Level 2** | 👵 **Người cao tuổi (Seniors / Elders)** | Thân tình, từ tốn, gắn liền sinh hoạt gia đình, chợ quê, làm vườn, sổ tay dặn dò con cháu. Tránh tiếng Anh bồi. | Bác hưu trí, người lớn tuổi muốn ứng dụng AI vào đời sống an toàn. |
| **Level 3** | 💼 **Dân nghiệp vụ / Non-tech (Business)** | Trực diện bài toán kinh doanh, ngân hàng Agribank, kế toán, văn phòng, bảng số liệu, giảm 80% thời gian xử lý thủ công. | Nhân viên văn phòng, chuyên viên tín dụng, quản lý dự án. |
| **Level 4** | 💻 **Dân Kỹ thuật (Base Tech / Developers / IT)** | Thuật ngữ công nghệ phổ biến, thực chiến: API, Input/Output, Token, JSON, Hàm, Vòng lặp, Debug, Logic xử lý dữ liệu. Không dùng công thức toán phức tạp, ai làm IT/Dev/Tester đều hiểu ngay. | Lập trình viên, Tester/QA, IT Helpdesk, Kỹ thuật viên, PM kỹ thuật. |

---

## 📚 Danh Mục Toàn Diện 22 File Kiến Thức Thực Chiến

### Giai đoạn 1: Nền tảng cốt lõi (Core Foundations)
1. [`01_ZERO_SHOT_PROMPTING.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-levels/01_ZERO_SHOT_PROMPTING.md) — Kỹ thuật Zero-Shot: Ra lệnh trực tiếp không ví dụ.
2. [`02_STRUCTURED_5_ELEMENTS.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-levels/02_STRUCTURED_5_ELEMENTS.md) — Khung cấu trúc 5 thành tố (Role - Context - Task - Constraint - Format).
3. [`03_FEW_SHOT_AND_IN_CONTEXT_LEARNING.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-levels/03_FEW_SHOT_AND_IN_CONTEXT_LEARNING.md) — Kỹ thuật One-Shot & Few-Shot: Dạy AI bằng ví dụ mẫu.

### Giai đoạn 2: Chuỗi suy nghĩ & Lập luận chuyên sâu (Advanced Reasoning)
4. [`04_CHAIN_OF_THOUGHT_COT.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-levels/04_CHAIN_OF_THOUGHT_COT.md) — Chain-of-Thought (CoT): Bắt AI suy nghĩ từng bước công khai.
5. [`05_TREE_OF_THOUGHTS_TOT.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-levels/05_TREE_OF_THOUGHTS_TOT.md) — Tree-of-Thoughts (ToT): Cây suy nghĩ rẽ nhánh, khám phá và quay lui.
6. [`06_SELF_CONSISTENCY_AND_ENSEMBLING.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-levels/06_SELF_CONSISTENCY_AND_ENSEMBLING.md) — Self-Consistency: Lấy mẫu nhiều chuỗi tư duy và bỏ phiếu đa số.
7. [`07_REACT_AND_AGENTIC_LOOPS.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-levels/07_REACT_AND_AGENTIC_LOOPS.md) — ReAct: Vòng lặp Suy nghĩ (Reason) + Hành động (Act) + Quan sát (Observe).
8. [`08_TOOL_AND_FUNCTION_CALLING.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-levels/08_TOOL_AND_FUNCTION_CALLING.md) — Tool & Function Calling: Kết nối AI với công cụ và phần mềm ngoài.
9. [`12_STEP_BACK_AND_META_PROMPTING.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-levels/12_STEP_BACK_AND_META_PROMPTING.md) — Step-Back Prompting & Meta-Prompt: Lùi một bước & Dùng AI tối ưu câu lệnh.
10. [`20_SELF_REFINE_AND_REFLEXION.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-levels/20_SELF_REFINE_AND_REFLEXION.md) — Self-Refine & Reflexion: Viết bản thảo ➔ Tự soi lỗi ➔ Tự biên tập hoàn hảo.

### Giai đoạn 3: Kỹ năng công sở & Nghiệp vụ phi kỹ thuật (Non-Tech Superpowers)
11. [`15_FLIPPED_INTERACTION_AND_SOCRATIC.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-levels/15_FLIPPED_INTERACTION_AND_SOCRATIC.md) — Flipped Interaction: Bảo AI phỏng vấn mình từng câu khi bí ý tưởng.
12. [`16_DIPLOMATIC_AND_TONE_SHIFTING.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-levels/16_DIPLOMATIC_AND_TONE_SHIFTING.md) — Ngoại giao công sở: Từ chối việc khéo, đòi nợ lịch sự, biến giận dữ thành chuyên nghiệp.
13. [`17_BLUF_AND_EXECUTIVE_BRIEFING.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-levels/17_BLUF_AND_EXECUTIVE_BRIEFING.md) — Cấu trúc BLUF: Báo cáo chuẩn lãnh đạo, đưa ngay kết luận và con số trong 30 giây.
14. [`18_DEVIL_ADVOCATE_AND_RISK_AUDIT.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-levels/18_DEVIL_ADVOCATE_AND_RISK_AUDIT.md) — Kẻ phản biện khó tính: Tước bỏ tính nịnh hót của AI, soi bẫy hợp đồng và rủi ro đề án.
15. [`19_ACTION_BREAKDOWN_AND_SYNTHESIS.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-levels/19_ACTION_BREAKDOWN_AND_SYNTHESIS.md) — Phân rã hành động & Ma trận RACI: Chuyển cuộc họp hỗn loạn thành việc làm 15 phút.

### Giai đoạn 4: Điều khiển định dạng, Tham số & Đa phương tiện (Control & Multimodal)
16. [`09_SAMPLING_PARAMETERS_T_AND_P.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-levels/09_SAMPLING_PARAMETERS_T_AND_P.md) — Núm vặn sáng tạo: Temperature $T$, Top-P, Top-K, Penalty.
17. [`10_STRUCTURED_OUTPUTS_AND_JSON.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-levels/10_STRUCTURED_OUTPUTS_AND_JSON.md) — Định dạng dữ liệu có cấu trúc: JSON Schema, CSV, Markdown Table Excel.
18. [`21_MULTIMODAL_VISION_PROMPTING.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-levels/21_MULTIMODAL_VISION_PROMPTING.md) — Vision Prompting: Đọc ảnh hóa đơn đỏ, chứng từ scan, bảng kê và ảnh thẩm định hiện trường.

### Giai đoạn 5: Bảo mật doanh nghiệp, An toàn & Tối ưu hạ tầng (Security & Caching)
19. [`11_GROUNDING_RAG_CONTEXT_ENGINEERING.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-levels/11_GROUNDING_RAG_CONTEXT_ENGINEERING.md) — Context Engineering & Grounding: Chống bịa đặt bằng tài liệu gốc.
20. [`13_PII_SCRUBBING_AND_DATA_PRIVACY.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-levels/13_PII_SCRUBBING_AND_DATA_PRIVACY.md) — Khử định danh PII: Bảo vệ dữ liệu cá nhân theo NĐ 13/2023.
21. [`14_PROMPT_INJECTION_AND_DEFENSE.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-levels/14_PROMPT_INJECTION_AND_DEFENSE.md) — Phòng thủ Prompt Injection: Ngăn chặn vượt rào và chiếm quyền điều khiển.
22. [`22_PROMPT_CACHING_AND_EFFICIENCY.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-levels/22_PROMPT_CACHING_AND_EFFICIENCY.md) — Prompt Caching: Tiết kiệm 90% chi phí API và tăng tốc độ 4x cho văn bản dài.

---
*Tài liệu được bảo trợ và phát triển bởi Promptify Team — 2026.*
