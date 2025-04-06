"use client"

import * as React from "react"
import { useId } from "react"
import { Shield, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
// Removed DatePicker import as it wasn't used in the upload action
import { useToast } from "@/components/ui/use-toast" // Assuming this path is correct

// --- MODIFICATION 1: Update Prop Types ---
interface FileUploadCardProps {
  onUploadComplete: (file: File, email: string) => void; // Expect File object
  isUploading: boolean; // Receive loading state from parent
}

// Use updated props
export function FileUploadCard({ onUploadComplete, isUploading }: FileUploadCardProps) {
  const fileInputId = useId()
  const emailInputId = useId()

  const [file, setFile] = React.useState<File | null>(null)
  const [email, setEmail] = React.useState("")
  // Removed expiryDate state - wasn't used in API call
  // Removed isUploading state - now controlled by parent via props

  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    } else {
       setFile(null); // Clear if no file selected
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
  }

  // --- MODIFICATION 2: Simplify Handler ---
  // Renamed, removed async, removed simulation
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
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

    // Log what's being passed (optional, good for debugging)
    console.log("FileUploadCard: Calling onUploadComplete with File:", file, "and Email:", email);

    // Call parent's handler with the actual File object and email
    onUploadComplete(file, email)
  }

  return (
    // Use the simplified handler
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor={fileInputId}>Select File</Label>
        <Input id={fileInputId} type="file" onChange={handleFileChange} className="cursor-pointer" disabled={isUploading}/>
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
          disabled={isUploading} // Disable during upload
        />
        <p className="text-sm text-gray-500">The recipient will receive an email with a secure download link.</p>
      </div>

      {/* Removed Date Picker input - simplify component */}
      {/* <div className="space-y-2">...</div> */}

      <Alert>
         <Shield className="h-4 w-4" />
         <AlertTitle>Secure Sharing</AlertTitle>
         <AlertDescription>
           Your file will be encrypted before storage and can only be accessed by the intended recipient.
         </AlertDescription>
      </Alert>

      {/* --- MODIFICATION 3: Use isUploading prop --- */}
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