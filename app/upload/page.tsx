"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { FileUploadCard } from "@/components/file-upload-card";
import { DownloadLinkCard } from "@/components/download-link-card";
import { ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";
import { toast } from "@/components/ui/use-toast";

export default function UploadPage() {
    const [uploadComplete, setUploadComplete] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    // ✅ Handle File Upload
    const handleFileUpload = async (file: File, recipientEmail: string) => {
        // Basic validation
        if (!file || !recipientEmail) {
            toast({
                title: "Error",
                description: "Please select a file and enter a recipient email.",
                variant: "destructive",
            });
            return;
        }

        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("recipientEmail", recipientEmail);

            // Add console log to verify FormData before fetch
            console.log("Is body FormData?", formData instanceof FormData);
            for (let pair of formData.entries()) {
                console.log("FormData Entry:", pair[0], pair[1]);
            }

            const response = await fetch("/api/upload", {
                method: "POST",
                // REMOVED: headers option - Browser will set Content-Type with boundary automatically for FormData
                // headers: {
                //   "Content-Type": "multipart/form-data" // DO NOT SET THIS MANUALLY
                // },
                body: formData,
            });

            const responseData = await response.json(); // Read response body once

            if (!response.ok) {
                 // Use error message from backend response if available
                 throw new Error(responseData.error || `Failed to upload file. Status: ${response.status}`);
            }

             // Check if backend successfully returned the downloadUrl (as requested previously)
            if (responseData.downloadUrl) {
                setDownloadUrl(responseData.downloadUrl);
                setUploadComplete(true);

                toast({
                    title: "Success",
                    description: responseData.message || "File uploaded successfully!",
                });
            } else {
                 // Handle case where backend didn't return the URL (even if response.ok was true)
                 console.error("API response missing downloadUrl:", responseData);
                 throw new Error("Upload succeeded but failed to retrieve the download link from the response.");
            }

        } catch (error: any) {
            toast({
                title: "Upload Error",
                description: error.message || "An error occurred. Please try again.",
                variant: "destructive",
            });
            setUploadComplete(false); // Reset on error
            setDownloadUrl(""); // Reset URL on error
        } finally {
            setIsUploading(false);
        }
    };

    // ✅ Reset Upload Form
    const handleReset = () => {
        setUploadComplete(false);
        setDownloadUrl("");
        // If FileUploadCard needs an internal reset, trigger it here
    };

    // --- Return JSX (No changes needed below this line based on the error) ---
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
                            Files are encrypted with AES-256. A download link will be generated and emailed.
                        </CardDescription>
                    </CardHeader>

                    {/* ✅ Upload or Download Card */}
                    <CardContent>
                        {!uploadComplete ? (
                            <FileUploadCard onUploadComplete={handleFileUpload} isUploading={isUploading} />
                        ) : (
                            <DownloadLinkCard downloadUrl={downloadUrl} onReset={handleReset} />
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
    );
}