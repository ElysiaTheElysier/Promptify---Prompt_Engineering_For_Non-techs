import React, { useState, useMemo } from 'react';
import { 
  Activity, 
  Clock, 
  HelpCircle
} from 'lucide-react';
import { InstructorActivity, InstructorClass } from '../../types/instructor';

interface ActivityStreamViewProps {
  onOpenTutorial?: () => void;
  classes: InstructorClass[];
  activities: InstructorActivity[];
  isLoading?: boolean;
}

export const ActivityStreamView: React.FC<ActivityStreamViewProps> = ({ onOpenTutorial, classes, activities, isLoading = false }) => {
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');

  // Filter activities
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (selectedClassId !== 'ALL' && act.classId !== selectedClassId) {
        return false;
      }
      return true;
    });
  }, [activities, selectedClassId]);

  return (
    <div className="space-y-4">
      {/* Header with Title and Tutorial Button */}
      <div data-tour="activity-header" className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Nhật ký hoạt động thời gian thực (Activity Stream)
            </h2>
            <p className="text-xs text-slate-500">
              Theo dõi các lần chạy prompt đã được lưu thật trong cơ sở dữ liệu
            </p>
          </div>
        </div>

        {onOpenTutorial && (
          <button
            onClick={onOpenTutorial}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-medium rounded-md transition cursor-pointer self-start sm:self-auto"
            title="Xem lại hướng dẫn nhật ký hoạt động"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xem lại hướng dẫn</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div data-tour="activity-filters" className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">Bộ lọc sự kiện:</span>

          {/* Class Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Lọc theo lớp:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">Tất cả lớp học</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* Activity Timeline List */}
      <div data-tour="activity-stream-list" className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            Đang tải hoạt động từ cơ sở dữ liệu...
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Activity className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-600">Không có hoạt động nào phù hợp</p>
            <p className="text-xs text-slate-400 mt-1">Chưa có lần chạy prompt thực tế phù hợp bộ lọc.</p>
          </div>
        ) : (
          filteredActivities.map((act) => (
            <div key={act.id} className="p-4 hover:bg-slate-50/70 transition flex items-start gap-4">
              {/* Learner Avatar */}
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5 border border-slate-200">
                {act.learnerAvatar}
              </div>

              {/* Activity Details */}
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{act.learnerName}</span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      {act.actionText}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3" />
                    {act.timeAgo}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">
                  {act.detail}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                  <span className="font-medium text-slate-600">Lớp: {act.className}</span>
                  {act.labName && (
                    <>
                      <span>•</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-600">
                        {act.labName}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

