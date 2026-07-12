import React from 'react';
import type { DiscoverStats as DiscoverStatsData } from '../types/discover';

interface DiscoverStatsProps {
  stats: DiscoverStatsData | null;
}

export const DiscoverStats: React.FC<DiscoverStatsProps> = ({ stats }) => {
  if (!stats) return null;

  const items = [
    { label: 'Remaining', value: stats.profiles_remaining },
    { label: 'Viewed', value: stats.total_profiles_viewed },
    { label: 'Sent', value: stats.total_connection_requests },
    { label: 'Success', value: `${Math.round(stats.success_rate)}%` },
  ];

  return (
    <div className="flex gap-1 px-4 py-2 bg-background border-b overflow-x-auto">
      {items.map(({ label, value }) => (
        <div
          key={label}
          className="flex flex-col items-center min-w-[72px] px-3 py-1 rounded-lg bg-muted/50"
        >
          <span className="text-base font-bold text-foreground leading-tight">{value}</span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
};

export default DiscoverStats;
