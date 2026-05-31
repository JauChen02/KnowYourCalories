"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3Icon, PlusCircleIcon, Settings2Icon, TimerResetIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3Icon },
  { href: "/upload", label: "Add", icon: PlusCircleIcon, emphasized: true },
  { href: "/history", label: "History", icon: TimerResetIcon },
  { href: "/settings", label: "Settings", icon: Settings2Icon },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-20 mt-auto">
      <div className="app-shell safe-px safe-pb pt-4">
        <div className="grid grid-cols-4 gap-1.5 rounded-[1.8rem] border border-white/60 bg-background/88 p-1.5 shadow-xl backdrop-blur-2xl">
        {navItems.map(({ href, label, icon: Icon, emphasized }) => {
          const active = pathname === href;

          return (
            <Link
              className={cn(
                "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-[1.3rem] px-2 py-1.5 text-[11px] font-medium transition-all",
                emphasized
                  ? active
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-primary/12 text-primary hover:bg-primary/18"
                  : active
                    ? "bg-secondary text-foreground"
                    : "bg-background/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              href={href}
              key={href}
            >
              <Icon className={cn("size-4", emphasized && "size-5")} />
              <span>{label}</span>
            </Link>
          );
        })}
        </div>
      </div>
    </nav>
  );
}
