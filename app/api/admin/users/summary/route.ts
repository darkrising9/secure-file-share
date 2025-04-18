// File Path: app/api/admin/users/summary/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth-utils'; // Import your auth function

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
    console.log("GET /api/admin/users/summary request received");

    try {
        // 1. Authenticate AND Authorize as Admin
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
        }
        // --- VVV ADMIN ROLE CHECK VVV ---
        if (currentUser.role !== 'admin') {
             console.warn(`Authorization failed: User ${currentUser.email} (Role: ${currentUser.role}) attempted to access admin resource.`);
             return NextResponse.json({ success: false, error: "Access Denied: Administrator privileges required." }, { status: 403 }); // 403 Forbidden
        }
         // --- ^^^ ADMIN ROLE CHECK ^^^ ---
        console.log(`Admin access granted for user: ${currentUser.email}`);


        // 2. Fetch all users with counts of related files
        const usersWithCounts = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                firstName: true, // Or firstName
                role: true,
                createdAt: true,
                status: true,
                _count: { // Use Prisma's relation count aggregation
                  select: {
                    filesUploaded: true, // Counts files where this user is the uploader
                    filesReceived: true, // Counts files where this user is the recipient
                  },
                },
            },
            orderBy: {
                createdAt: 'desc', // Show newest users first, or order by email/name
            },
        });

        console.log(`Found ${usersWithCounts.length} users for admin summary.`);

        // 3. Return the data
        return NextResponse.json({ success: true, users: usersWithCounts }, { status: 200 });

    } catch (error: any) {
        console.error("Error fetching user summary:", error);
        // Handle potential Prisma errors or other issues
         return NextResponse.json({ success: false, error: "Failed to fetch user summary." }, { status: 500 });
    }
}