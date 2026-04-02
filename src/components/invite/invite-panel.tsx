"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { generateInvite } from "@/lib/actions/invite"

interface InvitePanelProps {
  hiveId: string
}

export function InvitePanel({ hiveId }: InvitePanelProps) {
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const token = await generateInvite(hiveId)
      setLink(`${window.location.origin}/invite/${token}`)
      setCopied(false)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select text in the displayed input (Clipboard API may fail on HTTP)
    }
  }

  if (!link) {
    return (
      <Button onClick={handleGenerate} disabled={loading} variant="secondary" className="w-full mt-3">
        {loading ? "Generating..." : "Invite a Bee"}
      </Button>
    )
  }

  return (
    <div className="mt-3 flex gap-2">
      <input
        readOnly
        value={link}
        className="flex-1 rounded border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-700 select-all"
        onFocus={(e) => e.target.select()}
      />
      <Button onClick={handleCopy} variant="secondary" className="shrink-0">
        {copied ? "Copied!" : "Copy"}
      </Button>
    </div>
  )
}
