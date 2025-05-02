import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { UserProvider } from "@/context/UserContext"
import { Toaster } from "@/components/ui/toaster";
import { Header } from "@/components/Header"; 

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SecureShare - Encrypted File Sharing",
  description: "A secure, encrypted file-sharing system", 
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <UserProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >

            <Header />



            <main className="flex-1"> 
                {children}
            </main>




            <Toaster />
          </ThemeProvider>
        </UserProvider>
      </body>
    </html>
  )
}