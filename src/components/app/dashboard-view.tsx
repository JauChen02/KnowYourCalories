import {
  ActivityIcon,
  AlertCircleIcon,
  FlameIcon,
} from "lucide-react";

import type { DashboardData } from "@/lib/dashboard";
import { appSetup } from "@/lib/env";
import { DashboardTrendsPanel } from "@/components/app/dashboard-trends-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

function formatCalories(value: number) {
  return `${new Intl.NumberFormat("en-US").format(Math.abs(value))} cal`;
}

function getToneClassName(state: DashboardData["todayState"]) {
  if (state === "over") return "bg-destructive/12 text-destructive";
  if (state === "near") return "bg-primary/12 text-primary";
  return "bg-accent/80 text-accent-foreground";
}

function getGoalProgressCopy(dashboard: DashboardData) {
  if (dashboard.currentGoalType === "bulking") {
    if (dashboard.calorieDelta > 0) {
      return { label: "Surplus needed", value: formatCalories(dashboard.calorieDelta) };
    }
    return { label: "Surplus achieved", value: formatCalories(Math.abs(dashboard.calorieDelta)) };
  }

  if (dashboard.calorieDelta < 0) {
    return { label: "Remaining", value: `Over by ${formatCalories(dashboard.calorieDelta)}` };
  }

  return { label: "Remaining", value: formatCalories(dashboard.calorieDelta) };
}

export function DashboardView({ dashboard }: { dashboard: DashboardData }) {
  const goalProgress = getGoalProgressCopy(dashboard);
  const toneClass = getToneClassName(dashboard.todayState);

  return (
    <div className="flex flex-col gap-3">
      {!appSetup.blobReady ? (
        <Alert>
          <AlertCircleIcon />
          <AlertTitle>Photo uploads need setup</AlertTitle>
          <AlertDescription>
            Add <code>BLOB_READ_WRITE_TOKEN</code> to enable photo uploads.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Compact today summary */}
      <Card className={`border border-white/50 ${toneClass}`}>
        <CardContent className="flex items-center justify-between gap-3 py-3 px-4">
          <div className="flex items-center gap-2">
            <FlameIcon className="size-4 shrink-0" />
            <span className="text-sm font-semibold">{formatCalories(dashboard.todayCalories)}</span>
            <span className="text-xs opacity-70">/ {formatCalories(dashboard.targetCalories)}</span>
          </div>
          <div className="flex items-center gap-2">
            <ActivityIcon className="size-4 shrink-0 opacity-70" />
            <span className="text-xs font-medium">{goalProgress.value} {goalProgress.label.toLowerCase()}</span>
            <Badge className="ml-1" variant={dashboard.todayState === "over" ? "outline" : "secondary"}>
              {dashboard.todayState === "over" ? "Over" : dashboard.todayState === "near" ? "Near" : "On track"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Chart + day breakdown */}
      <DashboardTrendsPanel chartData={dashboard.chartData} dayEntries={dashboard.dayEntries} />
    </div>
  );
}
