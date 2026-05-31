import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toBlobProxyUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return `/api/meal-image?url=${encodeURIComponent(url)}`;
}
