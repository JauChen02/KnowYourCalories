import { AlertCircleIcon, NotebookPenIcon } from "lucide-react";

import { HistoryEntryGroups } from "@/components/app/history-entry-groups";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMealHistory } from "@/lib/dashboard";
import { getRequiredSession } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const session = await getRequiredSession();
  const entries = await getMealHistory(session!.user.id, 30);

  return (
    <div className="flex flex-col gap-4">
      <Alert>
        <AlertCircleIcon />
        <AlertTitle>Your saved history stays durable</AlertTitle>
        <AlertDescription>
          Pending and failed photo analyses remain saved here so refreshes, app closes,
          or navigation do not wipe out your calorie data.
        </AlertDescription>
      </Alert>

      <Card className="glass-card border border-white/50 shadow-lg">
        <CardHeader>
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <NotebookPenIcon />
          </div>
          <CardTitle>Meal history</CardTitle>
          <CardDescription>
            Review your recent entries, final calorie totals, item edits, and follow-ups.
          </CardDescription>
        </CardHeader>
      </Card>

      <HistoryEntryGroups entries={entries} />
    </div>
  );
}
