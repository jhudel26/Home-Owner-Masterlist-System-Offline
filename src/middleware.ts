import { type NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const method = request.method;
  
  // Simplified CSRF protection for LAN access
  // Only enforce strict origin checks for non-LAN scenarios
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    
    // Always allow requests without origin header (typical for same-origin requests)
    if (!origin) {
      const response = NextResponse.next();
      setSecurityHeaders(response);
      return response;
    }
    
    // If origin is present, only check for obviously malicious cross-origin requests
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        const originHostname = originHost.split(":")[0]; // Remove port if present
        const hostHostname = host.split(":")[0]; // Remove port if present
        
        // Allow if exact match
        if (originHost === host) {
          const response = NextResponse.next();
          setSecurityHeaders(response);
          return response;
        }
        
        // Allow if either is a private network (LAN access)
        const isPrivateOrigin = isPrivateNetwork(originHostname);
        const isPrivateHost = isPrivateNetwork(hostHostname);
        
        if (isPrivateOrigin || isPrivateHost) {
          const response = NextResponse.next();
          setSecurityHeaders(response);
          return response;
        }
        
        // Block obvious cross-origin requests from public networks
        return NextResponse.json({ error: "CSRF protection: Invalid request origin." }, { status: 403 });
      } catch { 
        return NextResponse.json({ error: "CSRF protection: Malformed origin header." }, { status: 403 }); 
      }
    }
  }
  
  const response = NextResponse.next();
  setSecurityHeaders(response);
  return response;
}

function setSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), browsing-topics=(), attribution-reporting=(), unload=()");
  // Updated CSP to allow connections from any host (for LAN access)
  response.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self' data:; connect-src 'self' http: https: ws: wss:; frame-ancestors 'none'; form-action 'self'; base-uri 'self';");
}

function isPrivateNetwork(hostname: string): boolean {
  // Check for localhost
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  
  // Check for private IP ranges
  const parts = hostname.split(".");
  if (parts.length !== 4) return false;
  
  const first = parseInt(parts[0], 10);
  const second = parseInt(parts[1], 10);
  
  // 10.0.0.0 - 10.255.255.255
  if (first === 10) return true;
  
  // 172.16.0.0 - 172.31.255.255
  if (first === 172 && second >= 16 && second <= 31) return true;
  
  // 192.168.0.0 - 192.168.255.255
  if (first === 192 && second === 168) return true;
  
  return false;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
