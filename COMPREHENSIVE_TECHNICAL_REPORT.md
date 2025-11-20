# SecureShare - Comprehensive Technical Report

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture Deep Dive](#architecture-deep-dive)
3. [File-by-File Breakdown](#file-by-file-breakdown)
4. [Database Architecture](#database-architecture)
5. [Role-Based Access Control (RBAC)](#role-based-access-control)
6. [Encryption & Security](#encryption--security)
7. [Complete Data Flow](#complete-data-flow)
8. [Pros and Cons](#pros-and-cons)
9. [Limitations](#limitations)
10. [Future Prospects](#future-prospects)

---

## Project Overview

**SecureShare** is a Next.js-based secure file-sharing platform designed for educational institutions. It enables authenticated users (students, teachers, admins) to:
- Encrypt and share files securely
- Automatically scan files for malware
- Track file activity and user behavior
- Manage access with time-limited download links
- Administer the system with role-based permissions

**Technology Stack:**
- Frontend: React 18.3 + Next.js 15.2 + Tailwind CSS + Shadcn UI
- Backend: Next.js API Routes (Serverless)
- Database: PostgreSQL + Prisma ORM
- Authentication: JWT (jose library)
- Encryption: AES-256-GCM
- Malware Scanning: Windows Defender integration
- File Handling: Stream-based processing
- Email: Nodemailer

---

## Architecture Deep Dive

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│  (React Components - Upload, Download, Dashboard, Admin)        │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP(S)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NEXT.JS SERVER                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Middleware (JWT verification, Auth checks)             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                               │                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  API Routes                                              │   │
│  │  - Authentication (login, register, logout)             │   │
│  │  - File Operations (upload, download, revoke)           │   │
│  │  - File Retrieval (shared, received files)              │   │
│  │  - Admin Operations (users, activity logs)              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                               │                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Library Functions                                       │   │
│  │  - Encryption/Decryption (AES-256-GCM)                 │   │
│  │  - File Scanning (Windows Defender)                    │   │
│  │  - Activity Logging                                    │   │
│  │  - Authentication (JWT verification)                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────┬───────────────────────┬────────────────────┬──┘
                   │                       │                    │
      ┌────────────▼────┐      ┌──────────▼─────┐  ┌───────────▼────┐
      │   PostgreSQL    │      │  Filesystem    │  │  Nodemailer    │
      │   (Prisma ORM)  │      │ (Encrypted     │  │  (Email        │
      │                │      │  Uploads)      │  │   Service)     │
      └─────────────────┘      └────────────────┘  └────────────────┘
```

### Key Architecture Principles

1. **Layered Architecture**
   - Presentation Layer: React components (UI)
   - API Layer: Next.js routes (business logic)
   - Service Layer: Library functions (encryption, scanning, logging)
   - Data Layer: PostgreSQL + Prisma (persistence)

2. **Stream-Based Processing**
   - Files are never fully loaded into memory
   - Encrypted/decrypted through streams
   - Improves performance for large files

3. **Middleware Protection**
   - JWT verification at application level
   - Role-based route protection
   - IP address tracking for security

4. **Fire-and-Forget Logging**
   - Activity logs don't block main operations
   - Failures don't cascade to user experience

---

## File-by-File Breakdown

### 1. **Frontend Entry Points**

#### `app/page.tsx` (Home Page)
**Purpose:** Landing page with project overview
**Key Features:**
- Hero section with call-to-action buttons
- Feature highlights (encryption, scanning, security)
- Links to login/register pages
**How It Works:**
- Static UI component
- No authentication required
- Responsive design using Tailwind

**Code Snippet Understanding:**
```typescript
// This is a client component (public access)
// Displays landing page UI
// No API calls or protected content
```

---

#### `app/register/page.tsx` (Registration Form)
**Purpose:** User registration interface
**Key Features:**
- Form inputs: firstName, lastName, email, password, role, idNumber
- Real-time form validation using React Hook Form + Zod
- Role selection (Student/Teacher)
- Password strength validation
**How It Works:**
1. User fills form with credentials
2. Validates input client-side
3. Submits POST to `/api/register`
4. If successful, redirects to dashboard
5. Token stored in HttpOnly cookie

**Important Logic:**
```typescript
// User enters: firstName, lastName, email, password, role (student/teacher), idNumber
// Frontend validates format
// POST /api/register with FormData
// Backend verifies idNumber exists in PreExistingIDs table
// If valid, creates User record with bcrypt-hashed password
// Returns JWT token and redirects
```

---

#### `app/login/page.tsx` (Login Form)
**Purpose:** User authentication interface
**Key Features:**
- Email/password input
- Form validation
- Remember me checkbox (optional)
- Link to registration for new users
**How It Works:**
1. User enters email and password
2. Submits POST to `/api/login`
3. Backend validates credentials
4. Returns JWT token in response
5. Frontend stores in HttpOnly cookie
6. Redirects to dashboard

**Authentication Flow:**
```
User Input → Validation → POST /api/login → JWT Generation → Cookie Set → Redirect
```

---

#### `app/dashboard/page.tsx` (Main Dashboard)
**Purpose:** Central hub for file management and user activity
**Key Features:**
- **Two tabs:** "Sent by Me" and "Received Files"
- **Sent Files Table:** Shows files uploaded by current user
  - Columns: File Name, Recipient, Upload Date, Expiry, Security Status
  - Actions: View Link, Revoke Access
  - Search and filtering capabilities
- **Received Files Table:** Shows files shared with current user
  - Columns: File Name, Sender, Share Date, Expiry, Security Status
  - Action: Download button (if still active)
- **Real-time status:** Active/Expired/Revoked indicators
- **Scan status badges:** CLEAN/THREAT_DETECTED/ERROR/PENDING

**How It Works:**
```typescript
// Component loads on mount
useEffect(() => {
  // Fetches two concurrent API calls:
  1. GET /api/files/shared     → User's uploaded files
  2. GET /api/files/received   → Files shared with user
}, []);

// Client-side filtering:
- Search by file name or sender
- Filter by status
- Responsive table design

// User Actions:
- Click "View" → Opens /download/{token} in new tab
- Click "Revoke" → DELETE /api/files/revoke/{fileId}
- Click "Download" → Triggers browser download
```

**State Management:**
```typescript
const [sentFiles, setSentFiles] = useState([]);         // Files uploaded by user
const [receivedFiles, setReceivedFiles] = useState([]); // Files received by user
const [searchTerm, setSearchTerm] = useState("");       // Search input
const [activeTab, setActiveTab] = useState("sent");     // Tab selection
const [isRevoking, setIsRevoking] = useState(null);     // Revoke loading state
```

---

#### `app/upload/page.tsx` (File Upload Page)
**Purpose:** Upload and encrypt files for sharing
**Key Features:**
- File picker component
- Recipient email input
- Real-time scanning status
- Scan results display (CLEAN/THREAT_DETECTED)
- Generated download link display
- Security information panel

**How It Works:**
```typescript
handleFileUpload(file, recipientEmail) {
  1. Validate file and recipient email
  2. Create FormData: { file, recipientEmail }
  3. POST to /api/upload
  4. Display scanning status
  5. Receive response with:
     - success flag
     - downloadUrl
     - scanResult (CLEAN/THREAT_DETECTED/ERROR)
  6. If successful: Show DownloadLinkCard
  7. If threat detected: Show error alert with threat details
}
```

**Upload Component Flow:**
```
User Selects File → Enters Recipient Email → Click Upload
                    ↓
            POST /api/upload (FormData)
                    ↓
         Backend: Scans → Encrypts → Saves → Email
                    ↓
         Returns: { downloadUrl, scanResult }
                    ↓
    Display: Scan Results + Download Link + Share Instructions
```

**Key State Variables:**
```typescript
uploadComplete           // Whether upload succeeded
downloadUrl             // Generated sharing URL
isUploading             // Upload in progress
recipientEmailForCard   // Email to display
scanResult              // { status, engine, threatName, details }
isScanning              // Scan in progress
```

---

#### `app/download/[token]/page.tsx` (File Download Page)
**Purpose:** Display file metadata and provide download interface
**Key Features:**
- Dynamic route using token parameter
- Fetches file metadata from API
- Displays file name and size
- Download button
- Security information
- Error handling for expired/revoked links

**How It Works:**
```typescript
// Component mounts with token from URL params
useEffect(() => {
  if (!token) {
    setError("Token missing");
    return;
  }
  
  // Validate token format (64 hex characters)
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    setError("Invalid token format");
    return;
  }
  
  // Fetch metadata
  fetch(`/api/metadata/${token}`)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setFileDetails(data.metadata); // { fileName, size, mimeType }
      } else {
        setError(data.error);
      }
    });
}, [token]);

// Download button
<a href={`/api/download/${token}`} download>
  // This triggers the actual download
  // Backend decrypts and streams file
</a>
```

**Error States:**
- Token missing → "Download token missing from URL"
- Invalid format → "Invalid download link format"
- Token not found → "Invalid or expired download link"
- Link expired → "Download link has expired"
- Not authorized → "Access denied. You are not authorized"

---

#### `app/admin/dashboard/page.tsx` (Admin Dashboard)
**Purpose:** System administration and monitoring
**Key Features:**
- **User Management Tab:**
  - Table of all users
  - Search by name/email
  - Filter by role (Admin/Teacher/Student)
  - Filter by status (Active/Suspended)
  - Actions: Edit, Suspend/Activate, Delete
  - Statistics: Total users, active users, files sent/received
  - User role distribution chart
- **Activity Log Tab:**
  - Timeline of all system actions
  - Columns: Timestamp, Actor Email, IP Address, Action, Details
  - Real-time updates

**How It Works:**
```typescript
// Admin access check in UserContext
if (currentUser?.role !== 'admin') {
  Redirect to /dashboard
}

// Data Fetching
1. GET /api/admin/users/summary
   - Returns all users with file counts
   - { id, email, firstName, lastName, role, status, _count }

2. GET /api/admin/activity
   - Returns activity logs
   - { id, createdAt, actorEmail, action, details, ipAddress }

// Admin Actions
1. Edit User → PATCH /api/admin/users/{userId}
   - Update: firstName, lastName, role, status

2. Delete User → DELETE /api/admin/users/{userId}
   - Removes user and associated files

3. Toggle Status → PATCH /api/admin/users/{userId}/status
   - Switch: active ↔ suspended

4. View Logs → GET /api/admin/activity
   - Query with filters
```

---

### 2. **API Routes (Backend Logic)**

#### `app/api/register/route.ts` (Registration API)
**Purpose:** Create new user accounts
**HTTP Method:** POST
**Input:** `{ firstName, lastName, email, password, role, idNumber }`
**Process:**
```
1. Parse JSON body
2. Validate email uniqueness → Check User table
3. Validate idNumber uniqueness → Check User table
4. Validate idNumber exists → Check PreExistingIDs table
5. Hash password with bcrypt (10 salt rounds)
6. Create User record in database
7. Generate JWT token
8. Set HttpOnly cookie
9. Return response with token
```

**Error Handling:**
- 400: Email already exists / ID number already exists / ID not found
- 500: Internal server error

**Response:**
```json
{
  "message": "Registration successful",
  "redirectUrl": "/dashboard",
  "user": { "id": "...", "email": "...", "role": "..." },
  "token": "eyJhbGc..."
}
```

---

#### `app/api/login/route.ts` (Login API)
**Purpose:** Authenticate users
**HTTP Method:** POST
**Input:** `{ email, password }`
**Process:**
```
1. Parse JSON body
2. Find user by email → User table
3. Compare password with bcrypt hash
4. Log login attempt (success or failure)
5. Generate JWT token (24-hour expiry)
6. Set HttpOnly cookie
7. Return response with token
```

**Security Features:**
- Logs both successful and failed login attempts
- Includes IP address in logs
- Password never compared in plaintext (bcrypt)
- JWT includes: id, email, role

**Error Handling:**
- 401: Invalid email or password
- 500: Internal server error

---

#### `app/api/upload/route.ts` (File Upload & Encryption)
**Purpose:** Upload, scan, encrypt, and store files
**HTTP Method:** POST
**Input:** FormData with `{ file, recipientEmail }`

**Complete Upload Pipeline:**

```
Step 1: AUTHENTICATION
├─ Extract JWT from cookie
├─ Verify user logged in
└─ Log upload initiated

Step 2: VALIDATION
├─ Parse FormData
├─ Check file exists
├─ Check recipientEmail provided
├─ Find recipient in User table
└─ Validate file size < 50MB

Step 3: MALWARE SCANNING
├─ Create temp file on disk
├─ Call scanFile() function:
│  ├─ Try Windows Defender PowerShell
│  ├─ If fail, try Windows Defender CLI
│  └─ If fail, try hash-based scan
├─ If THREAT_DETECTED:
│  ├─ Delete temp file
│  ├─ Log threat detection
│  └─ Return error response (400)
└─ Continue if CLEAN or ERROR

Step 4: ENCRYPTION
├─ Generate random 12-byte IV
├─ Create AES-256-GCM cipher
├─ Stream file through cipher
├─ Extract auth tag (16 bytes)
├─ Save encrypted file as {uuid}.enc
├─ Delete temp scan file
└─ Store IV and auth tag for later

Step 5: DATABASE
├─ Generate random 32-byte token
├─ Calculate expiry (now + 24 hours)
├─ Create File record with:
│  ├─ fileName, filePath, mimeType, size
│  ├─ recipientEmail, uploaderId, recipientId
│  ├─ iv, authTag (as hex strings)
│  ├─ downloadToken, tokenExpiresAt
│  ├─ scanStatus, scanResult, scannedAt, scanEngine
│  └─ Return file.id
└─ Log FILE_UPLOAD and FILE_SCAN_CLEAN

Step 6: EMAIL NOTIFICATION
├─ Build download URL: /download/{token}
├─ Send email with:
│  ├─ Uploader name
│  ├─ Download link
│  ├─ Expiry time (24 hours)
│  └─ Security info
└─ Catch email errors (non-blocking)

Step 7: RESPONSE
├─ Return success response:
│  ├─ success: true
│  ├─ downloadUrl (for uploader to share)
│  ├─ scanResult
│  └─ fileId
└─ Frontend shows link and scan results
```

**Error Scenarios:**
- 401: User not authenticated
- 400: No file uploaded / Missing recipient email / Invalid recipient
- 413: File exceeds 50MB limit
- 400: Threat detected in file
- 500: Encryption failed / Database error

**Key Encryption Details:**
```typescript
const ALGORITHM = "aes-256-gcm";  // 256-bit AES with GCM mode
const KEY_ENV_VAR = "ENCRYPTION_KEY";  // Must be 64 hex chars (32 bytes)
const secretKeyHex = process.env[KEY_ENV_VAR];  // From environment
const secretKey = Buffer.from(secretKeyHex, 'hex');  // Convert to buffer

// For each file:
const iv = crypto.randomBytes(12);  // 12-byte random IV
const cipher = crypto.createCipheriv(ALGORITHM, secretKey, iv);
const authTag = cipher.getAuthTag();  // Proves integrity

// Store in DB:
iv.toString('hex')  // Store as hex string
authTag.toString('hex')  // Store as hex string
```

---

#### `app/api/download/[token]/route.ts` (File Decryption & Download)
**Purpose:** Securely download and decrypt files
**HTTP Method:** GET
**Parameter:** `{token}` - Download token from URL

**Complete Download Pipeline:**

```
Step 1: TOKEN VALIDATION
├─ Extract token from URL params
├─ Validate format (64 hex characters)
└─ If invalid: return 400

Step 2: AUTHENTICATION
├─ Extract JWT from cookie
├─ Verify token signature
├─ Check token not expired
└─ If not authenticated: return 401

Step 3: DATABASE LOOKUP
├─ Query File table by downloadToken
├─ Select all necessary fields
└─ If not found: return 404

Step 4: TOKEN EXPIRY CHECK
├─ Compare tokenExpiresAt with current time
└─ If expired: return 410 (Gone)

Step 5: AUTHORIZATION CHECK
├─ Get current user email from JWT
├─ Compare with fileRecord.recipientEmail
└─ If not recipient: return 403 (Forbidden)

Step 6: FILE EXISTENCE CHECK
├─ Verify encrypted file exists on disk
├─ Check read permissions
└─ If missing: return 503 (Service Unavailable)

Step 7: DECRYPTION SETUP
├─ Extract IV from database (convert from hex)
├─ Extract auth tag from database (convert from hex)
├─ Create decipher with AES-256-GCM
├─ Set auth tag for integrity verification
└─ Create read stream from encrypted file

Step 8: LOG DOWNLOAD
├─ Call logActivity()
├─ Log: FILE_DOWNLOAD action
├─ Include IP address
└─ Non-blocking (doesn't wait for completion)

Step 9: RESPONSE
├─ Set Content-Type (original MIME type)
├─ Set Content-Disposition (filename)
├─ Set Content-Length
├─ Stream decrypted content to client
└─ Browser downloads decrypted file
```

**Security Chain:**
```
Auth Check → Authorization Check → Expiry Check → File Exists → Decrypt → Download
```

**Error Handling:**
- 400: Invalid token format
- 401: User not authenticated
- 403: User not authorized (not recipient)
- 404: Token not found
- 410: Link expired
- 503: Encrypted file missing on disk
- 500: Decryption error

---

#### `app/api/files/shared/route.ts` (List Uploaded Files)
**Purpose:** Return files the user has uploaded
**HTTP Method:** GET
**Authentication:** Required (JWT cookie)

**Process:**
```typescript
1. Authenticate user
2. Query File table WHERE uploaderId = currentUser.id
3. For each file, calculate status:
   - Check if downloadToken is null → 'revoked'
   - Check if tokenExpiresAt < now → 'expired'
   - Otherwise → 'active'
4. Return array of:
   {
     id, fileName, size, createdAt,
     recipientEmail, tokenExpiresAt, downloadToken,
     status, scanStatus, scanResult, scannedAt, scanEngine
   }
```

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "id": 1,
      "fileName": "document.pdf",
      "size": 1024000,
      "createdAt": "2024-01-15T10:30:00Z",
      "recipientEmail": "student@school.edu",
      "tokenExpiresAt": "2024-01-16T10:30:00Z",
      "downloadToken": "a1b2c3d4...",
      "status": "active",
      "scanStatus": "CLEAN",
      "scanEngine": "Windows Defender",
      "scannedAt": "2024-01-15T10:29:00Z"
    }
  ]
}
```

---

#### `app/api/files/received/route.ts` (List Received Files)
**Purpose:** Return files shared with the user
**HTTP Method:** GET
**Authentication:** Required (JWT cookie)

**Process:**
```typescript
1. Authenticate user
2. Query File table WHERE recipientId = currentUser.id
3. Include uploader relation (sender's details)
4. For each file, calculate status (same as shared)
5. Return array with uploader information
```

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "id": 1,
      "fileName": "lecture.pdf",
      "size": 2048000,
      "createdAt": "2024-01-15T09:00:00Z",
      "uploader": {
        "id": "user-uuid-123",
        "email": "teacher@school.edu",
        "name": "John"  // firstName
      },
      "status": "active",
      "downloadToken": "x9y8z7w6...",
      "scanStatus": "CLEAN"
    }
  ]
}
```

---

#### `app/api/files/revoke/[fileId]/route.ts` (Revoke File Access)
**Purpose:** Disable file download link
**HTTP Method:** DELETE
**Parameter:** `{fileId}` - File database ID

**Process:**
```
1. Authenticate user
2. Parse and validate fileId (must be integer)
3. Query File table by fileId
4. Check authorization (currentUser.id == fileRecord.uploaderId)
5. If authorized:
   ├─ Set downloadToken = null
   ├─ Set tokenExpiresAt = null
   ├─ Log FILE_REVOKE activity
   └─ Return success
6. If not authorized: return 403
```

**Error Handling:**
- 400: Invalid file ID format
- 401: Not authenticated
- 403: Not authorized (not uploader)
- 404: File not found
- 500: Database error

---

#### `app/api/metadata/[token]/route.ts` (Get File Metadata)
**Purpose:** Return file details without actual file content
**HTTP Method:** GET
**Parameter:** `{token}` - Download token

**Process:**
```
1. Validate token format
2. Authenticate user
3. Query File table by downloadToken
4. Check expiry
5. Check authorization (currentUser.email == recipientEmail)
6. Return metadata only:
   {
     fileName,
     size,
     mimeType
   }
```

**Purpose of Metadata Endpoint:**
- Download page needs to show file details before actual download
- Keeps traffic minimal (no file download until user confirms)
- Separate authorization checks

---

#### `app/api/admin/users/summary/route.ts` (Get All Users)
**Purpose:** Admin dashboard - user list with statistics
**HTTP Method:** GET
**Authentication:** Required (Admin role only)

**Process:**
```
1. Authenticate user
2. Check if role == 'admin' (403 if not)
3. Query all users with:
   - Select: id, email, firstName, lastName, role, status, createdAt
   - Include _count:
     - filesUploaded (count of files uploaded)
     - filesReceived (count of files received)
4. Order by createdAt DESC
5. Return all users
```

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "email": "admin@school.edu",
      "firstName": "Admin",
      "lastName": "User",
      "role": "admin",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00Z",
      "_count": {
        "filesUploaded": 5,
        "filesReceived": 3
      }
    }
  ]
}
```

---

#### `app/api/admin/users/[userId]/route.ts` (Admin Edit/Delete User)
**Purpose:** Modify or remove user accounts
**HTTP Methods:** PATCH (edit), DELETE (remove)
**Parameter:** `{userId}` - User database ID

**PATCH Process:**
```
1. Authenticate user (admin check)
2. Parse request body for updates:
   { firstName?, lastName?, role?, status? }
3. Update User record
4. Return updated user
```

**DELETE Process:**
```
1. Authenticate user (admin check)
2. Delete User record (cascades to delete related Files)
3. Return 204 No Content
```

---

#### `app/api/admin/users/[userId]/status/route.ts` (Toggle User Status)
**Purpose:** Activate or suspend user accounts
**HTTP Method:** PATCH
**Input:** `{ status: "active" | "suspended" }`

**Process:**
```
1. Authenticate (admin check)
2. Validate new status
3. Update User.status
4. If suspended: disable future access (but keep JWT valid until expiry)
5. Return updated status
```

---

#### `app/api/admin/activity/route.ts` (Get Activity Logs)
**Purpose:** Audit trail of system actions
**HTTP Method:** GET
**Authentication:** Required (Admin role only)

**Process:**
```
1. Authenticate user (admin check)
2. Query ActivityLog table
3. Order by createdAt DESC
4. Include filters (optional):
   - Date range
   - User email
   - Action type
5. Return logs with:
   { id, createdAt, actorEmail, action, details, ipAddress }
```

---

#### `app/api/logout/route.ts` (Logout)
**Purpose:** Clear authentication
**HTTP Method:** POST

**Process:**
```
1. Clear token cookie
2. Log logout activity
3. Return success
```

---

#### `app/api/users/me/route.ts` (Current User Info)
**Purpose:** Get logged-in user details
**HTTP Method:** GET
**Authentication:** Required

**Process:**
```
1. Authenticate user
2. Return current user info:
   { id, email, firstName, lastName, role }
```

---

### 3. **Library Functions (Service Layer)**

#### `lib/encryption.ts` (Encryption Utilities)
**Purpose:** Placeholder for encryption functions
**Status:** Currently contains only stubs
**Actual Implementation in `/api/upload` and `/api/download`**

```typescript
// These are placeholders - actual encryption happens inline in routes

export async function encryptFile(fileBuffer, key)  // Stub
export async function decryptFile(encryptedBuffer, key)  // Stub
export function generateEncryptionKey()  // Stub
```

**Real encryption flow:**
```typescript
// In upload route:
const ALGORITHM = "aes-256-gcm";
const cipher = crypto.createCipheriv(ALGORITHM, secretKey, iv);
// Stream file through cipher

// In download route:
const decipher = crypto.createDecipheriv(ALGORITHM, secretKey, iv);
decipher.setAuthTag(authTag);  // Integrity verification
// Stream through decipher back to client
```

---

#### `lib/fileScanner.ts` (Malware Scanning)
**Purpose:** Scan files for threats before encryption
**Scanning Methods:**

```typescript
1. Windows Defender PowerShell
   Command: Start-MpScan -ScanPath '{filePath}' -ScanType QuickScan
   Timeout: 30 seconds
   
2. Windows Defender CLI (Fallback)
   Command: MpCmdRun.exe -Scan -ScanType 3 -File "{filePath}"
   Fallback if PowerShell fails
   
3. Hash-Based Scan (Last Resort)
   - Generate SHA256 hash of file
   - Compare against known malware signatures
   - Currently empty (would use threat intel feed)
```

**Main Function: `scanFile(filePath)`**

```typescript
export async function scanFile(filePath: string): Promise<ScanResult> {
  // ScanResult: { status, engine, details?, threatName? }
  
  // 1. Verify file exists
  if (!fs.existsSync(filePath)) {
    return { status: 'ERROR', ... }
  }
  
  // 2. Try Windows Defender PowerShell
  const result = await scanWithWindowsDefender(filePath);
  
  // 3. If fails, try CLI method
  if (result.status === 'ERROR') {
    return await scanWithDefenderCLI(filePath);
  }
  
  // 4. Return result (CLEAN, THREAT_DETECTED, or ERROR)
  return result;
}
```

**Response Types:**
```typescript
interface ScanResult {
  status: 'CLEAN' | 'THREAT_DETECTED' | 'ERROR';
  engine: string;  // "Windows Defender", "Windows Defender CLI", "Hash-based Scanner"
  details?: string;  // Detailed message
  threatName?: string;  // Name of detected threat
}
```

**Usage in Upload:**
```typescript
// After saving temp file:
const scanResult = await scanFile(tempFilePath);

if (scanResult.status === 'THREAT_DETECTED') {
  // Delete temp file
  // Return error response
  // Log threat detection with threat name
} else {
  // Continue with encryption
}
```

---

#### `lib/auth-utils.ts` (Authentication & JWT Verification)
**Purpose:** Verify JWT tokens and authenticate requests
**Main Export: `getCurrentUser(request)`**

```typescript
export async function getCurrentUser(request: NextRequest): Promise<{
  id: string;
  email: string;
  role: string;
} | null> {
  // 1. Extract token from HttpOnly cookie named "token"
  const token = request.cookies.get("token")?.value;
  
  if (!token) {
    return null;  // No token found
  }
  
  try {
    // 2. Verify JWT using jose library
    const { payload } = await jwtVerify(token, secretKey);
    
    // 3. Validate payload structure
    const userId = payload.id;
    if (!userId || typeof userId !== 'string') {
      return null;  // Invalid payload
    }
    
    // 4. Fetch user from database (ensures still exists)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true }
    });
    
    if (!user) {
      return null;  // User deleted after token created
    }
    
    // 5. Return authenticated user
    return user;
    
  } catch (error) {
    // Handle JWT errors:
    // - ERR_JWT_EXPIRED: Token expired
    // - ERR_JWS_SIGNATURE_VERIFICATION_FAILED: Invalid signature
    // - Other: Verification failed
    return null;
  }
}
```

**Why Database Lookup?**
- Ensures user still exists
- Gets current user role (might have been changed)
- Validates token is still valid

**Used In:**
- All protected API routes (start of function)
- Middleware JWT verification
- Dashboard and admin pages

---

#### `lib/logger.ts` (Activity Logging)
**Purpose:** Log all system activities for audit trail
**Main Export: `logActivity(actorEmail, action, details?, ipAddress?)`**

```typescript
export async function logActivity(
  actorEmail: string,
  action: ActionType,  // Enum from Prisma
  details?: string,
  ipAddress?: string
): Promise<void> {
  try {
    // Create log entry in ActivityLog table
    await prisma.activityLog.create({
      data: {
        actorEmail,
        action,
        details,
        ipAddress,
        // createdAt automatically set
      }
    });
  } catch (error) {
    // Fire-and-forget: Log error to console, don't throw
    console.error(`Failed to log activity: ${action} by ${actorEmail}`);
  }
}
```

**ActionType Enum Values:**
```typescript
USER_REGISTER              // User created account
USER_LOGIN_SUCCESS         // Login succeeded
USER_LOGIN_FAIL            // Login failed
USER_LOGOUT                // User logged out
FILE_UPLOAD                // File uploaded
FILE_DOWNLOAD              // File downloaded
FILE_REVOKE                // Download link revoked
FILE_SCAN_THREAT_DETECTED  // Malware found
FILE_SCAN_CLEAN            // File scanned clean
ADMIN_USER_EDIT            // Admin modified user
ADMIN_USER_DELETE          // Admin deleted user
ADMIN_USER_STATUS_CHANGE   // Admin changed status
ADMIN_SHARE_REVOKE         // Admin revoked share
```

**Fire-and-Forget Pattern:**
- Logging errors don't crash the main operation
- Non-blocking (doesn't await completion)
- Improves user experience (no wait for logs)

**Called In:**
- Login (success and failure)
- Upload (FILE_UPLOAD and FILE_SCAN_CLEAN)
- Download (FILE_DOWNLOAD)
- Revoke (FILE_REVOKE)
- Admin operations (ADMIN_*)

---

#### `lib/request-ip.ts` (IP Address Extraction)
**Purpose:** Extract client IP from request headers
**Main Export: `getClientIpFromHeaders(headers)`**

```typescript
export function getClientIpFromHeaders(headers: Headers): string {
  // 1. Check X-Forwarded-For (most common proxy header)
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    return xff.split(',')[0].trim();  // Left-most IP is original client
  }
  
  // 2. Check other proxy headers
  const candidates = [
    'x-real-ip',           // Nginx reverse proxy
    'cf-connecting-ip',    // Cloudflare
    'true-client-ip',      // CloudFlare Enterprise
    'fly-client-ip'        // Fly.io
  ];
  for (const header of candidates) {
    const value = headers.get(header);
    if (value) return value;
  }
  
  // 3. Check RFC 7239 Forwarded header
  const fwd = headers.get('forwarded');
  if (fwd) {
    const match = /for=([^;\s]+)/i.exec(fwd);
    if (match && match[1]) return stripQuotes(match[1]);
  }
  
  // 4. Last resort
  const remoteAddr = headers.get('x-remote-address');
  if (remoteAddr) return remoteAddr;
  
  return 'unknown';
}
```

**Why Multiple Headers?**
- Different proxy architectures use different headers
- Prioritizes most reliable first
- Handles localhost development (no headers)

**Used In:**
- Activity logging (attach IP to audit logs)
- Security monitoring (track suspicious access patterns)

---

#### `lib/prisma.ts` (Database Connection Singleton)
**Purpose:** Ensure single Prisma client instance
**Why Important?**
- Prevent connection pool exhaustion
- Reuse connections across serverless functions
- Hot reload in development

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma = 
  globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;  // Reuse in dev
}
```

**How It Works:**
```
Development:
  First import: Create new Prisma client, attach to global
  Subsequent imports: Reuse from global (avoid multiple instances)

Production:
  Each serverless function gets fresh instance (isolated)
  But they all connect to same DB and share connection pool
```

---

### 4. **UI Components (Shadcn)**

#### `components/file-upload-card.tsx` (File Upload Component)
**Purpose:** Reusable file picker and uploader
**Features:**
- Drag-and-drop file input
- File selection button
- Recipient email input
- Upload button with loading state
- File preview

**Usage:**
```typescript
<FileUploadCard 
  onUploadComplete={handleFileUpload} 
  isUploading={isUploading} 
/>
```

---

#### `components/download-link-card.tsx` (Share Link Display)
**Purpose:** Show download link after upload
**Features:**
- Display generated link
- Copy to clipboard button
- Share instructions
- Reset button

**Usage:**
```typescript
<DownloadLinkCard 
  downloadLink={downloadUrl} 
  email={recipientEmail} 
  onReset={handleReset} 
/>
```

---

#### `components/theme-provider.tsx` & `components/theme-toggle.tsx` (Theming)
**Purpose:** Light/dark mode support
**Features:**
- Theme provider setup
- Toggle button
- Persistent theme preference

---

### 5. **Context & Hooks**

#### `context/UserContext.tsx` (User State Management)
**Purpose:** Share user info across app
**Provides:** { user, isLoading, logout }

```typescript
const { user, isLoading, logout } = useUser();

// user: { id, email, firstName, lastName, role }
```

---

#### `hooks/use-toast.ts` (Toast Notifications)
**Purpose:** Show temporary notifications
**Usage:**
```typescript
const { toast } = useToast();

toast({
  title: "Success",
  description: "File uploaded!",
  variant: "default"  // or "destructive"
});
```

---

### 6. **Middleware**

#### `app/middleware.ts` (Request Authentication & Authorization)
**Purpose:** Global request filtering and auth checks
**How It Works:**

```typescript
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // 1. Protected routes (require any authenticated user)
  const protectedRoutes = [
    "/upload", "/dashboard", "/download/",
    "/api/files/shared", "/api/files/revoke/",
    "/api/metadata/", "/api/download/", "/api/users/me"
  ];
  
  // 2. Admin routes (require admin role)
  const adminRoutes = ["/admin", "/api/admin"];
  
  // 3. Verify JWT token
  const payload = await verifyTokenAndGetPayload(req);
  const isAuthenticated = !!payload;
  
  // 4. Check admin routes first
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    if (!isAuthenticated) return redirect("/login");
    if (payload.role !== 'admin') return redirect("/dashboard");
    return NextResponse.next();
  }
  
  // 5. Check protected routes
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!isAuthenticated) return redirect("/login");
    return NextResponse.next();
  }
  
  // 6. Allow public routes
  return NextResponse.next();
}
```

**Matcher Config:**
```typescript
export const config = {
  matcher: [protectedRoutes, adminRoutes]
};
```

**Flow:**
```
Incoming Request
    ↓
