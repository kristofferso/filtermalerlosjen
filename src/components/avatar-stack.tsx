import { getInitials } from "@/lib/initials"
import { cn } from "@/lib/utils"

export function AvatarStack({
  names,
  max = 5,
  className,
}: {
  names: Array<string>
  max?: number
  className?: string
}) {
  if (names.length === 0) return null

  const visible = names.slice(0, max)
  const overflow = names.length - visible.length

  return (
    <div className={cn("flex items-center -space-x-2", className)}>
      {visible.map((name, index) => (
        <span
          key={`${name}-${index}`}
          className="grid size-8 place-items-center rounded-full border border-border bg-card font-mono text-xs font-semibold text-muted-foreground ring-2 ring-card"
          title={name}
        >
          {getInitials(name)}
        </span>
      ))}
      {overflow > 0 ? (
        <span className="grid size-8 place-items-center rounded-full border border-border bg-muted font-mono text-xs font-semibold text-muted-foreground ring-2 ring-card">
          +{overflow}
        </span>
      ) : null}
    </div>
  )
}
