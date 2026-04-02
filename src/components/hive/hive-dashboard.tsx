import { InlineRename } from "./inline-rename"
import { MemberList } from "./member-list"
import { TaskCreationForm } from "@/components/tasks/task-creation-form"
import { Honeycomb } from "@/components/tasks/honeycomb"
import { AllTasks } from "@/components/tasks/all-tasks"

interface Member {
  id: string
  name: string
  role: "queen" | "bee"
  honeyCount: number
  userId?: string
}

interface Task {
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

interface HiveDashboardProps {
  hive: { id: string; name: string }
  members: Member[]
  currentUserId: string
  tasks: Task[]
}

export function HiveDashboard({ hive, members, currentUserId, tasks }: HiveDashboardProps) {
  const isQueen = members.some((m) => m.userId === currentUserId && m.role === "queen")
  const currentMemberId = members.find((m) => m.userId === currentUserId)?.id

  return (
    <div className="space-y-8">
      <InlineRename hiveName={hive.name} hiveId={hive.id} />

      {isQueen && (
        <TaskCreationForm
          hiveId={hive.id}
          members={members.map((m) => ({ id: m.id, name: m.name }))}
        />
      )}

      <Honeycomb
        tasks={tasks}
        currentMemberId={currentMemberId}
        isQueen={isQueen}
        hiveId={hive.id}
      />

      {isQueen && (
        <AllTasks
          tasks={tasks}
          currentMemberId={currentMemberId}
          isQueen={isQueen}
          hiveId={hive.id}
        />
      )}

      <MemberList members={members} isQueen={isQueen} hiveId={hive.id} />
    </div>
  )
}
