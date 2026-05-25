import { and, eq } from "drizzle-orm"
import { db } from "./client"
import { coffees, suppliers } from "./schema"

const SUPPLIER_NAME = "Solberg Hansen"
const BASE_URL = "https://shop.sh.no"

function productUrl(path: string) {
  return `${BASE_URL}${path}`
}

function imageUrl(path: string) {
  return encodeURI(`${BASE_URL}${path}`)
}

const SOLBERG_HANSEN_COFFEES = [
  {
    name: "Fruktig Sommerkaffe",
    origin: "Rukira - Kenya",
    productPath: "/produkt/kaffe/fruktig-sommerkaffe--riakiberu-kenya-168",
    imagePath:
      "https://b2bshop.sh.no/systemimages/rescaled/Imagegallery_SolbergHansen_sommer-2026_fruktig-sommerkaffe-solberg-og-hansen.png",
    listedPriceKr: 78.5,
  },
  {
    name: "Fyldig Sommerkaffe",
    origin: "Conesol - Brasil",
    productPath: "/produkt/kaffe/fyldig-sommerkaffe--conesol-brasil-115",
    imagePath:
      "https://b2bshop.sh.no/systemimages/rescaled/Imagegallery_SolbergHansen_sommer-2026_fyldig-sommerkaffe-solberg-og-hansen.png",
    listedPriceKr: 78,
  },
  {
    name: "Etiopia - Tade",
    origin: "Klassiker",
    productPath: "/produkt/kaffe/tade-etiopia-kologisk-116",
    imagePath:
      "https://b2bshop.sh.no/systemimages/rescaled/Imagegallery_SolbergHansen_KAFFE 2023_Klassiker Etiopia Tade øko Solberg og Hansen.png",
    listedPriceKr: 76,
  },
  {
    name: "Rwanda - Tumba",
    origin: "Klassiker",
    productPath: "/produkt/kaffe/tumba-rwanda-299",
    imagePath:
      "https://b2bshop.sh.no/systemimages/rescaled/Imagegallery_SolbergHansen_kaffe-2025_klassiker-rwanda-tumba-solberg-og-hansen.png",
    listedPriceKr: 72,
  },
  {
    name: "El Salvador - Bourbon Jungle",
    origin: "Klassiker",
    productPath: "/produkt/kaffe/bourbon-jungle-el-salvador-149",
    imagePath:
      "https://b2bshop.sh.no/systemimages/rescaled/Imagegallery_SolbergHansen_kaffe-2025_klassiker-el-salvador-boubon-jungle-solberg-og-hansen.png",
    listedPriceKr: 79.5,
  },
  {
    name: "Guatemala - Camelias",
    origin: "Klassiker",
    productPath: "/produkt/kaffe/camelias-guatemala-161",
    imagePath:
      "https://b2bshop.sh.no/systemimages/rescaled/Imagegallery_SolbergHansen_kaffe-2025_klassiker-guatemala-camelias-sans-solberg-og-hansen.png",
    listedPriceKr: 73,
  },
  {
    name: "Colombia - Rio Atá",
    origin: "Klassiker, økologisk",
    productPath: "/produkt/kaffe/rio-ata-colombia-kologisk-125",
    imagePath:
      "https://b2bshop.sh.no/systemimages/rescaled/Imagegallery_SolbergHansen_kaffe-2026_klassiker-rio-ata-øko-colombia-solberg-og-hansen.png",
    listedPriceKr: 75,
  },
  {
    name: "Brasil - Barreiro",
    origin: "Klassiker",
    productPath: "/produkt/kaffe/fazenda-barreiro-brasil-124",
    imagePath:
      "https://b2bshop.sh.no/systemimages/rescaled/Imagegallery_SolbergHansen_KAFFE 2023_Klassiker Brasil Barreiro Solberg og Hansen.png",
    listedPriceKr: 63,
  },
  {
    name: "Peru - Sanchez",
    origin: "Klassiker, økologisk",
    productPath: "/produkt/kaffe/sanchez-peru-kologisk-120",
    imagePath:
      "https://b2bshop.sh.no/systemimages/rescaled/Imagegallery_SolbergHansen_KAFFE 2024_Klassiker Peru Sanchez Solberg og Hansen.png",
    listedPriceKr: 71.5,
  },
  {
    name: "Papua Ny-Guinea - Madan Estate",
    origin: "Klassiker",
    productPath: "/produkt/kaffe/madan-estate-papua-nyguinea-163",
    imagePath:
      "https://b2bshop.sh.no/systemimages/rescaled/Imagegallery_SolbergHansen_KAFFE 2024_klassiker-papua-ny-guinea-madan-estate-solberg-og-hansen.png",
    listedPriceKr: 68.5,
  },
  {
    name: "India - Merthi Mountain",
    origin: "Klassiker",
    productPath: "/produkt/kaffe/merthi-mountain-india-144",
    imagePath:
      "https://b2bshop.sh.no/systemimages/rescaled/Imagegallery_SolbergHansen_KAFFE 2022_merthi.png",
    listedPriceKr: 66.5,
  },
  {
    name: "India - Monsooned Malabar",
    origin: "Klassiker",
    productPath: "/produkt/kaffe/monsooned-malabar-a-india-146",
    imagePath:
      "https://b2bshop.sh.no/systemimages/rescaled/Imagegallery_SolbergHansen_KAFFE 2023_India Malabar - klassiker Sans.png",
    listedPriceKr: 61.5,
  },
  {
    name: "Koffeinfri Colombia - Inzá",
    origin: "Klassiker, dekoffeinert",
    productPath: "/produkt/kaffe/koffeinfri-inza-colombia-160250",
    imagePath:
      "https://b2bshop.sh.no/systemimages/rescaled/Imagegallery_SolbergHansen_KAFFE 2023_Klassiker Colombia Inza koffeinfri Solberg og Hansen.png",
    listedPriceKr: 78,
  },
  {
    name: "Franskbrent",
    origin: "Klassiker, blend",
    productPath: "/produkt/kaffe/franskbrent-106",
    imagePath:
      "https://b2bshop.sh.no/systemimages/rescaled/Imagegallery_SolbergHansen_KAFFE 2023_Klassiker BLEND Franskbrent Solberg og Hansen.png",
    listedPriceKr: 63.5,
  },
  {
    name: "Java Mocca",
    origin: "Klassiker, blend",
    productPath: "/produkt/kaffe/java-mocca-105",
    imagePath:
      "https://b2bshop.sh.no/systemimages/rescaled/Imagegallery_SolbergHansen_KAFFE 2023_Klassiker BLEND Java Mocca Solberg og Hansen.png",
    listedPriceKr: 62,
  },
  {
    name: "Sigarblanding",
    origin: "Klassiker, blend",
    productPath: "/produkt/kaffe/sigarblanding-110",
    imagePath:
      "https://b2bshop.sh.no/systemimages/rescaled/Imagegallery_SolbergHansen_KAFFE NYTT DESIGN_Sigarblanding.png",
    listedPriceKr: 62.5,
  },
] as const

