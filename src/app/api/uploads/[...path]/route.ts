import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Serves uploaded files from the persistent UPLOAD_DIR (ProgramData in production,
// or public/uploads in development).  The /uploads/* URL is rewritten here by
// next.config.mjs so that standalone builds never try to read from .next/standalone.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;

    // Sanitise every segment – reject anything that would escape the uploads dir
    const clean = segments.map((s) => path.basename(s));
    if (clean.some((s) => s === "" || s === "." || s === "..")) {
      return new NextResponse("Not found", { status: 404 });
    }

    // In production the installer sets UPLOAD_DIR to
    //   C:\ProgramData\ResidentialMasterlist\uploads
    // In development it falls back to <project-root>/public/uploads
    const uploadsDir =
      process.env.UPLOAD_DIR ||
      path.join(process.cwd(), "public", "uploads");

    const filePath = path.join(/*turbopackIgnore: true*/ uploadsDir, ...clean);

    // Make sure the resolved path is still inside uploadsDir (path-traversal guard)
    const resolved = path.resolve(/*turbopackIgnore: true*/ filePath);
    const base = path.resolve(/*turbopackIgnore: true*/ uploadsDir);
    if (!resolved.startsWith(base + path.sep) && resolved !== base) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (!existsSync(resolved)) {
      return new NextResponse("Not found", { status: 404 });
    }

    const data = await readFile(resolved);

    // Derive Content-Type from extension
    const ext = path.extname(resolved).toLowerCase().slice(1);
    const mime: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      pdf: "application/pdf",
    };
    const contentType = mime[ext] ?? "application/octet-stream";

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Internal server error", { status: 500 });
  }
}
