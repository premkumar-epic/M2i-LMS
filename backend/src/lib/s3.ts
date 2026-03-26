// backend/src/lib/s3.ts
// AWS S3 client singleton and utility helpers.
// All pre-signed URL generation and CDN URL building lives here.

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

const BUCKET = process.env.S3_BUCKET_NAME ?? "m2i-lms-content-dev";
const CDN_DOMAIN = process.env.CLOUDFRONT_DOMAIN ?? "";

// ─── URL builders ─────────────────────────────────────────────────────────────

/** Convert an S3 key to a CloudFront CDN URL. */
export const toCdnUrl = (key: string): string =>
  CDN_DOMAIN
    ? `https://${CDN_DOMAIN}/${key}`
    : `https://${BUCKET}.s3.amazonaws.com/${key}`;

/** Build a canonical S3 key for a content file. */
export const contentKey = (batchId: string, contentId: string, filename: string): string =>
  `content/${batchId}/${contentId}/${filename}`;

/** Build a canonical S3 key for a supplementary file. */
export const supplementaryKey = (batchId: string, contentId: string, fileId: string, filename: string): string =>
  `content/${batchId}/${contentId}/supplementary/${fileId}/${filename}`;

/** Build a canonical S3 key for extracted audio. */
export const audioKey = (contentId: string): string =>
  `audio/${contentId}/audio.mp3`;

// ─── Pre-signed URL generation ────────────────────────────────────────────────

/**
 * Generate a pre-signed PUT URL so the browser can upload directly to S3.
 * The key is always server-generated — never trust the client for this.
 *
 * @param key      - S3 object key (use the key builders above)
 * @param mimeType - Content-Type the client must send in the PUT request
 * @param expiresIn - Seconds until the URL expires (default: 5 minutes)
 */
export const generatePresignedUploadUrl = async (
  key: string,
  mimeType: string,
  expiresIn = 300
): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: mimeType,
  });
  return getSignedUrl(s3, command, { expiresIn });
};

/**
 * Delete an object from S3.
 * Used when soft-deleting content or removing supplementary files.
 */
export const deleteS3Object = async (key: string): Promise<void> => {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
};
