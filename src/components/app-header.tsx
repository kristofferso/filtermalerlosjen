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
    <header className="border-b border-(--ledger-line) py-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="min-w-0 truncate font-serif text-3xl font-normal tracking-tight sm:text-4xl">
          {title}
        </h1>
        {selectedCustomer ? (
          <div className="flex items-center gap-3 text-right">
            <div className="hidden sm:block">
              <p className="text-sm font-medium">{selectedCustomer.name}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {selectedCustomer.email}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={onLogout}
            >
              Logg ut
            </Button>
          </div>
        ) : null}
      </div>
      {activeNav ? (
        <nav className="mt-3 flex items-center gap-1">
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
    </header>
  )
}
