// File Path: app/api/files/received/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth-utils'; // Adjust path if needed

const prisma = new PrismaClient();

// Define structure for nested uploader info (sender)
interface UploaderInfo {
    id: string; // Or number - Match User ID type
    name: string | null; // Or firstName
    email: string;
}

// Define structure returned by this API for each received file
interface ReceivedFileData {
    id: number; // File's DB ID
    fileName: string;
    size: number;
    createdAt: Date; // Upload time
    tokenExpiresAt: Date | null;
    downloadToken: string | null;
    status: 'active' | 'expired' | 'revoked';
    uploader: UploaderInfo | null; // Who sent it
}

export async function GET(request: NextRequest) {
    console.log("GET /api/files/received request received");
    try {
        // 1. Authenticate user (the recipient)
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
        }
        console.log(`Workspaceing received files for user: ${currentUser.email} (ID: ${currentUser.id})`);

        // 2. Fetch files where recipientId matches current user's ID
        //    Include the uploader's details via the relation
        const filesFromDb = await prisma.file.findMany({
            where: {
                recipientId: currentUser.id,
            },
            select: {
                id: true,
                fileName: true,
                size: true,
                createdAt: true,
                tokenExpiresAt: true,
                downloadToken: true,
                uploader: { // Use include/select to get sender details
                    select: {
                        id: true,
                        firstName: true, // Use 'firstName' if that's your field name
                        email: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // 3. Process files to calculate status
        const now = new Date();
        const processedFiles: ReceivedFileData[] = filesFromDb.map(file => {
            let status: 'active' | 'expired' | 'revoked';
            if (file.downloadToken === null) { status = 'revoked'; }
            else if (file.tokenExpiresAt && file.tokenExpiresAt < now) { status = 'expired'; }
            else { status = 'active'; }

            // Ensure we handle case where uploader might be null if relation was optional/failed
            const uploaderInfo = file.uploader ? {
                id: file.uploader.id,
                name: file.uploader.firstName, // Use 'firstName' if needed
                email: file.uploader.email,
            } : null;

            return {
                id: file.id,
                fileName: file.fileName,
                size: file.size,
                createdAt: file.createdAt,
                tokenExpiresAt: file.tokenExpiresAt,
                downloadToken: file.downloadToken,
                status: status,
                uploader: uploaderInfo,
            };
        });

        console.log(`Found ${processedFiles.length} received files for user ${currentUser.email}`);

        // 4. Return the list
        return NextResponse.json({ success: true, files: processedFiles }, { status: 200 });

    } catch (error: any) {
        console.error("Error fetching received files:", error);
        // Add more specific error handling if needed
        return NextResponse.json({ success: false, error: "Failed to fetch received files." }, { status: 500 });
    }
}