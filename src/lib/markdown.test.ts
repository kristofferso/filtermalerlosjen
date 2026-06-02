import { describe, expect, it } from "vitest"
import { markdownToSafeHtml } from "./markdown"

describe("markdownToSafeHtml", () => {
  it("renders pickup instructions with line breaks, lists, emphasis, and links", () => {
    const html = markdownToSafeHtml([
      "Hentes hos **Kristoffer**",
      "",
      "- Tirsdag 18:00-20:00",
      "- Adresse: [Kart](https://maps.example.com/?q=kaffe)",
    ].join("\n"))

    expect(html).toContain("<strong>Kristoffer</strong>")
    expect(html).toContain("<ul>")
    expect(html).toContain("<li>Tirsdag 18:00-20:00</li>")
    expect(html).toContain(
      '<a href="https://maps.example.com/?q=kaffe" target="_blank" rel="noreferrer">Kart</a>'
    )
  })

  it("escapes unsafe html and rejects javascript links", () => {
    const html = markdownToSafeHtml(
      "<script>alert(1)</script> [farlig](javascript:alert(1))"
    )

    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;")
    expect(html).not.toContain("<script>")
    expect(html).not.toContain("javascript:")
  })
})
