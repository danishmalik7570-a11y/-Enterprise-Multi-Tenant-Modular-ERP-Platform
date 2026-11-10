import React from 'react';

interface StatusPillProps {
  status: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, variant }) => {
  let v = variant;

  if (!v) {
    const s = (status || '').toLowerCase();
    if (['paid', 'confirmed', 'received', 'active', 'goods', 'true', 'operational'].includes(s)) {
      v = 'success';
    } else if (['draft', 'pending', 'low_stock', 'needs service', 'inbound'].includes(s)) {
      v = 'warning';
    } else if (['cancelled', 'failed', 'overdue', 'broken', 'false', 'inactive'].includes(s)) {
      v = 'danger';
    } else if (['service', 'customer', 'supplier', 'asset', 'revenue'].includes(s)) {
      v = 'info';
    } else {
      v = 'neutral';
    }
  }

  const styles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-[#EAF2FF] text-[#1E5FBF] border-[#BFDBFE]',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  }[v];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles}`}>
      {status}
    </span>
  );
};
