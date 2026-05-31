import { redirect } from "next/navigation";

import { SetupState } from "@/components/app/setup-state";
import { SignInScreen } from "@/components/app/sign-in-screen";
import { getAuthenticatedAppDestination, getCurrentSession } from "@/lib/access";
import { appSetup } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
}) {
  if (!appSetup.databaseReady || !appSetup.authReady) {
    return <SetupState />;
  }

  const session = await getCurrentSession();

  if (session?.user?.id) {
    redirect(await getAuthenticatedAppDestination(session.user.id));
  }

  const { callbackUrl } = await searchParams;

  return <SignInScreen callbackUrl={callbackUrl || "/"} />;
}
