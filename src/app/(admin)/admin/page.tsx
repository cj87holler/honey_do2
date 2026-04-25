import { listAllUsers, listAllHives } from "@/lib/queries/admin"
import { UsersTable } from "@/components/admin/users-table"
import { HivesTable } from "@/components/admin/hives-table"

export default async function AdminPage() {
  // Queries are independent — run in parallel.
  const [users, hivesList] = await Promise.all([listAllUsers(), listAllHives()])

  return (
    <div className="space-y-12">
      <section>
        <h1 className="mb-2 text-3xl font-bold text-bee">Admin</h1>
        <p className="text-stone-600">Platform overview — users and hives.</p>
      </section>
      <section>
        <h2 className="mb-4 text-xl font-semibold text-bee">
          Users ({users.length})
        </h2>
        <UsersTable users={users} />
      </section>
      <section>
        <h2 className="mb-4 text-xl font-semibold text-bee">
          Hives ({hivesList.length})
        </h2>
        <HivesTable hives={hivesList} />
      </section>
    </div>
  )
}
