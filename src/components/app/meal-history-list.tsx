import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { ArrowRightIcon, FlameIcon, NotebookPenIcon } from "lucide-react";

import { FollowUpForm } from "@/components/app/follow-up-form";
import { toBlobProxyUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";

type MealHistoryEntry = {
  id: string;
  title: string;
  mealType: string;
  status: string;
  loggedAt: Date;
  imageUrl: string | null;
  notes: string | null;
  totalCalories: number;
  estimatedCalories: number | null;
  estimate: {
    totalCalories: number;
  } | null;
  items: Array<{
    id: string;
    name: string;
    portionLabel: string | null;
    estimatedCalories: number | null;
    finalCalories: number;
  }>;
  followUps: Array<{
    id: string;
    role: "user";
    message: string;
  }>;
};

function formatCalories(value: number) {
  return `${new Intl.NumberFormat("en-US").format(Math.abs(value))} cal`;
}

function getMealTypeLabel(mealType: string) {
  return mealType.charAt(0).toUpperCase() + mealType.slice(1);
}

function getStatusVariant(status: string) {
  if (status === "pending") {
    return "outline";
  }

  if (status === "analyzed") {
    return "secondary";
  }

  if (status === "confirmed") {
    return "default";
  }

  if (status === "needs_review") {
    return "outline";
  }

  return "secondary";
}

export function MealHistoryList({
  entries,
  emptyTitle = "Your first meal will land here",
  emptyDescription = "Add a meal to start building a durable calorie history for this account.",
}: {
  entries: MealHistoryEntry[];
  emptyTitle?: string;
  emptyDescription?: string;
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
              <EmptyTitle>{emptyTitle}</EmptyTitle>
              <EmptyDescription>{emptyDescription}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              Entries will include saved totals, item-level edits, follow-ups,
              and optional meal photos.
            </EmptyContent>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry) => (
        <Card className="glass-card border border-white/50 shadow-lg" key={entry.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-2">
                <CardTitle>{entry.title}</CardTitle>
                <CardDescription>
                  {getMealTypeLabel(entry.mealType)} | {format(entry.loggedAt, "EEE, h:mm a")}
                </CardDescription>
              </div>
              <Badge variant={getStatusVariant(entry.status)}>
                {entry.status.replace("_", " ")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {entry.status === "pending" ? (
              <div className="rounded-2xl border border-border/70 bg-background/70 p-3 text-sm text-muted-foreground">
                We saved this photo and started analysis. If the estimate does not finish,
                the entry still stays here safely for you to review later.
              </div>
            ) : null}
            {entry.status === "needs_review" ? (
              <div className="rounded-2xl border border-border/70 bg-background/70 p-3 text-sm text-muted-foreground">
                We saved the AI estimate, but this meal could use a quick review before you rely on it.
              </div>
            ) : null}
            {entry.imageUrl ? (
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/80">
                <Image
                  alt={entry.title}
                  className="h-52 w-full object-cover"
                  height={416}
                  src={toBlobProxyUrl(entry.imageUrl)!}
                  unoptimized
                  width={416}
                />
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                <div className="text-sm text-muted-foreground">Saved total</div>
                <div className="text-xl font-semibold">
                  {formatCalories(entry.totalCalories)}
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                <div className="text-sm text-muted-foreground">Latest estimate</div>
                <div className="text-xl font-semibold">
                  {formatCalories(
                    entry.estimate?.totalCalories ??
                      entry.estimatedCalories ??
                      entry.totalCalories
                  )}
                </div>
              </div>
            </div>

            {entry.notes ? (
              <div className="rounded-2xl border border-border/70 bg-background/70 p-3 text-sm text-muted-foreground">
                {entry.notes}
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              {entry.items.map((item) => (
                <div
                  className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/70 p-3"
                  key={item.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.estimatedCalories != null
                          ? `Estimated ${formatCalories(item.estimatedCalories)}`
                          : "No separate estimate saved"}
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {formatCalories(item.finalCalories)}
                    </Badge>
                  </div>
                  {item.portionLabel ? (
                    <div className="text-sm text-muted-foreground">
                      Current portion: {item.portionLabel}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <Link href={`/verify/${entry.id}`}>
              <Button className="min-h-12 w-full" size="lg" type="button" variant="outline">
                Review and confirm meal
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </Link>

            <Separator />

            <div className="flex flex-col gap-3">
              <div className="font-medium">Follow-ups</div>
              {entry.followUps.length ? (
                <div className="flex flex-col gap-2">
                  {entry.followUps.slice(0, 3).map((note) => (
                    <div
                      className="rounded-2xl border border-border/70 bg-background/70 p-3 text-sm"
                      key={note.id}
                    >
                      <div className="font-medium text-foreground">
                        {note.role === "user" ? "You" : note.role}
                      </div>
                      <div className="mt-1 text-muted-foreground">{note.message}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty className="border border-dashed border-border/70 bg-background/60 p-4">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <NotebookPenIcon />
                    </EmptyMedia>
                    <EmptyTitle>No follow-ups yet</EmptyTitle>
                  </EmptyHeader>
                </Empty>
              )}
              <FollowUpForm entryId={entry.id} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
