// File Path: app/api/users/me/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils'; // Import your verified auth function
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Handles GET requests to /api/users/me
export async function GET(request: NextRequest) {
    console.log("GET /api/users/me request received"); // Log request start

    try {
        // Use your existing function to verify token and get user base info
        const user = await getCurrentUser(request);

        if (!user) {
            // User is not authenticated (token invalid, expired, or missing)
            console.log("User not authenticated for /api/users/me");
            return NextResponse.json({ success: false, user: null, message: "Not Authenticated" }, { status: 401 });
        }

        // User is authenticated, fetch desired profile details from DB
        // (getCurrentUser might already return enough, but fetching here ensures fresh data)
        const userProfile = await prisma.user.findUnique({
            where: { id: user.id }, // Use the ID returned by getCurrentUser
            select: { // Select only the fields you want to expose to the frontend context
                id: true,
                email: true,
                firstName: true,
                role: true
                // Add any other fields needed for the profile display
            }
        });

        if (!userProfile) {
             // This case is unlikely if getCurrentUser succeeded, but handles potential DB inconsistencies
             console.error(`User found by token (ID: ${user.id}) but not in DB for /api/users/me`);
             return NextResponse.json({ success: false, user: null, message: "User not found." }, { status: 404 });
        }

        console.log(`Returning profile for user: ${userProfile.email}`);
        return NextResponse.json({ success: true, user: userProfile }, { status: 200 });

    } catch (error) {
        console.error("Error in /api/users/me:", error);
        return NextResponse.json({ success: false, error: "Internal server error fetching user profile." }, { status: 500 });
    }
}