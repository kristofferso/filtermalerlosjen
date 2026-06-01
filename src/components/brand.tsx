import { cn } from "@/lib/utils"

export const BRAND_NAME = "Filtermalerlosjen"


export function BrandLogo({
  className,
  white = false,
  decorative = false,
}: {
  className?: string
  white?: boolean
  decorative?: boolean
}) {

  const whiteClasses = "brightness-0 invert"
  const decorativeClasses = "select-none"

  return (
    <img
      className={cn(className, decorative && decorativeClasses, white && whiteClasses)}
      src="/filtermalerlosjen-logo.png"
      alt={decorative ? "" : BRAND_NAME}
      aria-hidden={decorative ? "true" : undefined}
    />
  )
}
