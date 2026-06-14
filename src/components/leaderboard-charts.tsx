import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from "recharts"
import type {
  CoffeePopularityPoint,
  GramsPerRoundPoint,
} from "@/lib/leaderboard"
import type { ChartConfig } from "@/components/ui/chart"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { formatGrams } from "@/lib/coffee-units"

const chartConfig = {
  grams: { label: "Gram", color: "var(--chart-1)" },
} satisfies ChartConfig

// Shades of the identity colour: one hue, descending opacity per bar. Kept
// light enough that the dark in-bar value labels stay legible on every bar.
const SHADE_OPACITIES = [1, 0.9, 0.8, 0.72, 0.64]

function shadeOpacity(index: number) {
  return SHADE_OPACITIES[index % SHADE_OPACITIES.length]
}

function truncateLabel(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max)}…` : value
}

function gramsFormatter(value: unknown) {
  return formatGrams(Number(value) || 0)
}

export function LeaderboardCharts({
  charts,
}: {
  charts: {
    gramsPerRound: Array<GramsPerRoundPoint>
    coffeePopularity: Array<CoffeePopularityPoint>
  }
}) {
  const hasRounds = charts.gramsPerRound.some((point) => point.grams > 0)
  const hasCoffees = charts.coffeePopularity.length > 0

  if (!hasRounds && !hasCoffees) return null

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {hasRounds ? (
        <div className="min-w-0 overflow-hidden rounded-lg border border-(--ledger-line) bg-card p-4 sm:p-5">
          <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Volum per runde
          </p>
          <h3 className="mt-1 mb-4 text-sm font-semibold">
            Gram bestilt per runde
          </h3>
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <BarChart
              accessibilityLayer
              data={charts.gramsPerRound}
              margin={{ left: 4, right: 4, top: 4 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={0}
                tick={{ fontSize: 11 }}
                tickFormatter={(value: string) => truncateLabel(value, 10)}
              />
              <ChartTooltip
                content={<ChartTooltipContent formatter={gramsFormatter} />}
              />
              <Bar dataKey="grams" fill="var(--color-grams)" radius={4}>
                {charts.gramsPerRound.map((point, index) => (
                  <Cell key={point.roundId} fillOpacity={shadeOpacity(index)} />
                ))}
                <LabelList
                  dataKey="grams"
                  position="insideTop"
                  offset={8}
                  fill="var(--primary-foreground)"
                  fontSize={11}
                  formatter={gramsFormatter}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      ) : null}

      {hasCoffees ? (
        <div className="min-w-0 overflow-hidden rounded-lg border border-(--ledger-line) bg-card p-4 sm:p-5">
          <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Populære sorter
          </p>
          <h3 className="mt-1 mb-4 text-sm font-semibold">Gram per kaffesort</h3>
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <BarChart
              accessibilityLayer
              layout="vertical"
              data={charts.coffeePopularity}
              margin={{ left: 4, right: 12 }}
            >
              <CartesianGrid horizontal={false} />
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                axisLine={false}
                width={96}
                tick={{ fontSize: 11 }}
                tickFormatter={(value: string) => truncateLabel(value, 12)}
              />
              <ChartTooltip
                content={<ChartTooltipContent formatter={gramsFormatter} />}
              />
              <Bar dataKey="grams" fill="var(--color-grams)" radius={4}>
                {charts.coffeePopularity.map((point, index) => (
                  <Cell key={point.name} fillOpacity={shadeOpacity(index)} />
                ))}
                <LabelList
                  dataKey="grams"
                  position="insideRight"
                  offset={8}
                  fill="var(--primary-foreground)"
                  fontSize={11}
                  formatter={gramsFormatter}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      ) : null}
    </section>
  )
}
