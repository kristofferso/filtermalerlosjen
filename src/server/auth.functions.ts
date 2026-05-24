import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { unlockAdminSession, unlockCustomerSession } from "./auth.server"

const passwordSchema = z.object({ password: z.string().min(1) })

export const unlockCustomer = createServerFn({ method: "POST" })
  .inputValidator((input) => passwordSchema.parse(input))
  .handler(async ({ data }) => unlockCustomerSession(data.password))

export const unlockAdmin = createServerFn({ method: "POST" })
  .inputValidator((input) => passwordSchema.parse(input))
  .handler(async ({ data }) => unlockAdminSession(data.password))
