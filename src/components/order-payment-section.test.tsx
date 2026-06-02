import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { OrderPaymentSection } from "./order-payment-section"

const baseOrder = {
  paid: false,
  vippsUrl: "https://vipps.example/pay",
}

describe("OrderPaymentSection", () => {
  it("shows manual payment update guidance and payment action when unpaid", () => {
    const markup = renderToStaticMarkup(<OrderPaymentSection order={baseOrder} />)

    expect(markup).toContain("<h2")
    expect(markup).toContain("Betaling")
    expect(markup).toContain(
      "Betalinger må oppdateres manuelt, så det vises ikke her umiddelbart."
    )
    expect(markup).toContain(`href="${baseOrder.vippsUrl}"`)
    expect(markup).toContain("Betal med Vipps")
  })

  it("shows a clear paid state with a checkmark when paid", () => {
    const markup = renderToStaticMarkup(
      <OrderPaymentSection order={{ ...baseOrder, paid: true }} />
    )

    expect(markup).toContain("Betalt")
    expect(markup).toContain("Du har betalt! Her er alt i skjønneste orden")
    expect(markup).toContain("aria-label=\"Betaling registrert\"")
    expect(markup).not.toContain("Betal med Vipps")
  })
})
