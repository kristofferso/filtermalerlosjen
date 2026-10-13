import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Circle,
  Mail,
  RefreshCw,
  Repeat,
  Send,
} from "lucide-react"
import { createFileRoute } from "@tanstack/react-router"
import { AdminAccessNotice, AdminHeader } from "./admin"
import type { RoundDispatchKind } from "@/lib/round-dispatch"
import { Button } from "@/components/ui/button"
import {
  getEmailAdminData,
  previewRoundDispatch,
  sendBroadcastEmail,
  sendRoundDispatch,
  sendTemplateTestEmail,
} from "@/server/email-admin"
import {
  ROUND_DISPATCH_KINDS,
  ROUND_DISPATCH_META,
  isRoundDispatchAvailable,
} from "@/lib/round-dispatch"

export const Route = createFileRoute("/admin/epost")({
  loader: () => getEmailAdminData(),
  component: AdminEmailPage,
})

type EmailData = Extract<
  Awaited<ReturnType<typeof getEmailAdminData>>,
  { unlocked: true }
>
type Template = EmailData["templates"][number]
type Member = EmailData["members"][number]
type RoundOption = EmailData["rounds"][number]
type SendResult = Awaited<ReturnType<typeof sendBroadcastEmail>>
type SendStatus =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "done"; result: SendResult }
  | { kind: "error"; message: string }

function AdminEmailPage() {
  const data = Route.useLoaderData()

  return (
    <main className="min-h-svh px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <AdminHeader />
        {!data.unlocked ? <AdminAccessNotice /> : null}
        {data.unlocked ? <EmailAdminView data={data} /> : null}
      </div>
    </main>
  )
}

function EmailAdminView({ data }: { data: EmailData }) {
  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-(--ledger-line) bg-card p-4 sm:p-5">
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Utsending
        </p>
        <h2 className="mt-1 text-xl tracking-tight">E-post</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Send testeposter av gjeldende maler, repliser utsendelser fra en
          runde, og send enkeltmeldinger til medlemmer.
        </p>
      </section>

      <DeliveryStatusCard delivery={data.delivery} baseUrl={data.baseUrl} />
      <TemplatesSection
        templates={data.templates}
        adminEmail={data.adminEmail}
      />
      <RoundDispatchSection rounds={data.rounds} adminEmail={data.adminEmail} />
      <BroadcastSection members={data.members} />
    </div>
  )
}

