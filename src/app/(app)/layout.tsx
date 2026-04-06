import { Header } from "@/components/layout/header"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12">{children}</main>
    </div>
  )
}
