// File Path: app/api/metadata/[token]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth-utils'; // Import your authentication function

const prisma = new PrismaClient();

// Define structure for the route parameter
interface RouteParams {
    params: { token: string };
}

// --- Main GET Handler ---
// --- VVV MODIFICATION: Destructure token directly into downloadToken VVV ---
export async function GET(request: NextRequest, { params: { token: downloadToken } }: RouteParams) {
// --- ^^^ MODIFICATION ^^^ ---

    // 1. Validate Download Token Format
    // --- MODIFICATION: Use 'downloadToken' directly ---
    // Add detailed logging
    console.log("--- Metadata API: Token Received ---");
    console.log("Raw token parameter:", downloadToken);
    console.log("Token type:", typeof downloadToken);
    console.log("Token length:", downloadToken?.length);
    const isValidFormat = /^[a-f0-9]{64}$/i.test(downloadToken || '');
    console.log("Regex Validation Result:", isValidFormat);
    console.log("--- End Token Check ---");

    if (!downloadToken || typeof downloadToken !== 'string' || !isValidFormat) {
        console.error("Token validation failed!", { token: downloadToken });
        return NextResponse.json({ success: false, error: "Invalid link format." }, { status: 400 });
    }
    // --- Use 'downloadToken' directly from now on ---
    console.log(`Metadata request initiated for valid token format: ${downloadToken.substring(0, 8)}...`);


    try {
        // 2. Authenticate User making the request
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
             console.warn(`Metadata request authentication failed for token: ${downloadToken.substring(0, 8)}...`);
             return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
        }
        console.log(`Authenticated user for metadata request: ${currentUser.email} (ID: ${currentUser.id})`);

        // 3. Find File Record and Select Necessary Metadata fields
        const fileRecord = await prisma.file.findUnique({
            where: { downloadToken: downloadToken }, // Use destructured token
            select: {
                id: true,
                fileName: true,
                size: true,
                mimeType: true,
                recipientEmail: true,
                tokenExpiresAt: true,
                uploaderId: true, // Select uploaderId for auth check below (if needed, though auth check done above)
            }
        });

        // 4. Handle Token Not Found
        if (!fileRecord) {
            console.log(`Metadata request: Token not found in DB: ${downloadToken.substring(0, 8)}...`);
            return NextResponse.json({ success: false, error: "Invalid or expired link." }, { status: 404 });
        }

        // 5. Check Download Token Expiry
        if (fileRecord.tokenExpiresAt && fileRecord.tokenExpiresAt < new Date()) {
            console.log(`Metadata request: Token expired: ${downloadToken.substring(0, 8)}... (Expired at: ${fileRecord.tokenExpiresAt})`);
            return NextResponse.json({ success: false, error: "Link has expired." }, { status: 410 });
        }

        // 6. Authorize: Check if the Authenticated User is the Intended Recipient
        //    (Crucial check remains the same)
        if (currentUser.email !== fileRecord.recipientEmail) {
            console.warn(`Metadata request authorization failed: User ${currentUser.email} attempted access for ${fileRecord.recipientEmail}. Token: ${downloadToken.substring(0, 8)}...`);
            return NextResponse.json({ success: false, error: "Access denied." }, { status: 403 });
        }
        console.log(`User ${currentUser.email} authorized for metadata for file: ${fileRecord.fileName}`);

        // 7. Prepare and Return Metadata
        //    (No changes needed here, already uses fileRecord properties)
        const metadata = {
            fileName: fileRecord.fileName,
            size: fileRecord.size,
            mimeType: fileRecord.mimeType,
            // recipientEmail: fileRecord.recipientEmail, // Optional
        };

        console.log(`Successfully retrieved metadata for token: ${downloadToken.substring(0, 8)}...`);
        return NextResponse.json({ success: true, metadata: metadata }, { status: 200 });

    } catch (error: any) {
        // General Error Handling
        // --- MODIFICATION: Use downloadToken variable in log ---
        console.error(`Metadata retrieval error for token ${downloadToken?.substring(0, 8)}...:`, error);

        let statusCode = 500;
        let message = "An internal server error occurred while retrieving file details.";

        if (error instanceof Prisma.PrismaClientKnownRequestError) { /* ... */ }
        // ... other specific error handling ...

        return NextResponse.json( { success: false, error: message }, { status: statusCode } );
    }
}