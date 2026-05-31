"use client";

import { AlertCircleIcon, RefreshCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AppErrorState({
  title = "Something went wrong",
  description = "KnowYourCalories hit a temporary issue while loading this view.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry: () => void;
}) {
  return (
    <main className="safe-px safe-pt safe-pb flex min-h-screen">
      <div className="app-mobile-shell flex w-full flex-col gap-4">
        <Card className="glass-card border border-white/50 shadow-xl">
          <CardHeader className="gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/12 text-destructive">
              <AlertCircleIcon />
            </div>
            <div className="brand-wordmark text-primary">KnowYourCalories</div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="min-h-12" onClick={onRetry} size="lg" type="button">
              <RefreshCwIcon data-icon="inline-start" />
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
