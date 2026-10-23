/* ==============================================================================
   PROMPTIFY AI STUDIO v2 — INTERACTION SCRIPT & HASH ROUTER
   Google AI Studio Spatial Model
   ============================================================================== */

const ATTEMPTS = {
  v1: {
    prompt: `Hãy tổng hợp giúp tôi 5 khiếu nại của khách hàng gửi về ứng dụng Agribank, phân loại xem cái nào gấp nhé:

1. Khách hàng Trần Văn Long: Rút tiền ATM số 14 Láng Hạ bị trừ 2.000.000đ nhưng không nhả tiền (cần đóng viện phí gấp).
2. App Store user MaiPhuong_91: Bản cập nhật 5.2.0 bấm Chuyển tiền quốc tế bị văng app trên iPhone 14 Pro Max.
3. Bà con Lê Thị Tươi: Hỏi gói vay ưu đãi phụ nữ nuôi gà đẻ trứng tại Hải Dương cần giấy tờ gì.
4. Chủ tạp hóa Nguyễn Hữu Đạt: Mã QR Pay báo lỗi kết nối máy chủ không thanh toán được.
5. Khách hàng Đỗ Minh Đức: Góp ý bổ sung bộ lọc số tiền và người nhận trong lịch sử giao dịch.`,
    score: 4.5
  },
  v2: {
    prompt: `Bạn là Trợ lý Dữ liệu Vận hành (Data Operations Specialist) tại Agribank.

Nhiệm vụ: Hãy phân tích toàn bộ các phản ánh của khách hàng nằm trong cặp thẻ <danh_sach_khieu_nai> và trích xuất thành 01 BẢNG MARKDOWN DUY NHẤT.

<danh_sach_khieu_nai>
[Dữ liệu 5 phản ánh của khách hàng được tự động nạp từ bối cảnh bài học]
</danh_sach_khieu_nai>

YÊU CẦU ĐỊNH DẠNG KHUÔN BẢNG (SCHEMA):
Bảng Markdown phải có đúng 6 cột với tiêu đề sau:
| STT | Mã Phản Ánh | Kênh Tiếp Nhận | Phân Loại Sự Cố | Mức Độ Ưu Tiên | Đơn Vị Chủ Trì Xử Lý |

RÀNG BUỘC THÉP (ZERO CHAT CONSTRAINT):
1. Tuyệt đối KHÔNG có lời chào mở đầu và không có lời chúc kết thúc.
2. Đầu ra bắt đầu ngay lập tức bằng ký tự "|" của dòng tiêu đề bảng.
3. Cột "Mức Độ Ưu Tiên" gồm: Khẩn cấp, Cao, Trung bình. Trường hợp nuốt tiền viện phí phải xếp Khẩn cấp.`,
    score: 8.5
  }
};

let currentAttempt = 'v2';
let hasRun = true;

const promptInput = document.getElementById('prompt-editor-input');
const charCounter = document.getElementById('char-counter-text');
const cardBeforeRun = document.getElementById('card-before-run');
const cardOutputResult = document.getElementById('card-output-result');
const cardEvalRubric = document.getElementById('card-eval-rubric');
const drawerBackdrop = document.getElementById('drawer-backdrop');
const compareModal = document.getElementById('compare-modal');

// Update Character Count
function updateCharCount() {
  if (promptInput && charCounter) {
    charCounter.textContent = `${promptInput.value.length} ký tự`;
  }
}

if (promptInput) {
  promptInput.addEventListener('input', updateCharCount);
}

// Switch Attempts (v1 vs v2)
function switchAttempt(key) {
  currentAttempt = key;
  const pillV1 = document.getElementById('pill-v1');
  const pillV2 = document.getElementById('pill-v2');

  if (pillV1 && pillV2) {
    pillV1.classList.toggle('active', key === 'v1');
    pillV2.classList.toggle('active', key === 'v2');
  }

  if (promptInput && ATTEMPTS[key]) {
    promptInput.value = ATTEMPTS[key].prompt;
    updateCharCount();
  }
}

// Toggle Task Strip Expand/Collapse
function toggleTaskCard() {
  const card = document.getElementById('task-expanded-card');
  const label = document.getElementById('task-toggle-label');
  if (card) {
    const isOpen = card.classList.toggle('open');
    if (label) {
      label.textContent = isOpen ? 'Thu gọn ▲' : 'Chi tiết dữ liệu thô ▾';
    }
  }
}

// Run Prompt Execution
function runPrompt(updateHash = true) {
  hasRun = true;
  if (cardBeforeRun) cardBeforeRun.style.display = 'none';
  if (cardOutputResult) cardOutputResult.style.display = 'flex';
  if (cardEvalRubric) cardEvalRubric.style.display = 'flex';

  if (updateHash && window.location.hash !== '#after_run') {
    window.location.hash = '#after_run';
  }
}

// Load Starter Template
function loadStarterTemplate() {
  if (promptInput) {
    promptInput.value = `[VAI TRÒ / PERSONA]
Bạn là Chuyên viên Vận hành Dữ liệu Agribank.

[NHIỆM VỤ / TASK]
Trích xuất 5 phản ánh khách hàng thành Bảng Markdown 6 cột.

[RÀNG BUỘC / GUARDRAILS]
- Cấm lời chào xã giao (Zero-Chat)
- Bắt đầu trực tiếp bằng ký tự |

[ĐỊNH DẠNG / OUTPUT SCHEMA]
| STT | Mã Phản Ánh | Kênh | Sự Cố | Ưu Tiên | Đơn Vị Xử Lý |`;
    updateCharCount();
  }
}

