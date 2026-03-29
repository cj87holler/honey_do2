import { RoleBadge } from "./role-badge"

interface Member {
  id: string
  name: string
  role: "queen" | "bee"
  honeyCount: number
}

interface MemberListProps {
  members: Member[]
}

export function MemberList({ members }: MemberListProps) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-bee mb-3">Members</h2>
      <ul className="space-y-1">
        {members.map((member) => (
          <li
            key={member.id}
            className="flex items-center justify-between py-2 px-3 bg-stone-50 rounded border-b border-stone-100"
          >
            <div className="flex items-center gap-2">
              <span className="text-base text-bee">{member.name}</span>
              <RoleBadge role={member.role} />
            </div>
            <span className="text-sm text-stone-500">
              {member.honeyCount} honeys
            </span>
          </li>
        ))}
      </ul>
      {members.length <= 1 && (
        <p className="text-sm text-stone-500 mt-2">No other members yet.</p>
      )}
    </section>
  )
}
