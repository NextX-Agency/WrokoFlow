import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  action?: { label: string; onClick: () => void } | React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4", className)}>
      {Icon && (
        <div className="mb-4 text-[#D4C5B0]">
          <Icon className="w-12 h-12" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-[#2D2A26] mb-1">{title}</h3>
      <p className="text-sm text-[#7A7267] text-center max-w-sm mb-4">{description}</p>
      {action && typeof action === "object" && "label" in action ? (
        <button
          onClick={action.onClick}
          className="text-sm text-[#B07C4F] hover:text-[#8B6340] font-medium"
        >
          {action.label}
        </button>
      ) : (
        action
      )}
    </div>
  )
}
