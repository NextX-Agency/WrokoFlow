declare module "gantt-task-react" {
  import type { FC } from "react"

  export enum ViewMode {
    Day = "Day",
    Week = "Week",
    Month = "Month",
    Year = "Year",
  }

  export interface Task {
    id: string
    name: string
    start: Date
    end: Date
    progress: number
    type: "task" | "milestone" | "project"
    project?: string
    dependencies?: string[]
    hideChildren?: boolean
    styles?: {
      backgroundColor?: string
      backgroundSelectedColor?: string
      progressColor?: string
      progressSelectedColor?: string
    }
    [key: string]: unknown
  }

  export interface GanttProps {
    tasks: Task[]
    viewMode?: ViewMode
    onDateChange?: (task: Task) => void
    onProgressChange?: (task: Task) => void
    onClick?: (task: Task) => void
    onDoubleClick?: (task: Task) => void
    onDelete?: (task: Task) => void
    onSelect?: (task: Task, isSelected: boolean) => void
    listCellWidth?: string
    columnWidth?: number
    barCornerRadius?: number
    fontSize?: string
    rowHeight?: number
    headerHeight?: number
    [key: string]: unknown
  }

  export const Gantt: FC<GanttProps>
}
