import { redirect } from "next/navigation";
import { SparklesIcon } from "lucide-react";

import { AppNav } from "@/components/app/app-nav";
import { InstallAppButton } from "@/components/app/install-app-button";
import { SignOutButton } from "@/components/app/auth-controls";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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

  const fallbackName =
    session.user.name?.split(" ").map((part) => part[0]).join("").slice(0, 2) ?? "KY";

  return (
    <div className="safe-px safe-pt flex min-h-screen flex-col">
      <div className="app-shell flex flex-1 flex-col gap-4 xl:grid xl:grid-cols-[22rem_minmax(0,1fr)] xl:items-start">
        <Card className="glass-card overflow-hidden border border-white/60 shadow-xl xl:sticky xl:top-4">
          <CardHeader className="gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="size-12">
                  <AvatarImage
                    alt={session.user.name ?? "User avatar"}
                    src={session.user.image ?? undefined}
                  />
                  <AvatarFallback>{fallbackName}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                  <Badge className="w-fit" variant="secondary">
                    KnowYourCalories account
                  </Badge>
                  <div className="brand-wordmark text-primary">KnowYourCalories</div>
                  <CardTitle className="text-2xl">
                    Welcome back, {session.user.name?.split(" ")[0] ?? "there"}
                  </CardTitle>
                </div>
              </div>
              <div className="hidden sm:flex sm:flex-col sm:items-end sm:gap-2">
                <InstallAppButton />
                <SignOutButton />
              </div>
            </div>
            <CardDescription className="max-w-sm text-sm/relaxed">
              Google sign-in now protects your dashboard, uploads, history, settings,
              and authenticated APIs while keeping account data in Postgres.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-3 sm:hidden">
            <InstallAppButton />
            <SignOutButton />
          </CardFooter>
        </Card>

        <div className="page-panel min-w-0 p-4 md:p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <SparklesIcon className="size-4 text-primary" />
            KnowYourCalories app
          </div>
          {children}
        </div>
      </div>
      <AppNav />
    </div>
  );
}
