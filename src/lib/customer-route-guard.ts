export type CustomerLoginRedirect = {
  to: "/login"
  search: { redirect?: string }
}

export function getCustomerLoginRedirect({
  unlocked,
  hasSelectedCustomer,
  currentPath,
}: {
  unlocked: boolean
  hasSelectedCustomer: boolean
  currentPath: string
}): CustomerLoginRedirect | null {
  if (unlocked && hasSelectedCustomer) return null

  return {
    to: "/login",
    search: currentPath === "/login" ? {} : { redirect: currentPath },
  }
}
