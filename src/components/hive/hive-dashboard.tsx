import { InlineRename } from "./inline-rename"
import { MemberList } from "./member-list"

interface Member {
  id: string
  name: string
  role: "queen" | "bee"
  honeyCount: number
  userId?: string
}

interface HiveDashboardProps {
  hive: { id: string; name: string }
  members: Member[]
  currentUserId: string
}

export function HiveDashboard({ hive, members, currentUserId }: HiveDashboardProps) {
  const isQueen = members.some((m) => m.userId === currentUserId && m.role === "queen")

  return (
    <div className="space-y-8">
      <InlineRename hiveName={hive.name} hiveId={hive.id} />

      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-bee">Your Hive is ready.</h2>
        <p className="text-base text-stone-500">
          Start by inviting your housemates. Once everyone is in, you can assign tasks and see who earns the most honeys.
        </p>
      </div>

      <MemberList members={members} isQueen={isQueen} hiveId={hive.id} />
    </div>
  )
}
