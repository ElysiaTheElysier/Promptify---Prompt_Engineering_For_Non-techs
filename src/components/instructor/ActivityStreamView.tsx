import React, { useState, useMemo } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  PlayCircle, 
  Terminal, 
  SplitSquareVertical, 
  Bookmark, 
  Clock, 
  Filter, 
  Users,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { InstructorActivity, InstructorActionType } from '../../types/instructor';
import { INSTRUCTOR_ACTIVITIES, INSTRUCTOR_CLASSES } from '../../data/instructorData';

interface ActivityStreamViewProps {
  onOpenTutorial?: () => void;
}

export const ActivityStreamView: React.FC<ActivityStreamViewProps> = ({ onOpenTutorial }) => {
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

  const getActionIcon = (actionType: InstructorActionType) => {
    switch (actionType) {
      case 'complete_lab':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'export_library':
        return <Bookmark className="w-4 h-4 text-indigo-600" />;
      case 'run_prompt':
        return <Terminal className="w-4 h-4 text-amber-600" />;
      case 'compare_result':
        return <SplitSquareVertical className="w-4 h-4 text-purple-600" />;
      case 'start_lab':
      default:
        return <PlayCircle className="w-4 h-4 text-blue-600" />;
    }
  };

  const getActionBadge = (actionType: InstructorActionType, actionText: string) => {
    switch (actionType) {
      case 'complete_lab':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {actionText}
          </span>
        );
      case 'export_library':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            {actionText}
          </span>
        );
      case 'run_prompt':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            {actionText}
          </span>
        );
      case 'compare_result':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            {actionText}
          </span>
        );
      case 'start_lab':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            {actionText}
          </span>
        );
    }
  };

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
              Theo dõi từng thao tác học tập, chạy prompt và hoàn thành bài lab của học viên
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
              {INSTRUCTOR_CLASSES.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Type Filters */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
          <button
            onClick={() => setSelectedActionType('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              selectedActionType === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tất cả hoạt động
          </button>
          <button
            onClick={() => setSelectedActionType('complete_lab')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              selectedActionType === 'complete_lab'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
            }`}
          >
            Hoàn thành bài học
          </button>
          <button
            onClick={() => setSelectedActionType('run_prompt')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              selectedActionType === 'run_prompt'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-amber-50 hover:text-amber-800'
            }`}
          >
            Chạy câu lệnh Prompt
          </button>
          <button
            onClick={() => setSelectedActionType('compare_result')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              selectedActionType === 'compare_result'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-purple-50 hover:text-purple-800'
            }`}
          >
            So sánh kết quả
          </button>
          <button
            onClick={() => setSelectedActionType('export_library')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              selectedActionType === 'export_library'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-800'
            }`}
          >
            Lưu Thư viện
          </button>
          <button
            onClick={() => setSelectedActionType('start_lab')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              selectedActionType === 'start_lab'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-blue-50 hover:text-blue-800'
            }`}
          >
            Bắt đầu bài mới
          </button>
        </div>
      </div>

      {/* Activity Timeline List */}
      <div data-tour="activity-stream-list" className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {filteredActivities.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Activity className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-600">Không có hoạt động nào phù hợp</p>
            <p className="text-xs text-slate-400 mt-1">Hãy thử chọn bộ lọc khác</p>
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
                    {getActionBadge(act.actionType, act.actionText)}
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

