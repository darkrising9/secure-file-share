import { PrismaClient } from "@prisma/client"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { SignJWT } from "jose"

const prisma = new PrismaClient()

// Get JWT_SECRET from environment variable
const JWT_SECRET = process.env.JWT_SECRET || "yourSecretKey" // Ensure this is set in .env

if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET environment variable")
}

// ✅ Utility to generate JWT using jose
async function generateJWT(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h") // Token expires in 1 hour
    .sign(new TextEncoder().encode(JWT_SECRET))
}

export async function POST(req: Request) {
  try {
    const { firstName, lastName, email, password, role, idNumber } = await req.json()

    // ✅ Check if email or ID number already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { idNumber }],
      },
    })

    if (existingUser) {
      return NextResponse.json(
        {
          message:
            existingUser.email === email
              ? "A user with this email already exists. Please use a different email."
              : "A user with this ID number already exists. Please use a different ID.",
        },
        { status: 400 }
      )
    }

    // ✅ Validate ID from PreExistingIDs table based on role
    const idCheck = await prisma.preExistingIDs.findFirst({
      where: role === "teacher" ? { teacherId: idNumber } : { studentId: idNumber },
    })

    if (!idCheck) {
      return NextResponse.json(
        { message: role === "teacher" ? "Teacher ID not found." : "Student Roll Number not found." },
        { status: 400 }
      )
    }

    // ✅ Hash the password before storing in the database
    const hashedPassword = await bcrypt.hash(password, 10) // 10 salt rounds

    // ✅ Create the new user with the hashed password
    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword, // Store hashed password
        role,
        idNumber,
      },
    })

    // ✅ Generate JWT token with jose
    const token = await generateJWT({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    })

    // ✅ Create response and return success message along with token
    const response = NextResponse.json(
      {
        message: "Registration successful",
        redirectUrl: "/dashboard",
        user: { id: newUser.id, email: newUser.email, role: newUser.role },
        token, // Send token to frontend
      },
      { status: 201 }
    )

    // ✅ Set JWT token securely in cookies
    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Error during registration:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
