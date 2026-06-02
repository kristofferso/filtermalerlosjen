export type GalleryItemCenter = {
  id: string
  center: number
}

export function getCenteredGalleryItemId(
  items: Array<GalleryItemCenter>,
  viewportCenter: number
) {
  if (items.length === 0) return null

  return items.reduce((closest, item) => {
    const closestDistance = Math.abs(closest.center - viewportCenter)
    const itemDistance = Math.abs(item.center - viewportCenter)

    return itemDistance < closestDistance ? item : closest
  }).id
}

export function getNextCenteredGalleryItemId(
  items: Array<GalleryItemCenter>,
  viewportCenter: number,
  selectedId: string | null
) {
  const centeredId = getCenteredGalleryItemId(items, viewportCenter)

  return centeredId === selectedId ? null : centeredId
}
