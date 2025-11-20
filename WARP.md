# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project: Secure File Sharing (Next.js + Prisma)

Commands (pwsh on Windows)
- Install deps
  - npm install
- Run the dev server
  - npm run dev
- Build and run
  - npm run build
  - npm run start
- Lint
  - npm run lint
- Prisma (PostgreSQL)
  - Generate client after schema changes
    - npx prisma generate
  - Apply migrations in dev
    - npx prisma migrate dev
  - Apply migrations in prod/CI
    - npx prisma migrate deploy

Notes
- Node 18+ is recommended (Next.js 15 and several deps require >=18).
- Database URL must be set (PostgreSQL): DATABASE_URL=postgresql://...
- The upload API writes encrypted files under ./encrypted_uploads (created on demand). Ensure the process has write access.

Environment variables (required by code)
- Authentication/JWT
  - JWT_SECRET: string (used by middleware and auth utilities)
- File encryption (AES-256-GCM)
  - ENCRYPTION_KEY: 64-char hex (32 bytes) for AES-256-GCM (upload/download APIs)
- Email (Nodemailer transport)
  - EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE ("true"|"false"), EMAIL_USER, EMAIL_PASS, EMAIL_FROM (optional)
- App base URL
  - NEXT_PUBLIC_BASE_URL: used to generate download page links in email (falls back to http://localhost:3000)
- Optional Next.js override config
  - v0-user-next.config (optional, merged if present per next.config.mjs)

Testing
- No test framework/config detected (no Jest/Vitest/Cypress configs or scripts). If tests are added later, document the single-test invocation here.

High-level architecture overview
- Framework/runtime
  - Next.js 15 App Router with TypeScript (strict), Tailwind UI components, and Radix UI. Path alias @/* maps to repo root.
  - Middleware (app/middleware.ts) performs route protection and admin gating using a JWT in an HttpOnly cookie named token. It verifies via jose and redirects unauthenticated users to /login. Admin routes are matched by /admin and /api/admin.
- Persistence (Prisma + PostgreSQL)
  - prisma/schema.prisma defines:
    - User (uuid id, firstName, lastName, email unique, password hash, role, idNumber unique, status)
    - File (autoincrement id, file metadata, iv, authTag, downloadToken?, tokenExpiresAt?, scanStatus enum ScanStatus, scanResult?, scannedAt?, scanEngine?, relations uploaderId -> User, recipientId? -> User)
    - ActivityLog (autoincrement id, actorEmail, action enum ActionType, details?)
    - PreExistingIDs (optional gating for registration by teacherId/studentId)
    - ScanStatus enum (PENDING, CLEAN, THREAT_DETECTED, ERROR)
    - ActionType enum includes FILE_SCAN_THREAT_DETECTED, FILE_SCAN_CLEAN
  - Indexes on File recipientId and uploaderId improve shared/received queries.
  - lib/prisma.ts provides a shared PrismaClient in dev to avoid re-instantiation.
- Authentication & user context
  - app/api/login: validates credentials (bcryptjs), signs JWT via jose (HS256, 24h), sets HttpOnly token cookie, logs USER_LOGIN_SUCCESS/FAIL in ActivityLog.
  - app/api/register: validates uniqueness and allowed IDs (PreExistingIDs), stores bcrypt hash, returns JWT cookie.
  - app/api/logout: clears token cookie.
  - lib/auth-utils.getCurrentUser(request): verifies the HttpOnly token, loads the user from DB, returns { id, email, role } or null.
- File sharing flow (end-to-end)
  - Upload (app/api/upload/route.ts)
    - Auth required. Accepts multipart/form-data with file and recipientEmail.
    - Validates recipient exists. Enforces max size (50MB).
    - Scans file for malware using Windows Defender (lib/fileScanner.ts) before encryption.
    - Blocks upload if threats detected and logs FILE_SCAN_THREAT_DETECTED.
    - Encrypts clean files using Node crypto AES-256-GCM with ENCRYPTION_KEY, generates iv and authTag.
    - Stores encrypted file under ./encrypted_uploads with a random .enc filename.
    - Persists File row with iv, authTag, downloadToken, tokenExpiresAt (24h), scan results (scanStatus, scanResult, scannedAt, scanEngine), uploader/recipient linkage, and on-disk file path.
    - Emails recipient a link to the download PAGE (/download/[token]) using NEXT_PUBLIC_BASE_URL.
  - Metadata (app/api/metadata/[token]/route.ts)
    - Auth required (recipient only). Validates token format, expiry, and ownership. Returns fileName/size/mimeType.
  - Download (app/api/download/[token]/route.ts)
    - Auth required (recipient only). Validates token and expiry, streams decrypted content by piping createReadStream -> createDecipheriv (AES-256-GCM). Sets Content-Disposition for attachment. Logs FILE_DOWNLOAD.
  - Revoke (app/api/files/revoke/[fileId]/route.ts)
    - Auth required. Only uploader can revoke; sets downloadToken and tokenExpiresAt to null. Logs FILE_REVOKE.
  - Listings
    - app/api/files/shared: files uploaded by current user with computed status (active/expired/revoked).
    - app/api/files/received: files where current user is recipient, includes uploader summary.
- Admin scope
  - Middleware restricts /admin and /api/admin to role === 'admin'.
  - app/api/admin/users/summary: user list with counts of filesUploaded/filesReceived.
  - app/api/admin/users/[userId] (PATCH/DELETE): update firstName/role/status; delete user and their files (removes DB rows and attempts file unlink). Logs ADMIN_USER_EDIT/ADMIN_USER_DELETE.
  - app/api/admin/users/[userId]/status: toggle status active/suspended with guard rails. Logs ADMIN_USER_STATUS_CHANGE.
  - app/api/admin/activity: latest ActivityLog entries.
  - app/admin/dashboard/page.tsx consumes these APIs for management UI and activity viewing.
- File security scanning
  - lib/fileScanner.ts provides Windows Defender integration for malware scanning.
  - Uses PowerShell Start-MpScan and fallback to MpCmdRun.exe CLI for comprehensive threat detection.
  - Files are temporarily saved, scanned, then encrypted only if clean.
  - Infected files are immediately deleted and upload is blocked.
  - Scan results (status, engine, threat details) stored in database and displayed in UI.
- Utilities & notes
  - lib/logger.logActivity writes ActivityLog entries and isolates failures to avoid impacting main flows.
  - lib/encryption.ts and lib/email.ts are placeholders; production encryption/email paths are implemented directly in the API routes using crypto and nodemailer.
  - next.config.mjs enables faster builds (parallel server builds), ignores build-time ESLint/TS errors, and exposes JWT_SECRET via env.

How to be productive quickly
- Ensure env vars are set (JWT_SECRET, ENCRYPTION_KEY, DATABASE_URL, email transport vars). ENCRYPTION_KEY must be 64 hex chars.
- Run npx prisma generate and npx prisma migrate dev once DATABASE_URL is configured.
- Start dev server with npm run dev and exercise flows:
  - POST /api/register -> login -> upload to a registered recipient -> recipient logs in -> visit emailed /download/[token] page -> API retrieves metadata and streams download.
- For admin tasks, assign a user role=admin directly in DB (or via a seed you add later), then navigate to /admin/dashboard.
