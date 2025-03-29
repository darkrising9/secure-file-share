import { NextResponse } from "next/server";
import { IncomingForm } from "formidable";
import fs from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { writeFile } from "fs";

// Initialize Prisma
const prisma = new PrismaClient();

// Set config to disable default body parser
export const config = {
  api: {
    bodyParser: false, // Disable automatic body parsing
  },
};

// Encryption Setup
const algorithm = "aes-256-cbc";
const secretKey = Buffer.from(process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex"), "hex"); // Ensure consistent key
const iv = crypto.randomBytes(16); // IV changes per file

async function encryptFile(filePath: string, destPath: string) {
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  const input = await fs.readFile(filePath);
  const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
  await fs.writeFile(destPath, encrypted);
}

// API Route to Handle File Upload
export async function POST(req: Request) {
  try {
    const form = new IncomingForm({
      uploadDir: "./public/uploads",
      keepExtensions: true,
      multiples: false,
    });

    const formParse = () =>
      new Promise<{ fields: any; files: any }>((resolve, reject) => {
        form.parse(req as any, (err, fields, files) => {
          if (err) reject(err);
          else resolve({ fields, files });
        });
      });

    const { fields, files } = await formParse();
    if (!files.file) {
      throw new Error("No file uploaded.");
    }

    const uploadedFile = files.file;
    const filePath = uploadedFile.filepath;
    const encryptedFilePath = `${filePath}.enc`;

    await encryptFile(filePath, encryptedFilePath);

    const savedFile = await prisma.file.create({
      data: {
        fileName: uploadedFile.originalFilename,
        filePath: encryptedFilePath,
        recipientEmail: fields.recipientEmail[0],
        encryptionKey: secretKey.toString("hex"), // Store key securely (use env in production)
        iv: iv.toString("hex"), // Store IV for decryption
        expiresAt: fields.expiresAt ? new Date(fields.expiresAt[0]) : null,
      },
    });

    await fs.unlink(filePath);

    return NextResponse.json({ success: true, fileId: savedFile.id });
  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ success: false, error: "Failed to upload and encrypt file" });
  }
}
