import React, { useState, useEffect } from 'react';
import { Clock, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ClassCohort } from '../../types';

interface Props {
  cohort: ClassCohort;
}

export const ExpirationBanner: React.FC<Props> = ({ cohort }) => {
  const [timeLeft, setTimeLeft] = useState<string>('3 hours 48 mins');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState('2 minutes ago');

  useEffect(() => {
    let totalMinutes = cohort.expiryDurationHours * 60 - 12;
    const interval = setInterval(() => {
      totalMinutes = Math.max(0, totalMinutes - 1);
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      setTimeLeft(`${hours} hours ${mins} mins`);
    }, 60000);
    return () => clearInterval(interval);
  }, [cohort]);

  const handleForceSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSync('Just now');
    }, 800);
  };

  return (
    <div className="bg-[#FEF3C7] border-b border-[#FCD34D] px-4 py-2 text-xs md:text-sm text-[#92400E] flex flex-wrap items-center justify-between gap-2 transition-all">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-[#D97706] flex-shrink-0 animate-pulse" />
        <span>
          <strong>Temporary access session:</strong> You are enrolled in class <strong>{cohort.name}</strong> ({cohort.id}). Remaining access: <span className="font-bold underline">{timeLeft}</span>.
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#78350F]">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Google Sheet Roster: Synced {lastSync}
        </span>
        <button
          onClick={handleForceSync}
          disabled={isSyncing}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#FDE68A] hover:bg-[#FCD34D] text-[#78350F] font-medium text-xs transition border border-[#F59E0B]/30"
          title="Synchronize learner roster immediately from Google Sheet"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>
    </div>
  );
};
