// File Path: middleware.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify, JWTPayload } from "jose";


// General authenticated user routes
const protectedRoutes = ["/upload", "/dashboard", "/download/", "/api/files/shared", "/api/files/revoke/", "/api/metadata/", "/api/download/", "/api/users/me", "/api/logout"];
// Admin-only routes
const adminRoutes = ["/admin", "/api/admin"]; 

// Get JWT secret key 
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("FATAL ERROR: Missing JWT_SECRET environment variable for middleware.");
}
const secretKey = new TextEncoder().encode(JWT_SECRET);


interface UserJwtPayload extends JWTPayload {
    id: string | number; 
    email?: string;
    role?: string; 
}


async function verifyTokenAndGetPayload(req: NextRequest): Promise<UserJwtPayload | null> {
  // Prioritize cookie as it's HttpOnly
  const token = req.cookies.get("token")?.value;
  if (!token) {
    // console.log("Middleware: Auth cookie 'token' not found.");
    return null;
  }

  try {
    const { payload } = await jwtVerify<UserJwtPayload>(token, secretKey);
    // console.log("Middleware: Token verified, payload:", payload); // Debug logging
    return payload;
  } catch (error: any) {
    // Log specific JWT errors
    if (error.code === 'ERR_JWT_EXPIRED') { console.log("Middleware: Auth token expired."); }
    else if (error.code === 'ERR_JWS_INVALID' || error.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') { console.log("Middleware: Auth token invalid signature."); }
    else { console.error("Middleware: Error verifying auth token:", error.message); }
    return null; // Verification failed
  }
}


export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const loginUrl = new URL("/login", req.url); // URL for redirection

  console.log(`Middleware executing for path: ${pathname}`); // Log path being checked

  // Verify the token once for all checks
  const payload = await verifyTokenAndGetPayload(req);
  const isAuthenticated = !!payload; // User is authenticated if payload exists

  // --- Check Admin Routes First ---
  if (adminRoutes.some((route) => pathname.startsWith(route))) {
    console.log(`Path ${pathname} matches admin route pattern.`);
    if (!isAuthenticated) {
        console.log("Middleware: Not authenticated, redirecting to login.");
        return NextResponse.redirect(loginUrl);
    }
    // Check role *after* confirming authentication
    if (payload?.role !== 'admin') {
        console.warn(`Middleware: Forbidden access attempt to admin route ${pathname} by user ${payload?.email} (Role: ${payload?.role})`);
        // Redirect non-admins away from admin routes
        return NextResponse.redirect(new URL("/dashboard", req.url)); // Redirect to their normal dashboard
    }
    // If authenticated AND admin, allow access
    console.log(`Middleware: Admin access granted for ${payload?.email} to ${pathname}`);
    return NextResponse.next(); // Allow request to proceed
  }

  // --- Check General Protected Routes ---
  // Note: Need to be careful not to block API routes needed by public pages if any exist
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
     console.log(`Path ${pathname} matches protected route pattern.`);
    if (!isAuthenticated) {
        console.log("Middleware: Not authenticated, redirecting to login.");
        return NextResponse.redirect(loginUrl);
    }
    // Allow any authenticated user (including admin) to access general protected routes
    console.log(`Middleware: Authenticated access granted for ${payload?.email} to ${pathname}`);
    return NextResponse.next(); // Allow request to proceed
  }

  // --- Allow Public Routes ---
  // If the route didn't match admin or protected patterns, allow it
  console.log(`Middleware: Allowing public access to ${pathname}`);
  return NextResponse.next();
}


export const config = {
  matcher: [protectedRoutes, adminRoutes]
};