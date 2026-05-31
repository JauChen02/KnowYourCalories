"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowRightIcon, CheckCircle2Icon, FlameIcon } from "lucide-react";

import type { DashboardData } from "@/lib/dashboard";
import { CaloriesTrendChart } from "@/components/app/calories-trend-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

function formatCalories(value: number) {
  return `${new Intl.NumberFormat("en-US").format(Math.abs(value))} cal`;
}

function getStateBadgeVariant(state: "under" | "near" | "over") {
  if (state === "over") {
    return "outline";
  }

  if (state === "near") {
    return "secondary";
  }

  return "default";
}

function getStateLabel(state: "under" | "near" | "over") {
  if (state === "over") {
    return "Over target";
  }

  if (state === "near") {
    return "Near target";
  }

  return "Under target";
}

export function DashboardTrendsPanel({
  chartData,
  dayEntries,
}: {
  chartData: DashboardData["chartData"];
  dayEntries: DashboardData["dayEntries"];
}) {
  const [selectedDateKey, setSelectedDateKey] = useState(
    chartData.at(-1)?.dateKey ?? dayEntries.at(-1)?.dateKey ?? ""
  );

  const selectedDay =
    dayEntries.find((day) => day.dateKey === selectedDateKey) ?? dayEntries.at(-1);

  return (
    <div className="flex flex-col gap-4">
      <Card className="glass-card border border-white/50 shadow-lg">
        <CardHeader>
          <CardTitle>Last 7 days</CardTitle>
          <CardDescription>
            Each bar uses final saved calories, with the target line changing when your goal changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <CaloriesTrendChart
            data={chartData}
            onSelectDate={setSelectedDateKey}
            selectedDateKey={selectedDay?.dateKey ?? selectedDateKey}
          />
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-background/70 p-3 text-sm text-muted-foreground">
              Green bars mean you stayed comfortably under target.
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-3 text-sm text-muted-foreground">
              Amber bars mean you landed close to the target line.
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-3 text-sm text-muted-foreground">
              Red bars mean you finished clearly over target.
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border border-white/50 shadow-lg">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-2">
              <CardTitle>
                {selectedDay ? `Entries for ${selectedDay.displayLabel}` : "Day details"}
              </CardTitle>
              <CardDescription>
                Tap a bar to switch days and inspect the meals behind that total.
              </CardDescription>
            </div>
            {selectedDay ? (
              <Badge variant={getStateBadgeVariant(selectedDay.state)}>
                {getStateLabel(selectedDay.state)}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {selectedDay ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                  <div className="text-sm text-muted-foreground">Final calories</div>
                  <div className="text-xl font-semibold">
                    {formatCalories(selectedDay.consumed)}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                  <div className="text-sm text-muted-foreground">Target for that day</div>
                  <div className="text-xl font-semibold">
                    {formatCalories(selectedDay.target)}
                  </div>
                </div>
              </div>

              {selectedDay.entries.length ? (
                <div className="flex flex-col gap-3">
                  {selectedDay.entries.map((entry) => (
                    <Card className="border border-border/70 bg-background/70" key={entry.id}>
                      <CardContent className="flex flex-col gap-3 pt-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-col gap-1">
                            <div className="font-medium">{entry.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {entry.mealType.charAt(0).toUpperCase() + entry.mealType.slice(1)} |{" "}
                              {entry.loggedAtLabel}
                            </div>
                          </div>
                          <Badge variant="secondary">
                            {formatCalories(entry.totalCalories)}
                          </Badge>
                        </div>
                        {entry.imageUrl ? (
                          <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/80">
                            <Image
                              alt={entry.title}
                              className="h-36 w-full object-cover"
                              height={288}
                              src={entry.imageUrl}
                              width={288}
                            />
                          </div>
                        ) : null}
                        <Link href={`/verify/${entry.id}`}>
                          <Button className="min-h-12 w-full" size="lg" type="button" variant="outline">
                            Review this meal
                            <ArrowRightIcon data-icon="inline-end" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Empty className="border border-dashed border-border/70 bg-background/60 p-4">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <CheckCircle2Icon />
                    </EmptyMedia>
                    <EmptyTitle>No meals logged that day</EmptyTitle>
                    <EmptyDescription>
                      The day total is zero because there are no saved entries using final calories for that date.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    Add a meal photo or manual meal entry to fill this day in.
                  </EmptyContent>
                </Empty>
              )}
            </>
          ) : (
            <Empty className="border border-dashed border-border/70 bg-background/60 p-4">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FlameIcon />
                </EmptyMedia>
                <EmptyTitle>No chart data yet</EmptyTitle>
                <EmptyDescription>
                  Your seven-day calorie summary will appear here once entries are saved.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
