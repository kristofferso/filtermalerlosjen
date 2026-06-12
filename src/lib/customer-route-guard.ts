export type CustomerLoginRedirect = {
  to: "/login"
  search: { redirect?: string }
}

export function getCustomerLoginRedirect({
  authenticated,
  currentPath,
}: {
  authenticated: boolean
  currentPath: string
}): CustomerLoginRedirect | null {
  if (authenticated) return null

  return {
    to: "/login",
    search: currentPath === "/login" ? {} : { redirect: currentPath },
  }
}
