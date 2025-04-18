// File Path: app/api/admin/users/[userId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth-utils'; // Adjust path if needed

const prisma = new PrismaClient();

// Define expected structure of the request body for updates
interface UpdateUserData {
    name?: string;      // Or firstName - Make optional
    role?: string;      // Make optional
    status?: string;    // Make optional (only if status field exists)
    // Add other editable fields here, ensure they are optional
}

// Handles PATCH requests to update user details
export async function PATCH(request: NextRequest, { params }: { params: { userId: string } }) {
    const userIdParam = params.userId;
    console.log(`PATCH /api/admin/users/${userIdParam} request received`);

    try {
        // 1. Authenticate and Authorize Admin
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
        }
        if (currentUser.role !== 'admin') {
            return NextResponse.json({ success: false, error: "Access Denied: Administrator privileges required." }, { status: 403 });
        }
        console.log(`Admin action requested by: ${currentUser.email}`);

        // 2. Validate and Convert userId Parameter
        //    ADJUST 'number' or 'string' based on your User model ID type
        let userId: string | number;
        // --- Option A: If your User ID is String (CUID/UUID) ---
        userId = userIdParam;
        if (typeof userId !== 'string' || userId.length === 0) {
             throw new Error("Invalid User ID format."); // Caught by catch block
        }

        // 3. Parse and Validate Request Body
        const body = await request.json() as UpdateUserData;
        const { name, role, status } = body; // Destructure expected fields

        const updateData: Prisma.UserUpdateInput = {}; // Use Prisma type for update data

        // Only add fields to updateData if they were provided in the request body
        if (typeof name === 'string') {
            updateData.firstName = name; // Use 'firstName' if that's your schema field
        }
        if (typeof role === 'string') {
            // Optional: Add validation for allowed roles
            const allowedRoles = ['admin', 'teacher', 'student'];
            if (!allowedRoles.includes(role.toLowerCase())) {
                return NextResponse.json({ success: false, error: `Invalid role specified: ${role}` }, { status: 400 });
            }
            // Prevent admin from removing the last admin's role? Add check if needed.
            updateData.role = role.toLowerCase(); // Store roles consistently (e.g., lowercase)
        }
        // Uncomment if status field exists in your User model
        
        if (typeof status === 'string') {
            const allowedStatuses = ['active', 'suspended'];
            if (!allowedStatuses.includes(status.toLowerCase())) {
                return NextResponse.json({ success: false, error: `Invalid status specified: ${status}` }, { status: 400 });
            }
            // Prevent admin from suspending themselves?
            if (currentUser.id === userId && status.toLowerCase() === 'suspended') {
                 return NextResponse.json({ success: false, error: "Cannot suspend own account." }, { status: 400 });
            }
            updateData.status = status.toLowerCase();
        }
        

        if (Object.keys(updateData).length === 0) {
             return NextResponse.json({ success: false, error: "No valid fields provided for update." }, { status: 400 });
        }

        // 4. Update User in Database
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: { id: true, email: true, firstName: true, role: true, status: true, createdAt: true, _count: { select: {filesUploaded: true, filesReceived: true}} } // Return updated summary data
        });

        console.log(`User ${userId} updated successfully by admin ${currentUser.email}`);

        // 5. Return Success Response with updated user summary data
        return NextResponse.json({ success: true, updatedUser }, { status: 200 });

    } catch (error: any) {
        console.error(`Error updating user ${params.userId}:`, error);

        let statusCode = 500;
        let message = "Failed to update user due to a server error.";

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') { // Record to update not found
                 message = "User not found."; statusCode = 404;
            } else { message = "Database error during update."; }
        } else if (error.message.includes("Invalid User ID format")) {
            statusCode = 400; message = error.message;
        } else if (error instanceof SyntaxError) { // JSON parsing error
            statusCode = 400; message = "Invalid request body.";
        }

        return NextResponse.json({ success: false, error: message }, { status: statusCode });
    }
}

// Add this function to app/api/admin/users/[userId]/route.ts

export async function DELETE(request: NextRequest, { params }: { params: { userId: string } }) {
    const userIdParam = params.userId;
    console.log(`DELETE /api/admin/users/${userIdParam} request received`);

     try {
        // 1. Authenticate and Authorize Admin
        const currentUser = await getCurrentUser(request);
        if (!currentUser) return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
        if (currentUser.role !== 'admin') return NextResponse.json({ success: false, error: "Administrator privileges required." }, { status: 403 });
        console.log(`Admin delete request by: ${currentUser.email}`);

        // 2. Validate and Convert userId Parameter (Match type to your schema)
        let userId: string | number;
        // --- If User ID is String ---
        userId = userIdParam;
        if (typeof userId !== 'string' || userId.length === 0) { throw new Error("Invalid User ID format."); }
        // --- If User ID is Int ---
        // userId = parseInt(userIdParam, 10);
        // if (isNaN(userId)) { throw new Error("Invalid User ID format. Must be a number."); }

        // 3. Prevent Self-Deletion
        if (currentUser.id === userId) {
            return NextResponse.json({ success: false, error: "Administrators cannot delete their own account." }, { status: 400 });
        }

        // 4. Delete User
        // WARNING: This deletes the user record. It does NOT automatically handle
        // files uploaded by this user. Depending on your schema's foreign key constraints
        // (e.g., ON DELETE SET NULL/CASCADE on File.uploaderId), this might fail or
        // leave orphaned files/records. Implement proper cascading logic or file cleanup if needed.
        console.warn(`Attempting to delete user ${userId}. Ensure related file handling is considered!`);

        await prisma.user.delete({
            where: { id: userId },
        });

        console.log(`User ${userId} deleted successfully by admin ${currentUser.email}`);

        // 5. Return Success Response
        // return new NextResponse(null, { status: 204 }); // 204 No Content is also common for DELETE
        return NextResponse.json({ success: true, message: "User deleted successfully." }, { status: 200 });


     } catch (error: any) {
         console.error(`Error deleting user ${params.userId}:`, error);

         let statusCode = 500;
         let message = "Failed to delete user due to a server error.";

         if (error instanceof Prisma.PrismaClientKnownRequestError) {
             if (error.code === 'P2025') { // Record to delete not found
                  message = "User not found."; statusCode = 404;
             } else if (error.code === 'P2003') { // Foreign key constraint failed
                  console.error("Foreign key constraint failed. User might still have related records (e.g., files).");
                  message = "Cannot delete user, they may still have associated data."; statusCode = 409; // Conflict
             } else { message = "Database error during deletion."; }
         } else if (error.message.includes("Invalid User ID format")) {
            statusCode = 400; message = error.message;
         }

        return NextResponse.json({ success: false, error: message }, { status: statusCode });
     }
}