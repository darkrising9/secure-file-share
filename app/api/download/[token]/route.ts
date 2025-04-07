// File Path: app/api/download/[token]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import crypto from 'crypto';
import fs from 'fs'; // Using Node.js file system module
import path from 'path';
import { Readable } from 'stream'; // Node.js Readable stream for piping
import { getCurrentUser } from '@/lib/auth-utils'; // Import your real authentication function

// --- Configuration ---
const prisma = new PrismaClient();
// IMPORTANT: Ensure this path exactly matches the one used in your upload route
const UPLOAD_DIR = path.join(process.cwd(), "encrypted_uploads");

// --- Security Critical: Encryption Setup ---
const ALGORITHM = "aes-256-gcm"; // Must match encryption algorithm
const KEY_ENV_VAR = "ENCRYPTION_KEY"; // Environment variable for the file encryption key

const secretKeyHex = process.env[KEY_ENV_VAR];
// Critical check: Ensure the key is loaded for decryption
if (!secretKeyHex || secretKeyHex.length !== 64) {
    console.error(`FATAL ERROR: Download API cannot function. Environment variable ${KEY_ENV_VAR} is missing or not a valid 64-character hex string (32 bytes).`);
}

// --- Main GET Handler ---
export async function GET(request: NextRequest, { params }: { params: { token: string } }) {

    // 1. Check if Server Encryption Key is Available
    if (!secretKeyHex) {
        console.error("Download request failed: Server file encryption key is not configured.");
        return NextResponse.json({ success: false, error: "Server configuration error. Please try again later." }, { status: 500 });
    }
    // Derive the key for use
    const secretKey = Buffer.from(secretKeyHex, 'hex');

    // 2. Get Download Token and ADD DIAGNOSTIC LOGGING
    const downloadToken = params.token;

    // --- VVV ADDED DETAILED LOGGING for Token Validation VVV ---
    console.log("--- Download API: Token Received ---");
    console.log("Raw params.token:", downloadToken);
    console.log("Token type:", typeof downloadToken);
    console.log("Token length:", downloadToken?.length);
    // Test the regex directly here and log the result
    const isValidFormat = /^[a-f0-9]{64}$/i.test(downloadToken || ''); // Use || '' to prevent error if token is null/undefined
    console.log("Regex Validation Result:", isValidFormat);
    console.log("--- End Token Check ---");
    // --- ^^^ ADDED DETAILED LOGGING for Token Validation ^^^ ---


    // Validate Download Token Format using the pre-calculated result
    // --- MODIFIED If condition to use isValidFormat ---
    if (!downloadToken || typeof downloadToken !== 'string' || !isValidFormat) {
        // Log details when validation fails
        console.error("Token validation failed! Details:", {
             token: downloadToken,
             type: typeof downloadToken,
             length: downloadToken?.length,
             regexCheck: isValidFormat
            });
        return NextResponse.json({ success: false, error: "Invalid download link format." }, { status: 400 });
    }
    // --- Token Format is Valid, Proceed ---

    console.log(`Download initiated for valid token format: ${downloadToken.substring(0, 8)}...`);

    try {
        // 3. Authenticate User making the request (using imported function)
        const currentUser = await getCurrentUser(request); // Reads cookie, verifies JWT
        if (!currentUser) {
             console.warn(`Authentication failed for download request with token: ${downloadToken.substring(0, 8)}...`);
             return NextResponse.json({ success: false, error: "Authentication required. Please log in." }, { status: 401 }); // 401 Unauthorized
        }
        console.log(`Authenticated user: ${currentUser.email} (ID: ${currentUser.id})`);


        // 4. Find File Metadata in Database using the Download Token
        const fileRecord = await prisma.file.findUnique({
            where: { downloadToken: downloadToken },
        });

        // 5. Handle Token Not Found
        if (!fileRecord) {
            console.log(`Download token not found in DB: ${downloadToken.substring(0, 8)}...`);
            return NextResponse.json({ success: false, error: "Invalid or expired download link." }, { status: 404 }); // 404 Not Found
        }

        // 6. Check Download Token Expiry
        if (fileRecord.tokenExpiresAt && fileRecord.tokenExpiresAt < new Date()) {
            console.log(`Download token expired: ${downloadToken.substring(0, 8)}... (Expired at: ${fileRecord.tokenExpiresAt})`);
            return NextResponse.json({ success: false, error: "Download link has expired." }, { status: 410 }); // 410 Gone
        }

        // 7. Authorize: Check if the Authenticated User is the Intended Recipient
        if (currentUser.email !== fileRecord.recipientEmail) {
            console.warn(`Authorization failed: User ${currentUser.email} attempted download for ${fileRecord.recipientEmail}. Token: ${downloadToken.substring(0, 8)}...`);
            return NextResponse.json({ success: false, error: "Access denied. You are not authorized to download this file." }, { status: 403 }); // 403 Forbidden
        }
        console.log(`User ${currentUser.email} authorized for file: ${fileRecord.fileName}`);


        // 8. Verify Encrypted File Exists on Disk
        const encryptedFilePath = fileRecord.filePath;
         try {
            await fs.promises.access(encryptedFilePath, fs.constants.R_OK); // Check existence and read permission
            console.log(`Encrypted file confirmed at: ${encryptedFilePath}`);
        } catch (fsError: any) {
            if (fsError.code === 'ENOENT') { // File Not Found
                 console.error(`CRITICAL ERROR: Encrypted file missing from disk: ${encryptedFilePath}. DB ID: ${fileRecord.id}. Token: ${downloadToken.substring(0, 8)}...`);
                return NextResponse.json({ success: false, error: "File unavailable. Please contact support." }, { status: 503 }); // 503 Service Unavailable
            }
            console.error(`Filesystem error accessing ${encryptedFilePath}:`, fsError);
            throw new Error("Server error accessing stored file."); // Let outer catch handle other FS errors
        }


        // 9. Prepare for Decryption
        const iv = Buffer.from(fileRecord.iv, 'hex');
        const authTag = Buffer.from(fileRecord.authTag, 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM, secretKey, iv);
        decipher.setAuthTag(authTag); // Provide the tag for verification during decryption

        // 10. Create File Streams for Piping
        const encryptedFileStream = fs.createReadStream(encryptedFilePath);
        const decryptedStream = encryptedFileStream.pipe(decipher);

        // --- Stream Error Handling ---
        encryptedFileStream.on('error', (err) => { /* ... unchanged ... */ });
        decryptedStream.on('error', (err) => { /* ... unchanged ... */ });
        // --- End Stream Error Handling ---


        // 11. Set Up Response Headers for Download
        const headers = new Headers();
        headers.set('Content-Type', fileRecord.mimeType);
        const encodedFilename = encodeURI(fileRecord.fileName.replace(/['"]/g, ''));
        headers.set('Content-Disposition', `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodeURIComponent(fileRecord.fileName)}`);
        headers.set('Content-Length', fileRecord.size.toString());


        // 12. Return the Streaming Response
        console.log(`Streaming decrypted file: ${fileRecord.fileName} (Size: ${fileRecord.size}) to user ${currentUser.email}`);
        return new NextResponse(decryptedStream as any, {
            status: 200,
            headers: headers,
        });

    } catch (error: any) {
        console.error(`Download process error for token ${downloadToken?.substring(0, 8)}...:`, error);
        let statusCode = 500;
        let message = "An internal server error occurred while processing your download.";
        // ... (rest of error handling unchanged) ...
        return NextResponse.json( { success: false, error: message }, { status: statusCode } );
    }
}