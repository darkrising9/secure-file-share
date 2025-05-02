// File Path: app/api/admin/users/summary/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth-utils'; 

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
    console.log("GET /api/admin/users/summary request received");

    try {
        // Authenticate AND Authorize as Admin
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
        }
        if (currentUser.role !== 'admin') {
             console.warn(`Authorization failed: User ${currentUser.email} (Role: ${currentUser.role}) attempted to access admin resource.`);
             return NextResponse.json({ success: false, error: "Access Denied: Administrator privileges required." }, { status: 403 }); // 403 Forbidden
        }
        console.log(`Admin access granted for user: ${currentUser.email}`);


        // Fetch all users with counts of related files
        const usersWithCounts = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                firstName: true, 
                role: true,
                createdAt: true,
                status: true,
                _count: { 
                  select: {
                    filesUploaded: true, // Counts files where this user is the uploader
                    filesReceived: true, // Counts files where this user is the recipient
                  },
                },
            },
            orderBy: {
                createdAt: 'desc', 
            },
        });

        console.log(`Found ${usersWithCounts.length} users for admin summary.`);

        // Return the data
        return NextResponse.json({ success: true, users: usersWithCounts }, { status: 200 });

    } catch (error: any) {
        console.error("Error fetching user summary:", error);
        // Handle potential Prisma errors or other issues
         return NextResponse.json({ success: false, error: "Failed to fetch user summary." }, { status: 500 });
    }
}