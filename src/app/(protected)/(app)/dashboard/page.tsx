import { DashboardView } from "@/components/app/dashboard-view";
import { getDashboardData } from "@/lib/dashboard";
import { getRequiredSession } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getRequiredSession();
  const dashboard = await getDashboardData(session!.user.id);

  return <DashboardView dashboard={dashboard} />;
}
