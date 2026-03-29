import { Crown } from "lucide-react"

interface RoleBadgeProps {
  role: "queen" | "bee"
}

export function RoleBadge({ role }: RoleBadgeProps) {
  if (role === "queen") {
    return (
      <span className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs font-medium bg-queen text-white">
        <Crown size={14} />
        Queen
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs font-medium bg-stone-100 text-bee">
      <span className="text-sm leading-none">&#x1F41D;</span>
      Bee
    </span>
  )
}
