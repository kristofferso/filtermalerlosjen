import { BRAND_NAME } from "@/components/brand"
import { markdownToSafeHtml } from "@/lib/markdown"

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

export function buildOrderPageUrl(baseUrl: string) {
  return `${baseUrl.replace(/\/+$/, "")}/`
}

export function buildLogoUrl(baseUrl: string) {
  return `${baseUrl.replace(/\/+$/, "")}/filtermalerlosjen-logo.png`
}

function formatRoundCloseDate(value: Date | string | null | undefined) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return null
  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date)
}

export function buildRoundOpenedEmail({
  to,
  customerName,
  orderPageUrl,
  logoUrl,
  supplierName,
  closesAt,
}: {
  to: string
  customerName: string
  orderPageUrl: string
  logoUrl?: string | null
  supplierName?: string | null
  closesAt?: Date | string | null
}): NotificationEmail {
  const supplier = supplierName?.trim()
  const closeDate = formatRoundCloseDate(closesAt)
  const actionLabel = "Legg inn bestilling"

  const introBody =
    "Tiden er inne. Enten du allerede er tom for kaffe, eller sitter på et berg med bønner du vurderer å flippe på Finn for litt kjappe penger — en ny innkjøpsrunde er i gang."
  const detailSentences = [
    supplier ? `Vi handler fra ${supplier} denne runden.` : null,
    closeDate ? `Runden stenger ${closeDate}.` : null,
  ].filter((sentence): sentence is string => sentence !== null)
  const detailBody = detailSentences.join(" ")

  const paragraphs = [introBody, detailBody].filter(Boolean)

  const html = `<!doctype html>
<html lang="no">
  <body style="margin:0;background:#ffffff;color:#000000;font-family:Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:32px 0;">
      <p style="margin:0 0 16px;line-height:1.6;color:#000000;">Hei ${escapeHtml(customerName)},</p>
      ${paragraphs
        .map(
          (paragraph) =>
            `<p style="margin:0 0 20px;line-height:1.6;color:#000000;">${escapeHtml(paragraph)}</p>`
        )
        .join("\n      ")}
      <p style="margin:0 0 32px;">
        <a href="${escapeAttribute(orderPageUrl)}" style="display:inline-block;background:#000000;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;">${escapeHtml(actionLabel)}</a>
      </p>
      <div style="border-top:1px solid #000000;padding-top:16px;">
        <p style="margin:0 0 10px;line-height:1.4;color:#000000;">${escapeHtml(BRAND_NAME)}</p>
        ${
          logoUrl
            ? `<img src="${escapeAttribute(logoUrl)}" alt="${escapeAttribute(BRAND_NAME)}" width="140" style="display:block;width:140px;max-width:60%;height:auto;" />`
            : ""
        }
      </div>
    </div>
  </body>
</html>`

  const textParagraphs = paragraphs.join("\n\n")
  const text = `Hei ${customerName},\n\n${textParagraphs}\n\n${actionLabel}: ${orderPageUrl}\n\n—\n${BRAND_NAME}`

  return {
    to,
    subject: "Ny kafferunde er åpnet",
    html,
    text,
  }
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
  // Formatting tuned for iOS/macOS one-time-code autofill: the code appears in
  // the subject and as a standalone token right after the keyword "code", and
  // it is the only digit run in the message.
  const html = `<!doctype html>
<html lang="no">
  <body style="margin:0;background:#ffffff;color:#000000;font-family:Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <p style="margin:0 0 18px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#000000;">${escapeHtml(BRAND_NAME)}</p>
      <h1 style="margin:0 0 16px;font-size:28px;line-height:1.15;font-weight:700;color:#000000;">Innloggingskode</h1>
      <p style="margin:0 0 8px;line-height:1.6;color:#000000;">Hei ${escapeHtml(customerName)},</p>
      <p style="margin:0 0 12px;line-height:1.6;color:#000000;">Din innloggingskode (one-time code) er:</p>
      <p style="margin:0 0 16px;font-family:'Courier New',monospace;font-size:34px;font-weight:700;letter-spacing:0.18em;color:#000000;">${escapeHtml(code)}</p>
      <p style="margin:0;line-height:1.6;color:#000000;">Koden er gyldig i ti minutter. Hvis du ikke ba om dette kan du se bort fra denne e-posten.</p>
    </div>
  </body>
</html>`

  const text = `${BRAND_NAME}\n\nInnloggingskode\n\nHei ${customerName},\n\nDin innloggingskode (one-time code) er: ${code}\n\nKoden er gyldig i ti minutter.`

  return {
    to,
    subject: `${code} er innloggingskoden din`,
    html,
    text,
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

export const EMAIL_TEMPLATE_IDS = [
  "round-opened",
  "order-confirmed",
  "payment-ready",
  "pickup-ready",
  "login-code",
] as const

export type EmailTemplateId = (typeof EMAIL_TEMPLATE_IDS)[number]

export type EmailTemplateMergeField = {
  label: string
  example: string
}

export type EmailTemplatePreview = {
  id: EmailTemplateId
  label: string
  description: string
  subject: string
  html: string
  text: string
  mergeFields: Array<EmailTemplateMergeField>
}

const SAMPLE_CUSTOMER_NAME = "Kari Nordmann"
const SAMPLE_LOGIN_CODE = "123456"
const SAMPLE_TOTAL_KR = 349
const SAMPLE_SUPPLIER_NAME = "Solberg & Hansen"
const SAMPLE_CLOSES_AT = "2026-05-12T18:00:00.000Z"

const EMAIL_TEMPLATE_META: Record<
  EmailTemplateId,
  {
    label: string
    description: string
    mergeFields: Array<EmailTemplateMergeField>
  }
> = {
  "round-opened": {
    label: "Ny runde åpnet",
    description:
      "Annonsering til medlemmene om at en ny kafferunde er åpnet for bestilling.",
    mergeFields: [
      { label: "Navn", example: SAMPLE_CUSTOMER_NAME },
      { label: "Leverandør", example: SAMPLE_SUPPLIER_NAME },
      { label: "Stenger", example: "12. mai 2026 kl. 20:00" },
      { label: "Bestillingslenke", example: "/" },
    ],
  },
  "login-code": {
    label: "Innloggingskode",
    description: "Sendes når noen ber om en engangskode for å logge inn.",
    mergeFields: [
      { label: "Navn", example: SAMPLE_CUSTOMER_NAME },
      { label: "Kode", example: SAMPLE_LOGIN_CODE },
    ],
  },
  "order-confirmed": {
    label: "Bestilling mottatt",
    description:
      "Kvittering til kunden rett etter at en bestilling er lagt inn.",
    mergeFields: [
      { label: "Navn", example: SAMPLE_CUSTOMER_NAME },
      { label: "Bestillingslenke", example: "/bestilling/…" },
    ],
  },
  "payment-ready": {
    label: "Oppgjør klart",
    description: "Sendes når runden lukkes og kunden skal betale sin andel.",
    mergeFields: [
      { label: "Navn", example: SAMPLE_CUSTOMER_NAME },
      { label: "Beløp", example: `${SAMPLE_TOTAL_KR} kr` },
      { label: "Bestillingslenke", example: "/bestilling/…" },
    ],
  },
  "pickup-ready": {
    label: "Klar for henting",
    description: "Sendes når kaffen er kommet og kan hentes.",
    mergeFields: [
      { label: "Navn", example: SAMPLE_CUSTOMER_NAME },
      { label: "Betalingsstatus", example: "Betalt / Ikke betalt" },
      { label: "Hentestatus", example: "Hentet / Ikke hentet" },
      { label: "Bestillingslenke", example: "/bestilling/…" },
    ],
  },
}

export function buildTemplateSampleEmail(
  id: EmailTemplateId,
  { to, baseUrl }: { to: string; baseUrl: string }
): NotificationEmail {
  const customerName = SAMPLE_CUSTOMER_NAME
  const orderUrl = buildOrderUrl("eksempel-ordre", baseUrl)

  switch (id) {
    case "round-opened":
      return buildRoundOpenedEmail({
        to,
        customerName,
        orderPageUrl: buildOrderPageUrl(baseUrl),
        logoUrl: buildLogoUrl(baseUrl),
        supplierName: SAMPLE_SUPPLIER_NAME,
        closesAt: SAMPLE_CLOSES_AT,
      })
    case "login-code":
      return buildLoginCodeEmail({ to, code: SAMPLE_LOGIN_CODE, customerName })
    case "order-confirmed":
      return buildNotificationEmail({
        kind: "order-confirmed",
        to,
        customerName,
        orderUrl,
      })
    case "payment-ready":
      return buildNotificationEmail({
        kind: "payment-ready",
        to,
        customerName,
        orderUrl,
        totalKr: SAMPLE_TOTAL_KR,
      })
    case "pickup-ready":
      return buildNotificationEmail({
        kind: "pickup-ready",
        to,
        customerName,
        orderUrl,
        paid: true,
        collected: false,
      })
  }
}

export function buildEmailTemplatePreviews(
  baseUrl: string
): Array<EmailTemplatePreview> {
  return EMAIL_TEMPLATE_IDS.map((id) => {
    const email = buildTemplateSampleEmail(id, {
      to: "test@eksempel.no",
      baseUrl,
    })
    const meta = EMAIL_TEMPLATE_META[id]
    return {
      id,
      label: meta.label,
      description: meta.description,
      subject: email.subject,
      html: email.html,
      text: email.text,
      mergeFields: meta.mergeFields,
    }
  })
}

const BROADCAST_NAME_MERGE_PATTERN = /\{\{\s*(?:navn|name)\s*\}\}/gi

export function applyBroadcastMergeFields(body: string, customerName: string) {
  return body.replace(BROADCAST_NAME_MERGE_PATTERN, customerName)
}

export function buildBroadcastEmail({
  to,
  subject,
  body,
  customerName,
}: {
  to: string
  subject: string
  body: string
  customerName: string
}): NotificationEmail {
  const personalizedBody = applyBroadcastMergeFields(body, customerName)
  const bodyHtml = markdownToSafeHtml(personalizedBody)

  const html = `<!doctype html>
<html lang="no">
  <body style="margin:0;background:#ffffff;color:#000000;font-family:Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <p style="margin:0 0 18px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#000000;">${escapeHtml(BRAND_NAME)}</p>
      <h1 style="margin:0 0 20px;font-size:28px;line-height:1.15;font-weight:700;color:#000000;">${escapeHtml(subject)}</h1>
      <div style="line-height:1.6;color:#000000;">${bodyHtml}</div>
    </div>
  </body>
</html>`

  const text = `${BRAND_NAME}\n\n${subject}\n\n${personalizedBody}`

  return { to, subject, html, text }
}

export type NotificationDeliveryStatus = {
  deliveryConfigured: boolean
  from: string | null
  replyTo: string | null
  whitelist: Array<string>
}

export function getNotificationDeliveryStatus(
  env: NotificationEnv = process.env
): NotificationDeliveryStatus {
  const config = getNotificationConfig(env)
  return {
    deliveryConfigured: config !== null,
    from: config?.from ?? null,
    replyTo: config?.replyTo ?? null,
    whitelist: parseRecipientWhitelist(env.NOTIFICATION_RECIPIENT_WHITELIST),
  }
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

function getNotificationConfig(
  env: NotificationEnv
): NotificationConfig | null {
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
        <a href="${escapeAttribute(orderUrl)}" style="display:inline-block;background:#000000;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;">${escapeHtml(actionLabel)}</a>
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
  actionLabel = "Se bestilling",
}: {
  customerName: string
  title: string
  body: string
  orderUrl: string | null
  actionLabel?: string
}) {
  const action = orderUrl ? `\n\n${actionLabel}: ${orderUrl}` : ""
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
