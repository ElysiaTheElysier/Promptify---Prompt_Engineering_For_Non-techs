import { InstructorViewMode } from '../types/instructor';

export interface InstructorTutorialStep {
  stepIndex: number;
  title: string;
  targetId: string;
  description: string;
  tip: string;
}

export interface TabTutorialConfig {
  viewMode: InstructorViewMode;
  tabName: string;
  tabBadge: string;
  steps: InstructorTutorialStep[];
}

export const INSTRUCTOR_TUTORIAL_DATA: Record<InstructorViewMode, TabTutorialConfig> = {
  dashboard: {
    viewMode: 'dashboard',
    tabName: 'Tổng quan Điều hành',
    tabBadge: 'Tổng quan',
    steps: [
      {
        stepIndex: 1,
        title: '1. Thước đo tiến độ tổng hợp (Stat Strip)',
        targetId: 'instructor-stat-strip',
        description: 'Nắm bắt nhanh số lớp đang vận hành, tổng số học viên tham gia và tỷ lệ hoàn thành toàn khóa học chỉ trong vài giây.',
        tip: '💡 Tỷ lệ hoàn thành trung bình trên 60% cho thấy nhịp độ buổi workshop đang diễn ra thuận lợi.'
      },
      {
        stepIndex: 2,
        title: '2. Khu vực ưu tiên: Lớp cần chú ý',
        targetId: 'instructor-focus-class',
        description: 'Hệ thống tự động phát hiện lớp có nhiều học viên chưa bắt đầu hoặc gặp khó khăn. Bấm "Xem chi tiết lớp" để can thiệp kịp thời.',
        tip: '💡 Hãy chủ động liên hệ hoặc hỗ trợ nhóm học viên ở lớp này trước khi buổi đào tạo kết thúc.'
      },
      {
        stepIndex: 3,
        title: '3. Danh sách các lớp đang diễn ra',
        targetId: 'instructor-other-classes',
        description: 'Quét nhanh các lớp đào tạo khác theo dạng bảng phẳng, đối chiếu tỷ lệ hoàn thành và số học viên đã nộp bài.',
        tip: '💡 Bạn có thể bấm "Xem chi tiết →" trên bất kỳ lớp nào để kiểm tra danh sách học viên.'
      },
      {
        stepIndex: 4,
        title: '4. Dòng hoạt động gần nhất',
        targetId: 'instructor-recent-activity',
        description: 'Theo dõi học viên nào vừa bắt đầu làm lab, vừa chạy prompt thử nghiệm hay vừa hoàn thành bài học theo thời gian thực.',
        tip: '💡 Giúp bạn biết không khí lớp học có đang sôi nổi và các học viên có đang tích cực làm bài hay không.'
      }
    ]
  },
  classes: {
    viewMode: 'classes',
    tabName: 'Danh sách Lớp học',
    tabBadge: 'Lớp học',
    steps: [
      {
        stepIndex: 1,
        title: '1. Danh mục các lớp được phân công',
        targetId: 'classes-list-header',
        description: 'Xem toàn bộ danh sách lớp bạn đang phụ trách, bao gồm mã lớp (Class Code), đơn vị/phòng ban và thời gian mở lớp.',
        tip: '💡 Học viên có thể dùng Mã lớp (ví dụ: PE101-K01) để tự ghi danh vào buổi học.'
      },
      {
        stepIndex: 2,
        title: '2. Thanh tiến độ trung bình từng lớp',
        targetId: 'classes-progress-overview',
        description: 'Quan sát trực quan tỷ lệ % hoàn thành và tỷ số học viên đã về đích so với tổng số học viên trong lớp.',
        tip: '💡 Màu xanh lá thể hiện tỷ lệ hoàn thành cao, giúp bạn so sánh tốc độ học tập giữa các phòng ban.'
      },
      {
        stepIndex: 3,
        title: '3. Nút đi sâu vào Chi tiết lớp',
        targetId: 'classes-detail-cta',
        description: 'Bấm "Vào chi tiết lớp" để mở trang giám sát lộ trình 5 bài lab và kiểm tra bảng điểm danh học viên của riêng lớp đó.',
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
        stepIndex: 1,
        title: '1. Thông tin tổng quan & Thời lượng lớp',
        targetId: 'class-detail-header',
        description: 'Nắm bắt mã lớp, giảng viên phụ trách, tỷ lệ hoàn thành trung bình và thời gian còn lại trước khi kết thúc buổi học.',
        tip: '💡 Giúp bạn kiểm soát thời lượng buổi workshop để phân bổ thời gian giải lao và thực hành hợp lý.'
      },
      {
        stepIndex: 2,
        title: '2. Lộ trình 5 bài thực hành (Lab 1 đến Lab 5)',
        targetId: 'class-detail-labs-roadmap',
        description: 'Thống kê số lượng học viên đã vượt qua từng bài lab. Giúp bạn phát hiện ngay bài lab nào có tỷ lệ hoàn thành thấp.',
        tip: '💡 Nếu thấy tỷ lệ bài Lab 3 hoặc 4 giảm đột ngột, hãy tạm dừng lớp để giảng giải kỹ hơn về kỹ thuật đó.'
      },
      {
        stepIndex: 3,
        title: '3. Bảng phân loại học viên trong lớp',
        targetId: 'class-detail-learners-table',
        description: 'Xem danh sách học viên trong lớp, lọc nhanh theo trạng thái: Đang học, Cần chú ý (chưa bắt đầu), hoặc Đã hoàn thành.',
        tip: '💡 Bấm vào tên bất kỳ học viên nào để mở modal chi tiết lịch sử làm bài và câu lệnh của họ.'
      }
    ]
  },
  learners: {
    viewMode: 'learners',
    tabName: 'Quản lý Học viên Toàn hệ thống',
    tabBadge: 'Học viên',
    steps: [
      {
        stepIndex: 1,
        title: '1. Bảng dữ liệu học viên tập trung',
        targetId: 'learners-data-table',
        description: 'Tra cứu danh sách 86 học viên từ tất cả các lớp với đầy đủ thông tin: Họ tên, Email, Mã NV, Phòng ban và Lớp tham gia.',
        tip: '💡 Cột Tiến độ và Trạng thái cho biết học viên đang ở bài lab nào và lần hoạt động gần nhất.'
      },
      {
        stepIndex: 2,
        title: '2. Bộ lọc Trạng thái và Bộ lọc Lớp học',
        targetId: 'learners-filter-tabs',
        description: 'Lọc nhanh danh sách theo các nhóm: Tất cả, Đang học, Cần chú ý (chưa bắt đầu) hoặc Đã hoàn thành.',
        tip: '💡 Chọn tab "Cần chú ý" để nhanh chóng điểm danh những người chưa vào làm bài.'
      },
      {
        stepIndex: 3,
        title: '3. Thanh tìm kiếm thông minh',
        targetId: 'learners-search-input',
        description: 'Gõ tên hoặc địa chỉ email của học viên để tìm kiếm tức thì khi học viên giơ tay nhờ hỗ trợ.',
        tip: '💡 Hỗ trợ tìm kiếm không phân biệt chữ hoa, chữ thường và gõ tiếng Việt có dấu.'
      },
      {
        stepIndex: 4,
        title: '4. Soi chi tiết Prompt & Lịch sử chạy',
        targetId: 'learners-inspect-prompt',
        description: 'Bấm vào bất kỳ dòng học viên nào để mở modal chi tiết: xem tiến độ 5 bài, số lần chạy prompt và câu lệnh gần nhất.',
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
        stepIndex: 1,
        title: '1. Dòng sự kiện trực tiếp (Live Stream)',
        targetId: 'activity-timeline-feed',
        description: 'Ghi nhận mọi thao tác của học viên theo thời gian thực: nộp bài, chạy prompt thử nghiệm, hoàn thành bài lab.',
        tip: '💡 Dữ liệu hiển thị trực tiếp theo trình tự thời gian, sự kiện mới nhất nằm ở trên cùng.'
      },
      {
        stepIndex: 2,
        title: '2. Bộ đếm nhịp độ tương tác',
        targetId: 'activity-metrics-strip',
        description: 'Thống kê tổng lượt nộp bài, tổng số lần chạy prompt và số học viên đang tích cực hoạt động trong buổi học.',
        tip: '💡 Số lần chạy prompt cao chứng minh học viên đang chủ động thử nghiệm và cải tiến prompt.'
      },
      {
        stepIndex: 3,
        title: '3. Bộ lọc theo lớp học',
        targetId: 'activity-class-filter',
        description: 'Lọc luồng sự kiện theo từng lớp riêng biệt để instructor tập trung theo dõi lớp mình đang đứng.',
        tip: '💡 Chọn "Tất cả các lớp" nếu bạn là Trưởng ban điều phối đào tạo chung.'
      }
    ]
  }
};
