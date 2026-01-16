// File Path: lib/logger.ts

import { ActionType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * Creates an entry in the ActivityLog table.
 * Fire-and-forget: do not throw; failures are logged to console only.
 *
 * @param actorEmail - The email of the user performing the action.
 * @param action - The type of action from the ActionType enum.
 * @param details - Optional descriptive string for the log entry.
 * @param ipAddress - Optional IP address of the client.
 */
export async function logActivity(
    actorEmail: string,
    action: ActionType,
    details?: string,
    ipAddress?: string
): Promise<void> {
    try {
        await prisma.activityLog.create({
            data: {
                actorEmail,
                action,
                details,
                ipAddress,
            },
        });
    } catch (error) {
        console.error("--- Activity Logging Failed ---");
        console.error(`Failed to log activity: { actor: ${actorEmail}, action: ${action}, ip: ${ipAddress ?? 'n/a'} }`);
        console.error(error);
        console.error("--- End of Logging Error ---");
    }
}