function DeliveryStatusCard({
  delivery,
  baseUrl,
}: {
  delivery: EmailData["delivery"]
  baseUrl: string
}) {
  const linksPointToLocalhost = /\/\/(localhost|127\.0\.0\.1)\b/.test(baseUrl)

  return (
    <section className="rounded-lg border border-(--ledger-line) bg-card">
      <div className="border-b border-border p-4 sm:p-5">
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Konfigurasjon
        </p>
        <h2 className="mt-1 text-lg">Utsending og whitelist</h2>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        {delivery.deliveryConfigured ? (
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill active label="E-post konfigurert" />
            {delivery.from ? (
              <span className="font-mono text-xs text-muted-foreground">
                Fra: {delivery.from}
              </span>
            ) : null}
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>
              E-post er ikke konfigurert (mangler{" "}
              <code className="font-mono">RESEND_API_KEY</code> eller{" "}
              <code className="font-mono">NOTIFICATION_FROM</code>). Utsending
              blir hoppet over.
            </p>
          </div>
        )}

        <div className="rounded-md border border-border bg-muted/30 p-3">
          <p className="font-mono text-[0.62rem] tracking-[0.14em] text-muted-foreground uppercase">
            Lenker i e-post (APP_URL)
          </p>
          <p className="mt-2 font-mono text-sm break-all">{baseUrl}</p>
          {linksPointToLocalhost ? (
            <p className="mt-2 flex items-start gap-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              Lenkene til statussiden peker til localhost og vil ikke virke for
              medlemmene. Sett <code className="font-mono">APP_URL</code> til
              den offentlige adressen.
            </p>
          ) : null}
        </div>

        <div className="rounded-md border border-border bg-muted/30 p-3">
          <p className="font-mono text-[0.62rem] tracking-[0.14em] text-muted-foreground uppercase">
            Whitelist (NOTIFICATION_RECIPIENT_WHITELIST)
          </p>
          {delivery.whitelist.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Ingen whitelist satt. Ekte e-post sendes til alle mottakere.
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              <p className="text-sm text-muted-foreground">
                Kun disse adressene mottar e-post. Alle andre mottakere blir
                omdirigert til den første adressen i listen.
              </p>
              <ul className="flex flex-wrap gap-2">
                {delivery.whitelist.map((address, index) => (
                  <li
                    key={address}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 font-mono text-xs"
                  >
                    {index === 0 ? (
                      <span className="rounded bg-foreground px-1 text-[0.6rem] text-background">
                        primær
                      </span>
                    ) : null}
                    {address}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function TemplatesSection({
  templates,
  adminEmail,
}: {
  templates: Array<Template>
  adminEmail: string
}) {
  const [activeId, setActiveId] = useState(templates[0]?.id ?? "")
  const activeTemplate =
    templates.find((template) => template.id === activeId) ?? templates[0]

  return (
    <section className="rounded-lg border border-(--ledger-line) bg-card">
      <div className="flex items-center justify-between gap-4 border-b border-border p-4 sm:p-5">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Maler
          </p>
          <h2 className="mt-1 text-lg">Gjeldende e-postmaler</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Velg en mal for å forhåndsvise. Send en test til deg selv.
          </p>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {templates.length} maler
        </span>
      </div>
      {templates.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground sm:p-5">
          Ingen maler tilgjengelig.
        </p>
      ) : (
        <>
          <div
            className="flex flex-wrap gap-2 border-b border-border p-4 sm:p-5"
            role="tablist"
            aria-label="E-postmaler"
          >
            {templates.map((template) => {
              const isActive = template.id === activeTemplate.id
              return (
                <Button
                  key={template.id}
                  type="button"
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveId(template.id)}
                >
                  {template.label}
                </Button>
              )
            })}
          </div>
          <TemplateRow
            key={activeTemplate.id}
            template={activeTemplate}
            defaultTo={adminEmail}
          />
        </>
      )}
    </section>
  )
}

function TemplateRow({
  template,
  defaultTo,
}: {
  template: Template
  defaultTo: string
}) {
  const [to, setTo] = useState(defaultTo)
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "sending" }
    | { kind: "sent"; skipped: boolean }
    | { kind: "error"; message: string }
  >({ kind: "idle" })

  async function handleSend() {
    setStatus({ kind: "sending" })
    try {
      const result = await sendTemplateTestEmail({
        data: { templateId: template.id, to },
      })
      setStatus({ kind: "sent", skipped: result.skipped })
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Ukjent feil",
      })
    }
  }

  return (
    <article className="p-4 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
        <div className="min-w-0 space-y-3">
          <div>
            <h3 className="text-base font-semibold">{template.label}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {template.description}
            </p>
          </div>
          <details className="group rounded-lg border border-border bg-muted/20">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 text-sm font-medium">
              <span>Maldetaljer</span>
              <ChevronDown
                className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="space-y-3 border-t border-border p-3">
              <div>
                <p className="font-mono text-[0.62rem] tracking-[0.14em] text-muted-foreground uppercase">
                  Emne
                </p>
                <p className="mt-1 text-sm font-medium">{template.subject}</p>
              </div>
              <div>
                <p className="font-mono text-[0.62rem] tracking-[0.14em] text-muted-foreground uppercase">
                  Flettefelt
                </p>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {template.mergeFields.map((field) => (
                    <li
                      key={field.label}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs"
                    >
                      <span className="font-medium">{field.label}</span>
                      <span className="font-mono text-muted-foreground">
                        {field.example}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </details>
          <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/30 p-3">
            <label className="min-w-48 flex-1 space-y-1">
              <span className="text-sm font-medium">Send test til</span>
              <input
                className="h-9 w-full rounded-md border border-input px-3 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
                type="email"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                placeholder="deg@example.com"
              />
            </label>
            <Button
              type="button"
              onClick={handleSend}
              loading={status.kind === "sending"}
              disabled={!to.trim()}
            >
              <Send className="size-4" aria-hidden="true" />
              Send test
            </Button>
          </div>
          <TestSendFeedback status={status} />
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <iframe
            title={`Forhåndsvisning: ${template.label}`}
            srcDoc={template.html}
            sandbox=""
            className="h-80 w-full"
          />
        </div>
      </div>
    </article>
  )
}

function TestSendFeedback({
  status,
}: {
  status:
    | { kind: "idle" }
    | { kind: "sending" }
    | { kind: "sent"; skipped: boolean }
    | { kind: "error"; message: string }
}) {
  if (status.kind === "idle" || status.kind === "sending") return null

  if (status.kind === "error") {
    return (
      <p className="text-sm text-destructive">
        Feil ved sending: {status.message}
      </p>
    )
  }

  if (status.skipped) {
    return (
      <p className="text-sm text-muted-foreground">
        E-post er ikke konfigurert, så sendingen ble hoppet over.
      </p>
    )
  }

  return <p className="text-sm text-foreground">Test sendt.</p>
}

const ROUND_STATUS_LABELS: Record<RoundOption["status"], string> = {
  draft: "Utkast",
  open: "Åpen",
  closed: "Stengt",
  ready: "Klar for henting",
}

function formatRoundOption(round: RoundOption) {
  const date = round.openedAt
    ? new Intl.DateTimeFormat("nb-NO", {
        dateStyle: "medium",
        timeZone: "Europe/Oslo",
      }).format(new Date(round.openedAt))
    : "uten dato"
  return `${round.supplierName} · åpnet ${date} · ${ROUND_STATUS_LABELS[round.status]} · ${round.orderCount} bestillinger`
}

// The step the round most recently passed is the dispatch most likely to
// need a replay.
function latestAvailableKind(round: RoundOption | undefined) {
  if (!round) return ROUND_DISPATCH_KINDS[0]
  return (
    ROUND_DISPATCH_KINDS.filter((kind) =>
      isRoundDispatchAvailable(kind, round.status)
    ).at(-1) ?? ROUND_DISPATCH_KINDS[0]
  )
}

type DispatchPreview = Awaited<ReturnType<typeof previewRoundDispatch>>

function RoundDispatchSection({
  rounds,
  adminEmail,
}: {
  rounds: Array<RoundOption>
  adminEmail: string
}) {
  const [roundId, setRoundId] = useState(rounds[0]?.id ?? "")
  const round = rounds.find((entry) => entry.id === roundId)
  const [kind, setKind] = useState<RoundDispatchKind>(() =>
    latestAvailableKind(rounds[0])
  )
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [preview, setPreview] = useState<
    | { kind: "loading" }
    | { kind: "ready"; data: DispatchPreview }
    | { kind: "error"; message: string }
  >({ kind: "loading" })
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<"test" | "live">("test")
  const [testTo, setTestTo] = useState(adminEmail)
  const [status, setStatus] = useState<SendStatus>({ kind: "idle" })
  const requestId = useRef(0)

  const isRoundOpened = kind === "round-opened"
  const content = isRoundOpened
    ? { subject: subject.trim() || null, body: body.trim() || null }
    : { subject: null, body: null }

  async function loadPreview() {
    if (!round) return
    const id = ++requestId.current
    setPreview({ kind: "loading" })
    setStatus({ kind: "idle" })
    try {
      const data = await previewRoundDispatch({
        data: { roundId: round.id, kind, ...content },
      })
      if (id !== requestId.current) return
      setPreview({ kind: "ready", data })
      setSelectedKeys(new Set(data.recipients.map((entry) => entry.key)))
    } catch (error) {
      if (id !== requestId.current) return
      setPreview({
        kind: "error",
        message: error instanceof Error ? error.message : "Ukjent feil",
      })
    }
  }

  useEffect(() => {
    void loadPreview()
    // Subject/body edits refresh on demand, not on every keystroke.
  }, [roundId, kind])

  function changeRound(nextRoundId: string) {
    setRoundId(nextRoundId)
    setKind(
      latestAvailableKind(rounds.find((entry) => entry.id === nextRoundId))
    )
  }

  function toggle(key: string) {
    setSelectedKeys((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const recipients = preview.kind === "ready" ? preview.data.recipients : []
  const selectedCount = recipients.filter((entry) =>
    selectedKeys.has(entry.key)
  ).length
  const canSend =
    round !== undefined &&
    preview.kind === "ready" &&
    selectedCount > 0 &&
    (mode === "live" || testTo.trim().length > 0)

  async function handleSend() {
    if (!round) return
    if (
      mode === "live" &&
      !window.confirm(
        `Sende «${ROUND_DISPATCH_META[kind].label}» på nytt til ${selectedCount} ${selectedCount === 1 ? "medlem" : "medlemmer"}?`
      )
    )
      return

    setStatus({ kind: "sending" })
    try {
      const result = await sendRoundDispatch({
        data: {
          roundId: round.id,
          kind,
          ...content,
          recipientKeys: recipients
            .filter((entry) => selectedKeys.has(entry.key))
            .map((entry) => entry.key),
          testTo: mode === "test" ? testTo.trim() : null,
        },
      })
      setStatus({ kind: "done", result })
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Ukjent feil",
      })
    }
  }

  return (
    <section className="rounded-lg border border-(--ledger-line) bg-card">
      <div className="border-b border-border p-4 sm:p-5">
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Repliser
        </p>
        <h2 className="mt-1 text-lg">Send en utsending på nytt</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Bygger e-postene fra en runde på nytt med dagens maler og data. Send
          dem til deg selv først, og deretter til medlemmene.
        </p>
      </div>

      {rounds.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground sm:p-5">
          Ingen runder å replisere ennå.
        </p>
      ) : (
        <div className="space-y-4 p-4 sm:p-5">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Runde</span>
            <select
              className="h-9 w-full rounded-md border border-input bg-card px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
              value={roundId}
              onChange={(event) => changeRound(event.target.value)}
            >
              {rounds.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {formatRoundOption(entry)}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-1">
            <span className="text-sm font-medium">Utsending</span>
            <div
              className="flex flex-wrap gap-2"
              role="tablist"
              aria-label="Utsending"
            >
              {ROUND_DISPATCH_KINDS.map((entry) => {
                const isActive = entry === kind
                return (
                  <Button
                    key={entry}
                    type="button"
                    size="sm"
                    variant={isActive ? "default" : "outline"}
                    role="tab"
                    aria-selected={isActive}
                    disabled={
                      !round || !isRoundDispatchAvailable(entry, round.status)
                    }
                    onClick={() => setKind(entry)}
                  >
                    {ROUND_DISPATCH_META[entry].label}
                  </Button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Mottakere: {ROUND_DISPATCH_META[kind].recipients}.
            </p>
          </div>

          {isRoundOpened ? (
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
              <label className="block space-y-1">
                <span className="text-sm font-medium">Emne</span>
                <input
                  className="h-9 w-full rounded-md border border-input px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Tomt gir standardemnet"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium">Melding</span>
                <textarea
                  className="min-h-32 w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Tomt gir standardteksten. Markdown og {{navn}} støttes."
                />
              </label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void loadPreview()}
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                Oppdater forhåndsvisning
              </Button>
            </div>
          ) : null}

          {preview.kind === "loading" ? (
            <p className="text-sm text-muted-foreground">Henter mottakere …</p>
          ) : null}
          {preview.kind === "error" ? (
            <p className="text-sm text-destructive">
              Kunne ikke bygge utsendingen: {preview.message}
            </p>
          ) : null}

          {preview.kind === "ready" ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
              <div className="min-w-0 space-y-4">
                <div className="rounded-lg border border-border">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
                    <p className="text-sm font-medium">
                      Mottakere{" "}
                      <span className="font-mono text-muted-foreground">
                        {selectedCount}/{recipients.length}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        variant="outline"
                        size="xs"
                        type="button"
                        onClick={() =>
                          setSelectedKeys(
                            new Set(recipients.map((entry) => entry.key))
                          )
                        }
                      >
                        Velg alle
                      </Button>
                      <Button
                        variant="outline"
                        size="xs"
                        type="button"
                        onClick={() => setSelectedKeys(new Set())}
                      >
                        Fjern alle
                      </Button>
                    </div>
                  </div>
                  {recipients.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">
                      Ingen mottakere med e-post for denne utsendingen.
                    </p>
                  ) : (
                    <ul className="max-h-72 divide-y divide-border overflow-y-auto">
                      {recipients.map((entry) => (
                        <li key={entry.key}>
                          <label className="flex cursor-pointer items-center gap-3 p-3 hover:bg-muted/40">
                            <input
                              type="checkbox"
                              checked={selectedKeys.has(entry.key)}
                              onChange={() => toggle(entry.key)}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">
                                {entry.name}
                              </span>
                              <span className="block truncate font-mono text-xs text-muted-foreground">
                                {entry.email}
                              </span>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <fieldset className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                  <legend className="px-1 text-sm font-medium">Send til</legend>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name="dispatch-mode"
                      className="mt-1"
                      checked={mode === "test"}
                      onChange={() => setMode("test")}
                    />
                    <span>
                      Meg (test) – alle valgte e-poster sendes til én adresse,
                      med original mottaker nederst.
                    </span>
                  </label>
                  {mode === "test" ? (
                    <input
                      className="h-9 w-full rounded-md border border-input px-3 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
                      type="email"
                      value={testTo}
                      onChange={(event) => setTestTo(event.target.value)}
                      placeholder="deg@example.com"
                    />
                  ) : null}
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name="dispatch-mode"
                      className="mt-1"
                      checked={mode === "live"}
                      onChange={() => setMode("live")}
                    />
                    <span>Medlemmene – ekte utsending på nytt.</span>
                  </label>
                </fieldset>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    {selectedCount}{" "}
                    {selectedCount === 1 ? "e-post" : "e-poster"}
                    {mode === "test" ? ` til ${testTo.trim() || "…"}` : ""}.
                  </p>
                  <Button
                    type="button"
                    onClick={handleSend}
                    loading={status.kind === "sending"}
                    disabled={!canSend}
                  >
                    <Repeat className="size-4" aria-hidden="true" />
                    {mode === "test"
                      ? "Send test"
                      : `Send til ${selectedCount}`}
                  </Button>
                </div>

                <SendResultFeedback status={status} />
              </div>

              {preview.data.preview ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Emne: </span>
                    <span className="font-medium">
                      {preview.data.preview.subject}
                    </span>
                  </p>
                  <div className="overflow-hidden rounded-lg border border-border bg-white">
                    <iframe
                      title={`Forhåndsvisning til ${preview.data.preview.to}`}
                      srcDoc={preview.data.preview.html}
                      sandbox=""
                      className="h-96 w-full"
                    />
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">
                    Viser e-posten til {preview.data.preview.to}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}

function BroadcastSection({ members }: { members: Array<Member> }) {
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () =>
      new Set(
        members
          .filter((member) => member.isActive && hasEmail(member))
          .map((member) => member.id)
      )
  )
  const [status, setStatus] = useState<SendStatus>({ kind: "idle" })

  const selectedCount = selectedIds.size
  const canSend =
    subject.trim().length > 0 && body.trim().length > 0 && selectedCount > 0

  const emailMemberCount = useMemo(
    () => members.filter((member) => hasEmail(member)).length,
    [members]
  )
  const activeEmailCount = useMemo(
    () =>
      members.filter((member) => member.isActive && hasEmail(member)).length,
    [members]
  )

  function toggle(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelectedIds(
      new Set(
        members.filter((member) => hasEmail(member)).map((member) => member.id)
      )
    )
  }

  function selectNone() {
    setSelectedIds(new Set())
  }

  function selectActive() {
    setSelectedIds(
      new Set(
        members
          .filter((member) => member.isActive && hasEmail(member))
          .map((member) => member.id)
      )
    )
  }

  async function handleSend() {
    setStatus({ kind: "sending" })
    try {
      const result = await sendBroadcastEmail({
        data: {
          subject,
          body,
          customerIds: Array.from(selectedIds),
        },
      })
      setStatus({ kind: "done", result })
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Ukjent feil",
      })
    }
  }

  return (
    <section className="rounded-lg border border-(--ledger-line) bg-card">
      <div className="flex items-center justify-between gap-4 border-b border-border p-4 sm:p-5">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Enkeltmelding
          </p>
          <h2 className="mt-1 text-lg">Send til medlemmer</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Skriv en engangsmelding og velg hvem den skal til.
          </p>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {emailMemberCount} av {members.length} med e-post
        </span>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Emne</span>
          <input
            className="h-9 w-full rounded-md border border-input px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="F.eks. Ny runde åpner på mandag"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Melding</span>
          <textarea
            className="min-h-40 w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={
              "Hei {{navn}},\n\nSkriv meldingen her. Markdown støttes."
            }
          />
          <span className="text-xs text-muted-foreground">
            Markdown støttes. Bruk{" "}
            <code className="font-mono">{"{{navn}}"}</code> for å flette inn
            mottakerens navn.
          </span>
        </label>

        <div className="rounded-lg border border-border">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
            <p className="text-sm font-medium">
              Mottakere{" "}
              <span className="font-mono text-muted-foreground">
                {selectedCount}/{emailMemberCount}
              </span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Button
                variant="outline"
                size="xs"
                type="button"
                onClick={selectAll}
              >
                Velg alle
              </Button>
              <Button
                variant="outline"
                size="xs"
                type="button"
                onClick={selectActive}
                disabled={activeEmailCount === 0}
              >
                Kun aktive
              </Button>
              <Button
                variant="outline"
                size="xs"
                type="button"
                onClick={selectNone}
              >
                Fjern alle
              </Button>
            </div>
          </div>
          {members.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">
              Ingen registrerte medlemmer.
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-border overflow-y-auto">
              {members.map((member) => {
                const memberHasEmail = hasEmail(member)
                const checked = selectedIds.has(member.id)
                return (
                  <li key={member.id}>
                    <label
                      className={`flex items-center gap-3 p-3 ${
                        memberHasEmail
                          ? "cursor-pointer hover:bg-muted/40"
                          : "cursor-not-allowed"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!memberHasEmail}
                        onChange={() => toggle(member.id)}
                      />
                      <span
                        className={`min-w-0 flex-1 ${memberHasEmail ? "" : "opacity-60"}`}
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-medium">
                            {member.name}
                          </span>
                          {member.role === "admin" ? (
                            <span className="rounded border border-border px-1 font-mono text-[0.6rem] tracking-wide text-muted-foreground uppercase">
                              Admin
                            </span>
                          ) : null}
                          {!member.isActive ? (
                            <span className="rounded border border-border px-1 font-mono text-[0.6rem] tracking-wide text-muted-foreground uppercase">
                              Inaktiv
                            </span>
                          ) : null}
                          {!memberHasEmail ? (
                            <span className="rounded border border-destructive/40 px-1 font-mono text-[0.6rem] tracking-wide text-destructive uppercase">
                              Mangler e-post
                            </span>
                          ) : null}
                        </span>
                        <span className="block truncate font-mono text-xs text-muted-foreground">
                          {memberHasEmail
                            ? member.email
                            : "Ingen e-post registrert"}
                        </span>
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Sender til {selectedCount}{" "}
            {selectedCount === 1 ? "mottaker" : "mottakere"}.
          </p>
          <Button
            type="button"
            onClick={handleSend}
            loading={status.kind === "sending"}
            disabled={!canSend}
          >
            <Mail className="size-4" aria-hidden="true" />
            Send til {selectedCount}
          </Button>
        </div>

        <SendResultFeedback status={status} />
      </div>
    </section>
  )
}

function SendResultFeedback({ status }: { status: SendStatus }) {
  if (status.kind === "idle" || status.kind === "sending") return null

  if (status.kind === "error") {
    return (
      <p className="text-sm text-destructive">
        Feil ved sending: {status.message}
      </p>
    )
  }

  const { result } = status

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="rounded-md border border-border bg-card px-2 py-1 font-mono">
          {result.sentCount} sendt
        </span>
        {result.skippedCount > 0 ? (
          <span className="rounded-md border border-border bg-card px-2 py-1 font-mono">
            {result.skippedCount} hoppet over
          </span>
        ) : null}
        {result.failedCount > 0 ? (
          <span className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 font-mono text-destructive">
            {result.failedCount} feilet
          </span>
        ) : null}
      </div>
      {result.skippedCount > 0 && result.sentCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ingenting ble sendt – e-post er sannsynligvis ikke konfigurert.
        </p>
      ) : null}
      <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card text-sm">
        {result.results.map((entry) => (
          <li
            key={entry.id}
            className="flex items-center justify-between gap-3 px-3 py-2"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">{entry.name}</span>
              <span className="block truncate font-mono text-xs text-muted-foreground">
                {entry.email}
              </span>
            </span>
            <StatusPill
              active={entry.status === "sent"}
              label={
                entry.status === "sent"
                  ? "Sendt"
                  : entry.status === "skipped"
                    ? "Hoppet over"
                    : "Feilet"
              }
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

function hasEmail(member: Member) {
  return member.email.trim().length > 0
}

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs ${active ? "border-(--ledger-ink) text-foreground" : "border-border text-muted-foreground"}`}
    >
      {active ? <Check className="size-3" /> : <Circle className="size-3" />}
      {label}
    </span>
  )
}
