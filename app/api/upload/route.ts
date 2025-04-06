// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { pipeline } from 'stream/promises';
import nodemailer from 'nodemailer';
import { Readable } from 'stream'; // Keep Node.js Readable

// --- Configuration ---
const prisma = new PrismaClient();
const UPLOAD_DIR = path.join(process.cwd(), "encrypted_uploads");

// --- Security Critical: Encryption Setup (Unchanged) ---
const ALGORITHM = "aes-256-gcm";
const KEY_ENV_VAR = "ENCRYPTION_KEY";
const secretKeyHex = process.env[KEY_ENV_VAR];
if (!secretKeyHex || secretKeyHex.length !== 64) {
    console.error(`FATAL ERROR: Environment variable ${KEY_ENV_VAR} is missing or not a valid 64-character hex string (32 bytes).`);
    throw new Error(`FATAL ERROR: Environment variable ${KEY_ENV_VAR} is missing or invalid.`);
}
const secretKey = Buffer.from(secretKeyHex, "hex");

// --- Nodemailer Transport Setup (Unchanged) ---
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Ensure upload directory exists (Unchanged)
async function ensureUploadDirectory() {
    try {
        await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
        console.log("Upload directory ensured.");
    } catch (err) {
        console.error("Error creating upload directory:", err);
        throw new Error("Could not create necessary upload directory.");
    }
}
ensureUploadDirectory();

// --- API Route Handler ---
export async function POST(req: NextRequest) {
    let encryptedFilePath: string | undefined = undefined;

    try {
        // 1. Parse Form Data using req.formData() (Unchanged)
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const recipientEmail = formData.get("recipientEmail") as string | null;

        // Basic Validation (Unchanged)
        if (!file) {
            return NextResponse.json({ success: false, error: "No file uploaded." }, { status: 400 });
        }
        if (!recipientEmail) {
            return NextResponse.json({ success: false, error: "Recipient email is required." }, { status: 400 });
        }
        // --- VVV ADD DETAILED LOGGING HERE VVV ---
        console.log("--- Inspecting 'file' object ---");
        console.log("typeof file:", typeof file);
        // Note: `instanceof File` or `Blob` might not work correctly if the global File/Blob is different in Node context
        // console.log("instanceof File?", file instanceof File); // May be unreliable
        // console.log("instanceof Blob?", file instanceof Blob); // May be unreliable
        console.log("file object keys:", file ? Object.keys(file) : 'null');
        console.log("file object itself:", file); // Log the whole object to see its structure
        console.log("--- End Inspection ---");
        // --- ^^^ ADD DETAILED LOGGING HERE ^^^ ---

        // Extract file details (Unchanged)
        const originalFilename = file.name || `file_${Date.now()}`;
        const mimeType = file.type || "application/octet-stream";
        const size = file.size;

        // --- V RECOMMENDED: File Size Check (before reading into memory) V ---
        const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // Example: 50MB limit - ADJUST AS NEEDED!
        if (size > MAX_FILE_SIZE_BYTES) {
            console.warn(`File rejected: Size ${size} exceeds limit ${MAX_FILE_SIZE_BYTES}`);
             return NextResponse.json({ success: false, error: `File size exceeds the ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB limit.` }, { status: 413 });
        }
        // --- ^ RECOMMENDED: File Size Check ^ ---


        // 2. Prepare for Encryption & Local Storage (Unchanged)
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(ALGORITHM, secretKey, iv);
        const encryptedFileName = `${crypto.randomUUID()}.enc`;
        encryptedFilePath = path.join(UPLOAD_DIR, encryptedFileName);

        // --- V MODIFICATION: Use .arrayBuffer() instead of .stream() V ---
        // 3. Read File into Buffer using .arrayBuffer() and Create Node Stream
        console.log("Attempting to read file using arrayBuffer...");
        const arrayBuffer = await file.arrayBuffer(); // Read ALL file content into memory
        console.log(`Read ${arrayBuffer.byteLength} bytes into ArrayBuffer.`);
        const buffer = Buffer.from(arrayBuffer);     // Convert ArrayBuffer to Node.js Buffer
        const nodeStream = Readable.from(buffer);      // Create Readable stream FROM the buffer
        console.log("Created Node.js stream from buffer.");
        // --- ^ MODIFICATION ^ ---

        const output = fs.createWriteStream(encryptedFilePath);

        // Pipe the buffer-based stream through encryption to the file
        await pipeline(nodeStream, cipher, output);
        console.log("Encryption pipeline finished.");

        const authTag = cipher.getAuthTag();

        // 4. Generate Secure Download Token (Unchanged)
        const downloadToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiryHours = 24;
        const tokenExpiresAt = new Date(Date.now() + tokenExpiryHours * 60 * 60 * 1000);

        // 5. Store Metadata in Database (Unchanged)
        const savedFile = await prisma.file.create({
             data: {
                 fileName: originalFilename,
                 filePath: encryptedFilePath,
                 mimeType: mimeType,
                 size: size,
                 recipientEmail: recipientEmail,
                 iv: iv.toString("hex"),
                 authTag: authTag.toString("hex"),
                 downloadToken: downloadToken,
                 tokenExpiresAt: tokenExpiresAt,
             },
             select: { id: true }
        });
        console.log(`File ${originalFilename} encrypted locally to ${encryptedFilePath}, metadata saved to DB ID ${savedFile.id}`);

        // 6. Generate Full Download URL (Unchanged)
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        const downloadUrl = `${baseUrl}/api/download/${downloadToken}`;

        // 7. Send Email Notification (Unchanged)
        try {
            await transporter.sendMail({
                from: `"SecureShare - Encrypted File" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
                to: recipientEmail,
                subject: "Your secure file download link",
                text: `You have received a secure file. Download it here (link expires in ${tokenExpiryHours} hours): ${downloadUrl}`,
                html: `<p>You have received a secure file.</p><p><a href="${downloadUrl}">Click here to download</a></p><p>This link expires in ${tokenExpiryHours} hours.</p>`,
            });
            console.log(`Download email sent successfully to ${recipientEmail}`);
        } catch (emailError) {
            console.error(`Failed to send download email to ${recipientEmail}:`, emailError);
        }

        // 8. Return Success Response (Unchanged)
        return NextResponse.json({
            success: true,
            message: "File uploaded, encrypted locally, and download link emailed.",
            fileId: savedFile.id,
            downloadUrl: downloadUrl
        });

    } catch (error: any) {
        console.error("Upload Error:", error);
        if (encryptedFilePath) {
             try { await fs.promises.unlink(encryptedFilePath); } catch (e) { console.error("Error cleaning encrypted file:", e); }
        }
        let statusCode = 500;
        // V--- Adjust error checking ---V
         if (error instanceof TypeError && (error.message.includes(".arrayBuffer is not a function"))) {
            console.error("File object seems to lack .arrayBuffer(). Cannot process file.");
            statusCode = 501; // Or 500 Internal Server Error
        } else if (error.message?.includes("File size exceeds")) {
             statusCode = 413; // Payload Too Large
        } else if (error.message?.includes("form data") || error.message?.includes("Recipient email")) {
             statusCode = 400;
         } else if (error.code === 'ERR_STREAM_PREMATURE_CLOSE' || error.code === 'ENOENT' || error.code === 'EPIPE') {
             statusCode = 500;
         }
         // ---^ Adjust error checking ---^
        return NextResponse.json(
            { success: false, error: "Failed to upload/process file: " + error.message },
            { status: statusCode }
        );
    }
}