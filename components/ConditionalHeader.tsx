// File Path: components/layout/ConditionalHeader.tsx

"use client";

import Link from "next/link"; // Import Link for the guest header
import { usePathname } from 'next/navigation';
import { Header } from './Header'; // Import your main shared Header (with profile)
import { Shield } from "lucide-react"; // Import Shield icon for guest header

/**
 * A wrapper component that conditionally renders one of two headers
 * based on the current route pathname.
 * - Renders a simple "Guest" header for specific public routes.
 * - Renders the main application Header for all other routes.
 */
export function ConditionalHeader() {
  const pathname = usePathname();

  // --- Define routes where the simple "Guest" header should be shown ---
  // Typically public-facing pages like home, login, register
  const routesForGuestHeader = [
    '/',         // Homepage
    '/login',    // Login page
    '/register', // Register page
    // Add any other paths that should show the simple header
  ];
  // --- ---

  // Check if the current path is one that should display the guest header
  const showGuestHeader = routesForGuestHeader.includes(pathname);

  // Log decision for debugging (optional)
  // console.log(`ConditionalHeader: Path='${pathname}', ShowGuestHeader=${showGuestHeader}`);

  //console.log(`ConditionalHeader: Path='<span class="math-inline">\{pathname\}', ShowGuestHeader\=</span>{showGuestHeader}`);


  if (showGuestHeader) {
    // --- Render the Simple "Guest" Header ---
    return (
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10"> {/* Added sticky/blur like main header */}
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          {/* Logo/Title */}
          <div className="flex items-center gap-2 font-bold text-xl">
            <Shield className="h-6 w-6" />
            <span>SecureShare</span>
          </div>
          {/* Guest Navigation */}
          <nav className="flex gap-4 sm:gap-6">
            <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-primary">
              Home
            </Link>
            <Link href="/register" className="text-sm font-medium text-muted-foreground hover:text-primary">
              Register
            </Link>
             <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary">
              Login {/* Added Login link */}
            </Link>
          </nav>
        </div>
      </header>
    );
    // --- End Guest Header ---
  } else {
    // --- Render the Main Application Header (with profile dropdown etc.) ---
    return <Header />;
  }
}