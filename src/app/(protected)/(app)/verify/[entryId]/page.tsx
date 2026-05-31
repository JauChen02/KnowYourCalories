import { notFound } from "next/navigation";

import { MealVerificationScreen } from "@/components/app/meal-verification-screen";
import { getRequiredSession } from "@/lib/access";
import { getMealVerificationData } from "@/lib/meal-verification";

export const dynamic = "force-dynamic";

export default async function VerifyMealPage({
  params,
}: {
  params: Promise<{
    entryId: string;
  }>;
}) {
  const session = await getRequiredSession();
  const { entryId } = await params;
  const entry = await getMealVerificationData(session!.user.id, entryId);

  if (!entry) {
    notFound();
  }

  return <MealVerificationScreen entry={entry} />;
}
