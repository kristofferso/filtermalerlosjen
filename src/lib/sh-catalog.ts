// Parses the Solberg & Hansen B2B shop category page (b2bshop.sh.no/kategori/kaffe)
// and compares it with our coffee catalog.

const SH_B2B_BASE_URL = "https://b2bshop.sh.no"
const SH_SHOP_BASE_URL = "https://shop.sh.no"

// Prices above this are probably not a 250 g bag (1 kg, 2,5 kg, boxes).
export const SH_UNUSUAL_PRICE_KR = 150

export type ShProduct = {
  name: string
  subtitle: string
  badge: string
  listedPriceKr: number
  priceKr: number
  productPath: string
  productUrl: string
  imageUrl: string
}

export type ShCatalog = {
  products: Array<ShProduct>
  // The page has a "Vis flere produkter" button, so the list may be partial.
  hasMore: boolean
}

export type CatalogCoffee = {
  id: string
  name: string
  description: string
  imageUrl: string
  priceKr: number
  isActive: boolean
}

export type ShSyncPlan<TCoffee extends CatalogCoffee = CatalogCoffee> = {
  create: Array<ShProduct>
  deactivate: Array<TCoffee>
  update: Array<{
    coffee: TCoffee
    product: ShProduct
    reactivate: boolean
    priceChanged: boolean
    imageChanged: boolean
  }>
  unchanged: Array<{ coffee: TCoffee; product: ShProduct }>
}

export function parseShCatalogHtml(html: string): ShCatalog {
  const chunks = html.split(/class="product-card"/).slice(1)
  const products: Array<ShProduct> = []
  const seenPaths = new Set<string>()

  for (const chunk of chunks) {
    const href = chunk.match(/<a\s+href="([^"]+)"/)?.[1]
    const name = cleanText(chunk.match(/<h4[^>]*>([\s\S]*?)<\/h4>/)?.[1] ?? "")
    if (!href || !name) continue

    const productPath = normalizeProductPath(decodeEntities(href))
    if (seenPaths.has(productPath)) continue
    seenPaths.add(productPath)

    const afterName = chunk.slice(chunk.search(/<\/h4>/))
    const paragraphs = [...afterName.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(
      (match) => cleanText(match[1])
    )
    const priceText = paragraphs.find((text) => /kr\s*$/i.test(text)) ?? ""
    const subtitle = paragraphs.find((text) => text !== priceText) ?? ""
    const listedPriceKr = parseNorwegianPrice(priceText)
    const imageSrc = chunk.match(/<img\s+src="([^"]*)"/)?.[1] ?? ""

    products.push({
      name,
      subtitle,
      badge: cleanText(
        chunk.match(/<p class="badge"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? ""
      ),
      listedPriceKr,
      priceKr: Math.round(listedPriceKr),
      productPath,
      productUrl: `${SH_SHOP_BASE_URL}${productPath}`,
      imageUrl: imageSrc
        ? new URL(decodeEntities(imageSrc), SH_B2B_BASE_URL).toString()
        : "",
    })
  }

  return {
    products,
    hasMore: /id="btnReadmoreProductList"/.test(html),
  }
}

export function planShSync<TCoffee extends CatalogCoffee>(
  coffees: Array<TCoffee>,
  products: Array<ShProduct>
): ShSyncPlan<TCoffee> {
  const plan: ShSyncPlan<TCoffee> = {
    create: [],
    deactivate: [],
    update: [],
    unchanged: [],
  }
  const matchedCoffeeIds = new Set<string>()

  for (const product of products) {
    const coffee =
      coffees.find(
        (candidate) =>
          !matchedCoffeeIds.has(candidate.id) &&
          extractProductPath(candidate.description) === product.productPath
      ) ??
      coffees.find(
        (candidate) =>
          !matchedCoffeeIds.has(candidate.id) &&
          normalizeName(candidate.name) === normalizeName(product.name)
      )

    if (!coffee) {
      plan.create.push(product)
      continue
    }

    matchedCoffeeIds.add(coffee.id)
    const reactivate = !coffee.isActive
    const priceChanged =
      product.priceKr > 0 && coffee.priceKr !== product.priceKr
    const imageChanged =
      product.imageUrl !== "" && coffee.imageUrl !== product.imageUrl

    if (reactivate || priceChanged || imageChanged) {
      plan.update.push({
        coffee,
        product,
        reactivate,
        priceChanged,
        imageChanged,
      })
    } else {
      plan.unchanged.push({ coffee, product })
    }
  }

  plan.deactivate = coffees.filter(
    (coffee) => coffee.isActive && !matchedCoffeeIds.has(coffee.id)
  )

  return plan
}

export function buildShCoffeeDescription(product: ShProduct) {
  return [
    product.subtitle,
    `Product URL: ${product.productUrl}`,
    `Listed S&H price: ${formatListedPrice(product.listedPriceKr)} kr`,
  ]
    .filter(Boolean)
    .join("\n")
}

export function extractProductPath(description: string) {
  const path = description.match(/\/produkt\/[^\s]+/)?.[0]
  return path ? normalizeProductPath(path) : null
}

function normalizeProductPath(href: string) {
  try {
    return new URL(href, SH_B2B_BASE_URL).pathname.replace(/\/+$/, "")
  } catch {
    return href
  }
}

function normalizeName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9æøå]+/g, " ")
    .trim()
}

function parseNorwegianPrice(text: string) {
  const number = text
    .replace(/[^\d,.]/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
  const value = Number.parseFloat(number)
  return Number.isFinite(value) ? value : 0
}

function formatListedPrice(value: number) {
  return value.toLocaleString("nb-NO", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

function cleanText(html: string) {
  return decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim()
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_match, code: string) =>
      String.fromCodePoint(Number(code))
    )
    .replace(/&amp;/g, "&")
}
