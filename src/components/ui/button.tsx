import { cn } from "@/lib/utils"
import { ButtonHTMLAttributes, forwardRef } from "react"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost"
  size?: "sm" | "md"
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-honey-light disabled:pointer-events-none disabled:opacity-50",
          variant === "primary" && "bg-honey text-white hover:bg-honey-light hover:text-bee",
          variant === "secondary" && "bg-stone-100 text-bee hover:bg-stone-200",
          variant === "ghost" && "text-bee hover:bg-stone-100",
          size === "md" && "h-11 sm:h-10 px-4 text-base",
          size === "sm" && "h-11 sm:h-8 px-3 text-sm",
          className
        )}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"
export { Button }
export type { ButtonProps }
