import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AppLoadingState({
  title = "Loading KnowYourCalories",
}: {
  title?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="glass-card border border-white/50 shadow-lg">
        <CardHeader className="gap-3">
          <Skeleton className="h-4 w-36 rounded-full" />
          <Skeleton className="h-8 w-60" />
          <Skeleton className="h-4 w-full max-w-sm" />
        </CardHeader>
      </Card>

      <div className="page-panel p-4 md:p-5">
        <div className="mb-4 text-sm font-medium text-muted-foreground">{title}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-28 rounded-3xl" />
          <Skeleton className="h-28 rounded-3xl" />
          <Skeleton className="h-28 rounded-3xl" />
          <Skeleton className="h-28 rounded-3xl" />
        </div>
        <Card className="mt-4 border border-white/50 bg-background/70 shadow-lg">
          <CardContent className="flex flex-col gap-3 p-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-40 rounded-3xl" />
            <Skeleton className="h-12 rounded-2xl" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
