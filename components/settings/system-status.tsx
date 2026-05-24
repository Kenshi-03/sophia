"use client"

import React, { useState } from "react"
import { Database, Cpu, Activity, ShieldAlert, Sparkles, RefreshCw } from "lucide-react"

interface SystemStatusProps {
  memoryNodesCount: number
}

export default function SystemStatus({ memoryNodesCount }: SystemStatusProps) {
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false)
  const [dbLatency, setDbLatency] = useState(14)
  const [aiLatency, setAiLatency] = useState(382)
  const [systemLoad, setSystemLoad] = useState(8)

  const runDiagnostic = async () => {
    setIsRunningDiagnostic(true)
    
    // Simulate diagnostic loading
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Randomize latencies slightly for realism
    setDbLatency(Math.floor(Math.random() * 10) + 8) // 8-18ms
    setAiLatency(Math.floor(Math.random() * 150) + 280) // 280-430ms
    setSystemLoad(Math.floor(Math.random() * 5) + 6) // 6-11%
    
    setIsRunningDiagnostic(false)
  }

  const metrics = [
    {
      title: "Database PostgreSQL",
      icon: Database,
      iconColor: "text-[#4edea3]",
      status: "Connected",
      statusClass: "bg-[#4edea3]/10 text-[#4edea3]",
      stats: [
        { label: "Query Latency", value: `${dbLatency}ms` },
        { label: "Active Pools", value: "PrismaPg (4)" },
      ],
    },
    {
      title: "AI Cognitive Router",
      icon: Sparkles,
      iconColor: "text-[#c0c1ff]",
      status: "Active",
      statusClass: "bg-[#c0c1ff]/10 text-[#c0c1ff]",
      stats: [
        { label: "Gemini API Latency", value: `${aiLatency}ms` },
        { label: "Active Model", value: "Gemini 2.0 Flash" },
      ],
    },
    {
      title: "Memory Index Node",
      icon: Activity,
      iconColor: "text-[#adc6ff]",
      status: "Optimized",
      statusClass: "bg-[#adc6ff]/10 text-[#adc6ff]",
      stats: [
        { label: "Total Facts Stored", value: `${memoryNodesCount} Nodes` },
        { label: "Index Engine", value: "Cosine Similarity" },
      ],
    },
    {
      title: "SOPHIA Core Engine",
      icon: Cpu,
      iconColor: "text-amber-400",
      status: "Nominal",
      statusClass: "bg-amber-400/10 text-amber-400",
      stats: [
        { label: "CPU Thread Load", value: `${systemLoad}%` },
        { label: "Kernel Build", value: "v4.2.0-Alpha" },
      ],
    },
  ]

  return (
    <div className="glass-panel rounded-3xl p-6 space-y-6">
      
      {/* Header & Diagnostic trigger */}
      <div className="flex justify-between items-center border-b border-white/5 pb-3">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <ShieldAlert className="text-[#c0c1ff]" size={16} />
          <span>Cognitive System Status</span>
        </h3>
        
        <button
          onClick={runDiagnostic}
          disabled={isRunningDiagnostic}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-white/5 bg-white/5 rounded-xl text-[10px] font-bold text-[#c7c4d7] hover:text-white hover:border-[#c0c1ff]/20 transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={10} className={isRunningDiagnostic ? "animate-spin" : ""} />
          <span>Diagnostic</span>
        </button>
      </div>

      {/* Bento Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon
          
          return (
            <div
              key={metric.title}
              className="p-4 border border-white/5 bg-white/[0.01] rounded-2xl flex flex-col justify-between h-36 hover:bg-white/[0.02] hover:border-[#c0c1ff]/10 transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg bg-white/5 border border-white/10 ${metric.iconColor}`}>
                    <Icon size={14} />
                  </div>
                  <h4 className="text-xs font-bold text-white">{metric.title}</h4>
                </div>
                
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${metric.statusClass}`}>
                  {metric.status}
                </span>
              </div>

              {/* Stat metrics metadata rows */}
              <div className="space-y-1 pt-4 border-t border-white/5">
                {metric.stats.map((stat) => (
                  <div key={stat.label} className="flex justify-between text-[10px] font-mono">
                    <span className="text-[#c7c4d7]/40">{stat.label}</span>
                    <span className="text-[#e2e2e6] font-semibold">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}
