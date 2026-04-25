import { Button } from "@/components/ui/button"

type UserRow = {
  id: string
  email: string
  name: string
  createdAt: Date
}

/**
 * ADMIN-01: Renders the admin users list (email + signup date + actions).
 *
 * Server component (no client-side directive). The Reset password button is
 * intentionally disabled; Plan 04 will replace this component (or wrap it in a
 * client-interactive one) to wire the reset modal. The `title` attribute
 * documents the placeholder for anyone debugging the intermediate state.
 */
export function UsersTable({ users }: { users: UserRow[] }) {
  if (users.length === 0) {
    return <p className="text-stone-500 italic">No users yet.</p>
  }
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-stone-200 text-left text-sm font-semibold text-bee">
          <th className="py-2 pr-4">Email</th>
          <th className="py-2 pr-4">Name</th>
          <th className="py-2 pr-4">Signed up</th>
          <th className="py-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id} className="border-b border-stone-100 text-sm">
            <td className="py-3 pr-4 font-mono">{u.email}</td>
            <td className="py-3 pr-4">{u.name}</td>
            <td className="py-3 pr-4 text-stone-600">
              {u.createdAt.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </td>
            <td className="py-3">
              <Button variant="secondary" size="sm" disabled title="Wired in Plan 04">
                Reset password
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
