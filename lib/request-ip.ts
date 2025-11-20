// File Path: lib/request-ip.ts

/**
 * Extract the client IP address from request headers.
 * Supports common proxy headers and the standard Forwarded header.
 */
export function getClientIpFromHeaders(headers: Headers): string {
  // Common proxy headers (left-most IP is the original client)
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const ip = xff.split(',')[0].trim();
    if (ip) return ip;
  }

  const candidates = [
    'x-real-ip',
    'cf-connecting-ip',
    'true-client-ip',
    'fly-client-ip',
  ];
  for (const h of candidates) {
    const v = headers.get(h);
    if (v) return v;
  }

  // RFC 7239 Forwarded: for=1.2.3.4;proto=https;host=...
  const fwd = headers.get('forwarded');
  if (fwd) {
    const m = /for=([^;\s]+)/i.exec(fwd);
    if (m && m[1]) return stripQuotes(m[1]);
  }

  // As a last resort, try non-standard node/next header
  const remoteAddr = headers.get('x-remote-address');
  if (remoteAddr) return remoteAddr;

  return 'unknown';
}

function stripQuotes(s: string): string { return s.replace(/^"|"$/g, ''); }