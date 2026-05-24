import React from "react"
import { Brain, ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { CognitiveAgent } from "@/types/dashboard"

interface ActiveAgentsWidgetProps {
  agents: CognitiveAgent[]
}

export default function ActiveAgentsWidget({ agents }: ActiveAgentsWidgetProps) {
  // Helper to map agent name to query params format
  const getAgentParam = (name: string) => {
    return encodeURIComponent(name)
  }

  return (
    <div className="col-span-12 lg:col-span-4 glass-panel rounded-3xl p-6 flex flex-col justify-between hover:border-[#c0c1ff]/20 hover:scale-[1.01] transition-all duration-300">
      <div>
        <h3 className="text-sm font-bold text-[#e2e2e6] tracking-wide flex items-center gap-2">
          <Brain size={16} className="text-[#c0c1ff]" />
          <span>Cognitive Agents Aktif</span>
        </h3>
        <p className="text-xs text-[#c7c4d7]/50 mt-1">
          Sub-cognitive nodes running in the background.
        </p>
      </div>

      <div className="space-y-3.5 my-6">
        {agents.map((agent) => {
          const isActive = agent.status === "Active"
          
          return (
            <Link
              key={agent.name}
              href={`/dashboard/ai?agent=${getAgentParam(agent.name)}`}
              className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/5 hover:border-[#c0c1ff]/30 hover:bg-white/[0.08] transition-all duration-200 group/item"
            >
              <div className="flex items-center gap-3">
                <div className="relative flex h-2 w-2">
                  {isActive && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4edea3] opacity-75" />
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isActive ? "bg-[#4edea3]" : "bg-[#c7c4d7]/40"}`} />
                </div>
                
                <div className="text-xs">
                  <p className="font-semibold text-white group-hover/item:text-[#c0c1ff] transition-colors">{agent.name}</p>
                  <p className="text-[10px] text-[#c7c4d7]/70">{agent.role}</p>
                </div>
              </div>

              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                isActive 
                  ? "bg-[#4edea3]/10 text-[#4edea3]" 
                  : "bg-white/5 text-[#c7c4d7]/50"
              }`}>
                {agent.status}
              </span>
            </Link>
          )
        })}
      </div>

      <Link
        href="/dashboard/ai"
        className="text-xs text-[#c0c1ff] hover:text-white flex items-center gap-1 font-semibold self-end transition-colors group/link"
      >
        <span>Kelola Agents</span>
        <ArrowUpRight size={14} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
      </Link>
    </div>
  )
}
