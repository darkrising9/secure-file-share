// File Path: app/api/login/route.ts

import { prisma } from "@/lib/prisma"; // Assuming you have a shared prisma instance
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
// --- VVV IMPORT ACTIVITY LOGGING UTILS VVV ---
import { logActivity } from "@/lib/logger"; // Adjust path if your lib folder is elsewhere
import { ActionType } from "@prisma/client"; // ActionType is now part of Prisma Client
import { getClientIpFromHeaders } from "@/lib/request-ip";
// --- ^^^ IMPORT ACTIVITY LOGGING UTILS ^^^ ---

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("Missing JWT_SECRET environment variable");
const secretKey = new TextEncoder().encode(JWT_SECRET); // Define secretKey once for jose

const JWT_ALGORITHM = "HS256";
const JWT_EXPIRATION = "24h";

export async function POST(req: Request) {
  const ip = getClientIpFromHeaders(req.headers as any);
  try {
    const { email, password } = await req.json();

    // Validate email and password
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({ where: { email } });

    // Check if user exists
    if (!user) {
      // --- VVV LOG FAILED LOGIN (USER NOT FOUND) VVV ---
      // We log the attempt but don't reveal in the error that the user doesn't exist
      await logActivity(email, ActionType.USER_LOGIN_FAIL, `Login attempt failed: User not found`, ip);
      // --- ^^^ ---
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Compare hashed password with the provided password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // --- VVV LOG FAILED LOGIN (INCORRECT PASSWORD) VVV ---
      await logActivity(email, ActionType.USER_LOGIN_FAIL, `Login attempt failed: Incorrect password`, ip);
      // --- ^^^ ---
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // --- VVV LOG SUCCESSFUL LOGIN VVV ---
    // Log the event after all checks have passed
    await logActivity(user.email, ActionType.USER_LOGIN_SUCCESS, undefined, ip);
    // --- ^^^ ---

    // Generate JWT token using jose
    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      role: user.role,
    })
      .setProtectedHeader({ alg: JWT_ALGORITHM })
      .setExpirationTime(JWT_EXPIRATION) // Note: setExpirationTime doesn't need template literal
      .sign(secretKey);

    console.log("Token generated successfully for role:", user.role);

    // Set token in cookie and response body
    const response = NextResponse.json({
      message: "Login successful",
      token,
      user: {
        role: user.role
      }
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error) {
    console.error("Error during login:", error);
    // Optional: Log the internal server error itself to the activity log from a system perspective
    // await logActivity('SYSTEM', ActionType.SYSTEM_ERROR, `Error in login API: ${error.message}`);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}