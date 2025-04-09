"use client";

import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import { useUser } from '@/context/UserContext'; 
import { useState } from "react";
import Link from "next/link";
import { Shield, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string | undefined>();
  const [idNumber, setIdNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  const { refetchUser } = useUser();

  // Handle role change and reset ID number
  const handleRoleChange = (value: string) => {
    setRole(value);
    setIdNumber(""); // Clear ID when role changes
    setErrorMessage(null);
  };

  // ✅ Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    if (!firstName || !lastName || !email || !password || !role || !idNumber) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          role,
          idNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || "An error occurred. Please try again.");
        toast({
          title: "Registration Failed",
          description: data.message || "An error occurred. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Registration Successful",
          description: "Your account has been created. Redirecting...",
        });

        try {
          console.log("Registration successful, refetching user context...");
          await refetchUser(); // Call the context function to fetch the new user state
          console.log("User context refetched after registration.");

          // Redirect AFTER refetching context
          router.push('/dashboard');

      } catch (refetchError) {
          // Handle potential errors during refetch itself if needed
          console.error("Error refetching user after registration:", refetchError);
          // Maybe redirect to login page instead if refetch fails?
           toast({ title: "Login sync error", description: "Please log in manually.", variant: "default"});
           router.push('/login');
      }


        // ✅ Save token to localStorage
        if (data.token) {
          localStorage.setItem("token", data.token);
        }

        // ✅ Redirect to /upload after registration
        setTimeout(() => {
          router.push(data.redirectUrl || "/dashboard");
        }, 1500);
      }
    } catch (error) {
      console.error("Error during registration:", error);
      setErrorMessage("Something went wrong. Please try again later.");
      toast({
        title: "Error",
        description: "Something went wrong. Please try again later.",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Create an Account</CardTitle>
            <CardDescription>
              Register to start sharing files securely
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First Name</Label>
                  <Input
                    id="first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input
                    id="last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500">
                  Password must be at least 8 characters long with a mix of
                  letters, numbers, and symbols.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select onValueChange={handleRoleChange}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {role && (
                <div className="space-y-2">
                  <Label htmlFor="id-number">
                    {role === "teacher"
                      ? "Teacher ID Number"
                      : "Student Roll Number"}
                  </Label>
                  <Input
                    id="id-number"
                    value={idNumber}
                    onChange={(e) => {
                      setIdNumber(e.target.value);
                      setErrorMessage(null);
                    }}
                    required
                  />
                </div>
              )}
              {errorMessage && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
