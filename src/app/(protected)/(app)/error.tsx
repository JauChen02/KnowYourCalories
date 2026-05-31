"use client";

import { AppErrorState } from "@/components/app/app-error-state";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppErrorState
      description="KnowYourCalories could not load this protected screen right now."
      onRetry={reset}
      title="Screen unavailable"
    />
  );
}
