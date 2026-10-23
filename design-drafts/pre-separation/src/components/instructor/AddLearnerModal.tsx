import React, { useState } from 'react';
import { 
  X, 
  UserPlus, 
  Mail, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Building2,
  Sparkles
} from 'lucide-react';
import { dbService } from '../../services/dbService';
import { LearnerInClassDetail } from '../../types/database';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  classCode: string;
  department: string;
  onLearnerAdded: (newLearner: LearnerInClassDetail) => void;
}

export const AddLearnerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  classId,
  classCode,
  department,
  onLearnerAdded,
}) => {
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessInfo(null);

    try {
      const res = await dbService.addLearnerToClass(classId, {
        fullName: fullName.trim(),
        email: email.trim(),
      });

      setSuccessInfo(`Đã thêm thành công học viên ${res.learner.full_name} với mã ${res.learner.learner_code}!`);
      onLearnerAdded(res.learner);

      setTimeout(() => {
        setFullName('');
        setEmail('');
        setSuccessInfo(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi thêm học viên vào lớp');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Thêm Học Viên Vào Lớp
              </h3>
              <p className="text-xs text-slate-500">
                Lớp: <span className="font-mono font-bold text-slate-700">{classCode}</span> • {department}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successInfo && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successInfo}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Họ và Tên Học Viên <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ví dụ: Đỗ Hoàng Long"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Email Cơ Quan / Cá Nhân <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ví dụ: long.dh@agribank.com.vn"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
            </div>
            <p className="text-[11px] text-slate-400 pl-1">
              Học viên dùng email này để đăng nhập Google OAuth vào lớp học.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>Quy trình tự động hóa:</span>
            </div>
            <p>1. Tự động kiểm tra / tạo tài khoản học viên (role = learner).</p>
            <p>2. Cấp phát mã định danh học viên độc nhất: <strong className="text-emerald-700">LRN-XXXXXX</strong>.</p>
            <p>3. Ghi danh (Enrollment) trực tiếp vào lớp <span className="font-mono text-slate-800">{classCode}</span>.</p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !fullName.trim() || !email.trim()}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition disabled:opacity-50"
            >
              {isSubmitting ? 'Đang thêm...' : '+ Thêm học viên'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

