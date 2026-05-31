"use client";

import { useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { Loader2Icon, LogOutIcon, SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function GoogleSignInButton({
  callbackUrl = "/",
  disabled = false,
}: {
  callbackUrl?: string;
  disabled?: boolean;
}) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      className="min-h-12"
      disabled={disabled || pending}
      onClick={() => {
        setPending(true);
        void signIn("google", { callbackUrl });
      }}
      size="lg"
      type="button"
    >
      {pending ? (
        <Loader2Icon className="animate-spin" data-icon="inline-start" />
      ) : (
        <SparklesIcon data-icon="inline-start" />
      )}
      {disabled ? "Google setup needed" : pending ? "Opening Google..." : "Continue with Google"}
    </Button>
  );
}

export function SignOutButton({ callbackUrl = "/sign-in" }: { callbackUrl?: string }) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      className="min-h-12"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void signOut({ callbackUrl });
      }}
      size="lg"
      type="button"
      variant="outline"
    >
      {pending ? (
        <Loader2Icon className="animate-spin" data-icon="inline-start" />
      ) : (
        <LogOutIcon data-icon="inline-start" />
      )}
      {pending ? "Signing out..." : "Sign out"}
    </Button>
  );
}
