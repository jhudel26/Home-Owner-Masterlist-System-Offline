import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

/**
 * Saves an uploaded file to the uploads directory and returns the relative path.
 * This function works in both development and production environments.
 */
export async function saveUploadedFile(file: File): Promise<string> {
  const uploadsDir =
    process.env.UPLOAD_DIR ||
    path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads");

  // Ensure uploads directory exists
  if (!existsSync(/*turbopackIgnore: true*/ uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true });
  }

  // Generate unique filename with original extension
  const ext = path.extname(file.name);
  const uniqueFilename = `${randomUUID()}${ext}`;
  const filePath = path.join(/*turbopackIgnore: true*/ uploadsDir, uniqueFilename);

  // Convert File to Buffer and save
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await writeFile(filePath, buffer);

  // Return relative path for serving via /uploads/* route
  return `/uploads/${uniqueFilename}`;
}
