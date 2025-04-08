// File Path: app/api/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import nodemailer from 'nodemailer';
import { Readable } from 'stream';
import { getCurrentUser } from '@/lib/auth-utils'; // Assuming this path is correct

// --- Configuration ---
const prisma = new PrismaClient();
const UPLOAD_DIR = path.join(process.cwd(), "encrypted_uploads");

// --- Security Critical: Encryption Setup ---
const ALGORITHM = "aes-256-gcm";
const KEY_ENV_VAR = "ENCRYPTION_KEY";
const secretKeyHex = process.env[KEY_ENV_VAR];
if (!secretKeyHex || secretKeyHex.length !== 64) { /* ... error handling ... */ throw new Error('Encryption key missing/invalid'); }
const secretKey = Buffer.from(secretKeyHex, 'hex');

// --- Nodemailer Transport Setup ---
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// --- Ensure Directory Exists ---
async function ensureUploadDirectory() {
    try { await fs.promises.mkdir(UPLOAD_DIR, { recursive: true }); console.log("Upload directory ensured."); }
    catch (err) { console.error("Error creating upload directory:", err); throw new Error("Could not create necessary upload directory."); }
}
ensureUploadDirectory();


// --- API Route Handler ---
export async function POST(req: NextRequest) {
    let encryptedFilePath: string | undefined = undefined;

    try {
        // Step 0: Authenticate the Uploader
        const uploader = await getCurrentUser(req);
        if (!uploader) {
            return NextResponse.json({ success: false, error: "Authentication required. Please log in." }, { status: 401 });
        }
        console.log(`Upload initiated by authenticated user: ${uploader.email} (ID: ${uploader.id})`);

        // 1. Parse Form Data
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const recipientEmail = formData.get("recipientEmail") as string | null;

        // Basic Validation
        if (!file) return NextResponse.json({ success: false, error: "No file uploaded." }, { status: 400 });
        if (!recipientEmail) return NextResponse.json({ success: false, error: "Recipient email is required." }, { status: 400 });

        // 1.5 Validate Recipient Email exists in User table
        console.log(`Validating recipient email: ${recipientEmail}`);
        const recipientUser = await prisma.user.findUnique({ where: { email: recipientEmail }, select: { id: true } });
        if (!recipientUser) {
            console.log(`Recipient email not found: ${recipientEmail}`);
            return NextResponse.json({ success: false, error: "Recipient email does not belong to a registered user." }, { status: 404 });
        }
        console.log(`Recipient validation successful: ${recipientEmail} (User ID: ${recipientUser.id})`);

        // Extract file details
        const originalFilename = file.name || `file_${Date.now()}`;
        const mimeType = file.type || "application/octet-stream";
        const size = file.size;

        // File Size Check
        const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // Example: 50MB limit
        if (size > MAX_FILE_SIZE_BYTES) {
            return NextResponse.json({ success: false, error: `File size exceeds the ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB limit.` }, { status: 413 });
        }

        // 2. Prepare for Encryption & Local Storage
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(ALGORITHM, secretKey, iv);
        const encryptedFileName = `${crypto.randomUUID()}.enc`;
        encryptedFilePath = path.join(UPLOAD_DIR, encryptedFileName);

        // 3. Read File into Buffer using .arrayBuffer() and Create Node Stream
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const nodeStream = Readable.from(buffer);
        const output = fs.createWriteStream(encryptedFilePath);

        // Pipe stream for encryption
        await pipeline(nodeStream, cipher, output);
        const authTag = cipher.getAuthTag();
        console.log("Encryption pipeline finished.");

        // 4. Generate Secure Download Token
        const downloadToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiryHours = 24;
        const tokenExpiresAt = new Date(Date.now() + tokenExpiryHours * 60 * 60 * 1000);

        // 5. Store Metadata in Database
        const savedFile = await prisma.file.create({
            data: {
                fileName: originalFilename, 
                filePath: encryptedFilePath, 
                mimeType: mimeType, 
                size: size,
                recipientEmail: recipientEmail, 
                uploaderId: uploader.id, // Optional
                iv: iv.toString("hex"), 
                authTag: authTag.toString("hex"),
                downloadToken: downloadToken, 
                tokenExpiresAt: tokenExpiresAt,
            },
            select: { id: true }
        });
        console.log(`File metadata saved DB ID ${savedFile.id}`);

        // --- VVV CHANGE MADE HERE VVV ---
        // 6. Generate Full Download URL (Pointing to the PAGE route)
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        // Ensure this URL points to your frontend download page, not the API directly
        const downloadUrl = `${baseUrl}/download/${downloadToken}`; // REMOVED '/api' prefix
        console.log(`Generated PAGE download URL: ${downloadUrl}`);
        // --- ^^^ CHANGE MADE HERE ^^^ ---


        // 7. Send Email Notification (Using the updated PAGE URL)
        try {
             await transporter.sendMail({
                 from: `"SecureShare - Encrypted File Sharing" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
                 to: recipientEmail,
                 subject: "Secure file shared with you", // Slightly different subject maybe
                 text: `User ${uploader.email} has shared a secure file with you. View file details and download here (link expires in ${tokenExpiryHours} hours): ${downloadUrl}`,
                 html: `<p>User <b>${uploader.email}</b> has shared a secure file with you.</p><p><a href="${downloadUrl}">Click here to view file details and download</a></p><p>This link expires in ${tokenExpiryHours} hours.</p>`,
             });
             console.log(`Download page link email sent successfully to ${recipientEmail}`);
        } catch (emailError) { console.error(`Failed to send download email to ${recipientEmail}:`, emailError); }

        // 8. Return Success Response (Including the PAGE URL)
        return NextResponse.json({
            success: true,
            message: "File uploaded, encrypted, and download page link sent to registered recipient.", // Updated message
            fileId: savedFile.id,
            downloadUrl: downloadUrl // Return the PAGE URL
        });

    } catch (error: any) {
        console.error("Upload Error:", error);
        if (encryptedFilePath) { try { await fs.promises.unlink(encryptedFilePath); } catch (e) { console.error("Error cleaning encrypted file:", e); } }
        let statusCode = 500;
         if (error.message?.includes("Authentication required")) statusCode = 401;
         else if (error.message?.includes("Recipient email does not belong")) statusCode = 404;
         else if (error.message?.includes("File size exceeds")) statusCode = 413;
         // ... other status code checks ...
        return NextResponse.json( { success: false, error: "Failed to upload/process file: " + error.message }, { status: statusCode } );
    }
}