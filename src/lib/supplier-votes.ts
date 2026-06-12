export type SupplierBoardInput = {
  suppliers: Array<{ id: string; name: string }>
  coffees: Array<{
    supplierId: string
    imageUrl: string
    priceKr: number
    isActive: boolean
    isDeleted: boolean
  }>
  votes: Array<{
    supplierId: string
    customerId: string
    customerName: string
  }>
  maxImages?: number
}

export type SupplierBoardVoter = {
  customerId: string
  name: string
}

export type SupplierBoardEntry = {
  supplierId: string
  name: string
  imageUrls: Array<string>
  priceRange: { minKr: number; maxKr: number }
  voters: Array<SupplierBoardVoter>
  voteCount: number
}

const DEFAULT_MAX_IMAGES = 4

/**
 * Shapes raw supplier/coffee/vote rows into compact voting-card data. Suppliers
 * without any active, non-deleted coffee are excluded. Sorted by vote count
 * (descending) then supplier name.
 */
export function buildSupplierBoard(
  input: SupplierBoardInput
): Array<SupplierBoardEntry> {
  const maxImages = input.maxImages ?? DEFAULT_MAX_IMAGES

  const votersBySupplier = new Map<string, Array<SupplierBoardVoter>>()
  for (const vote of input.votes) {
    const voters = votersBySupplier.get(vote.supplierId) ?? []
    voters.push({ customerId: vote.customerId, name: vote.customerName })
    votersBySupplier.set(vote.supplierId, voters)
  }

  const entries: Array<SupplierBoardEntry> = []
  for (const supplier of input.suppliers) {
    const activeCoffees = input.coffees.filter(
      (coffee) =>
        coffee.supplierId === supplier.id &&
        coffee.isActive &&
        !coffee.isDeleted
    )
    if (activeCoffees.length === 0) continue

    const prices = activeCoffees.map((coffee) => coffee.priceKr)
    const imageUrls = activeCoffees
      .map((coffee) => coffee.imageUrl)
      .filter((url) => url.trim().length > 0)
      .slice(0, maxImages)

    const voters = votersBySupplier.get(supplier.id) ?? []

    entries.push({
      supplierId: supplier.id,
      name: supplier.name,
      imageUrls,
      priceRange: {
        minKr: Math.min(...prices),
        maxKr: Math.max(...prices),
      },
      voters,
      voteCount: voters.length,
    })
  }

  return entries.sort(
    (a, b) => b.voteCount - a.voteCount || a.name.localeCompare(b.name, "nb-NO")
  )
}
