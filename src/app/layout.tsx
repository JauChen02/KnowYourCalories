import type { Metadata, Viewport } from "next";

import { ThemeProvider } from "@/components/app/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://knowyourcalories.app"),
  title: {
    default: "KnowYourCalories",
    template: "%s | KnowYourCalories",
  },
  description:
    "A mobile-first calorie tracker for logging meals, storing food photos, and keeping your calorie history safely in sync.",
  applicationName: "KnowYourCalories",
  keywords: [
    "KnowYourCalories",
    "calorie tracker",
    "meal tracker",
    "nutrition log",
    "health app",
    "PWA",
  ],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KnowYourCalories",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icons/icon-192.png",
    apple: "/apple-icon",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "KnowYourCalories",
  },
};

export const viewport: Viewport = {
  themeColor: "#4eb8a3",
  colorScheme: "light",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className="min-h-full bg-background text-foreground">
        <ThemeProvider>
          <div className="relative flex min-h-full flex-col">
            {children}
            <Toaster richColors position="top-center" />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