Match against patterns
    ↓
Is it admin route? → Check role → Allow/Deny
    ↓
Is it protected route? → Check auth → Allow/Deny
    ↓
Is it public? → Allow
```

---

### 7. **Database Schema**

#### `prisma/schema.prisma` (Data Model)
**Purpose:** Define database structure

**Models:**

1. **User**
   ```prisma
   model User {
     id String @id @default(uuid())
     firstName String
     lastName String
     email String @unique
     password String  // bcrypt hash
     role String      // "admin", "teacher", "student"
     idNumber String @unique  // Student ID or Teacher ID
     createdAt DateTime @default(now())
     status String @default("active")  // "active" or "suspended"
     
     filesUploaded File[] @relation("UploadedFiles")
     filesReceived File[] @relation("ReceivedFiles")
   }
   ```

2. **File**
   ```prisma
   model File {
     id Int @id @default(autoincrement())
     fileName String
     filePath String  // Path to encrypted file on disk
     mimeType String
     size Int
     recipientEmail String
     iv String  // Initialization vector (hex)
     authTag String  // GCM auth tag (hex)
     downloadToken String? @unique  // Random token
     tokenExpiresAt DateTime?
     createdAt DateTime @default(now())
     
     // Scan results
     scanStatus ScanStatus @default(PENDING)  // PENDING, CLEAN, THREAT_DETECTED, ERROR
     scanResult String?  // Detailed results
     scannedAt DateTime?
     scanEngine String?  // "Windows Defender", etc.
     
     // Relations
     uploaderId String
     uploader User @relation("UploadedFiles", fields: [uploaderId], references: [id])
     recipientId String?
     recipient User? @relation("ReceivedFiles", fields: [recipientId], references: [id])
     
     // Indexes for performance
     @@index([recipientId])
     @@index([uploaderId])
     @@index([scanStatus])
   }
   ```

3. **ActivityLog**
   ```prisma
   model ActivityLog {
     id Int @id @default(autoincrement())
     createdAt DateTime @default(now())
     actorEmail String
     action ActionType  // Enum
     details String?
     ipAddress String?
     
     // Indexes
     @@index([createdAt])
     @@index([actorEmail])
   }
   ```

4. **PreExistingIDs**
   ```prisma
   model PreExistingIDs {
     id String @id @default(uuid())
     studentId String?
     teacherId String?
   }
   ```

5. **ActionType Enum**
   ```prisma
   enum ActionType {
     USER_REGISTER
     USER_LOGIN_SUCCESS
     USER_LOGIN_FAIL
     USER_LOGOUT
     FILE_UPLOAD
     FILE_DOWNLOAD
     FILE_REVOKE
     FILE_SCAN_THREAT_DETECTED
     FILE_SCAN_CLEAN
     ADMIN_USER_EDIT
     ADMIN_USER_DELETE
     ADMIN_USER_STATUS_CHANGE
     ADMIN_SHARE_REVOKE
   }
   ```

6. **ScanStatus Enum**
   ```prisma
   enum ScanStatus {
     PENDING
     CLEAN
     THREAT_DETECTED
     ERROR
   }
   ```

---

## Database Architecture

### Entity Relationship Diagram

```
┌─────────────────┐
│     User        │
├─────────────────┤
│ id (PK)         │
│ email (UNIQUE)  │
│ firstName       │
│ lastName        │
│ password (hash) │
│ role            │◄────────┐
│ idNumber        │         │
│ status          │         │
│ createdAt       │         │
└─────────────────┘         │
        ▲                    │
        │                    │
        │ 1                  │ N
        │                    │
        │ uploaderId         │ recipientId
        │                    │
        │ (1 user can        │ (1 user can
        │  upload many       │  receive many
        │  files)            │  files)
        │                    │
