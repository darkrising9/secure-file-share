import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// ===========================
// ✅ Define Protected Routes
// ===========================
const protectedRoutes = ["/upload", "/dashboard"];

// ✅ Get JWT secret key from environment variables
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("Missing JWT_SECRET environment variable");

// ===========================
// ✅ JWT Authentication Middleware
// ===========================
async function verifyToken(req: NextRequest) {
  const token = req.cookies.get("token")?.value || req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    console.error("❌ No token provided.");
    return false;
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(JWT_SECRET));
    return true;
  } catch (error) {
    console.error("❌ Invalid token:", error);
    return false;
  }
}

// ===========================
// ✅ Middleware Handler
// ===========================
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ Protect Routes
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    const isAuthenticated = await verifyToken(req);
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}

// ✅ Apply Middleware to Protected Routes Only
export const config = {
  matcher: protectedRoutes,
};
