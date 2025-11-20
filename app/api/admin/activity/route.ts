// File Path: app/api/admin/activity/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth-utils';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
    try {
        // 1. Authenticate the user and authorize as Admin
        const currentUser = await getCurrentUser(request);
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ success: false, error: "Access Denied" }, { status: 403 });
        }

        // 2. Fetch the most recent log entries from the database
        // We'll take the latest 100 for now. You could add pagination later.
        const activityLogs = await prisma.activityLog.findMany({
            take: 100,
            orderBy: {
                createdAt: 'desc', // Get the newest logs first
            },
        });

        // 3. Return the logs in the response
        return NextResponse.json({ success: true, logs: activityLogs }, { status: 200 });

    } catch (error) {
        console.error("Error fetching activity logs:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch activity logs." }, { status: 500 });
    }
}