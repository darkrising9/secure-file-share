"use client";

import { useState, useEffect } from "react"; // Added useEffect for potential debugging later if needed
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { FileUploadCard } from "@/components/file-upload-card";
import { DownloadLinkCard } from "@/components/download-link-card";
import { ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";
import { toast } from "@/components/ui/use-toast"; // Assuming correct path

export default function UploadPage() {
    const [uploadComplete, setUploadComplete] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [recipientEmailForCard, setRecipientEmailForCard] = useState("");

    // ✅ Handle File Upload
    const handleFileUpload = async (file: File, recipientEmail: string) => {
        // Basic validation
        if (!file || !recipientEmail) {
            toast({ title: "Error", description: "Please select a file and enter a recipient email.", variant: "destructive" });
            return;
        }

        setIsUploading(true);
        setRecipientEmailForCard(recipientEmail); // Store email for this attempt

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("recipientEmail", recipientEmail);

            console.log("Initiating upload for:", file.name, "to:", recipientEmail); // Log initiation

            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            const responseData = await response.json();
            // --- VVV Log the RAW API response VVV ---
            console.log("Upload API Response Data:", JSON.stringify(responseData, null, 2));
            // --- ^^^ Log the RAW API response ^^^ ---

            if (!response.ok) {
                console.error("Upload API Error Response:", responseData);
                throw new Error(responseData.error || `Upload failed (Status: ${response.status})`);
            }

            // --- VVV Check response structure carefully VVV ---
            // Verify both success flag and presence of downloadUrl
            if (responseData.success === true && responseData.downloadUrl) {
                const receivedUrl = responseData.downloadUrl;
                console.log("SUCCESS: API response OK and downloadUrl received:", receivedUrl);

                console.log("Attempting to set state: setDownloadUrl, setUploadComplete(true)");
                setDownloadUrl(receivedUrl);
                // recipientEmailForCard was already set before the try block
                setUploadComplete(true);

                toast({
                    title: "Success",
                    description: responseData.message || "File uploaded successfully!",
                });
                 console.log("State setting calls finished.");
            } else {
                // Log if response.ok was true, but success/downloadUrl is missing
                console.error("Upload Error: Response OK, but success flag or downloadUrl missing in responseData!", responseData);
                throw new Error("Upload succeeded technically, but couldn't get download link from API response.");
            }
             // --- ^^^ Check response structure carefully ^^^ ---

        } catch (error: any) {
            console.error("Caught error during handleFileUpload:", error); // Log the caught error
            toast({
                title: "Upload Error",
                description: error.message || "An error occurred during upload.",
                variant: "destructive",
            });
            setUploadComplete(false); // Reset state on error
            setDownloadUrl("");
            setRecipientEmailForCard("");
        } finally {
            setIsUploading(false);
        }
    };

    // ✅ Reset Upload Form
    const handleReset = () => {
        console.log("handleReset called: Clearing state.");
        setUploadComplete(false);
        setDownloadUrl("");
        setRecipientEmailForCard("");
    };

    // --- Log state before rendering ---
    console.log("--- Rendering UploadPage ---");
    console.log(`State: uploadComplete=${uploadComplete}, isUploading=${isUploading}`);
    console.log(`State: downloadUrl='${downloadUrl}'`);
    console.log(`State: recipientEmailForCard='${recipientEmailForCard}'`);
    console.log("--- ---");
    // --- ---

    // --- Return JSX (Including Header and Footer) ---
    return (
        <div className="flex flex-col min-h-screen">
            {/* ✅ Header - Included */}
            

            {/* ✅ Main Content */}
            <main className="flex-1 container max-w-4xl py-12 px-4 md:px-6">
                <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-medium mb-6 hover:underline">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Dashboard
                </Link>

                <Card className="w-full">
                    <CardHeader>
                        <CardTitle>Upload & Share File</CardTitle>
                        <CardDescription>
                            Files are encrypted with AES-256. A download link will be generated and emailed.
                        </CardDescription>
                    </CardHeader>

                    {/* ✅ Upload or Download Card */}
                    <CardContent>
                        {!uploadComplete ? (
                            <FileUploadCard onUploadComplete={handleFileUpload} isUploading={isUploading} />
                        ) : (
                            // Passes all required props
                            <DownloadLinkCard
                                downloadLink={downloadUrl}
                                email={recipientEmailForCard}
                                onReset={handleReset}
                             />
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

             {/* ✅ Footer - Included */}
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
    );
}