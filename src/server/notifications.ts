import { BRAND_NAME } from "@/components/brand"

export type NotificationKind =
  | "order-confirmed"
  | "payment-ready"
  | "pickup-ready"

export type NotificationEmail = {
  to: string
  subject: string
  html: string
  text: string
}

type BaseNotificationInput = {
  to: string
  customerName: string
  orderUrl: string
}

type NotificationInput =
  | (BaseNotificationInput & { kind: "order-confirmed" })
  | (BaseNotificationInput & { kind: "payment-ready"; totalKr: number })
  | (BaseNotificationInput & {
      kind: "pickup-ready"
      paid: boolean
      collected: boolean
    })

type RoundNotificationOrder = {
  orderId: string
  customerName: string
  customerEmail: string | null
  totalKr: number
  paid: boolean
  collected: boolean
}

type RoundNotificationInput = {
  kind: Exclude<NotificationKind, "order-confirmed">
  baseUrl: string
  orders: Array<RoundNotificationOrder>
}

type NotificationConfig = {
  apiKey: string
  from: string
  replyTo?: string
}

type NotificationEnv = Partial<Record<string, string | undefined>>

type SendNotificationOptions = {
  env?: NotificationEnv
  sender?: (
    email: NotificationEmail,
    config: NotificationConfig
  ) => Promise<void>
}

export function buildOrderUrl(orderId: string, baseUrl: string) {
  return `${baseUrl.replace(/\/+$/, "")}/bestilling/${orderId}`
}

export function buildLoginCodeEmail({
  to,
  code,
  customerName,
}: {
  to: string
  code: string
  customerName: string
}): NotificationEmail {
  const title = "Innloggingskode"
  const body = `Koden din er ${code}. Den er gyldig i 10 minutter. Skriv den inn for å logge inn. Hvis du ikke ba om dette kan du se bort fra denne e-posten.`

  return {
    to,
    subject: `Innloggingskode: ${code}`,
    html: renderHtml({
      customerName,
      title,
      body,
      orderUrl: null,
      actionLabel: null,
    }),
    text: renderText({ customerName, title, body, orderUrl: null }),
  }
}

export function buildNotificationEmail(
  input: NotificationInput
): NotificationEmail {
  const content = getNotificationContent(input)
  const actionLabel = "Se bestilling"

  return {
    to: input.to,
    subject: content.subject,
    html: renderHtml({
      customerName: input.customerName,
      title: content.title,
      body: content.body,
      orderUrl: input.orderUrl,
      actionLabel,
    }),
    text: renderText({
      customerName: input.customerName,
      title: content.title,
      body: content.body,
      orderUrl: input.orderUrl,
    }),
  }
}

export function buildRoundNotificationEmails(input: RoundNotificationInput) {
  return input.orders.flatMap((order) => {
    const to = order.customerEmail?.trim()
    if (!to) return []

    return buildNotificationEmail({
      kind: input.kind,
      to,
      customerName: order.customerName,
      orderUrl: buildOrderUrl(order.orderId, input.baseUrl),
      totalKr: order.totalKr,
      paid: order.paid,
      collected: order.collected,
    })
  })
}

export function applyNotificationRecipientWhitelist(
  email: NotificationEmail,
  env: NotificationEnv
): NotificationEmail {
  const allowedRecipients = parseRecipientWhitelist(
    env.NOTIFICATION_RECIPIENT_WHITELIST
  )
  if (allowedRecipients.length === 0) return email

  const normalizedRecipient = email.to.trim().toLowerCase()
  if (
    allowedRecipients.some(
      (recipient) => recipient.toLowerCase() === normalizedRecipient
    )
  ) {
    return email
  }

  const redirectedTo = allowedRecipients[0]
  return {
    ...email,
    to: redirectedTo,
    html: email.html.replace(
      "</body>",
      `<p style="max-width:560px;margin:16px auto 0;padding:0 20px;color:#000000;font-size:12px;">Original mottaker: ${escapeHtml(email.to)}</p></body>`
    ),
    text: `${email.text}\n\nOriginal mottaker: ${email.to}`,
  }
}

