import { redirect } from "next/navigation";
import { TargetIcon } from "lucide-react";

import { CalorieTargetForm } from "@/components/app/calorie-target-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveCalorieTarget, getRequiredSession } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getRequiredSession();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const activeTarget = await getActiveCalorieTarget(session.user.id);

  if (activeTarget) {
    redirect("/dashboard");
  }

  return (
    <main className="safe-px safe-pt safe-pb flex min-h-screen">
      <div className="app-mobile-shell flex w-full flex-col gap-4">
        <Card className="glass-card border border-white/50 shadow-xl">
          <CardHeader className="gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <TargetIcon />
            </div>
            <div className="brand-wordmark text-primary">KnowYourCalories</div>
            <CardTitle>Let&apos;s set your daily target</CardTitle>
            <CardDescription>
              Start with two quick choices: your daily calorie target and the goal
              that best matches what you want right now.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CalorieTargetForm
              initialGoalType="maintaining"
              initialTarget={2000}
              redirectTo="/dashboard"
              submitLabel="Finish setup"
              titleDescription="You can change this later in Settings anytime."
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