// Apply Solution to Editor
function applySolutionToEditor() {
  switchAttempt('v2');
  closeAllDrawers();
}

// Copy Output Table to Clipboard
function copyOutputTable() {
  const label = document.getElementById('copy-label');
  const tableData = `| STT | Mã Phản Ánh | Kênh Tiếp Nhận | Phân Loại Sự Cố | Mức Độ Ưu Tiên | Đơn Vị Chủ Trì Xử Lý |
| 1 | FB-2026-001 | Cây ATM (Láng Hạ) | Nuốt tiền mặt khi rút thẻ, cần đóng viện phí | Khẩn cấp | TT Quản lý & Vận hành ATM |
| 2 | FB-2026-002 | App Store (v5.2.0) | Văng app khi chuyển tiền QT trên iOS 18 | Cao | TT Ngân hàng Số & CNTT |
| 3 | FB-2026-003 | Tổng đài Chăm sóc | Hỏi thủ tục hồ sơ vay ưu đãi phụ nữ nuôi gà | Trung bình | Phòng Khách hàng Hộ SX |
| 4 | FB-2026-004 | Điểm chấp nhận QR | Mã QR Pay lỗi kết nối máy chủ thanh toán | Cao | Trung tâm Thanh toán & Thẻ |
| 5 | FB-2026-005 | Góp ý Khách hàng | Đề xuất thêm bộ lọc số tiền trong lịch sử | Trung bình | Phòng Trải nghiệm Sản phẩm |`;

  navigator.clipboard?.writeText(tableData);
  if (label) {
    label.textContent = 'Đã chép!';
    setTimeout(() => { label.textContent = 'Sao chép'; }, 1500);
  }
}

// Drawers Control
function toggleDrawer(type) {
  const drawer = document.getElementById(`drawer-${type}`);
  const navBtn = document.getElementById(`btn-${type}-nav`);

  if (!drawer) return;
  const isCurrentlyOpen = drawer.classList.contains('open');
  closeAllDrawers();

  if (!isCurrentlyOpen) {
    drawer.classList.add('open');
    if (drawerBackdrop) drawerBackdrop.classList.add('open');
    if (navBtn) navBtn.classList.add('active');
    window.location.hash = `#${type}`;
  } else {
    window.location.hash = hasRun ? '#after_run' : '#before_run';
  }
}

function closeAllDrawers() {
  document.querySelectorAll('.side-drawer').forEach(d => d.classList.remove('open'));
  document.querySelectorAll('.nav-item-btn').forEach(b => {
    if (b.id !== 'nav-lab-item') b.classList.remove('active');
  });
  if (drawerBackdrop) drawerBackdrop.classList.remove('open');
}

// Compare Modal
function openCompareModal() {
  closeAllDrawers();
  if (compareModal) compareModal.classList.add('open');
  window.location.hash = '#compare';
}

function closeCompareModal() {
  if (compareModal) compareModal.classList.remove('open');
  window.location.hash = hasRun ? '#after_run' : '#before_run';
}

// Hash Routing
function handleHashRoute() {
  const hash = window.location.hash.toLowerCase();

  closeAllDrawers();
  if (compareModal) compareModal.classList.remove('open');

  if (hash === '#before_run') {
    hasRun = false;
    if (cardBeforeRun) cardBeforeRun.style.display = 'flex';
    if (cardOutputResult) cardOutputResult.style.display = 'none';
    if (cardEvalRubric) cardEvalRubric.style.display = 'none';
    switchAttempt('v2');
  } else if (hash === '#after_run') {
    runPrompt(false);
    switchAttempt('v2');
  } else if (hash === '#theory') {
    runPrompt(false);
    const d = document.getElementById('drawer-theory');
    const b = document.getElementById('btn-theory-nav');
    if (d) d.classList.add('open');
    if (b) b.classList.add('active');
    if (drawerBackdrop) drawerBackdrop.classList.add('open');
  } else if (hash === '#hint') {
    runPrompt(false);
    const d = document.getElementById('drawer-hint');
    const b = document.getElementById('btn-hint-nav');
    if (d) d.classList.add('open');
    if (b) b.classList.add('active');
    if (drawerBackdrop) drawerBackdrop.classList.add('open');
  } else if (hash === '#solution') {
    runPrompt(false);
    const d = document.getElementById('drawer-solution');
    const b = document.getElementById('btn-solution-nav');
    if (d) d.classList.add('open');
    if (b) b.classList.add('active');
    if (drawerBackdrop) drawerBackdrop.classList.add('open');
  } else if (hash === '#coach') {
    runPrompt(false);
    const d = document.getElementById('drawer-coach');
    const b = document.getElementById('btn-coach-nav');
    if (d) d.classList.add('open');
    if (b) b.classList.add('active');
    if (drawerBackdrop) drawerBackdrop.classList.add('open');
  } else if (hash === '#compare') {
    runPrompt(false);
    if (compareModal) compareModal.classList.add('open');
  } else {
    // Default route
    runPrompt(false);
  }
}

// Shortcuts
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    runPrompt();
  }
  if (e.key === 'Escape') {
    closeAllDrawers();
    closeCompareModal();
  }
});

window.addEventListener('DOMContentLoaded', () => {
  updateCharCount();
  if (!window.location.hash) {
    window.location.hash = '#after_run';
  } else {
    handleHashRoute();
  }
});

window.addEventListener('hashchange', handleHashRoute);
