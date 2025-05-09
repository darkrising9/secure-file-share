// File Path: app/api/admin/users/[userId]/status/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth-utils'; 

const prisma = new PrismaClient();


interface UpdateStatusData {
    status: string; // Expect 'active' or 'suspended'
}

// Handles PATCH requests to update user status
export async function PATCH(request: NextRequest, { params }: { params: { userId: string } }) {
    const userIdParam = params.userId;
    console.log(`PATCH /api/admin/users/${userIdParam}/status request received`);



    try {
        // Authenticate and Authorize Admin
        const currentUser = await getCurrentUser(request);
        if (!currentUser) return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
        if (currentUser.role !== 'admin') return NextResponse.json({ success: false, error: "Administrator privileges required." }, { status: 403 });
        console.log(`Admin status toggle requested by: ${currentUser.email}`);

        // Validate and Convert userId Parameter (Match type to your schema)
        let userId: string | number;
        userId = userIdParam;
        if (typeof userId !== 'string' || userId.length === 0) { throw new Error("Invalid User ID format."); }
        
        // Parse and Validate Request Body
        const body = await request.json() as UpdateStatusData;
        const newStatus = body.status?.toLowerCase(); // Expect { "status": "active" } or { "status": "suspended" }

        if (newStatus !== 'active' && newStatus !== 'suspended') {
            return NextResponse.json({ success: false, error: "Invalid status value provided. Use 'active' or 'suspended'." }, { status: 400 });
        }

        // Prevent Self-Suspension
        if (currentUser.id === userId && newStatus === 'suspended') {
             return NextResponse.json({ success: false, error: "Administrators cannot suspend their own account." }, { status: 400 });
        }

        // Update User Status in Database
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                status: newStatus, 
            },
             select: { id: true, status: true } 
        });

        console.log(`User <span class="math-inline">\{userId\} status updated to '</span>{newStatus}' by admin ${currentUser.email}`);

        // Return Success Response
        return NextResponse.json({ success: true, message: `User status updated to ${newStatus}.`, updatedStatus: updatedUser.status }, { status: 200 });

    } catch (error: any) {
        console.error(`Error updating status for user ${params.userId}:`, error);

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