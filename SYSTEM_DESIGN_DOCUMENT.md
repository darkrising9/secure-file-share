# SecureShare - System Design Document

## Table of Contents
1. [Use Case Diagram](#use-case-diagram)
2. [Activity Diagram](#activity-diagram)
3. [Architecture Diagram](#architecture-diagram)
4. [Entity Relationship (ER) Diagram](#entity-relationship-diagram)
5. [Class Diagram](#class-diagram)
6. [Data Flow Diagram](#data-flow-diagram)
7. [Project Development Approach](#project-development-approach)
8. [Flow of Work](#flow-of-work)

---

## Use Case Diagram

### Overview
The Use Case Diagram illustrates all possible interactions between system actors (users) and the SecureShare system.

### Actors
- **Student**: Low-privilege user, can upload and receive files
- **Teacher**: Medium-privilege user, can manage files and view reports
- **Admin**: High-privilege user, can manage system, users, and view activity logs
- **System**: Background processes (scanning, email notification)

### Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SECURESHARE SYSTEM                           │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      AUTHENTICATION                              │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │  │
│  │  │   Register       │  │     Login        │  │    Logout     │  │  │
│  │  │                  │  │                  │  │               │  │  │
│  │  └──────────────────┘  └──────────────────┘  └───────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                   FILE OPERATIONS                                │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │  │
│  │  │   Upload File    │  │  Download File   │  │  Revoke Link  │  │  │
│  │  │                  │  │                  │  │               │  │  │
│  │  └──────────────────┘  └──────────────────┘  └───────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                   DASHBOARD & MANAGEMENT                         │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │  │
│  │  │  View Files Sent │  │ View Files Rcvd  │  │ Search Files  │  │  │
│  │  │                  │  │                  │  │               │  │  │
│  │  └──────────────────┘  └──────────────────┘  └───────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                   ADMIN OPERATIONS                               │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │  │
│  │  │ Manage Users     │  │ View Activity    │  │ Manage Roles  │  │  │
│  │  │ (Edit/Delete)    │  │ Logs             │  │               │  │  │
│  │  └──────────────────┘  └──────────────────┘  └───────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                   BACKGROUND PROCESSES                           │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │  │
│  │  │  Scan File       │  │ Send Email       │  │  Log Activity │  │  │
│  │  │                  │  │ Notification     │  │               │  │  │
│  │  └──────────────────┘  └──────────────────┘  └───────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

                            ACTORS

        ┌──────────┐      ┌──────────┐      ┌──────────┐
        │ Student  │      │ Teacher  │      │  Admin   │
        └────┬─────┘      └────┬─────┘      └────┬─────┘
             │                 │                 │
             │◄────────────────┼────────────────►│
             │                 │                 │
        All operations        Can manage      Can manage
        on own files          others' files    entire system
```

### Use Cases by Actor

#### Student Use Cases
1. **Register Account** - Create new account with student ID
2. **Login** - Authenticate with email/password
3. **Upload File** - Encrypt and upload file to recipient
4. **Download File** - Decrypt and download received file
5. **View Uploaded Files** - See all files sent with status
6. **View Received Files** - See all files received
7. **Revoke Share** - Disable download link for shared file
8. **Logout** - Clear session

#### Teacher Use Cases
1. All Student use cases
2. **Manage Student Downloads** - Track who downloaded files
3. **Bulk Upload Files** - Share with multiple students (future)
4. **View Sharing Reports** - Analytics on file sharing

#### Admin Use Cases
1. All Teacher use cases
2. **Create User Account** - Manually add users
3. **Edit User** - Modify user information/role
4. **Delete User** - Remove user and their files
5. **Suspend User** - Temporarily disable account
6. **View All Activity Logs** - System-wide audit trail
7. **Change User Role** - Promote/demote users
8. **View System Statistics** - Dashboard metrics

#### System (Background Processes)
1. **Scan File** - Malware detection before upload
2. **Send Email Notification** - Notify recipients of new files
3. **Log Activity** - Record all user actions

---

## Activity Diagram

### File Upload Process

```
                            ┌─────────────────┐
                            │     START       │
                            └────────┬────────┘
                                     │
                            ┌────────▼────────┐
                            │  User Opens     │
                            │  Upload Page    │
                            └────────┬────────┘
                                     │
                            ┌────────▼────────┐
                            │  Select File &  │
                            │  Recipient      │
                            │  Email          │
                            └────────┬────────┘
                                     │
                    ┌────────────────▼────────────────┐
                    │  Validate File & Recipient      │
                    │  - File not empty               │
                    │  - Recipient registered        │
                    │  - File size < 50MB             │
                    └────┬─────────────────────┬──────┘
                         │                     │
                    [Valid]               [Invalid]
                         │                     │
                    ┌────▼──────┐    ┌────────▼──────────┐
                    │  Proceed   │    │  Show Error       │
                    │            │    │  Message & Retry  │
                    └────┬───────┘    └──────────┬────────┘
                         │                       │
                         │◄──────────────────────┘
                         │
                ┌────────▼──────────┐
                │  Save File        │
                │  Temporarily      │
                └────────┬──────────┘
                         │
                ┌────────▼──────────────────┐
                │  Scan File with           │
                │  Windows Defender         │
                └────┬───────────────┬──────┘
                     │               │
                [CLEAN]       [THREAT_DETECTED]
                     │               │
                  ┌──▼──┐    ┌───────▼────────┐
                  │ OK  │    │ Delete temp    │
                  └──┬──┘    │ Show error     │
                     │       │ Log threat     │
                     │       └────────┬───────┘
                     │                │
                     │       ┌────────▼──────┐
                     │       │   Stop        │
                     │       └───────────────┘
                     │
        ┌────────────▼──────────┐
        │  Encrypt File         │
        │  (AES-256-GCM)        │
        │  - Generate IV        │
        │  - Generate Auth Tag  │
        └────────┬──────────────┘
                 │
        ┌────────▼──────────────┐
        │  Generate Download    │
        │  Token (24h expiry)   │
        └────────┬──────────────┘
                 │
        ┌────────▼──────────────┐
        │  Save Metadata to     │
        │  Database             │
        │  - File info          │
        │  - Scan results       │
        │  - Encryption keys    │
        └────────┬──────────────┘
                 │
        ┌────────▼──────────────┐
        │  Send Email to        │
        │  Recipient with Link  │
        └────────┬──────────────┘
                 │
        ┌────────▼──────────────┐
        │  Log Activity:        │
        │  FILE_UPLOAD          │
        └────────┬──────────────┘
                 │
        ┌────────▼──────────────┐
        │  Show Download Link   │
        │  to Uploader          │
        └────────┬──────────────┘
                 │
            ┌────▼─────┐
            │    END   │
            └──────────┘
```

### File Download Process

```
                        ┌─────────────────┐
                        │     START       │
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │  Recipient      │
                        │  Clicks Link    │
                        │  from Email     │
                        └────────┬────────┘
                                 │
                        ┌────────▼──────────────┐
                        │  Extract Download    │
                        │  Token from URL      │
                        └────────┬─────────┬───┘
                                 │         │
                            [Valid]   [Invalid]
                                 │         │
                        ┌────────▼──┐  ┌──▼─────────────┐
                        │  Continue │  │  Show Error    │
                        └────────┬──┘  │  Invalid Link  │
                                 │     └────────┬───────┘
                                 │              │
                                 │     ┌────────▼──────┐
                                 │     │     STOP      │
                                 │     └───────────────┘
                                 │
                        ┌────────▼──────────────┐
                        │  Check User           │
                        │  Authentication       │
                        └────────┬─────────┬───┘
                                 │         │
                          [Authenticated] [No]
                                 │         │
                        ┌────────▼──┐  ┌──▼──────────────┐
                        │  Continue │  │  Redirect to   │
                        └────────┬──┘  │  Login Page    │
                                 │     └────────┬───────┘
                                 │              │
                                 │     ┌────────▼──────┐
                                 │     │     STOP      │
                                 │     └───────────────┘
                                 │
                        ┌────────▼──────────────┐
                        │  Fetch File Metadata │
                        │  (Display to User)   │
                        └────────┬──────────────┘
                                 │
                        ┌────────▼──────────────┐
                        │  User Clicks          │
                        │  Download Button      │
                        └────────┬──────────────┘
                                 │
                        ┌────────▼──────────────┐
                        │  Check Token Expiry  │
                        └────────┬─────────┬───┘
                                 │         │
                        [Valid] [Expired]
                                 │         │
                        ┌────────▼──┐  ┌──▼──────────────┐
                        │ Continue  │  │  Show Error     │
                        └────────┬──┘  │  Link Expired   │
                                 │     └────────┬───────┘
                                 │              │
                                 │     ┌────────▼──────┐
                                 │     │     STOP      │
                                 │     └───────────────┘
                                 │
                        ┌────────▼──────────────┐
                        │  Check Authorization │
                        │  (Is recipient?)     │
                        └────────┬─────────┬───┘
                                 │         │
                          [Authorized]  [No]
                                 │         │
                        ┌────────▼──┐  ┌──▼──────────────┐
                        │ Continue  │  │  Show Error     │
                        └────────┬──┘  │  Access Denied  │
                                 │     └────────┬───────┘
                                 │              │
                                 │     ┌────────▼──────┐
                                 │     │     STOP      │
                                 │     └───────────────┘
                                 │
                        ┌────────▼──────────────┐
                        │  Retrieve Encrypted  │
                        │  File from Disk      │
                        └────────┬──────────────┘
                                 │
                        ┌────────▼──────────────┐
                        │  Get IV & Auth Tag   │
                        │  from Database       │
                        └────────┬──────────────┘
                                 │
                        ┌────────▼──────────────┐
                        │  Create AES-256-GCM  │
                        │  Decipher            │
                        └────────┬──────────────┘
                                 │
                        ┌────────▼──────────────┐
                        │  Stream Decrypt &    │
                        │  Send to Browser     │
                        └────────┬──────────────┘
                                 │
                        ┌────────▼──────────────┐
                        │  Browser Starts      │
                        │  Download            │
                        └────────┬──────────────┘
                                 │
                        ┌────────▼──────────────┐
                        │  Log Activity:       │
                        │  FILE_DOWNLOAD       │
                        └────────┬──────────────┘
                                 │
                            ┌────▼─────┐
                            │    END   │
                            └──────────┘
```

---

## Architecture Diagram

### Layered Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                               │
│                      (React Components)                              │
│  ┌──────────────┬──────────────┬──────────────┬─────────────────┐   │
│  │   Login      │   Register   │   Upload     │    Download     │   │
│  │   Page       │   Page       │   Page       │    Page         │   │
│  ├──────────────┼──────────────┼──────────────┼─────────────────┤   │
│  │   Dashboard  │   Admin      │  Theme       │    Components   │   │
│  │   Page       │   Dashboard  │  Provider    │    (UI Lib)     │   │
│  └──────────────┴──────────────┴──────────────┴─────────────────┘   │
└────────────────────────┬─────────────────────────────────────────────┘
                         │ HTTP/HTTPS
                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     MIDDLEWARE LAYER                                 │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │  JWT Verification  │  Route Protection  │  Error Handling     │   │
│  └───────────────────────────────────────────────────────────────┘   │
└────────────────────────┬─────────────────────────────────────────────┘
                         │
┌──────────────────────────────────────────────────────────────────────┐
│                     API LAYER (Next.js Routes)                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │            AUTHENTICATION ROUTES                               │ │
│  │  /api/register  │  /api/login  │  /api/logout  │  /api/users   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │            FILE OPERATION ROUTES                               │ │
│  │  /api/upload   │  /api/download/[token]                        │ │
│  │  /api/files/shared  │  /api/files/received                     │ │
│  │  /api/files/revoke/[id]  │  /api/metadata/[token]              │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │            ADMIN ROUTES                                        │ │
│  │  /api/admin/users/summary  │  /api/admin/users/[id]            │ │
│  │  /api/admin/activity       │  /api/admin/users/[id]/status      │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└────────────────────────┬─────────────────────────────────────────────┘
                         │
┌──────────────────────────────────────────────────────────────────────┐
│                     SERVICE LAYER (Libraries)                        │
│  ┌──────────────┬──────────────┬──────────────┬─────────────────┐   │
│  │  Encryption  │  File        │  Auth        │   Logger        │   │
│  │  /lib/       │  Scanner     │  Utils       │                 │   │
│  │ encryption.ts│/lib/         │/lib/auth-    │/lib/logger.ts   │   │
│  │              │fileScanner   │utils.ts      │                 │   │
│  │              │.ts           │              │                 │   │
│  ├──────────────┼──────────────┼──────────────┼─────────────────┤   │
│  │ Request IP   │  Prisma      │  Email       │                 │   │
│  │ /lib/        │  Singleton   │  (Nodemailer)                  │   │
│  │ request-ip.ts│/lib/prisma.ts│              │                 │   │
│  └──────────────┴──────────────┴──────────────┴─────────────────┘   │
└────────────────────────┬─────────────────────────────────────────────┘
                         │
┌──────────────────────────────────────────────────────────────────────┐
│                     PERSISTENCE LAYER                                │
│  ┌───────────────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │   PostgreSQL DB       │  │ Filesystem   │  │  Email Service    │ │
│  │   (Prisma ORM)        │  │ /encrypted_  │  │  (Nodemailer)     │ │
│  │                       │  │  uploads/    │  │                   │ │
│  │  - User              │  │              │  │  Sends            │ │
│  │  - File              │  │  - Encrypted │  │  notifications    │ │
│  │  - ActivityLog       │  │    files     │  │  to recipients    │ │
│  │  - PreExistingIDs    │  │  - Temp      │  │                   │ │
│  │                       │  │    scan     │  │                   │ │
│  │                       │  │    files    │  │                   │ │
│  └───────────────────────┘  └──────────────┘  └───────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### Data Flow Through Layers

```
User Action (Frontend)
        ↓
    HTTP Request
        ↓
    Middleware (Check JWT, Route Protection)
        ↓
    API Route (Business Logic)
        ├─ Validate input
        ├─ Call Service Layer
        └─ Return Response
        ↓
    Service Layer (Operations)
        ├─ Encryption/Decryption
        ├─ File Scanning
        ├─ Activity Logging
        └─ Email Sending
        ↓
    Persistence Layer (Data Storage)
        ├─ PostgreSQL (Metadata)
        ├─ Filesystem (Encrypted Files)
        └─ Email Service (Notifications)
        ↓
    Response Back to Frontend
        ↓
User Sees Result
```

---

## Entity Relationship Diagram

### Database Schema Relationships

```
┌──────────────────────────────┐
│           USER               │
├──────────────────────────────┤
│ PK  id (UUID)                │
│     firstName (String)       │
│     lastName (String)        │
│ UQ  email (String)           │
│     password (String-hash)   │
│     role (String)            │
│ UQ  idNumber (String)        │
│     createdAt (DateTime)     │
│     status (String)          │
│                              │
│ Relations:                   │
│ + filesUploaded (1:N)        │
│ + filesReceived (1:N)        │
└──────────────┬───────────────┘
               │
               │ 1:N (One user uploads many files)
               │ uploaderId
               │
┌──────────────▼────────────────────────────┐
│              FILE                         │
├────────────────────────────────────────────┤
│ PK  id (Int)                               │
│     fileName (String)                      │
│     filePath (String)                      │
│     mimeType (String)                      │
│     size (Int)                             │
│     recipientEmail (String)                │
│     iv (String-hex)          ◄─── Encryption Keys
│     authTag (String-hex)     ◄──┘
│ UQ  downloadToken (String)                 │
│     tokenExpiresAt (DateTime)              │
│     createdAt (DateTime)                   │
│                                            │
│     scanStatus (Enum)        ◄─── Scan Results
│     scanResult (String?)     ◄──┤
│     scannedAt (DateTime?)    ◄──┤
│     scanEngine (String?)     ◄──┘
│                                            │
│ FK  uploaderId ────┐                       │
│ FK  recipientId ───┼──► USER               │
│                    │                       │
│ Indexes:                                   │
│ - [recipientId] (Fast lookup received)     │
│ - [uploaderId] (Fast lookup uploaded)      │
│ - [scanStatus] (Fast lookup by status)     │
└────────────────────────────────────────────┘
               │
               │ 1:N (One user receives many files)
               │ recipientId
               │
               └─────────────────────┐
                                     │
               ┌─────────────────────┘
               │
┌──────────────▼────────────────────────┐
│        ACTIVITY_LOG                   │
├───────────────────────────────────────┤
│ PK  id (Int)                          │
│     createdAt (DateTime)              │
│     actorEmail (String)               │
│     action (Enum: ActionType)         │
│     details (String?)                 │
│     ipAddress (String?)               │
│                                       │
│ Indexes:                              │
│ - [createdAt] (Date range queries)    │
│ - [actorEmail] (User activity lookup) │
└───────────────────────────────────────┘

                    
┌────────────────────────────────────┐
│     PRE_EXISTING_IDS               │
├────────────────────────────────────┤
│ PK  id (UUID)                      │
│     studentId (String?)            │
│     teacherId (String?)            │
│                                    │
│ Purpose:                           │
│ Pre-validated list of IDs for      │
│ student/teacher registration       │
└────────────────────────────────────┘

════════════════════════════════════════════════════════════════════

ENUMS DEFINED IN SCHEMA:

┌────────────────────────────┐    ┌──────────────────────────┐
│    ActionType              │    │    ScanStatus            │
├────────────────────────────┤    ├──────────────────────────┤
│ USER_REGISTER              │    │ PENDING                  │
│ USER_LOGIN_SUCCESS         │    │ CLEAN                    │
│ USER_LOGIN_FAIL            │    │ THREAT_DETECTED          │
│ USER_LOGOUT                │    │ ERROR                    │
│ FILE_UPLOAD                │    └──────────────────────────┘
│ FILE_DOWNLOAD              │
│ FILE_REVOKE                │
│ FILE_SCAN_THREAT_DETECTED  │
│ FILE_SCAN_CLEAN            │
│ ADMIN_USER_EDIT            │
│ ADMIN_USER_DELETE          │
│ ADMIN_USER_STATUS_CHANGE   │
│ ADMIN_SHARE_REVOKE         │
└────────────────────────────┘

════════════════════════════════════════════════════════════════════

RELATIONSHIP CARDINALITY:

User : File (UploadedFiles)
├─ 1 User : N Files
└─ One user can upload many files

User : File (ReceivedFiles)
├─ 1 User : N Files
└─ One user can receive many files

User : ActivityLog
├─ 1 User : N Logs
└─ One user can have many activities logged

File : ActivityLog
├─ 1 File : N Logs (implicitly through filename)
└─ Multiple logs reference same file
```

---

## Class Diagram

### System Classes and Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                    <<Model>>                                │
│                    User                                     │
├─────────────────────────────────────────────────────────────┤
│ - id: string (UUID)                                         │
│ - firstName: string                                         │
│ - lastName: string                                          │
│ - email: string (unique)                                    │
│ - password: string (hashed)                                 │
│ - role: string ("student" | "teacher" | "admin")          │
│ - idNumber: string (unique)                                 │
│ - status: string ("active" | "suspended")                  │
│ - createdAt: DateTime                                       │
├─────────────────────────────────────────────────────────────┤
│ + validatePassword(pwd: string): boolean                    │
│ + hasRole(role: string): boolean                            │
│ + isActive(): boolean                                       │
│ + getFullName(): string                                     │
└─────────────────────────────────────────────────────────────┘
           △                    △                    △
           │                    │                    │
           │ inherits           │ uploads            │ receives
           │                    │                    │
    ┌──────┴──────┐      ┌──────┴──────┐      ┌──────┴──────┐
    │   Student   │      │   Teacher   │      │    Admin    │
    └─────────────┘      └─────────────┘      └─────────────┘
           │                    │                    │
           │                    │                    │
           └────────────────────┼────────────────────┘
                                │
                          ┌─────▼──────────┐
                          │ canUpload()    │
                          │ canDownload()  │
                          │ canRevoke()    │
                          │ canViewLogs()  │
                          └────────────────┘


┌─────────────────────────────────────────────────────────────┐
│                    <<Model>>                                │
│                    File                                     │
├─────────────────────────────────────────────────────────────┤
│ - id: int (PK)                                              │
│ - fileName: string                                          │
│ - filePath: string                                          │
│ - mimeType: string                                          │
│ - size: int                                                 │
│ - recipientEmail: string                                    │
│ - iv: string (hex)                                          │
│ - authTag: string (hex)                                     │
│ - downloadToken: string (unique, nullable)                  │
│ - tokenExpiresAt: DateTime (nullable)                       │
│ - scanStatus: ScanStatus (enum)                             │
│ - scanResult: string (nullable)                             │
│ - scannedAt: DateTime (nullable)                            │
│ - scanEngine: string (nullable)                             │
│ - uploaderId: string (FK)                                   │
│ - recipientId: string (FK, nullable)                        │
│ - createdAt: DateTime                                       │
├─────────────────────────────────────────────────────────────┤
│ + encrypt(key: Buffer): Promise<EncryptResult>             │
│ + decrypt(key: Buffer): Promise<Buffer>                    │
│ + isExpired(): boolean                                      │
│ + isActive(): boolean                                       │
│ + getDownloadUrl(): string                                  │
│ + revoke(): Promise<void>                                   │
│ + updateScanStatus(status: ScanStatus): Promise<void>      │
└─────────────────────────────────────────────────────────────┘
           △                    △
           │ 1                  │ N
           │ (has many)         │
           │                    │
           └────────────────────┘
                 User


┌─────────────────────────────────────────────────────────────┐
│                    <<Model>>                                │
│                    ActivityLog                              │
├─────────────────────────────────────────────────────────────┤
│ - id: int (PK)                                              │
│ - createdAt: DateTime                                       │
│ - actorEmail: string                                        │
│ - action: ActionType (enum)                                 │
│ - details: string (nullable)                                │
│ - ipAddress: string (nullable)                              │
├─────────────────────────────────────────────────────────────┤
│ + getActionType(): ActionType                               │
│ + getDetails(): string                                      │
│ + getTimestamp(): DateTime                                  │
└─────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│                    <<Service>>                              │
│               AuthenticationService                         │
├─────────────────────────────────────────────────────────────┤
│ - secretKey: Uint8Array                                     │
│ - tokenExpiry: number                                       │
├─────────────────────────────────────────────────────────────┤
│ + register(user: UserData): Promise<JWTToken>             │
│ + login(email: string, pwd: string): Promise<JWTToken>    │
│ + logout(): void                                           │
│ + getCurrentUser(token: JWTToken): Promise<User | null>   │
│ + verifyToken(token: JWTToken): Promise<boolean>          │
│ + generateToken(payload: JWTPayload): Promise<JWTToken>   │
└─────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│                    <<Service>>                              │
│              EncryptionService                              │
├─────────────────────────────────────────────────────────────┤
│ - algorithm: string = "aes-256-gcm"                        │
│ - secretKey: Buffer                                         │
├─────────────────────────────────────────────────────────────┤
│ + encryptFile(file: Buffer): Promise<EncryptedFile>       │
│ + decryptFile(encrypted: Buffer): Promise<Buffer>         │
│ + generateIV(): Buffer                                      │
│ + generateAuthTag(): Buffer                                 │
└─────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│                    <<Service>>                              │
│               FileScannerService                            │
├─────────────────────────────────────────────────────────────┤
│ - scannerMethods: string[] (PowerShell, CLI, Hash)         │
├─────────────────────────────────────────────────────────────┤
│ + scanFile(filePath: string): Promise<ScanResult>         │
│ + scanWithWindowsDefender(): Promise<ScanResult>          │
│ + scanWithDefenderCLI(): Promise<ScanResult>              │
│ + hashBasedScan(): Promise<ScanResult>                    │
│ + extractThreatName(output: string): string               │
└─────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│                    <<Service>>                              │
│               ActivityLoggerService                         │
├─────────────────────────────────────────────────────────────┤
│ - database: PrismaClient                                    │
├─────────────────────────────────────────────────────────────┤
│ + logActivity(actor: string, action: ActionType): void    │
│ + getActivityLogs(filters?: Filter): Promise<Log[]>       │
│ + getActivityByUser(email: string): Promise<Log[]>        │
│ + getActivityByAction(action: ActionType): Promise<Log[]> │
│ + getActivityInDateRange(start: Date, end: Date): void    │
└─────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│                    <<Service>>                              │
│               EmailNotificationService                      │
├─────────────────────────────────────────────────────────────┤
│ - transporter: Nodemailer                                   │
│ - sender: string                                            │
├─────────────────────────────────────────────────────────────┤
│ + sendFileNotification(recipient: string,                  │
│       downloadUrl: string, expiry: DateTime): Promise<void>│
│ + sendRegistrationConfirmation(user: User): Promise<void> │
│ + sendLoginAlert(user: User): Promise<void>               │
│ + sendAccountSuspendedNotice(user: User): Promise<void>   │
└─────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│                    <<Controller>>                           │
│            FileUploadController                             │
├─────────────────────────────────────────────────────────────┤
│ - encryptionService: EncryptionService                      │
│ - scannerService: FileScannerService                        │
│ - loggerService: ActivityLoggerService                      │
│ - emailService: EmailNotificationService                    │
├─────────────────────────────────────────────────────────────┤
│ + handleUpload(req: Request): Promise<Response>            │
│ + validateFile(file: File): boolean                        │
│ + encryptAndSave(file: File): Promise<FileMetadata>       │
│ + generateDownloadToken(): string                          │
│ + sendNotification(recipient: string): Promise<void>       │
└─────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│                    <<Controller>>                           │
│            FileDownloadController                           │
├─────────────────────────────────────────────────────────────┤
│ - encryptionService: EncryptionService                      │
│ - authService: AuthenticationService                        │
│ - loggerService: ActivityLoggerService                      │
├─────────────────────────────────────────────────────────────┤
│ + handleDownload(token: string): Promise<Stream>           │
│ + validateToken(token: string): Promise<boolean>           │
│ + authorizeUser(user: User, file: File): boolean          │
│ + decryptAndStream(file: File): Stream                     │
│ + logDownloadActivity(user: User, file: File): void        │
└─────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│                    <<Controller>>                           │
│            AdminController                                  │
├─────────────────────────────────────────────────────────────┤
│ - userService: UserService                                  │
│ - loggerService: ActivityLoggerService                      │
├─────────────────────────────────────────────────────────────┤
│ + manageUsers(action: string): Promise<void>              │
│ + editUser(userId: string, data: UserData): Promise<void> │
│ + deleteUser(userId: string): Promise<void>               │
│ + suspendUser(userId: string): Promise<void>              │
│ + getActivityLogs(): Promise<Log[]>                        │
│ + getSystemStatistics(): Promise<Statistics>              │
└─────────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════════

CLASS RELATIONSHIPS:

Dependency (uses):
  FileUploadController ──uses──> EncryptionService
  FileUploadController ──uses──> FileScannerService
  FileDownloadController ──uses──> EncryptionService
  AdminController ──uses──> ActivityLoggerService

Association (has):
  User ──1──*──> File (has many)
  File ──*──1──> User (belongs to)

Aggregation (part of):
  AuthenticationService (part of System)
  EncryptionService (part of System)
  FileScannerService (part of System)
```

---

## Data Flow Diagram

### DFD Level 0 - System Context

```
                    ┌─────────────────┐
                    │     STUDENT     │
                    └────────┬────────┘
                             │
                             │ Upload/Download
                             │ requests
                             │
                    ┌────────▼────────┐
                    │                 │
                    │   SECURESHARE   │
                    │      SYSTEM     │
                    │                 │
                    └────────┬────────┘
                             │
                             │ Notification
                             │ results
                             │
                ┌────────────┴────────────┐
                │                         │
        ┌───────▼──────────┐     ┌────────▼──────────┐
        │    DATABASE      │     │  EMAIL SERVICE    │
        │  (PostgreSQL)    │     │   (Nodemailer)    │
        │                  │     │                   │
        │  - Users         │     │  - Send emails    │
        │  - Files         │     │  - Notifications  │
        │  - Activity Logs │     │                   │
        └──────────────────┘     └───────────────────┘
```

### DFD Level 1 - Main Processes

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SECURESHARE SYSTEM                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 1.0 AUTHENTICATION                                          │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐           │  │
│  │  │ Register   │  │   Login    │  │  Validate  │           │  │
│  │  │            │  │            │  │   Token    │           │  │
│  │  └────────────┘  └────────────┘  └────────────┘           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 2.0 FILE UPLOAD                                             │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │  │
│  │  │ Validate │  │   Scan   │  │ Encrypt  │  │  Store   │   │  │
│  │  │   File   │  │   File   │  │   File   │  │  File    │   │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 3.0 FILE DOWNLOAD                                           │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │  │
│  │  │ Validate │  │ Authorize│  │ Decrypt  │  │  Stream  │   │  │
│  │  │  Token   │  │  Access  │  │   File   │  │   File   │   │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 4.0 ADMIN MANAGEMENT                                        │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │  │
│  │  │  Manage  │  │   View   │  │  Manage  │  │   View   │   │  │
│  │  │  Users   │  │ Activity │  │  Roles   │  │Statistics│   │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### DFD Level 2 - File Upload Process Detail

```
                            ACTOR: Student
                                  │
                                  │ 1. Upload Request
                                  ▼
                          ┌──────────────┐
                          │   Request    │
                          │ Validation   │
                          └───┬──────────┘
                              │
                   ┌──────────┴──────────┐
                   │                     │
              [Valid]              [Invalid]
                   │                     │
              ┌────▼─────┐          ┌────▼─────────┐
              │ 2. Store │          │ Return Error │
              │ Temp     │          │              │
              │ File     │          └──────────────┘
              └────┬─────┘
                   │
              ┌────▼──────────┐
              │ 3. Scan File  │
              │               │
              │ Call Windows  │
              │ Defender      │
              └──┬────────┬───┘
                 │        │
            [CLEAN]  [THREAT]
                 │        │
            ┌────▼─┐  ┌───▼──────┐
            │4.    │  │ Log Threat│
            │Encrypt
            │      │  │ Return   │
            │      │  │ Error    │
            └────┬─┘  └──────────┘
                 │
            ┌────▼──────────────────┐
            │ 5. Generate Token &   │
            │    Save Metadata      │
            │                       │
            │ Data Flows:           │
            │ - File metadata→ DB   │
            │ - Encryption keys→ DB │
            │ - Scan results→ DB    │
            └────┬─────────────────┘
                 │
            ┌────▼──────────────┐
            │ 6. Send Email &   │
            │    Log Activity   │
            │                   │
            │ Data Flows:       │
            │ - Email→ Service  │
            │ - Log→ ActivityLog│
            └────┬──────────────┘
                 │
            ┌────▼─────────┐
            │ Return URL   │
            │ to Uploader  │
            └──────────────┘


DATA STORES:

D1: PostgreSQL Database
    ├─ User (user_id, email, password, role, ...)
    ├─ File (file_id, fileName, fileSize, uploaderId, 
    │         recipientId, downloadToken, iv, authTag, 
    │         scanStatus, scanResult, ...)
    └─ ActivityLog (log_id, actorEmail, action, timestamp, ip)

D2: Filesystem (/encrypted_uploads/)
    ├─ {uuid}.enc (encrypted file)
    └─ temp_{uuid}_{filename} (temporary scan file)

D3: Email Service (Nodemailer)
    └─ Send notifications to recipients
```

### DFD Level 2 - File Download Process Detail

```
                            ACTOR: Recipient
                                  │
                                  │ 1. Click Download Link
                                  ▼
                          ┌──────────────┐
                          │ Extract &    │
                          │ Validate     │
                          │ Token        │
                          └───┬──────────┘
                              │
                   ┌──────────┴──────────┐
                   │                     │
              [Valid]              [Invalid]
                   │                     │
              ┌────▼─────┐          ┌────▼──────────┐
              │ 2. Auth  │          │ Return Error  │
              │ Check    │          │ (Bad Link)    │
              └────┬─────┘          └───────────────┘
                   │
          ┌────────┴────────┐
          │                 │
      [Auth]            [No Auth]
          │                 │
    ┌─────▼────┐      ┌─────▼──────────┐
    │ 3. Query │      │ Return Error   │
    │ Database │      │ (Not logged in)│
    └─────┬────┘      └────────────────┘
          │
    ┌─────▼──────────┐
    │ 4. Check Token │
    │ Expiry         │
    └─────┬───┬──────┘
          │   │
     [Valid] [Expired]
          │   │
    ┌─────▼─┐ └─────────────┐
    │ 5.    │               │
    │ Check │          ┌────▼──────┐
    │ Recip │          │ Return    │
    │ ient  │          │ Error     │
    └───┬───┘          │(Expired)  │
        │              └───────────┘
    ┌───┴────────┐
    │            │
  [Auth]     [Not Auth]
    │            │
┌───▼────┐  ┌────▼────────────┐
│ 6.     │  │ Return Error    │
│ Decrypt│  │ (Access Denied) │
│        │  └─────────────────┘
└───┬────┘
    │
┌───▼──────────────┐
│ 7. Stream to     │
│    Browser       │
│                  │
│ Data Flows:      │
│ - Key from DB    │
│ - File from FS   │
│ - Decrypted→User │
│ - Log→ActivityLog│
└────┬─────────────┘
     │
  ┌──▼──────────┐
  │ Download    │
  │ Complete    │
  └─────────────┘


DATA FLOWS:

DF1: Download Token → System
    (From URL parameter)

DF2: User Credentials → Authentication Service
    (JWT verification)

DF3: Query to Database → File Metadata
    (Token, expiry, recipient email, encryption keys)

DF4: Encrypted File + Key + IV + AuthTag → Decipher
    (Decryption process)

DF5: Decrypted File Stream → Browser
    (User downloads file)

DF6: Activity Log Entry → Database
    (FILE_DOWNLOAD action recorded)
```

---

## Project Development Approach

### Methodology: Agile Development with Iterative Increments

```
┌──────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT LIFECYCLE                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   PHASE 1: Planning & Design                                │
│   ├─ Requirements Analysis                                  │
│   ├─ System Design & Architecture                          │
│   ├─ Database Schema Design                                │
│   └─ Technology Stack Selection                            │
│       ├─ Frontend: Next.js + React + Tailwind + Shadcn    │
│       ├─ Backend: Next.js API Routes + Node.js            │
│       ├─ Database: PostgreSQL + Prisma ORM                │
│       ├─ Authentication: JWT (jose)                       │
│       ├─ Encryption: Node crypto (AES-256-GCM)            │
│       ├─ Scanning: Windows Defender                       │
│       └─ Email: Nodemailer                                │
│                                                              │
│   PHASE 2: Architecture Development                         │
│   ├─ Set up Next.js project structure                     │
│   ├─ Configure Tailwind CSS & Shadcn UI                   │
│   ├─ Set up PostgreSQL database                           │
│   ├─ Configure Prisma ORM                                 │
│   ├─ Set up environment variables                         │
│   └─ Initialize version control (Git)                     │
│                                                              │
│   PHASE 3: Core Feature Development (Iterative)            │
│   ├─ Sprint 1: Authentication Module                      │
│   │  ├─ User registration API                            │
│   │  ├─ User login API                                   │
│   │  ├─ JWT token generation & verification             │
│   │  ├─ HttpOnly cookie setup                           │
│   │  └─ UI Pages: Register, Login                        │
│   │                                                        │
│   ├─ Sprint 2: File Upload Module                        │
│   │  ├─ File validation                                 │
│   │  ├─ AES-256-GCM encryption                          │
│   │  ├─ File scanner integration                        │
│   │  ├─ Database file metadata storage                  │
│   │  ├─ Download link generation                        │
│   │  ├─ Email notification                              │
│   │  ├─ Activity logging                                │
│   │  └─ UI Page: Upload                                 │
│   │                                                        │
│   ├─ Sprint 3: File Download Module                      │
│   │  ├─ Token validation                                │
│   │  ├─ Authorization checks                            │
│   │  ├─ File decryption stream                          │
│   │  ├─ Browser download response                       │
│   │  ├─ Activity logging                                │
│   │  └─ UI Page: Download                               │
│   │                                                        │
│   ├─ Sprint 4: Dashboard & File Management               │
│   │  ├─ List uploaded files                             │
│   │  ├─ List received files                             │
│   │  ├─ Revoke file shares                              │
│   │  ├─ Search & filter functionality                   │
│   │  ├─ Status indicators                               │
│   │  └─ UI Page: Dashboard                              │
│   │                                                        │
│   ├─ Sprint 5: Admin Panel                               │
│   │  ├─ User management (CRUD)                          │
│   │  ├─ Role management                                 │
│   │  ├─ Activity log viewing                            │
│   │  ├─ System statistics                               │
│   │  ├─ User suspension/activation                      │
│   │  └─ UI Page: Admin Dashboard                        │
│   │                                                        │
│   └─ Sprint 6: Security & Optimization                   │
│      ├─ Middleware authentication                        │
│      ├─ Role-based access control                        │
│      ├─ Rate limiting (future)                           │
│      ├─ Error handling standardization                   │
│      ├─ Performance optimization                         │
│      └─ Security audit & fixes                          │
│                                                              │
│   PHASE 4: Testing & Quality Assurance                     │
│   ├─ Unit Testing                                         │
│   ├─ Integration Testing                                  │
│   ├─ Security Testing                                     │
│   ├─ Performance Testing                                  │
│   └─ User Acceptance Testing (UAT)                        │
│                                                              │
│   PHASE 5: Deployment & Maintenance                        │
│   ├─ Production Environment Setup                         │
│   ├─ Database Migration                                   │
│   ├─ SSL/HTTPS Configuration                             │
│   ├─ Backup Strategy                                      │
│   ├─ Monitoring & Alerting                               │
│   └─ Continuous Maintenance                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Development Tools & Technologies

```
┌─────────────────────────────────────────────────────────────┐
│                 DEVELOPMENT STACK                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ FRONTEND TECHNOLOGIES                                      │
│ ├─ Next.js 15.2 (Framework)                              │
│ ├─ React 18.3 (UI Library)                               │
│ ├─ TypeScript 5 (Type Safety)                            │
│ ├─ Tailwind CSS 3.4 (Styling)                            │
│ ├─ Shadcn UI (Component Library)                         │
│ ├─ React Hook Form (Form Management)                     │
│ ├─ Zod (Validation)                                      │
│ ├─ Sonner (Toast Notifications)                          │
│ └─ Lucide React (Icons)                                  │
│                                                             │
│ BACKEND TECHNOLOGIES                                       │
│ ├─ Node.js (Runtime)                                     │
│ ├─ Next.js API Routes (API)                              │
│ ├─ TypeScript (Type Safety)                              │
│ ├─ bcryptjs (Password Hashing)                           │
│ ├─ jose (JWT Generation & Verification)                  │
│ ├─ Node crypto (AES-256-GCM Encryption)                 │
│ ├─ Nodemailer (Email Service)                           │
│ └─ child_process (Windows Defender Integration)          │
│                                                             │
│ DATABASE TECHNOLOGIES                                      │
│ ├─ PostgreSQL (Database)                                 │
│ ├─ Prisma 6.16 (ORM)                                     │
│ └─ Migration System (Schema Management)                  │
│                                                             │
│ SECURITY TECHNOLOGIES                                      │
│ ├─ AES-256-GCM (File Encryption)                        │
│ ├─ bcryptjs (Password Hashing)                           │
│ ├─ JWT/jose (Token Authentication)                       │
│ ├─ HttpOnly Cookies (XSS Prevention)                     │
│ ├─ SameSite Cookies (CSRF Prevention)                    │
│ └─ Windows Defender (Malware Scanning)                   │
│                                                             │
│ DEVELOPMENT TOOLS                                          │
│ ├─ VS Code (Code Editor)                                 │
│ ├─ Git (Version Control)                                 │
│ ├─ npm/pnpm (Package Manager)                            │
│ ├─ Postman (API Testing)                                 │
│ ├─ PostgreSQL Admin (Database Management)                │
│ ├─ Chrome DevTools (Browser Debugging)                   │
│ └─ Console (Logging & Debugging)                         │
│                                                             │
│ DEPLOYMENT PLATFORMS (Future)                             │
│ ├─ Vercel (Frontend Hosting)                             │
│ ├─ AWS EC2 (Backend Hosting)                             │
│ ├─ AWS RDS (Database Hosting)                            │
│ ├─ AWS S3 (File Storage - Future)                        │
│ └─ GitHub Actions (CI/CD - Future)                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Team Structure & Responsibilities

```
┌────────────────────────────────────────────────────────────┐
│              DEVELOPMENT TEAM STRUCTURE                   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Project Manager                                          │
│  ├─ Project planning & scheduling                        │
│  ├─ Stakeholder communication                            │
│  ├─ Risk management                                      │
│  └─ Sprint reviews                                       │
│                                                            │
│  Backend Developer(s)                                     │
│  ├─ API routes development                               │
│  ├─ Database schema & migrations                         │
│  ├─ Authentication & authorization                       │
│  ├─ Encryption implementation                            │
│  ├─ File scanning integration                            │
│  ├─ Email notification setup                             │
│  ├─ Activity logging                                     │
│  └─ Backend testing                                      │
│                                                            │
│  Frontend Developer(s)                                    │
│  ├─ UI component development                             │
│  ├─ Page layouts & responsive design                     │
│  ├─ Form handling & validation                           │
│  ├─ API integration                                      │
│  ├─ State management                                     │
│  ├─ Theme & styling                                      │
│  └─ Frontend testing                                     │
│                                                            │
│  QA/Tester                                               │
│  ├─ Test planning & strategy                             │
│  ├─ Manual testing                                       │
│  ├─ Bug reporting & tracking                             │
│  ├─ Security testing                                     │
│  ├─ Performance testing                                  │
│  └─ UAT coordination                                     │
│                                                            │
│  DevOps/System Administrator (Future)                    │
│  ├─ Server setup & configuration                         │
│  ├─ Database administration                              │
│  ├─ CI/CD pipeline setup                                 │
│  ├─ Monitoring & alerting                                │
│  ├─ Backup & disaster recovery                           │
│  └─ Security & compliance                                │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Flow of Work

### Complete Development Workflow

```
┌──────────────────────────────────────────────────────────────────┐
│                     DEVELOPMENT WORKFLOW                         │
└──────────────────────────────────────────────────────────────────┘

STEP 1: REQUIREMENTS GATHERING
┌─────────────────────────────────────────────────────────────────┐
│ • Identify stakeholder needs                                   │
│ • Define functional requirements                               │
│ • Define non-functional requirements (security, performance)   │
│ • Create user stories                                          │
│ • Prioritize requirements                                      │
│ • Document acceptance criteria                                 │
│ Output: Requirements Document                                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓

STEP 2: SYSTEM DESIGN & PLANNING
┌─────────────────────────────────────────────────────────────────┐
│ • Design system architecture                                   │
│ • Design database schema (ER diagram)                          │
│ • Design user interface mockups                                │
│ • Plan API endpoints & data flows                              │
│ • Identify security requirements                               │
│ • Plan sprint iterations                                       │
│ Output: System Design Document (this document)                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓

STEP 3: ENVIRONMENT SETUP
┌─────────────────────────────────────────────────────────────────┐
│ • Install Node.js & npm/pnpm                                   │
│ • Create Next.js project                                       │
│ • Set up PostgreSQL database                                   │
│ • Configure Prisma ORM                                         │
│ • Set up environment variables (.env file)                     │
│ • Initialize Git repository                                    │
│ • Set up project folder structure                              │
│ Output: Development Environment Ready                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓

STEP 4: ITERATIVE DEVELOPMENT (For Each Sprint)
┌─────────────────────────────────────────────────────────────────┐
│ SPRINT PLANNING                                                 │
│ ├─ Review backlog items                                        │
│ ├─ Estimate effort (story points)                              │
│ ├─ Assign tasks to developers                                  │
│ ├─ Define sprint goals                                         │
│ └─ Set sprint timeline (usually 1-2 weeks)                     │
│                                                                 │
│ DEVELOPMENT PHASE                                               │
│ ├─ Write code (Backend & Frontend)                             │
│ ├─ Implement features according to design                      │
│ ├─ Write unit tests                                            │
│ ├─ Document code                                               │
│ ├─ Commit to version control with meaningful messages          │
│ └─ Create Pull Requests for code review                        │
│                                                                 │
│ CODE REVIEW PHASE                                               │
│ ├─ Team members review code quality                            │
│ ├─ Check for bugs & security issues                            │
│ ├─ Verify adherence to coding standards                        │
│ ├─ Request changes if needed                                   │
│ └─ Merge approved code to main branch                          │
│                                                                 │
│ TESTING PHASE                                                   │
│ ├─ Run unit tests locally                                      │
│ ├─ Run integration tests                                       │
│ ├─ QA performs manual testing                                  │
│ ├─ Document bugs & issues                                      │
│ ├─ Re-test after bug fixes                                     │
│ └─ Get signoff from QA                                         │
│                                                                 │
│ SPRINT REVIEW & RETROSPECTIVE                                   │
│ ├─ Demo completed features to stakeholders                     │
│ ├─ Collect feedback                                            │
│ ├─ Review what went well                                       │
│ ├─ Identify improvements for next sprint                       │
│ └─ Update backlog based on feedback                            │
│                                                                 │
│ Output: Completed Features (Potentially Shippable)             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                    (Repeat for each sprint)
                            ↓

STEP 5: INTEGRATION TESTING
┌─────────────────────────────────────────────────────────────────┐
│ • Test all components working together                         │
│ • End-to-end user workflow testing                             │
│ • Cross-browser compatibility testing                          │
│ • Security testing (OWASP vulnerabilities)                     │
│ • Performance testing (load & stress tests)                    │
│ • Fix integration issues found                                 │
│ Output: Ready for Deployment                                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓

STEP 6: USER ACCEPTANCE TESTING (UAT)
┌─────────────────────────────────────────────────────────────────┐
│ • Provide system to selected users (stakeholders)              │
│ • Users test real-world scenarios                              │
│ • Document feedback & issues                                   │
│ • Fix critical issues found                                    │
│ • Get formal sign-off from stakeholders                        │
│ Output: UAT Sign-off Document                                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓

STEP 7: DEPLOYMENT PREPARATION
┌─────────────────────────────────────────────────────────────────┐
│ • Set up production environment                                │
│ • Configure production database                                │
│ • Set up monitoring & alerting                                 │
│ • Create deployment checklist                                  │
│ • Document deployment procedures                               │
│ • Prepare rollback plan                                        │
│ • Get deployment approval                                      │
│ Output: Deployment Ready                                       │
└─────────────────────────────────────────────────────────────────┘
                            ↓

STEP 8: PRODUCTION DEPLOYMENT
┌─────────────────────────────────────────────────────────────────┐
│ • Deploy to production servers                                 │
│ • Run database migrations                                      │
│ • Verify all services are running                              │
│ • Run smoke tests                                              │
│ • Monitor for errors                                           │
│ • Have rollback plan ready                                     │
│ Output: System Live in Production                              │
└─────────────────────────────────────────────────────────────────┘
                            ↓

STEP 9: POST-DEPLOYMENT ACTIVITIES
┌─────────────────────────────────────────────────────────────────┐
│ • Monitor system performance & health                          │
│ • Collect user feedback                                        │
│ • Fix production bugs (hotfixes)                               │
│ • Document lessons learned                                     │
│ • Create user documentation                                    │
│ • Provide user training                                        │
│ • Plan for future enhancements                                 │
│ Output: System Maintenance Mode                                │
└─────────────────────────────────────────────────────────────────┘
```

### Daily Development Workflow

```
┌──────────────────────────────────────────────────────────────────┐
│                    DAILY STANDUP (15 min)                        │
├──────────────────────────────────────────────────────────────────┤
│ Each developer reports:                                         │
│ 1. What did you complete yesterday?                            │
│ 2. What are you working on today?                              │
│ 3. Are there any blockers?                                     │
│ Scrum Master removes blockers                                  │
└──────────────────────────────────────────────────────────────────┘
                            ↓

┌──────────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT (6-7 hours)                       │
├──────────────────────────────────────────────────────────────────┤
│ Frontend Developer:                                             │
│ 1. Pull latest code: git pull origin main                     │
│ 2. Create feature branch: git checkout -b feature/name        │
│ 3. Implement feature                                           │
│ 4. Test locally                                                │
│ 5. Write/update unit tests                                     │
│ 6. Commit: git commit -m "descriptive message"                │
│ 7. Push: git push origin feature/name                         │
│ 8. Create Pull Request                                         │
│                                                                │
│ Backend Developer:                                              │
│ 1. Pull latest code: git pull origin main                     │
│ 2. Create feature branch: git checkout -b feature/name        │
│ 3. Write API endpoint                                          │
│ 4. Test with Postman                                           │
│ 5. Write unit tests                                            │
│ 6. Update database schema if needed (Prisma)                  │
│ 7. Commit & push                                               │
│ 8. Create Pull Request                                         │
│                                                                │
│ QA/Tester:                                                      │
│ 1. Review completed PRs                                        │
│ 2. Test features in dev environment                            │
│ 3. Log bugs in issue tracker                                   │
│ 4. Create test cases                                           │
│ 5. Update test documentation                                   │
└──────────────────────────────────────────────────────────────────┘
                            ↓

┌──────────────────────────────────────────────────────────────────┐
│                    CODE REVIEW (1-2 hours)                       │
├──────────────────────────────────────────────────────────────────┤
│ Peer Review Checklist:                                          │
│ ☐ Code follows project style guide                             │
│ ☐ No security vulnerabilities                                  │
│ ☐ Unit tests written and passing                               │
│ ☐ No performance issues                                        │
│ ☐ Comments/documentation adequate                              │
│ ☐ No merge conflicts                                           │
│ ☐ Database changes documented                                  │
│ ☐ API endpoints documented                                     │
│                                                                │
│ If approved: Merge to main                                     │
│ If changes needed: Request modifications                       │
└──────────────────────────────────────────────────────────────────┘
                            ↓

┌──────────────────────────────────────────────────────────────────┐
│                    INTEGRATION & TESTING                         │
├──────────────────────────────────────────────────────────────────┤
│ After merge:                                                    │
│ 1. Run full test suite                                         │
│ 2. Deploy to dev/staging environment                           │
│ 3. Verify all tests pass                                       │
│ 4. Manual smoke testing                                        │
│ 5. Check for regressions                                       │
│ 6. Update documentation                                        │
└──────────────────────────────────────────────────────────────────┘
```

### Version Control Workflow

```
┌──────────────────────────────────────────────────────────────────┐
│                    GIT WORKFLOW - FEATURE BRANCH                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ MAIN BRANCH (main)                                              │
│ └─ Always production-ready code                                │
│    └─ Protected: requires PR review before merge               │
│    └─ All tests must pass                                      │
│                                                                  │
│ DEVELOPMENT BRANCH (develop)                                    │
│ └─ Integration branch for features                             │
│    └─ Contains latest development code                         │
│    └─ Tests must pass                                          │
│                                                                  │
│ FEATURE BRANCHES (feature/feature-name)                        │
│ ├─ Individual developer creates from develop                   │
│ ├─ Commits: Frequent, with meaningful messages                │
│ ├─ Push regularly to remote                                    │
│ ├─ Create Pull Request to develop                              │
│ ├─ After review & approval: Merge to develop                   │
│ └─ Delete branch after merge                                   │
│                                                                  │
│ BUGFIX BRANCHES (bugfix/issue-name)                            │
│ └─ Same as feature branches but for bug fixes                  │
│                                                                  │
│ HOTFIX BRANCHES (hotfix/issue-name)                            │
│ ├─ Created from main for production issues                     │
│ ├─ Fixed immediately and merged to main                        │
│ └─ Also merged back to develop                                 │
│                                                                  │
│ Example Workflow:                                               │
│                                                                  │
│ 1. git checkout develop                                        │
│ 2. git pull origin develop                                     │
│ 3. git checkout -b feature/file-upload                         │
│ 4. [Make changes]                                              │
│ 5. git add .                                                   │
│ 6. git commit -m "Add file upload feature"                     │
│ 7. git push origin feature/file-upload                         │
│ 8. [Create Pull Request on GitHub]                            │
│ 9. [Wait for code review]                                      │
│ 10. [Make requested changes if any]                            │
│ 11. [After approval] Merge to develop                          │
│ 12. git checkout develop                                       │
│ 13. git pull origin develop                                    │
│ 14. git branch -d feature/file-upload                          │
│                                                                  │
│ Commit Message Convention:                                      │
│ ├─ Type: feat, fix, docs, style, refactor, test              │
│ ├─ Format: "[Type] Short description"                          │
│ ├─ Example: "[feat] Add file upload encryption"               │
│ └─ Details: Longer explanation in commit body                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Summary

This System Design Document provides comprehensive details of the SecureShare project architecture:

- **Use Case Diagram**: Shows all user interactions and system capabilities
- **Activity Diagrams**: Illustrate file upload and download processes step-by-step
- **Architecture Diagram**: Depicts layered system design and component relationships
- **ER Diagram**: Shows database entities and relationships
- **Class Diagram**: Details classes, methods, and service dependencies
- **Data Flow Diagram**: Maps data movement through system processes
- **Development Approach**: Outlines Agile methodology and technology stack
- **Flow of Work**: Documents complete development lifecycle from planning to deployment

This document serves as a blueprint for development teams to understand system requirements, architecture, and development procedures.

