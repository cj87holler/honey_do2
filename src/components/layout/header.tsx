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
    <header className="bg-honey">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <div>
          <span className="text-xl font-bold text-queen">
            🐝 Honey Do
          </span>
          <p className="hidden sm:block text-xs font-normal text-amber-800 opacity-80">
            Your Hive. Your Rules. Your Honey.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-amber-900 hover:bg-amber-600/20"
        >
          Log out
        </Button>
      </div>
    </header>
  )
}