┌────────────────────────────────────────────┐
│               File                         │
├────────────────────────────────────────────┤
│ id (PK, Int)                               │
│ fileName, filePath, mimeType, size         │
│ recipientEmail, downloadToken              │
│ tokenExpiresAt, createdAt                  │
│ iv, authTag (encryption keys)              │
│ scanStatus, scanResult, scanEngine         │
│ uploaderId (FK) ────┐                      │
│ recipientId (FK) ───┼──→ User              │
└────────────────────────────────────────────┘
        │
        │ N files logged for each action
        ▼
┌──────────────────────────┐
│    ActivityLog           │
├──────────────────────────┤
│ id (PK, Int)             │
│ createdAt                │
│ actorEmail               │
│ action (ActionType enum) │
│ details                  │
│ ipAddress                │
└──────────────────────────┘
```

### Indexes for Performance

```typescript
// File table indexes:
@@index([recipientId])   // Fast lookup: "files for this recipient"
@@index([uploaderId])    // Fast lookup: "files uploaded by user"
@@index([scanStatus])    // Fast lookup: "files with threat_detected"

// ActivityLog indexes:
@@index([createdAt])     // Fast lookup: "logs in date range"
@@index([actorEmail])    // Fast lookup: "logs by specific user"
```

### Query Patterns

**1. Get Files Uploaded by User:**
```sql
SELECT * FROM File 
WHERE uploaderId = {userId}
ORDER BY createdAt DESC;
```

**2. Get Files Received by User:**
```sql
SELECT File.*, User.email as uploader_email
FROM File
LEFT JOIN User ON File.uploaderId = User.id
WHERE File.recipientId = {userId}
ORDER BY File.createdAt DESC;
```

**3. Find File by Download Token:**
```sql
SELECT * FROM File 
WHERE downloadToken = {token}
AND tokenExpiresAt > NOW();
```

**4. Get Activity Logs for Admin:**
```sql
SELECT * FROM ActivityLog
WHERE createdAt BETWEEN {startDate} AND {endDate}
ORDER BY createdAt DESC;
```

---

## Role-Based Access Control (RBAC)

### Role Hierarchy

```
┌──────────────────────────────────────────────┐
│              RBAC System                     │
└──────────────────────────────────────────────┘
         │
         ├─ Student
         │  └─ Permissions:
         │     ├─ Upload files
         │     ├─ Receive files
         │     ├─ Download shared files
         │     ├─ View own files
         │     └─ Revoke own shares
         │
         ├─ Teacher
         │  └─ Permissions:
         │     ├─ All student permissions
         │     ├─ Upload to multiple students
         │     └─ Bulk file operations (future)
         │
         └─ Admin
            └─ Permissions:
               ├─ All teacher permissions
               ├─ Manage all users
               │  ├─ Create users (manual)
               │  ├─ Edit user info
               │  ├─ Delete users
               │  └─ Suspend/activate users
               ├─ View activity logs
               ├─ Manage roles
               └─ System configuration

