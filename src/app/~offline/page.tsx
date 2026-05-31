import { WifiOffIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OfflinePage() {
  return (
    <main className="safe-px safe-pt safe-pb flex min-h-screen items-center">
      <div className="app-mobile-shell w-full">
        <Card className="glass-card border border-white/50 shadow-lg">
          <CardHeader className="items-center text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <WifiOffIcon />
            </div>
            <CardTitle>Offline for the moment</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            KnowYourCalories is waiting for your connection to come back so your
            cloud-saved data stays consistent.
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
