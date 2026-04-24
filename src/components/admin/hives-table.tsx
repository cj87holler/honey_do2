type HiveRow = {
  id: string
  name: string
  createdAt: Date
  memberCount: number
}

/**
 * ADMIN-02: Renders the admin hives list (name + member count + creation date).
 *
 * Server component — no "use client" directive. Purely read-only in this plan;
 * no row-level actions. Zero-member hives still appear because `listAllHives`
 * uses a left join (see src/lib/queries/admin.ts).
 */
export function HivesTable({ hives }: { hives: HiveRow[] }) {
  if (hives.length === 0) {
    return <p className="text-stone-500 italic">No hives yet.</p>
  }
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-stone-200 text-left text-sm font-semibold text-bee">
          <th className="py-2 pr-4">Hive</th>
          <th className="py-2 pr-4">Members</th>
          <th className="py-2">Created</th>
        </tr>
      </thead>
      <tbody>
        {hives.map((h) => (
          <tr key={h.id} className="border-b border-stone-100 text-sm">
            <td className="py-3 pr-4 font-medium">{h.name}</td>
            <td className="py-3 pr-4">{h.memberCount}</td>
            <td className="py-3 text-stone-600">
              {h.createdAt.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
