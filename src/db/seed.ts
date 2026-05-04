import { db } from "./client"
import { suppliers } from "./schema"

const SUPPLIER_NAMES = ["Solberg Hansen", "Fuglen"] as const

for (const name of SUPPLIER_NAMES) {
  await db
    .insert(suppliers)
    .values({ name })
    .onConflictDoNothing({ target: suppliers.name })
}

console.log(`Seeded suppliers: ${SUPPLIER_NAMES.join(", ")}`)
