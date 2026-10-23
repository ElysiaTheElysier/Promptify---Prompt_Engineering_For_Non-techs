import { InstructorViewMode } from '../types/instructor';

export interface InstructorSpotlightStep {
  id: string;
  stepNumber: number;
  totalSteps: number;
  targetId: string; // corresponds to [data-tour="targetId"]
  title: string;
  description: string;
  actionText?: string;
  tip?: string;
}

export interface TabTourConfig {
  viewMode: InstructorViewMode;
  tabName: string;
  tabBadge: string;
  steps: InstructorSpotlightStep[];
}

export const INSTRUCTOR_TUTORIAL_DATA: Record<InstructorViewMode, TabTourConfig> = {
  dashboard: {
    viewMode: 'dashboard',
    tabName: 'Tổng quan Điều hành',
    tabBadge: 'Tổng quan',
    steps: [
      {
        id: 'instructor-dashboard-step-1',
        stepNumber: 1,
        totalSteps: 6,
        targetId: 'instructor-dashboard-header',
        title: 'Tổng quan lớp học',
        description: 'Đây là màn hình trang chủ của Giảng viên / Quản lý lớp. Từ đây bạn có thể bao quát toàn bộ tiến độ các lớp, tình trạng học viên và hoạt động trong buổi đào tạo.',
        tip: '💡 Mọi quyết định điều phối lớp học đều có thể khởi đầu nhanh chóng từ trang này.'
      },
      {
        id: 'instructor-dashboard-step-2',
        stepNumber: 2,
        totalSteps: 6,
        targetId: 'instructor-summary-stats',
        title: 'Chỉ số tiến độ tổng hợp',
        description: 'Đây là snapshot nhanh giúp bạn nắm bắt quy mô lớp học và tình trạng chung: số lớp đang hoạt động, tổng số học viên tham gia và số học viên đã hoàn thành khóa học.',
        tip: '💡 Giúp bạn nắm bắt nhanh tiến độ chung toàn khóa học trong 3 giây mà không cần tính toán thủ công.'
      },
      {
        id: 'instructor-dashboard-step-3',
        stepNumber: 3,
        totalSteps: 6,
        targetId: 'instructor-priority-class',
        title: 'Lớp cần chú ý',
        description: 'Đây là khu vực quan trọng nhất. Promptify ưu tiên hiển thị lớp có dấu hiệu cần can thiệp, ví dụ nhiều học viên chưa bắt đầu hoặc tiến độ còn thấp.',
        actionText: 'Bạn có thể bấm "Xem chi tiết lớp →" để đi sâu hơn và hỗ trợ kịp thời.',
        tip: '💡 Hãy ưu tiên dành thời gian kiểm tra lớp này trước khi buổi workshop kết thúc.'
      },
      {
        id: 'instructor-dashboard-step-4',
        stepNumber: 4,
        totalSteps: 6,
        targetId: 'instructor-other-classes',
        title: 'Danh sách các lớp còn lại',
        description: 'Nơi xem nhanh toàn bộ các lớp đang quản lý. Mỗi dòng cho biết tiến độ % hoàn thành và bạn có thể bấm vào để xem chi tiết từng lớp.',
        actionText: 'Bấm vào bất kỳ dòng lớp nào để mở trang chi tiết tương ứng.',
        tip: '💡 Bố cục dạng danh sách phẳng giúp quét dữ liệu nhanh mà không bị rối mắt.'
      },
      {
        id: 'instructor-dashboard-step-5',
        stepNumber: 5,
        totalSteps: 6,
        targetId: 'instructor-recent-activity',
        title: 'Nhật ký hoạt động gần đây',
        description: 'Cho biết học viên/lớp đang hoạt động ra sao theo thời gian thực (bắt đầu bài, chạy prompt, nộp bài). Đây là thông tin hỗ trợ, không phải trọng tâm đầu tiên.',
        tip: '💡 Giúp bạn biết không khí lớp học có đang tích cực làm bài hay không.'
      },
      {
        id: 'instructor-dashboard-step-6',
        stepNumber: 6,
        totalSteps: 6,
        targetId: 'instructor-nav-tabs',
        title: 'Thanh điều hướng quản lý',
        description: 'Instructor có thể dùng thanh này để chuyển đổi nhanh giữa các khu vực: Tổng quan, Lớp học, Học viên, và Nhật ký hoạt động.',
        tip: '💡 Bấm vào tab "Học viên" để tra cứu và soi chi tiết câu lệnh của từng người.'
      }
    ]
  },
  classes: {
    viewMode: 'classes',
    tabName: 'Danh sách Lớp học',
    tabBadge: 'Lớp học',
    steps: [
      {
        id: 'classes-step-1',
        stepNumber: 1,
        totalSteps: 3,
        targetId: 'classes-header',
        title: 'Danh mục các lớp đang phụ trách',
        description: 'Xem toàn bộ danh sách lớp bạn đang phụ trách, bao gồm mã lớp (Class Code), đơn vị/phòng ban và thời gian mở lớp.',
        tip: '💡 Học viên có thể dùng Mã lớp (ví dụ: PE101-K01) để tự ghi danh vào buổi học.'
      },
      {
        id: 'classes-step-2',
        stepNumber: 2,
        totalSteps: 3,
        targetId: 'classes-list-grid',
        title: 'Thanh tiến độ trung bình từng lớp',
        description: 'Quan sát trực quan tỷ lệ % hoàn thành và tỷ số học viên đã về đích so với tổng số học viên trong lớp.',
        tip: '💡 Màu xanh lá thể hiện tỷ lệ hoàn thành cao, giúp bạn so sánh tốc độ học tập giữa các phòng ban.'
      },
      {
        id: 'classes-step-3',
        stepNumber: 3,
        totalSteps: 3,
        targetId: 'classes-detail-btn',
        title: 'Vào chi tiết từng lớp',
        description: 'Bấm "Vào chi tiết lớp" để mở trang giám sát lộ trình 5 bài lab và kiểm tra bảng điểm danh học viên của riêng lớp đó.',
        actionText: 'Bấm "Vào chi tiết lớp" để kiểm tra bài làm của học viên.',
        tip: '💡 Từ trang chi tiết, bạn có thể bấm vào từng học viên để xem câu lệnh prompt và số lần thử nghiệm.'
      }
    ]
  },
  class_detail: {
    viewMode: 'class_detail',
    tabName: 'Chi tiết Một Lớp học',
    tabBadge: 'Chi tiết lớp',
    steps: [
      {
        id: 'class-detail-step-1',
        stepNumber: 1,
        totalSteps: 3,
        targetId: 'class-detail-header',
        title: 'Thông tin & Thời lượng lớp học',
        description: 'Nắm bắt mã lớp, giảng viên phụ trách, tỷ lệ hoàn thành trung bình và thời gian còn lại trước khi kết thúc buổi học.',
        tip: '💡 Giúp bạn kiểm soát thời lượng buổi workshop để phân bổ thời gian giải lao và thực hành hợp lý.'
      },
      {
        id: 'class-detail-step-2',
        stepNumber: 2,
        totalSteps: 3,
        targetId: 'class-detail-roadmap',
        title: 'Lộ trình 5 bài thực hành (Lab 1 đến Lab 5)',
        description: 'Thống kê số lượng học viên đã vượt qua từng bài lab. Giúp bạn phát hiện ngay bài lab nào có tỷ lệ hoàn thành thấp.',
        tip: '💡 Nếu thấy tỷ lệ bài Lab 3 hoặc 4 giảm đột ngột, hãy tạm dừng lớp để giảng giải kỹ hơn về kỹ thuật đó.'
      },
      {
        id: 'class-detail-step-3',
        stepNumber: 3,
        totalSteps: 3,
        targetId: 'class-detail-learners',
        title: 'Bảng phân loại học viên trong lớp',
        description: 'Xem danh sách học viên trong lớp, lọc nhanh theo trạng thái: Đang học, Cần chú ý (chưa bắt đầu), hoặc Đã hoàn thành.',
        actionText: 'Bấm vào tên bất kỳ học viên nào để mở modal chi tiết lịch sử làm bài.',
        tip: '💡 Bấm vào tên bất kỳ học viên nào để xem số lần chạy prompt và câu lệnh của họ.'
      }
    ]
  },
  learners: {
    viewMode: 'learners',
    tabName: 'Quản lý Học viên Toàn hệ thống',
    tabBadge: 'Học viên',
    steps: [
      {
        id: 'learners-step-1',
        stepNumber: 1,
        totalSteps: 4,
        targetId: 'learners-header',
        title: 'Bảng dữ liệu học viên tập trung',
        description: 'Tra cứu danh sách 86 học viên từ tất cả các lớp với đầy đủ thông tin: Họ tên, Email, Mã NV, Phòng ban và Lớp tham gia.',
        tip: '💡 Cột Tiến độ và Trạng thái cho biết học viên đang ở bài lab nào và lần hoạt động gần nhất.'
      },
      {
        id: 'learners-step-2',
        stepNumber: 2,
        totalSteps: 4,
        targetId: 'learners-search-filter',
        title: 'Tìm kiếm & Bộ lọc theo lớp',
        description: 'Gõ tên hoặc địa chỉ email để tìm kiếm học viên tức thì khi có người giơ tay nhờ hỗ trợ, hoặc lọc theo từng lớp cụ thể.',
        tip: '💡 Hỗ trợ tìm kiếm không phân biệt chữ hoa, chữ thường và gõ tiếng Việt có dấu.'
      },
      {
        id: 'learners-step-3',
        stepNumber: 3,
        totalSteps: 4,
        targetId: 'learners-status-tabs',
        title: 'Bộ lọc trạng thái học viên',
        description: 'Lọc nhanh danh sách theo các nhóm: Tất cả, Đang học, Cần chú ý (chưa bắt đầu) hoặc Đã hoàn thành.',
        actionText: 'Chọn tab "Cần chú ý" để nhanh chóng điểm danh những người chưa vào làm bài.',
        tip: '💡 Giúp bạn chủ động phát hiện học viên đang gặp trở ngại để hỗ trợ ngay.'
      },
      {
        id: 'learners-step-4',
        stepNumber: 4,
        totalSteps: 4,
        targetId: 'learners-table-rows',
        title: 'Soi chi tiết Prompt & Lịch sử chạy',
        description: 'Bấm vào bất kỳ dòng học viên nào để mở modal chi tiết: xem tiến độ 5 bài, số lần chạy prompt và câu lệnh gần nhất.',
        actionText: 'Bấm trực tiếp vào dòng học viên để xem câu lệnh thực tế.',
        tip: '💡 Bạn có thể xem trực tiếp câu lệnh học viên đã soạn để góp ý cách cải thiện prompt.'
      }
    ]
  },
  activity: {
    viewMode: 'activity',
    tabName: 'Nhật ký Hoạt động Thời gian thực',
    tabBadge: 'Nhật ký',
    steps: [
      {
        id: 'activity-step-1',
        stepNumber: 1,
        totalSteps: 3,
        targetId: 'activity-header',
        title: 'Lịch sử chạy Prompt từ cơ sở dữ liệu',
        description: 'Hiển thị các lần chạy prompt đã được ghi vào bảng prompt_attempts, kèm bài học, lần thử và điểm đánh giá nếu có.',
        tip: '💡 Sự kiện mới nhất nằm ở trên cùng; màn hình không tạo hoạt động mô phỏng.'
      },
      {
        id: 'activity-step-2',
        stepNumber: 2,
        totalSteps: 3,
        targetId: 'activity-filters',
        title: 'Bộ lọc hoạt động theo lớp',
        description: 'Lọc luồng sự kiện theo từng lớp riêng biệt để instructor tập trung theo dõi lớp mình đang đứng giảng.',
        tip: '💡 Danh sách lớp trong bộ lọc được tải trực tiếp từ Supabase.'
      },
      {
        id: 'activity-step-3',
        stepNumber: 3,
        totalSteps: 3,
        targetId: 'activity-stream-list',
        title: 'Dòng thời gian sự kiện học viên',
        description: 'Mỗi sự kiện hiển thị thời điểm, học viên, lớp, bài học, số lần thử và điểm evaluation đã lưu.',
        tip: '💡 Nếu chưa có prompt_attempts thật, danh sách sẽ để trống thay vì hiển thị dữ liệu mẫu.'
      }
    ]
  }
};
