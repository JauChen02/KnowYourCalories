import Link from "next/link";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  FlameIcon,
  LoaderCircleIcon,
} from "lucide-react";

import { HistoryEntryDeleteButton } from "@/components/app/history-entry-delete-button";
import { toBlobProxyUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

type HistoryEntry = {
  id: string;
  entryDate: string;
  title: string;
  mealType: string;
  status: string;
  loggedAt: Date;
  imageUrl: string | null;
  totalCalories: number;
  confidence: number | null;
};

function formatCalories(value: number) {
  return `${new Intl.NumberFormat("en-US").format(Math.abs(value))} cal`;
}

function formatConfidence(value: number | null) {
  if (value == null) {
    return "Pending";
  }

  return `${value}%`;
}

function getStatusVariant(status: string) {
  if (status === "confirmed") {
    return "default";
  }

  if (status === "pending" || status === "needs_review") {
    return "outline";
  }

  return "secondary";
}

function getStatusCopy(status: string) {
  if (status === "pending") {
    return {
      label: "Pending",
      detail:
        "Saved safely while AI analysis is still running or waiting to finish.",
      icon: LoaderCircleIcon,
    };
  }

  if (status === "needs_review") {
    return {
      label: "Needs review",
      detail:
        "Saved safely, but this entry needs a quick review before you rely on it.",
      icon: AlertCircleIcon,
    };
  }

  return {
    label: status.replace("_", " "),
    detail: "Saved in your calorie history.",
    icon: CheckCircle2Icon,
  };
}

function getMealTypeLabel(mealType: string) {
  return mealType.charAt(0).toUpperCase() + mealType.slice(1);
}

export function HistoryEntryGroups({
  entries,
}: {
  entries: HistoryEntry[];
}) {
  if (!entries.length) {
    return (
      <Card className="glass-card border border-white/50 shadow-lg">
        <CardContent>
          <Empty className="border border-dashed border-border/70 bg-background/60">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FlameIcon />
              </EmptyMedia>
              <EmptyTitle>No food history yet</EmptyTitle>
              <EmptyDescription>
                Saved meals, pending analyses, and reviewed photo entries will all appear here.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              Entries stay persisted in Postgres even if an AI estimate fails or you refresh the app.
            </EmptyContent>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  const groupedEntries = entries.reduce<Map<string, HistoryEntry[]>>((groups, entry) => {
    groups.set(entry.entryDate, [...(groups.get(entry.entryDate) ?? []), entry]);
    return groups;
  }, new Map());

  return (
    <div className="flex flex-col gap-4">
      {Array.from(groupedEntries.entries()).map(([entryDate, dateEntries]) => (
        <Card className="glass-card border border-white/50 shadow-lg" key={entryDate}>
          <CardHeader>
            <CardTitle>{format(parseISO(entryDate), "EEEE, MMM d")}</CardTitle>
            <CardDescription>
              {dateEntries.length} {dateEntries.length === 1 ? "entry" : "entries"} saved for this day.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {dateEntries.map((entry) => {
              const statusCopy = getStatusCopy(entry.status);
              const StatusIcon = statusCopy.icon;

              return (
                <div
                  className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-background/70 p-3"
                  key={entry.id}
                >
                  <div className="flex items-start gap-3">
                    {entry.imageUrl ? (
                      <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/80">
                        <Image
                          alt={entry.title}
                          className="size-20 object-cover"
                          height={80}
                          src={toBlobProxyUrl(entry.imageUrl)!}
                          unoptimized
                          width={80}
                        />
                      </div>
                    ) : (
                      <div className="flex size-20 items-center justify-center rounded-2xl border border-border/70 bg-background/80 text-muted-foreground">
                        <FlameIcon />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{entry.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {getMealTypeLabel(entry.mealType)} | {format(entry.loggedAt, "h:mm a")}
                          </div>
                        </div>
                        <Badge variant={getStatusVariant(entry.status)}>
                          {statusCopy.label}
                        </Badge>
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                          <div className="text-xs text-muted-foreground">Calories</div>
                          <div className="font-semibold">{formatCalories(entry.totalCalories)}</div>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                          <div className="text-xs text-muted-foreground">Confidence</div>
                          <div className="font-semibold">{formatConfidence(entry.confidence)}</div>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                          <div className="text-xs text-muted-foreground">Meal type</div>
                          <div className="font-semibold">{getMealTypeLabel(entry.mealType)}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 rounded-2xl border border-border/70 bg-background/70 p-3 text-sm text-muted-foreground">
                    <StatusIcon className={entry.status === "pending" ? "animate-spin" : ""} />
                    <span>{statusCopy.detail}</span>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Link className="flex-1" href={`/history/${entry.id}`}>
                      <Button className="min-h-12 w-full" size="lg" type="button">
                        Open entry details
                        <ArrowRightIcon data-icon="inline-end" />
                      </Button>
                    </Link>
                    <div className="sm:self-stretch">
                      <HistoryEntryDeleteButton
                        entryId={entry.id}
                        entryTitle={entry.title}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
