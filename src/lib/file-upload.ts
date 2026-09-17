import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface ImageValidationResult {
  valid: boolean;
  extension: string;
  error?: string;
}

/**
 * Validates the file buffer against standard image magic numbers / file signatures.
 * Supports JPEG, PNG, WebP, and GIF.
 */
export function validateImageBuffer(buffer: Buffer): ImageValidationResult {
  if (!buffer || buffer.length < 12) {
    return { valid: false, extension: "", error: "File buffer is too small or empty." };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, extension: "jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, extension: "png" };
  }

  // WebP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: true, extension: "webp" };
  }

  // GIF: GIF87a or GIF89a
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return { valid: true, extension: "gif" };
  }

  return {
    valid: false,
    extension: "",
    error: "Invalid file format. Only JPEG, PNG, WebP, and GIF images are allowed.",
  };
}

/**
 * Saves an uploaded file to disk with strict server-side validation:
 * 1. Validates file presence and non-zero size
 * 2. Enforces maximum 5MB size limit
 * 3. Verifies file header magic bytes (JPEG, PNG, WebP, GIF)
 * 4. Ensures directory exists
 * 5. Handles disk full (ENOSPC) and permission errors gracefully
 */
export async function saveUploadedFile(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;

  if (file.size > MAX_IMAGE_FILE_SIZE) {
    throw new Error("File exceeds the maximum allowed size of 5MB.");
  }

  const uploadsDir =
    process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");

  try {
    if (!existsSync(/*turbopackIgnore: true*/ uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }
  } catch (dirErr: any) {
    console.error("Failed to create upload directory:", dirErr);
    throw new Error("Server storage directory is unavailable.");
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Magic byte validation
  const validation = validateImageBuffer(buffer);
  if (!validation.valid) {
    throw new Error(validation.error || "Uploaded file is not a valid image format.");
  }

  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const baseNameWithoutExt = path
    .basename(file.name, path.extname(file.name))
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `${uniqueSuffix}-${baseNameWithoutExt}.${validation.extension}`;
  const filepath = path.join(uploadsDir, filename);

  try {
    await writeFile(filepath, buffer);
  } catch (err: any) {
    console.error("File write error:", err);
    if (err?.code === "ENOSPC") {
      throw new Error("Storage full: Not enough disk space to save the image.");
    }
    if (err?.code === "EACCES" || err?.code === "EPERM") {
      throw new Error("Storage permission error: Unable to write to upload folder.");
    }
    throw new Error(`Failed to save image: ${err?.message || "Storage error"}`);
  }

  return `/uploads/${filename}`;
}
