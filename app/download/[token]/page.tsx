// Assuming file path is now: app/download/[token]/page.tsx
// (If the folder is still named [id], please rename it to [token] to match the param)

"use client"

// --- MODIFICATION 1: Import useParams ---
import { useState, useEffect } from "react"
import { useParams } from 'next/navigation' // Import the hook
// --- ---
import Link from "next/link"
import { Shield, Download, ArrowLeft, FileText, Loader2, AlertCircle } from "lucide-react"
// Button import might not be needed if using <a> tag styled as button
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"

// Define the expected structure for file metadata
interface FileMetadata {
    fileName: string;
    size: number; // Size in bytes
    mimeType: string;
    recipientEmail?: string;
}

// --- MODIFICATION 2: Remove params from function signature ---
export default function DownloadPage() {
    // --- MODIFICATION 3: Get params using the hook ---
    // Specify the expected shape of the params object (matching the folder name [token])
    const params = useParams<{ token: string }>();
    // Extract token safely AFTER using the hook.
    // Add a check in case params is not ready immediately (though usually is)
    const token = params?.token;
    // --- ---

    // State for loading metadata, error messages, and fetched file details
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fileDetails, setFileDetails] = useState<FileMetadata | null>(null);
    const { toast } = useToast();

    // Fetch metadata when the component mounts or token changes
    useEffect(() => {
        // Make sure token is available before proceeding
        if (!token) {
            // Can potentially happen on initial render if hook isn't ready
            // Or if the URL genuinely has no token (won't match route anyway)
            setIsLoading(false); // Stop loading if no token
            setError("Download token missing from URL."); // Set an error
            return;
        }

        // Validate token format
        if (!/^[a-f0-9]{64}$/i.test(token)) {
             setError("Invalid download link format.");
             setIsLoading(false);
             return;
        }

        const fetchMetadata = async () => {
            setIsLoading(true);
            setError(null);
            setFileDetails(null);

            try {
                // Fetch from your metadata endpoint using the token from the hook
                const res = await fetch(`/api/metadata/${token}`);
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || `Failed to load file details (Status: ${res.status})`);
                }
                if (data.success && data.metadata) {
                    setFileDetails(data.metadata);
                } else {
                    throw new Error(data.error || "Invalid metadata received from server.");
                }
            } catch (err: any) {
                console.error("Metadata fetch error:", err);
                setError(err.message || "An unexpected error occurred.");
                 toast({
                     title: "Error Loading File",
                     description: err.message || "Could not retrieve file details.",
                     variant: "destructive",
                 });
            } finally {
                setIsLoading(false);
            }
        };

        fetchMetadata();
        // Depend on the token obtained from the hook
    }, [token, toast]);

    // Helper function to format file size (Unchanged)
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
     };

    // Construct the actual download API URL using token from hook
    // Ensure token exists before constructing URL used in JSX
    const actualDownloadUrl = token ? `/api/download/${token}` : '#';

    return (
        <div className="flex flex-col min-h-screen">
            {/* Header (Unchanged) */}
             <header className="border-b">
                 <div className="container flex h-16 items-center justify-between px-4 md:px-6">
                     <div className="flex items-center gap-2 font-bold text-xl"> <Shield className="h-6 w-6" /> <span>SecureShare</span> </div>
                     <nav className="flex gap-4 sm:gap-6"> <Link href="/" className="text-sm font-medium hover:underline underline-offset-4"> Home </Link> </nav>
                 </div>
             </header>

            {/* Main Content */}
            <main className="flex-1 container max-w-4xl py-12 px-4 md:px-6">
                <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium mb-6 hover:underline"> <ArrowLeft className="h-4 w-4" /> Back to Home </Link>

                <Card className="w-full">
                    <CardHeader>
                        <CardTitle>Secure File Download</CardTitle>
                        <CardDescription>
                             {isLoading ? "Loading file details..." : (error ? "Error loading details" : "This file has been securely shared with you.")}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {isLoading && ( <div className="flex justify-center items-center p-12"> <Loader2 className="h-12 w-12 animate-spin text-primary" /> </div> )}
                        {error && !isLoading && ( <Alert variant="destructive"> <AlertCircle className="h-4 w-4" /> <AlertTitle>Load Failed</AlertTitle> <AlertDescription> {error} Please check the link or contact the sender. </AlertDescription> </Alert> )}

                        {fileDetails && !isLoading && !error && (
                            <>
                                <div className="flex items-center justify-center p-12 border rounded-lg bg-gray-50 dark:bg-gray-800">
                                    <div className="text-center">
                                        <FileText className="h-16 w-16 mx-auto mb-4 text-primary" />
                                        <h3 className="text-xl font-bold break-all">{fileDetails.fileName}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {formatFileSize(fileDetails.size)}
                                        </p>
                                    </div>
                                </div>

                                {/* Use an Anchor tag styled as a Button for direct download */}
                                <a
                                    href={actualDownloadUrl} // Use the constructed URL
                                    download // Suggests browser should download
                                    // Basic button styling - copy/paste from ui/button variants if needed, or use Button component with asChild prop
                                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Download File
                                </a>
                            </>
                         )}
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-2 items-start">
                         {/* Security Info Footer (Unchanged) */}
                         <div className="text-sm text-gray-500 dark:text-gray-400">
                             <p className="font-medium">Security Information:</p>
                             <ul className="list-disc list-inside space-y-1 mt-2">
                                 <li>This file was encrypted using AES-256 encryption.</li>
                                 <li>This download link may expire for security reasons.</li>
                                 <li>Only authorized recipients can download this file.</li>
                             </ul>
                         </div>
                    </CardFooter>
                </Card>
            </main>

             {/* Footer (Unchanged) */}
             <footer className="border-t py-6 md:py-0">
                <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row px-4 md:px-6">
                     <p className="text-sm text-gray-500 dark:text-gray-400"> © {new Date().getFullYear()} SecureShare. All rights reserved. </p>
                     <nav className="flex gap-4 sm:gap-6"> <Link href="#" className="text-sm font-medium hover:underline underline-offset-4"> Privacy Policy </Link> <Link href="#" className="text-sm font-medium hover:underline underline-offset-4"> Terms of Service </Link> </nav>
                 </div>
             </footer>
        </div>
    );
}