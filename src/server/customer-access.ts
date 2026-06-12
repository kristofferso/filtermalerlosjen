import { createServerFn } from "@tanstack/react-start"

import { getCurrentUser } from "./session"

export const getCustomerRouteAccess = createServerFn({ method: "GET" }).handler(
  async () => {
    const user = await getCurrentUser()
    return {
      authenticated: Boolean(user),
      customerId: user?.id ?? null,
    }
  }
)
