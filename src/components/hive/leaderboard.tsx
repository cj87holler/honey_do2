import { cn } from "@/lib/utils"
import { RoleBadge } from "./role-badge"
import { InvitePanel } from "@/components/invite/invite-panel"

interface Member {
  id: string
  name: string
  role: "queen" | "bee"
  honeyCount: number
  userId?: string
}

interface RankedMember extends Member {
  rank: number
}

export function assignRanks(members: Member[]): RankedMember[] {
  const sorted = [...members].sort((a, b) => b.honeyCount - a.honeyCount)
  let rank = 1
  return sorted.map((member, i) => {
    if (i > 0 && sorted[i].honeyCount < sorted[i - 1].honeyCount) {
      rank = i + 1
    }
    return { ...member, rank }
  })
}

interface LeaderboardProps {
  members: Member[]
  isQueen: boolean
  hiveId: string
}

export function Leaderboard({ members, isQueen, hiveId }: LeaderboardProps) {
  const ranked = assignRanks(members)
  const allZero = members.every((m) => m.honeyCount === 0)

  return (
    <section aria-label="Leaderboard">
      <h2 className="text-xl font-semibold text-bee mb-3">Leaderboard</h2>
      <ol className="space-y-1">
        {ranked.map((member) => (
          <li
            key={member.id}
            className="flex items-center justify-between py-2 px-4 bg-stone-50 rounded border-b border-stone-100 hover:bg-stone-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              {member.rank === 1 ? (
                <span aria-label="Rank 1">👑</span>
              ) : (
                <span className="text-sm text-stone-400 w-5 text-right">{member.rank}</span>
              )}
              <span className={cn("text-base text-bee", member.rank === 1 && "font-semibold")}>
                {member.name}
              </span>
              <RoleBadge role={member.role} />
            </div>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              {member.honeyCount} <span aria-hidden="true">🍯</span>
            </span>
          </li>
        ))}
      </ol>
      {allZero && (
        <p className="text-sm text-stone-500 mt-3 text-center">
          No honeys yet — time to get buzzy! <span aria-hidden="true">🐝</span>
        </p>
      )}
      {isQueen && hiveId && <InvitePanel hiveId={hiveId} />}
    </section>
  )
}
