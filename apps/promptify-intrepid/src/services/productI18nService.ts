import { useSyncExternalStore } from 'react';
export type ProductLanguage = 'en' | 'vi';
const storageKey = 'promptify-language';
const listeners = new Set<() => void>();
const stored = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
let language: ProductLanguage = stored === 'vi' ? 'vi' : 'en';
if(typeof document!=='undefined')document.documentElement.lang=language;
export const getProductLanguage = () => language;
export function setProductLanguage(value: ProductLanguage) {
  if (value !== 'en' && value !== 'vi') return;
  language = value;
  if (typeof window !== 'undefined') { window.localStorage.setItem(storageKey, value); document.documentElement.lang = value; }
  listeners.forEach(listener => listener());
}
const messages = {
  signIn: ['Sign in with your enterprise account.', 'Đăng nhập bằng tài khoản doanh nghiệp.'],
  loading: ['Loading…', 'Đang tải…'], save: ['Save', 'Lưu'], saving: ['Saving…', 'Đang lưu…'], cancel: ['Cancel', 'Hủy'],
  retry: ['Retry', 'Thử lại'], refresh: ['Refresh', 'Tải lại'], signOut: ['Sign out', 'Đăng xuất'],
  unknownOutcome: ['The request could not be confirmed. Refresh saved data before retrying a write.', 'Chưa xác nhận được kết quả yêu cầu. Hãy tải lại dữ liệu đã lưu trước khi gửi lại thao tác ghi.'],
  serverError: ['The server could not complete the request.', 'Máy chủ chưa thể hoàn tất yêu cầu.'],
  unauthorized: ['Your session has expired. Please sign in again.', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'],
  forbidden: ['This action is outside your assigned access.', 'Thao tác này nằm ngoài quyền được cấp của bạn.'],
  conflict: ['The saved state changed or this request is already processing. Refresh before retrying.', 'Dữ liệu đã thay đổi hoặc yêu cầu đang được xử lý. Hãy tải lại trước khi thử tiếp.'],
  invalid: ['Check the required fields and try again.', 'Kiểm tra các trường bắt buộc rồi thử lại.'],
  runQuota: ['Your AI run limit is 40 per hour and 200 per day. Wait for the limit to reset.', 'Bạn đã chạm giới hạn 40 lượt AI mỗi giờ hoặc 200 lượt mỗi ngày. Vui lòng đợi hạn mức đặt lại.'],
  workspaceSourceUnapproved: ['This Sheet or Drive source has not been approved for this class. Contact your administrator.', 'Nguồn Sheet hoặc Drive này chưa được duyệt cho lớp. Vui lòng liên hệ quản trị viên.'],
  identityLinkPending: ['Your staff account is waiting for an administrator to confirm this Google sign-in. Ask your L&D administrator to approve it in System governance, then sign in again.', 'Tài khoản quản lý của bạn đang chờ quản trị viên xác nhận lần đăng nhập Google này. Hãy nhờ quản trị viên duyệt trong mục Quản trị hệ thống, rồi đăng nhập lại.'],
  capacity: ['AI capacity is currently unavailable. Contact your trainer.', 'AI hiện chưa đủ hạn mức xử lý. Vui lòng liên hệ giảng viên.'],
  unavailable: ['The service is not ready. Contact your administrator.', 'Dịch vụ chưa sẵn sàng. Vui lòng liên hệ quản trị viên.'],
  incomplete: ['The provider returned no confirmed, complete result.', 'Nhà cung cấp chưa trả về kết quả hoàn chỉnh được xác nhận.'],
  run: ['Run prompt', 'Chạy prompt'], judge: ['Evaluate', 'Chấm điểm'], compare: ['Compare versions', 'So sánh phiên bản'],
  noData: ['No data yet.', 'Chưa có dữ liệu.'], noClasses: ['You have no assigned classes yet.', 'Bạn chưa được cấp quyền vào lớp nào.'],
  studio: ['Curriculum Studio', 'Studio giáo trình'], directory: ['Codelab directory', 'Danh mục Codelab'],
  dashboard: ['Dashboard', 'Tổng quan'], roster: ['Roster', 'Danh sách học viên'], sources: ['Approved sources', 'Nguồn được duyệt'],
  draft: ['Draft', 'Bản nháp'], active: ['Active', 'Đang hoạt động'], scheduled: ['Scheduled', 'Đã lên lịch'], archived: ['Archived', 'Đã lưu trữ'],
  frozen: ['Frozen', 'Đã tạm dừng'], ended: ['Ended', 'Đã kết thúc'], history: ['Attempt history', 'Lịch sử bài làm'],
  rubric: ['Evaluation rubric', 'Tiêu chí đánh giá'], total: ['Total', 'Tổng điểm'], strengths: ['Strengths', 'Điểm tốt'], improvements: ['Improvements', 'Cần cải thiện'], nextHint: ['Next revision hint', 'Gợi ý chỉnh sửa tiếp theo'],
  task: ['Business task', 'Nhiệm vụ công việc'], prompt: ['Your prompt', 'Prompt của bạn'], output: ['AI output', 'Kết quả AI'],
  groundedness: ['Groundedness & SOP Citation', 'Bám sát dữ liệu và trích dẫn SOP'], persona: ['Task & Role Persona', 'Nhiệm vụ và vai trò'],
  format: ['Format Adherence', 'Tuân thủ định dạng'], oneshot: ['One-Shot Pattern Compliance', 'Tuân thủ mẫu One-Shot'], actionability: ['Business Actionability & SLA Window', 'Khả năng thực thi và thời hạn SLA'],
} as const;
export type ProductMessageKey = keyof typeof messages;
export const productText = (key: ProductMessageKey, locale = language): string => messages[key][locale === 'en' ? 0 : 1];
const templateCriteria = ['groundedness', 'persona', 'format', 'oneshot', 'actionability'];
/** Template criteria keep their bilingual names unless the trainer renamed them; custom criteria show the trainer's label. */
export function criterionLabel(key: string, label: string | undefined, locale = language): string {
  const pair = templateCriteria.includes(key) ? messages[key as ProductMessageKey] : undefined;
  return pair && (!label || pair.includes(label as never)) ? pair[locale === 'en' ? 0 : 1] : label || key;
}
// Lecture-slide refusals are decisions the editor can act on, so the specific reason is shown (EN, VI).
const SLIDE_ERRORS:Record<string,[string,string]>={
  'Page range exceeds deck':['A lab page range is beyond the last page of this deck. Fix the range first.','Có khoảng trang của lab vượt quá số trang của bộ slide. Hãy sửa khoảng trang trước.'],
  'Slide deck changed; reload':['Another editor changed this deck. Reload and review again.','Một giảng viên khác vừa thay đổi bộ slide này. Hãy tải lại và rà soát lại.'],
  'Revision conflict':['This lab was changed by someone else. Reload before saving.','Lab này vừa được người khác thay đổi. Hãy tải lại trước khi lưu.'],
  'Invalid page range':['Check the page range: pages start at 1 and the end cannot be before the start.','Kiểm tra khoảng trang: trang bắt đầu từ 1 và trang cuối không được nhỏ hơn trang đầu.'],
  'Invalid page ranges':['Check the page ranges: pages start at 1 and the end cannot be before the start.','Kiểm tra các khoảng trang: trang bắt đầu từ 1 và trang cuối không được nhỏ hơn trang đầu.'],
  'Choose a published deck of this class':['Choose a published deck of this class.','Hãy chọn một bộ slide đã xuất bản của lớp này.'],
  'Choose another published deck of this class':['Choose another published deck of this class as the replacement.','Hãy chọn một bộ slide khác đã xuất bản của lớp này để thay thế.'],
  'Choose a replacement deck or confirm turning slides off':['This deck is in use. Choose a replacement or confirm turning slides off for those labs.','Bộ slide đang được dùng. Hãy chọn bộ thay thế hoặc xác nhận tắt slide ở các lab đó.'],
  'Publish the deck before making it the default':['Publish the deck before making it the class default.','Hãy xuất bản bộ slide trước khi đặt làm mặc định của lớp.'],
  'Slide deck outside class':['This deck does not belong to this class.','Bộ slide này không thuộc lớp này.'],
  'Slide version outside class':['This slide version does not belong to this class.','Phiên bản slide này không thuộc lớp này.'],
  'Deck title required':['Enter a display name for the deck.','Hãy nhập tên hiển thị cho bộ slide.'],
  'Slide request conflict':['This upload was already used for another file. Choose the file again.','Lượt tải lên này đã dùng cho một file khác. Hãy chọn lại file.'],
  'This file is not a PDF.':['This file is not a PDF. For PowerPoint, export a PDF or open it as Google Slides first.','File này không phải PDF. Với PowerPoint, hãy xuất PDF hoặc mở bằng Google Slides trước.'],
  'This PDF is password-protected. Export it without a password and upload again.':['This PDF is password-protected. Export it without a password and upload again.','PDF này có mật khẩu. Hãy xuất lại không mật khẩu rồi tải lên.'],
  'This PDF cannot be read. Export it again and upload the new file.':['This PDF cannot be read. Export it again and upload the new file.','Không đọc được PDF này. Hãy xuất lại và tải file mới lên.'],
  'A slide PDF needs 1-2000 pages.':['A slide PDF needs 1–2000 pages.','PDF slide cần từ 1 đến 2000 trang.'],
  'Choose a PDF up to 25 MB.':['Choose a PDF up to 25 MB.','Hãy chọn PDF tối đa 25 MB.'],
  'The uploaded PDF was not received. Upload it again.':['The uploaded PDF was not received. Upload it again.','Máy chủ chưa nhận được PDF. Hãy tải lên lại.'],
  'Drive PDF exceeds 25 MB.':['This Drive PDF exceeds 25 MB.','PDF trên Drive vượt quá 25 MB.'],
  'Google Slides can export at most 10 MB. Download it as PDF from Google Slides and upload the PDF from your computer.':['Google Slides can export at most 10 MB. Download it as PDF from Google Slides and upload the PDF from your computer.','Google Slides chỉ xuất được tối đa 10 MB. Hãy tải về dạng PDF từ Google Slides rồi tải PDF lên từ máy.'],
  'Promptify can no longer read this Drive file (deleted or unshared). The published version stays in use.':['Promptify can no longer read this Drive file (deleted or unshared). The published version stays in use.','Promptify không còn đọc được file Drive này (đã xóa hoặc bỏ chia sẻ). Bản đã xuất bản vẫn được dùng.'],
  'Choose a PDF or Google Slides file. For PowerPoint, export a PDF or open it as Google Slides first.':['Choose a PDF or Google Slides file. For PowerPoint, export a PDF or open it as Google Slides first.','Hãy chọn PDF hoặc Google Slides. Với PowerPoint, hãy xuất PDF hoặc mở bằng Google Slides trước.'],
  'Slides are not available for this lesson.':['Slides are not available for this lesson.','Bài này chưa có slide.'],
};
// Six-tab roster workbook (rosterWorkbookService / parseRoster): name the broken tab instead of the generic 422 text.
const ROSTER_ERRORS:Record<string,[string,string]>={
  'Workbook header changed. Use template v1.':['A header in row 1 was changed, a tab was renamed, or a tab has more than 500 rows. Keep row 1 and tab names as in the template.','Dòng tiêu đề (dòng 1) của một tab bị sửa, tên tab bị đổi, hoặc một tab quá 500 dòng. Giữ nguyên dòng 1 và tên tab như file mẫu.'],
  'Department tab must list each department once.':['The Department tab must include this class department, each department listed once.','Tab Department phải có phòng ban của lớp này, và mỗi phòng ban chỉ ghi một lần.'],
  'Unknown user department.':['Someone in the Users tab has a department that is not in the Department tab.','Có người ở tab Users ghi phòng ban không có trong tab Department.'],
  'Roster contains invalid required fields.':['A row in the Users tab is missing Email, Full Name (2+ characters), Department or Country, or has an invalid email.','Một dòng ở tab Users thiếu Email, Full Name (từ 2 ký tự), Department hoặc Country, hoặc email sai dạng.'],
  'Roster contains duplicate emails.':['The Users tab lists the same email twice.','Tab Users có email bị trùng.'],
  'Invalid SOP reference.':['Each SOPs row needs a Title, a department from the Department tab and a link starting with https://.','Mỗi dòng ở tab SOPs cần Title, phòng ban có trong tab Department và link bắt đầu bằng https://.'],
  'Invalid Main PIC contact.':['Each Main PIC row needs a Name, a valid Email and a department from the Department tab.','Mỗi dòng ở tab Main PIC cần Name, Email hợp lệ và phòng ban có trong tab Department.'],
  'Invalid report URL.':['Each Report URL must start with https://.','Mỗi Report URL phải bắt đầu bằng https://.'],
};
export function productErrorText(status: number, locale = language, detail?:unknown) {
  if(typeof detail==='string'&&SLIDE_ERRORS[detail])return SLIDE_ERRORS[detail][locale==='en'?0:1];
  if(status===422&&typeof detail==='string'&&ROSTER_ERRORS[detail])return ROSTER_ERRORS[detail][locale==='en'?0:1];
  const badSync=status===422&&typeof detail==='string'?detail.match(/^Sync tab: "(.*)" is not a valid time/):null;
  if(badSync)return locale==='en'?detail as string:`Tab Sync: "${badSync[1]}" không phải giờ hợp lệ. Ghi dạng 12/11/2026 08:00 (giờ Việt Nam), hoặc để trống tab Sync để tự đồng bộ mỗi 15 phút.`;
  if(status===429&&detail==='Your AI run limit has been reached (40 per hour, 200 per day). Try again after the limit resets.')return productText('runQuota',locale);
  if(status===403&&detail==='This Workspace source is not approved for this class. Ask an administrator to configure its source binding.')return productText('workspaceSourceUnapproved',locale);
  if(status===403&&typeof detail==='string'&&detail.startsWith('Your staff account is waiting for an administrator'))return productText('identityLinkPending',locale);
  const key: ProductMessageKey = status === 0 ? 'unknownOutcome' : status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : status === 409 ? 'conflict' : status === 422 || status === 400 ? 'invalid' : status === 429 ? 'capacity' : status === 503 ? 'unavailable' : status === 502 || status === 504 ? 'incomplete' : 'serverError';
  return productText(key, locale);
}
export function useProductLanguage() {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, getProductLanguage, () => 'vi' as ProductLanguage);
}
if (typeof window !== 'undefined') {
  document.documentElement.lang = language;
  window.addEventListener('storage', event => { if (event.key === storageKey && (event.newValue === 'en' || event.newValue === 'vi')) { language = event.newValue; document.documentElement.lang = language; listeners.forEach(listener => listener()); } });
}