```

### RBAC Implementation

**1. Registration/Login - Role Assignment**
```typescript
// In register API
const role = request.body.role;  // "student" or "teacher"
const idCheck = await prisma.preExistingIDs.findFirst({
  where: role === "teacher" ? { teacherId: idNumber } : { studentId: idNumber }
});

if (!idCheck) {
  return error("ID not found");  // Pre-validation
}

// Create user with role
const newUser = await prisma.user.create({
  data: { email, password, role, idNumber, ... }
});
```

**2. Middleware - Role Checking**
```typescript
// In middleware.ts
if (adminRoutes.some(route => pathname.startsWith(route))) {
  if (!isAuthenticated) redirect("/login");
  if (payload.role !== 'admin') redirect("/dashboard");  // Role check
}
```

**3. API Routes - Authorization**
```typescript
// In admin API routes
export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser(request);
  
  if (!currentUser) {
    return 401;  // Not authenticated
  }
  
  if (currentUser.role !== 'admin') {
    return 403;  // Forbidden - not admin
  }
  
  // Proceed with admin logic
}
```

**4. File Operations - Ownership Check**
```typescript
// In revoke API
const fileRecord = await prisma.file.findUnique({
  where: { id: fileId },
  select: { uploaderId: true }
});

if (fileRecord.uploaderId !== currentUser.id) {
  return 403;  // User doesn't own this file
}
```

### Permission Matrix

| Operation | Student | Teacher | Admin |
|-----------|---------|---------|-------|
| Upload files | ✅ | ✅ | ✅ |
| Download shared files | ✅ | ✅ | ✅ |
| View own uploaded files | ✅ | ✅ | ✅ |
| View own received files | ✅ | ✅ | ✅ |
| Revoke own shares | ✅ | ✅ | ✅ |
| View all users | ❌ | ❌ | ✅ |
| Edit users | ❌ | ❌ | ✅ |
| Delete users | ❌ | ❌ | ✅ |
| Suspend users | ❌ | ❌ | ✅ |
| View activity logs | ❌ | ❌ | ✅ |
| Change user roles | ❌ | ❌ | ✅ |

### Access Control Flow

```
User Request
    ↓