await db
  .insert(suppliers)
  .values({ name: SUPPLIER_NAME })
  .onConflictDoNothing({ target: suppliers.name })

const supplierRows = await db
  .select()
  .from(suppliers)
  .where(eq(suppliers.name, SUPPLIER_NAME))
  .limit(1)
const supplier = supplierRows.at(0)
if (!supplier) throw new Error(`${SUPPLIER_NAME} supplier was not seeded`)

for (const coffee of SOLBERG_HANSEN_COFFEES) {
  const description = [
    coffee.origin,
    "Hele bønner, 250g",
    `Product URL: ${productUrl(coffee.productPath)}`,
    `Listed S&H price: ${coffee.listedPriceKr.toLocaleString("nb-NO", {
      minimumFractionDigits: coffee.listedPriceKr % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })} kr`,
  ].join("\n")

  const existingRows = await db
    .select({ id: coffees.id })
    .from(coffees)
    .where(
      and(eq(coffees.supplierId, supplier.id), eq(coffees.name, coffee.name))
    )
    .limit(1)
  const existing = existingRows.at(0)

  const values = {
    description,
    imageUrl: imageUrl(coffee.imagePath),
    priceKr: Math.round(coffee.listedPriceKr),
    isActive: true,
    isDeleted: false,
    updatedAt: new Date(),
  }

  if (existing) {
    await db.update(coffees).set(values).where(eq(coffees.id, existing.id))
  } else {
    await db.insert(coffees).values({
      supplierId: supplier.id,
      name: coffee.name,
      ...values,
    })
  }
}

console.log(`Upserted Solberg Hansen coffees: ${SOLBERG_HANSEN_COFFEES.length}`)
