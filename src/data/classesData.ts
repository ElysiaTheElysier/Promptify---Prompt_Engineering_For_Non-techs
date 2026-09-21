import { ClassCohort, Learner, Enrollment } from '../types';

export const CLASS_COHORTS: ClassCohort[] = [
  {
    id: 'AGRI-COMM',
    classCode: 'AGRI-COMM-2026-01',
    name: 'Workshop: Prompt Engineering 2026',
    organization: 'Agribank Việt Nam',
    industry: 'Ngân hàng & Tài chính',
    department: 'Ban Truyền thông & Thương hiệu',
    expiryDurationHours: 4,
    expiryDateText: 'Còn 3 giờ 45 phút',
    description: 'Tập huấn kỹ năng Prompt Engineering cho cán bộ truyền thông: Xử lý phản hồi khách hàng, viết thông cáo báo chí, chuẩn hóa Brand Voice ngân hàng.',
    iconName: 'Megaphone'
  },
  {
    id: 'AGRI-CREDIT',
    classCode: 'AGRI-CREDIT-2026-02',
    name: 'Chuyên đề: AI Thẩm định & Phân tích Tín dụng',
    organization: 'Agribank Việt Nam',
    industry: 'Ngân hàng & Tài chính',
    department: 'Khối Quản lý & Thẩm định Tín dụng',
    expiryDurationHours: 4,
    expiryDateText: 'Còn 4 giờ 00 phút',
    description: 'Ứng dụng Prompt Engineering thẩm định hồ sơ doanh nghiệp SME, tóm tắt quy chế cho vay và trích xuất chỉ số tài chính chuẩn xác.',
    iconName: 'Building2'
  },
  {
    id: 'CORP-GEN',
    classCode: 'CORP-GEN-2026-03',
    name: 'Khóa đào tạo: Prompt AI cho Khối Vận hành Doanh nghiệp',
    organization: 'Enterprise Business Users',
    industry: 'Doanh nghiệp & Dịch vụ',
    department: 'Văn phòng Tổng hợp & CSKH',
    expiryDurationHours: 6,
    expiryDateText: 'Còn 5 giờ 30 phút',
    description: 'Chuẩn hóa xử lý email khiếu nại, phân loại khảo sát khách hàng, lập biên bản họp và trích xuất dữ liệu đa nguồn.',
    iconName: 'Briefcase'
  }
];

export const DEMO_LEARNERS: Learner[] = [
  {
    id: 'learner-1',
    name: 'Linh Phạm',
    email: 'linh.pham@agribank.com.vn',
    role: 'STUDENT',
    organization: 'Agribank Việt Nam',
    department: 'Ban Truyền thông & Thương hiệu',
    avatarInitials: 'LP'
  },
  {
    id: 'learner-2',
    name: 'Minh Trần',
    email: 'minh.tran@agribank.com.vn',
    role: 'STUDENT',
    organization: 'Agribank Việt Nam',
    department: 'Khối Quản lý & Thẩm định Tín dụng',
    avatarInitials: 'MT'
  },
  {
    id: 'learner-3',
    name: 'Phương Nguyễn',
    email: 'phuong.nguyen@enterprise.com',
    role: 'STUDENT',
    organization: 'Enterprise Business Users',
    department: 'Văn phòng Tổng hợp',
    avatarInitials: 'PN'
  }
];

export const DEFAULT_ENROLLMENTS: Record<string, Enrollment> = {
  'learner-1_AGRI-COMM': {
    learnerId: 'learner-1',
    classId: 'AGRI-COMM',
    completedLabIds: ['lab-1', 'lab-2'],
    currentLabId: 'lab-3',
    enrolledAt: '2026-09-21T08:00:00Z',
    expiresAt: '2026-09-21T18:00:00Z'
  },
  'learner-2_AGRI-CREDIT': {
    learnerId: 'learner-2',
    classId: 'AGRI-CREDIT',
    completedLabIds: ['lab-1'],
    currentLabId: 'lab-2',
    enrolledAt: '2026-09-21T09:00:00Z',
    expiresAt: '2026-09-21T19:00:00Z'
  }
};
