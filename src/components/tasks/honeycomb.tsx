"use client"

import { useState } from "react"
import { TaskCard } from "./task-card"

interface HoneycombTask {
  id: string
  text: string
  honeyValue: number
  status: "open" | "in_progress" | "done"
  assigneeId: string
  assigneeName: string
  createdBy: string
  createdAt: Date
  completedAt: Date | null
}

interface HoneycombProps {
  tasks: HoneycombTask[]
  currentMemberId: string | undefined
  isQueen: boolean
  hiveId: string
}

export function Honeycomb({ tasks, currentMemberId, isQueen, hiveId }: HoneycombProps) {
  const [completedOpen, setCompletedOpen] = useState(false)

  const activeTasks = tasks.filter(
    (t) => t.assigneeId === currentMemberId && t.status !== "done"
  )
  const completedTasks = tasks.filter(
    (t) => t.assigneeId === currentMemberId && t.status === "done"
  )

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-bee">Your Honeycomb</h2>

      {activeTasks.length === 0 ? (
        <p className="text-sm text-stone-500 italic">
          No tasks in your Honeycomb yet. Time to relax!
        </p>
      ) : (
        <div className="space-y-2">
          {activeTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              currentMemberId={currentMemberId}
              isQueen={isQueen}
              hiveId={hiveId}
            />
          ))}
        </div>
      )}

      {completedTasks.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setCompletedOpen((prev) => !prev)}
            className="flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-bee transition-colors"
          >
            <span>Completed ({completedTasks.length})</span>
            <span className="text-xs">{completedOpen ? "▲" : "▼"}</span>
          </button>
          {completedOpen && (
            <div className="mt-2 space-y-2">
              {completedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  currentMemberId={currentMemberId}
                  isQueen={isQueen}
                  hiveId={hiveId}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
