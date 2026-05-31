import { Settings2Icon } from "lucide-react";

import { SignOutButton } from "@/components/app/auth-controls";
import { CalorieTargetForm } from "@/components/app/calorie-target-form";
import { ImageRetentionForm } from "@/components/app/image-retention-form";
import { InstallAppButton } from "@/components/app/install-app-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getActiveCalorieTarget,
  getRequiredSession,
  getUserImageRetentionPreference,
} from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getRequiredSession();
  const activeTarget = await getActiveCalorieTarget(session!.user.id);
  const retainImagesAfterAnalysis = await getUserImageRetentionPreference(
    session!.user.id
  );
  const fallbackName =
    session?.user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2) ?? "KY";

  return (
    <div className="flex flex-col gap-4">
      <Card className="glass-card border border-white/50 shadow-lg">
        <CardHeader>
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <Settings2Icon />
          </div>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            Update your target history, photo retention preference, and signed-in account settings.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="glass-card border border-white/50 shadow-lg">
        <CardHeader>
          <CardTitle>Google account</CardTitle>
          <CardDescription>
            This is the Google account currently connected to KnowYourCalories.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 p-4">
            <Avatar className="size-12">
              <AvatarImage
                alt={session!.user.name ?? "Signed-in user"}
                src={session!.user.image ?? undefined}
              />
              <AvatarFallback>{fallbackName}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col gap-1">
              <div className="font-medium">
                {session!.user.name ?? "KnowYourCalories user"}
              </div>
              <div className="truncate text-sm text-muted-foreground">
                {session!.user.email}
              </div>
            </div>
          </div>
          <SignOutButton />
        </CardContent>
      </Card>

      <Card className="glass-card border border-white/50 shadow-lg">
        <CardHeader>
          <CardTitle>Daily target</CardTitle>
          <CardDescription>
            Saving here keeps your target history in Postgres with effective dates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CalorieTargetForm
            initialGoalType={activeTarget?.goalType ?? "maintaining"}
            initialTarget={activeTarget?.targetKcal ?? 2000}
            submitLabel="Save changes"
            titleDescription="If you update your daily target again later, KnowYourCalories keeps the new effective date so the dashboard can use the right target history."
          />
        </CardContent>
      </Card>

      <Card className="glass-card border border-white/50 shadow-lg">
        <CardHeader>
          <CardTitle>Meal photo retention</CardTitle>
          <CardDescription>
            Choose whether analyzed meal photos should stay attached to future entries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImageRetentionForm initialValue={retainImagesAfterAnalysis} />
        </CardContent>
      </Card>

      <Card className="glass-card border border-white/50 shadow-lg">
        <CardHeader>
          <CardTitle>Install on Android</CardTitle>
          <CardDescription>
            Use the same KnowYourCalories web app on your Samsung or Android home screen.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <InstallAppButton />
          <p className="text-sm text-muted-foreground">
            Installation stays web-first. Your Vercel app, PWA install, and Android TWA all use the same live product and the same saved calorie data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
