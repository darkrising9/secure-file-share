import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { logActivity } from "@/lib/logger";
import { ActionType } from "@prisma/client";
import { getClientIpFromHeaders } from "@/lib/request-ip";

export async function GET(request: NextRequest) {
  // Attempt to log the logout event with the authenticated user's email
  try {
    const user = await getCurrentUser(request);
    const ip = getClientIpFromHeaders(request.headers as any);
    if (user) {
      await logActivity(user.email, ActionType.USER_LOGOUT, undefined, ip);
    }
  } catch (e) {
    // Ignore logging errors; do not block logout
  }

  const response = NextResponse.json({ message: "Logged out successfully" });

  // Clear the token cookie
  response.headers.set(
    "Set-Cookie",
    "token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"
  );

  return response;
}
