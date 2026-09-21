import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, X, Check, Eye } from 'lucide-react';

interface Step {
  stepIndex: number;
  title: string;
  targetId: string;
  description: string;
  tip: string;
}

const TUTORIAL_STEPS: Step[] = [
  {
    stepIndex: 1,
    title: '1. Đọc Tình huống & Nhiệm vụ',
    targetId: 'tour-scenario',
    description: 'Đây là bài toán nghiệp vụ thực tế bạn cần xử lý. Hãy đọc nhanh để biết bạn đang đóng vai trò gì và cần giải quyết việc gì.',
    tip: '💡 Mẹo: Nhìn vào dòng "Bạn cần làm gì" để nắm nhanh mục tiêu trong 3 giây.'
  },
  {
    stepIndex: 2,
    title: '2. Ô Soạn thảo Câu lệnh (Prompt)',
    targetId: 'tour-prompt',
    description: 'Đây là nơi bạn giao việc cho AI. Bạn hướng dẫn càng rõ ràng về vai trò, nhiệm vụ và định dạng bảng, AI trả lời càng chính xác.',
    tip: '💡 Bạn có thể tự gõ thử trước, hoặc bấm "Xem gợi ý" nếu chưa biết bắt đầu từ đâu.'
  },
  {
    stepIndex: 3,
    title: '3. Nút Chạy Thử Nghiệm',
    targetId: 'tour-run',
    description: 'Sau khi soạn xong prompt, bấm nút này (hoặc nhấn phím tắt Ctrl + Enter) để gửi yêu cầu đến mô hình AI và xem kết quả tức thì.',
    tip: '💡 Hệ thống sẽ tự động đánh giá và chấm điểm chất lượng câu lệnh của bạn.'
  },
  {
    stepIndex: 4,
    title: '4. Quan sát Kết quả & Tiến bộ',
    targetId: 'tour-output',
    description: 'Quan sát câu trả lời từ AI xem đã đúng ý bạn chưa. Sau khi chạy thử lần thứ 2, hệ thống sẽ mở khóa bảng "So sánh Đối chiếu" để bạn thấy rõ sự tiến bộ.',
    tip: '💡 Trọng tâm là thấy được: Mình đã sửa prompt ở đâu, và kết quả tốt hơn thế nào.'
  },
  {
    stepIndex: 5,
    title: '5. Bé Trợ Lý AI Học Tập',
    targetId: 'tour-coach',
    description: 'Bất cứ khi nào bạn gặp khó khăn, hãy bấm vào Bé Trợ Lý ở góc dưới bên phải. Bé sẽ đặt câu hỏi gợi ý và giải thích giúp bạn tự làm bài mà không làm lộ đáp án.',
    tip: '💡 Bé Trợ Lý có sẵn các nút tác vụ nhanh: "Gợi ý cho bước này", "Kiểm tra prompt của tôi".'
  }
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingTutorial: React.FC<Props> = ({ isOpen, onClose }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // Luôn bắt đầu từ bước 1 mỗi khi mở lại tutorial
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen]);

  // Cuộn nhẹ đến phần tử được hướng dẫn nếu tìm thấy
  useEffect(() => {
    if (!isOpen) return;
    const currentStep = TUTORIAL_STEPS[currentStepIndex];
    if (currentStep) {
      const el = document.querySelector(`[data-tour="${currentStep.targetId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentStepIndex, isOpen]);

  if (!isOpen) return null;

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('promptify_tutorial_completed', 'true');
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem('promptify_tutorial_completed', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px] animate-fadeIn font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scaleIn">
        {/* Header Tutorial */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <h4 className="font-bold text-sm">
              Hướng dẫn nhanh trong 60 giây ({currentStep.stepIndex} / {TUTORIAL_STEPS.length})
            </h4>
          </div>

          <button
            onClick={handleSkip}
            className="text-slate-400 hover:text-white p-1 rounded transition"
            title="Bỏ qua hướng dẫn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thanh tiến trình bước (Dots) */}
        <div className="w-full bg-slate-100 h-1 flex">
          {TUTORIAL_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`flex-1 h-full transition-all duration-300 ${
                idx <= currentStepIndex ? 'bg-emerald-600' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Thân Hướng Dẫn */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              {currentStep.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {currentStep.description}
            </p>
          </div>

          {/* Hộp Mẹo nhỏ */}
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 text-xs leading-relaxed">
            {currentStep.tip}
          </div>
        </div>

        {/* Footer Điều Khiển */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-xs text-slate-400 hover:text-slate-700 font-medium transition"
          >
            Bỏ qua hướng dẫn
          </button>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-100 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition"
            >
              <span>{isLastStep ? 'Bắt đầu học ngay!' : 'Tiếp tục'}</span>
              {isLastStep ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

