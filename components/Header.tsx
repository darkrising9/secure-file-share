// File Path: components/layout/Header.tsx

"use client"; // This component needs client-side hooks (useUser, useRouter)

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext"; // Import the context hook
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, LayoutDashboard, User as UserIcon, Loader2, Shield, Upload } from "lucide-react";

// Helper function for Avatar initials (using firstName)
const getInitials = (firstName?: string | null, email?: string): string => {
    if (firstName) {
        const names = firstName.trim().split(' ');
        if (names.length > 1 && names[names.length - 1]) {
            return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        }
        return firstName.substring(0, 2).toUpperCase();
    }
    if (email) {
        return email.substring(0, 2).toUpperCase();
    }
    return "??";
};


export function Header() {
  const { user, isLoading, refetchUser } = useUser(); // Get user state from context
  const router = useRouter();

  const handleLogout = async () => {
    console.log("Attempting logout via profile dropdown...");
    try {
        const res = await fetch("/api/logout", { method: "GET" });
        if (res.ok) {
            console.log("Logout API successful, refetching user context...");
            // --- VVV Call refetchUser on Success VVV ---
            await refetchUser(); // Call the function from context
            console.log("User context refetched after logout.");
            // --- ^^^ Call refetchUser on Success ^^^ ---
        } else {
             console.error("Logout API call failed:", res.status);
             // Optional: Show error toast
        }
    } catch (error) {
      console.error("Error calling logout API:", error);
      // Optional: Show error toast
    } finally {
      router.push("/"); // Redirect after attempting logout and refetch
    }
  };

  return (
    <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo/Title (Left Side) */}
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 font-bold text-xl">
            <Shield className="h-6 w-6" />
            <span>SecureShare</span>
        </Link>

        {/* Navigation & Profile Section (Right Side) */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* --- VVV Added Logged-in Nav Links VVV --- */}
          {/* Show Upload/Dashboard links in main nav only if user is logged in */}
           {/* --- ^^^ Added Logged-in Nav Links ^^^ --- */}

          {/* Profile / Auth Area */}
          <div className="flex items-center">
            {isLoading ? (
               // Loading State Placeholder
               <div className="flex items-center justify-center h-9 w-9"> <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> </div>
            ) : user ? (
               // User Logged In: Dropdown Menu
               <DropdownMenu>
                   <DropdownMenuTrigger asChild>
                       <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                           <Avatar className="h-9 w-9 border">
                               <AvatarFallback>{getInitials(user.firstName, user.email)}</AvatarFallback>
                           </Avatar>
                       </Button>
                   </DropdownMenuTrigger>
                   <DropdownMenuContent className="w-56" align="end" forceMount>
                       <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                               <p className="text-sm font-medium leading-none truncate" title={user.firstName || user.email}> {user.firstName || user.email} </p>
                               <p className="text-xs leading-none text-muted-foreground truncate" title={user.email}> {user.email} </p>
                               {user.role && ( <p className="text-xs leading-none text-muted-foreground capitalize pt-1"> Role: {user.role} </p> )}
                           </div>
                       </DropdownMenuLabel>
                       <DropdownMenuSeparator />

                       {/* --- VVV Conditional Dashboard Link based on Role VVV --- */}
                       {user?.role === 'admin' ? (
                         // Link for Admins
                         <DropdownMenuItem asChild className="cursor-pointer">
                           <Link href="/admin/dashboard"> {/* Points to Admin path */}
                             <LayoutDashboard className="mr-2 h-4 w-4" />
                             <span>Admin Dashboard</span> {/* Specific text */}
                           </Link>
                         </DropdownMenuItem>
                       ) : (
                         // Link for non-Admins (Teachers, Students, etc.)
                         <DropdownMenuItem asChild className="cursor-pointer">
                           <Link href="/dashboard"> {/* Points to regular path */}
                             <LayoutDashboard className="mr-2 h-4 w-4" />
                             <span>Dashboard</span> {/* Generic text */}
                           </Link>
                         </DropdownMenuItem>
                       )}
                       {/* --- ^^^ Conditional Dashboard Link based on Role ^^^ --- */}

                       <DropdownMenuItem disabled> {/* Settings Link */}
                         <UserIcon className="mr-2 h-4 w-4" />
                         <span>Settings</span>
                       </DropdownMenuItem>
                       <DropdownMenuSeparator />
                       <DropdownMenuItem onSelect={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer">
                           <LogOut className="mr-2 h-4 w-4" />
                           <span>Log out</span>
                       </DropdownMenuItem>
                   </DropdownMenuContent>
               </DropdownMenu>
            ) : (
               // Logged Out State - Login/Register buttons
               <div className="flex items-center gap-2">
                   <Link href="/register">
                       <Button variant="outline" size="sm">Register</Button>
                   </Link>
                   <Link href="/login">
                       <Button variant="default" size="sm">Login</Button>
                   </Link>
               </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}