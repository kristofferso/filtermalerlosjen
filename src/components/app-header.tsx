import type { getCustomerHomeData } from "@/server/coffee"
import { Button } from "@/components/ui/button"

type CustomerData = Extract<
  Awaited<ReturnType<typeof getCustomerHomeData>>,
  { unlocked: true }
>

export function AppHeader({
  title,
  selectedCustomer,
  onLogout,
}: {
  title: string
  selectedCustomer?: CustomerData["selectedCustomer"]
  onLogout?: () => Promise<void>
}) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-(--ledger-line) py-4">
      <div className="flex items-center gap-3">
        <h1 className="font-serif text-3xl font-normal tracking-tight sm:text-4xl">
          {title}
        </h1>
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
