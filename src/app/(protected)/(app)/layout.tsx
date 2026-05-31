import { redirect } from "next/navigation";

import { AppNav } from "@/components/app/app-nav";
import { getActiveCalorieTarget, getRequiredSession } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getRequiredSession();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const activeTarget = await getActiveCalorieTarget(session.user.id);

  if (!activeTarget) {
    redirect("/onboarding");
  }

  const firstName = session.user.name?.split(" ")[0] ?? "there";

  return (
    <div className="safe-px safe-pt flex min-h-screen flex-col">
      <div className="app-shell flex flex-1 flex-col">
        <div className="flex items-center justify-between px-1 pt-3 pb-1">
          <span className="brand-wordmark text-sm text-primary">KnowYourCalories</span>
          <span className="text-sm text-muted-foreground">Hi, {firstName}</span>
        </div>
        <div className="page-panel min-w-0 flex-1 px-0 py-2 md:px-1">
          {children}
        </div>
      </div>
      <AppNav />
    </div>
  );
}
