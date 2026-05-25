export const COFFEE_VAT_RATE = 0.15

export function addCoffeeVat(amountKr: number) {
  return Math.ceil(amountKr * (1 + COFFEE_VAT_RATE))
}

export function calculateCoffeeVat(amountKr: number) {
  return addCoffeeVat(amountKr) - amountKr
}
