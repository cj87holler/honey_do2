"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

const QUICK_VALUES = [5, 10, 20] as const

interface HoneyPickerProps {
  value: number | null
  onChange: (v: number) => void
}

export function HoneyPicker({ value, onChange }: HoneyPickerProps) {
  const [isCustom, setIsCustom] = useState(false)

  function handleQuickSelect(v: number) {
    setIsCustom(false)
    onChange(v)
  }

  function handleCustomClick() {
    setIsCustom(true)
    onChange(1)
  }

  function handleCustomInput(e: React.ChangeEvent<HTMLInputElement>) {
    const parsed = parseInt(e.target.value, 10)
    if (!isNaN(parsed)) {
      onChange(parsed)
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {QUICK_VALUES.map((v) => (
        <Button
          key={v}
          type="button"
          variant={value === v && !isCustom ? "primary" : "secondary"}
          size="sm"
          onClick={() => handleQuickSelect(v)}
        >
          {v}
        </Button>
      ))}
      <Button
        type="button"
        variant={isCustom ? "primary" : "secondary"}
        size="sm"
        onClick={handleCustomClick}
      >
        Custom
      </Button>
      {isCustom && (
        <input
          type="number"
          min={1}
          max={100}
          value={value ?? 1}
          onChange={handleCustomInput}
          className="w-20 h-8 rounded-md border border-stone-300 px-2 text-sm"
        />
      )}
    </div>
  )
}
