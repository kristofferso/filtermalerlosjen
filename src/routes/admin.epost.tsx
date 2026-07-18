import { useMemo, useState } from "react"
import { AlertTriangle, Check, Circle, Mail, Send } from "lucide-react"
import { createFileRoute } from "@tanstack/react-router"
import { AdminAccessNotice, AdminHeader } from "./admin"
import { Button } from "@/components/ui/button"
import {
  getEmailAdminData,
  sendBroadcastEmail,
  sendTemplateTestEmail,
} from "@/server/email-admin"

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
          Send testeposter av gjeldende maler, og send enkeltmeldinger til
          medlemmer.
        </p>
      </section>

      <DeliveryStatusCard delivery={data.delivery} />
      <TemplatesSection
        templates={data.templates}
        adminEmail={data.adminEmail}
      />
      <BroadcastSection members={data.members} />
    </div>
  )
}

function DeliveryStatusCard({ delivery }: { delivery: EmailData["delivery"] }) {
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
  return (
    <section className="rounded-lg border border-(--ledger-line) bg-card">
      <div className="flex items-center justify-between gap-4 border-b border-border p-4 sm:p-5">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Maler
          </p>
          <h2 className="mt-1 text-lg">Gjeldende e-postmaler</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Forhåndsvisning med eksempeldata. Send en test til deg selv.
          </p>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {templates.length} maler
        </span>
      </div>
      <div className="divide-y divide-border">
        {templates.map((template) => (
          <TemplateRow
            key={template.id}
            template={template}
            defaultTo={adminEmail}
          />
        ))}
      </div>
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

function BroadcastSection({ members }: { members: Array<Member> }) {
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(members.filter((m) => m.isActive).map((m) => m.id))
  )
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "sending" }
    | {
        kind: "done"
        result: Awaited<ReturnType<typeof sendBroadcastEmail>>
      }
    | { kind: "error"; message: string }
  >({ kind: "idle" })

  const selectedCount = selectedIds.size
  const canSend =
    subject.trim().length > 0 && body.trim().length > 0 && selectedCount > 0

  const activeCount = useMemo(
    () => members.filter((member) => member.isActive).length,
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
    setSelectedIds(new Set(members.map((member) => member.id)))
  }

  function selectNone() {
    setSelectedIds(new Set())
  }

  function selectActive() {
    setSelectedIds(
      new Set(
        members.filter((member) => member.isActive).map((member) => member.id)
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
          {members.length} med e-post
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
                {selectedCount}/{members.length}
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
                disabled={activeCount === 0}
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
              Ingen medlemmer med registrert e-post.
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-border overflow-y-auto">
              {members.map((member) => {
                const checked = selectedIds.has(member.id)
                return (
                  <li key={member.id}>
                    <label className="flex cursor-pointer items-center gap-3 p-3 hover:bg-muted/40">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(member.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
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
                        </span>
                        <span className="block truncate font-mono text-xs text-muted-foreground">
                          {member.email}
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

        <BroadcastFeedback status={status} />
      </div>
    </section>
  )
}

function BroadcastFeedback({
  status,
}: {
  status:
    | { kind: "idle" }
    | { kind: "sending" }
    | { kind: "done"; result: Awaited<ReturnType<typeof sendBroadcastEmail>> }
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
