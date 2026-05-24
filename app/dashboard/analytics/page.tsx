import React from 'react'
import PageHeader from '@/components/shared/page-header'
import OverviewCard from '@/components/dashboard/overview-card'
import ProductivityCard from '@/components/dashboard/productivity-card'

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <PageHeader
        title="Productivity Analytics"
        description="Detailed insights and metrics of your daily work sessions, habits, and focus scores."
      />

      {/* Overview stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <OverviewCard
          title="Total Focus Time"
          value="12.5 hrs"
          description="Focus allocation this week"
          trend="+18%"
        />
        <OverviewCard
          title="Task Completion Rate"
          value="94%"
          description="92 tasks completed"
          trend="+4%"
        />
        <OverviewCard
          title="Average Focus Score"
          value="86/100"
          description="Based on cognitive patterns"
          trend="+2%"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Mock productivity chart */}
          <div className="glass-panel rounded-3xl p-6 space-y-4 h-full">
            <h3 className="font-bold text-sm text-white">Focus Cycles History</h3>
            <p className="text-xs text-[#c7c4d7]/50">Visual mapping of daily focus scores over the past week.</p>
            <div className="h-48 flex items-end gap-3 pt-6">
              {[65, 78, 70, 85, 90, 82, 86].map((score, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-white/5 border border-white/5 rounded-lg h-36 flex items-end overflow-hidden">
                    <div
                      className="bg-gradient-to-t from-[#8083ff] to-[#c0c1ff] w-full rounded-b-lg hover:from-[#c0c1ff] hover:to-white transition-all duration-300"
                      style={{ height: `${score}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] font-bold text-[#c7c4d7]/60 font-mono">Day {idx + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div>
          <ProductivityCard />
        </div>
      </div>
    </div>
  )
}
