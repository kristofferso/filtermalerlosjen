const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"])

export function markdownToSafeHtml(markdown: string) {
  const blocks = markdown.replace(/\r\n/g, "\n").split(/\n{2,}/)

  return blocks
    .map((block) => renderBlock(block.trim()))
    .filter(Boolean)
    .join("\n")
}

function renderBlock(block: string) {
  if (!block) return ""

  const lines = block.split("\n")
  if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
    return `<ul>${lines
      .map((line) => `<li>${renderInline(line.replace(/^\s*[-*]\s+/, ""))}</li>`)
      .join("")}</ul>`
  }

  return `<p>${lines.map(renderInline).join("<br />")}</p>`
}

function renderInline(value: string) {
  const escaped = escapeHtml(value)
  const withLinks = escaped.replace(
    /\[([^\]]+)]\(([^)\s]+)\)/g,
    (_match, label: string, href: string) => {
      const safeHref = getSafeHref(href)
      if (!safeHref) return label

      return `<a href="${safeHref}" target="_blank" rel="noreferrer">${label}</a>`
    }
  )

  return withLinks
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
}

function getSafeHref(href: string) {
  try {
    const url = new URL(href)
    if (!SAFE_LINK_PROTOCOLS.has(url.protocol)) return null
    return escapeAttribute(url.toString())
  } catch {
    if (!href.startsWith("/")) return null
    return escapeAttribute(href)
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function escapeAttribute(value: string) {
  return value.replace(/"/g, "&quot;")
}
