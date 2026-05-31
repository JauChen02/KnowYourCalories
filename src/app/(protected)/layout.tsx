import { redirect } from "next/navigation";

import { SetupState } from "@/components/app/setup-state";
import { getRequiredSession } from "@/lib/access";
import { appSetup } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!appSetup.databaseReady || !appSetup.authReady) {
    return <SetupState />;
  }

  const session = await getRequiredSession();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  return <>{children}</>;
}
