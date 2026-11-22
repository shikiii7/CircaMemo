import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json(
    { success: true, user },
    { headers: { "cache-control": "no-store" } },
  );
}
