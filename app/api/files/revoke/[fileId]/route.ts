// File Path: app/api/files/revoke/[fileId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth-utils';
import { logActivity } from '@/lib/logger';
import { ActionType } from '@prisma/client';
import { getClientIpFromHeaders } from '@/lib/request-ip';

const prisma = new PrismaClient();

interface RouteParams {
    params: { fileId: string };
}

// --- Main DELETE Handler ---
// --- MODIFICATION: Destructure fileId directly ---
export async function DELETE(request: NextRequest, { params: { fileId: fileIdParam } }: RouteParams) {
    console.log(`DELETE /api/files/revoke/${fileIdParam} request received`);

    // --- MODIFICATION: Validate/Convert fileId EARLY and use the variable ---
    let fileId: number | string; // Use number if your File ID is Int, string if String (e.g., CUID/UUID)

    // --- Choose ONE based on your File 'id' type in schema.prisma ---
    // --- Option A: If File ID is Int ---
    fileId = parseInt(fileIdParam, 10);
    if (isNaN(fileId)) {
        return NextResponse.json({ success: false, error: "Invalid File ID format. Must be a number." }, { status: 400 });
    }
    // --- Option B: If File ID is String ---
    // fileId = fileIdParam;
    // if (typeof fileId !== 'string' || fileId.length === 0) {
    //      return NextResponse.json({ success: false, error: "Invalid File ID format." }, { status: 400 });
    // }
    // --- ---
    // --- Use the 'fileId' variable below (which has the correct type) ---

    try {
        // 1. Authenticate the user
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
        }
        console.log(`Revoke request by authenticated user: ${currentUser.email} (ID: ${currentUser.id})`);


        // 2. Find the file record for authorization check
        // Use the correctly typed fileId variable
        const fileRecord = await prisma.file.findUnique({
            where: { id: fileId },
            select: { uploaderId: true }, // Select only uploaderId needed for auth
        });

        // 3. Handle File Not Found
        if (!fileRecord) {
            console.log(`File not found for revoke attempt: ID ${fileId}`);
            return NextResponse.json({ success: false, error: "File record not found." }, { status: 404 });
        }

        // 4. Authorize: Ensure the current user is the uploader
        if (fileRecord.uploaderId !== currentUser.id) {
            console.warn(`Authorization failed: User ${currentUser.id} attempted to revoke file ${fileId} owned by ${fileRecord.uploaderId}`);
            return NextResponse.json({ success: false, error: "You are not authorized to revoke this file share." }, { status: 403 });
        }
        console.log(`User ${currentUser.id} authorized to revoke file ${fileId}`);
        // --- VVV ADD REVOKE LOG VVV ---
        const ip = getClientIpFromHeaders(request.headers as any);
        await logActivity(currentUser.email, ActionType.FILE_REVOKE, `User revoked access to file ID: ${fileId}`, ip);
        // --- ^^^ ---
        // 5. Update the File Record to Revoke Access
        await prisma.file.update({
            where: { id: fileId }, // Use correctly typed fileId
            data: {
                downloadToken: null,    // Set token to null (requires String? in schema)
                tokenExpiresAt: null, // Set expiry to null (requires DateTime? in schema)
                // Or you could set tokenExpiresAt: new Date() if preferred
            },
        });

        console.log(`Successfully revoked file share for ID: ${fileId}`);

        // 6. Return Success Response
        return NextResponse.json({ success: true, message: "File share revoked successfully." }, { status: 200 });

    } catch (error: any) {
        // --- MODIFICATION: Use fileId variable in log ---
        console.error(`Error revoking file share for ID ${fileId}:`, error); // Use variable, not params.fileId

        let statusCode = 500;
        let message = "Failed to revoke file share due to a server error.";

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            // P2025 = Record to update not found (might happen in race condition)
            if (error.code === 'P2025') { message = "File record not found during update."; statusCode = 404;}
            // P2023 = Inconsistent column data (might occur if types mismatch after generate)
            // P2011 = Null constraint violation (shouldn't happen now if schema/generate are correct)
            else { console.error(`Prisma DB Error Code: ${error.code}`, error.message); message = "Database error during revoke operation."; }
        } else if (error.message.includes("Invalid File ID format")) {
            statusCode = 400; message = error.message;
        }

        return NextResponse.json({ success: false, error: message }, { status: statusCode });
    }
}