import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = request.nextUrl.searchParams.get("url");

  if (!url || !url.includes(".blob.vercel-storage.com")) {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    return new NextResponse("Storage not configured", { status: 503 });
  }

  const upstream = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!upstream.ok) {
    return new NextResponse("Not found", { status: upstream.status });
  }

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
