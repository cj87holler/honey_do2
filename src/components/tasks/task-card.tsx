"use client"

import { useTransition, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { updateTaskStatus, deleteTask } from "@/lib/actions/task"

interface TaskCardProps {
  task: {
    id: string
    text: string
    honeyValue: number
    status: "open" | "in_progress" | "done"
    assigneeId: string
    assigneeName: string
    completedAt: Date | null
  }
  currentMemberId: string | undefined
  isQueen: boolean
  hiveId: string
}

export function TaskCard({ task, currentMemberId, isQueen }: TaskCardProps) {
  const [isPending, startTransition] = useTransition()
  const isAssignee = currentMemberId === task.assigneeId
  const cardRef = useRef<HTMLDivElement>(null)
  const prevStatusRef = useRef(task.status)

  useEffect(() => {
    if (prevStatusRef.current !== "done" && task.status === "done" && cardRef.current) {
      cardRef.current.classList.add("animate-completion-flash")
      const timer = setTimeout(() => {
        cardRef.current?.classList.remove("animate-completion-flash")
      }, 600)
      prevStatusRef.current = task.status
      return () => clearTimeout(timer)
    }
    prevStatusRef.current = task.status
  }, [task.status])

  function handleStart() {
    startTransition(async () => {
      await updateTaskStatus(task.id, "in_progress")
    })
  }

  function handleDone() {
    startTransition(async () => {
      await updateTaskStatus(task.id, "done")
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteTask(task.id)
    })
  }

  return (
    <div ref={cardRef} className="flex items-start justify-between gap-3 rounded-md border border-stone-200 bg-white px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-bee leading-snug break-words">{task.text}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-stone-500">
          <span>{task.assigneeName}</span>
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            {task.honeyValue} honeys
          </span>
          {task.status === "in_progress" && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              🐝 In Progress
            </span>
          )}
          {task.status === "done" && (
            <span className="inline-flex items-center rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900">
              ✅ Done
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isAssignee && task.status === "open" && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleStart}
            disabled={isPending}
          >
            Start
          </Button>
        )}
        {isAssignee && task.status === "in_progress" && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleDone}
            disabled={isPending}
            className="hover:scale-105"
          >
            Done!
          </Button>
        )}
        {isQueen && task.status !== "done" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  )
}
