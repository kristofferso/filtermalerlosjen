import { Link } from "@tanstack/react-router"
import type { getCustomerHomeData } from "@/server/coffee"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type CustomerData = Extract<
  Awaited<ReturnType<typeof getCustomerHomeData>>,
  { unlocked: true }
>

export function AppHeader({
  title,
  selectedCustomer,
  onLogout,
  activeNav,
}: {
  title: string
  selectedCustomer?: CustomerData["selectedCustomer"]
  onLogout?: () => Promise<void>
  activeNav?: "home" | "toppliste"
}) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-(--ledger-line) py-4">
      <div className="flex min-w-0 items-baseline gap-4">
        <h1 className="truncate font-serif text-3xl font-normal tracking-tight sm:text-4xl">
          {title}
        </h1>
        {activeNav ? (
          <nav className="hidden items-center gap-1 sm:flex">
            <Link
              to="/"
              className={cn(
                buttonVariants({
                  variant: activeNav === "home" ? "secondary" : "ghost",
                  size: "sm",
                })
              )}
            >
              Forsiden
            </Link>
            <Link
              to="/toppliste"
              className={cn(
                buttonVariants({
                  variant: activeNav === "toppliste" ? "secondary" : "ghost",
                  size: "sm",
                })
              )}
            >
              Toppliste
            </Link>
          </nav>
        ) : null}
      </div>
      {selectedCustomer ? (
        <div className="flex items-center gap-3 text-right">
          <div className="hidden sm:block">
            <p className="text-sm font-medium">{selectedCustomer.name}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {selectedCustomer.email}
            </p>
          </div>
          <Button variant="outline" size="sm" type="button" onClick={onLogout}>
            Logg ut
          </Button>
        </div>
      ) : null}
    </header>
  )
}
