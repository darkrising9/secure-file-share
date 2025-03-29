"use client"

import * as React from "react"
import { useId } from "react"
import { Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

interface DownloadLinkCardProps {
  downloadLink: string
  email: string
  onReset: () => void
}

export function DownloadLinkCard({ downloadLink, email, onReset }: DownloadLinkCardProps) {
  // Using useId for accessibility - React 18 feature
  const linkInputId = useId()
  const { toast } = useToast()

  const copyToClipboard = React.useCallback(() => {
    navigator.clipboard.writeText(downloadLink)
    toast({
      title: "Link copied to clipboard",
      description: "The secure download link has been copied and is ready to share",
    })
  }, [downloadLink, toast])

  return (
    <div className="space-y-6">
      <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900">
        <AlertTitle className="text-green-800 dark:text-green-300">Upload Complete</AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-400">
          Your file has been encrypted and uploaded successfully. An email notification has been sent to {email}.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
          <Label htmlFor={linkInputId} className="text-base font-medium mb-2 block">
            Secure Download Link
          </Label>
          <div className="flex gap-2">
            <Input id={linkInputId} value={downloadLink} readOnly className="flex-1" />
            <Button onClick={copyToClipboard} className="min-w-[100px]">
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Share this link with {email} to give them access to the encrypted file.
          </p>
        </div>
      </div>

      <Button onClick={onReset} className="w-full">
        Upload Another File
      </Button>
    </div>
  )
}