Middleware: Check JWT + Route Protection
    ↓
API Route: Authenticate user
    ↓
Check Role: Is user allowed to access this resource?
    ├─ Admin routes → require role == 'admin'
    ├─ Protected routes → require authenticated
    └─ Public routes → no check
    ↓
Check Ownership: Does user own the resource?
    ├─ File operations → uploaderId == currentUser.id
    ├─ User operations → admin only
    └─ Admin operations → admin only
    ↓
Execute Operation or Return Error
    ├─ 401: Not authenticated
    ├─ 403: Not authorized (wrong role)
    └─ 200: Success
```

---

## Encryption & Security

### Encryption Architecture

```
┌──────────────────────────────────┐
│      AES-256-GCM Encryption      │
└──────────────────────────────────┘

Algorithm: AES (Advanced Encryption Standard)
├─ Key Size: 256 bits (32 bytes)
├─ Mode: GCM (Galois/Counter Mode)
│  └─ Provides both confidentiality AND integrity
├─ IV Size: 12 bytes (96 bits)
│  └─ Randomly generated per file
└─ Auth Tag: 16 bytes (128 bits)
   └─ Proves file wasn't tampered with

Security Level: 256-bit = 2^256 possible keys
                          = 1.1 × 10^77 combinations
                          Brute force unfeasible
```

### Encryption Key Management

**Server-Side Key Storage:**
```typescript
// In environment variables (never in code)
process.env.ENCRYPTION_KEY  // 64 hex characters = 32 bytes

// In upload route:
const secretKeyHex = process.env.ENCRYPTION_KEY;  // "a1b2c3d4..."
const secretKey = Buffer.from(secretKeyHex, 'hex');  // Convert to bytes

// For each file:
const iv = crypto.randomBytes(12);  // New random IV
const cipher = crypto.createCipheriv("aes-256-gcm", secretKey, iv);
```

**Key Characteristics:**
- Same key for all files (server-wide)
- Different IV for each file (prevents pattern recognition)
- IV stored in database (needed for decryption)
- Key never transmitted (stays server-side only)

### File Encryption Flow

```
Input File (Plain)
    ↓
Generate Random IV (12 bytes)
    ↓
Create AES-256-GCM Cipher
├─ Algorithm: "aes-256-gcm"
├─ Key: Server ENCRYPTION_KEY
└─ IV: Random bytes
    ↓
Stream file through cipher
├─ Read file chunk by chunk
├─ Encrypt each chunk
└─ Write encrypted chunks to disk
    ↓
Get Auth Tag (proves integrity)
    ↓
Save Encrypted File
├─ Filename: {uuid}.enc
├─ Path: encrypted_uploads/{uuid}.enc
└─ Size: ~same as original + 16 bytes (tag)
    ↓
Store Metadata
├─ IV: hex string in database
├─ Auth Tag: hex string in database
├─ File path: path on disk
└─ MIME type, file name, etc.
```

### File Decryption Flow

```
Authorization Check
├─ User authenticated?
├─ User is recipient?
└─ Link not expired?
    ↓
Retrieve Metadata
├─ Query File table
├─ Get IV (convert from hex)
└─ Get Auth Tag (convert from hex)
    ↓
Load Encryption Key
├─ From environment
└─ Convert from hex to bytes
    ↓
Create AES-256-GCM Decipher
├─ Algorithm: "aes-256-gcm"
├─ Key: Server ENCRYPTION_KEY (same as encryption)
├─ IV: From database
└─ Auth Tag: From database (integrity check)
    ↓
Stream Decryption
├─ Read encrypted file from disk
├─ Pipe through decipher
├─ If integrity check fails: abort
└─ Stream decrypted data to browser
    ↓
