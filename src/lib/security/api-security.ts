import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "../rate-limit";
import { logger } from "../logger";

/**
 * Security configuration for API routes
 */
export const SECURITY_CONFIG = {
  // Rate limiting: 20 requests per minute per IP
  rateLimit: {
    limit: 20,
    windowMs: 60 * 1000,
  },
  // Allowed origins for CORS (adjust as needed)
  allowedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ],
  // Maximum body size (10MB)
  maxBodySize: 10 * 1024 * 1024,
};

/**
 * Security headers to apply to all API responses
 */
export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

/**
 * Apply security headers to a NextResponse
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * Check rate limiting for an API request
 */
export async function checkRateLimit(request: NextRequest): Promise<{ allowed: boolean; error?: string }> {
  const ip = getClientIp(request.headers);
  const result = rateLimit(ip, SECURITY_CONFIG.rateLimit);

  if (!result.allowed) {
    logger.warn("Rate limit exceeded", { ip, limit: result.limit, reset: result.reset });
    return {
      allowed: false,
      error: `Rate limit exceeded. Try again in ${result.retryAfterSeconds} seconds.`,
    };
  }

  return { allowed: true };
}

/**
 * Validate request origin (CORS protection)
 */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  
  // Allow same-origin and no-origin (same-site requests)
  if (!origin) return true;
  
  // Check against allowed origins
  return SECURITY_CONFIG.allowedOrigins.some(allowed => 
    origin === allowed || origin.startsWith(allowed.replace(/\/$/, ""))
  );
}

/**
 * Apply CORS headers if needed
 */
export function applyCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const origin = request.headers.get("origin");
  
  if (origin && validateOrigin(request)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.headers.set("Access-Control-Max-Age", "86400");
  }
  
  return response;
}

/**
 * Middleware function to secure API routes
 * Usage: const securityCheck = await secureApiRoute(request);
 */
export async function secureApiRoute(request: NextRequest): Promise<{ success: boolean; error?: string; response?: NextResponse }> {
  // Handle OPTIONS preflight requests
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    applyCorsHeaders(response, request);
    applySecurityHeaders(response);
    return { success: true, response };
  }

  // Check rate limiting
  const rateLimitCheck = await checkRateLimit(request);
  if (!rateLimitCheck.allowed) {
    const response = NextResponse.json(
      { error: rateLimitCheck.error },
      { status: 429 }
    );
    applySecurityHeaders(response);
    return { success: false, error: rateLimitCheck.error, response };
  }

  // Validate origin
  if (!validateOrigin(request)) {
    logger.warn("Invalid origin blocked", { origin: request.headers.get("origin") });
    const response = NextResponse.json(
      { error: "Forbidden: Invalid origin" },
      { status: 403 }
    );
    applySecurityHeaders(response);
    return { success: false, error: "Invalid origin", response };
  }

  // Check content type for POST/PUT requests
  if ((request.method === "POST" || request.method === "PUT") && 
      request.headers.get("content-type")?.includes("multipart/form-data")) {
    // For file uploads, check size
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > SECURITY_CONFIG.maxBodySize) {
      const response = NextResponse.json(
        { error: "Request body too large" },
        { status: 413 }
      );
      applySecurityHeaders(response);
      return { success: false, error: "Request body too large", response };
    }
  }

  return { success: true };
}

/**
 * Helper to create a secure API response
 */
export function createSecureResponse(data: unknown, status: number = 200): NextResponse {
  const response = NextResponse.json(data, { status });
  applySecurityHeaders(response);
  return response;
}
