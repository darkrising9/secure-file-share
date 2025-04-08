// File Path: app/api/files/shared/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth-utils'; // Import your authentication function

const prisma = new PrismaClient();

// Define the structure of the data returned for each file by this API
// This should match what the DashboardPage expects
interface SharedFileData {
    id: number; // Database ID (for actions like revoke)
    fileName: string;
    size: number;
    createdAt: Date; // Uploaded date
    recipientEmail: string; // The email it was sent to
    tokenExpiresAt: Date | null; // Expiry date for the token
    downloadToken: string | null; // The token itself (needed for view link)
    status: 'active' | 'expired' | 'revoked'; // Calculated status
}

export async function GET(request: NextRequest) {
    console.log("GET /api/files/shared request received");

    try {
        // 1. Authenticate the user making the request
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            // User is not logged in or token is invalid/expired
            return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
        }
        console.log(`Workspaceing shared files for user: ${currentUser.email} (ID: ${currentUser.id})`);

        // 2. Fetch files from the database WHERE the uploaderId matches the current user's ID
        // --- PREREQUISITE ---
        // This assumes:
        //   a) Your 'File' model in schema.prisma has an 'uploaderId' field.
        //   b) This 'uploaderId' field has a relation defined to the User model.
        //   c) Your /api/upload route correctly saves the uploader's ID to this field.
        // If these are not met, this query will fail or return incorrect results.
        // --- ---
        const filesFromDb = await prisma.file.findMany({
            where: {
                uploaderId: currentUser.id, // Filter by the logged-in user's ID
            },
            select: { // Select only the fields needed for the dashboard and status calculation
                id: true,
                fileName: true,
                size: true,
                createdAt: true,
                recipientEmail: true,
                tokenExpiresAt: true,
                downloadToken: true,
                // Explicitly DO NOT select filePath, iv, authTag here - not needed for list display
            },
            orderBy: {
                createdAt: 'desc', // Show the most recently uploaded files first
            },
        });

        // 3. Process the fetched files to determine their current status
        const now = new Date();
        const processedFiles: SharedFileData[] = filesFromDb.map(file => {
            let status: 'active' | 'expired' | 'revoked';

            if (file.downloadToken === null) {
                // If the token field is explicitly null in the DB, consider it revoked
                status = 'revoked';
            } else if (file.tokenExpiresAt && file.tokenExpiresAt < now) {
                // If an expiry date exists and it's in the past
                status = 'expired';
            } else {
                // Otherwise, it's currently active (token exists and not expired)
                status = 'active';
            }

            // Return a new object matching the SharedFileData interface
            return {
                id: file.id,
                fileName: file.fileName,
                size: file.size,
                createdAt: file.createdAt,
                recipientEmail: file.recipientEmail,
                tokenExpiresAt: file.tokenExpiresAt,
                downloadToken: file.downloadToken, // Include token for the 'View' link URL
                status: status, // Include the calculated status
            };
        });

        console.log(`Found and processed ${processedFiles.length} shared files for user ${currentUser.email}`);

        // 4. Return the list of processed files
        return NextResponse.json({ success: true, files: processedFiles }, { status: 200 });

    } catch (error: any) {
        console.error("Error fetching shared files:", error);
        let statusCode = 500;
        let message = "Failed to fetch shared files due to a server error.";

        // Handle specific errors if helpful
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
             // Log details but return a generic message
             console.error(`Prisma Error Code: ${error.code}`, error.message);
             message = "Database error while fetching files.";
        } else if (error.message.includes("uploaderId")) {
             // Catch potential errors if uploaderId field/relation is missing
             console.error("Possible schema error: Query failed potentially due to missing 'uploaderId' relation setup.");
             message = "Server configuration error related to file ownership.";
        }

        return NextResponse.json({ success: false, error: message }, { status: statusCode });
    }
}