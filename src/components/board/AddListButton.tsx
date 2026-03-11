import { useState } from "react"
import { useCreateList } from "@/hooks/useLists"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus } from "lucide-react"

export interface AddListButtonProps {
  projectId: string
  listCount?: number
}

export function AddListButton({ projectId, listCount = 0 }: AddListButtonProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [name, setName] = useState("")
  const createList = useCreateList()

  const handleCreate = async () => {
    if (!name.trim()) return
    await createList.mutateAsync({
      project_id: projectId,
      name: name.trim(),
      position: listCount,
    })
    setName("")
    setIsAdding(false)
  }

  if (isAdding) {
    return (
      <div className="w-[300px] flex-shrink-0 p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <Input
          data-cy="new-list-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate()
            if (e.key === "Escape") setIsAdding(false)
          }}
          placeholder="List name..."
          className="text-sm mb-2"
          autoFocus
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={createList.isPending}
          >
            Add List
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsAdding(false)}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <button
      data-cy="add-list-btn"
      onClick={() => setIsAdding(true)}
      className="w-[300px] flex-shrink-0 flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
    >
      <Plus className="w-5 h-5" />
      <span className="text-sm font-medium">Add List</span>
    </button>
  )
}
