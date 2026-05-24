export const EIGHT_DIGIT_PHONE_PATTERN = /^\d{8}$/

export function isEightDigitPhoneNumber(value: string) {
  return EIGHT_DIGIT_PHONE_PATTERN.test(value)
}
