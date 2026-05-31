import { redirect } from "next/navigation";

import { SetupState } from "@/components/app/setup-state";
import { getAuthenticatedAppDestination, getCurrentSession } from "@/lib/access";
import { appSetup } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!appSetup.databaseReady || !appSetup.authReady) {
    return <SetupState />;
  }

  const session = await getCurrentSession();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  redirect(await getAuthenticatedAppDestination(session.user.id));
}
