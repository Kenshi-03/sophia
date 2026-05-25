"use client"

import React, { useState, useRef, useEffect } from "react"
import {
  Send,
  Bot,
  User,
  Paperclip,
  Mic,
  Loader2,
  Sparkles,
  Activity,
  Cpu,
  Layers,
} from "lucide-react"
import PageHeader from "@/components/shared/page-header"
import AgentSelector from "@/components/ai/agent-selector"
import { useAiStore } from "@/stores/use-ai-store"
import { useSettingsStore } from "@/stores/use-settings-store"

const suggestedPrompts = [
  "Analyze my calendar for today",
  "Find notes about Sophia architecture",
  "Plan a study session for deep focus",
  "Summarize my cognitive load trends",
]

export default function AiCommandCenterPage() {
  const { messages, isGenerating, activeAgent, addMessage, setGenerating, setActiveAgent } = useAiStore()
  const settings = useSettingsStore()
  const [inputValue, setInputValue] = useState("")
  const [latency, setLatency] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<"chat" | "agents" | "metrics">("chat")
  
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom of chat when new messages appear
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Automatically update active agent based on input keywords
  useEffect(() => {
    const query = inputValue.toLowerCase()
    if (query.includes("calendar") || query.includes("schedule") || query.includes("event")) {
      setActiveAgent("Schedule Analyser")
    } else if (query.includes("memory") || query.includes("note") || query.includes("recall")) {
      setActiveAgent("Memory Manager")
    } else if (query.includes("focus") || query.includes("productivity") || query.includes("advisor")) {
      setActiveAgent("Productivity Advisor")
    }
  }, [inputValue, setActiveAgent])

  const handleSend = async (textToSend: string) => {
    const query = textToSend.trim()
    if (!query || isGenerating) return

    // Clear input
    setInputValue("")

    // 1. Add User Message
    const userMsgId = Date.now().toString()
    addMessage({
      id: userMsgId,
      role: "user",
      content: query,
    })

    // 2. Set Generating State
    setGenerating(true)
    const startTime = Date.now()

    try {
      // 3. Post to backend chat API passing model and aiMode from settings
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          userId: "user@sophia.local", // using seed developer email as user ID
          model: settings.defaultAiModel,
          aiMode: settings.aiMode,
        }),
      })

      const data = await response.json()
      const endTime = Date.now()
      setLatency(endTime - startTime)

      if (response.ok && data.response) {
        // Map backend agentType back to active agent naming in UI
        if (data.agentType === "schedule") {
          setActiveAgent("Schedule Analyser")
        } else if (data.agentType === "memory") {
          setActiveAgent("Memory Manager")
        } else if (data.agentType === "productivity") {
          setActiveAgent("Productivity Advisor")
        } else {
          setActiveAgent("General Assistant")
        }

        // Add Assistant Message
        addMessage({
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response,
        })
      } else {
        addMessage({
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.error || "System error. The cognitive processor was unable to complete the instruction.",
        })
      }
    } catch (err) {
      console.error("Failed to fetch response:", err)
      addMessage({
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Network link severed. Cognitive router remains offline. Confirm backend port logs.",
      })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto h-[calc(100vh-11rem)] flex flex-col">
      {/* Page Title */}
      <div className="shrink-0">
        <PageHeader
          title="AI Command Center"
          description="Interact with specialized cognitive agent systems."
        />
      </div>

      {/* Mobile/Tablet Tab Switcher (Hidden on desktop) */}
      <div className="flex border border-white/5 bg-white/[0.01] rounded-2xl p-1 lg:hidden shrink-0">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 py-2 text-center text-xs font-semibold rounded-xl transition-all duration-200 ${
            activeTab === "chat" ? "bg-[#c0c1ff]/15 text-[#c0c1ff]" : "text-[#c7c4d7]/70"
          }`}
        >
          Chat Command
        </button>
        <button
          onClick={() => setActiveTab("agents")}
          className={`flex-1 py-2 text-center text-xs font-semibold rounded-xl transition-all duration-200 ${
            activeTab === "agents" ? "bg-[#c0c1ff]/15 text-[#c0c1ff]" : "text-[#c7c4d7]/70"
          }`}
        >
          Active Agents
        </button>
        <button
          onClick={() => setActiveTab("metrics")}
          className={`flex-1 py-2 text-center text-xs font-semibold rounded-xl transition-all duration-200 ${
            activeTab === "metrics" ? "bg-[#c0c1ff]/15 text-[#c0c1ff]" : "text-[#c7c4d7]/70"
          }`}
        >
          Context Engine
        </button>
      </div>

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* Left Side: Agent Selection Nodes (Col span: 3) */}
        <div className={`col-span-12 lg:col-span-3 flex-col min-h-0 ${
          activeTab === "agents" ? "flex" : "hidden lg:flex"
        }`}>
          <AgentSelector />
        </div>

        {/* Center: Dialogue Stream Canvas (Col span: 6) */}
        <div className={`col-span-12 lg:col-span-6 glass-panel rounded-3xl flex-col justify-between overflow-hidden relative min-h-0 ${
          activeTab === "chat" ? "flex" : "hidden lg:flex"
        }`}>
          
          {/* Chat Bubble Stream */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-5 scrollbar-thin">
            {messages.map((msg) => {
              const isAssistant = msg.role === "assistant"
              return (
                <div key={msg.id} className={`flex gap-3 max-w-[90%] md:max-w-[85%] ${isAssistant ? "" : "ml-auto flex-row-reverse"}`}>
                  
                  {/* Avatar Icon */}
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border ${
                    isAssistant
                      ? "bg-[#c0c1ff]/10 border-[#c0c1ff]/20 text-[#c0c1ff] ai-pulse-ring"
                      : "bg-white/5 border-white/10 text-white"
                  }`}>
                    {isAssistant ? <Bot size={16} /> : <User size={16} />}
                  </div>

                  {/* Bubble content */}
                  <div className="space-y-1">
                    {isAssistant && (
                      <div className="flex items-center gap-2 px-1 text-[9px] font-mono text-[#c7c4d7]/50">
                        <span className="text-[#c0c1ff]/80 font-bold">{activeAgent}</span>
                        <span>•</span>
                        <span>Context: Active</span>
                        {latency !== null && (
                          <>
                            <span>•</span>
                            <span>Latency: {latency}ms</span>
                          </>
                        )}
                      </div>
                    )}
                    
                    <div className={`p-4 rounded-2xl text-xs md:text-sm leading-relaxed ${
                      isAssistant
                        ? "bg-white/[0.02] border border-white/5 rounded-tl-none text-[#e2e2e6]"
                        : "bg-[#8083ff] text-white rounded-tr-none shadow-lg shadow-[#8083ff]/15"
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>

                </div>
              )
            })}

            {/* Thinking Indicator */}
            {isGenerating && (
              <div className="flex gap-3 max-w-[80%] items-end">
                <div className="h-8 w-8 rounded-full flex items-center justify-center bg-[#c0c1ff]/10 border border-[#c0c1ff]/20 text-[#c0c1ff] shrink-0">
                  <Loader2 size={16} className="animate-spin" />
                </div>
                <div className="p-4 rounded-2xl rounded-tl-none bg-white/[0.02] border border-white/5 text-xs text-[#c7c4d7]/70 flex items-center gap-2">
                  <span>Routing query to {activeAgent}...</span>
                  <div className="flex gap-1">
                    <span className="h-1 w-1 bg-[#c0c1ff] rounded-full animate-bounce delay-100" />
                    <span className="h-1 w-1 bg-[#c0c1ff] rounded-full animate-bounce delay-200" />
                    <span className="h-1 w-1 bg-[#c0c1ff] rounded-full animate-bounce delay-300" />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Suggested Prompts caps container */}
          <div className="px-4 py-2 border-y border-white/5 flex gap-2 overflow-x-auto shrink-0 bg-white/[0.01]">
            {suggestedPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleSend(prompt)}
                className="whitespace-nowrap px-3 py-1.5 border border-white/5 rounded-full text-[10px] text-[#c7c4d7] hover:text-white hover:border-[#c0c1ff]/30 bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Glass-Panel Input Palette */}
          <div className="p-3 md:p-4 bg-white/[0.01] shrink-0">
            <div className="relative flex items-center bg-white/[0.02] border border-white/5 focus-within:border-[#c0c1ff]/30 rounded-2xl pl-3 pr-2 py-1.5 md:pl-4 md:pr-2.5 md:py-2 transition-all duration-300">
              
              {/* Left Action Attachments */}
              <button className="p-1 text-[#c7c4d7]/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors mr-1 md:mr-2">
                <Paperclip size={16} />
              </button>

              <textarea
                rows={1}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSend(inputValue)
                  }
                }}
                placeholder={`Instruct ${activeAgent}...`}
                className="flex-1 bg-transparent text-xs md:text-sm text-[#e2e2e6] placeholder-[#c7c4d7]/40 focus:outline-none resize-none max-h-24 pr-2 font-sans py-1"
              />

              {/* Right Send Trigger Buttons */}
              <div className="flex items-center gap-1">
                <button className="p-1.5 text-[#c7c4d7]/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors hidden sm:block">
                  <Mic size={16} />
                </button>
                <button
                  onClick={() => handleSend(inputValue)}
                  disabled={!inputValue.trim() || isGenerating}
                  className="h-8 w-8 md:h-9 md:w-9 rounded-xl bg-[#c0c1ff] hover:bg-white text-[#1000a9] flex items-center justify-center transition-all duration-200 active:scale-95 shadow-md shadow-[#c0c1ff]/10 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Send size={14} fill="currentColor" />
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Context Engine Panel (Col span: 3) */}
        <div className={`col-span-12 lg:col-span-3 flex-col gap-4 overflow-y-auto ${
          activeTab === "metrics" ? "flex" : "hidden lg:flex"
        }`}>
          
          {/* Card 1: Active Tasks */}
          <div className="glass-panel rounded-3xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={14} className="text-[#c0c1ff]" />
              <span>Active Tasks</span>
            </h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2.5 text-xs text-[#c7c4d7]/80">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4edea3] mt-1.5" />
                <p>Analyzing schedule load density...</p>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-[#c7c4d7]/50">
                <span className="h-1.5 w-1.5 rounded-full bg-white/10 mt-1.5" />
                <p>Waiting for context query trigger</p>
              </div>
            </div>
          </div>

          {/* Card 2: Memory / Mood Card */}
          <div className="glass-panel rounded-3xl p-5 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity size={14} className="text-[#4edea3]" />
                <span>Focus Trends</span>
              </h3>
              <p className="text-[10px] text-[#c7c4d7]/50 mt-0.5">Productivity Peak +14%</p>
            </div>
            
            <div className="space-y-2 pt-1">
              <div className="flex justify-between text-[10px] font-mono text-[#c7c4d7]/70">
                <span>Concentration Peak</span>
                <span>86m</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#4edea3] rounded-full" style={{ width: "72%" }}></div>
              </div>
            </div>
          </div>

          {/* Card 3: Cognitive Load Graph */}
          <div className="glass-panel rounded-3xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Cpu size={14} className="text-[#adc6ff]" />
              <span>Cognitive Metrics</span>
            </h3>
            <div className="flex items-end gap-2.5 h-16 pt-2 justify-center border-b border-white/5 pb-2">
              {/* Bars representing load metrics */}
              <div className="w-4 bg-white/5 h-6 rounded-t-sm" />
              <div className="w-4 bg-white/5 h-10 rounded-t-sm" />
              <div className="w-4 bg-[#adc6ff]/20 h-14 rounded-t-sm" />
              <div className="w-4 bg-[#adc6ff] h-8 rounded-t-sm" />
              <div className="w-4 bg-white/5 h-12 rounded-t-sm" />
              <div className="w-4 bg-white/5 h-4 rounded-t-sm" />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-[#c7c4d7]/50">
              <span>08:00</span>
              <span>12:00</span>
              <span>16:00</span>
              <span>20:00</span>
            </div>
          </div>

          {/* Card 4: Core Widget version info */}
          <div className="glass-panel rounded-3xl p-4 flex items-center gap-3.5 mt-auto">
            <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#c0c1ff]">
              <Layers size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-white font-mono leading-none">
                SOPHIA OS Core
              </p>
              <p className="text-[9px] text-[#c7c4d7]/40 font-mono mt-1">
                v4.2.0-Alpha Build
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
