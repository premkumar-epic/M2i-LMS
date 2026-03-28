// backend/src/queues/contentProcessingWorker.ts
// Bull worker for content processing jobs (EXTRACT_AUDIO).
// Registered on startup via processors.ts.

import path from "path";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import { contentQueue } from "./queues";
import { prisma } from "../lib/prisma";
import { s3, audioKey } from "../lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { send as sendNotification } from "../services/notification.service";
import { logger } from "../lib/logger";

type ExtractAudioJobData = {
  jobName: "EXTRACT_AUDIO";
  contentId: string;
  batchId: string;
  uploadedBy: string;
  storageUrl: string;
  mimeType: string;
  tempAudioDir: string;
};

const S3_ENABLED =
  !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY;

contentQueue.process("EXTRACT_AUDIO", async (job) => {
  const data = job.data as ExtractAudioJobData;
  const { contentId, batchId, uploadedBy, storageUrl, tempAudioDir } = data;

  logger.info(`[EXTRACT_AUDIO] Starting job for content ${contentId}`);

  // Mark as PROCESSING
  await prisma.content.update({
    where: { id: contentId },
    data: { transcriptionStatus: "PROCESSING" },
  });

  if (!S3_ENABLED) {
    // Dev mode — no real S3. Reset status to PENDING so the content does not appear stuck.
    await prisma.content.update({
      where: { id: contentId },
      data: { transcriptionStatus: "PENDING" },
    });
    logger.warn(
      `[EXTRACT_AUDIO] S3 credentials not configured — skipping audio extraction for content ${contentId}. ` +
        "Transcription status reset to PENDING. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to enable the pipeline."
    );
    return;
  }

  const workDir = path.join(tempAudioDir, contentId);
  const inputExt = path.extname(new URL(storageUrl).pathname) || ".mp4";
  const inputPath = path.join(workDir, `input${inputExt}`);
  const outputPath = path.join(workDir, "audio.mp3");

  try {
    // 1. Download video from S3 to temp dir
    fs.mkdirSync(workDir, { recursive: true });
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const bucket = process.env.S3_BUCKET_NAME ?? "m2i-lms-content-dev";

    // Extract S3 key from storage URL
    const urlObj = new URL(storageUrl);
    const s3Key = urlObj.pathname.replace(/^\//, "");

    const s3Res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: s3Key }));
    const chunks: Buffer[] = [];
    for await (const chunk of s3Res.Body as AsyncIterable<Buffer>) {
      chunks.push(chunk);
    }
    fs.writeFileSync(inputPath, Buffer.concat(chunks));
    logger.info(`[EXTRACT_AUDIO] Downloaded video for content ${contentId}`);

    // 2. Extract audio with FFmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .noVideo()
        .audioCodec("libmp3lame")
        .audioBitrate("128k")
        .save(outputPath)
        .on("end", () => resolve())
        .on("error", (err: Error) => reject(err));
    });
    logger.info(`[EXTRACT_AUDIO] Audio extracted for content ${contentId}`);

    // 3. Upload audio MP3 to S3
    const audioS3Key = audioKey(contentId);
    const audioBuffer = fs.readFileSync(outputPath);
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: audioS3Key,
        Body: audioBuffer,
        ContentType: "audio/mpeg",
      })
    );
    logger.info(`[EXTRACT_AUDIO] Audio uploaded to S3 at ${audioS3Key}`);

    // 4. Enqueue TRANSCRIBE job (Week 3 — stub the enqueue, worker not implemented yet)
    await contentQueue.add(
      "TRANSCRIBE",
      { jobName: "TRANSCRIBE", contentId, batchId, uploadedBy, audioS3Key },
      { attempts: 3, backoff: { type: "exponential", delay: 30_000 }, removeOnComplete: 20, removeOnFail: 50 }
    );

    // 5. Notify the uploader
    await sendNotification(
      uploadedBy,
      "AUDIO_EXTRACTED",
      "Audio extraction complete",
      "Your video is now being transcribed. This may take a few minutes.",
      { content_id: contentId },
      `/mentor/content/${contentId}`
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[EXTRACT_AUDIO] Failed for content ${contentId}: ${msg}`, { err });

    await prisma.content.update({
      where: { id: contentId },
      data: { transcriptionStatus: "FAILED", transcriptionError: msg },
    });

    await sendNotification(
      uploadedBy,
      "AUDIO_EXTRACTION_FAILED",
      "Audio extraction failed",
      `We couldn't extract audio from your video. Error: ${msg}`,
      { content_id: contentId },
      `/mentor/content/${contentId}`
    );

    throw err; // Re-throw so Bull marks the job as failed and applies retry
  } finally {
    // Always clean up temp files
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch {
      // Non-fatal
    }
  }
});

logger.info("[Queues] EXTRACT_AUDIO worker registered");
