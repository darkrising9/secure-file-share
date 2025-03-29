import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"
import { IncomingForm } from "formidable"
import path from "path"
import fs from "fs/promises"
import { Readable } from "stream"

// ===========================
// ✅ Define Protected Routes
// ===========================
const protectedRoutes = ["/upload", "/dashboard"]

// ✅ Get JWT secret key from environment variables
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error("Missing JWT_SECRET environment variable")

// ===========================
// ✅ Formidable Configuration
// ===========================

// ✅ Define upload directory
const uploadDir = path.join(process.cwd(), "public/uploads")

// ✅ Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.access(uploadDir)
  } catch (error) {
    console.log(`📂 Upload directory does not exist, creating...`)
    await fs.mkdir(uploadDir, { recursive: true })
  }
}

// ===========================
// ✅ Convert NextRequest to Readable Stream
// ===========================

async function convertToStream(req: NextRequest) {
  const body = await req.arrayBuffer()
  return Readable.from(Buffer.from(body))
}

// ===========================
// ✅ Formidable Upload Handler
// ===========================

async function handleFormidableUpload(req: NextRequest) {
  await ensureUploadDir()

  // ✅ Convert NextRequest to Node.js Readable Stream
  const stream = await convertToStream(req)

  const form = new IncomingForm({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // 10 MB
  })

  return new Promise<{ fields: any; files: any }>((resolve, reject) => {
    form.parse(stream as any, (err, fields, files) => {
      if (err) {
        reject(err)
      } else {
        resolve({ fields, files })
      }
    })
  })
}

// ===========================
// ✅ File Upload Middleware
// ===========================

async function handleFileUpload(req: NextRequest) {
  try {
    const { fields, files } = await handleFormidableUpload(req)
    if (!files.file) {
      console.error("❌ No file found in the request!")
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    // ✅ Get uploaded file information
    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file
    const filePath = uploadedFile.filepath
    const fileName = uploadedFile.originalFilename

    console.log(`✅ File uploaded successfully: ${filePath}`)

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully!",
      fileName,
      filePath,
    })
  } catch (error) {
    console.error("❌ File Upload Error:", error)
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }
}

// ===========================
// ✅ JWT Middleware for Routes
// ===========================

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ✅ Handle file upload for /api/upload
  if (pathname === "/api/upload" && req.method === "POST") {
    return await handleFileUpload(req)
  }

  // ✅ Check for protected routes
  if (protectedRoutes.includes(pathname)) {
    console.log("🔒 Protected route accessed:", pathname)

    // ✅ Get token from cookies
    const token = req.cookies.get("token")?.value
    if (!token) {
      console.warn("⚠️ No token found, redirecting to login.")
      return NextResponse.redirect(new URL("/login", req.url))
    }

    try {
      // ✅ Verify JWT using jose
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(JWT_SECRET)
      )

      console.log("✅ Token verified. User ID:", payload.id, "Role:", payload.role)

      // ✅ Check token expiration
      if (Date.now() >= (payload.exp as number) * 1000) {
        console.warn("⚠️ Token has expired, redirecting to login.")
        return NextResponse.redirect(new URL("/login", req.url))
      }

      // ✅ Attach decoded token to headers for downstream use
      const response = NextResponse.next()
      response.headers.set("X-User-Id", payload.id as string)
      response.headers.set("X-User-Role", payload.role as string)

      return response
    } catch (error) {
      console.error("❌ Invalid or expired token:", error)
      return NextResponse.redirect(new URL("/login", req.url))
    }
  }

  // ✅ Allow non-protected routes
  return NextResponse.next()
}

// ============================
// ✅ Middleware Configuration
// ============================
export const config = {
  matcher: [
    "/upload",
    "/dashboard",
    "/api/:path*", // Apply middleware to API routes
  ],
}
