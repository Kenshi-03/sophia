'use client'

import { useEffect, useState } from 'react';
import useDashboardStore from '@/stores/use-dashboard-store';

export function useProductivity() {
  const { systemLoad, recentMemoriesCount, activeNotesCount, completedTasksTodayCount, setSystemLoad } = useDashboardStore();
  const [recommendation, setRecommendation] = useState<string>('Loading productivity recommendation...');

  const fetchProductivityInsights = async () => {
    try {
      const res = await fetch(`/api/ai/recommendation?load=${systemLoad}`);
      if (res.ok) {
        const data = await res.json();
        setRecommendation(data.suggestion || 'Optimal focus state.');
      }
    } catch (err) {
      console.error('Failed to load focus recommendations:', err);
    }
  };

  useEffect(() => {
    fetchProductivityInsights();
  }, [systemLoad]);

  return {
    systemLoad,
    recentMemoriesCount,
    activeNotesCount,
    completedTasksTodayCount,
    focusRecommendation: recommendation,
    updateSystemLoad: setSystemLoad,
    triggerRefresh: fetchProductivityInsights,
  };
}
export default useProductivity;
