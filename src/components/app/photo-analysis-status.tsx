"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  Loader2Icon,
  NotebookPenIcon,
} from "lucide-react";
import { toast } from "sonner";

import { analyzePendingPhotoEntryAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PhotoAnalysisStatus({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<"loading" | "failed" | "complete">("loading");
  const [message, setMessage] = useState(
    "We saved your photo and started working on it."
  );

  useEffect(() => {
    startTransition(async () => {
      const result = await analyzePendingPhotoEntryAction({ entryId });

      if (result.ok) {
        setState("complete");
        setMessage(result.message);
        toast.success(result.message);
        router.push(`/verify/${entryId}`);
        router.refresh();
        return;
      }

      setState("failed");
      setMessage(result.message);
      toast.error(result.message);
    });
  }, [entryId, router]);

  if (state === "loading" || pending) {
    return (
      <Card className="glass-card border border-white/50 shadow-xl">
        <CardHeader className="gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <Loader2Icon className="animate-spin" />
          </div>
          <div className="brand-wordmark text-primary">KnowYourCalories</div>
          <CardTitle>Analyzing your meal photo</CardTitle>
          <CardDescription>
            Your photo is already saved. We&apos;re checking it now.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This can take a moment. Please keep this screen open.
        </CardContent>
      </Card>
    );
  }

  if (state === "complete") {
    return (
      <Card className="glass-card border border-white/50 shadow-xl">
        <CardHeader className="gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/80 text-accent-foreground">
            <CheckCircle2Icon />
          </div>
          <CardTitle>Photo ready</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="glass-card border border-white/50 shadow-xl">
      <CardHeader className="gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/12 text-destructive">
          <AlertCircleIcon />
        </div>
        <div className="brand-wordmark text-primary">KnowYourCalories</div>
        <CardTitle>We kept your photo safe</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="rounded-2xl border border-border/70 bg-background/70 p-3 text-sm text-muted-foreground">
          Your pending entry is still stored in Postgres. No calories or correction history are lost just because AI analysis failed.
        </div>
        <Link href={`/verify/${entryId}`}>
          <Button className="min-h-12 w-full" size="lg" type="button" variant="outline">
            <NotebookPenIcon data-icon="inline-start" />
            Open this entry now
          </Button>
        </Link>
        <Link href="/history">
          <Button className="min-h-12 w-full" size="lg" type="button">
            <NotebookPenIcon data-icon="inline-start" />
            Open History
          </Button>
        </Link>
        <Link href="/upload">
          <Button className="min-h-12 w-full" size="lg" type="button" variant="outline">
            Try another photo
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
