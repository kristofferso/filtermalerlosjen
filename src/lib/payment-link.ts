const VIPPS_PHONE_NUMBER_PATTERN = /^47\d{8}$/
const MAX_VIPPS_MESSAGE_LENGTH = 50

export function toVippsOre(amountKr: number) {
  return Math.round(amountKr * 100)
}

export function createVippsMessage(customerName: string, orderId: string) {
  const fallback = orderId.replace(/-/g, "").slice(0, 8)
  const name = customerName.trim() || fallback
  return `Kaffe ${name}`.slice(0, MAX_VIPPS_MESSAGE_LENGTH)
}

export function buildVippsPaymentUrl({
  phoneNumber,
  message,
  amountKr,
}: {
  phoneNumber: string
  message: string
  amountKr: number
}) {
  const normalizedPhoneNumber = phoneNumber.replace(/\s/g, "")
  if (!VIPPS_PHONE_NUMBER_PATTERN.test(normalizedPhoneNumber)) {
    throw new Error(
      "VIPPS_PHONE_NUMBER must use format 47 followed by 8 digits"
    )
  }

  const url = new URL(
    `https://qr.vipps.no/28/2/01/031/${normalizedPhoneNumber}`
  )
  url.searchParams.set("v", "1")
  url.searchParams.set("m", message.slice(0, MAX_VIPPS_MESSAGE_LENGTH))
  url.searchParams.set("a", String(toVippsOre(amountKr)))
  return url.toString().replace(/\+/g, "%20")
}
