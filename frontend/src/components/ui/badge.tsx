import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center max-w-full rounded-[var(--radius-pill)] border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gray-100 text-foreground dark:bg-[#25252C] dark:text-foreground",
        primary:
          "border-transparent bg-[var(--color-primary-soft)] text-primary",
        success:
          "border-transparent bg-success-light text-success dark:bg-success/20",
        warning:
          "border-transparent bg-warning-light text-warning dark:bg-warning/20",
        danger:
          "border-transparent bg-error-light text-error dark:bg-error/20",
        info:
          "border-transparent bg-accent/10 text-accent",
        outline:
          "text-foreground border-border",
      },
      size: {
        small: "px-2 py-0.5 text-[10px]",
        medium: "px-2.5 py-0.5 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "medium",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  removable?: boolean
  onRemove?: () => void
}

function Badge({ className, variant, size, removable, onRemove, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      <span className="truncate">{children}</span>
      {removable && (
        <button
          type="button"
          className="ml-1 -mr-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10"
          onClick={onRemove}
          aria-label="Remove"
        >
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3l6 6M9 3l-6 6" />
          </svg>
        </button>
      )}
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- shadcn/ui convention: variants exported alongside components
export { Badge, badgeVariants }
