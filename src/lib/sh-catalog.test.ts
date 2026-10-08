import { describe, expect, test } from "vitest"
import {
  buildShCoffeeDescription,
  parseShCatalogHtml,
  planShSync,
} from "./sh-catalog"

function card({
  href,
  badge = "",
  img,
  name,
  subtitle,
  price,
}: {
  href: string
  badge?: string
  img: string
  name: string
  subtitle: string
  price: string
}) {
  return `
    <div class="col-lg-3 col-md-5 col-sm-5 col-xs-15 product single">
      <div class="product-card" style="height: 412px;">
        <a href="${href}">
          <p class="badge" style="background-color:#B88B6F">${badge}</p>
          <img src="${img}" alt="" class="img-responsive">
          <h4 style="height: 48px;">
              ${name}</h4>
          <hr>
          <p>
              ${subtitle}
          </p>
          <p>
              Fra

                     ${price}
          </p>
        </a>
        <div class="button-group">
          <a id="x_LinkButton_Buy" class="btn btn-cta black" href="javascript:__doPostBack('x','')">Kjøp nå</a>
          <a href="${href}" role="button" class="btn btn-cta">Les mer</a>
        </div>
      </div>
    </div>`
}

const PAGE = `
  <div class="templates product-template"><a href="#"><img src=""><h2 class="title"></h2></a></div>
  ${card({
    href: "/produkt/kaffe/tade-etiopia-kologisk-116",
    badge: "ØKOLOGISK",
    img: "/systemimages/rescaled/Imagegallery_SolbergHansen_KAFFE 2023_Klassiker Etiopia Tade øko Solberg og Hansen.png",
    name: "Etiopia - Tade",
    subtitle: "Klassiker",
    price: "76,00 kr",
  })}
  ${card({
    href: "/produkt/kaffe/half--half-espresso-232",
    img: "/systemimages/rescaled/halfnhalf.png",
    name: "Half &amp; Half (Espresso)",
    subtitle: "Klassiker",
    price: "66,00 kr",
  })}
  ${card({
    href: "/produkt/kaffe/filtermalt-julekaffe-la-bolsa-guatemala-15425",
    badge: "FORHÅNDSBESTILLING",
    img: "/systemimages/rescaled/jul.png",
    name: "Klassisk Julekaffe (filtermalt)",
    subtitle: "La Bolsa - Guatemala",
    price: "1&nbsp;600,00 kr",
  })}
  ${card({
    href: "/produkt/kaffe/gatugi-kenya-168",
    img: "/systemimages/rescaled/gatugi.png",
    name: "Kenya - Gatugi",
    subtitle: "Klassiker",
    price: "78,50 kr",
  })}
  <a id="btnReadmoreProductList" class="btn btn-cta black" href="#">Vis flere produkter</a>
`

describe("parseShCatalogHtml", () => {
  const catalog = parseShCatalogHtml(PAGE)

  test("reads every product card", () => {
    expect(catalog.products.map((product) => product.name)).toEqual([
      "Etiopia - Tade",
      "Half & Half (Espresso)",
      "Klassisk Julekaffe (filtermalt)",
      "Kenya - Gatugi",
    ])
  })

  test("reads subtitle, badge, price, links and encoded image urls", () => {
    const [tade, , jul, gatugi] = catalog.products

    expect(tade.subtitle).toBe("Klassiker")
    expect(tade.badge).toBe("ØKOLOGISK")
    expect(tade.productPath).toBe("/produkt/kaffe/tade-etiopia-kologisk-116")
    expect(tade.productUrl).toBe(
      "https://shop.sh.no/produkt/kaffe/tade-etiopia-kologisk-116"
    )
    expect(tade.imageUrl).toBe(
      "https://b2bshop.sh.no/systemimages/rescaled/Imagegallery_SolbergHansen_KAFFE%202023_Klassiker%20Etiopia%20Tade%20%C3%B8ko%20Solberg%20og%20Hansen.png"
    )
    expect(jul.listedPriceKr).toBe(1600)
    expect(gatugi.listedPriceKr).toBe(78.5)
    expect(gatugi.priceKr).toBe(79)
  })

  test("flags a partial list when 'Vis flere produkter' is present", () => {
    expect(catalog.hasMore).toBe(true)
    expect(parseShCatalogHtml("<div></div>").hasMore).toBe(false)
  })
})

describe("planShSync", () => {
  const { products } = parseShCatalogHtml(PAGE)
  const base = { imageUrl: "", priceKr: 76, isActive: true }

  test("matches on product url first, then on name", () => {
    const plan = planShSync(
      [
        {
          ...base,
          id: "tade",
          name: "Tade (omdøpt)",
          description:
            "Klassiker\nProduct URL: https://shop.sh.no/produkt/kaffe/tade-etiopia-kologisk-116",
          imageUrl: products[0].imageUrl,
        },
        {
          ...base,
          id: "half",
          name: "half & half (espresso)",
          description: "",
          priceKr: 66,
          imageUrl: products[1].imageUrl,
        },
      ],
      products
    )

    expect(plan.unchanged.map((entry) => entry.coffee.id)).toEqual([
      "tade",
      "half",
    ])
    expect(plan.create.map((product) => product.name)).toEqual([
      "Klassisk Julekaffe (filtermalt)",
      "Kenya - Gatugi",
    ])
  })

  test("deactivates missing coffees and reactivates returning ones", () => {
    const plan = planShSync(
      [
        {
          ...base,
          id: "sommer",
          name: "Fruktig Sommerkaffe",
          description: "Product URL: https://shop.sh.no/produkt/kaffe/x-1",
        },
        {
          ...base,
          id: "gatugi",
          name: "Kenya - Gatugi",
          description: "",
          priceKr: 75,
          isActive: false,
        },
        {
          ...base,
          id: "gammel",
          name: "Allerede inaktiv",
          description: "",
          isActive: false,
        },
      ],
      products
    )

    expect(plan.deactivate.map((coffee) => coffee.id)).toEqual(["sommer"])
    expect(plan.update).toHaveLength(1)
    expect(plan.update[0]).toMatchObject({
      reactivate: true,
      priceChanged: true,
      imageChanged: true,
    })
  })

  test("builds a description that later syncs can match on", () => {
    const description = buildShCoffeeDescription(products[3])
    expect(description).toBe(
      "Klassiker\nProduct URL: https://shop.sh.no/produkt/kaffe/gatugi-kenya-168\nListed S&H price: 78,50 kr"
    )
    const plan = planShSync(
      [
        {
          id: "ny",
          name: "Noe annet",
          description,
          imageUrl: products[3].imageUrl,
          priceKr: 79,
          isActive: true,
        },
      ],
      [products[3]]
    )
    expect(plan.unchanged).toHaveLength(1)
  })
})
