"use client";

import { useEffect, useState } from "react";
import { DownloadIcon, Loader2Icon, SmartphoneIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState<DeferredInstallPrompt | null>(null);
  const [pending, setPending] = useState(false);
  const [isAndroid] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.navigator.userAgent.toLowerCase().includes("android");
  });

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as DeferredInstallPrompt);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  if (!promptEvent && !isAndroid) {
    return null;
  }

  if (!promptEvent && isAndroid) {
    return (
      <div className="flex max-w-xs flex-col items-end gap-2 text-right">
        <Button className="min-h-12" disabled size="lg" type="button" variant="outline">
          <SmartphoneIcon data-icon="inline-start" />
          Install from browser menu
        </Button>
        <p className="text-xs text-muted-foreground">
          If Android does not show a direct install prompt here, open the browser menu in
          Chrome or Samsung Internet and choose Install app or Add page to Home screen.
        </p>
      </div>
    );
  }

  return (
    <Button
      className="min-h-12"
      disabled={pending}
      onClick={async () => {
        const currentPromptEvent = promptEvent;

        if (!currentPromptEvent) {
          return;
        }

        setPending(true);
        await currentPromptEvent.prompt();
        const choice = await currentPromptEvent.userChoice;

        if (choice.outcome === "accepted") {
          toast.success("KnowYourCalories is being added to your device.");
        } else {
          toast.message("Install was dismissed. You can try again from this screen.");
        }

        setPromptEvent(null);
        setPending(false);
      }}
      size="lg"
      type="button"
      variant="outline"
    >
      {pending ? (
        <Loader2Icon className="animate-spin" data-icon="inline-start" />
      ) : (
        <DownloadIcon data-icon="inline-start" />
      )}
      {pending ? "Opening install..." : "Install app"}
    </Button>
  );
}
