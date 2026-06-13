import { describe, expect, test, vi } from "vitest"
import {
  applyNotificationRecipientWhitelist,
  buildLoginCodeEmail,
  buildNotificationEmail,
  buildOrderUrl,
  buildRoundNotificationEmails,
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
    expect(emails[0]?.text).toContain(buildOrderUrl("order-1", "https://kaffe.example"))
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
