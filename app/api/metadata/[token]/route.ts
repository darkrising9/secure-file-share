// File Path: app/api/metadata/[token]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth-utils'; // Import your authentication function

// --- Configuration ---
const prisma = new PrismaClient();

// --- Main GET Handler ---
export async function GET(request: NextRequest, { params }: { params: { token: string } }) {

    // 1. Get and Validate Token Format from URL
    const downloadToken = params.token;
    // Basic check for expected token format (64 hex characters)
    if (!downloadToken || typeof downloadToken !== 'string' || !/^[a-f0-9]{64}$/i.test(downloadToken)) {
        return NextResponse.json({ success: false, error: "Invalid link format." }, { status: 400 });
    }

    console.log(`Metadata request initiated for token: ${downloadToken.substring(0, 8)}...`);

    try {
        // 2. Authenticate User making the request
        const currentUser = await getCurrentUser(request); // Reads cookie, verifies JWT
        if (!currentUser) {
             console.warn(`Metadata request authentication failed for token: ${downloadToken.substring(0, 8)}...`);
             return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 }); // 401 Unauthorized
        }
        console.log(`Authenticated user for metadata request: ${currentUser.email} (ID: ${currentUser.id})`);

        // 3. Find File Record and Select Necessary Metadata fields
        const fileRecord = await prisma.file.findUnique({
            where: { downloadToken: downloadToken },
            select: { // Select only the fields needed for the frontend display + authorization
                id: true,
                fileName: true,
                size: true,
                mimeType: true,
                recipientEmail: true,
                tokenExpiresAt: true,
                // Include other fields if you want to display them, e.g., createdAt, uploader details if linked
            }
        });

        // 4. Handle Token Not Found
        if (!fileRecord) {
            console.log(`Metadata request: Token not found in DB: ${downloadToken.substring(0, 8)}...`);
            return NextResponse.json({ success: false, error: "Invalid or expired link." }, { status: 404 }); // 404 Not Found
        }

        // 5. Check Download Token Expiry
        if (fileRecord.tokenExpiresAt && fileRecord.tokenExpiresAt < new Date()) {
            console.log(`Metadata request: Token expired: ${downloadToken.substring(0, 8)}... (Expired at: ${fileRecord.tokenExpiresAt})`);
            return NextResponse.json({ success: false, error: "Link has expired." }, { status: 410 }); // 410 Gone
        }

        // 6. Authorize: Check if the Authenticated User is the Intended Recipient
        if (currentUser.email !== fileRecord.recipientEmail) {
            console.warn(`Metadata request authorization failed: User ${currentUser.email} attempted access for ${fileRecord.recipientEmail}. Token: ${downloadToken.substring(0, 8)}...`);
            return NextResponse.json({ success: false, error: "Access denied." }, { status: 403 }); // 403 Forbidden
        }
        console.log(`User ${currentUser.email} authorized for metadata for file: ${fileRecord.fileName}`);

        // 7. Prepare and Return Metadata
        const metadata = {
            fileName: fileRecord.fileName,
            size: fileRecord.size,
            mimeType: fileRecord.mimeType,
            // Optionally include other safe-to-display details
            // recipientEmail: fileRecord.recipientEmail, // Be mindful about displaying recipient email if not needed
        };

        console.log(`Successfully retrieved metadata for token: ${downloadToken.substring(0, 8)}...`);
        return NextResponse.json({ success: true, metadata: metadata }, { status: 200 });

    } catch (error: any) {
        // General Error Handling
        console.error(`Metadata retrieval error for token ${downloadToken?.substring(0, 8)}...:`, error);

        let statusCode = 500;
        let message = "An internal server error occurred while retrieving file details.";

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
             console.error(`Prisma DB Error: Code ${error.code}`, error.message);
             message = "Database error.";
        }
        // Add more specific error handling if needed

        return NextResponse.json(
            { success: false, error: message },
            { status: statusCode }
        );
    }
}