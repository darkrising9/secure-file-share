import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { SignJWT } from "jose"

// Ensure JWT secret key is set via environment variables
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error("Missing JWT_SECRET environment variable")

// Define JWT expiration and algorithm
const JWT_ALGORITHM = "HS256"
const JWT_EXPIRATION = "24h"

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    // Validate email and password
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({ where: { email } })

    // Check if user exists
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Compare hashed password with the provided password
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // ✅ Generate JWT token using jose
    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      role: user.role,
    })
      .setProtectedHeader({ alg: JWT_ALGORITHM })
      .setExpirationTime(`${JWT_EXPIRATION}`)
      .sign(new TextEncoder().encode(JWT_SECRET))

    console.log("Token generated successfully:", token)

    // ✅ Set token in cookie
    const response = NextResponse.json({ message: "Login successful", token })

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    })

    return response
  } catch (error) {
    console.error("Error during login:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
