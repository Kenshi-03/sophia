"use client"

import React from "react"
import { Calendar, Database, Cpu, Activity } from "lucide-react"
import { useAiStore } from "@/stores/use-ai-store"

export interface Agent {
  name: string
  status: string
  icon: "calendar" | "database" | "cpu" | "activity"
  description: string
}

const agentsList: Agent[] = [
  {
    name: "Schedule Analyser",
    status: "Active",
    icon: "calendar",
    description: "Parses schedules & flags cognitive overload slots.",
  },
  {
    name: "Memory Manager",
    status: "Active",
    icon: "database",
    description: "Indexes note documents & logs facts to memory.",
  },
  {
    name: "Productivity Advisor",
    status: "Standby",
    icon: "cpu",
    description: "Formulates optimal work schedules & target logs.",
  },
  {
    name: "General Assistant",
    status: "Active",
    icon: "activity",
    description: "Coordinates system tasks & general queries.",
  },
]

export default function AgentSelector() {
  const { activeAgent, setActiveAgent } = useAiStore()

  const getIcon = (type: string, active: boolean) => {
    const iconClass = active ? "text-[#c0c1ff]" : "text-[#c7c4d7]"
    switch (type) {
      case "calendar":
        return <Calendar size={16} className={iconClass} />
      case "database":
        return <Database size={16} className={iconClass} />
      case "cpu":
        return <Cpu size={16} className={iconClass} />
      default:
        return <Activity size={16} className={iconClass} />
    }
  }

  return (
    <div className="glass-panel rounded-3xl p-4 flex flex-col gap-4 overflow-y-auto">
      <div className="border-b border-white/5 pb-3">
        <h2 className="font-bold text-xs text-[#c7c4d7] uppercase tracking-wider">
          Cognitive Agent Nodes
        </h2>
        <p className="text-[10px] text-[#c7c4d7]/50 mt-0.5">
          Select or trigger specialized sub-systems.
        </p>
      </div>

      <div className="space-y-2">
        {agentsList.map((agent) => {
          const isSelected = activeAgent === agent.name
          const isStandby = agent.status === "Standby"

          return (
            <button
              key={agent.name}
              onClick={() => setActiveAgent(agent.name)}
              className={`w-full text-left p-3 border rounded-2xl flex items-start gap-3 transition-all duration-200 hover:bg-white/[0.03] active:scale-98 ${
                isSelected
                  ? "border-[#c0c1ff]/30 bg-[#c0c1ff]/5 shadow-lg shadow-[#c0c1ff]/5"
                  : "border-white/5 bg-white/[0.01]"
              }`}
            >
              {/* Agent Icon Envelope */}
              <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                isSelected ? "bg-[#c0c1ff]/15" : "bg-white/5"
              }`}>
                {getIcon(agent.icon, isSelected)}
              </div>

              {/* Text metadata info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-bold truncate ${isSelected ? "text-[#c0c1ff]" : "text-white"}`}>
                    {agent.name}
                  </p>
                  
                  {/* Status indicator */}
                  <span className={`text-[8px] font-mono px-1.5 py-0.25 rounded ${
                    isStandby 
                      ? "text-[#c7c4d7]/70 bg-white/5" 
                      : "text-[#4edea3] bg-[#4edea3]/10"
                  }`}>
                    {agent.status}
                  </span>
                </div>
                <p className="text-[10px] text-[#c7c4d7]/60 leading-normal mt-1 break-words">
                  {agent.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
