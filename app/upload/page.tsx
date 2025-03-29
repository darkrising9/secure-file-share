"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card"
import { FileUploadCard } from "@/components/file-upload-card"
import { DownloadLinkCard } from "@/components/download-link-card"
import { ArrowLeft, Shield } from "lucide-react"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"

export default function UploadPage() {
  const [uploadComplete, setUploadComplete] = useState(false)
  const [downloadLink, setDownloadLink] = useState("")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [isUploading, setIsUploading] = useState(false)

  // ✅ Handle File Upload and API Call
  const handleFileUpload = async (file: File, email: string) => {
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file to upload.",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("email", email)

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to upload file.")
      }

      const data = await response.json()
      setDownloadLink(data.downloadUrl)
      setRecipientEmail(email)
      setUploadComplete(true)

      toast({
        title: "Success",
        description: "File uploaded and encrypted successfully!",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // ✅ Reset Upload Form
  const handleReset = () => {
    setUploadComplete(false)
    setDownloadLink("")
    setRecipientEmail("")
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* ✅ Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Shield className="h-6 w-6" />
            <span>SecureShare</span>
          </div>
          <nav className="flex gap-4 sm:gap-6">
            <Link href="/dashboard" className="text-sm font-medium hover:underline underline-offset-4">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      {/* ✅ Main Content */}
      <main className="flex-1 container max-w-4xl py-12 px-4 md:px-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium mb-6 hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Upload & Share File</CardTitle>
            <CardDescription>
              Files are encrypted with AES-256 and stored securely on the server.
            </CardDescription>
          </CardHeader>

          {/* ✅ Upload or Download Card */}
          <CardContent>
            {!uploadComplete ? (
              <FileUploadCard onUploadComplete={handleFileUpload} isUploading={isUploading} />
            ) : (
              <DownloadLinkCard downloadLink={downloadLink} email={recipientEmail} onReset={handleReset} />
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-2 items-start">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p className="font-medium">Security Information:</p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Files are encrypted using AES-256 encryption</li>
                <li>Download links expire after the specified date</li>
                <li>All file transfers are logged for security purposes</li>
              </ul>
            </div>
          </CardFooter>
        </Card>
      </main>

      {/* ✅ Footer */}
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
