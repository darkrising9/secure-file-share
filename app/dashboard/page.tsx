// File Path: app/dashboard/page.tsx

"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from "react" // Import necessary hooks
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Shield, Upload, FileText, ExternalLink, XCircle, Clock, Search, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card" // Added CardFooter import
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast" // Ensure path is correct
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose, // Import DialogClose for the Cancel button
} from "@/components/ui/dialog"

// Define the structure of the data expected from the /api/files/shared endpoint
// Consider moving this to a shared types file (e.g., types/index.ts)
interface SharedFileData {
    id: number; // Or string if your User ID is string and used here
    fileName: string;
    size: number;
    createdAt: string | Date;
    recipientEmail: string;
    tokenExpiresAt: string | Date | null;
    downloadToken: string | null;
    status: 'active' | 'expired' | 'revoked';
}

export default function DashboardPage() {
  // --- State Management ---
  const [files, setFiles] = useState<SharedFileData[]>([]) // Holds files fetched from API
  const [isLoading, setIsLoading] = useState(true);     // Loading state for fetch
  const [error, setError] = useState<string | null>(null); // Error state for fetch
  const [searchTerm, setSearchTerm] = useState("")       // Search input value
  const [activeTab, setActiveTab] = useState("all")      // Current filter tab
  const [isRevoking, setIsRevoking] = useState<number | null>(null); // ID of file currently being revoked, or null

  const { toast } = useToast()
  const router = useRouter()

  // --- Data Fetching ---
  useEffect(() => {
    const fetchFiles = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/files/shared'); // GET request by default
            // Auth cookie is sent automatically by browser

            const data = await res.json();

            if (!res.ok || !data.success) {
                // Handle potential errors like 401 Unauthorized if cookie is invalid/missing
                throw new Error(data.error || `Failed to fetch shared files (Status: ${res.status})`);
            }

            setFiles(data.files); // Update state with fetched files

        } catch (err: any) {
            console.error("Dashboard fetch error:", err);
            setError(err.message || "Could not load your shared files.");
            // Toast is optional here as the error is displayed in the UI
            // toast({ title: "Error", description: "Could not load your shared files.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    fetchFiles();
  }, []); // Run only once on component mount


  // --- Logout Handler ---
  const handleLogout = async () => {
    console.log("Attempting logout...");
    try {
        const res = await fetch("/api/logout", { method: "GET" }); // Call backend to clear cookie
        if (!res.ok) { console.error("Logout API call failed:", res.status); }
    } catch (error) {
         console.error("Error calling logout API:", error);
    } finally {
        router.push("/"); // Redirect after attempting logout
    }
  };

  // --- Client-Side Filtering ---
  const filteredFiles = useMemo(() => {
    return files
      .filter(
        (file) =>
          file.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          file.recipientEmail.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      .filter((file) => {
        if (activeTab === "all") return true;
        return file.status === activeTab; // Filter based on status from API
      })
  }, [files, searchTerm, activeTab])

  // --- Revoke Link Handler ---
   const handleRevokeLink = async (fileId: number) => { // Expect DB ID
     console.log(`Attempting to revoke link for file ID: ${fileId}`);
     setIsRevoking(fileId); // Set loading state for this specific action

     try {
         const res = await fetch(`/api/files/revoke/${fileId}`, {
             method: 'DELETE', // Or 'PATCH'
             headers: { 'Content-Type': 'application/json' },
         });

         const data = await res.json();

         if (!res.ok || !data.success) { throw new Error(data.error || "Failed to revoke link."); }

         // Update local state on success
         setFiles(prevFiles =>
             prevFiles.map(file =>
                 file.id === fileId
                     ? { ...file, status: 'revoked', downloadToken: null } // Update status/token locally
                     : file
             )
         );

         toast({ title: "Link Revoked", description: "The download link is now inactive." });

     } catch (err: any) {
         console.error("Revoke error:", err);
         toast({ title: "Error Revoking Link", description: err.message || "Could not revoke link.", variant: "destructive"});
     } finally {
         setIsRevoking(null); // Clear loading state
     }
   };


  // --- Helper Functions ---
  const formatDate = (dateInput: string | Date | null) => {
     if (!dateInput) return "Never"; // Display 'Never' if no expiry date
     const date = new Date(dateInput);
     if (isNaN(date.getTime())) return "Invalid Date"; // Handle invalid date strings
     return new Intl.DateTimeFormat("en-US", {
       year: "numeric", month: "short", day: "numeric",
       hour: "2-digit", minute: "2-digit", hour12: true
     }).format(date);
   }

   const formatFileSizeSimple = (bytes: number): string => {
        if (!bytes || bytes === 0) return '0 Bytes'; // Handle null or 0 bytes
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.max(0, Math.floor(Math.log(bytes) / Math.log(k))); // Ensure index is not negative for bytes < 1
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };


   const getStatusBadge = (status: string) => {
     switch (status) {
       case "active": return <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-200">Active</Badge> // Adjusted colors
       case "expired": return <Badge variant="secondary">Expired</Badge>
       case "revoked": return <Badge variant="destructive">Revoked</Badge>
       default: return <Badge variant="outline">Unknown</Badge>
     }
   }

  // --- Render Component ---
  return (
    <div className="flex flex-col min-h-screen">
      {/* ======================== Header ======================== */}
      
      {/* ======================== Main Content ======================== */}
      <main className="flex-1 container py-12 px-4 md:px-6">
        {/* Page Title and Upload Button */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Manage your secure file shares</p>
          </div>
          <Link href="/upload">
            <Button>
              <Upload className="mr-2 h-4 w-4" /> Upload New File
            </Button>
          </Link>
        </div>

        {/* Files Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div> <CardTitle>Your Shared Files</CardTitle> <CardDescription>View and manage shares you created</CardDescription> </div>
               <div className="w-full md:w-auto"> <div className="relative"> <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /> <Input type="search" placeholder="Search files or recipients..." className="pl-8 w-full md:w-[260px]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /> </div> </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Tabs */}
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                 <TabsTrigger value="all">All</TabsTrigger>
                 <TabsTrigger value="active">Active</TabsTrigger>
                 <TabsTrigger value="expired">Expired</TabsTrigger>
                 <TabsTrigger value="revoked">Revoked</TabsTrigger>
              </TabsList>

              {/* Tab Content Area */}
              {isLoading ? (
                 <div className="flex justify-center items-center py-20"> <Loader2 className="h-10 w-10 animate-spin text-primary" /> </div>
              ) : error ? (
                 <Alert variant="destructive" className="my-10"> <AlertCircle className="h-4 w-4" /> <AlertTitle>Error Loading Files</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert>
              ) : (
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
                             <TableRow key={file.id}> {/* Use DB ID */}
                               <TableCell className="font-medium">
                                 <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <span className="truncate max-w-[150px] md:max-w-[200px]" title={file.fileName}>{file.fileName}</span>
                                 </div>
                                 <span className="text-xs text-muted-foreground md:hidden block mt-1">{formatFileSizeSimple(file.size)}</span>
                               </TableCell>
                               <TableCell className="truncate max-w-[150px]" title={file.recipientEmail}>{file.recipientEmail}</TableCell>
                               <TableCell className="hidden md:table-cell"> <div className="flex items-center gap-1 text-sm text-muted-foreground"> <Clock className="h-3 w-3" /> {formatDate(file.createdAt)} </div> </TableCell>
                               <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDate(file.tokenExpiresAt)}</TableCell>
                               <TableCell>{getStatusBadge(file.status)}</TableCell>
                               <TableCell className="text-right">
                                 <div className="flex justify-end gap-1 md:gap-2">
                                   {/* Show actions only if active and token exists */}
                                   {file.status === "active" && file.downloadToken && (
                                     <>
                                       {/* Corrected View Link */}
                                       <Link href={`/download/${file.downloadToken}`} target="_blank" title="Open Download Page">
                                         <Button variant="outline" size="sm" className="h-8 w-8 md:w-auto md:px-3"> <ExternalLink className="h-3.5 w-3.5" /> <span className="sr-only md:not-sr-only md:ml-2">View</span> </Button>
                                       </Link>
                                       {/* Revoke Dialog */}
                                       <Dialog>
                                         <DialogTrigger asChild>
                                           <Button variant="outline" size="sm" disabled={isRevoking === file.id} title="Revoke Link" className="h-8 w-8 md:w-auto md:px-3">
                                             {isRevoking === file.id ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <XCircle className="h-3.5 w-3.5" />}
                                             <span className="sr-only md:not-sr-only md:ml-2">Revoke</span>
                                            </Button>
                                         </DialogTrigger>
                                         <DialogContent>
                                           <DialogHeader> <DialogTitle>Revoke Download Link?</DialogTitle> <DialogDescription> This will immediately prevent the recipient from downloading the file. This cannot be undone. </DialogDescription> </DialogHeader>
                                           <div className="py-4"> <div className="flex items-center gap-2 mb-2"> <FileText className="h-4 w-4 text-muted-foreground" /> <span className="font-medium truncate">{file.fileName}</span> </div> <p className="text-sm text-muted-foreground">Shared with: {file.recipientEmail}</p> </div>
                                           <DialogFooter>
                                             <DialogClose asChild><Button variant="outline"> Cancel </Button></DialogClose>
                                             <Button variant="destructive" onClick={() => handleRevokeLink(file.id)} disabled={isRevoking === file.id}> {isRevoking === file.id ? 'Revoking...' : 'Revoke Link'} 
                                             </Button>
                                           </DialogFooter>
                                         </DialogContent>
                                       </Dialog>
                                     </>
                                   )}
                                    {/* Show placeholder/different actions for non-active states if needed */}
                                    {(file.status === 'expired' || file.status === 'revoked') && (
                                        <span className="text-xs text-muted-foreground italic px-3 hidden md:inline">Inactive</span>
                                    )}
                                 </div>
                               </TableCell>
                             </TableRow>
                           ))}
                         </TableBody>
                       </Table>
                     </div>
                   ) : (
                     // No Files Found message
                     <div className="flex flex-col items-center justify-center py-16 text-center">
                       <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                       <h3 className="text-lg font-medium">No Files Found</h3>
                       <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-md">
                         {searchTerm
                           ? "No files match your search. Try different keywords."
                           : activeTab !== 'all'
                             ? `You have no ${activeTab} files matching the current filters.`
                             : "You haven't shared any files yet using this account."}
                       </p>
                       {!searchTerm && activeTab === 'all' && (
                         <Link href="/upload"> <Button> <Upload className="mr-2 h-4 w-4" /> Upload Your First File </Button> </Link>
                       )}
                     </div>
                   )}
                 </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </main>
      {/* ======================== Footer ======================== */}
       <footer className="border-t py-6 md:py-0">
         <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row px-4 md:px-6">
           <p className="text-sm text-muted-foreground"> © {new Date().getFullYear()} SecureShare. All rights reserved. </p>
           <nav className="flex gap-4 sm:gap-6">
             <Link href="#" className="text-sm text-muted-foreground hover:text-primary hover:underline underline-offset-4"> Privacy Policy </Link>
             <Link href="#" className="text-sm text-muted-foreground hover:text-primary hover:underline underline-offset-4"> Terms of Service </Link>
           </nav>
         </div>
      </footer>
    </div>
  )
}