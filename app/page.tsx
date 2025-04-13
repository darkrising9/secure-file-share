import Link from "next/link"
import { Shield, Lock, Mail, Database } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
 
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Secure File Sharing – Safe & Encrypted
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  A simple, secure, and encrypted file-sharing system for teachers and students. Protect your files and
                  share them safely.
                </p>
              </div>
              <div className="mx-auto w-full max-w-sm space-y-2">
                <Link href="/upload">
                  <Button className="w-full" size="lg">
                    Upload a File
                  </Button>
                </Link>
                <p className="text-xs text-gray-500 dark:text-gray-400">Login required to upload files.</p>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-800">
          <div className="container px-4 md:px-6">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col items-center space-y-2 border rounded-lg p-6 bg-white dark:bg-gray-950">
                <Lock className="h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold">Secure Encryption</h3>
                <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                  AES-256 encryption for all uploaded files ensures your data remains secure.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 border rounded-lg p-6 bg-white dark:bg-gray-950">
                <Shield className="h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold">Role-Based Access</h3>
                <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                  Strict access controls for your files. 
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 border rounded-lg p-6 bg-white dark:bg-gray-950">
                <Mail className="h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold">Email Notifications</h3>
                <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                  Recipients get notified instantly when a file is shared with them.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 border rounded-lg p-6 bg-white dark:bg-gray-950">
                <Database className="h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold">Local Storage</h3>
                <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                  No cloud dependency. Files stay on your server for maximum control.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row px-4 md:px-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} SecureShare. All rights reserved.
          </p>
          <nav className="flex gap-4 sm:gap-6">
            <Link href="#" className="text-sm font-medium hover:underline underline-offset-4">
              Privacy Policy
            </Link>
            <Link href="#" className="text-sm font-medium hover:underline underline-offset-4">
              Terms of Service
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

