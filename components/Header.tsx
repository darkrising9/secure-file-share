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

// Helper function for Avatar initials
const getInitials = (firstName?: string | null, email?: string): string => {
    if (firstName) {
        const names = firstName.split(' ');
        if (names.length > 1) {
            return `<span class="math-inline">\{names\[0\]\[0\]\}</span>{names[names.length - 1][0]}`.toUpperCase();
        }
        return firstName.substring(0, 2).toUpperCase();
    }
    if (email) {
        return email.substring(0, 2).toUpperCase();
    }
    return "??";
};


export function Header() {
  const { user, isLoading } = useUser(); // Get user state from context
  const router = useRouter();

  const handleLogout = async () => {
    console.log("Attempting logout via profile dropdown...");
    try {
      await fetch("/api/logout", { method: "GET" }); // Call backend to clear cookie
    } catch (error) {
      console.error("Error calling logout API:", error);
    } finally {
      // Redirect to homepage/login page after attempting logout
      router.push("/");
      // Optional: could force reload if state isn't updating reliably after push
      // window.location.href = '/';
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
          {/* Show different nav links based on auth state potentially */}
          

          {/* Profile Dropdown Area */}
          <div className="flex items-center">
            {isLoading ? (
              // Loading State Placeholder
              <div className="flex items-center justify-center h-9 w-9">
                 <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : user ? (
              // User Logged In: Dropdown Menu
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9 border"> {/* Added border */}
                      {/* If you add user.imageUrl to UserProfile and API: */}
                      {/* <AvatarImage src={user.imageUrl || undefined} alt={user.name || user.email} /> */}
                      <AvatarFallback>{getInitials(user.firstName, user.email)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none truncate" title={user.firstName || user.email}>
                        {user.firstName || user.email} {/* Show name or email */}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground truncate" title={user.email}>
                        {user.email}
                      </p>
                      {user.role && (
                         <p className="text-xs leading-none text-muted-foreground capitalize pt-1">
                            Role: {user.role}
                         </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/dashboard">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // User Logged Out: Login Button
              <Link href="/login">
                <Button variant="outline" size="sm">Login</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}