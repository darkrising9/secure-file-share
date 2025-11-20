// File Path: app/api/admin/users/[userId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma, ActionType } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth-utils';
import { logActivity } from '@/lib/logger';
import { getClientIpFromHeaders } from '@/lib/request-ip';
import fs from 'fs'; // Import fs for file deletion
import path from 'path'; // Keep if needed

const prisma = new PrismaClient();

// Define structure for route params used by handlers
interface RouteParams {
    params: { userId: string };
}

// Define expected structure of the request body for updates
interface UpdateUserData {
    firstName?: string; // Corrected to firstName to match schema
    role?: string;
    status?: string;
}

// --- PATCH Handler (Update User) ---
export async function PATCH(request: NextRequest, { params: { userId: userIdParam } }: RouteParams) {
    console.log(`PATCH /api/admin/users/${userIdParam} request received`);

    let userId: string | number; // Use number if your User ID is Int
    try {
        // --- Adjust based on your User 'id' type ---
        userId = userIdParam; // Assuming String ID
        if (typeof userId !== 'string' || userId.length === 0) { throw new Error("Invalid User ID format."); }
        // userId = parseInt(userIdParam, 10); // Use if Int ID
        // if (isNaN(userId)) { throw new Error("Invalid User ID format."); }
    } catch (formatError: any) {
        return NextResponse.json({ success: false, error: formatError.message }, { status: 400 });
    }

    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser) return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
        if (currentUser.role !== 'admin') return NextResponse.json({ success: false, error: "Administrator privileges required." }, { status: 403 });
        console.log(`Admin action requested by: ${currentUser.email}`);

        const body = await request.json() as UpdateUserData;
        const { firstName, role, status } = body;

        const updateData: Prisma.UserUpdateInput = {};

        if (typeof firstName === 'string') {
            updateData.firstName = firstName; // Use 'firstName' to match schema
        }
        if (typeof role === 'string') {
            const allowedRoles = ['admin', 'teacher', 'student'];
            if (!allowedRoles.includes(role.toLowerCase())) {
                return NextResponse.json({ success: false, error: `Invalid role specified: ${role}` }, { status: 400 });
            }
            updateData.role = role.toLowerCase();
        }
        if (typeof status === 'string') {
            const allowedStatuses = ['active', 'suspended'];
            if (!allowedStatuses.includes(status.toLowerCase())) {
                return NextResponse.json({ success: false, error: `Invalid status specified: ${status}` }, { status: 400 });
            }
            if (currentUser.id === userId && status.toLowerCase() === 'suspended') {
                 return NextResponse.json({ success: false, error: "Cannot suspend own account." }, { status: 400 });
            }
            updateData.status = status.toLowerCase();
        }

        if (Object.keys(updateData).length === 0) {
             return NextResponse.json({ success: false, error: "No valid fields provided for update." }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true, createdAt: true, _count: { select: {filesUploaded: true, filesReceived: true}} }
        });

        // --- Logging the admin edit action ---
        const ip = getClientIpFromHeaders(request.headers as any);
        await logActivity(currentUser.email, ActionType.ADMIN_USER_EDIT, `Updated details for user: ${updatedUser.email} (ID: ${userId})`, ip);

        console.log(`User ${userId} updated successfully by admin ${currentUser.email}`);
        return NextResponse.json({ success: true, updatedUser }, { status: 200 });

    } catch (error: any) {
        console.error(`Error updating user ${userIdParam}:`, error); // Use userIdParam for logging consistency
        // ... (rest of error handling)
        let statusCode = 500;
        let message = "Failed to update user.";
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            message = "User not found."; statusCode = 404;
        }
        return NextResponse.json({ success: false, error: message }, { status: statusCode });
    }
}

// --- DELETE Handler (Delete User) ---
export async function DELETE(request: NextRequest, { params: { userId: userIdParam } }: RouteParams) {
    console.log(`DELETE /api/admin/users/${userIdParam} request received`);
    let physicalFilePathsToDelete: string[] = [];

    let userId: string | number; // Use number if your User ID is Int
    try {
        // --- Adjust based on your User 'id' type ---
        userId = userIdParam; // Assuming String ID
        if (typeof userId !== 'string' || userId.length === 0) { throw new Error("Invalid User ID format."); }
        // userId = parseInt(userIdParam, 10); // Use if Int ID
        // if (isNaN(userId)) { throw new Error("Invalid User ID format."); }
    } catch (formatError: any) {
        return NextResponse.json({ success: false, error: formatError.message }, { status: 400 });
    }

     try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser) return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
        if (currentUser.role !== 'admin') return NextResponse.json({ success: false, error: "Administrator privileges required." }, { status: 403 });
        console.log(`Admin delete request by: ${currentUser.email}`);

        if (currentUser.id === userId) {
            return NextResponse.json({ success: false, error: "Administrators cannot delete their own account." }, { status: 400 });
        }

        // Find user and their files before starting deletion transaction
        const userToDelete = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
        if (!userToDelete) { return NextResponse.json({ success: false, error: "User not found." }, { status: 404 }); }

        const filesToDelete = await prisma.file.findMany({ where: { uploaderId: userId }, select: { filePath: true } });
        physicalFilePathsToDelete = filesToDelete.map(f => f.filePath);

        console.warn(`Attempting to delete user ${userToDelete.email} and their ${physicalFilePathsToDelete.length} uploaded files.`);

        // Perform DB deletions in a transaction
        await prisma.$transaction(async (tx) => {
            await tx.file.deleteMany({ where: { uploaderId: userId } });
            await tx.user.delete({ where: { id: userId } });
        });

        // --- VVV ADD ADMIN DELETE LOG VVV ---
        const ip = getClientIpFromHeaders(request.headers as any);
        await logActivity(currentUser.email, ActionType.ADMIN_USER_DELETE, `Deleted user: ${userToDelete.email} (ID: ${userId})`, ip);
        // --- ^^^ ---

        console.log(`Database records for user ${userId} deleted successfully.`);

        // Delete physical files after successful DB transaction
        let deletionErrors = 0;
        for (const filePath of physicalFilePathsToDelete) {
            try {
                await fs.promises.unlink(filePath);
            } catch (fileError: any) {
                if (fileError.code !== 'ENOENT') { // Don't log error if file was already missing
                    console.error(`Error deleting physical file ${filePath}:`, fileError);
                    deletionErrors++;
                }
            }
        }
        console.log("Physical file cleanup finished.");

        return NextResponse.json({ success: true, message: `User and ${physicalFilePathsToDelete.length} file records deleted successfully.` + (deletionErrors > 0 ? " Some physical files may require manual cleanup." : "") }, { status: 200 });

     } catch (error: any) {
         const idForLog = typeof userId !== 'undefined' ? userId : userIdParam;
         console.error(`Error deleting user ${idForLog}:`, error);

         let statusCode = 500;
         let message = "Failed to delete user due to a server error.";
         if (error instanceof Prisma.PrismaClientKnownRequestError) {
             if (error.code === 'P2025') { message = "User not found during deletion."; statusCode = 404; }
             else if (error.code === 'P2003') { message = "Cannot delete user, they may still have associated data (foreign key constraint)."; statusCode = 409; }
             else { message = "Database error during deletion."; }
         } else if (error.message.includes("Invalid User ID format")) {
            statusCode = 400; message = error.message;
         }

        return NextResponse.json({ success: false, error: message }, { status: statusCode });
     }
}