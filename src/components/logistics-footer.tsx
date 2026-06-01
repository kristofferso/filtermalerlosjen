import createGlobe from "cobe"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { X } from "lucide-react"
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react"
import { BrandLogo } from "@/components/brand"
import { Button } from "@/components/ui/button"

const OSLO: [number, number] = [59.9139, 10.7522]

type TradeRegion = {
  id: string
  label: string
  country: string
  location: [number, number]
  responsibility: string
}

type NetworkCustomer = {
  id: string
  name: string
}

const TRADE_REGIONS: Array<TradeRegion> = [
  {
    id: "bogota",
    label: "Bogotá",
    country: "Colombia",
    location: [4.711, -74.0721],
    responsibility: "Sjef, søtkorridoren",
  },
  {
    id: "addis-abeba",
    label: "Addis Abeba",
    country: "Etiopia",
    location: [8.9806, 38.7578],
    responsibility: "Konsul, opprinnelseslandet",
  },
  {
    id: "nairobi",
    label: "Nairobi",
    country: "Kenya",
    location: [-1.2921, 36.8219],
    responsibility: "Syresjef, Østafrika",
  },
  {
    id: "sao-paulo",
    label: "São Paulo",
    country: "Brasil",
    location: [-23.5558, -46.6396],
    responsibility: "Volumsjef, Brasilkanalen",
  },
  {
    id: "guatemala-city",
    label: "Guatemala by",
    country: "Guatemala",
    location: [14.6349, -90.5069],
    responsibility: "Distriktssjef, vulkankorridoren",
  },
  {
    id: "san-jose",
    label: "San José",
    country: "Costa Rica",
    location: [9.9281, -84.0907],
    responsibility: "Sjef, honningprotokollen",
  },
  {
    id: "quito",
    label: "Quito",
    country: "Ecuador",
    location: [-0.1807, -78.4678],
    responsibility: "Inspektør, mineralavdelingen",
  },
  {
    id: "lima",
    label: "Lima",
    country: "Peru",
    location: [-12.0464, -77.0428],
    responsibility: "Skyggesjef, Andes-sør",
  },
  {
    id: "kigali",
    label: "Kigali",
    country: "Rwanda",
    location: [-1.9441, 30.0619],
    responsibility: "Renhetsinspektør, høylandet",
  },
  {
    id: "bujumbura",
    label: "Bujumbura",
    country: "Burundi",
    location: [-3.3614, 29.3599],
    responsibility: "Sjef, bærprotokollen",
  },
  {
    id: "kampala",
    label: "Kampala",
    country: "Uganda",
    location: [0.3476, 32.5825],
    responsibility: "Tollsjef, robusta-grensen",
  },
  {
    id: "dar-es-salaam",
    label: "Dar-es-Salaam",
    country: "Tanzania",
    location: [-6.7924, 39.2083],
    responsibility: "Sjef, kystkanalen",
  },
  {
    id: "hanoi",
    label: "Hanoi",
    country: "Vietnam",
    location: [21.0278, 105.8342],
    responsibility: "Mellomledd, regnkorridoren",
  },
  {
    id: "jakarta",
    label: "Jakarta",
    country: "Indonesia",
    location: [-6.2088, 106.8456],
    responsibility: "Forhandler, krydderlinjen",
  },
  {
    id: "medan",
    label: "Medan",
    country: "Sumatra",
    location: [3.5952, 98.6722],
    responsibility: "Tungvektsattaché",
  },
  {
    id: "port-moresby",
    label: "Port Moresby",
    country: "Papua Ny-Guinea",
    location: [-9.4438, 147.1803],
    responsibility: "Spesialagent, jungelkanalen",
  },
  {
    id: "sanaa",
    label: "Sana'a",
    country: "Jemen",
    location: [15.3694, 44.191],
    responsibility: "Konservator, mokka-arkivet",
  },
  {
    id: "kingston",
    label: "Kingston",
    country: "Jamaica",
    location: [17.9712, -76.7936],
    responsibility: "Spesialagent, Blue Mountain",
  },
  {
    id: "havana",
    label: "Havana",
    country: "Cuba",
    location: [23.1136, -82.3666],
    responsibility: "Mellommann, Karibia",
  },
  {
    id: "mexico-city",
    label: "Mexico by",
    country: "Mexico",
    location: [19.4326, -99.1332],
    responsibility: "Sjef, kanelkorridoren",
  },
  {
    id: "san-salvador",
    label: "San Salvador",
    country: "El Salvador",
    location: [13.6929, -89.2182],
    responsibility: "Bourbon-attaché",
  },
  {
    id: "tegucigalpa",
    label: "Tegucigalpa",
    country: "Honduras",
    location: [14.0723, -87.1921],
    responsibility: "Karamellsjef, fjellsiden",
  },
  {
    id: "panama-city",
    label: "Panama by",
    country: "Panama",
    location: [8.9824, -79.5199],
    responsibility: "VIP-fixer, Geisha",
  },
]

