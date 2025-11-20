// File Path: app/api/admin/users/[userId]/status/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma, ActionType } from '@prisma/client'; // Import ActionType
import { getCurrentUser } from '@/lib/auth-utils';
import { logActivity } from '@/lib/logger'; // Import the logger
import { getClientIpFromHeaders } from '@/lib/request-ip';

const prisma = new PrismaClient();

// Define expected request body structure
interface UpdateStatusData {
    status: string; // Expect 'active' or 'suspended'
}

// Define structure for route params
interface RouteParams {
    params: { userId: string };
}

// Handles PATCH requests to update user status
export async function PATCH(request: NextRequest, { params: { userId: userIdParam } }: RouteParams) {
    console.log(`PATCH /api/admin/users/${userIdParam}/status request received`);

    // --- PREREQUISITE CHECK (Good Practice) ---
    // Check if the 'status' field exists on your User model. Remove if you are certain it does.
    const userModelFields = Prisma.dmmf.datamodel.models.find(model => model.name === 'User')?.fields;
    if (!userModelFields?.some(field => field.name === 'status')) {
         console.error("API Error: User model does not have a 'status' field defined in schema.prisma.");
         return NextResponse.json({ success: false, error: "Server configuration error: User status feature not enabled." }, { status: 501 });
    }
    // --- ---

    // --- MODIFICATION: Validate/Convert userId EARLY using userIdParam ---
    let userId: string | number; // Use number if your User ID is Int
    try {
        // --- Adjust based on your User 'id' type ---
        userId = userIdParam; // Assuming String ID
        if (typeof userId !== 'string' || userId.length === 0) { throw new Error("Invalid User ID format."); }
        // userId = parseInt(userIdParam, 10); // Use if Int ID
        // if (isNaN(userId)) { throw new Error("Invalid User ID format. Must be a number."); }
    } catch (formatError: any) {
        return NextResponse.json({ success: false, error: formatError.message }, { status: 400 });
    }
    // --- Use the correctly typed 'userId' variable below ---

    try {
        // 1. Authenticate and Authorize Admin
        const currentUser = await getCurrentUser(request);
        if (!currentUser) return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
        if (currentUser.role !== 'admin') return NextResponse.json({ success: false, error: "Administrator privileges required." }, { status: 403 });
        console.log(`Admin status toggle requested by: ${currentUser.email}`);


        // 2. Parse and Validate Request Body
        const body = await request.json() as UpdateStatusData;
        const newStatus = body.status?.toLowerCase();

        if (newStatus !== 'active' && newStatus !== 'suspended') {
            return NextResponse.json({ success: false, error: "Invalid status value provided. Use 'active' or 'suspended'." }, { status: 400 });
        }

        // 3. Prevent Self-Suspension
        if (currentUser.id === userId && newStatus === 'suspended') {
             return NextResponse.json({ success: false, error: "Administrators cannot suspend their own account." }, { status: 400 });
        }

        // 4. Update User Status in Database
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                status: newStatus,
            },
            select: { id: true, email: true, status: true } // Select email for logging
        });

        // --- VVV ADD ADMIN STATUS CHANGE LOG VVV ---
        const ip = getClientIpFromHeaders(request.headers as any);
        await logActivity(currentUser.email, ActionType.ADMIN_USER_STATUS_CHANGE, `Set status of user ${updatedUser.email} to '${newStatus}'`, ip);
        // --- ^^^ ---

        // --- FIX: Corrected console.log statement ---
        console.log(`User ${userId} status updated to '${newStatus}' by admin ${currentUser.email}`);

        // 5. Return Success Response
        return NextResponse.json({ success: true, message: `User status updated to ${newStatus}.`, updatedStatus: updatedUser.status }, { status: 200 });

    } catch (error: any) {
        // --- MODIFICATION: Use userIdParam in log for consistency ---
        console.error(`Error updating status for user ${userIdParam}:`, error);

        let statusCode = 500;
        let message = "Failed to update user status due to a server error.";

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') { message = "User not found."; statusCode = 404; }
            else { message = "Database error during status update."; }
        } else if (error.message.includes("Invalid User ID format")) {
             statusCode = 400; message = error.message;
        } else if (error instanceof SyntaxError) {
             statusCode = 400; message = "Invalid request body.";
        }

        return NextResponse.json({ success: false, error: message }, { status: statusCode });
    }
}