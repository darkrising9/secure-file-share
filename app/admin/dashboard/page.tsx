// File Path: app/admin/dashboard/page.tsx

"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import Link from "next/link";
import { Shield, Search, Trash2, Edit, UserX, UserCheck, Filter, Loader2, AlertCircle, Users, FileUp, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


// --- Type Definition including Status ---
interface UserSummaryData {
    id: string; // Or number
    email: string;
    firstName: string | null; // Or firstName
    role: string;
    createdAt: string | Date;
    status: 'active' | 'suspended'; // <-- Added status
    _count: {
        filesUploaded: number;
        filesReceived: number;
    };
}

// --- Edit User Form Component (with Status) ---
interface EditUserFormProps {
    user: UserSummaryData;
    onSave: (updatedUserData: Partial<Pick<UserSummaryData, 'firstName' | 'role' | 'status'>>) => Promise<void>; // <-- Added status
    onCancel: () => void;
    isSaving: boolean;
}

function EditUserForm({ user, onSave, onCancel, isSaving }: EditUserFormProps) {
    const [formData, setFormData] = useState({
        firstName: user.firstName || '',
        role: user.role || 'student',
        status: user.status || 'active' // <-- Added status state
    });

    const handleChange = (field: keyof typeof formData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const updateData: Partial<Pick<UserSummaryData, 'firstName' | 'role' | 'status'>> = {};
        if (formData.firstName !== (user.firstName || '')) updateData.firstName = formData.firstName;
        if (formData.role !== user.role) updateData.role = formData.role;
        if (formData.status !== user.status) updateData.status = formData.status; // <-- Add status to update data

        if (Object.keys(updateData).length > 0) {
            await onSave(updateData);
        } else {
             onCancel();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name, Email (Read-only), Role fields... */}
             <div className="space-y-2"> <Label htmlFor="edit-name">Name</Label> <Input id="edit-name" value={formData.firstName} onChange={(e) => handleChange("firstName", e.target.value)} /> </div>
             <div className="space-y-2"> <Label htmlFor="edit-email">Email (Read-only)</Label> <Input id="edit-email" type="email" value={user.email} readOnly disabled /> </div>
             <div className="space-y-2"> <Label htmlFor="edit-role">Role</Label> <Select value={formData.role} onValueChange={(value) => handleChange("role", value)}> <SelectTrigger id="edit-role"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="teacher">Teacher</SelectItem><SelectItem value="student">Student</SelectItem></SelectContent> </Select> </div>

             {/* --- VVV Uncommented Status Field VVV --- */}
            <div className="space-y-2">
                 <Label htmlFor="edit-status">Status</Label>
                 <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
                    <SelectTrigger id="edit-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                 </Select>
            </div>
             {/* --- ^^^ Uncommented Status Field ^^^ --- */}

            <DialogFooter> <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>Cancel</Button> <Button type="submit" disabled={isSaving}> {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Save Changes </Button> </DialogFooter>
        </form>
    );
}


// --- Main Admin Dashboard Page Component ---
export default function AdminDashboardPage() {
    const { user: loggedInUser, isLoading: isAuthLoading } = useUser();
    const [users, setUsers] = useState<UserSummaryData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    // --- VVV Uncommented status state VVV ---
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [isTogglingStatus, setIsTogglingStatus] = useState<string | number | null>(null); // Store ID (string/number) of user whose status is toggling
    // --- ^^^ Uncommented status state ^^^ ---

    const [editingUser, setEditingUser] = useState<UserSummaryData | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isSavingUser, setIsSavingUser] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<UserSummaryData | null>(null);
    const [isDeletingUser, setIsDeletingUser] = useState(false);

    const { toast } = useToast();

    // --- Data Fetching (Unchanged) ---
    useEffect(() => {
         const fetchUserSummary = async () => {
          setIsLoading(true); setError(null); console.log("Admin Dashboard: Fetching user summary...");
          try {
              const res = await fetch('/api/admin/users/summary');
              const data = await res.json();
              if (!res.ok || !data.success) { throw new Error(data.error || `API Error (${res.status})`); }
              setUsers(data.users);
              console.log(`Admin Dashboard: Fetched ${data.users?.length ?? 0} users.`);
          } catch (err: any) { console.error("Admin Dashboard fetch error:", err); setError(err.message || "Could not load user summary."); }
          finally { setIsLoading(false); }
      };
         if (!isAuthLoading) { if (loggedInUser?.role === 'admin') { fetchUserSummary(); } else { setError("Access Denied."); setIsLoading(false); } }
     }, [loggedInUser, isAuthLoading]);


    // --- Client-Side Filtering (Updated to include status) ---
    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
             const searchLower = searchTerm.toLowerCase();
             const matchesSearch = (user.firstName || '').toLowerCase().includes(searchLower) || user.email.toLowerCase().includes(searchLower);
             // --- VVV Uncommented status check VVV ---
             const matchesStatus = statusFilter === "all" || user.status === statusFilter;
             // --- ^^^ Uncommented status check ^^^ ---
             const matchesRole = roleFilter === "all" || user.role === roleFilter;
             return matchesSearch && matchesStatus && matchesRole; // Added status back
         });
     }, [users, searchTerm, statusFilter, roleFilter]); // <-- Added statusFilter dependency


    // --- Action Handlers ---
    const handleEditUser = (user: UserSummaryData) => {
      setEditingUser({ ...user });
      setIsEditDialogOpen(true);
  };
    const handleSaveUser = async (updatedUserData: Partial<Pick<UserSummaryData, 'firstName' | 'role' | 'status'>>) => {
      if (!editingUser) return;
      console.log(`Attempting to save user ID: ${editingUser.id}`, updatedUserData);
      setIsSavingUser(true); setError(null);

      try {
          const userId = editingUser.id;
          const res = await fetch(`/api/admin/users/${userId}`, {
               method: 'PATCH',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify(updatedUserData),
          });
          const data = await res.json(); // Expect { success: boolean, updatedUser?: UserSummaryData, error?: string }
          if (!res.ok || !data.success) {
              throw new Error(data.error || `Failed to update user (Status: ${res.status})`);
          }

          // Update local state ONLY if API returns the updated user data
          if (data.updatedUser) {
              setUsers(prevUsers => prevUsers.map(user =>
                  user.id === userId ? { ...user, ...data.updatedUser } : user // Merge updates from response
              ));
          } else {
              // If API doesn't return updated user, refetch or update manually based on input
              // For simplicity, we'll update based on input here, but prefer using API response
              setUsers(prevUsers => prevUsers.map(user =>
                  user.id === userId ? { ...user, ...updatedUserData } : user
              ));
          }

          setIsEditDialogOpen(false); setEditingUser(null);
          toast({ title: "User Updated", description: `${updatedUserData.firstName || editingUser.email}'s info saved.` });

      } catch (err: any) {
          console.error("Save user error:", err);
          toast({ title: "Error Updating User", description: err.message, variant: "destructive" });
      } finally {
           setIsSavingUser(false);
      }
  };
    const handleDeleteUser = (user: UserSummaryData) => {
      setUserToDelete(user);
      setIsDeleteDialogOpen(true);
  };
    const confirmDeleteUser = async () => {
      if (!userToDelete) return;
      console.log(`Attempting to delete user ID: ${userToDelete.id}`);
      setIsDeletingUser(true); setError(null);

      try {
          const userId = userToDelete.id;
           const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });

           // Check status for success (200 or 204 No Content)
           if (!res.ok && res.status !== 204) {
                let errorMsg = `Failed to delete user (Status: ${res.status})`;
                try {
                    const errorData = await res.json(); // Try to parse error body
                    errorMsg = errorData.error || errorMsg;
                } catch (parseError) { /* Ignore parsing error if no body */ }
                throw new Error(errorMsg);
           }

          // Update local state on success
          setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));
          setIsDeleteDialogOpen(false); setUserToDelete(null);
          toast({ title: "User Deleted", description: `${userToDelete.firstName || userToDelete.email} removed.` });

      } catch (err: any) {
          console.error("Delete user error:", err);
          toast({ title: "Error Deleting User", description: err.message, variant: "destructive" });
      } finally {
          setIsDeletingUser(false);
      }
  };

    // --- VVV Uncommented and Implemented Status Toggle Handler VVV ---
    const toggleUserStatus = async (userId: string | number, currentStatus: 'active' | 'suspended') => {
        console.log(`Toggling status for user ID: ${userId} from ${currentStatus}`);
        setIsTogglingStatus(userId); // Set loading state for this specific user
        setError(null);
        const newStatus = currentStatus === "active" ? "suspended" : "active";

        try {
            const res = await fetch(`/api/admin/users/${userId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }), // Send the new status
            });
            const data = await res.json(); // Expect { success: boolean, updatedStatus?: string, error?: string }
            if (!res.ok || !data.success) {
                throw new Error(data.error || "Failed to update status.");
            }

            // Update local state on success
            setUsers((prevUsers) =>
                prevUsers.map((user) =>
                    user.id === userId ? { ...user, status: newStatus } : user
                )
            );
            toast({ title: `User ${newStatus}`, description: `${users.find(u=>u.id===userId)?.firstName || userId} status updated.` });

        } catch (err: any) {
             console.error("Toggle status error:", err);
             toast({ title: "Error Updating Status", description: err.message, variant: "destructive" });
        } finally {
            setIsTogglingStatus(null); // Clear loading state for this user
        }
    };
    // --- ^^^ Uncommented and Implemented Status Toggle Handler ^^^ ---


    // --- Helper Functions ---
    const formatDate = (dateString: string | Date | null): string => {
      if (!dateString) return "N/A";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return new Intl.DateTimeFormat("en-GB", { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
   };
    // --- VVV Uncommented Status Badge function VVV ---
    const getStatusBadge = (status: string) => {
      switch (status?.toLowerCase()) { // Added safety check and lowercasing
        case "active": return <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-200">Active</Badge>;
        case "suspended": return <Badge variant="destructive">Suspended</Badge>;
        default: return <Badge variant="outline">Unknown</Badge>;
      }
    }
    // --- ^^^ Uncommented Status Badge function ^^^ ---


    // --- Render Component ---
    return (
        <div className="flex flex-col min-h-screen">
             {/* Assumes Header is provided by layout */}
             <main className="flex-1 container py-12 px-4 md:px-6">
                 {/* Title */}
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"> <div> <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1> <p className="text-muted-foreground">Manage users and system activity</p> </div> </div>

                 {/* Tabs */}
                 <Tabs defaultValue="users" className="space-y-4">
                     <TabsList> <TabsTrigger value="users">Users</TabsTrigger> <TabsTrigger value="activity">Activity Log</TabsTrigger> </TabsList>

                     {/* Users Tab */}
                     <TabsContent value="users" className="space-y-4">
                         {/* --- VVV Uncommented Statistics Cards VVV --- */}
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                              <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Users</CardTitle><Users className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent> <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-5 w-5 animate-spin"/> : users.length}</div> </CardContent> </Card>
                              {/* Active Users Card */}
                              <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Active Users</CardTitle><UserCheck className="h-4 w-4 text-muted-foreground"/></CardHeader> <CardContent> <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-5 w-5 animate-spin"/> : users.filter((u) => u.status === "active").length}</div> </CardContent> </Card>
                              {/* Files Sent/Received Cards (Unchanged) */}
                              <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Files Sent</CardTitle><FileUp className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent> <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-5 w-5 animate-spin"/> : users.reduce((acc, user) => acc + user._count.filesUploaded, 0)}</div> <p className="text-xs text-muted-foreground">{!isLoading && users.length > 0 ? `${(users.reduce((acc, user) => acc + user._count.filesUploaded, 0) / users.length).toFixed(1)} avg.` : ''}</p> </CardContent> </Card>
                              <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Files Received</CardTitle><FileDown className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent> <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-5 w-5 animate-spin"/> : users.reduce((acc, user) => acc + user._count.filesReceived, 0)}</div> <p className="text-xs text-muted-foreground">{!isLoading && users.length > 0 ? `${(users.reduce((acc, user) => acc + user._count.filesReceived, 0) / users.length).toFixed(1)} avg.` : ''}</p> </CardContent> </Card>
                              {/* Suspended Users Card */}
                              {/* <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Suspended Users</CardTitle><UserX className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent> <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-5 w-5 animate-spin"/> : users.filter((u) => u.status === "suspended").length}</div> </CardContent> </Card> */}
                          </div>
                          {/* --- ^^^ Uncommented Statistics Cards ^^^ --- */}

                         {/* User Management Table Card */}
                         <Card>
                             <CardHeader>
                                  {/* Search and Filter Section */}
                                   <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"> <div> <CardTitle>User Management</CardTitle> <CardDescription>View and manage all users</CardDescription> </div> <div className="w-full md:w-auto flex flex-col md:flex-row gap-2"> <div className="relative"> <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /> <Input type="search" placeholder="Search name or email..." className="pl-8 w-full md:w-[260px]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /> </div>
                                      {/* --- VVV Uncommented Status Filter VVV --- */}
                                     <DropdownMenu> <DropdownMenuTrigger asChild><Button variant="outline" className="w-full md:w-auto"><Filter className="h-4 w-4 mr-2" /> Filters </Button></DropdownMenuTrigger> <DropdownMenuContent align="end" className="w-[200px]"> <DropdownMenuLabel>Filter Users</DropdownMenuLabel> <DropdownMenuSeparator /> <div className="p-2 space-y-4"> <div className="space-y-2 mb-4"><Label htmlFor="status-filter">Status</Label> <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger id="status-filter"><SelectValue placeholder="Filter by status" /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="suspended">Suspended</SelectItem></SelectContent></Select> </div> <div className="space-y-2"> <Label htmlFor="role-filter">Role</Label> <Select value={roleFilter} onValueChange={setRoleFilter}><SelectTrigger id="role-filter"><SelectValue placeholder="Filter by role" /></SelectTrigger><SelectContent><SelectItem value="all">All Roles</SelectItem><SelectItem value="admin">Admin</SelectItem><SelectItem value="teacher">Teacher</SelectItem><SelectItem value="student">Student</SelectItem></SelectContent></Select> </div> </div> </DropdownMenuContent> </DropdownMenu>
                                     {/* --- ^^^ Uncommented Status Filter ^^^ --- */}
                                  </div> </div>
                             </CardHeader>
                             <CardContent>
                                {isLoading ? ( <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                                ) : error ? ( <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
                                ) : ( filteredUsers.length > 0 ? (
                                         <div className="rounded-md border overflow-x-auto">
                                             <Table>
                                                 <TableHeader> <TableRow> <TableHead>Name</TableHead> <TableHead>Email</TableHead> <TableHead>Role</TableHead> <TableHead>Status</TableHead> {/* Added Status Col */} <TableHead className="hidden sm:table-cell">Registered</TableHead> <TableHead className="text-center">Sent</TableHead> <TableHead className="text-center">Rcvd</TableHead> <TableHead className="text-right">Actions</TableHead> </TableRow> </TableHeader>
                                                 <TableBody>
                                                     {filteredUsers.map((user) => (
                                                         <TableRow key={user.id}>
                                                             <TableCell className="font-medium">{user.firstName || 'N/A'}</TableCell>
                                                             <TableCell>{user.email}</TableCell>
                                                             <TableCell><Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">{user.role}</Badge></TableCell>
                                                             {/* --- VVV Added Status Cell VVV --- */}
                                                             <TableCell>{getStatusBadge(user.status)}</TableCell>
                                                             {/* --- ^^^ Added Status Cell ^^^ --- */}
                                                             <TableCell className="hidden sm:table-cell">{formatDate(user.createdAt)}</TableCell>
                                                             <TableCell className="text-center">{user._count.filesUploaded}</TableCell>
                                                             <TableCell className="text-center">{user._count.filesReceived}</TableCell>
                                                             <TableCell className="text-right">
                                                                 <div className="flex justify-end gap-2">
                                                                     {/* Edit Button */}
                                                                     <Button variant="outline" size="sm" onClick={() => handleEditUser(user)} title="Edit User" className="h-8 w-8 p-0 md:w-auto md:px-3"> <Edit className="h-3.5 w-3.5" /> <span className="sr-only md:not-sr-only md:ml-2">Edit</span> </Button>
                                                                     {/* --- VVV Uncommented Status Toggle Button VVV --- */}
                                                                     <Button variant="outline" size="sm" onClick={() => toggleUserStatus(user.id, user.status)} disabled={isTogglingStatus === user.id || loggedInUser?.id === user.id } title={user.status === 'active' ? 'Suspend User' : 'Activate User'} className="h-8 w-8 p-0 md:w-auto md:px-3"> {isTogglingStatus === user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (user.status === "active" ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />)} <span className="sr-only">{user.status === 'active' ? 'Suspend' : 'Activate'}</span> </Button>
                                                                      {/* --- ^^^ Uncommented Status Toggle Button ^^^ --- */}
                                                                      {/* Delete Button Trigger + Dialog */}
                                                                     <Dialog open={userToDelete?.id === user.id && isDeleteDialogOpen} onOpenChange={(open) => !open && setIsDeleteDialogOpen(false)}>
                                                                         <DialogTrigger asChild>
                                                                             <Button variant="outline" size="sm" title="Delete User" onClick={() => handleDeleteUser(user)} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 md:w-auto md:px-3" disabled={loggedInUser?.id === user.id}> <Trash2 className="h-3.5 w-3.5" /> <span className="sr-only md:not-sr-only md:ml-2">Delete</span> </Button>
                                                                         </DialogTrigger>
                                                                         <DialogContent className="sm:max-w-[425px]">
                                                                             <DialogHeader> <DialogTitle>Delete User?</DialogTitle> <DialogDescription> This action cannot be undone. Associated files will also be deleted. </DialogDescription> </DialogHeader>
                                                                             <div className="py-4"> <p className="font-medium">{userToDelete?.firstName || 'N/A'} ({userToDelete?.email})</p> <p className="text-sm text-muted-foreground capitalize">Role: {userToDelete?.role}</p> </div>
                                                                             <DialogFooter> <DialogClose asChild><Button variant="outline" disabled={isDeletingUser}> Cancel </Button></DialogClose> <Button variant="destructive" onClick={confirmDeleteUser} disabled={isDeletingUser || loggedInUser?.id === userToDelete?.id}> {isDeletingUser ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Deleting...</> : 'Confirm Delete'} </Button> </DialogFooter>
                                                                         </DialogContent>
                                                                     </Dialog>
                                                                 </div>
                                                             </TableCell>
                                                         </TableRow>
                                                     ))}
                                                 </TableBody>
                                             </Table>
                                         </div>
                                     ) : ( /* No users message */ <div className="flex flex-col items-center justify-center py-12 text-center"><h3 className="text-lg font-medium">No users found</h3><p className="text-sm text-muted-foreground mt-1 max-w-md">{searchTerm || roleFilter !== "all" || statusFilter !== "all" ? "No users match your filters." : "No users in system."}</p></div> )
                                )}
                             </CardContent>
                         </Card>
                     </TabsContent>

                     {/* Activity Log Tab (Placeholder) */}
                     <TabsContent value="activity"> <Card> <CardHeader> <CardTitle>Activity Log</CardTitle> <CardDescription>Recent system activity</CardDescription> </CardHeader> <CardContent> <p className="text-sm text-muted-foreground"> Activity log implementation coming soon. </p> </CardContent> </Card> </TabsContent>
                 </Tabs>
             </main>

             {/* Edit User Dialog */}
             <Dialog open={isEditDialogOpen} onOpenChange={(open) => !open && setIsEditDialogOpen(false)}> <DialogContent className="sm:max-w-[500px]"> <DialogHeader> <DialogTitle>Edit User</DialogTitle> <DialogDescription>Update user information.</DialogDescription> </DialogHeader> {editingUser && ( <EditUserForm user={editingUser} onSave={handleSaveUser} onCancel={() => setIsEditDialogOpen(false)} isSaving={isSavingUser} /> )} </DialogContent> </Dialog>

            {/* Footer assumed from layout */}
            <footer className="border-t py-6 md:py-0">
         <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row px-4 md:px-6"> <p className="text-sm text-muted-foreground"> © {new Date().getFullYear()} SecureShare. All rights reserved. </p> <nav className="flex gap-4 sm:gap-6"> <Link href="#" className="text-sm text-muted-foreground hover:text-primary hover:underline underline-offset-4"> Privacy Policy </Link> <Link href="#" className="text-sm text-muted-foreground hover:text-primary hover:underline underline-offset-4"> Terms of Service </Link> </nav> </div>
      </footer>
         </div>
     );
}