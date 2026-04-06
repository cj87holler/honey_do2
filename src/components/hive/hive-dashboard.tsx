import { InlineRename } from "./inline-rename"
import { Leaderboard } from "./leaderboard"
import { TaskCreationForm } from "@/components/tasks/task-creation-form"
import { Honeycomb } from "@/components/tasks/honeycomb"
import { AllTasks } from "@/components/tasks/all-tasks"
import { DashboardGreeting } from "./dashboard-greeting"

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
  currentUserName: string
  tasks: Task[]
}

export function HiveDashboard({ hive, members, currentUserId, currentUserName, tasks }: HiveDashboardProps) {
  const isQueen = members.some((m) => m.userId === currentUserId && m.role === "queen")
  const currentMemberId = members.find((m) => m.userId === currentUserId)?.id

  const activeTaskCount = tasks.filter(
    (t) => t.assigneeId === currentMemberId && t.status !== "done"
  ).length

  return (
    <div className="space-y-8">
      <DashboardGreeting name={currentUserName} activeTaskCount={activeTaskCount} />

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

      <Leaderboard members={members} isQueen={isQueen} hiveId={hive.id} />
    </div>
  )
}