export function LogisticsFooter({
  customers = [],
}: {
  customers?: Array<NetworkCustomer>
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <footer className="mt-10 border-t border-(--ledger-line) py-6">
        <button
          className="group mx-auto flex w-full max-w-xl items-center justify-center gap-3 text-muted-foreground transition-colors duration-1000 hover:text-foreground"
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Åpne logistikknettverk"
        >
          <HoverTranslation
            align="right"
            original="Fabae peregrinantur"
            translation="bønnene reiser"
          />
          <BrandLogo
            className="size-6 opacity-80 transition-opacity duration-1000 group-hover:opacity-100"
            white
          />
          <HoverTranslation
            original="Nos non peregrinantur"
            translation="vi reiser ikke"
          />
        </button>
      </footer>

      {open ? (
        <LogisticsNetwork
          customers={customers}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  )
}

function HoverTranslation({
  original,
  translation,
  align = "left",
}: {
  original: string
  translation: string
  align?: "left" | "right"
}) {
  return (
    <span
      className={`relative block min-w-0 flex-1 font-mono text-[0.65rem] tracking-[0.18em] uppercase ${align === "right" ? "text-right" : "text-left"
        }`}
    >
      <span className="transition-opacity duration-300 group-hover:opacity-0">
        {original}
      </span>
      <span className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-500">
        {translation}
      </span>
    </span>
  )
}

function LogisticsNetwork({
  customers,
  onClose,
}: {
  customers: Array<NetworkCustomer>
  onClose: () => void
}) {
  const [visible, setVisible] = useState(false)
  const assignments = useMemo(
    () =>
      customers.map((customer, index) => ({
        customer,
        region: TRADE_REGIONS[index % TRADE_REGIONS.length],
      })),
    [customers]
  )
  const [selectedRegion, setSelectedRegion] = useState<TradeRegion | null>(null)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const requestClose = useCallback(() => {
    setVisible(false)
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    closeTimeoutRef.current = setTimeout(onClose, 700)
  }, [onClose])

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 0)

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") requestClose()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      clearTimeout(timer)
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [requestClose])

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto bg-background/90 text-foreground backdrop-blur-md transition-[opacity,filter,backdrop-filter] duration-700 ${visible ? "blur-0 opacity-100" : "opacity-0 blur-md"
        }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logistics-network-title"
    >
      <div
        className={`mx-auto flex min-h-svh w-full max-w-6xl flex-col px-4 py-5 transition-[opacity,filter] duration-700 sm:px-6 lg:px-8 ${visible ? "blur-0 opacity-100" : "opacity-0 blur-lg"
          }`}
      >
        <header className="flex items-start justify-end gap-4 py-4">
          <Button
            variant="outline"
            type="button"
            onClick={requestClose}
            aria-label="Lukk logistikknettverk"
          >
            <X />
          </Button>
        </header>

        <div className="flex flex-1 flex-col gap-7 py-6">
          <section className="mx-auto max-w-3xl text-center">
            <h2
              id="logistics-network-title"
              className="mt-2 font-serif text-4xl font-normal tracking-tight sm:text-5xl"
            >
              Losjenettverk
            </h2>
            <p className="mt-3 text-lg leading-7 text-muted-foreground">
              Vi er en lokal losje med globale forbindelser. Nettverket vårt
              strekker seg over alle kontinenter for å forsyne våre medlemmer
              med de beste råvarene uten å måtte forholde seg til
              dysfunksjonelle markeder.
            </p>
          </section>

          <section className="relative grid min-h-88 place-items-center overflow-hidden sm:min-h-136">
            <div className="absolute inset-x-0 top-1/2 h-px bg-[linear-gradient(90deg,transparent,oklch(0.74_0.06_86/0.14),transparent)]" />
            <div className="absolute top-1/2 left-1/2 size-[min(82vw,34rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,oklch(0.3_0.025_92/0.18),transparent_68%)]" />
            {selectedRegion ? (
              <button
                className="absolute top-3 right-3 z-20 grid size-10 place-items-center rounded-full border border-border bg-background/80 font-mono text-lg text-muted-foreground backdrop-blur transition-colors hover:bg-muted hover:text-foreground"
                type="button"
                onClick={() => setSelectedRegion(null)}
                aria-label="Frigi rotasjon"
                title="Frigi rotasjon"
              >
                ↻
              </button>
            ) : null}
            <GlobeCanvas focusLocation={selectedRegion?.location ?? null} />
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <h3 className="font-mono text-sm tracking-normal text-muted-foreground uppercase">
                Losjens handelsforbindelser
              </h3>
            </div>
            {assignments.length > 0 ? (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {assignments.map(({ customer, region }, index) => {
                  const selected = selectedRegion?.id === region.id
                  return (
                    <li key={customer.id}>
                      <button
                        className={`relative h-full min-h-40 w-full overflow-hidden rounded-md border p-4 text-left transition-colors ${selected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-muted/25 hover:bg-muted/40"
                          }`}
                        type="button"
                        onClick={() => setSelectedRegion(region)}
                      >
                        <span className="flex items-center gap-3">
                          <span className="relative grid size-14 shrink-0 place-items-center rounded-md border border-border bg-background text-foreground">
                            <span className="font-mono text-sm font-semibold">
                              {getInitials(customer.name)}
                            </span>
                            <span className="absolute -right-1.5 -bottom-1.5 rounded-sm border border-border bg-card px-1.5 py-0.5 font-serif text-sm leading-none text-muted-foreground">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                          </span>
                          <span className="min-w-0">
                            <span className="block font-mono text-[0.68rem] tracking-[0.16em] text-muted-foreground uppercase">
                              Region {region.label}
                            </span>
                            <span className="mt-0.5 block truncate font-serif text-[1.55rem] leading-7 tracking-tight">
                              {customer.name}
                            </span>
                          </span>
                        </span>

                        <span className="mt-4 block border-t border-border pt-3">
                          <span className="block font-mono text-[0.68rem] tracking-[0.16em] text-muted-foreground uppercase">
                            Korrespondent {region.country}
                          </span>

                          <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                            Ansvar: {region.responsibility}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mt-4 rounded-md border border-border bg-muted/25 p-3 text-sm text-muted-foreground">
                Ingen regionansvarlige er innført i kartoteket ennå.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function GlobeCanvas({
  focusLocation,
}: {
  focusLocation: [number, number] | null
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null)
  const phiRef = useRef(0)
  const thetaRef = useRef(0.18)
  const draggingRef = useRef(false)
  const pointerRef = useRef({ x: 0, y: 0 })
  const targetRotationRef = useRef<{ phi: number; theta: number } | null>(null)

  useEffect(() => {
    targetRotationRef.current = focusLocation
      ? getFocusRotation(focusLocation)
      : null
  }, [focusLocation])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || typeof window.WebGLRenderingContext === "undefined") return

    const width = canvas.offsetWidth || 900
    const globe = createGlobe(canvas, {
      devicePixelRatio: Math.min(
        window.devicePixelRatio || 1,
        window.innerWidth < 640 ? 1.8 : 2
      ),
      width,
      height: width,
      phi: phiRef.current,
      theta: thetaRef.current,
      dark: 1,
      diffuse: 1.45,
      mapSamples: 32000,
      mapBrightness: 1,
      mapBaseBrightness: 0.06,
      baseColor: [0.92, 0.86, 0.68],
      markerColor: [1, 0.82, 0.42],
      glowColor: [0.18, 0.15, 0.1],
      arcColor: [1, 0.72, 0.32],
      arcWidth: 0.22,
      arcHeight: 0.22,
      markerElevation: 0.02,
      scale: 1,
      markers: [
        {
          id: "oslo-hq",
          location: OSLO,
          size: 0.09,
          color: [0.98, 0.93, 0.78],
        },
        ...TRADE_REGIONS.map((region) => ({
          id: region.id,
          location: region.location,
          size: 0.045,
        })),
      ],
      arcs: TRADE_REGIONS.map((region) => ({
        from: region.location,
        to: OSLO,
      })),
      opacity: 0.9,
    })
    globeRef.current = globe

    let animationFrame = 0
    function animate() {
      const target = targetRotationRef.current
      if (target && !draggingRef.current) {
        phiRef.current += shortestAngle(target.phi - phiRef.current) * 0.08
        thetaRef.current += (target.theta - thetaRef.current) * 0.08
      } else if (!draggingRef.current) {
        phiRef.current += 0.0009
      }

      globe.update({ phi: phiRef.current, theta: thetaRef.current })
      animationFrame = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(animationFrame)
      globe.destroy()
      globeRef.current = null
    }
  }, [])

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    draggingRef.current = true
    pointerRef.current = { x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!draggingRef.current) return

    const deltaX = event.clientX - pointerRef.current.x
    const deltaY = event.clientY - pointerRef.current.y
    pointerRef.current = { x: event.clientX, y: event.clientY }

    phiRef.current += deltaX * 0.006
    thetaRef.current = Math.max(
      -0.7,
      Math.min(0.7, thetaRef.current + deltaY * 0.004)
    )
    globeRef.current?.update({ phi: phiRef.current, theta: thetaRef.current })
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    draggingRef.current = false
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <div className="relative z-10 size-[min(86vw,36rem)]">
      <canvas
        ref={canvasRef}
        className="size-full cursor-grab touch-none opacity-100 select-none active:cursor-grabbing"
        aria-label="Dotted globe showing coffee logistics routes to Oslo"
        onPointerCancel={handlePointerUp}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      <GlobeMarkerLabel id="oslo-hq" label="Losjen" />
      {TRADE_REGIONS.map((region) => (
        <GlobeMarkerLabel
          id={region.id}
          key={region.id}
          label={region.country}
        />
      ))}
    </div>
  )
}

function GlobeMarkerLabel({ id, label }: { id: string; label: string }) {
  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-2 rounded-sm border border-border bg-background/85 px-2 py-1 font-mono text-[0.58rem] tracking-[0.14em] text-muted-foreground uppercase opacity-[var(--marker-visible)] backdrop-blur-sm transition-[opacity,filter,transform] duration-200"
      style={
        {
          positionAnchor: `--cobe-${id}`,
          bottom: "anchor(top)",
          left: "anchor(center)",
          "--marker-visible": `var(--cobe-visible-${id}, 0)`,
          filter: `blur(calc((1 - var(--cobe-visible-${id}, 0)) * 4px))`,
        } as CSSProperties
      }
    >
      {label}
    </div>
  )
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("nb-NO"))
    .join("")
}

export function getFocusRotation([latitude, longitude]: [number, number]) {
  return {
    phi: ((90 - longitude) * Math.PI) / 180,
    theta: Math.max(-0.7, Math.min(0.7, (-latitude * Math.PI) / 180)),
  }
}

function shortestAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle))
}
