import { describe, expect, test, vi } from "vitest"
import {
  EMAIL_TEMPLATE_IDS,
  applyBroadcastMergeFields,
  applyNotificationRecipientWhitelist,
  buildBroadcastEmail,
  buildEmailTemplatePreviews,
  buildLoginCodeEmail,
  buildNotificationEmail,
  buildOrderUrl,
  buildRoundNotificationEmails,
  buildRoundOpenedEmail,
  getNotificationDeliveryStatus,
  sendNotificationEmail,
} from "./notifications"

describe("notification templates", () => {
  test("builds branded payment email with order link and total", () => {
    const email = buildNotificationEmail({
      kind: "payment-ready",
      to: "kunde@example.com",
      customerName: "Kari",
      orderUrl: "https://kaffe.example/bestilling/order-1",
      totalKr: 456,
    })

    expect(email.to).toBe("kunde@example.com")
    expect(email.subject).toBe("Kaffeoppgjøret er klart")
    expect(email.html).toContain("Filtermalerlosjen")
    expect(email.html).toContain("456 kr")
    expect(email.html).toContain("https://kaffe.example/bestilling/order-1")
    expect(email.html).toContain("background:#ffffff")
    expect(email.html).toContain("color:#000000")
    expect(email.html).not.toContain("#f6f1e8")
    expect(email.html).not.toContain("#fffaf2")
    expect(email.html).not.toContain("#211b16")
    expect(email.text).toContain("Kari")
    expect(email.text).toContain("https://kaffe.example/bestilling/order-1")
  })

  test("builds a login code email without an action link", () => {
    const email = buildLoginCodeEmail({
      to: "kunde@example.com",
      code: "123456",
      customerName: "Kari",
    })

    expect(email.to).toBe("kunde@example.com")
    expect(email.subject).toBe("123456 er innloggingskoden din")
    expect(email.html).toContain("123456")
    expect(email.html).toContain("Filtermalerlosjen")
    expect(email.html).toContain("one-time code")
    expect(email.html).not.toContain("<a ")
    expect(email.text).toContain("123456")
    expect(email.text).not.toContain("Se bestilling")
  })

  test("filters empty recipient emails from round notifications", () => {
    const emails = buildRoundNotificationEmails({
      kind: "pickup-ready",
      baseUrl: "https://kaffe.example",
      orders: [
        {
          orderId: "order-1",
          customerName: "Kari",
          customerEmail: "kari@example.com",
          totalKr: 123,
          paid: true,
          collected: false,
        },
        {
          orderId: "order-2",
          customerName: "Ola",
          customerEmail: " ",
          totalKr: 234,
          paid: false,
          collected: false,
        },
      ],
    })

    expect(emails).toHaveLength(1)
    expect(emails[0]?.to).toBe("kari@example.com")
    expect(emails[0]?.text).toContain(
      buildOrderUrl("order-1", "https://kaffe.example")
    )
  })
})

describe("email template previews", () => {
  test("renders a preview for every template with sample data", () => {
    const previews = buildEmailTemplatePreviews("https://kaffe.example")

    expect(previews.map((preview) => preview.id)).toEqual([
      ...EMAIL_TEMPLATE_IDS,
    ])

    const payment = previews.find((preview) => preview.id === "payment-ready")
    expect(payment?.subject).toBe("Kaffeoppgjøret er klart")
    expect(payment?.html).toContain("349 kr")
    expect(payment?.html).toContain("Kari Nordmann")
    expect(payment?.mergeFields.map((field) => field.label)).toContain("Beløp")

    const login = previews.find((preview) => preview.id === "login-code")
    expect(login?.html).toContain("123456")
  })

  test("includes a round-opened announcement template", () => {
    const previews = buildEmailTemplatePreviews("https://kaffe.example")
    const roundOpened = previews.find(
      (preview) => preview.id === "round-opened"
    )

    expect(roundOpened?.subject).toBe("Ny kafferunde er åpnet")
    expect(roundOpened?.html).toContain("Legg inn bestilling")
    expect(roundOpened?.html).toContain("https://kaffe.example/")
    expect(roundOpened?.mergeFields.map((field) => field.label)).toContain(
      "Leverandør"
    )
  })

  test("renders action buttons with rounded corners", () => {
    const previews = buildEmailTemplatePreviews("https://kaffe.example")
    const withButton = previews.find(
      (preview) => preview.id === "order-confirmed"
    )

    expect(withButton?.html).toContain("border-radius:8px")
  })
})

