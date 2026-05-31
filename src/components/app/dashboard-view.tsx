import {
  ActivityIcon,
  AlertCircleIcon,
  ChartNoAxesCombinedIcon,
  FlameIcon,
  NotebookPenIcon,
  TargetIcon,
} from "lucide-react";

import type { DashboardData } from "@/lib/dashboard";
import { appSetup } from "@/lib/env";
import { CalorieTargetForm } from "@/components/app/calorie-target-form";
import { DashboardTrendsPanel } from "@/components/app/dashboard-trends-panel";
import { EntryComposer } from "@/components/app/entry-composer";
import { MealHistoryList } from "@/components/app/meal-history-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function formatCalories(value: number) {
  return `${new Intl.NumberFormat("en-US").format(Math.abs(value))} cal`;
}

function getToneForState(state: DashboardData["todayState"]) {
  if (state === "over") {
    return "warning" as const;
  }

  if (state === "near") {
    return "default" as const;
  }

  return "positive" as const;
}

function getGoalProgressCopy(dashboard: DashboardData) {
  if (dashboard.currentGoalType === "bulking") {
    if (dashboard.calorieDelta > 0) {
      return {
        label: "Surplus still needed",
        value: formatCalories(dashboard.calorieDelta),
      };
    }

    return {
      label: "Surplus achieved",
      value: formatCalories(Math.abs(dashboard.calorieDelta)),
    };
  }

  if (dashboard.calorieDelta < 0) {
    return {
      label: "Remaining",
      value: `Over by ${formatCalories(dashboard.calorieDelta)}`,
    };
  }

  return {
    label: "Remaining",
    value: formatCalories(dashboard.calorieDelta),
  };
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof FlameIcon;
  label: string;
  value: string;
  tone?: "default" | "positive" | "warning";
}) {
  const toneClassName =
    tone === "positive"
      ? "bg-accent/80 text-accent-foreground"
      : tone === "warning"
        ? "bg-destructive/12 text-destructive"
        : "bg-primary/12 text-primary";

  return (
    <Card className="border border-white/50 bg-background/75" size="sm">
      <CardHeader>
        <div className={`flex size-10 items-center justify-center rounded-2xl ${toneClassName}`}>
          <Icon />
        </div>
        <CardDescription>{label}</CardDescription>
        <CardTitle>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

export function DashboardView({ dashboard }: { dashboard: DashboardData }) {
  const goalProgress = getGoalProgressCopy(dashboard);

  return (
    <div className="flex flex-col gap-4">
      {!appSetup.blobReady ? (
        <Alert>
          <AlertCircleIcon />
          <AlertTitle>Meal photo uploads are almost ready</AlertTitle>
          <AlertDescription>
            Add <code>BLOB_READ_WRITE_TOKEN</code> to enable production image
            uploads to Vercel Blob.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="glass-card border border-white/50 shadow-lg">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-2">
              <Badge className="w-fit" variant="secondary">
                Today&apos;s dashboard
              </Badge>
              <CardTitle>
                {formatCalories(dashboard.todayCalories)} of {formatCalories(dashboard.targetCalories)}
              </CardTitle>
              <CardDescription>
                Today&apos;s summary is based only on saved final meal totals, never raw AI estimates.
              </CardDescription>
            </div>
            <Badge variant={dashboard.todayState === "over" ? "outline" : "secondary"}>
              {dashboard.todayState === "over"
                ? "Over target"
                : dashboard.todayState === "near"
                  ? "Near target"
                  : "Under target"}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={FlameIcon}
          label="Today consumed"
          value={formatCalories(dashboard.todayCalories)}
          tone={getToneForState(dashboard.todayState)}
        />
        <MetricCard
          icon={ActivityIcon}
          label={goalProgress.label}
          value={goalProgress.value}
          tone={getToneForState(dashboard.todayState)}
        />
        <MetricCard
          icon={TargetIcon}
          label="Current target"
          value={formatCalories(dashboard.targetCalories)}
        />
        <MetricCard
          icon={ChartNoAxesCombinedIcon}
          label="Weekly average"
          value={formatCalories(dashboard.weeklyAverageCalories)}
        />
      </section>

      <DashboardTrendsPanel chartData={dashboard.chartData} dayEntries={dashboard.dayEntries} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="glass-card border border-white/50 shadow-lg">
          <CardHeader>
            <CardTitle>Daily target</CardTitle>
            <CardDescription>
              Keep this tuned to your current goal so the dashboard stays meaningful each day.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CalorieTargetForm
              initialGoalType={dashboard.currentGoalType}
              initialTarget={dashboard.targetCalories}
            />
          </CardContent>
        </Card>

        <Card className="glass-card border border-white/50 shadow-lg">
          <CardHeader>
            <CardTitle>Add a meal</CardTitle>
            <CardDescription>
              Every entry is saved to Postgres immediately, with item breakdowns
              and optional photo metadata tied to the same record.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EntryComposer blobReady={appSetup.blobReady} />
          </CardContent>
        </Card>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <NotebookPenIcon className="text-primary" />
          <h2 className="section-title">Recent meals</h2>
        </div>
        <MealHistoryList entries={dashboard.recentEntries} />
      </section>
    </div>
  );
}