Browser Downloads File
└─ File is decrypted on-the-fly (never stored decrypted on server)
```

### Why GCM Mode?

```
Normal modes (CBC, ECB):
└─ Encrypt data ✅
└─ But don't verify integrity ❌
└─ Attacker could modify encrypted file
└─ Decryption would succeed with garbage

GCM Mode:
├─ Encrypts data ✅
├─ Generates auth tag ✅
├─ Tag ties to: plaintext + IV + key
└─ If any bit changes: decryption fails ✅
   └─ Prevents tampering
```

### Malware Scanning Security

**Scanning Before Encryption:**
```
File Upload
    ↓
Save to Temporary Location (for scanning)
    ↓
Scan with Windows Defender
├─ Method 1: PowerShell API
├─ Method 2: Command-line tool
└─ Method 3: Hash-based lookup
    ↓
Is Threat Detected?
├─ YES: Delete temp file, return error, log threat
└─ NO: Continue to encryption
    ↓
Encrypt File
    ↓
Delete Temporary File
    ↓
Upload Complete
```

**Why Scan Before Encryption?**
- Scanners can't read encrypted files
- Threats must be detected before encryption
- Once encrypted, scanning becomes impossible
- Ensures clean files enter the system

---

## Complete Data Flow

### 1. Registration Flow

```
User opens /register
    ↓
Fills form: firstName, lastName, email, password, role, idNumber
    ↓
Frontend validates:
├─ Email format (RFC 5322)
├─ Password strength
├─ idNumber format
└─ Role selected
    ↓
POST /api/register { form data }
    ↓
Backend: Check if email exists
├─ Query User table WHERE email = input
├─ If exists: return 400 "Email already exists"
└─ If not: continue
    ↓
Backend: Check if idNumber exists
├─ Query User table WHERE idNumber = input
├─ If exists: return 400 "ID number already exists"
└─ If not: continue
    ↓
Backend: Validate idNumber against PreExistingIDs
├─ If role == "teacher": query WHERE teacherId = input
├─ If role == "student": query WHERE studentId = input
├─ If not found: return 400 "ID not found"
└─ If found: continue
    ↓
Backend: Hash password
├─ bcrypt.hash(password, 10)  [10 salt rounds]
└─ Generate hash (not reversible)
    ↓
Backend: Create User record
├─ INSERT into User table
└─ With: firstName, lastName, email, hashedPassword, role, idNumber
    ↓
Backend: Generate JWT
├─ Create payload: { id, email, role }
├─ Sign with JWT_SECRET
├─ Expiry: 24 hours
└─ Return token
    ↓
