// File Path: context/UserContext.tsx

"use client"; 

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';


interface UserProfile {
    id: string; 
    email: string;
    firstName?: string | null;
    role?: string | null;
}


interface UserContextType {
    user: UserProfile | null; 
    isLoading: boolean; 
    refetchUser: () => Promise<void>; 
}


const UserContext = createContext<UserContextType | undefined>(undefined);


interface UserProviderProps {
    children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true); // Start true on initial load/mount


    const fetchUser = useCallback(async () => {

        try {
            const res = await fetch('/api/users/me'); 

            if (res.ok) {
                const data = await res.json();
                if (data.success && data.user) {
                    setUser(data.user);
                    // console.log('UserContext: User data loaded', data.user);
                } else {
                    // API call okay, but no user returned (e.g., logged out)
                    setUser(null);
                    // console.log('UserContext: No user session found.');
                }
            } else {
                // Handle non-OK responses (e.g., 401 Unauthorized, 500)
                console.error('UserContext: Failed to fetch user data, status:, ${res.status}');
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