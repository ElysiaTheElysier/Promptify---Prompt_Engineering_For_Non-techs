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
export function productErrorText(status: number, locale = language) {
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