Backend: Set HttpOnly Cookie
├─ Cookie name: "token"
├─ Value: JWT token
├─ HttpOnly: true (JavaScript can't access)
├─ Secure: true (HTTPS only in production)
├─ SameSite: strict (prevents CSRF)
└─ MaxAge: 86400 seconds (24 hours)
    ↓
Backend: Log registration
├─ Log USER_REGISTER action
└─ Store in ActivityLog table
    ↓
Frontend: Store response
├─ Receives: { token, user, redirectUrl }
├─ Browser sets cookie automatically
└─ Redirects to: /dashboard
    ↓
User logged in and authenticated
```

### 2. File Upload Flow

```
User navigates to /upload
    ↓
Selects file (via file picker or drag-drop)
    ↓
Enters recipient email
    ↓
Clicks "Upload"
    ↓
Frontend: Validate
├─ File selected?
├─ Recipient email not empty?
└─ If invalid: show error toast
    ↓
Frontend: Create FormData
├─ Set file: (File object)
├─ Set recipientEmail: (string)
└─ POST /api/upload
    ↓
Backend: Authenticate
├─ Extract JWT from cookie
├─ Verify signature and expiry
├─ Get user from database
├─ If fails: return 401
└─ Log: "Upload initiated by user@email.com"
    ↓
Backend: Parse FormData
├─ Get file: File object
├─ Get recipientEmail: string
└─ Extract: filename, size, MIME type
    ↓
Backend: Validate
├─ File exists? (size > 0)
├─ RecipientEmail provided?
├─ File size < 50MB?
└─ If fails: return 400 error
    ↓
Backend: Verify recipient
├─ Query User WHERE email = recipientEmail
├─ If not found: return 404 "Recipient not registered"
├─ Get recipientId for later
└─ Log: "Recipient validated: user@recipient.com"
    ↓
Backend: Save file temporarily
├─ Generate temp filename: temp_{uuid}_{filename}
├─ Convert file to Buffer
├─ Write to: encrypted_uploads/temp_...
└─ Log: "Temp file saved for scanning"
    ↓
Backend: SCAN FILE
├─ Call scanFile(tempFilePath)
│   ├─ Try Windows Defender PowerShell
│   │   └─ Execute: Start-MpScan ...
│   ├─ If fails, try CLI method
│   │   └─ Execute: MpCmdRun.exe ...
│   └─ Return: { status, engine, threatName?, details? }
├─ If status == "THREAT_DETECTED":
│   ├─ Delete temp file
│   ├─ Log: FILE_SCAN_THREAT_DETECTED
│   ├─ Return 400 error with threat details
│   └─ STOP
└─ If status == "CLEAN" or "ERROR":
    └─ Continue
    ↓
Backend: ENCRYPT FILE
├─ Generate random IV: 12 random bytes
├─ Create AES-256-GCM cipher:
│   ├─ Algorithm: "aes-256-gcm"
│   ├─ Key: From process.env.ENCRYPTION_KEY
│   └─ IV: Just generated
├─ Create write stream to: encrypted_uploads/{uuid}.enc
├─ Create read stream from temp file
├─ Pipe through cipher:
│   ├─ Read temp file
│   ├─ Encrypt each chunk
│   └─ Write encrypted chunks to .enc file
├─ Get auth tag (16-byte integrity proof)
├─ Delete temp file
└─ Log: "File encrypted and saved"
    ↓
Backend: GENERATE DOWNLOAD TOKEN
├─ Generate: 32 random bytes
├─ Convert to hex: 64-character string
├─ Calculate expiry: now + 24 hours
├─ Set status: "active"
└─ This token is shared with recipient
    ↓
Backend: SAVE METADATA TO DATABASE
├─ INSERT into File table:
│   ├─ fileName: original filename
│   ├─ filePath: encrypted_uploads/{uuid}.enc
│   ├─ mimeType: from file object
│   ├─ size: original file size
│   ├─ recipientEmail: input email
│   ├─ uploaderId: current user ID
│   ├─ recipientId: looked up ID
│   ├─ iv: IV converted to hex string
│   ├─ authTag: auth tag converted to hex string
│   ├─ downloadToken: generated token
│   ├─ tokenExpiresAt: expiry datetime
│   ├─ scanStatus: status from scan
│   ├─ scanResult: detailed scan output
│   ├─ scannedAt: timestamp
│   └─ scanEngine: "Windows Defender", etc.
├─ Receive back: fileId (auto-generated)
└─ Log: FILE_UPLOAD activity
    ↓
Backend: SEND EMAIL
├─ Build URL: https://example.com/download/{token}
├─ Send email to recipient:
│   ├─ From: "SecureShare <noreply@example.com>"
│   ├─ To: recipientEmail
│   ├─ Subject: "Secure file shared with you"
│   ├─ Body includes:
│   │   ├─ Sender email
│   │   ├─ Download link
│   │   └─ "Link expires in 24 hours"
│   └─ (Email errors are caught, not blocking)
    ↓
Backend: RETURN SUCCESS RESPONSE
├─ Return JSON:
│   ├─ success: true
│   ├─ message: "File encrypted and shared"
│   ├─ fileId: auto-generated ID
│   ├─ downloadUrl: /download/{token}
│   └─ scanResult: { status, engine }
    ↓
Frontend: Handle response
├─ success == true?
│   ├─ YES:
│   │   ├─ Store downloadUrl in state
│   │   ├─ Show DownloadLinkCard
│   │   ├─ Display scan results
│   │   ├─ Show: "File shared successfully"
│   │   └─ User can copy & share link
│   └─ NO:
│       ├─ Show error toast
│       └─ Allow retry
    ↓
Upload Complete
```

### 3. File Download Flow

```
Recipient receives email with link: /download/{token}
    ↓
Clicks link
    ↓
Browser navigates to: https://example.com/download/{token}
    ↓
Frontend: Load download page component
├─ Extract token from URL params
├─ Validate token format (64 hex chars)
└─ If invalid: show error
    ↓
Frontend: Fetch file metadata
├─ GET /api/metadata/{token}
├─ Shows loading spinner
└─ Waits for response
    ↓
Backend: Verify metadata request
├─ Extract JWT from cookie
├─ Authenticate user
├─ If not authenticated: return 401
└─ Find File by downloadToken
    ├─ Query WHERE downloadToken = token
    ├─ If not found: return 404
    └─ If found: continue
    ↓
Backend: Check authorization
├─ Compare currentUser.email with fileRecord.recipientEmail
├─ If not recipient: return 403 "Access denied"
└─ Continue
    ↓
Backend: Check expiry
├─ Is tokenExpiresAt in future?
├─ If expired: return 410 "Link expired"
└─ Continue
    ↓
Backend: Return metadata
├─ Return JSON:
│   ├─ success: true
│   └─ metadata:
│       ├─ fileName
│       ├─ size
│       └─ mimeType
└─ Don't return encrypted content
    ↓
Frontend: Display file details
├─ Show file name (clickable, large)
├─ Show file size
├─ Show download button
└─ Show security information
    ↓
User clicks "Download File" button
    ↓
Browser initiates: GET /api/download/{token}
    ↓
Backend: Verify download request (detailed checks)
├─ Validate token format
├─ Authenticate user
│   ├─ Get JWT from cookie
│   ├─ Verify signature and expiry
│   ├─ Get user from DB
│   └─ If fails: return 401
├─ Find File by downloadToken
│   ├─ If not found: return 404
│   └─ Continue
├─ Check token expiry
│   ├─ If expired: return 410
│   └─ Continue
├─ Check authorization (recipient check)
│   ├─ If not recipient: return 403
│   └─ Continue
├─ Verify encrypted file exists
│   ├─ Check file on disk
│   ├─ Check read permissions
│   └─ If missing: return 503
└─ Log FILE_DOWNLOAD activity
    ↓
Backend: DECRYPT AND STREAM FILE
├─ Get from database:
│   ├─ IV: convert from hex to bytes
│   ├─ authTag: convert from hex to bytes
│   ├─ filePath: path to encrypted file
│   └─ mimeType: original MIME type
├─ Load encryption key
│   ├─ From process.env.ENCRYPTION_KEY
│   └─ Convert from hex to bytes
├─ Create decipher:
│   ├─ Algorithm: "aes-256-gcm"
│   ├─ Key: Server key
│   ├─ IV: From database
│   └─ Auth tag: From database (proves integrity)
├─ Create read stream from encrypted file
├─ Pipe through decipher:
│   ├─ Read encrypted chunks
│   ├─ Decrypt each chunk
│   ├─ If auth tag fails: abort (file tampered)
│   └─ Stream decrypted chunks
├─ Set response headers:
│   ├─ Content-Type: original MIME type
│   ├─ Content-Disposition: attachment; filename="..."
│   └─ Content-Length: original file size
└─ Stream decrypted content to browser
    ↓
Browser receives stream
├─ Recognizes Content-Disposition
├─ Prompts user to save/open
└─ User downloads decrypted file
    ↓
Download Complete
└─ Recipient has their file
```

---

## Pros and Cons

### Pros (Advantages)

#### Security ✅
1. **AES-256-GCM Encryption**
   - Military-grade encryption
   - GCM mode ensures integrity (tampering detected)
   - Different IV per file (prevents pattern analysis)
   - Server-side only key (not exposed to client)

2. **Malware Scanning**
   - Files scanned before encryption
   - Windows Defender integration
   - Multiple fallback methods
   - Threats logged and blocked
   - Prevents malware distribution

3. **JWT Authentication**
   - HttpOnly cookies prevent XSS attacks
   - Token expiry (24 hours)
   - Signature verification ensures token validity
   - Database lookup confirms user still exists

4. **Activity Logging**
   - Complete audit trail
   - IP address tracking
   - All actions recorded (login, upload, download, etc.)
   - Helps identify security incidents

#### Functionality ✅
5. **Automatic Link Expiry**
   - 24-hour download links
   - Prevents indefinite access
   - Recipient gets timely notification
   - Uploader can revoke access anytime

6. **Stream-Based Processing**
   - Large files don't crash server
   - Memory efficient
   - Files encrypted/decrypted on-the-fly
   - Can handle multi-gigabyte files

7. **Dual Recipient Model**
   - Users see files they sent (with send date)
   - Users see files they received (with sender info)
   - Complete visibility of file transfers

8. **Admin Dashboard**
   - Full user management
   - Activity log analysis
   - System statistics
   - Role-based access control

#### User Experience ✅
9. **Email Notifications**
   - Recipients automatically notified
   - Link sent via email (no need to manually share)
   - Clear expiry information
   - Secure link format

10. **Search and Filtering**
    - Search by file name
    - Search by sender/recipient email
    - Filter by file status
    - Sort by upload date

11. **Real-time Scanning Status**
    - Users see "File Scanning..." during upload
    - Clear indication of threat detection
    - Informative error messages
    - Scan engine name shown

12. **Responsive UI**
    - Works on desktop and mobile
    - Tailwind CSS for styling
    - Shadcn components for consistency
    - Dark/light theme support

#### Architecture ✅
13. **Serverless API Routes**
    - Scales automatically
    - No server management
    - Pay-per-request model
    - Built into Next.js framework

14. **Prisma ORM**
    - Type-safe database queries
    - Auto-generated migrations
    - Connection pooling
    - Easy to extend schema

15. **Middleware Protection**
    - Global authentication
    - Role-based route protection
    - Prevents unauthorized access
    - Cleaner route code

---

### Cons (Disadvantages)

#### Security ❌
1. **Single Encryption Key**
   - Same key encrypts all files
   - Compromise of key decrypts all files
   - No per-file key derivation
   - Key stored in environment (vulnerable if compromised)

2. **No End-to-End Encryption**
   - Server handles encryption/decryption
   - Server can theoretically intercept plaintext
   - Trust placed entirely on server
   - No client-side encryption before upload

3. **Windows Defender Scanning**
   - Only available on Windows systems
   - Won't work on Linux/Mac production servers
   - No advanced threat analysis
   - Can be bypassed by sophisticated malware

4. **Token Storage in Cookie**
   - While HttpOnly prevents XSS, still vulnerable to CSRF
   - No CSRF tokens explicitly implemented
   - Server-side session would be more secure

#### Performance ❌
5. **Email Service Blocking**
   - Nodemailer blocks upload response
   - If email service slow, upload feels slow
   - No retry mechanism if email fails
   - Single SMTP server (single point of failure)

6. **Database Queries Per Operation**
   - User lookup after JWT verification (extra query)
   - Every protected endpoint hits database
   - No query caching
   - High query volume could overwhelm database

7. **No File Caching**
   - Downloads always decrypt from disk
   - No CDN integration
   - Large files repeated downloads hit server
   - No compression before transmission

#### Functionality ❌
8. **No Batch Operations**
   - Can't upload multiple files at once
   - Can't bulk delete/revoke
   - No folder structure support
   - Each file is independent

9. **No Version Control**
   - Can't keep file history
   - Can't restore previous versions
   - Overwriting file loses original
   - No rollback capability

10. **No File Sharing with Non-Registered Users**
    - Only registered recipients can download
    - Can't share with external users
    - Recipient must have an account
    - Limits usability in some scenarios

11. **No Download Analytics**
    - Don't know when recipient downloads
    - No multiple download tracking
    - No usage statistics per file
    - Limited visibility into file usage

#### Database ❌
12. **No Data Redundancy**
    - Single PostgreSQL instance
    - Database loss = data loss
    - No replication across regions
    - No automatic backup system mentioned

13. **Limited Audit Trail Filtering**
    - Activity log can get very large
    - No efficient date range queries (without indexes)
    - No search within details field
    - Admin must load full logs

#### Code Quality ❌
14. **Placeholder Encryption Functions**
    - `lib/encryption.ts` contains only stubs
    - Actual encryption inline in routes
    - Violates DRY principle
    - Makes testing harder

15. **Error Handling Inconsistencies**
    - Some errors thrown, some returned
    - Not standardized error format
    - Some errors swallowed silently
    - Logging failures don't propagate

16. **No Input Validation Library**
    - Form validation uses React Hook Form + Zod
    - API routes don't use same validation
    - Potential for server-side injection
    - Inconsistent validation logic

#### Deployment ❌
17. **Environment Variable Dependency**
    - Must set 7+ environment variables
    - Encryption key must be exactly 64 hex chars
    - No validation that required variables exist
    - Easy to misconfigure

18. **Hardcoded Values**
    - 50MB file size limit hardcoded
    - 24-hour expiry hardcoded
    - 10 bcrypt salt rounds hardcoded
    - Can't be easily adjusted without code changes

---

## Limitations

### Functional Limitations

1. **Single Recipient Per File**
   - Each file shared with exactly one email
   - Can't group recipients
   - Must upload same file multiple times for multiple people
   - No mailing list support

2. **No Folder/Namespace Support**
   - All files flat in /encrypted_uploads/
   - No organization by user
   - Could become cluttered with many files
   - Disk access slower as count grows

3. **No File Preview**
   - Must download to view
   - No in-browser preview (PDF, images, etc.)
   - Inconvenient for quick previews
   - No compression for bandwidth saving

4. **No Resume on Failed Upload**
   - Large file upload failure = restart from 0%
   - No chunked upload capability
   - Poor UX for unstable connections
   - No progress resumption

5. **No Real-Time Notifications**
   - Email only notification method
   - No in-app real-time alerts
   - No WebSocket support
   - User must refresh to see new files

### Technical Limitations

6. **File Size Limits**
   - 50MB hard limit
   - Large projects/videos excluded
   - Enterprise users would need larger limit
   - Streaming architecture could handle more if allowed

7. **Windows-Only Scanning**
   - Requires Windows OS with Windows Defender
   - Won't work on Linux production servers
   - Cloud deployments often use Linux
   - Need alternative scanner for cross-platform

8. **Single Encryption Key**
   - No key rotation mechanism
   - No per-user or per-file key derivation
   - All-or-nothing compromise scenario
   - No forward secrecy

9. **No Database Replication**
   - Single database instance (SPOF - Single Point of Failure)
   - No geographic redundancy
   - Regional outage = complete system down
   - No failover mechanism

10. **No Rate Limiting**
    - Anyone can spam uploads
    - No throttling per user
    - DoS vulnerability
    - Potential for abuse

### Operational Limitations

11. **Manual User ID Validation**
    - PreExistingIDs table must be manually populated
    - No bulk import from CSV/LDAP
    - Cumbersome for large institutions
    - No LDAP/Active Directory integration

12. **No Backup Strategy**
    - No automated backups mentioned
    - Encrypted files on disk not versioned
    - Database backup not automated
    - Disaster recovery unclear

13. **No User Self-Service**
    - Can't change password
    - Can't update profile information
    - Can't delete own account
    - Admin required for all user changes

14. **No Quota System**
    - Users can upload unlimited files
    - No storage limit per user
    - No pricing/billing support
    - Could consume all disk space

15. **No Search Across All Files**
    - Can only search user's own files
    - No global file search
    - Admin can't search file contents
    - Limited discovery

### Scalability Limitations

16. **No Horizontal Scaling**
    - Encrypted files stored on single server
    - Can't distribute across multiple servers
    - No S3/cloud storage integration
    - Single server disk limit

17. **Database Performance**
    - Single database connection
    - No read replicas for queries
    - Activity log grows indefinitely
    - Query performance degrades over time

18. **Email Sending Bottleneck**
    - Single Nodemailer instance
    - Sequential email sending
    - If email service slow, whole upload slow
    - No queue system (Redis, RabbitMQ)

---

## Future Prospects

### Short-Term Improvements (3-6 months)

1. **File Organization**
   ```
   Features to Add:
   ├─ Folders/Categories
   ├─ Tags/Labels
   ├─ Collections for grouped files
   └─ Smart search across metadata
   ```

2. **Multi-Recipient Sharing**
   ```
   Implementation:
   ├─ Allow email list in upload form
   ├─ Create File record for each recipient
   ├─ Batch email notifications
   └─ Recipient can see other recipients (optional)
   ```

3. **Enhanced Scanning**
   ```
   Add Scanners:
   ├─ ClamAV (Linux/Mac compatible)
   ├─ VirusTotal API integration
   ├─ File type validation
   └─ Sandbox execution (advanced)
   ```

4. **User Self-Service**
   ```
   New Features:
   ├─ Change password
   ├─ Update profile (firstName, lastName)
   ├─ Delete account (with confirmation)
   ├─ Download activity history
   └─ Export shared files list
   ```

5. **Better Error Messages**
   ```
   Improvements:
   ├─ Standardize error response format
   ├─ Add error codes for client-side handling
   ├─ Provide recovery suggestions
   └─ Log errors to monitoring service
   ```

### Medium-Term Improvements (6-12 months)

6. **Cloud Storage Integration**
   ```typescript
   // Store encrypted files in S3/GCS instead of local disk
   const s3 = new AWS.S3({...});
   
   // Upload
   await s3.upload({
     Bucket: 'secure-share-prod',
     Key: fileId,
     Body: encryptedStream
   }).promise();
   
   // Download
   const encrypted = await s3.getObject({...}).promise();
   
   Benefits:
   ├─ No disk space limits
   ├─ Automatic redundancy
   ├─ Better disaster recovery
   └─ Scale to any size
   ```

7. **Advanced Role-Based Access Control**
   ```
   New Roles:
   ├─ Department Admin (manage department users)
   ├─ Content Moderator (approve/block files)
   ├─ Auditor (read-only access to logs)
   └─ Support (help users recover access)
   
   Permission Combinations:
   ├─ Granular resource permissions
   ├─ Time-based access control
   └─ Conditional access policies
   ```

8. **Real-Time Notifications**
   ```typescript
   // Use WebSockets for real-time updates
   import { Server } from "socket.io";
   
   const io = new Server(server);
   
   // When file uploaded
   io.to(recipientId).emit('file:shared', {
     fileName: 'document.pdf',
     senderEmail: 'teacher@school.edu'
   });
   
   // Show in-app notification immediately
   ```

9. **End-to-End Encryption**
   ```typescript
   // Client-side encryption before upload
   1. Generate file encryption key (client-side)
   2. Encrypt file in browser (WebCrypto API)
   3. Upload encrypted file
   4. Send key to recipient (separate channel)
   5. Recipient decrypts with key (browser-side)
   
   Benefits:
   ├─ Server never sees plaintext
   ├─ Server compromise doesn't expose files
   └─ True privacy
   ```

10. **LDAP/Active Directory Integration**
    ```typescript
    // Connect to school LDAP server
    import { Client } from 'ldapjs';
    
    const ldap = new Client({ url: 'ldap://school.edu' });
    
    // Sync users
    - Read students/teachers from LDAP
    - Create/update User records
    - Maintain group memberships
    - Sync role changes
    
    Benefits:
    ├─ No manual user management
    ├─ Automatic sync on schedule
    ├─ Single source of truth
    └─ Automatic deactivation
    ```

### Long-Term Improvements (12+ months)

11. **Advanced File Management**
    ```
    Features:
    ├─ Version control (keep file history)
    ├─ Collaborative editing (with encryption)
    ├─ Annotations (mark up shared files)
    ├─ Digital signatures
    ├─ Watermarking (prevent unauthorized sharing)
    └─ Rights management (view/download/print controls)
    ```

12. **Mobile Applications**
    ```
    Platforms:
    ├─ iOS app (Swift)
    ├─ Android app (Kotlin)
    ├─ Offline mode (encrypted local storage)
    ├─ Push notifications
    └─ Biometric authentication
    ```

13. **Data Analytics & Insights**
    ```
    Admin Dashboard:
    ├─ File sharing trends
    ├─ User activity patterns
    ├─ System health metrics
    ├─ Security alerts
    ├─ Compliance reports
    └─ Export for audit purposes
    ```

14. **Compliance & Certifications**
    ```
    Standards:
    ├─ FERPA compliance (education data privacy)
    ├─ GDPR compliance (EU users)
    ├─ COPPA compliance (children's data)
    ├─ SOC 2 certification
    ├─ ISO 27001 certification
    └─ Regular security audits
    ```

15. **Advanced Threat Detection**
    ```typescript
    // Machine learning for anomaly detection
    1. Baseline user behavior
    2. Detect unusual patterns:
       ├─ Mass downloads
       ├─ Access outside business hours
       ├─ Unusual file types
       └─ Geographic anomalies
    3. Alert on suspicious activity
    4. Automatic account suspension
    ```

16. **API & Integration**
    ```
    Capabilities:
    ├─ RESTful API for external systems
    ├─ Webhook support (file shared → external action)
    ├─ OAuth2 for third-party apps
    ├─ Zapier integration
    ├─ Microsoft Teams bot
    └─ Slack integration
    ```

17. **Performance Optimization**
    ```
    Improvements:
    ├─ CDN for file distribution
    ├─ Redis caching for metadata
    ├─ Database query optimization
    ├─ Async email queue (Bull/BullMQ)
    ├─ File compression (gzip for text)
    └─ Parallel scanning for large files
    ```

18. **Disaster Recovery & Backup**
    ```
    Strategy:
    ├─ Automated daily backups
    ├─ Cross-region replication
    ├─ Point-in-time recovery
    ├─ Tested disaster recovery plan
    ├─ Backup encryption
    └─ Backup retention policy (1 year minimum)
    ```

### Research & Development

19. **Blockchain Integration**
    ```
    Use Cases:
    ├─ Immutable audit logs
    ├─ Non-repudiation (prove action occurred)
    ├─ Distributed trust
    └─ Smart contracts for access control
    ```

20. **AI-Powered Features**
    ```
    Possibilities:
    ├─ Auto-categorize files (ML classification)
    ├─ Suggest recipients based on patterns
    ├─ Automatic encryption key suggestions
    ├─ Natural language search
    └─ Anomaly detection
    ```

---

## Conclusion

SecureShare is a **well-architected secure file-sharing platform** with strong encryption, malware scanning, and audit logging. It's suitable for **educational institutions** where security and simplicity are priorities.

### Summary Table

| Aspect | Status | Notes |
|--------|--------|-------|
| **Security** | ✅ Strong | AES-256-GCM, JWT, Activity Logs |
| **Functionality** | ✅ Good | Core features complete |
| **Performance** | ⚠️ Okay | Single server, no caching |
| **Scalability** | ❌ Limited | Single database, single storage |
| **UX** | ✅ Good | Responsive, intuitive design |
| **Code Quality** | ⚠️ Okay | Some improvements needed |
| **Testing** | ❌ None | No test suite present |
| **Documentation** | ⚠️ Minimal | Code comments adequate |
| **Production Ready** | ⚠️ Partial | Needs hardening for production |

### Recommendations for Deployment

1. **Before Production:**
   - Add comprehensive error handling
   - Implement rate limiting
   - Set up automated backups
   - Configure HTTPS/SSL
   - Add CSRF protection
   - Set up monitoring & alerting

2. **For Scale:**
   - Migrate to cloud storage (AWS S3)
   - Add Redis caching layer
   - Implement async email queue
   - Use database replicas
   - Add CDN for downloads

3. **For Security:**
   - Implement key rotation
   - Add LDAP integration
   - Enable 2FA for admins
   - Regular security audits
   - Penetration testing

This project provides an **excellent foundation** for an educational file-sharing system and demonstrates solid **full-stack development practices** with modern technologies.

