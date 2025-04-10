// File Path: app/dashboard/page.tsx

"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Upload, FileText, ExternalLink, XCircle, Clock, Search, Loader2, AlertCircle, Download } from "lucide-react"; // Added Download icon
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

// --- Type Definitions (Consider moving to a shared types/interfaces file) ---

// For data returned by /api/files/shared
interface SentFileData {
    id: number; // Or string
    fileName: string;
    size: number;
    createdAt: string | Date;
    recipientEmail: string;
    tokenExpiresAt: string | Date | null;
    downloadToken: string | null;
    status: 'active' | 'expired' | 'revoked';
}

// For nested uploader data returned by /api/files/received
interface UploaderInfo {
    id: string; // Or number
    name: string | null; // Or firstName
    email: string;
}

// For data returned by /api/files/received
interface ReceivedFileData {
    id: number; // File's DB ID
    fileName: string;
    size: number;
    createdAt: string | Date; // Upload time
    tokenExpiresAt: string | Date | null;
    downloadToken: string | null;
    status: 'active' | 'expired' | 'revoked';
    uploader: UploaderInfo | null; // Who sent it
}
// --- ---

export default function DashboardPage() {
  // --- State Management ---
  // Renamed state for clarity
  const [sentFiles, setSentFiles] = useState<SentFileData[]>([]);
  const [isSentLoading, setIsSentLoading] = useState(true);
  const [sentError, setSentError] = useState<string | null>(null);

  // New state for received files
  const [receivedFiles, setReceivedFiles] = useState<ReceivedFileData[]>([]);
  const [isReceivedLoading, setIsReceivedLoading] = useState(true);
  const [receivedError, setReceivedError] = useState<string | null>(null);

  // Shared state for UI controls
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("sent"); // Default to 'sent' tab
  const [isRevoking, setIsRevoking] = useState<number | null>(null);

  const { toast } = useToast();
  const router = useRouter();

  // --- Data Fetching ---
  useEffect(() => {
    const fetchAllData = async () => {
        // Reset states on fetch start
        setIsSentLoading(true);
        setIsReceivedLoading(true);
        setSentError(null);
        setReceivedError(null);
        console.log("Dashboard: Fetching both sent and received files...");

        try {
          // Fetch concurrently
          const [sentRes, receivedRes] = await Promise.all([
            fetch('/api/files/shared'),   // Fetch files sent by user
            fetch('/api/files/received') // Fetch files received by user
          ]);

          // Process Sent Files Response
          try { // Individual try/catch for each fetch
              const sentData = await sentRes.json();
              if (!sentRes.ok || !sentData.success) {
                  console.error("Failed fetching sent files:", sentData);
                  setSentError(sentData.error || `Failed to fetch sent files (Status: ${sentRes.status})`);
              } else {
                  setSentFiles(sentData.files);
                  console.log(`Workspaceed ${sentData.files?.length ?? 0} sent files.`);
              }
          } catch (err) {
              console.error("Error processing sent files response:", err);
              setSentError("Could not process sent files data.");
          }


          // Process Received Files Response
          try { // Individual try/catch for each fetch
              const receivedData = await receivedRes.json();
              if (!receivedRes.ok || !receivedData.success) {
                  console.error("Failed fetching received files:", receivedData);
                  setReceivedError(receivedData.error || `Failed to fetch received files (Status: ${receivedRes.status})`);
              } else {
                  setReceivedFiles(receivedData.files);
                  console.log(`Workspaceed ${receivedData.files?.length ?? 0} received files.`);
              }
          } catch (err) {
                console.error("Error processing received files response:", err);
                setReceivedError("Could not process received files data.");
          }

        } catch (err: any) {
           // Catch potential errors from Promise.all or network issues
           console.error("Dashboard simultaneous fetch error:", err);
           const errorMsg = err.message || "Could not load dashboard data.";
           setSentError(errorMsg); // Show a general error on both maybe
           setReceivedError(errorMsg);
        } finally {
           setIsSentLoading(false);
           setIsReceivedLoading(false);
           console.log("Dashboard: Fetching finished.");
        }
      };
      fetchAllData();
    // Disable ESLint warning because we only want this to run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array


  // --- Logout Handler (Unchanged) ---
  const handleLogout = async () => { /* ... as before ... */ };

  // --- Client-Side Filtering Logic ---
  // Filter for SENT files tab
  const filteredSentFiles = useMemo(() => {
    return sentFiles.filter(file =>
        (file.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
         file.recipientEmail.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    // Note: Status filtering based on 'activeTab' removed, as tabs now switch lists.
    //       Could be added back as a secondary filter within each tab if needed.
  }, [sentFiles, searchTerm]);

  // Filter for RECEIVED files tab
  const filteredReceivedFiles = useMemo(() => {
    return receivedFiles.filter(file =>
        (file.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
         (file.uploader?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
         (file.uploader?.email || '').toLowerCase().includes(searchTerm.toLowerCase()))
    );
    // Status filtering could be added here too if needed
  }, [receivedFiles, searchTerm]);

  // --- Revoke Link Handler (Unchanged, operates on sentFiles state) ---
   const handleRevokeLink = async (fileId: number) => {
     console.log(`Attempting to revoke link for file ID: ${fileId}`);
     setIsRevoking(fileId);
     try {
         const res = await fetch(`/api/files/revoke/${fileId}`, { method: 'DELETE' });
         const data = await res.json();
         if (!res.ok || !data.success) { throw new Error(data.error || "Failed to revoke link."); }
         // Update sentFiles state
         setSentFiles(prevFiles =>
             prevFiles.map(file =>
                 file.id === fileId ? { ...file, status: 'revoked', downloadToken: null } : file
             )
         );
         toast({ title: "Link Revoked", description: "Download link is now inactive." });
     } catch (err: any) {
         console.error("Revoke error:", err);
         toast({ title: "Error Revoking Link", description: err.message, variant: "destructive"});
     } finally {
         setIsRevoking(null);
     }
   };


  // --- Helper Functions (Unchanged) ---
  const formatDate = (dateInput: string | Date | null) => {
    if (!dateInput) return "Never"; // Display 'Never' if no expiry date
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "Invalid Date"; // Handle invalid date strings
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true
    }).format(date);
  };


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
      {/* ======================== Header (Assumes Shared Header Component) ======================== */}
      {/* <Header /> */} {/* Render your shared header component here if used */}
      {/* If Header is still separate, paste its JSX here */}


      {/* ======================== Main Content ======================== */}
      <main className="flex-1 container py-12 px-4 md:px-6">
        {/* Page Title and Upload Button (Unchanged) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div> <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1> <p className="text-muted-foreground">Manage your secure file shares</p> </div>
            <Link href="/upload"> <Button> <Upload className="mr-2 h-4 w-4" /> Upload New File </Button> </Link>
        </div>

        {/* Files Card */}
        <Card>
          <CardHeader>
            {/* Search Input (Remains the same, filters active tab's list) */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div> <CardTitle>Your Files</CardTitle> <CardDescription>View files you've sent or received</CardDescription> </div>
               <div className="w-full md:w-auto"> <div className="relative"> <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /> <Input type="search" placeholder="Search files..." className="pl-8 w-full md:w-[260px]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /> </div> </div>
            </div>
          </CardHeader>
          <CardContent>
             {/* --- MODIFIED TABS --- */}
            <Tabs defaultValue="sent" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4 grid w-full grid-cols-2 h-auto">
                 <TabsTrigger value="sent" className="py-2 data-[state=active]:shadow-sm">Sent by Me</TabsTrigger>
                 <TabsTrigger value="received" className="py-2 data-[state=active]:shadow-sm">Received Files</TabsTrigger>
              </TabsList>
             {/* --- END MODIFIED TABS --- */}

              {/* ======================= */}
              {/* === SENT FILES TAB === */}
              {/* ======================= */}
              <TabsContent value="sent" className="mt-0">
                {isSentLoading ? (
                   <div className="flex justify-center items-center py-20"> <Loader2 className="h-10 w-10 animate-spin text-primary" /> </div>
                ) : sentError ? (
                   <Alert variant="destructive" className="my-10"> <AlertCircle className="h-4 w-4" /> <AlertTitle>Error Loading Sent Files</AlertTitle> <AlertDescription>{sentError}</AlertDescription> </Alert>
                ) : (
                   // --- Uses filteredSentFiles ---
                   filteredSentFiles.length > 0 ? (
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
                           {filteredSentFiles.map((file) => (
                             <TableRow key={`sent-${file.id}`}> {/* Added prefix to key */}
                               <TableCell className="font-medium"> <div className="flex items-center gap-2"> <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" /> <span className="truncate max-w-[150px] md:max-w-[200px]" title={file.fileName}>{file.fileName}</span> </div> <span className="text-xs text-muted-foreground md:hidden block mt-1">{formatFileSizeSimple(file.size)}</span> </TableCell>
                               {/* Cell for Recipient Email */}
                               <TableCell className="truncate max-w-[150px]" title={file.recipientEmail}>{file.recipientEmail}</TableCell>
                               {/* Cell for Uploaded Date */}
                               <TableCell className="hidden md:table-cell"> <div className="flex items-center gap-1 text-sm text-muted-foreground"> <Clock className="h-3 w-3" /> {formatDate(file.createdAt)} </div> </TableCell>
                               {/* Cell for Expiry Date */}
                               <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDate(file.tokenExpiresAt)}</TableCell>
                               {/* Cell for Status */}
                               <TableCell>{getStatusBadge(file.status)}</TableCell>
                               {/* Cell for Actions (View/Revoke) */}
                               <TableCell className="text-right"><div className="flex justify-end gap-1 md:gap-2"> {file.status === "active" && file.downloadToken && ( <> <Link href={`/download/${file.downloadToken}`} target="_blank" title="Open Download Page"><Button variant="outline" size="sm" className="h-8 w-8 md:w-auto md:px-3"><ExternalLink className="h-3.5 w-3.5" /><span className="sr-only md:not-sr-only md:ml-2">View</span></Button></Link><Dialog><DialogTrigger asChild><Button variant="outline" size="sm" disabled={isRevoking === file.id} title="Revoke Link" className="h-8 w-8 md:w-auto md:px-3"> {isRevoking === file.id ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <XCircle className="h-3.5 w-3.5" />} <span className="sr-only md:not-sr-only md:ml-2">Revoke</span></Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Revoke Download Link?</DialogTitle><DialogDescription> This action cannot be undone. </DialogDescription></DialogHeader><div className="py-4"><div className="flex items-center gap-2 mb-2"><FileText className="h-4 w-4 text-muted-foreground" /><span className="font-medium truncate">{file.fileName}</span></div><p className="text-sm text-muted-foreground">Shared with: {file.recipientEmail}</p></div><DialogFooter><DialogClose asChild><Button variant="outline"> Cancel </Button></DialogClose><Button variant="destructive" onClick={() => handleRevokeLink(file.id)} disabled={isRevoking === file.id}> {isRevoking === file.id ? 'Revoking...' : 'Revoke Link'} </Button></DialogFooter></DialogContent></Dialog></> )} {(file.status === 'expired' || file.status === 'revoked') && (<span className="text-xs text-muted-foreground italic px-3 hidden md:inline">Inactive</span>)} </div> </TableCell>
                             </TableRow>
                           ))}
                         </TableBody>
                       </Table>
                     </div>
                   ) : (
                     // No SENT files message
                     <div className="flex flex-col items-center justify-center py-16 text-center"> <FileText className="h-12 w-12 text-muted-foreground mb-4" /> <h3 className="text-lg font-medium">No Files Sent</h3> <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-md">{searchTerm ? "No sent files match your search." : "You haven't shared any files yet."}</p> {!searchTerm && ( <Link href="/upload"><Button><Upload className="mr-2 h-4 w-4" /> Share Your First File </Button></Link> )} </div>
                   )
                )}
              </TabsContent>

              {/* ========================== */}
              {/* === RECEIVED FILES TAB === */}
              {/* ========================== */}
              <TabsContent value="received" className="mt-0">
                {isReceivedLoading ? (
                   <div className="flex justify-center items-center py-20"> <Loader2 className="h-10 w-10 animate-spin text-primary" /> </div>
                ) : receivedError ? (
                   <Alert variant="destructive" className="my-10"> <AlertCircle className="h-4 w-4" /> <AlertTitle>Error Loading Received Files</AlertTitle> <AlertDescription>{receivedError}</AlertDescription> </Alert>
                ) : (
                   // --- Uses filteredReceivedFiles ---
                   filteredReceivedFiles.length > 0 ? (
                       <div className="rounded-md border">
                           <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead>File Name</TableHead>
                                       <TableHead>Sender</TableHead> {/* Changed */}
                                       <TableHead className="hidden md:table-cell">Shared On</TableHead> {/* Changed */}
                                       <TableHead className="hidden md:table-cell">Expires</TableHead>
                                       <TableHead>Status</TableHead>
                                       <TableHead className="text-right">Action</TableHead> {/* Only Download */}
                                   </TableRow>
                               </TableHeader>
                               <TableBody>
                                   {filteredReceivedFiles.map((file) => (
                                       <TableRow key={`received-${file.id}`}> {/* Added prefix to key */}
                                           {/* Cell for Filename/Size */}
                                           <TableCell className="font-medium"> <div className="flex items-center gap-2"> <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" /> <span className="truncate max-w-[150px] md:max-w-[200px]" title={file.fileName}>{file.fileName}</span> </div> <span className="text-xs text-muted-foreground md:hidden block mt-1">{formatFileSizeSimple(file.size)}</span> </TableCell>
                                           {/* Cell for Sender Info */}
                                           <TableCell className="truncate max-w-[150px]" title={file.uploader?.email || 'Unknown Sender'}> { file.uploader?.email || 'Unknown Sender'} </TableCell>
                                           {/* Cell for Received Date (using createdAt) */}
                                           <TableCell className="hidden md:table-cell"> <div className="flex items-center gap-1 text-sm text-muted-foreground"> <Clock className="h-3 w-3" /> {formatDate(file.createdAt)} </div> </TableCell>
                                           {/* Cell for Expiry Date */}
                                           <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDate(file.tokenExpiresAt)}</TableCell>
                                           {/* Cell for Status */}
                                           <TableCell>{getStatusBadge(file.status)}</TableCell>
                                           {/* Cell for Action (Download) */}
                                           <TableCell className="text-right">
                                                {/* Action is just the View/Download link */}
                                                {file.status === "active" && file.downloadToken && (
                                                    <Link href={`/download/${file.downloadToken}`} target="_blank" title="Open Download Page">
                                                       <Button variant="outline" size="sm" className="h-8 w-8 md:w-auto md:px-3"> <Download className="h-3.5 w-3.5" /> <span className="sr-only md:not-sr-only md:ml-2">Download</span> </Button>
                                                    </Link>
                                                )}
                                                {(file.status === 'expired' || file.status === 'revoked') && (<span className="text-xs text-muted-foreground italic px-3 hidden md:inline">Unavailable</span>)}
                                           </TableCell>
                                       </TableRow>
                                   ))}
                               </TableBody>
                           </Table>
                       </div>
                   ) : (
                       // --- No RECEIVED files message ---
                       <div className="flex flex-col items-center justify-center py-16 text-center"> <FileText className="h-12 w-12 text-muted-foreground mb-4" /> <h3 className="text-lg font-medium">No Files Received</h3> <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-md">{searchTerm ? "No received files match your search." : "No files have been shared with you yet."}</p> </div>
                   )
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
      {/* ======================== Footer ======================== */}
       <footer className="border-t py-6 md:py-0">
         <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row px-4 md:px-6"> <p className="text-sm text-muted-foreground"> © {new Date().getFullYear()} SecureShare. All rights reserved. </p> <nav className="flex gap-4 sm:gap-6"> <Link href="#" className="text-sm text-muted-foreground hover:text-primary hover:underline underline-offset-4"> Privacy Policy </Link> <Link href="#" className="text-sm text-muted-foreground hover:text-primary hover:underline underline-offset-4"> Terms of Service </Link> </nav> </div>
      </footer>
    </div>
  )
}