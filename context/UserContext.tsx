// File Path: context/UserContext.tsx

"use client"; // Provider component manages state client-side

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

// Define the shape of the user data you want accessible via context
// Ensure this matches the fields returned by /api/users/me
interface UserProfile {
    id: string; // Assuming User ID is string (CUID/UUID) based on previous errors
    email: string;
    firstName?: string | null;
    role?: string | null;
    // Add other fields as needed
}

// Define the context value type
interface UserContextType {
    user: UserProfile | null; // Currently logged-in user or null
    isLoading: boolean; // True while initially fetching user data
    refetchUser: () => Promise<void>; // Function to manually trigger a refetch
}

// Create the context
const UserContext = createContext<UserContextType | undefined>(undefined);

// Create the Provider component
interface UserProviderProps {
    children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true); // Start true on initial load/mount

    // Define the fetching logic as a reusable function
    const fetchUser = useCallback(async () => {
        // Don't refetch if already loading
        // Note: You might want more sophisticated caching/deduping in complex apps
        // if (!isLoading) { setIsLoading(true); } // Re-enable loading state on manual refetch

        try {
            const res = await fetch('/api/users/me'); // Fetch from the endpoint created in Step 1

            if (res.ok) {
                const data = await res.json();
                if (data.success && data.user) {
                    setUser(data.user); // Set user data if successful
                    // console.log('UserContext: User data loaded', data.user);
                } else {
                    // API call okay, but no user returned (e.g., logged out)
                    setUser(null);
                    // console.log('UserContext: No user session found.');
                }
            } else {
                // Handle non-OK responses (e.g., 401 Unauthorized, 500)
                console.error('UserContext: Failed to fetch user data, status:', res.status);
                setUser(null);
            }
        } catch (error) {
            console.error("UserContext: Error fetching user data:", error);
            setUser(null); // Ensure user is null on error
        } finally {
            // Only set loading to false once after the fetch attempt
            if (isLoading) { setIsLoading(false); }
        }
    }, [isLoading]); // Include isLoading dependency for the initial loading flag check

    // Fetch user on initial mount
    useEffect(() => {
        console.log('UserProvider mounted, fetching initial user data...');
        fetchUser();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array ensures this runs only once on mount

    // Prepare the value to be provided by the context
    const value = {
        user,
        isLoading,
        refetchUser: fetchUser // Expose the fetch function for manual refetch (e.g., after login)
     };

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

// Custom hook for easy consumption of the context in other components
export const useUser = (): UserContextType => {
    const context = useContext(UserContext);
    if (context === undefined) {
        // This error means you tried to use the context outside of its provider
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};