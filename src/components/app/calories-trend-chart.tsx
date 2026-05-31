"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  consumed: {
    label: "Final calories",
    color: "var(--chart-1)",
  },
  target: {
    label: "Target",
    color: "var(--chart-4)",
  },
  under: {
    label: "Under target",
    color: "var(--chart-2)",
  },
  near: {
    label: "Near target",
    color: "var(--chart-3)",
  },
  over: {
    label: "Over target",
    color: "var(--chart-5)",
  },
};

function getBarColor(state: "under" | "near" | "over") {
  if (state === "over") {
    return "var(--color-over)";
  }

  if (state === "near") {
    return "var(--color-near)";
  }

  return "var(--color-under)";
}

export function CaloriesTrendChart({
  data,
  onSelectDate,
  selectedDateKey,
}: {
  data: Array<{
    dateKey: string;
    label: string;
    displayLabel: string;
    consumed: number;
    target: number;
    state: "under" | "near" | "over";
  }>;
  onSelectDate: (dateKey: string) => void;
  selectedDateKey: string;
}) {
  return (
    <ChartContainer className="h-64 w-full" config={chartConfig}>
      <BarChart
        accessibilityLayer
        data={data}
        margin={{ left: -12, right: 8, top: 8 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="label"
          tickLine={false}
          tickMargin={8}
        />
        <YAxis
          axisLine={false}
          tickFormatter={(value) => `${Math.round(Number(value) / 100) * 100}`}
          tickLine={false}
          width={42}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name, item) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span>
                    {name === "consumed"
                      ? "Final calories"
                      : name === "target"
                        ? "Target"
                        : "Value"}
                  </span>
                  <span>
                    {typeof value === "number" ? value.toLocaleString() : value} cal
                  </span>
                  {item?.payload?.dateKey === selectedDateKey ? (
                    <span className="text-muted-foreground">Selected</span>
                  ) : null}
                </div>
              )}
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.displayLabel ?? payload?.[0]?.payload?.dateKey ?? ""
              }
            />
          }
        />
        <Line
          dataKey="target"
          dot={false}
          isAnimationActive={false}
          stroke="var(--color-target)"
          strokeDasharray="6 4"
          strokeWidth={2}
          type="stepAfter"
        />
        <Bar
          dataKey="consumed"
          isAnimationActive={false}
          onClick={(_, index) => {
            const point = data[index];

            if (point) {
              onSelectDate(point.dateKey);
            }
          }}
          radius={[12, 12, 6, 6]}
        >
          {data.map((point) => (
            <Cell
              cursor="pointer"
              fill={getBarColor(point.state)}
              key={point.dateKey}
              opacity={point.dateKey === selectedDateKey ? 1 : 0.78}
              stroke={point.dateKey === selectedDateKey ? "var(--color-target)" : "transparent"}
              strokeWidth={point.dateKey === selectedDateKey ? 2 : 0}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
