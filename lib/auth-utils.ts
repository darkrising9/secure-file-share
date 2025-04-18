

import { NextRequest } from 'next/server';
import { jwtVerify, JWTPayload } from 'jose'; // Using jose for JWT verification
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- JWT Configuration ---
const JWT_SECRET = process.env.JWT_SECRET;

// Critical check for the secret key needed to verify tokens
if (!JWT_SECRET) {
    console.error("FATAL ERROR: Missing JWT_SECRET environment variable. Authentication cannot function.");
    throw new Error("Missing JWT_SECRET environment variable. Authentication cannot function.");
}

// Prepare the key for jose library (expects Uint8Array)
let secretKey: Uint8Array;
try {
    secretKey = new TextEncoder().encode(JWT_SECRET);
} catch (err) {
    console.error("Failed to encode JWT_SECRET: ", err);
    throw new Error("Failed to encode JWT_SECRET.");
}


// --- JWT Payload Structure ---
// IMPORTANT: This interface MUST match the payload structure you create
//            in your /api/login route when signing the token!
interface UserJwtPayload extends JWTPayload {
    id: string; // From your login API: user.id (make sure this is *string* in your code!)
    email?: string; // From your login API: user.email (optional here if fetching anyway)
    role?: string; // From your login API: user.role (optional here)
    // Add any other fields you included in the JWT payload during login
}


/**
 * Verifies the JWT token stored in the "token" HttpOnly cookie
 * from the incoming request and retrieves the corresponding user from the database.
 *
 * @param request - The NextRequest object containing headers and cookies.
 * @returns A Promise resolving to the user object { id: string, email: string } if authentication
 * is successful and the user exists, otherwise returns null.
 */
export async function getCurrentUser(request: NextRequest): Promise<{ id: string; email: string; role: string } | null> {

    // 1. Extract the token from the HttpOnly cookie named "token"
    const token = request.cookies.get("token")?.value;

    if (!token) {
        // No token cookie found, user is not logged in or cookie was cleared
        // console.log("Auth cookie \'token\' not found."); // Optional logging
        return null;
    }

    try {
        // 2. Verify the JWT using jose and the secret key
        // This checks the signature and expiry date automatically
        const { payload } = await jwtVerify<UserJwtPayload>(token, secretKey);

        // 3. Validate payload structure (ensure 'id' exists and is a string)
        const userId = payload.id;
        if (!userId || typeof userId !== 'string') {
            console.error("Invalid JWT payload structure: 'id' missing or not a string.", payload);
            return null;
        }
        const userRoleFromToken=payload.role;
        // 4. (Recommended) Fetch the user from the database using the ID from the token
        // This ensures the user still exists and you have their current details.
        const user = await prisma.user.findUnique({
            where: { id: userId }, // Pass the string ID directly
            select: { id: true, email: true, role: true }, // Select only the fields needed
        });

        if (!user) {
            // User existed when token was created, but doesn't exist now
            console.log(`User with ID ${userId} from token not found in database.`);
            return null;
        }

        // 5. Authentication successful, return user data
        return user;

    } catch (error: any) {
        // Handle common JWT verification errors
        if (error.code === 'ERR_JWT_EXPIRED') { console.log("Authentication failed: Token expired."); }
        else if (error.code === 'ERR_JWS_INVALID' || error.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') { console.log("Authentication failed: Token signature invalid."); }
        else { console.error("An unexpected error occurred during token verification:", error.message); }
        // Any error during verification means the user is not authenticated
        return null;
    }
}