import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { RootDocument } from "./__root"

vi.mock("@tanstack/react-router", () => ({
  createRootRoute: (config: unknown) => config,
  HeadContent: () => null,
  Scripts: () => null,
}))

vi.mock("@tanstack/react-devtools", () => ({
  TanStackDevtools: () => null,
}))

vi.mock("@tanstack/react-router-devtools", () => ({
  TanStackRouterDevtoolsPanel: () => null,
}))

describe("RootDocument", () => {
  it("adds shared bottom spacing around all route content", () => {
    const markup = renderToStaticMarkup(
      <RootDocument>
        <main>Innhold</main>
      </RootDocument>
    )

    expect(markup).toContain("pb-12")
    expect(markup).toContain("sm:pb-16")
    expect(markup).toContain("Innhold")
  })
})
