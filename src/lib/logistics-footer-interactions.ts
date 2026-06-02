export type FooterInteractionState = {
  translated: boolean
  open: boolean
}

export type FooterInteraction = "click" | "doubleClick"

export function getFooterInteractionState(
  state: FooterInteractionState,
  interaction: FooterInteraction
): FooterInteractionState {
  if (interaction === "doubleClick") {
    return { translated: true, open: true }
  }

  return { ...state, translated: true }
}
