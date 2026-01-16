"use client";

import { useState, useEffect } from "react"; 
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
    const [recipientEmailForCard, setRecipientEmailForCard] = useState("");
    const [scanResult, setScanResult] = useState<any>(null);
    const [isScanning, setIsScanning] = useState(false);

    
    const handleFileUpload = async (file: File, recipientEmail: string) => {
        // Basic validation
        if (!file || !recipientEmail) {
            toast({ title: "Error", description: "Please select a file and enter a recipient email.", variant: "destructive" });
            return;
        }

        setIsUploading(true);
        setIsScanning(true);
        setRecipientEmailForCard(recipientEmail);
        setScanResult(null);

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
            console.log("Upload API Response Data:", JSON.stringify(responseData, null, 2));

            if (!response.ok) {
                console.error("Upload API Error Response:", responseData);
                
                // Check if it's a scan-related error
                if (responseData.scanResult) {
                    setScanResult(responseData.scanResult);
                    setIsScanning(false);
                }
                
                throw new Error(responseData.error || `Upload failed (Status: ${response.status})`);
            }


            if (responseData.success === true && responseData.downloadUrl) {
                const receivedUrl = responseData.downloadUrl;
                console.log("SUCCESS: API response OK and downloadUrl received:", receivedUrl);

                // Store scan result
                if (responseData.scanResult) {
                    setScanResult(responseData.scanResult);
                }
                setIsScanning(false);

                console.log("Attempting to set state: setDownloadUrl, setUploadComplete(true)");
                setDownloadUrl(receivedUrl);
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
            setScanResult(null);
            setIsScanning(false);
        } finally {
            setIsUploading(false);
            setIsScanning(false);
        }
    };


    const handleReset = () => {
        console.log("handleReset called: Clearing state.");
        setUploadComplete(false);
        setDownloadUrl("");
        setRecipientEmailForCard("");
        setScanResult(null);
        setIsScanning(false);
    };


    console.log("--- Rendering UploadPage ---");
    console.log(`State: uploadComplete=${uploadComplete}, isUploading=${isUploading}`);
    console.log(`State: downloadUrl='${downloadUrl}'`);
    console.log(`State: recipientEmailForCard='${recipientEmailForCard}'`);
    console.log("--- ---");


    return (
        <div className="flex flex-col min-h-screen">

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

                    <CardContent>
                        {!uploadComplete ? (
                            <>
                                <FileUploadCard onUploadComplete={handleFileUpload} isUploading={isUploading} />
                                
                                {/* Scanning Status */}
                                {isScanning && (
                                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Scanning file for threats...</span>
                                        </div>
                                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Please wait while we check your file for security threats.</p>
                                    </div>
                                )}
                                
                                {/* Scan Result Display */}
                                {scanResult && (
                                    <div className={`mt-4 p-4 rounded-lg border ${
                                        scanResult.status === 'CLEAN' 
                                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                            : scanResult.status === 'THREAT_DETECTED'
                                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                                            : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                                    }`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            {scanResult.status === 'CLEAN' ? (
                                                <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
                                            ) : scanResult.status === 'THREAT_DETECTED' ? (
                                                <Shield className="h-4 w-4 text-red-600 dark:text-red-400" />
                                            ) : (
                                                <Shield className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                            )}
                                            <span className={`text-sm font-medium ${
                                                scanResult.status === 'CLEAN' 
                                                    ? 'text-green-700 dark:text-green-300'
                                                    : scanResult.status === 'THREAT_DETECTED'
                                                    ? 'text-red-700 dark:text-red-300'
                                                    : 'text-yellow-700 dark:text-yellow-300'
                                            }`}>
                                                {scanResult.status === 'CLEAN' ? 'File Scanned - Clean' :
                                                 scanResult.status === 'THREAT_DETECTED' ? 'Threat Detected' :
                                                 'Scan Error'}
                                            </span>
                                        </div>
                                        
                                        <p className={`text-xs mb-1 ${
                                            scanResult.status === 'CLEAN' 
                                                ? 'text-green-600 dark:text-green-400'
                                                : scanResult.status === 'THREAT_DETECTED'
                                                ? 'text-red-600 dark:text-red-400'
                                                : 'text-yellow-600 dark:text-yellow-400'
                                        }`}>
                                            Scanned by: {scanResult.engine}
                                        </p>
                                        
                                        {scanResult.threatName && (
                                            <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                                                Threat: {scanResult.threatName}
                                            </p>
                                        )}
                                        
                                        {scanResult.details && (
                                            <p className={`text-xs mt-2 ${
                                                scanResult.status === 'CLEAN' 
                                                    ? 'text-green-600 dark:text-green-400'
                                                    : scanResult.status === 'THREAT_DETECTED'
                                                    ? 'text-red-600 dark:text-red-400'
                                                    : 'text-yellow-600 dark:text-yellow-400'
                                            }`}>
                                                {scanResult.details}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            // Passes all required props
                            <>
                                <DownloadLinkCard
                                    downloadLink={downloadUrl}
                                    email={recipientEmailForCard}
                                    onReset={handleReset}
                                />
                                
                                {/* Show scan result for successful uploads */}
                                {scanResult && (
                                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
                                            <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                                Security Check Passed
                                            </span>
                                        </div>
                                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                            File scanned by {scanResult.engine} - No threats detected
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>

                    <CardFooter className="flex flex-col space-y-2 items-start">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            <p className="font-medium">Security Information:</p>
                            <ul className="list-disc list-inside space-y-1 mt-2">
                                <li>Files are scanned for malware before encryption</li>
                                <li>Files are encrypted using AES-256 encryption</li>
                                <li>Download links expire after 24 hours</li>
                                <li>All file transfers are logged for security purposes</li>
                            </ul>
                        </div>
                    </CardFooter>
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
    );
}