describe("round opened email", () => {
  test("links to the order page with a place-order action", () => {
    const email = buildRoundOpenedEmail({
      to: "kari@example.com",
      customerName: "Kari",
      orderPageUrl: "https://kaffe.example/",
      supplierName: "Solberg & Hansen",
    })

    expect(email.subject).toBe("Ny kafferunde er åpnet")
    expect(email.html).toContain("Solberg &amp; Hansen")
    expect(email.html).toContain("https://kaffe.example/")
    expect(email.text).toContain("Legg inn bestilling: https://kaffe.example/")
  })
})

describe("broadcast emails", () => {
  test("replaces the name merge field per recipient", () => {
    expect(applyBroadcastMergeFields("Hei {{navn}}, velkommen", "Kari")).toBe(
      "Hei Kari, velkommen"
    )
    expect(applyBroadcastMergeFields("Hei {{ NAME }}", "Ola")).toBe("Hei Ola")
  })

  test("builds a branded broadcast email with markdown and merged name", () => {
    const email = buildBroadcastEmail({
      to: "kari@example.com",
      subject: "Ny runde",
      body: "Hei {{navn}},\n\nVi åpner **mandag**.",
      customerName: "Kari",
    })

    expect(email.to).toBe("kari@example.com")
    expect(email.subject).toBe("Ny runde")
    expect(email.html).toContain("Filtermalerlosjen")
    expect(email.html).toContain("Hei Kari,")
    expect(email.html).toContain("<strong>mandag</strong>")
    expect(email.text).toContain("Hei Kari,")
  })
})

describe("notification delivery status", () => {
  test("reports unconfigured delivery and empty whitelist", () => {
    const status = getNotificationDeliveryStatus({})
    expect(status.deliveryConfigured).toBe(false)
    expect(status.whitelist).toEqual([])
  })

  test("reports configuration and parsed whitelist", () => {
    const status = getNotificationDeliveryStatus({
      RESEND_API_KEY: "secret",
      NOTIFICATION_FROM: "Filtermalerlosjen <kaffe@example.com>",
      NOTIFICATION_RECIPIENT_WHITELIST: "admin@example.com, backup@example.com",
    })
    expect(status.deliveryConfigured).toBe(true)
    expect(status.from).toBe("Filtermalerlosjen <kaffe@example.com>")
    expect(status.whitelist).toEqual([
      "admin@example.com",
      "backup@example.com",
    ])
  })
})

describe("notification recipient whitelist", () => {
  const email = buildNotificationEmail({
    kind: "order-confirmed",
    to: "kunde@example.com",
    customerName: "Kari",
    orderUrl: "https://kaffe.example/bestilling/order-1",
  })

  test("leaves recipients unchanged when whitelist is not configured", () => {
    expect(applyNotificationRecipientWhitelist(email, {})).toEqual(email)
  })

  test("redirects non-whitelisted recipients to the first whitelisted address", () => {
    const redirected = applyNotificationRecipientWhitelist(email, {
      NOTIFICATION_RECIPIENT_WHITELIST: "admin@example.com, backup@example.com",
    })

    expect(redirected.to).toBe("admin@example.com")
    expect(redirected.subject).toBe(email.subject)
    expect(redirected.html).toContain("Original mottaker: kunde@example.com")
    expect(redirected.text).toContain("Original mottaker: kunde@example.com")
  })

  test("keeps whitelisted recipients unchanged", () => {
    const allowed = applyNotificationRecipientWhitelist(email, {
      NOTIFICATION_RECIPIENT_WHITELIST: "kunde@example.com",
    })

    expect(allowed.to).toBe("kunde@example.com")
    expect(allowed.text).not.toContain("Original mottaker")
  })
})

describe("sendNotificationEmail", () => {
  test("skips when Resend config is missing", async () => {
    const result = await sendNotificationEmail(
      buildNotificationEmail({
        kind: "order-confirmed",
        to: "kunde@example.com",
        customerName: "Kari",
        orderUrl: "https://kaffe.example/bestilling/order-1",
      }),
      { env: {} }
    )

    expect(result).toEqual({ sent: false, skipped: true })
  })

  test("sends through injected sender with whitelist applied", async () => {
    const sender = vi.fn()
    await sendNotificationEmail(
      buildNotificationEmail({
        kind: "pickup-ready",
        to: "kunde@example.com",
        customerName: "Kari",
        orderUrl: "https://kaffe.example/bestilling/order-1",
        paid: true,
        collected: false,
      }),
      {
        env: {
          RESEND_API_KEY: "secret",
          NOTIFICATION_FROM: "Filtermalerlosjen <kaffe@example.com>",
          NOTIFICATION_RECIPIENT_WHITELIST: "admin@example.com",
        },
        sender,
      }
    )

    expect(sender).toHaveBeenCalledOnce()
    expect(sender.mock.calls[0]?.[0].to).toBe("admin@example.com")
  })
})
