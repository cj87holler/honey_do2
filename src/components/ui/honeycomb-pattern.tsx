import { cn } from "@/lib/utils"

interface HoneycombPatternProps {
  children: React.ReactNode
  className?: string
  intensity?: "subtle" | "medium"
}

export function HoneycombPattern({ children, className, intensity = "subtle" }: HoneycombPatternProps) {
  return (
    <div className={cn("honeycomb-bg", intensity === "medium" && "honeycomb-bg-medium", className)}>
      {children}
    </div>
  )
}