export async function sendNotificationEmail(
  email: NotificationEmail,
  options: SendNotificationOptions = {}
) {
  const env = options.env ?? process.env
  const config = getNotificationConfig(env)
  if (!config) return { sent: false, skipped: true }

  const deliveryEmail = applyNotificationRecipientWhitelist(email, env)

  if (options.sender) {
    await options.sender(deliveryEmail, config)
    return { sent: true, skipped: false }
  }

  const { Resend } = await import("resend")
  const resend = new Resend(config.apiKey)
  await resend.emails.send({
    from: config.from,
    to: deliveryEmail.to,
    subject: deliveryEmail.subject,
    html: deliveryEmail.html,
    text: deliveryEmail.text,
    replyTo: config.replyTo,
  })

  return { sent: true, skipped: false }
}

function parseRecipientWhitelist(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((recipient) => recipient.trim())
    .filter(Boolean)
}

function getNotificationConfig(env: NotificationEnv): NotificationConfig | null {
  const apiKey = env.RESEND_API_KEY?.trim()
  const from = env.NOTIFICATION_FROM?.trim()
  const replyTo = env.NOTIFICATION_REPLY_TO?.trim()

  if (!apiKey || !from) return null
  return { apiKey, from, replyTo: replyTo || undefined }
}

function getNotificationContent(input: NotificationInput) {
  if (input.kind === "order-confirmed") {
    return {
      subject: "Bestillingen din er mottatt",
      title: "Bestillingen din er mottatt",
      body: "Betalingsinfo kommer når runden stenger. Du kan åpne bestillingen din for status underveis.",
    }
  }

  if (input.kind === "payment-ready") {
    return {
      subject: "Kaffeoppgjøret er klart",
      title: "Kaffeoppgjøret er klart",
      body: `Din andel er ${input.totalKr} kr. Åpne bestillingen for betalingslenke og detaljer.`,
    }
  }

  return {
    subject: "Kaffen er klar for henting",
    title: "Kaffen er klar for henting",
    body: `${input.paid ? "Betalt" : "Ikke betalt"}. ${
      input.collected ? "Markert som hentet" : "Ikke markert som hentet"
    }. Åpne bestillingen for status og detaljer.`,
  }
}

function renderHtml({
  customerName,
  title,
  body,
  orderUrl,
  actionLabel,
}: {
  customerName: string
  title: string
  body: string
  orderUrl: string | null
  actionLabel: string | null
}) {
  const action =
    orderUrl && actionLabel
      ? `
      <p style="margin:0;">
        <a href="${escapeAttribute(orderUrl)}" style="display:inline-block;background:#000000;color:#ffffff;text-decoration:none;padding:12px 18px;font-weight:700;">${escapeHtml(actionLabel)}</a>
      </p>`
      : ""

  return `<!doctype html>
<html lang="no">
  <body style="margin:0;background:#ffffff;color:#000000;font-family:Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <p style="margin:0 0 18px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#000000;">${escapeHtml(BRAND_NAME)}</p>
      <h1 style="margin:0 0 16px;font-size:28px;line-height:1.15;font-weight:700;color:#000000;">${escapeHtml(title)}</h1>
      <p style="margin:0 0 16px;line-height:1.6;color:#000000;">Hei ${escapeHtml(customerName)},</p>
      <p style="margin:0 0 24px;line-height:1.6;color:#000000;">${escapeHtml(body)}</p>${action}
    </div>
  </body>
</html>`
}

function renderText({
  customerName,
  title,
  body,
  orderUrl,
}: {
  customerName: string
  title: string
  body: string
  orderUrl: string | null
}) {
  const action = orderUrl ? `\n\nSe bestilling: ${orderUrl}` : ""
  return `${BRAND_NAME}\n\n${title}\n\nHei ${customerName},\n\n${body}${action}`
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replaceAll("`", "&#096;")
}
