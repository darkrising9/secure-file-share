"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Shield, Upload, FileText, ExternalLink, XCircle, Clock, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Mock data for demonstration
const mockFiles = [
  {
    id: "file1",
    name: "Lecture_Notes_Week1.pdf",
    size: "2.4 MB",
    uploadedAt: "2023-03-15T10:30:00",
    recipient: "student1@example.com",
    expiresAt: "2023-04-15T10:30:00",
    status: "active",
  },
  {
    id: "file2",
    name: "Assignment_Instructions.docx",
    size: "1.2 MB",
    uploadedAt: "2023-03-10T14:20:00",
    recipient: "class@example.com",
    expiresAt: "2023-04-10T14:20:00",
    status: "active",
  },
  {
    id: "file3",
    name: "Course_Syllabus.pdf",
    size: "3.5 MB",
    uploadedAt: "2023-02-28T09:15:00",
    recipient: "department@example.com",
    expiresAt: "2023-03-28T09:15:00",
    status: "expired",
  },
  {
    id: "file4",
    name: "Research_Paper_Draft.docx",
    size: "4.7 MB",
    uploadedAt: "2023-03-05T16:45:00",
    recipient: "colleague@example.com",
    expiresAt: "2023-04-05T16:45:00",
    status: "revoked",
  },
]

export default function DashboardPage() {
  const [files, setFiles] = useState(mockFiles)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const { toast } = useToast()
  const router = useRouter()

  // Function to delete the auth token from cookies and logout
  const handleLogout = () => {
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;" // Clear the token cookie
    router.push("/") // Redirect to login page
  }

  // Filter files based on search term and active tab
  const filteredFiles = React.useMemo(() => {
    return files
      .filter(
        (file) =>
          file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          file.recipient.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      .filter((file) => {
        if (activeTab === "all") return true
        if (activeTab === "active") return file.status === "active"
        if (activeTab === "expired") return file.status === "expired"
        if (activeTab === "revoked") return file.status === "revoked"
        return true
      })
  }, [files, searchTerm, activeTab])

  const handleRevokeLink = (fileId: string) => {
    setFiles((prevFiles) => prevFiles.map((file) => (file.id === fileId ? { ...file, status: "revoked" } : file)))

    toast({
      title: "Link revoked",
      description: "The download link has been successfully revoked",
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>
      case "expired":
        return <Badge variant="secondary">Expired</Badge>
      case "revoked":
        return <Badge variant="destructive">Revoked</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Shield className="h-6 w-6" />
            <span>SecureShare</span>
          </div>
          <nav className="flex gap-4 sm:gap-6">
            <Link href="/upload" className="text-sm font-medium hover:underline underline-offset-4">
              Upload
            </Link>
            <Link
              href="/"
              className="text-sm font-medium hover:underline underline-offset-4"
              onClick={async (e) => {
                e.preventDefault(); // Prevent default navigation
                await fetch("/api/logout", { method: "GET" }); // Call logout API
                router.push("/"); // Redirect to homepage
              }}
            >
              Logout
            </Link>

          </nav>
        </div>
      </header>
      <main className="flex-1 container py-12 px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage your secure file shares and download links</p>
          </div>
          <Link href="/upload">
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload New File
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle>Your Shared Files</CardTitle>
                <CardDescription>View and manage all your encrypted file shares</CardDescription>
              </div>
              <div className="w-full md:w-auto">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Search files or recipients..."
                    className="pl-8 w-full md:w-[260px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">All Files</TabsTrigger>
                <TabsTrigger value="active">Active Links</TabsTrigger>
                <TabsTrigger value="expired">Expired</TabsTrigger>
                <TabsTrigger value="revoked">Revoked</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-0">
                {filteredFiles.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>File Name</TableHead>
                          <TableHead>Recipient</TableHead>
                          <TableHead className="hidden md:table-cell">Uploaded</TableHead>
                          <TableHead className="hidden md:table-cell">Expires</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredFiles.map((file) => (
                          <TableRow key={file.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-gray-500" />
                                <span className="truncate max-w-[150px] md:max-w-[200px]">{file.name}</span>
                              </div>
                              <span className="text-xs text-gray-500 md:hidden block mt-1">{file.size}</span>
                            </TableCell>
                            <TableCell>{file.recipient}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-gray-500" />
                                {formatDate(file.uploadedAt)}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{formatDate(file.expiresAt)}</TableCell>
                            <TableCell>{getStatusBadge(file.status)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {file.status === "active" && (
                                  <>
                                    <Link href={`/download/${file.id}`} target="_blank">
                                      <Button variant="outline" size="sm">
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        <span className="sr-only md:not-sr-only md:ml-2">View</span>
                                      </Button>
                                    </Link>
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button variant="outline" size="sm">
                                          <XCircle className="h-3.5 w-3.5" />
                                          <span className="sr-only md:not-sr-only md:ml-2">Revoke</span>
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>Revoke Download Link</DialogTitle>
                                          <DialogDescription>
                                            Are you sure you want to revoke this download link? This action cannot be
                                            undone.
                                          </DialogDescription>
                                        </DialogHeader>
                                        <div className="py-4">
                                          <div className="flex items-center gap-2 mb-2">
                                            <FileText className="h-4 w-4 text-gray-500" />
                                            <span className="font-medium">{file.name}</span>
                                          </div>
                                          <p className="text-sm text-gray-500">Shared with: {file.recipient}</p>
                                        </div>
                                        <DialogFooter>
                                          <Button variant="outline" onClick={() => { }}>
                                            Cancel
                                          </Button>
                                          <Button variant="destructive" onClick={() => handleRevokeLink(file.id)}>
                                            Revoke Link
                                          </Button>
                                        </DialogFooter>
                                      </DialogContent>
                                    </Dialog>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium">No files found</h3>
                    <p className="text-sm text-gray-500 mt-1 mb-4 max-w-md">
                      {searchTerm
                        ? "No files match your search criteria. Try a different search term."
                        : "You haven't shared any files yet or all files have been filtered out."}
                    </p>
                    {!searchTerm && (
                      <Link href="/upload">
                        <Button>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Your First File
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
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

