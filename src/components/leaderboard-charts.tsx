import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
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
        <div className="rounded-lg border border-(--ledger-line) bg-card p-4 sm:p-5">
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
                tickFormatter={(value: string) =>
                  value.length > 14 ? `${value.slice(0, 14)}…` : value
                }
              />
              <ChartTooltip
                content={<ChartTooltipContent formatter={gramsFormatter} />}
              />
              <Bar dataKey="grams" fill="var(--color-grams)" radius={4} />
            </BarChart>
          </ChartContainer>
        </div>
      ) : null}

      {hasCoffees ? (
        <div className="rounded-lg border border-(--ledger-line) bg-card p-4 sm:p-5">
          <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Populære sorter
          </p>
          <h3 className="mt-1 mb-4 text-sm font-semibold">
            Gram per kaffesort
          </h3>
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
                tickFormatter={(value: string) =>
                  value.length > 14 ? `${value.slice(0, 14)}…` : value
                }
              />
              <ChartTooltip
                content={<ChartTooltipContent formatter={gramsFormatter} />}
              />
              <Bar dataKey="grams" fill="var(--color-grams)" radius={4} />
            </BarChart>
          </ChartContainer>
        </div>
      ) : null}
    </section>
  )
}
