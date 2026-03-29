"use client"

import { useState, useRef } from "react"
import { renameHive } from "@/lib/actions/hive"

interface InlineRenameProps {
  hiveName: string
  hiveId: string
}

export function InlineRename({ hiveName, hiveId }: InlineRenameProps) {
  const [editing, setEditing] = useState(false)
  const [currentName, setCurrentName] = useState(hiveName)
  const [draftName, setDraftName] = useState(hiveName)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEditing() {
    setDraftName(currentName)
    setError(null)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function cancelEditing() {
    setEditing(false)
    setDraftName(currentName)
    setError(null)
  }

  async function saveEdit() {
    const trimmed = draftName.trim()
    if (!trimmed) {
      setError("Give your Hive a name.")
      return
    }
    if (trimmed.length > 100) {
      setError("Hive name must be 100 characters or fewer.")
      return
    }
    if (trimmed === currentName) {
      setEditing(false)
      return
    }

    try {
      const formData = new FormData()
      formData.set("name", trimmed)
      await renameHive(hiveId, formData)
      setCurrentName(trimmed)
      setEditing(false)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      saveEdit()
    } else if (e.key === "Escape") {
      cancelEditing()
    }
  }

  if (editing) {
    return (
      <div>
        <input
          ref={inputRef}
          type="text"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          className="text-[28px] font-semibold leading-tight text-bee bg-transparent border-b-2 border-honey outline-none w-full"
          maxLength={100}
          autoFocus
        />
        {error && (
          <p className="text-sm text-red-600 mt-1">{error}</p>
        )}
      </div>
    )
  }

  return (
    <div>
      <h1
        onClick={startEditing}
        className="text-[28px] font-semibold leading-tight text-bee cursor-pointer hover:opacity-70 transition-opacity"
        title="Click to rename your Hive"
      >
        {currentName}
      </h1>
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  )
}
