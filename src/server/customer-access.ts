import { createServerFn } from "@tanstack/react-start"

import { getSelectedCustomerId, isCustomerUnlocked } from "./auth.server"

export const getCustomerRouteAccess = createServerFn({ method: "GET" }).handler(
  async () => {
    const unlocked = await isCustomerUnlocked()
    if (!unlocked) {
      return { unlocked: false as const, selectedCustomerId: null }
    }

    return {
      unlocked: true as const,
      selectedCustomerId: await getSelectedCustomerId(),
    }
  }
)
