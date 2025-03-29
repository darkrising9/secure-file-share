"use client"
import { useState, useCallback } from "react"
import Link from "next/link"
import { Shield, Download, ArrowLeft, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

export default function DownloadPage({ params }: { params: { id: string } }) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadComplete, setDownloadComplete] = useState(false)
  const { toast } = useToast()

  // This would normally come from your API
  const fileDetails = {
    name: "Lecture_Notes.pdf",
    size: "2.4 MB",
    uploadedBy: "teacher@example.com",
    uploadedAt: "2023-03-15",
  }

  const handleDownload = useCallback(async () => {
    setIsDownloading(true)

    // Simulate file download and decryption
    // In a real implementation, this would be a fetch request to your API
    setTimeout(() => {
      setIsDownloading(false)
      setDownloadComplete(true)

      toast({
        title: "File downloaded successfully",
        description: "The file has been decrypted and downloaded",
      })
    }, 2000)
  }, [toast])

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Shield className="h-6 w-6" />
            <span>SecureShare</span>
          </div>
          <nav className="flex gap-4 sm:gap-6">
            <Link href="/" className="text-sm font-medium hover:underline underline-offset-4">
              Home
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 container max-w-4xl py-12 px-4 md:px-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium mb-6 hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Secure File Download</CardTitle>
            <CardDescription>This file has been securely shared with you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center p-12 border rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-primary" />
                <h3 className="text-xl font-bold">{fileDetails.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {fileDetails.size} • Shared by {fileDetails.uploadedBy}
                </p>
              </div>
            </div>

            {!downloadComplete ? (
              <Button onClick={handleDownload} className="w-full" disabled={isDownloading}>
                {isDownloading ? (
                  <>
                    <Download className="mr-2 h-4 w-4 animate-spin" />
                    Decrypting & Downloading...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download & Decrypt
                  </>
                )}
              </Button>
            ) : (
              <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900">
                <AlertTitle className="text-green-800 dark:text-green-300">Download Complete</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-400">
                  Your file has been decrypted and downloaded successfully.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-2 items-start">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p className="font-medium">Security Information:</p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>This file was encrypted using AES-256 encryption</li>
                <li>This download link will expire soon for security</li>
                <li>If you didn't request this file, please contact the sender</li>
              </ul>
            </div>
          </CardFooter>
        </Card>
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

