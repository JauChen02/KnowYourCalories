import { CameraIcon, ChartNoAxesCombinedIcon, CheckCircle2Icon, FlameIcon } from "lucide-react";

import { GoogleSignInButton } from "@/components/app/auth-controls";
import { InstallAppButton } from "@/components/app/install-app-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof FlameIcon;
  title: string;
  description: string;
}) {
  return (
    <Card className="border border-white/50 bg-background/75" size="sm">
      <CardHeader>
        <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <Icon />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export function SignInScreen({ callbackUrl = "/" }: { callbackUrl?: string }) {
  return (
    <main className="safe-px safe-pt safe-pb flex min-h-screen">
      <div className="app-mobile-shell flex w-full flex-col gap-4">
        <Card className="glass-card overflow-hidden border border-white/60 shadow-xl">
          <CardHeader className="gap-3">
            <Badge className="w-fit" variant="secondary">
              Secure sign-in required
            </Badge>
            <div className="brand-wordmark text-primary">KnowYourCalories</div>
            <CardTitle className="text-3xl">A lighter way to log your meals</CardTitle>
            <CardDescription className="max-w-sm text-sm/relaxed">
              Sign in with Google to access your dashboard, uploads, history,
              settings, and server-backed calorie records.
            </CardDescription>
            <CardAction>
              <InstallAppButton />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <FeatureCard
                description="Every signed-in user gets their own Postgres-backed meal history."
                icon={FlameIcon}
                title="Private cloud data"
              />
              <FeatureCard
                description="Meal photos are stored in Vercel Blob, with only URLs and metadata in Postgres."
                icon={CameraIcon}
                title="Safe image handling"
              />
              <FeatureCard
                description="Targets, edits, and follow-ups stay attached to your account across devices."
                icon={ChartNoAxesCombinedIcon}
                title="Persistent progress"
              />
              <FeatureCard
                description="The app is installable as a PWA for quick phone-first logging."
                icon={CheckCircle2Icon}
                title="Mobile-first"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-3">
            <GoogleSignInButton callbackUrl={callbackUrl} />
            <p className="text-sm text-muted-foreground">
              The user-facing name stays as <strong>KnowYourCalories</strong> so
              it never reads like &quot;Know Your Customer.&quot;
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
