import { and, eq } from "drizzle-orm"
import { db } from "./client"
import { coffees, suppliers } from "./schema"

const SUPPLIER_NAMES = ["Solberg Hansen", "Fuglen"] as const

const FUGLEN_COFFEES = [
  {
    sourceProductId: "3474",
    name: "Biloya / Natural / Ethiopia",
    productUrl:
      "https://fuglencoffee.getbeans.com/product/biloya-natural-ethiopia/",
    variation: "Grind: Whole bean, Weight: 250g",
    imageUrl:
      "https://fuglencoffee.getbeans.com/wp-content/uploads/2024/10/a155c1bc-3b38-43a6-8f73-80bbe91c0cbd.jpeg",
    priceKr: 122,
  },
  {
    sourceProductId: "3866",
    name: "Harmufo / Washed / Ethiopia",
    productUrl:
      "https://fuglencoffee.getbeans.com/product/harmufo-washed-ethiopia/",
    variation: "Grind: Whole Bean, Weight: 250g",
    imageUrl:
      "https://fuglencoffee.getbeans.com/wp-content/uploads/2024/10/a155c1bc-3b38-43a6-8f73-80bbe91c0cbd.jpeg",
    priceKr: 116,
  },
  {
    sourceProductId: "4016",
    name: "Kagumoini / Washed / Kenya",
    productUrl:
      "https://fuglencoffee.getbeans.com/product/kagumoini-washed-kenya/",
    variation: "Grind: Whole bean, Weight: 250g",
    imageUrl:
      "https://fuglencoffee.getbeans.com/wp-content/uploads/2024/10/404280a7-3e0d-4019-a5d2-8002c1dd8e07.jpeg",
    priceKr: 118,
  },
  {
    sourceProductId: "3465",
    name: "Kerinci / Honey / Indonesia",
    productUrl:
      "https://fuglencoffee.getbeans.com/product/kerinci-honey-indonesia/",
    variation: "Grind: Whole bean, Weight: 250g",
    imageUrl:
      "https://fuglencoffee.getbeans.com/wp-content/uploads/2025/10/Fuglen_Asia_Final_Flat-scaled.png",
    priceKr: 109,
  },
  {
    sourceProductId: "1147",
    name: "La Chancha / Washed / Peru",
    productUrl:
      "https://fuglencoffee.getbeans.com/product/la-chancha-washed-peru/",
    variation: "Grind: Whole bean, Weight: 250g",
    imageUrl:
      "https://fuglencoffee.getbeans.com/wp-content/uploads/2024/10/1f34a299-ddf0-4ec3-b9a2-9733f0d47efd.jpeg",
    priceKr: 123,
  },
  {
    sourceProductId: "1592",
    name: "Los Quetzales / Washed / Honduras",
    productUrl:
      "https://fuglencoffee.getbeans.com/product/los-quetzales-washed-honduras/",
    variation: "Grind: Wholebean, Weight: 250g",
    imageUrl:
      "https://fuglencoffee.getbeans.com/wp-content/uploads/2024/10/77078558-34d6-485d-bf8a-5d7114dad555.jpeg",
    priceKr: 109,
  },
  {
    sourceProductId: "4181",
    name: "Rigoberto Diaz Navarro / Washed / Colombia",
    productUrl:
      "https://fuglencoffee.getbeans.com/product/rigoberto-diaz-navarro-washed-colombia/",
    variation: "Grind: Whole bean, Weight: 250g",
    imageUrl:
      "https://fuglencoffee.getbeans.com/wp-content/uploads/2024/10/b0c740b6-90e0-41f0-acd3-1f792f2b9f20.jpeg",
    priceKr: 116,
  },
] as const

for (const name of SUPPLIER_NAMES) {
  await db
    .insert(suppliers)
    .values({ name })
    .onConflictDoNothing({ target: suppliers.name })
}

const fuglenRows = await db
  .select()
  .from(suppliers)
  .where(eq(suppliers.name, "Fuglen"))
  .limit(1)
const fuglen = fuglenRows.at(0)
if (!fuglen) throw new Error("Fuglen supplier was not seeded")

for (const coffee of FUGLEN_COFFEES) {
  const description = [
    coffee.variation,
    `Product URL: ${coffee.productUrl}`,
    `Fuglen product ID: ${coffee.sourceProductId}`,
  ].join("\n")

  const existingRows = await db
    .select({ id: coffees.id })
    .from(coffees)
    .where(
      and(eq(coffees.supplierId, fuglen.id), eq(coffees.name, coffee.name))
    )
    .limit(1)
  const existing = existingRows.at(0)

  if (existing) {
    await db
      .update(coffees)
      .set({
        description,
        imageUrl: coffee.imageUrl,
        priceKr: coffee.priceKr,
        isActive: true,
        isDeleted: false,
        updatedAt: new Date(),
      })
      .where(eq(coffees.id, existing.id))
  } else {
    await db.insert(coffees).values({
      supplierId: fuglen.id,
      name: coffee.name,
      description,
      imageUrl: coffee.imageUrl,
      priceKr: coffee.priceKr,
    })
  }
}

console.log(`Seeded suppliers: ${SUPPLIER_NAMES.join(", ")}`)
console.log(`Upserted Fuglen coffees: ${FUGLEN_COFFEES.length}`)
