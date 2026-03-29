"use client"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export function Header() {
  const router = useRouter()

  const handleLogout = async () => {
    await authClient.signOut()
    router.push("/login")
  }

  return (
    <header className="border-b border-stone-200 bg-stone-50">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <span className="text-base font-semibold text-bee">Honey Do</span>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Log out
        </Button>
      </div>
    </header>
  )
}
