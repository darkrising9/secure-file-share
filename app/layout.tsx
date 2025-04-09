import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { UserProvider } from "@/context/UserContext"
import { Toaster } from "@/components/ui/toaster";
import { Header } from "@/components/Header"; // --- VVV IMPORT Header VVV ---

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SecureShare - Encrypted File Sharing",
  description: "A secure, encrypted file-sharing system", // Shortened description slightly
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* --- VVV Added flex layout for potential sticky footer VVV --- */}
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <UserProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {/* --- VVV Render Header Here VVV --- */}
            <Header />
            {/* --- ^^^ Render Header Here ^^^ --- */}

            {/* --- VVV Wrap children in main tag for content VVV --- */}
            <main className="flex-1"> {/* flex-1 allows main content to grow */}
                {children}
            </main>
            {/* --- ^^^ Wrap children in main tag ^^^ --- */}

            {/* Optional: Add a shared Footer component here if desired */}

            <Toaster />
          </ThemeProvider>
        </UserProvider>
      </body>
    </html>
  )
}