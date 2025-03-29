"use client"

import * as React from "react"
import { useId } from "react"
import { Shield, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DatePicker } from "@/components/date-picker"
import { useToast } from "@/hooks/use-toast"

interface FileUploadCardProps {
  onUploadComplete: (downloadLink: string, email: string) => void
}

export function FileUploadCard({ onUploadComplete }: FileUploadCardProps) {
  // Using useId for accessibility - React 18 feature
  const fileInputId = useId()
  const emailInputId = useId()

  const [file, setFile] = React.useState<File | null>(null)
  const [email, setEmail] = React.useState("")
  const [expiryDate, setExpiryDate] = React.useState<Date | undefined>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default: 7 days from now
  )
  const [isUploading, setIsUploading] = React.useState(false)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
  }

  const handleExpiryDateChange = (date: Date | undefined) => {
    setExpiryDate(date)
  }

  const handleUpload = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!file) {
        toast({
          title: "No file selected",
          description: "Please select a file to upload",
          variant: "destructive",
        })
        return
      }

      if (!email) {
        toast({
          title: "No recipient",
          description: "Please enter a recipient email address",
          variant: "destructive",
        })
        return
      }

      setIsUploading(true)

      // Simulate file upload with encryption
      // In a real implementation, this would be a fetch request to your API
      setTimeout(() => {
        // Generate a fake secure download link
        const secureLink = `${window.location.origin}/download/${Math.random().toString(36).substring(2, 15)}`
        setIsUploading(false)

        toast({
          title: "File uploaded successfully",
          description: "The recipient will be notified via email",
        })

        onUploadComplete(secureLink, email)
      }, 2000)
    },
    [file, email, toast, onUploadComplete],
  )

  return (
    <form onSubmit={handleUpload} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor={fileInputId}>Select File</Label>
        <Input id={fileInputId} type="file" onChange={handleFileChange} className="cursor-pointer" />
        {file && (
          <p className="text-sm text-gray-500">
            Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={emailInputId}>Recipient Email</Label>
        <Input
          id={emailInputId}
          type="email"
          placeholder="recipient@example.com"
          value={email}
          onChange={handleEmailChange}
        />
        <p className="text-sm text-gray-500">The recipient will receive an email with a secure download link.</p>
      </div>

      <div className="space-y-2">
        <Label>Expiration Date</Label>
        <DatePicker date={expiryDate} onSelect={handleExpiryDateChange} />
        <p className="text-sm text-gray-500">The link will expire after this date for security purposes.</p>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Secure Sharing</AlertTitle>
        <AlertDescription>
          Your file will be encrypted before storage and can only be accessed by the intended recipient.
        </AlertDescription>
      </Alert>

      <Button type="submit" className="w-full" disabled={isUploading}>
        {isUploading ? (
          <>
            <Upload className="mr-2 h-4 w-4 animate-spin" />
            Encrypting & Uploading...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Upload & Encrypt
          </>
        )}
      </Button>
    </form>
  )
}

