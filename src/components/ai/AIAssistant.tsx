import { useState, useRef, useEffect } from "react"
import { useAIChat, type ChatMessage } from "@/hooks/useAI"
import { useTasks } from "@/hooks/useTasks"
import { useLists } from "@/hooks/useLists"
import { useMembers } from "@/hooks/useMembers"
import { useProjects } from "@/hooks/useProjects"
import { useUIStore } from "@/stores/useUIStore"
import { useQueryClient } from "@tanstack/react-query"
import { WrokoFlowLogo } from "@/components/shared/WrokoFlowLogo"
import { Button } from "@/components/ui/button"
import {
  Sparkles,
  Send,
  X,
  Trash2,
  Settings,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Zap,
  CalendarDays,
  FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useNavigate } from "@tanstack/react-router"

export function AIAssistant() {
  const open = useUIStore((s) => s.aiPanelOpen)
  const setOpen = useUIStore((s) => s.setAIPanelOpen)
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const activeProjectId = useUIStore((s) => s.activeProjectId)
  const { data: projects } = useProjects()
  const { data: tasks } = useTasks(activeProjectId || "")
  const { data: lists } = useLists(activeProjectId || "")
  const { data: members } = useMembers(activeProjectId || "")
  const activeProject = projects?.find((p) => p.id === activeProjectId)

  const context = activeProjectId && activeProject
    ? {
        projectId: activeProjectId,
        projectName: activeProject.name,
        tasks: tasks || [],
        lists: lists || [],
        members: members || [],
      }
    : null

  const { messages, isLoading, isConfigured, sendMessage, clearMessages } = useAIChat(context)

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isLoading) return
    setInput("")
    await sendMessage(text)
    // Invalidate relevant queries so UI updates
    queryClient.invalidateQueries({ queryKey: ["tasks"] })
    queryClient.invalidateQueries({ queryKey: ["lists"] })
    queryClient.invalidateQueries({ queryKey: ["automation-rules"] })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const quickActions = [
    { label: "Data Dump", icon: FileText, prompt: "I'm going to paste some data for you to convert into tasks. Ready?" },
    { label: "Schedule", icon: CalendarDays, prompt: "Look at all my tasks without due dates and suggest a reasonable schedule for them based on priority." },
    { label: "Fix Overdue", icon: AlertCircle, prompt: "Find all overdue tasks and update their priorities to High. Then suggest new due dates for them." },
    { label: "Add Rules", icon: Zap, prompt: "Analyze my project and suggest 3-5 automation rules that would help me work more efficiently." },
  ]

  return (
    <>
      {/* Floating trigger button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 w-14 h-14 bg-[#B07C4F] hover:bg-[#9A6A40] text-white rounded-full shadow-lg shadow-[#B07C4F]/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95 hover:shadow-xl"
          aria-label="Open AI Assistant"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed inset-0 md:inset-auto md:bottom-6 md:right-6 md:w-[420px] md:h-[600px] md:max-h-[80vh] z-50 flex flex-col bg-white md:rounded-2xl md:shadow-2xl md:border md:border-[#E4DDD2] overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E4DDD2] bg-[#FAF8F5]">
            <div className="w-8 h-8 rounded-lg bg-[#B07C4F]/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#B07C4F]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-[#2D2A26]">WrokoFlow AI</h3>
              <p className="text-[11px] text-[#A09890] truncate">
                {activeProject ? activeProject.name : "No project selected"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#A09890] hover:text-[#4A4540]"
                onClick={clearMessages}
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              {!isConfigured && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-amber-500 hover:text-amber-600"
                  onClick={() => {
                    setOpen(false)
                    navigate({ to: "/settings" })
                  }}
                  title="Configure AI"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#A09890] hover:text-[#4A4540]"
                onClick={() => setOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {!isConfigured && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-2">
                <Settings className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-sm font-medium text-amber-800">AI not configured yet</p>
                <p className="text-xs text-amber-600">
                  Go to Settings → AI to add your API key (Gemini, OpenAI, Groq, or OpenRouter).
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 border-amber-300 text-amber-700 hover:bg-amber-100"
                  onClick={() => {
                    setOpen(false)
                    navigate({ to: "/settings" })
                  }}
                >
                  <Settings className="w-3 h-3 mr-1" />
                  Configure AI
                </Button>
              </div>
            )}

            {isConfigured && messages.length === 0 && (
              <div className="flex flex-col items-center text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#B07C4F]/10 flex items-center justify-center">
                  <WrokoFlowLogo size={32} />
                </div>
                <div>
                  <h4 className="font-semibold text-[#2D2A26] mb-1">Hey! I'm your AI assistant</h4>
                  <p className="text-xs text-[#7A7267] max-w-[260px]">
                    I can create tasks, build schedules, set up automations, parse data dumps, and more. Try a quick action below!
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full max-w-[300px]">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => {
                        setInput("")
                        sendMessage(action.prompt)
                        queryClient.invalidateQueries({ queryKey: ["tasks"] })
                      }}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[#E4DDD2] bg-[#FAF8F5] hover:bg-[#F0EBE3] transition-colors text-left"
                    >
                      <action.icon className="w-4 h-4 text-[#B07C4F] flex-shrink-0" />
                      <span className="text-xs font-medium text-[#4A4540]">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-[#A09890]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Thinking...</span>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-[#E4DDD2] p-3 bg-[#FAF8F5]">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isConfigured ? "Ask me anything..." : "Configure AI first..."}
                disabled={!isConfigured || isLoading}
                rows={1}
                className="flex-1 resize-none rounded-xl border border-[#E4DDD2] bg-white px-3 py-2.5 text-sm placeholder:text-[#C8BFB5] focus:outline-none focus:ring-2 focus:ring-[#B07C4F]/30 focus:border-[#B07C4F] disabled:opacity-50 min-h-[40px] max-h-[120px]"
                style={{ height: "auto" }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = "auto"
                  target.style.height = Math.min(target.scrollHeight, 120) + "px"
                }}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading || !isConfigured}
                size="icon"
                className="h-10 w-10 rounded-xl bg-[#B07C4F] hover:bg-[#9A6A40] text-white flex-shrink-0 disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-[#B07C4F] text-white rounded-br-md"
            : "bg-[#F5F3F0] text-[#2D2A26] rounded-bl-md"
        )}
      >
        {/* Tool results */}
        {message.toolResults && message.toolResults.length > 0 && (
          <div className="mb-2 space-y-1.5">
            {message.toolResults.map((tr, i) => (
              <div
                key={i}
                className="flex items-start gap-2 bg-white/80 rounded-lg p-2 text-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#7B9F6F] mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-[#4A4540]">{formatToolName(tr.name)}</span>
                  <span className="text-[#7A7267] ml-1">{tr.result}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Message text */}
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  )
}

function formatToolName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
