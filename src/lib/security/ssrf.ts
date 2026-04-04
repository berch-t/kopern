/**
 * SSRF protection for external endpoint grading.
 * Validates URLs to prevent Server-Side Request Forgery attacks.
 */

const BLOCKED_DOMAINS = [
  "kopern.ai",
  "www.kopern.ai",
  "kopern.vercel.app",
  "kopern.com",
  "www.kopern.com",
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
];

const PRIVATE_IP_RANGES = [
  /^127\./,                          // Loopback
  /^10\./,                           // Class A private
  /^172\.(1[6-9]|2\d|3[01])\./,     // Class B private
  /^192\.168\./,                     // Class C private
  /^169\.254\./,                     // Link-local / metadata
  /^0\./,                            // "This" network
  /^fc00:/i,                         // IPv6 unique local
  /^fd/i,                            // IPv6 unique local
  /^fe80:/i,                         // IPv6 link-local
  /^::1$/,                           // IPv6 loopback
  /^::$/,                            // IPv6 unspecified
];

const METADATA_HOSTS = [
  "169.254.169.254",                 // AWS/GCP metadata
  "metadata.google.internal",        // GCP metadata
  "metadata.internal",               // Generic cloud metadata
  "100.100.100.200",                 // Alibaba Cloud metadata
];

export interface SsrfValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validate an external URL for SSRF safety.
 * Blocks private IPs, metadata endpoints, and Kopern domains.
 */
export function validateExternalUrl(url: string): SsrfValidationResult {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, reason: "Invalid URL format" };
  }

  // Must be HTTP or HTTPS
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { valid: false, reason: "Only HTTP/HTTPS protocols are allowed" };
  }

  // Require HTTPS in production
  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
    return { valid: false, reason: "HTTPS is required" };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block Kopern domains
  if (BLOCKED_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`))) {
    return { valid: false, reason: "Cannot target Kopern domains" };
  }

  // Block metadata endpoints
  if (METADATA_HOSTS.some((h) => hostname === h)) {
    return { valid: false, reason: "Cannot target cloud metadata endpoints" };
  }

  // Block private IP ranges
  if (PRIVATE_IP_RANGES.some((re) => re.test(hostname))) {
    return { valid: false, reason: "Cannot target private/internal IP addresses" };
  }

  // Block IP addresses that look numeric (catches edge cases like 0x7f000001)
  // Allow normal hostnames
  if (/^\d+$/.test(hostname)) {
    return { valid: false, reason: "Numeric-only hostnames are not allowed" };
  }

  return { valid: true };
}
