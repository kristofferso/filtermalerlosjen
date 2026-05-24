import { cn } from "@/lib/utils"

export const BRAND_NAME = "Filtermalerlosjen"

export function FilterEngravedMark({ className }: { className?: string }) {
  return (
    <div className={cn("h-12 w-16", className)}>
      <img
        src="/filtermalerlosjen-logo.png"
        alt=""
        className="mx-auto h-full object-cover"
        loading="eager"
      />
    </div>
  )
}
