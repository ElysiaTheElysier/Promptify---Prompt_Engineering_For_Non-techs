import React, { useState, useMemo } from 'react';
import { HelpCircle } from 'lucide-react';
import { InstructorActivity, InstructorActionType } from '../../types/instructor';
import { INSTRUCTOR_ACTIVITIES, INSTRUCTOR_CLASSES } from '../../data/instructorData';

interface Props {
  onOpenTutorial?: () => void;
}

export const ActivityStreamView: React.FC<Props> = ({ onOpenTutorial }) => {
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [selectedActionType, setSelectedActionType] = useState<string>('ALL');

  // Filter activities
  const filteredActivities = useMemo(() => {
    return INSTRUCTOR_ACTIVITIES.filter((act) => {
      if (selectedClassId !== 'ALL' && act.classId !== selectedClassId) {
        return false;
      }
      if (selectedActionType !== 'ALL' && act.actionType !== selectedActionType) {
        return false;
      }
      return true;
    });
  }, [selectedClassId, selectedActionType]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4 px-2 sm:px-0">
      {/* 1. Header (Linear Style: Clean & Calm) */}
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Nhật ký hoạt động
          </h1>
          <p className="text-sm text-slate-500">
            Dòng sự kiện tương tác thời gian thực của học viên trong các buổi học
          </p>
        </div>

        {onOpenTutorial && (
          <button
            onClick={onOpenTutorial}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-medium rounded-md transition cursor-pointer self-start sm:self-auto"
            title="Xem hướng dẫn nhật ký hoạt động"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Hướng dẫn tab này</span>
          </button>
        )}
      </div>

      {/* 2. Filter Bar (GitHub Style: Flat Filters) */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Lọc theo lớp:</span>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="bg-white border border-slate-300 text-slate-700 text-xs rounded-md px-2.5 py-1 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="ALL">Tất cả lớp học</option>
            {INSTRUCTOR_CLASSES.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">Hành động:</span>
          <select
            value={selectedActionType}
            onChange={(e) => setSelectedActionType(e.target.value)}
            className="bg-white border border-slate-300 text-slate-700 text-xs rounded-md px-2.5 py-1 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="ALL">Tất cả hành động</option>
            <option value="complete_lab">Hoàn thành bài học</option>
            <option value="run_prompt">Chạy prompt</option>
            <option value="compare_result">So sánh kết quả</option>
            <option value="export_library">Lưu thư viện</option>
            <option value="start_lab">Bắt đầu bài mới</option>
          </select>
        </div>
      </div>

      {/* 3. Flat Activity List (GitHub Style: Clean Rows with Thin Dividers, No Badges/Pills) */}
      <div className="border-t border-b border-slate-200 divide-y divide-slate-100 text-xs text-slate-600">
        {filteredActivities.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            Không có hoạt động nào phù hợp với bộ lọc
          </div>
        ) : (
          filteredActivities.map((act) => (
            <div key={act.id} className="py-3 px-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 hover:bg-slate-50/70 transition">
              <div className="min-w-0 flex-1 space-y-0.5">
                <div>
                  <span className="font-medium text-slate-900">{act.learnerName}</span>{' '}
                  <span className="text-slate-700">{act.detail}</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  <span>{act.className}</span>
                  {act.labName && (
                    <>
                      <span className="mx-1.5">·</span>
                      <span>{act.labName}</span>
                    </>
                  )}
                </div>
              </div>

              <span className="text-slate-400 text-[11px] flex-shrink-0 sm:text-right">
                {act.timeAgo}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
