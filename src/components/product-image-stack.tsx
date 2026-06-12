import { cn } from "@/lib/utils"

export function ProductImageStack({
  images,
  max = 4,
  className,
}: {
  images: Array<string>
  max?: number
  className?: string
}) {
  const visible = images.slice(0, max)

  if (visible.length === 0) {
    return (
      <div
        className={cn(
          "size-14 rounded-md border border-border bg-muted",
          className
        )}
      />
    )
  }

  return (
    <div className={cn("flex items-center -space-x-3", className)}>
      {visible.map((src, index) => (
        <img
          key={`${src}-${index}`}
          className="size-14 shrink-0 rounded-md border border-border bg-card object-cover ring-2 ring-card"
          src={src}
          alt=""
          loading="lazy"
        />
      ))}
    </div>
  )
}
