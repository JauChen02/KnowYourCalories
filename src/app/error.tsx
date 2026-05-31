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
      description="KnowYourCalories could not load the app shell right now."
      onRetry={reset}
      title="App load failed"
    />
  );
}
