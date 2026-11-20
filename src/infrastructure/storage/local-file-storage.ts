import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { FileStoragePort } from "@/application/ports";
import { ValidationError } from "@/domain/errors";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/;

export function getUploadDirectory(): string {
  const configured = process.env.UPLOAD_DIR?.trim();
  return configured
    ? path.resolve(configured)
    : path.resolve(process.cwd(), "uploads");
}

export class LocalFileStorage implements FileStoragePort {
  private readonly baseDir: string;

  constructor(baseDir = getUploadDirectory()) {
    this.baseDir = path.resolve(baseDir);
  }

  async saveImage(input: {
    buffer: Buffer;
    mimeType: string;
  }): Promise<string> {
    const ext = MIME_TO_EXT[input.mimeType];
    if (!ext) {
      throw new ValidationError("Format d'image non autorisé.");
    }

    await fs.mkdir(this.baseDir, { recursive: true });
    const filename = `${crypto.randomUUID()}.${ext}`;
    const targetPath = path.resolve(this.baseDir, filename);

    if (!targetPath.startsWith(this.baseDir + path.sep)) {
      throw new ValidationError("Chemin de stockage invalide.");
    }

    await fs.writeFile(targetPath, input.buffer);
    return `/api/uploads/${filename}`;
  }

  async readImage(filename: string): Promise<{
    buffer: Buffer;
    mimeType: string;
  } | null> {
    if (!SAFE_FILENAME_REGEX.test(filename)) {
      return null;
    }

    const resolvedPath = path.resolve(this.baseDir, filename);
    if (!resolvedPath.startsWith(this.baseDir + path.sep)) {
      return null;
    }

    try {
      const buffer = await fs.readFile(resolvedPath);
      const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
      return {
        buffer,
        mimeType: EXT_TO_MIME[ext] ?? "application/octet-stream",
      };
    } catch {
      return null;
    }
  }
}
