import { AlertCircleIcon } from "lucide-react";

import { appSetup } from "@/lib/env";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function SetupState() {
  return (
    <main className="safe-px safe-pt safe-pb flex min-h-screen">
      <div className="app-mobile-shell flex w-full flex-col gap-4">
        <Card className="glass-card border border-white/50 shadow-xl">
          <CardHeader>
            <CardTitle>Finish production setup</CardTitle>
            <CardDescription>
              KnowYourCalories is scaffolded and ready, but these environment
              variables still need values before Google sign-in and persistence can go live.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {appSetup.missingVariables.map((variable) => (
              <div
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/80 px-3 py-3"
                key={variable}
              >
                <AlertCircleIcon className="text-primary" />
                <code>{variable}</code>
              </div>
            ))}
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
            <span>
              Copy the keys from [.env.example](/c:/Users/jhuoc/Desktop/Random%20Side%20Projects/KnowYourCalories/.env.example)
              and fill them with your Neon, Google OAuth, and Vercel Blob credentials.
            </span>
            <span>
              Keep OAuth, auth, and AI secrets server-side only. None of them are exposed to the client in this setup.
            </span>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
