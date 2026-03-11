import { Skeleton } from "@/components/ui/skeleton"

interface LoadingSkeletonProps {
  variant?: "board" | "dashboard" | "table"
}

export function LoadingSkeleton({ variant = "board" }: LoadingSkeletonProps) {
  if (variant === "dashboard") return <DashboardSkeleton />
  if (variant === "table") return <TableSkeleton />
  return <BoardSkeleton />
}

export function BoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {[1, 2, 3].map((col) => (
        <div key={col} className="w-[300px] flex-shrink-0 space-y-3">
          <Skeleton className="h-8 w-32" />
          {[1, 2].map((card) => (
            <Skeleton key={card} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  )
}

export function TableSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full rounded-lg" />
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  )
}
