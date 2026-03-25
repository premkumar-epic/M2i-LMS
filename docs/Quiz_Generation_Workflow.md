# M2i_LMS — Quiz Generation Workflow Sub-Document
### Version 1.0 | March 2026 | Sub-Document 05 of 05
### Save As: Quiz_Generation/M2i_LMS_Quiz_Generation_Workflow.md

---

# Table of Contents

1.  [Overview](#1-overview)
2.  [Pipeline Architecture](#2-pipeline-architecture)
3.  [Stage 1 — Content Upload and Storage](#3-stage-1--content-upload-and-storage)
4.  [Stage 2 — Audio Extraction with FFmpeg](#4-stage-2--audio-extraction-with-ffmpeg)
5.  [Stage 3 — Transcription with Whisper](#5-stage-3--transcription-with-whisper)
6.  [Stage 4 — Concept Extraction with Mistral 7B](#6-stage-4--concept-extraction-with-mistral-7b)
7.  [Stage 5 — Question Generation with Mistral 7B](#7-stage-5--question-generation-with-mistral-7b)
8.  [Stage 6 — JSON Parsing and Validation](#8-stage-6--json-parsing-and-validation)
9.  [Stage 7 — Quiz Storage and Threshold Checking](#9-stage-7--quiz-storage-and-threshold-checking)
10. [Stage 8 — Mentor Review Interface Integration](#10-stage-8--mentor-review-interface-integration)
11. [Retention Quiz Generation](#11-retention-quiz-generation)
12. [Error Handling and Recovery](#12-error-handling-and-recovery)
13. [Full Worker Implementation](#13-full-worker-implementation)
14. [Prompt Library](#14-prompt-library)
15. [Quality Metrics and Monitoring](#15-quality-metrics-and-monitoring)
16. [Testing the Pipeline](#16-testing-the-pipeline)
17. [Performance Tuning](#17-performance-tuning)
18. [Troubleshooting Guide](#18-troubleshooting-guide)

---

# 1. Overview

## 1.1 What This Document Covers

This document is the complete technical specification for
the M2i_LMS AI-powered quiz generation pipeline. It covers
every stage from the moment a mentor uploads a video to the
moment a student sees approved quiz questions. It is written
for the developer implementing or maintaining the pipeline
and includes every prompt, every parsing strategy, every
error condition, and every configuration parameter.

## 1.2 Pipeline Summary

When a mentor uploads a video, the platform automatically:

1. Stores the video in AWS S3
2. Extracts audio from the video using FFmpeg
3. Transcribes the audio to text using Whisper
4. Extracts key concepts from the transcript using Mistral 7B
5. Generates 4-option multiple-choice questions for each concept
6. Parses and validates the JSON output
7. Stores approved questions with PENDING_REVIEW status
8. Notifies the mentor that questions are ready for review
9. Mentor reviews, edits, approves, or rejects questions
10. Questions become available to students once approved and
    the minimum threshold is met

The pipeline is entirely automated from steps 1-9 except for
the mentor review in step 9. No human intervention is required
for the happy path. The mentor reviews AI output, not raw
transcripts or manual quiz writing.

## 1.3 Design Goals

**Zero ongoing cost:** All AI processing runs on locally
hosted models. No per-token API fees. The only cost is the
EC2 instance running Ollama and Whisper.

**Sufficient quality for a review workflow:** The AI does not
need to produce perfect quizzes — the mentor review step
exists precisely because AI output is imperfect. The AI
needs to produce quizzes that are mostly good, with some
requiring edits and some requiring rejection. Target: 80%
of generated questions approved without editing.

**Resilience over speed:** The pipeline should recover from
partial failures. If concept extraction succeeds but question
generation fails for two concepts, those two concepts should
be retried without re-running transcription or re-extracting
all concepts. Intermediate results are persisted.

**Traceability:** Every generation decision is logged. When
a mentor rejects a question, the system knows which concept
it came from and which transcript excerpt it referenced.
This data feeds prompt improvement over time.

---

# 2. Pipeline Architecture

## 2.1 Full Pipeline Flow
```
Mentor completes video upload
    |
    v
POST /api/content (content record created)
    |
    v
contentQueue.add("EXTRACT_AUDIO", {
  content_id,
  s3_key,
  content_type: "VIDEO"
})
    |
    v
┌─────────────────────────────────────────────────────┐
│  STAGE 1: AUDIO EXTRACTION (FFmpeg)                 │
│                                                     │
│  Download video from S3                             │
│  → FFmpeg extracts audio as 16kHz mono MP3          │
│  → Upload audio back to S3 (temp storage)           │
│  → Update content.transcription_status = PROCESSING │
│                                                     │
│  On success: queue TRANSCRIBE job                   │
│  On failure: update status = FAILED, notify mentor  │
└─────────────────────────────────────────────────────┘
    |
    v
contentQueue.add("TRANSCRIBE", {
  content_id,
  audio_s3_key
})
    |
    v
┌─────────────────────────────────────────────────────┐
│  STAGE 2: TRANSCRIPTION (Whisper)                   │
│                                                     │
│  Download audio from S3                             │
│  → Run Whisper subprocess (medium model)            │
│  → Parse JSON output (text + segments)              │
│  → Store full transcript in content.transcript      │
│  → Update content.transcription_status = COMPLETE   │
│  → Delete temp audio files                         │
│                                                     │
│  On success: queue GENERATE_QUIZZES job             │
│  On failure: update status = FAILED, notify mentor  │
└─────────────────────────────────────────────────────┘
    |
    v
contentQueue.add("GENERATE_QUIZZES", {
  content_id,
  generation_run_id  // UUID for this run
})
    |
    v
┌─────────────────────────────────────────────────────┐
│  STAGE 3: CONCEPT EXTRACTION (Mistral 7B)           │
│                                                     │
│  Read transcript from database                      │
│  → Split into chunks if >3000 words                 │
│  → Call Ollama with concept extraction prompt       │
│  → Parse JSON array of concepts                     │
│  → Log to quiz_generation_logs                      │
│                                                     │
│  On success: proceed to question generation         │
│  On failure: retry up to 3x, then notify mentor     │
└─────────────────────────────────────────────────────┘
    |
    v
[For each concept (up to 8 concepts max)]
    |
    v
┌─────────────────────────────────────────────────────┐
│  STAGE 4: QUESTION GENERATION (Mistral 7B)          │
│                                                     │
│  For each concept:                                  │
│  → Build question generation prompt                 │
│  → Call Ollama with question + options + answer     │
│  → Parse JSON question object                       │
│  → Validate structure and content                   │
│  → Log to quiz_generation_logs                      │
│  → Store valid questions in quizzes table           │
│  → Retry up to 3x per concept on JSON parse failure │
│                                                     │
│  Total questions target:                            │
│  Quick Assessment: 8-15 questions                   │
│  Retention subset: 4-6 historical questions         │
└─────────────────────────────────────────────────────┘
    |
    v
┌─────────────────────────────────────────────────────┐
│  STAGE 5: THRESHOLD CHECK AND NOTIFICATION          │
│                                                     │
│  Count approved (PENDING_REVIEW) questions by type  │
│  → Check if ≥5 for Quick Assessment                 │
│  → Check if ≥8 for Retention (across all content)  │
│  → Update content.transcription_status = COMPLETE   │
│  → Notify batch mentors: QUIZZES_READY_FOR_REVIEW   │
└─────────────────────────────────────────────────────┘
    |
    v
[Mentor reviews questions — Feature 05]
    |
    v
[Students take quizzes — Feature 07]
```

## 2.2 Queue Job Chain
```typescript
// Jobs flow through contentQueue in sequence
// Each job queues the next on success

"EXTRACT_AUDIO"
    → on success: queues "TRANSCRIBE"
    → on failure: marks content FAILED, sends notification

"TRANSCRIBE"
    → on success: queues "GENERATE_QUIZZES"
    → on failure: marks content FAILED, sends notification

"GENERATE_QUIZZES"
    → runs concept extraction and question generation
    → on completion: sends QUIZZES_READY_FOR_REVIEW notification
    → on failure: sends QUIZ_GENERATION_FAILED notification
```

## 2.3 State Machine
```
Content status transitions during pipeline:

PENDING
  ↓ (audio extraction starts)
PROCESSING
  ↓ (transcription completes)
COMPLETE (transcript stored)
  ↓ (quiz generation starts — status stays COMPLETE)
COMPLETE (quizzes stored as PENDING_REVIEW)

Failed paths:
PROCESSING → FAILED (audio extraction error)
PROCESSING → FAILED (transcription error)
COMPLETE   → stays COMPLETE (quiz gen failure is non-blocking)

Quiz generation failure is non-blocking because the transcript
is already stored. The mentor can manually trigger regeneration
from a valid transcript. Transcription failure is blocking
because there is nothing to generate from.
```

---

# 3. Stage 1 — Content Upload and Storage

## 3.1 Upload Trigger

The pipeline starts when the frontend notifies the backend
that an S3 upload has completed. This happens in the
`POST /api/content` endpoint after the mentor's browser
has uploaded the file directly to S3.
```typescript
// controllers/content.controller.ts (excerpt)
async createContent(req: AuthenticatedRequest, res: Response) {
  const {
    content_id,
    s3_key,
    title,
    content_type,
    batch_id,
    mime_type,
    file_size_bytes,
  } = req.body;

  // Create content record
  const content = await prisma.content.create({
    data: {
      id: content_id,
      batchId: batch_id,
      uploadedBy: req.user!.user_id,
      title,
      contentType: content_type as ContentType,
      storageUrl: s3_key,
      cdnUrl: buildCdnUrl(s3_key),
      mimeType: mime_type,
      fileSizeBytes: file_size_bytes,
      transcriptionStatus:
        content_type === "VIDEO" ? "PENDING" : "NOT_REQUIRED",
    },
  });

  // Only queue pipeline for video content
  if (content_type === "VIDEO") {
    await contentQueue.add(
      "EXTRACT_AUDIO",
      {
        content_id: content.id,
        s3_key,
        batch_id,
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 30000 },
        priority: 1,
      }
    );
  }

  return res.status(201).json({
    success: true,
    data: {
      content_id: content.id,
      title: content.title,
      transcription_status: content.transcriptionStatus,
    },
    message:
      content_type === "VIDEO"
        ? "Content created. Transcription queued."
        : "Content created.",
  });
}
```

## 3.2 S3 Key Convention
```
Videos      : video/{batch_id}/{content_id}/{timestamp}-{sanitized_filename}.mp4
Audio (temp): audio/temp/{content_id}/{timestamp}.mp3
Documents   : files/{batch_id}/{content_id}/{timestamp}-{sanitized_filename}.pdf
```

Temp audio files under `audio/temp/` are deleted after
transcription completes. An S3 lifecycle rule also deletes
anything under `audio/temp/` after 24 hours as a safety net.

---

# 4. Stage 2 — Audio Extraction with FFmpeg

## 4.1 Why Audio Extraction Is Needed

Whisper accepts audio input, not video. Extracting audio
from video before passing to Whisper also dramatically
reduces file size — a 200MB MP4 video produces a ~20MB
MP3 audio file. Smaller files mean faster S3 transfers
and less disk I/O during transcription.

## 4.2 FFmpeg Configuration

The audio is extracted at 16kHz, mono channel, using MP3
encoding. These settings are optimal for Whisper:
- 16kHz sample rate is Whisper's native sample rate
- Mono reduces file size without losing speech content
- MP3 at quality 9 (lowest) is sufficient for speech recognition
```typescript
// workers/transcription.worker.ts (audio extraction portion)
import { spawn } from "child_process";
import { S3Client, GetObjectCommand,
         PutObjectCommand } from "@aws-sdk/client-s3";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

const extractAudio = (
  videoPath: string,
  audioPath: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const args = [
      "-i", videoPath,
      "-vn",              // Disable video stream
      "-acodec", "libmp3lame",
      "-ar", "16000",     // 16kHz sample rate
      "-ac", "1",         // Mono
      "-q:a", "9",        // Lowest quality VBR (sufficient for speech)
      "-af", "aresample=16000,aformat=fltp", // Resample to float
      "-y",               // Overwrite output without asking
      audioPath,
    ];

    console.log(
      `[FFmpeg] Extracting audio: ${videoPath} → ${audioPath}`
    );

    const ffmpegProcess = spawn("ffmpeg", args, {
      stdio: ["ignore", "ignore", "pipe"],
    });

    let stderrBuffer = "";

    ffmpegProcess.stderr?.on("data", (data: Buffer) => {
      stderrBuffer += data.toString();
    });

    ffmpegProcess.on("error", (err) => {
      reject(
        new Error(`FFmpeg process error: ${err.message}`)
      );
    });

    ffmpegProcess.on("close", (code) => {
      if (code === 0) {
        console.log(`[FFmpeg] Audio extracted successfully`);
        resolve();
      } else {
        console.error(`[FFmpeg] Failed with code ${code}`);
        reject(
          new Error(
            `FFmpeg exited with code ${code}. ` +
            `stderr: ${stderrBuffer.slice(-500)}`
          )
        );
      }
    });
  });
};
```

## 4.3 S3 Download and Upload
```typescript
// Download video from S3 to temp directory
const downloadFromS3 = async (
  s3Key: string,
  localPath: string
): Promise<void> => {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: s3Key,
  });

  const response = await s3Client.send(command);
  const bodyStream = response.Body as NodeJS.ReadableStream;

  const fileHandle = await fs.open(localPath, "w");
  const writeStream = fileHandle.createWriteStream();

  await new Promise<void>((resolve, reject) => {
    bodyStream.pipe(writeStream);
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });

  await fileHandle.close();
};

// Upload audio to S3 temp location
const uploadAudioToS3 = async (
  audioPath: string,
  contentId: string
): Promise<string> => {
  const audioBuffer = await fs.readFile(audioPath);
  const s3Key = `audio/temp/${contentId}/${Date.now()}.mp3`;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: s3Key,
    Body: audioBuffer,
    ContentType: "audio/mpeg",
  });

  await s3Client.send(command);
  return s3Key;
};
```

## 4.4 Extract Audio Worker
```typescript
// Full EXTRACT_AUDIO job handler
export const processExtractAudioJob = async (
  job: Job
): Promise<void> => {
  const { content_id, s3_key } = job.data;
  const tempDir = os.tmpdir();
  const videoPath = path.join(
    tempDir,
    `m2i_video_${content_id}.mp4`
  );
  const audioPath = path.join(
    tempDir,
    `m2i_audio_${content_id}.mp3`
  );

  console.log(
    `[ExtractAudio] Starting for content ${content_id}`
  );

  try {
    // Update status to PROCESSING
    await prisma.content.update({
      where: { id: content_id },
      data: { transcriptionStatus: "PROCESSING" },
    });

    // Download video
    console.log(`[ExtractAudio] Downloading video from S3...`);
    await downloadFromS3(s3_key, videoPath);

    // Get file size for logging
    const videoStat = await fs.stat(videoPath);
    console.log(
      `[ExtractAudio] Video size: ` +
      `${Math.round(videoStat.size / 1024 / 1024)}MB`
    );

    // Extract audio
    await extractAudio(videoPath, audioPath);

    // Get audio size for logging
    const audioStat = await fs.stat(audioPath);
    console.log(
      `[ExtractAudio] Audio size: ` +
      `${Math.round(audioStat.size / 1024)}KB`
    );

    // Upload audio to S3
    const audioS3Key = await uploadAudioToS3(
      audioPath,
      content_id
    );

    console.log(
      `[ExtractAudio] Audio uploaded to S3: ${audioS3Key}`
    );

    // Queue transcription job
    await contentQueue.add(
      "TRANSCRIBE",
      {
        content_id,
        audio_s3_key: audioS3Key,
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 60000 },
        priority: 1,
      }
    );

    console.log(
      `[ExtractAudio] Transcription job queued for ` +
      `content ${content_id}`
    );

  } catch (error: any) {
    console.error(
      `[ExtractAudio] Failed for content ${content_id}: ` +
      `${error.message}`
    );

    // Mark as failed
    await prisma.content.update({
      where: { id: content_id },
      data: {
        transcriptionStatus: "FAILED",
        transcriptionError: error.message,
      },
    });

    // Notify mentors
    const content = await prisma.content.findUnique({
      where: { id: content_id },
      select: { batchId: true, title: true },
    });

    if (content) {
      await notificationService.sendToBatchMentors(
        content.batchId,
        {
          type: "TRANSCRIPTION_FAILED",
          title: "Audio Extraction Failed",
          message: `Audio extraction failed for "${content.title}".
                   Please delete and re-upload the video.`,
          metadata: {
            content_id,
            error: error.message,
          },
          action_url: `/mentor/content/${content_id}`,
        }
      );
    }

    throw error; // Re-throw for Bull retry logic

  } finally {
    // Always clean up temp files
    await Promise.allSettled([
      fs.unlink(videoPath).catch(() => {}),
      fs.unlink(audioPath).catch(() => {}),
    ]);
  }
};
```

---

# 5. Stage 3 — Transcription with Whisper

## 5.1 Whisper Model Selection
```
Model    | Size    | VRAM   | Speed (GPU) | Accuracy
---------|---------|--------|-------------|----------
tiny     | 75M     | ~1GB   | ~32x RT     | Low
base     | 74M     | ~1GB   | ~16x RT     | Low-Medium
small    | 244M    | ~2GB   | ~6x RT      | Medium
medium   | 769M    | ~5GB   | ~2x RT      | High
large    | 1550M   | ~10GB  | ~1x RT      | Very High
large-v2 | 1550M   | ~10GB  | ~1x RT      | Best

RT = Realtime (1x = processes in same time as audio duration)
```

**Chosen model: medium**

The medium model hits the ideal accuracy/speed trade-off for
lecture transcription. Large-v2 produces marginally better
transcripts but requires double the VRAM and takes twice as
long. For technical lecture content in English, medium already
achieves >95% word accuracy on clear audio.

**When to use large:** If transcription quality is consistently
poor for a specific instructor's accent or speaking style,
upgrade that batch to large model by setting a
`WHISPER_MODEL=large` environment variable.

## 5.2 Transcription Worker
```typescript
// workers/transcription.worker.ts (TRANSCRIBE job handler)
import { spawn } from "child_process";
import path from "path";
import os from "os";
import { promises as fs } from "fs";

type WhisperOutput = {
  text: string;
  segments: Array<{
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
  }>;
  language: string;
};

const runWhisper = (
  audioPath: string,
  outputDir: string
): Promise<WhisperOutput> => {
  return new Promise((resolve, reject) => {
    const model = process.env.WHISPER_MODEL ?? "medium";
    const language = process.env.WHISPER_LANGUAGE ?? "en";

    const args = [
      "-m", "whisper",
      audioPath,
      "--model", model,
      "--language", language,
      "--output_format", "json",
      "--output_dir", outputDir,
      "--verbose", "False",
      "--word_timestamps", "True",
      "--condition_on_previous_text", "True",
      "--compression_ratio_threshold", "2.4",
      "--logprob_threshold", "-1.0",
      "--no_speech_threshold", "0.6",
      "--temperature", "0",
      "--fp16", process.env.WHISPER_FP16 ?? "False",
    ];

    console.log(
      `[Whisper] Starting transcription with ` +
      `model=${model}, language=${language}`
    );

    const startTime = Date.now();

    const whisperProcess = spawn("python3", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    whisperProcess.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    whisperProcess.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
      // Log progress lines from Whisper
      const line = data.toString().trim();
      if (line && !line.startsWith("[")) {
        console.log(`[Whisper] ${line}`);
      }
    });

    whisperProcess.on("error", (err) => {
      reject(new Error(`Whisper process error: ${err.message}`));
    });

    whisperProcess.on("close", async (code) => {
      const durationMs = Date.now() - startTime;
      console.log(
        `[Whisper] Completed in ${Math.round(durationMs / 1000)}s ` +
        `(exit code: ${code})`
      );

      if (code !== 0) {
        reject(
          new Error(
            `Whisper exited with code ${code}. ` +
            `stderr: ${stderr.slice(-1000)}`
          )
        );
        return;
      }

      try {
        const baseName = path.basename(audioPath, ".mp3");
        const jsonPath = path.join(outputDir, `${baseName}.json`);
        const raw = await fs.readFile(jsonPath, "utf-8");
        const result = JSON.parse(raw) as WhisperOutput;

        console.log(
          `[Whisper] Transcript length: ` +
          `${result.text.split(" ").length} words`
        );

        resolve(result);
      } catch (err: any) {
        reject(
          new Error(`Failed to read Whisper output: ${err.message}`)
        );
      }
    });
  });
};

export const processTranscribeJob = async (
  job: Job
): Promise<void> => {
  const { content_id, audio_s3_key } = job.data;
  const tempDir = os.tmpdir();
  const audioPath = path.join(
    tempDir,
    `m2i_audio_${content_id}.mp3`
  );
  const outputDir = path.join(tempDir, `m2i_whisper_${content_id}`);

  console.log(
    `[Transcription] Starting for content ${content_id}`
  );

  try {
    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    // Download audio from S3
    await downloadFromS3(audio_s3_key, audioPath);

    // Run Whisper
    const whisperResult = await runWhisper(audioPath, outputDir);

    // Clean and format transcript
    const cleanTranscript = cleanWhisperTranscript(
      whisperResult.text
    );

    // Store transcript in database
    await prisma.content.update({
      where: { id: content_id },
      data: {
        transcript: cleanTranscript,
        transcriptionStatus: "COMPLETE",
      },
    });

    console.log(
      `[Transcription] Transcript stored for content ${content_id}`
    );

    // Delete temp audio from S3 (no longer needed)
    await deleteFromS3(audio_s3_key);

    // Get content details for notification
    const content = await prisma.content.findUnique({
      where: { id: content_id },
      select: { title: true, batchId: true },
    });

    // Notify mentors that transcription is complete
    if (content) {
      await notificationService.sendToBatchMentors(
        content.batchId,
        {
          type: "TRANSCRIPTION_COMPLETE",
          title: "Transcription Complete",
          message: `Transcription complete for "${content.title}".
                   Quiz generation has started.`,
          metadata: { content_id },
          action_url: `/mentor/content/${content_id}`,
        }
      );
    }

    // Queue quiz generation
    const generationRunId = uuidv4();

    await contentQueue.add(
      "GENERATE_QUIZZES",
      {
        content_id,
        generation_run_id: generationRunId,
      },
      {
        attempts: 2,
        backoff: { type: "fixed", delay: 30000 },
        priority: 2,
      }
    );

  } catch (error: any) {
    console.error(
      `[Transcription] Failed for content ${content_id}: ` +
      `${error.message}`
    );

    await prisma.content.update({
      where: { id: content_id },
      data: {
        transcriptionStatus: "FAILED",
        transcriptionError: error.message.slice(0, 500),
      },
    });

    const content = await prisma.content.findUnique({
      where: { id: content_id },
      select: { batchId: true, title: true },
    });

    if (content) {
      await notificationService.sendToBatchMentors(
        content.batchId,
        {
          type: "TRANSCRIPTION_FAILED",
          title: "Transcription Failed",
          message: `Transcription failed for "${content.title}".
                   Please re-upload or contact support.`,
          metadata: { content_id, error: error.message },
        }
      );
    }

    throw error;

  } finally {
    await Promise.allSettled([
      fs.unlink(audioPath).catch(() => {}),
      fs.rm(outputDir, { recursive: true, force: true }).catch(() => {}),
    ]);
  }
};

// Clean up Whisper output artifacts
const cleanWhisperTranscript = (raw: string): string => {
  return raw
    .trim()
    // Remove multiple consecutive spaces
    .replace(/\s+/g, " ")
    // Remove repeated punctuation
    .replace(/([.!?])\1+/g, "$1")
    // Fix space before punctuation
    .replace(/\s([,.!?;:])/g, "$1")
    // Normalize line breaks
    .replace(/\n{3,}/g, "\n\n");
};
```

---

# 6. Stage 4 — Concept Extraction with Mistral 7B

## 6.1 Why a Separate Concept Extraction Stage

Rather than asking the model to generate quiz questions
directly from a raw transcript, the pipeline uses a
two-stage approach: first extract the key teaching concepts
from the transcript, then generate questions for each concept.

**Benefits of two-stage approach:**

1. **Better question distribution:** Direct generation from
   a transcript often produces 5 questions about the first
   topic and 1 about the last. Explicit concept extraction
   ensures balanced coverage across the lecture.

2. **Smaller prompts:** A 45-minute lecture transcript is
   ~5,000 words. Sending this in a single prompt exceeds
   Mistral 7B's context window and produces poor results.
   Concept extraction produces a short list; question
   generation uses small targeted prompts.

3. **Easier debugging:** When a question is factually wrong,
   the concept extraction log shows which concept it came
   from and which transcript excerpt was referenced. This
   makes it easy to identify whether the transcript was
   wrong or the generation was wrong.

4. **Retry granularity:** If question generation fails for
   concept 3, only concept 3 is retried — not the entire
   pipeline.

## 6.2 Transcript Chunking

Transcripts longer than 3,000 words are split into overlapping
chunks before concept extraction. Each chunk represents roughly
10-15 minutes of lecture content.
```typescript
const chunkTranscript = (
  transcript: string,
  maxWordsPerChunk: number = 3000,
  overlapWords: number = 200
): string[] => {
  const words = transcript.split(/\s+/);

  if (words.length <= maxWordsPerChunk) {
    return [transcript];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + maxWordsPerChunk, words.length);
    const chunk = words.slice(start, end).join(" ");
    chunks.push(chunk);

    if (end >= words.length) break;

    // Move forward with overlap for context continuity
    start = end - overlapWords;
  }

  console.log(
    `[ChunkTranscript] Split into ${chunks.length} chunks ` +
    `(${words.length} total words)`
  );

  return chunks;
};
```

## 6.3 Concept Extraction Prompt

This is the exact prompt used for concept extraction.
The prompt is designed to produce clean, parseable JSON
with minimal instructions that the model might confuse
for content.
```typescript
const buildConceptExtractionPrompt = (
  transcriptChunk: string,
  contentTitle: string,
  learningObjectives?: string
): string => {
  const objectivesSection = learningObjectives
    ? `\nLearning objectives provided by the instructor:
${learningObjectives}\n`
    : "";

  return `You are an expert educator analyzing a lecture transcript to identify key teachable concepts that students should understand and be tested on.

LECTURE TITLE: ${contentTitle}
${objectivesSection}
TRANSCRIPT:
${transcriptChunk}

TASK: Extract the 4 to 8 most important concepts from this transcript that are worth testing students on. Focus on concepts that are:
- Clearly explained in the transcript
- Important for understanding the subject
- Testable with a 4-option multiple choice question
- Distinct from each other (not overlapping)

For each concept, identify:
1. A short concept name (2-6 words)
2. A one-sentence explanation of the concept
3. The most relevant transcript excerpt (15-40 words) that best explains this concept

Respond with ONLY a valid JSON array. No explanation, no markdown, no code blocks. Only JSON.

Format:
[
  {
    "concept": "Name of the concept",
    "explanation": "One sentence explaining what this concept is",
    "transcript_excerpt": "The exact words from the transcript that best explain this concept"
  }
]`;
};
```

## 6.4 Concept Extraction Implementation
```typescript
const extractConcepts = async (
  transcript: string,
  contentTitle: string,
  learningObjectives: string | null,
  generationRunId: string,
  contentId: string
): Promise<ConceptResult[]> => {

  const chunks = chunkTranscript(transcript);
  const allConcepts: ConceptResult[] = [];

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    const prompt = buildConceptExtractionPrompt(
      chunk,
      contentTitle,
      learningObjectives ?? undefined
    );

    console.log(
      `[ConceptExtraction] Processing chunk ` +
      `${chunkIndex + 1}/${chunks.length}...`
    );

    const startTime = Date.now();
    let rawResponse = "";
    let success = false;
    let errorMessage: string | null = null;
    let conceptsExtracted = 0;

    try {
      rawResponse = await generateWithOllama(prompt, 1024);
      const concepts = parseJsonFromResponse<ConceptResult[]>(
        rawResponse
      );

      // Validate the array structure
      const validConcepts = concepts.filter(
        (c) =>
          typeof c.concept === "string" &&
          c.concept.length > 0 &&
          typeof c.explanation === "string" &&
          c.explanation.length > 0 &&
          typeof c.transcript_excerpt === "string" &&
          c.transcript_excerpt.length > 0
      );

      conceptsExtracted = validConcepts.length;
      allConcepts.push(...validConcepts);
      success = true;

      console.log(
        `[ConceptExtraction] Chunk ${chunkIndex + 1}: ` +
        `extracted ${validConcepts.length} concepts`
      );

    } catch (err: any) {
      errorMessage = err.message;
      console.error(
        `[ConceptExtraction] Chunk ${chunkIndex + 1} failed: ` +
        `${err.message}`
      );
    }

    // Log this stage
    await prisma.quizGenerationLog.create({
      data: {
        contentId,
        generationRunId,
        stage: `CONCEPT_EXTRACTION_CHUNK_${chunkIndex + 1}`,
        modelUsed: process.env.OLLAMA_MODEL!,
        durationMs: Date.now() - startTime,
        success,
        errorMessage,
        conceptsExtracted,
        promptTokens: Math.round(prompt.split(/\s+/).length * 1.3),
        completionTokens: rawResponse
          ? Math.round(rawResponse.split(/\s+/).length * 1.3)
          : null,
      },
    });
  }

  // Deduplicate concepts across chunks
  const deduplicated = deduplicateConcepts(allConcepts);

  // Limit to 8 concepts maximum
  const limited = deduplicated.slice(0, 8);

  console.log(
    `[ConceptExtraction] Final: ${limited.length} unique concepts ` +
    `(from ${allConcepts.length} across ${chunks.length} chunks)`
  );

  return limited;
};

// Remove near-duplicate concepts
const deduplicateConcepts = (
  concepts: ConceptResult[]
): ConceptResult[] => {
  const seen = new Set<string>();
  return concepts.filter((c) => {
    const normalized = c.concept.toLowerCase().trim();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
};
```

---

# 7. Stage 5 — Question Generation with Mistral 7B

## 7.1 Cognitive Level Distribution

Each content item generates questions across four cognitive
levels following a modified Bloom's taxonomy:
```
Quick Assessment distribution (8-15 questions):
  RECALL         40% — What is X? What does Y mean?
  COMPREHENSION  40% — Why does X work this way?
                       What would happen if Y?
  APPLICATION    20% — Given this code, what does it do?
                       Which approach would you use?

Retention Quiz distribution (10-20 questions):
  RECALL         30% — Test memory of past content
  COMPREHENSION  40% — Explain relationships
  APPLICATION    20% — Apply to new scenarios
  ANALYSIS       10% — Compare approaches, identify issues
```

## 7.2 Question Generation Prompt

This is the exact prompt used for each question. The prompt
instructs the model to generate exactly one question per call,
which produces higher quality and more reliable JSON than
asking for multiple questions at once.
```typescript
const buildQuestionGenerationPrompt = (
  concept: ConceptResult,
  cognitiveLevel: CognitiveLevel,
  difficulty: Difficulty,
  contentTitle: string,
  alreadyUsedConcepts: string[]
): string => {

  const avoidSection =
    alreadyUsedConcepts.length > 0
      ? `\nIMPORTANT: Do NOT generate a question about these
concepts that have already been covered: ${alreadyUsedConcepts.join(", ")}\n`
      : "";

  const levelInstructions: Record<CognitiveLevel, string> = {
    RECALL: `The question should test RECALL — asking the student to remember a specific fact, definition, or term directly stated in the transcript. The correct answer should be findable by a student who watched the lecture carefully.`,

    COMPREHENSION: `The question should test COMPREHENSION — asking the student to explain, interpret, or describe the concept in their own words. The student should need to understand the concept, not just remember a phrase.`,

    APPLICATION: `The question should test APPLICATION — asking the student to apply the concept to a new situation, choose the right tool for a job, or predict what would happen in a given scenario. The student should need to use their understanding, not just recall facts.`,

    ANALYSIS: `The question should test ANALYSIS — asking the student to compare approaches, identify trade-offs, diagnose a problem, or evaluate which solution is better and why. The student should need to break down and examine the concept deeply.`,
  };

  const difficultyInstructions: Record<Difficulty, string> = {
    EASY: "The question should be straightforward and unambiguous. A student who watched the lecture should answer correctly without difficulty.",
    MEDIUM: "The question should require genuine understanding. Plausible but incorrect distractors should make a student who only half-paid attention likely to get it wrong.",
    HARD: "The question should require deep understanding. All four options should seem plausible to a student without solid knowledge. Only a student who truly understood the concept should reliably answer correctly.",
  };

  return `You are writing a multiple choice question for a software development course.

LECTURE: ${contentTitle}

CONCEPT TO TEST: ${concept.concept}
CONCEPT EXPLANATION: ${concept.explanation}
RELEVANT TRANSCRIPT EXCERPT: "${concept.transcript_excerpt}"

COGNITIVE LEVEL: ${cognitiveLevel}
${levelInstructions[cognitiveLevel]}

DIFFICULTY: ${difficulty}
${difficultyInstructions[difficulty]}
${avoidSection}

REQUIREMENTS FOR THE QUESTION:
- Exactly 4 answer options labeled implicitly as options 0, 1, 2, 3
- Exactly 1 correct answer
- 3 plausible but clearly incorrect distractors
- Options should be similar in length and style
- Do not use "All of the above" or "None of the above"
- Do not make the correct answer obviously longer than the others
- The question should be self-contained (student should not need to see the transcript)

REQUIREMENTS FOR THE EXPLANATION:
- 1-3 sentences explaining WHY the correct answer is correct
- Mention why the most tempting wrong answer is incorrect
- Reference the concept, not the specific transcript wording

Respond with ONLY a valid JSON object. No explanation, no markdown, no code blocks. Only JSON.

Format:
{
  "question": "The full question text ending with a question mark?",
  "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
  "correct_option_index": 0,
  "explanation": "Explanation of why the correct answer is correct and why common wrong answers are wrong.",
  "cognitive_level": "${cognitiveLevel}",
  "difficulty": "${difficulty}"
}`;
};
```

## 7.3 Question Generation Loop
```typescript
type GeneratedQuestion = {
  question: string;
  options: string[];
  correct_option_index: number;
  explanation: string;
  cognitive_level: string;
  difficulty: string;
};

const generateQuestionsForContent = async (
  content: ContentWithDetails,
  concepts: ConceptResult[],
  generationRunId: string
): Promise<GeneratedQuestion[]> => {

  const questions: GeneratedQuestion[] = [];
  const usedConcepts: string[] = [];

  // Define question distribution
  const distribution = buildQuestionDistribution(
    concepts.length
  );

  console.log(
    `[QuizGeneration] Generating questions for ` +
    `${concepts.length} concepts`
  );
  console.log(
    `[QuizGeneration] Distribution: ` +
    `${JSON.stringify(distribution)}`
  );

  let questionIndex = 0;

  for (const concept of concepts) {
    const targetLevel = distribution[questionIndex]?.level
      ?? "RECALL";
    const targetDifficulty = distribution[questionIndex]?.difficulty
      ?? "MEDIUM";

    questionIndex++;

    let succeeded = false;

    // Retry up to 3 times per concept
    for (let attempt = 1; attempt <= 3; attempt++) {
      const prompt = buildQuestionGenerationPrompt(
        concept,
        targetLevel as CognitiveLevel,
        targetDifficulty as Difficulty,
        content.title,
        usedConcepts
      );

      const startTime = Date.now();
      let rawResponse = "";
      let errorMessage: string | null = null;

      try {
        rawResponse = await generateWithOllama(prompt, 512);
        const parsed = parseJsonFromResponse<GeneratedQuestion>(
          rawResponse
        );

        // Validate the generated question
        const validation = validateGeneratedQuestion(parsed);

        if (!validation.valid) {
          throw new Error(
            `Invalid question structure: ${validation.reason}`
          );
        }

        questions.push(parsed);
        usedConcepts.push(concept.concept);
        succeeded = true;

        console.log(
          `[QuizGeneration] Question ${questions.length}: ` +
          `${targetLevel}/${targetDifficulty} — ` +
          `"${parsed.question.slice(0, 60)}..."`
        );

        // Log success
        await prisma.quizGenerationLog.create({
          data: {
            contentId: content.id,
            generationRunId,
            stage: `QUESTION_GENERATION_${questionIndex}`,
            modelUsed: process.env.OLLAMA_MODEL!,
            durationMs: Date.now() - startTime,
            success: true,
            questionsGenerated: 1,
          },
        });

        break; // Exit retry loop on success

      } catch (err: any) {
        errorMessage = err.message;
        console.warn(
          `[QuizGeneration] Concept "${concept.concept}" ` +
          `attempt ${attempt}/3 failed: ${err.message}`
        );

        // Log failure
        await prisma.quizGenerationLog.create({
          data: {
            contentId: content.id,
            generationRunId,
            stage: `QUESTION_GENERATION_${questionIndex}_ATTEMPT_${attempt}`,
            modelUsed: process.env.OLLAMA_MODEL!,
            durationMs: Date.now() - startTime,
            success: false,
            errorMessage: err.message.slice(0, 500),
          },
        });

        if (attempt === 3) {
          console.error(
            `[QuizGeneration] Skipping concept ` +
            `"${concept.concept}" after 3 failures`
          );
        } else {
          // Short wait before retry
          await sleep(2000);
        }
      }
    }
  }

  console.log(
    `[QuizGeneration] Generated ${questions.length} questions ` +
    `from ${concepts.length} concepts`
  );

  return questions;
};

// Build the cognitive level and difficulty distribution
const buildQuestionDistribution = (
  conceptCount: number
): Array<{ level: string; difficulty: string }> => {
  const distribution = [];
  const total = conceptCount;

  const recallCount = Math.round(total * 0.4);
  const comprehensionCount = Math.round(total * 0.4);
  const applicationCount = total - recallCount - comprehensionCount;

  for (let i = 0; i < recallCount; i++) {
    distribution.push({
      level: "RECALL",
      difficulty: i < Math.floor(recallCount / 2) ? "EASY" : "MEDIUM",
    });
  }

  for (let i = 0; i < comprehensionCount; i++) {
    distribution.push({
      level: "COMPREHENSION",
      difficulty: "MEDIUM",
    });
  }

  for (let i = 0; i < applicationCount; i++) {
    distribution.push({
      level: "APPLICATION",
      difficulty: i === 0 ? "MEDIUM" : "HARD",
    });
  }

  // Shuffle to avoid all easy questions first
  return shuffleArray(distribution);
};

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const shuffleArray = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
```

---

# 8. Stage 6 — JSON Parsing and Validation

## 8.1 The JSON Parsing Problem

Getting language models to produce valid JSON reliably
is harder than it should be. Mistral 7B sometimes:
- Wraps the JSON in markdown code fences (```json ... ```)
- Adds explanatory text before or after the JSON
- Produces JSON with trailing commas (invalid JSON)
- Truncates the JSON if it reaches the token limit
- Uses single quotes instead of double quotes

The `parseJsonFromResponse` function handles all of these cases.

## 8.2 JSON Parser Implementation
```typescript
// utils/jsonParser.utils.ts

export const parseJsonFromResponse = <T>(
  rawResponse: string
): T => {
  if (!rawResponse || rawResponse.trim().length === 0) {
    throw new Error("Empty response from model");
  }

  let cleaned = rawResponse.trim();

  // Strategy 1: Remove markdown code fences
  // Handles: ```json\n{...}\n```  or  ```\n{...}\n```
  cleaned = cleaned.replace(
    /^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/,
    "$1"
  ).trim();

  // Strategy 2: Extract JSON from response with surrounding text
  // Find the first { or [ and the last } or ]
  const firstBrace = cleaned.search(/[{[]/);
  const lastBrace = Math.max(
    cleaned.lastIndexOf("}"),
    cleaned.lastIndexOf("]")
  );

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  // Strategy 3: Fix common JSON errors

  // Fix trailing commas before } or ]
  cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");

  // Fix single-quoted strings → double-quoted
  // (only works for simple cases without apostrophes in values)
  // Use cautiously — only if standard parsing fails
  let parseResult: T;

  try {
    parseResult = JSON.parse(cleaned) as T;
  } catch (firstError) {
    // Try fixing single quotes
    try {
      const singleQuoteFixed = cleaned.replace(
        /'/g,
        '"'
      );
      parseResult = JSON.parse(singleQuoteFixed) as T;
    } catch {
      // Try removing control characters
      try {
        const controlCharsRemoved = cleaned.replace(
          /[\x00-\x1F\x7F]/g,
          (char) =>
            char === "\n" || char === "\t" ? char : ""
        );
        parseResult = JSON.parse(controlCharsRemoved) as T;
      } catch {
        throw new Error(
          `JSON parse failed after all strategies. ` +
          `Raw response (first 300 chars): ` +
          `${rawResponse.slice(0, 300)}`
        );
      }
    }
  }

  return parseResult;
};
```

## 8.3 Question Validation

After parsing, every generated question passes through a
structured validator before being stored.
```typescript
type ValidationResult = {
  valid: boolean;
  reason?: string;
};

const validateGeneratedQuestion = (
  q: any
): ValidationResult => {
  // Check required fields exist
  if (!q || typeof q !== "object") {
    return { valid: false, reason: "Response is not an object" };
  }

  if (typeof q.question !== "string" || q.question.trim().length < 10) {
    return {
      valid: false,
      reason: `question field missing or too short: "${q.question}"`,
    };
  }

  if (!q.question.includes("?")) {
    return {
      valid: false,
      reason: `question does not end with '?': "${q.question}"`,
    };
  }

  if (!Array.isArray(q.options) || q.options.length !== 4) {
    return {
      valid: false,
      reason: `options must be array of 4 items, got: ${JSON.stringify(q.options)}`,
    };
  }

  for (let i = 0; i < 4; i++) {
    if (typeof q.options[i] !== "string" || q.options[i].trim().length < 2) {
      return {
        valid: false,
        reason: `option ${i} is invalid: "${q.options[i]}"`,
      };
    }
  }

  if (
    typeof q.correct_option_index !== "number" ||
    q.correct_option_index < 0 ||
    q.correct_option_index > 3 ||
    !Number.isInteger(q.correct_option_index)
  ) {
    return {
      valid: false,
      reason: `correct_option_index must be integer 0-3, got: ${q.correct_option_index}`,
    };
  }

  // Check explanation exists
  if (
    typeof q.explanation !== "string" ||
    q.explanation.trim().length < 10
  ) {
    return {
      valid: false,
      reason: `explanation missing or too short: "${q.explanation}"`,
    };
  }

  // Check options are not all identical
  const uniqueOptions = new Set(
    q.options.map((o: string) => o.trim().toLowerCase())
  );
  if (uniqueOptions.size < 4) {
    return {
      valid: false,
      reason: "options contain duplicates",
    };
  }

  // Check for forbidden patterns
  const forbiddenPatterns = [
    "all of the above",
    "none of the above",
    "both a and b",
    "all the above",
  ];

  for (const option of q.options) {
    const lower = option.toLowerCase();
    if (
      forbiddenPatterns.some((pattern) => lower.includes(pattern))
    ) {
      return {
        valid: false,
        reason: `option contains forbidden pattern: "${option}"`,
      };
    }
  }

  // Validate cognitive level
  const validLevels = [
    "RECALL",
    "COMPREHENSION",
    "APPLICATION",
    "ANALYSIS",
  ];
  if (
    q.cognitive_level &&
    !validLevels.includes(q.cognitive_level)
  ) {
    // Fix instead of reject — normalize to closest valid level
    q.cognitive_level = "RECALL";
  }

  // Validate difficulty
  const validDifficulties = ["EASY", "MEDIUM", "HARD"];
  if (q.difficulty && !validDifficulties.includes(q.difficulty)) {
    q.difficulty = "MEDIUM";
  }

  return { valid: true };
};
```

---

# 9. Stage 7 — Quiz Storage and Threshold Checking

## 9.1 Storing Generated Questions

After validation, questions are stored in the quizzes table
with PENDING_REVIEW status. The available_from date is set
to NULL until mentor approval, at which point the service
sets it to NOW() (making the question immediately available).
```typescript
const storeGeneratedQuestions = async (
  questions: GeneratedQuestion[],
  concepts: ConceptResult[],
  contentId: string,
  batchId: string,
  quizType: QuizType
): Promise<number> => {
  let storedCount = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const concept = concepts[i] ?? concepts[0];

    try {
      await prisma.quiz.create({
        data: {
          contentId,
          batchId,
          quizType,
          questionText: q.question.trim(),
          options: q.options.map((o) => o.trim()),
          correctOptionIndex: q.correct_option_index,
          explanation: q.explanation?.trim() ?? null,
          cognitiveLevel: (q.cognitive_level as CognitiveLevel)
            ?? "RECALL",
          difficulty: (q.difficulty as Difficulty) ?? "MEDIUM",
          isAiGenerated: true,
          generationStatus: "PENDING_REVIEW",
          availableFrom: null, // Set by approval
          sourceConcept: concept.concept,
          transcriptReference: concept.transcript_excerpt.slice(
            0,
            200
          ),
        },
      });
      storedCount++;
    } catch (err: any) {
      console.error(
        `[Storage] Failed to store question ${i + 1}: ${err.message}`
      );
      // Continue — don't fail the whole batch for one question
    }
  }

  console.log(
    `[Storage] Stored ${storedCount}/${questions.length} ` +
    `questions for content ${contentId}`
  );

  return storedCount;
};
```

## 9.2 Threshold Check and Notification

After storage, the system checks whether the minimum
threshold of questions has been met and notifies mentors.
```typescript
const checkThresholdAndNotify = async (
  contentId: string,
  batchId: string,
  contentTitle: string
): Promise<void> => {
  const [quickCount, retentionCount] = await Promise.all([
    prisma.quiz.count({
      where: {
        contentId,
        quizType: "QUICK_ASSESSMENT",
        generationStatus: "PENDING_REVIEW",
      },
    }),
    prisma.quiz.count({
      where: {
        contentId,
        quizType: "RETENTION",
        generationStatus: "PENDING_REVIEW",
      },
    }),
  ]);

  const totalCount = quickCount + retentionCount;

  console.log(
    `[Threshold] Content "${contentTitle}": ` +
    `${quickCount} Quick Assessment, ` +
    `${retentionCount} Retention questions`
  );

  if (totalCount === 0) {
    // Generation produced no valid questions at all
    await notificationService.sendToBatchMentors(batchId, {
      type: "QUIZ_GENERATION_FAILED",
      title: "Quiz Generation Failed",
      message: `Quiz generation produced no valid questions for 
               "${contentTitle}". Please review the transcript 
               and try regenerating.`,
      metadata: { content_id: contentId },
      action_url: `/mentor/content/${contentId}`,
    });
    return;
  }

  // Notify mentors questions are ready
  await notificationService.sendToBatchMentors(batchId, {
    type: "QUIZZES_READY_FOR_REVIEW",
    title: "Quizzes Ready for Review",
    message:
      `${totalCount} question${totalCount !== 1 ? "s" : ""} ` +
      `ready for review for "${contentTitle}"`,
    metadata: {
      content_id: contentId,
      quiz_count: totalCount,
      quick_assessment_count: quickCount,
      retention_count: retentionCount,
      batch_id: batchId,
    },
    action_url: `/mentor/batches/${batchId}/review?content=${contentId}`,
  });
};
```

---

# 10. Stage 8 — Mentor Review Interface Integration

## 10.1 What Happens During Review

After generation, mentors see questions in the review queue.
For each question they can:

**Approve:** Sets generation_status = APPROVED and
available_from = NOW(). The question immediately counts
toward the threshold and becomes available to students
when the threshold is met.

**Edit then approve:** Mentor modifies question text, options,
or correct answer index. The original AI text is preserved
in original_question_text (only on first edit). was_edited
is set to TRUE. Then approved as above.

**Reject:** Sets generation_status = REJECTED with a reason
from the controlled vocabulary. The question is removed from
the review queue and does not count toward the threshold.

## 10.2 Threshold and Availability Logic
```typescript
// services/quizReview.service.ts (approval logic)

export const approveQuiz = async (
  quizId: string,
  mentorId: string
): Promise<ApprovalResult> => {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      content: { select: { batchId: true, title: true } },
    },
  });

  if (!quiz) throw { code: "QUIZ_NOT_FOUND", statusCode: 404 };

  if (quiz.generationStatus === "APPROVED") {
    throw { code: "ALREADY_APPROVED", statusCode: 400 };
  }

  const now = new Date();

  // Approve the question
  await prisma.quiz.update({
    where: { id: quizId },
    data: {
      generationStatus: "APPROVED",
      approvedBy: mentorId,
      approvedAt: now,
      availableFrom: now, // Available immediately on approval
    },
  });

  // Check threshold status for this content/type
  const approvedCount = await prisma.quiz.count({
    where: {
      contentId: quiz.contentId,
      quizType: quiz.quizType,
      generationStatus: "APPROVED",
    },
  });

  const minimum =
    quiz.quizType === "QUICK_ASSESSMENT" ? 5 : 8;
  const thresholdMet = approvedCount >= minimum;

  // If threshold just met, notify students
  if (thresholdMet && approvedCount === minimum) {
    await notifyStudentsQuizAvailable(
      quiz.contentId,
      quiz.content.batchId,
      quiz.content.title,
      quiz.quizType
    );
  }

  return {
    quiz_id: quizId,
    generation_status: "APPROVED",
    approved_by: mentorId,
    approved_at: now,
    content_threshold_status: {
      quiz_type: quiz.quizType,
      approved_count: approvedCount,
      minimum_required: minimum,
      threshold_met: thresholdMet,
    },
  };
};

const notifyStudentsQuizAvailable = async (
  contentId: string,
  batchId: string,
  contentTitle: string,
  quizType: QuizType
): Promise<void> => {
  const isRetention = quizType === "RETENTION";

  await notificationService.sendToBatch(batchId, {
    type: isRetention ? "RETENTION_QUIZ_AVAILABLE" : "QUIZ_AVAILABLE",
    title: isRetention
      ? "Retention Quiz Available"
      : "Quick Quiz Available",
    message: isRetention
      ? `Retention quiz now available for "${contentTitle}"`
      : `Quick quiz available for "${contentTitle}"`,
    metadata: { content_id: contentId },
    action_url: `/student/content/${contentId}`,
  });
};
```

---

# 11. Retention Quiz Generation

## 11.1 What Makes Retention Quizzes Different

Retention quizzes test whether students remember content
from past weeks. They contain two types of questions:

- **Current content questions (40%):** Questions about this
  week's material — same as Quick Assessment questions,
  testing immediate comprehension
- **Historical questions (60%):** Questions about content
  from 2+ weeks ago — testing whether knowledge persisted

Retention quizzes are generated 72 hours after the Quick
Assessment quiz becomes available. This gives students
time to take the Quick Assessment first, then come back
to the Retention quiz days later.

## 11.2 Historical Question Generation
```typescript
const generateRetentionQuiz = async (
  currentContentId: string,
  batchId: string,
  generationRunId: string
): Promise<void> => {

  // Fetch all content from this batch
  const allContent = await prisma.content.findMany({
    where: {
      batchId,
      isPublished: true,
      deletedAt: null,
      transcriptionStatus: "COMPLETE",
    },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      title: true,
      sortOrder: true,
    },
  });

  const currentContent = allContent.find(
    (c) => c.id === currentContentId
  );

  if (!currentContent) return;

  // Historical content = content with lower sort order than current
  // (i.e., earlier in the curriculum)
  const historicalContent = allContent.filter(
    (c) => c.sortOrder < currentContent.sortOrder
  );

  if (historicalContent.length === 0) {
    console.log(
      `[RetentionGen] No historical content for ` +
      `"${currentContent.title}" — skipping retention quiz`
    );
    return;
  }

  // Sample up to 3 historical content items
  const sampleSize = Math.min(3, historicalContent.length);
  const selectedHistorical = sampleFromArray(
    historicalContent,
    sampleSize
  );

  console.log(
    `[RetentionGen] Generating historical questions from ` +
    `${selectedHistorical.length} past content items`
  );

  // For each selected historical content item:
  // Pick 1-2 approved Quick Assessment questions and convert
  // them to Retention questions for this content
  for (const historical of selectedHistorical) {
    const existingQuestions = await prisma.quiz.findMany({
      where: {
        contentId: historical.id,
        quizType: "QUICK_ASSESSMENT",
        generationStatus: "APPROVED",
        cognitiveLevel: { in: ["RECALL", "COMPREHENSION"] },
      },
      orderBy: { approvedAt: "asc" },
      take: 2,
    });

    if (existingQuestions.length === 0) {
      // No approved questions for this historical content yet
      // Generate new retention-specific questions instead
      await generateFreshRetentionQuestion(
        historical.id,
        currentContentId,
        batchId,
        generationRunId
      );
    } else {
      // Clone existing approved questions as retention questions
      for (const q of existingQuestions) {
        try {
          await prisma.quiz.create({
            data: {
              contentId: historical.id,
              batchId,
              quizType: "RETENTION",
              questionText: q.questionText,
              options: q.options as string[],
              correctOptionIndex: q.correctOptionIndex,
              explanation: q.explanation,
              cognitiveLevel: q.cognitiveLevel,
              difficulty: q.difficulty,
              isAiGenerated: true,
              generationStatus: "PENDING_REVIEW",
              sourceConcept: q.sourceConcept,
              transcriptReference: q.transcriptReference,
            },
          });
          console.log(
            `[RetentionGen] Cloned question from ` +
            `"${historical.title}" for retention`
          );
        } catch {
          // Skip on duplicate key — question may already exist
        }
      }
    }
  }

  // Also add current content questions (40% of retention quiz)
  const currentQuestions = await prisma.quiz.findMany({
    where: {
      contentId: currentContentId,
      quizType: "QUICK_ASSESSMENT",
      generationStatus: "APPROVED",
    },
    orderBy: { approvedAt: "asc" },
    take: 6,
  });

  for (const q of currentQuestions) {
    try {
      await prisma.quiz.create({
        data: {
          contentId: currentContentId,
          batchId,
          quizType: "RETENTION",
          questionText: q.questionText,
          options: q.options as string[],
          correctOptionIndex: q.correctOptionIndex,
          explanation: q.explanation,
          cognitiveLevel: q.cognitiveLevel,
          difficulty: q.difficulty,
          isAiGenerated: true,
          generationStatus: "PENDING_REVIEW",
          sourceConcept: q.sourceConcept,
          transcriptReference: q.transcriptReference,
        },
      });
    } catch {
      // Skip duplicates
    }
  }
};

const sampleFromArray = <T>(array: T[], n: number): T[] => {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
};
```

## 11.3 Retention Quiz Availability Scheduling

Retention quizzes become available 72 hours after the
Quick Assessment threshold is first met.
```typescript
// Called when Quick Assessment threshold is met
const scheduleRetentionQuizAvailability = async (
  contentId: string,
  batchId: string
): Promise<void> => {
  const availableAt = new Date(
    Date.now() + 72 * 60 * 60 * 1000
  );

  // Update all retention questions for this content
  await prisma.quiz.updateMany({
    where: {
      contentId,
      batchId,
      quizType: "RETENTION",
      generationStatus: "APPROVED",
    },
    data: {
      availableFrom: availableAt,
    },
  });

  console.log(
    `[RetentionAvailability] Set retention quiz ` +
    `available at ${availableAt.toISOString()} ` +
    `for content ${contentId}`
  );
};
```

---

# 12. Error Handling and Recovery

## 12.1 Error Classification
```
RECOVERABLE ERRORS (retry automatically):
  - Ollama HTTP timeout (model loading slowly)
  - JSON parse failure (malformed model output)
  - S3 connection timeout
  - Temporary database connection error

NON-RECOVERABLE ERRORS (fail and notify):
  - FFmpeg not installed or not in PATH
  - Whisper not installed
  - Audio file is corrupted or not an audio file
  - Video file has no audio track
  - S3 bucket access denied
  - Content record not found (deleted during processing)

PARTIAL FAILURES (continue with what succeeded):
  - Some concepts extracted but question generation failed
    for some → store the successful questions
  - Transcript too short to extract meaningful concepts
    → store zero questions, notify mentor to add learning
    objectives and regenerate
  - Retention quiz cannot find historical content
    → skip retention quiz generation, only generate quick
    assessment
```

## 12.2 Retry Configuration
```typescript
// Bull job retry configuration for each stage
const RETRY_CONFIG = {
  EXTRACT_AUDIO: {
    attempts: 3,
    backoff: { type: "exponential", delay: 30000 },
    // 30s, 60s, 120s
  },
  TRANSCRIBE: {
    attempts: 3,
    backoff: { type: "exponential", delay: 60000 },
    // 60s, 120s, 240s (Whisper can be slow to start)
  },
  GENERATE_QUIZZES: {
    attempts: 2,
    backoff: { type: "fixed", delay: 30000 },
    // 30s, 30s
  },
};

// Per-concept retry (inside the job, not Bull retry)
const CONCEPT_RETRY_CONFIG = {
  maxAttempts: 3,
  delayMs: 2000,
};
```

## 12.3 Partial Success Handling
```typescript
// At the end of GENERATE_QUIZZES job
// Even if some concepts failed, store what succeeded

const handleGenerationCompletion = async (
  contentId: string,
  batchId: string,
  successCount: number,
  attemptedCount: number,
  contentTitle: string
): Promise<void> => {
  if (successCount === 0) {
    // Total failure — no questions generated at all
    console.error(
      `[QuizGeneration] Total failure for content ` +
      `${contentId}: 0/${attemptedCount} questions generated`
    );

    await notificationService.sendToBatchMentors(batchId, {
      type: "QUIZ_GENERATION_FAILED",
      title: "Quiz Generation Failed",
      message:
        `Quiz generation failed for "${contentTitle}". ` +
        `0 of ${attemptedCount} questions were generated. ` +
        `Try adding learning objectives and regenerating.`,
      metadata: {
        content_id: contentId,
        attempted: attemptedCount,
        succeeded: 0,
      },
      action_url: `/mentor/content/${contentId}`,
    });

  } else if (successCount < attemptedCount) {
    // Partial success — some questions generated
    console.warn(
      `[QuizGeneration] Partial success for content ` +
      `${contentId}: ${successCount}/${attemptedCount} questions`
    );

    // Still send the review notification
    // Mentor can decide if partial set is sufficient
    await checkThresholdAndNotify(
      contentId,
      batchId,
      contentTitle
    );

    // Also warn about partial failure
    await notificationService.sendToBatchMentors(batchId, {
      type: "QUIZ_GENERATION_PARTIAL",
      title: "Some Questions Failed to Generate",
      message:
        `${successCount} of ${attemptedCount} questions were ` +
        `generated for "${contentTitle}". You may want to add ` +
        `manual questions for the missing coverage.`,
      metadata: {
        content_id: contentId,
        attempted: attemptedCount,
        succeeded: successCount,
      },
    });

  } else {
    // Full success
    await checkThresholdAndNotify(
      contentId,
      batchId,
      contentTitle
    );
  }
};
```

---

# 13. Full Worker Implementation

The complete GENERATE_QUIZZES worker that orchestrates
all of the above functions.
```typescript
// workers/quizGeneration.worker.ts
import { Job } from "bull";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../lib/prisma";
import { notificationService } from
  "../services/notification.service";
import {
  extractConcepts,
  generateQuestionsForContent,
  storeGeneratedQuestions,
  checkThresholdAndNotify,
  generateRetentionQuiz,
  handleGenerationCompletion,
} from "../utils/quizGenerationPipeline.utils";

export const processGenerateQuizzesJob = async (
  job: Job
): Promise<void> => {
  const {
    content_id,
    generation_run_id = uuidv4(),
  } = job.data;

  console.log(
    `[QuizGeneration] Starting for content ${content_id}, ` +
    `run ${generation_run_id}`
  );

  const startTime = Date.now();

  // Fetch content and validate
  const content = await prisma.content.findUnique({
    where: { id: content_id, deletedAt: null },
    select: {
      id: true,
      title: true,
      transcript: true,
      batchId: true,
      learningObjectives: true,
      transcriptionStatus: true,
    },
  });

  if (!content) {
    console.error(
      `[QuizGeneration] Content ${content_id} not found`
    );
    return; // Not retryable — content was deleted
  }

  if (content.transcriptionStatus !== "COMPLETE") {
    throw new Error(
      `Content ${content_id} transcription status is ` +
      `${content.transcriptionStatus}, expected COMPLETE`
    );
  }

  if (!content.transcript || content.transcript.trim().length < 100) {
    console.error(
      `[QuizGeneration] Transcript too short for ` +
      `content ${content_id}: ` +
      `${content.transcript?.length ?? 0} chars`
    );

    await notificationService.sendToBatchMentors(
      content.batchId,
      {
        type: "QUIZ_GENERATION_FAILED",
        title: "Quiz Generation Failed — Transcript Too Short",
        message:
          `The transcript for "${content.title}" is too short ` +
          `to generate meaningful questions. Add learning ` +
          `objectives and try regenerating.`,
        metadata: { content_id },
        action_url: `/mentor/content/${content_id}`,
      }
    );
    return;
  }

  try {
    // STAGE 1: Extract concepts
    console.log(`[QuizGeneration] Stage 1: Concept extraction`);
    const concepts = await extractConcepts(
      content.transcript,
      content.title,
      content.learningObjectives,
      generation_run_id,
      content_id
    );

    if (concepts.length === 0) {
      console.error(
        `[QuizGeneration] No concepts extracted for ` +
        `content ${content_id}`
      );

      await notificationService.sendToBatchMentors(
        content.batchId,
        {
          type: "QUIZ_GENERATION_FAILED",
          title: "Quiz Generation Failed — No Concepts Found",
          message:
            `Could not extract teachable concepts from ` +
            `"${content.title}". ` +
            `Try adding learning objectives and regenerating.`,
          metadata: { content_id },
          action_url: `/mentor/content/${content_id}`,
        }
      );
      return;
    }

    console.log(
      `[QuizGeneration] Extracted ${concepts.length} concepts: ` +
      `${concepts.map((c) => c.concept).join(", ")}`
    );

    // STAGE 2: Generate Quick Assessment questions
    console.log(
      `[QuizGeneration] Stage 2: Question generation ` +
      `(Quick Assessment)`
    );

    const questions = await generateQuestionsForContent(
      content,
      concepts,
      generation_run_id
    );

    // STAGE 3: Store questions
    const storedCount = await storeGeneratedQuestions(
      questions,
      concepts,
      content_id,
      content.batchId,
      "QUICK_ASSESSMENT"
    );

    // STAGE 4: Generate Retention Quiz components
    console.log(
      `[QuizGeneration] Stage 4: Retention quiz generation`
    );

    try {
      await generateRetentionQuiz(
        content_id,
        content.batchId,
        generation_run_id
      );
    } catch (retentionErr: any) {
      // Retention quiz failure is non-blocking
      console.warn(
        `[QuizGeneration] Retention quiz generation failed ` +
        `(non-blocking): ${retentionErr.message}`
      );
    }

    // STAGE 5: Check threshold and notify
    await handleGenerationCompletion(
      content_id,
      content.batchId,
      storedCount,
      questions.length,
      content.title
    );

    const durationMs = Date.now() - startTime;
    console.log(
      `[QuizGeneration] Completed for content ${content_id} ` +
      `in ${Math.round(durationMs / 1000)}s. ` +
      `${storedCount} questions stored.`
    );

  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    console.error(
      `[QuizGeneration] Fatal error for content ` +
      `${content_id}: ${error.message} ` +
      `(after ${Math.round(durationMs / 1000)}s)`
    );

    await notificationService.sendToBatchMentors(
      content.batchId,
      {
        type: "QUIZ_GENERATION_FAILED",
        title: "Quiz Generation Failed",
        message:
          `Quiz generation failed for "${content.title}". ` +
          `Please try regenerating from the content page.`,
        metadata: { content_id, error: error.message },
        action_url: `/mentor/content/${content_id}`,
      }
    );

    throw error; // Allow Bull to retry
  }
};
```

---

# 14. Prompt Library

## 14.1 All Prompts in One Place

This section consolidates every prompt used in the pipeline
so they can be reviewed, tuned, and versioned together.

### P01 — Concept Extraction
```
You are an expert educator analyzing a lecture transcript to
identify key teachable concepts that students should understand
and be tested on.

LECTURE TITLE: {title}
{learning_objectives_section}
TRANSCRIPT:
{transcript_chunk}

TASK: Extract the 4 to 8 most important concepts from this
transcript that are worth testing students on. Focus on
concepts that are:
- Clearly explained in the transcript
- Important for understanding the subject
- Testable with a 4-option multiple choice question
- Distinct from each other (not overlapping)

For each concept, identify:
1. A short concept name (2-6 words)
2. A one-sentence explanation of the concept
3. The most relevant transcript excerpt (15-40 words) that
   best explains this concept

Respond with ONLY a valid JSON array. No explanation, no
markdown, no code blocks. Only JSON.

Format:
[
  {
    "concept": "Name of the concept",
    "explanation": "One sentence explaining what this concept is",
    "transcript_excerpt": "The exact words from the transcript..."
  }
]
```

### P02 — RECALL Question Generation
```
You are writing a multiple choice question for a software
development course.

LECTURE: {title}

CONCEPT TO TEST: {concept}
CONCEPT EXPLANATION: {explanation}
RELEVANT TRANSCRIPT EXCERPT: "{transcript_excerpt}"

COGNITIVE LEVEL: RECALL
The question should test RECALL — asking the student to
remember a specific fact, definition, or term directly
stated in the transcript. The correct answer should be
findable by a student who watched the lecture carefully.

DIFFICULTY: {difficulty}
{difficulty_instructions}

REQUIREMENTS FOR THE QUESTION:
- Exactly 4 answer options labeled implicitly as options 0, 1, 2, 3
- Exactly 1 correct answer
- 3 plausible but clearly incorrect distractors
- Options should be similar in length and style
- Do not use "All of the above" or "None of the above"
- Do not make the correct answer obviously longer than others
- The question should be self-contained

REQUIREMENTS FOR THE EXPLANATION:
- 1-3 sentences explaining WHY the correct answer is correct
- Mention why the most tempting wrong answer is incorrect

Respond with ONLY a valid JSON object. No explanation, no
markdown, no code blocks. Only JSON.

Format:
{
  "question": "Question text?",
  "options": ["A", "B", "C", "D"],
  "correct_option_index": 0,
  "explanation": "Explanation...",
  "cognitive_level": "RECALL",
  "difficulty": "{difficulty}"
}
```

### P03 — COMPREHENSION Question Generation

Same as P02 with cognitive level instructions replaced by:
```
COGNITIVE LEVEL: COMPREHENSION
The question should test COMPREHENSION — asking the student
to explain, interpret, or describe the concept in their own
words. The student should need to understand the concept,
not just remember a phrase.
```

### P04 — APPLICATION Question Generation

Same as P02 with cognitive level instructions replaced by:
```
COGNITIVE LEVEL: APPLICATION
The question should test APPLICATION — asking the student
to apply the concept to a new situation, choose the right
tool for a job, or predict what would happen in a given
scenario. The student should need to use their understanding,
not just recall facts.
```

### P05 — ANALYSIS Question Generation

Same as P02 with cognitive level instructions replaced by:
```
COGNITIVE LEVEL: ANALYSIS
The question should test ANALYSIS — asking the student to
compare approaches, identify trade-offs, diagnose a problem,
or evaluate which solution is better and why. The student
should need to break down and examine the concept deeply.
```

---

# 15. Quality Metrics and Monitoring

## 15.1 Metrics to Track
```typescript
// Queries for quality dashboard (admin view)
// Run weekly to monitor pipeline health

// Overall approval rate
const approvalStats = await prisma.quiz.groupBy({
  by: ["generationStatus"],
  _count: { id: true },
  where: { isAiGenerated: true },
});

// Approval rate by cognitive level
const byLevel = await prisma.quiz.groupBy({
  by: ["cognitiveLevel", "generationStatus"],
  _count: { id: true },
  where: { isAiGenerated: true },
});

// Rejection reasons distribution
const rejectionReasons = await prisma.quiz.groupBy({
  by: ["rejectionReason"],
  _count: { id: true },
  where: {
    generationStatus: "REJECTED",
    rejectionReason: { not: null },
  },
  orderBy: { _count: { id: "desc" } },
});

// Edit rate (questions approved with edits)
const editStats = await prisma.quiz.aggregate({
  _count: { id: true },
  where: {
    generationStatus: "APPROVED",
    isAiGenerated: true,
    wasEdited: true,
  },
});
```

## 15.2 Target Quality Benchmarks
```
Overall approval rate           : ≥ 80%
Approval without editing        : ≥ 60%
RECALL approval rate            : ≥ 90%
COMPREHENSION approval rate     : ≥ 80%
APPLICATION approval rate       : ≥ 70%
ANALYSIS approval rate          : ≥ 60%

Top rejection reasons (normal)  : POORLY_WORDED, OFF_TOPIC
Top rejection reasons (problem) : FACTUALLY_INCORRECT > 20%
  → If FACTUALLY_INCORRECT > 20%, review Whisper accuracy
  → Consider switching to large model for affected content
```

## 15.3 Pipeline Performance Benchmarks
```
Audio extraction              : < 5 min (for 90-min video)
Transcription (medium, GPU)   : 5-10 min (for 90-min video)
Transcription (medium, CPU)   : 30-60 min (for 90-min video)
Concept extraction            : 30-60 sec
Question generation (8 Qs)    : 3-8 min (GPU)
Question generation (8 Qs)    : 15-40 min (CPU)

Total pipeline (GPU)          : ~10-20 min per video
Total pipeline (CPU-only)     : ~60-90 min per video
```

---

# 16. Testing the Pipeline

## 16.1 Unit Tests for Core Functions
```typescript
// tests/unit/quizGeneration.test.ts

describe("parseJsonFromResponse", () => {

  it("should parse clean JSON", () => {
    const raw = '[{"concept": "Event Loop", "explanation": "test"}]';
    const result = parseJsonFromResponse<any[]>(raw);
    expect(result).toHaveLength(1);
    expect(result[0].concept).toBe("Event Loop");
  });

  it("should strip markdown code fences", () => {
    const raw = "```json\n[{\"concept\": \"test\"}]\n```";
    const result = parseJsonFromResponse<any[]>(raw);
    expect(result[0].concept).toBe("test");
  });

  it("should extract JSON from text prefix", () => {
    const raw = 'Here is the JSON:\n[{"concept": "test"}]';
    const result = parseJsonFromResponse<any[]>(raw);
    expect(result[0].concept).toBe("test");
  });

  it("should fix trailing commas", () => {
    const raw = '[{"concept": "test",}]';
    const result = parseJsonFromResponse<any[]>(raw);
    expect(result[0].concept).toBe("test");
  });

  it("should throw on truly unparseable output", () => {
    expect(() =>
      parseJsonFromResponse("not json at all")
    ).toThrow("JSON parse failed");
  });
});

describe("validateGeneratedQuestion", () => {

  const validQuestion = {
    question: "What is the primary purpose of the event loop?",
    options: [
      "To handle multiple I/O operations concurrently",
      "To manage memory allocation",
      "To compile JavaScript code",
      "To synchronize processes",
    ],
    correct_option_index: 0,
    explanation: "The event loop enables non-blocking I/O...",
    cognitive_level: "RECALL",
    difficulty: "MEDIUM",
  };

  it("should accept a valid question", () => {
    expect(validateGeneratedQuestion(validQuestion).valid)
      .toBe(true);
  });

  it("should reject question without question mark", () => {
    const q = { ...validQuestion, question: "No question mark here" };
    expect(validateGeneratedQuestion(q).valid).toBe(false);
  });

  it("should reject question with fewer than 4 options", () => {
    const q = {
      ...validQuestion,
      options: ["A", "B", "C"],
    };
    expect(validateGeneratedQuestion(q).valid).toBe(false);
  });

  it("should reject question with duplicate options", () => {
    const q = {
      ...validQuestion,
      options: ["Same", "Same", "Same", "Different"],
    };
    expect(validateGeneratedQuestion(q).valid).toBe(false);
  });

  it("should reject 'All of the above' options", () => {
    const q = {
      ...validQuestion,
      options: [
        "Option A",
        "Option B",
        "Option C",
        "All of the above",
      ],
    };
    expect(validateGeneratedQuestion(q).valid).toBe(false);
  });

  it("should reject correct_option_index out of range", () => {
    const q = { ...validQuestion, correct_option_index: 4 };
    expect(validateGeneratedQuestion(q).valid).toBe(false);
  });
});

describe("chunkTranscript", () => {

  it("should return single chunk for short transcripts", () => {
    const short = "word ".repeat(500).trim();
    const chunks = chunkTranscript(short);
    expect(chunks).toHaveLength(1);
  });

  it("should split long transcripts", () => {
    const long = "word ".repeat(5000).trim();
    const chunks = chunkTranscript(long, 3000, 200);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("should create overlapping chunks", () => {
    const words = Array.from(
      { length: 3500 },
      (_, i) => `word${i}`
    ).join(" ");
    const chunks = chunkTranscript(words, 3000, 200);

    // Last 200 words of chunk 1 should appear at start of chunk 2
    const chunk1Words = chunks[0].split(" ");
    const chunk2Words = chunks[1].split(" ");
    const lastWordOfOverlap =
      chunk1Words[chunk1Words.length - 201];

    expect(chunk2Words[0]).toBe(lastWordOfOverlap);
  });
});
```

## 16.2 Integration Test
```typescript
// tests/integration/quizGenerationPipeline.test.ts

describe("Quiz Generation Pipeline Integration", () => {

  const TEST_TRANSCRIPT = `
    Today we are going to cover the Node.js event loop, which
    is one of the most important concepts in Node.js development.
    
    The event loop is what allows Node.js to perform non-blocking
    I/O operations despite the fact that JavaScript is single-threaded.
    It does this by offloading operations to the system kernel whenever
    possible.
    
    Since most modern kernels are multi-threaded, they can handle
    multiple operations executing in the background. When one of these
    operations completes, the kernel tells Node.js so that the
    appropriate callback may be added to the poll queue to eventually
    be executed.
    
    The event loop has several phases: timers, pending callbacks,
    idle and prepare, poll, check, and close callbacks. Each phase
    has a FIFO queue of callbacks to execute.
    
    require() is the function used to import modules in Node.js.
    It loads the module synchronously and returns the exported object.
    When you call require(), Node.js first checks its cache to see
    if the module has been loaded before. If it has, it returns the
    cached version. If not, it loads and executes the module file.
  `;

  it("should extract concepts from transcript", async () => {
    const concepts = await extractConcepts(
      TEST_TRANSCRIPT,
      "Introduction to Node.js",
      null,
      uuidv4(),
      "test-content-id"
    );

    expect(concepts.length).toBeGreaterThan(0);
    expect(concepts.length).toBeLessThanOrEqual(8);

    for (const concept of concepts) {
      expect(concept.concept).toBeTruthy();
      expect(concept.explanation).toBeTruthy();
      expect(concept.transcript_excerpt).toBeTruthy();
    }

    // Should find event loop as a concept
    const hasEventLoop = concepts.some((c) =>
      c.concept.toLowerCase().includes("event loop")
    );
    expect(hasEventLoop).toBe(true);
  }, 120000); // 2 minute timeout for AI call

  it("should generate valid questions from concepts", async () => {
    const concepts = [
      {
        concept: "Event Loop",
        explanation: "Allows non-blocking I/O in single-threaded JS",
        transcript_excerpt:
          "The event loop is what allows Node.js to perform " +
          "non-blocking I/O operations",
      },
    ];

    const questions = await generateQuestionsForContent(
      {
        id: "test-content-id",
        title: "Introduction to Node.js",
        batchId: "test-batch-id",
      } as any,
      concepts,
      uuidv4()
    );

    expect(questions.length).toBeGreaterThan(0);

    for (const q of questions) {
      const validation = validateGeneratedQuestion(q);
      expect(validation.valid).toBe(true);
    }
  }, 120000);
});
```

---

# 17. Performance Tuning

## 17.1 Whisper Optimization
```bash
# Use faster float16 on GPU (significant speedup)
WHISPER_FP16=True  # Add to .env when using GPU

# Use tiny model for development (instant, lower accuracy)
WHISPER_MODEL=tiny  # Dev only, never production

# Disable verbose output (small speedup)
# Already set in our implementation
```

**Batch transcription:** For batches where multiple videos
are uploaded at once, process them sequentially (one at a time)
rather than in parallel. Parallel Whisper jobs compete for
GPU memory and slow each other down. The Bull queue handles
this naturally with `concurrency: 1` for transcription jobs:
```typescript
contentQueue.process("TRANSCRIBE", 1, processTranscribeJob);
                                  // ↑ concurrency = 1
```

## 17.2 Ollama Optimization
```bash
# Keep model loaded in memory between calls
# Add to Ollama start command:
OLLAMA_KEEP_ALIVE=30m ollama serve
# Model stays in VRAM for 30 minutes after last use
# Eliminates 30-60 second model reload time between calls
```

**Parallel question generation:** Unlike transcription,
multiple question generation calls can run in parallel
since each uses a small context window. For a batch of
8 concepts, run 2-4 in parallel:
```typescript
// Generate questions for concepts in parallel batches
const PARALLEL_BATCH_SIZE = 3;

for (let i = 0; i < concepts.length; i += PARALLEL_BATCH_SIZE) {
  const batch = concepts.slice(i, i + PARALLEL_BATCH_SIZE);
  const batchResults = await Promise.allSettled(
    batch.map((concept, j) =>
      generateSingleQuestion(
        concept,
        distribution[i + j],
        content,
        generationRunId
      )
    )
  );

  for (const result of batchResults) {
    if (result.status === "fulfilled" && result.value) {
      questions.push(result.value);
    }
  }
}
```

## 17.3 Context Window Management

Mistral 7B has a 32,768 token context window but performs
best with prompts under 4,096 tokens. The transcript chunking
(section 6.2) ensures concept extraction prompts stay within
this limit. Question generation prompts are always small
(under 800 tokens) so they never exceed the limit.

**Token estimation rule of thumb:**
```
1 token ≈ 0.75 words (English)
3000 words ≈ 4000 tokens — safe for concept extraction
500 words ≈ 667 tokens — safe for question generation
```

---

# 18. Troubleshooting Guide

## 18.1 Common Issues and Solutions

### Whisper produces garbled transcript

**Symptom:** Transcript contains random characters, repeated words,
or complete nonsense.

**Cause:** Audio quality issue — background noise, music overlay,
or encoding problem in the original video.

**Fix:**
1. Check the original video plays clearly
2. Try the large-v2 model: `WHISPER_MODEL=large-v2`
3. Pre-process audio with noise reduction:
```bash
   ffmpeg -i input.mp3 -af "anlmdn=s=7:p=0.002:r=0.002:l=0" output.mp3
```
4. If audio is consistently poor quality, enable VAD
   (Voice Activity Detection) filter in Whisper:
```
   Add --vad_filter True to Whisper args
```

---

### Ollama returns empty response

**Symptom:** `generateWithOllama` returns empty string or
throws timeout.

**Cause:** Model not loaded, Ollama not running, or context
overflow.

**Diagnosis:**
```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Check model is available
ollama list

# Test generation manually
curl http://localhost:11434/api/generate \
  -d '{"model": "mistral:7b-instruct-v0.2-q4_K_M",
       "prompt": "Say hello",
       "stream": false}'
```

**Fix:**
1. Restart Ollama: `sudo systemctl restart ollama`
2. Verify model is pulled: `ollama pull mistral:7b-instruct-v0.2-q4_K_M`
3. Check available memory: `free -h` (need 6GB+ free for GPU, 8GB+ for CPU)

---

### JSON parse always fails for a specific content item

**Symptom:** All question generation attempts fail with
"JSON parse failed" for one particular content item.

**Cause:** Usually indicates the transcript contains unusual
characters that confuse the model (e.g., math symbols, code
snippets with special characters, or non-English text).

**Fix:**
1. Check the transcript in the database:
```sql
   SELECT transcript FROM content WHERE id = 'content-uuid';
```
2. Look for unusual characters, very long code blocks, or
   non-ASCII sequences
3. Edit the transcript to remove or escape problematic sections
4. Trigger manual regeneration from the content page
5. If model consistently fails, add learning objectives to
   guide it away from problematic sections

---

### Approval rate is below 60%

**Symptom:** More than 40% of generated questions are being
rejected by mentors.

**Cause:** Transcript quality issue OR prompt tuning needed.

**Diagnosis:**
1. Check rejection reasons distribution:
```sql
   SELECT rejection_reason, COUNT(*) as count
   FROM quizzes
   WHERE generation_status = 'REJECTED'
   GROUP BY rejection_reason
   ORDER BY count DESC;
```
2. If FACTUALLY_INCORRECT > 20%: Whisper accuracy problem
3. If POORLY_WORDED > 30%: Prompt tuning needed
4. If OFF_TOPIC > 20%: Concept extraction needs improvement

**Fix for FACTUALLY_INCORRECT:**
- Switch to Whisper large model
- Add mentor-provided learning objectives to guide extraction
- Have mentor edit transcript before regenerating

**Fix for POORLY_WORDED:**
- Add examples of good questions to the generation prompt
- Increase the "REQUIREMENTS FOR THE QUESTION" constraints
- Try temperature 0.1 instead of 0.3 for less creative output

---

### Pipeline stuck in PROCESSING status

**Symptom:** Content shows `transcription_status = PROCESSING`
but no active Bull job exists.

**Cause:** Worker crashed mid-job without updating status,
or job was lost due to Redis restart.

**Fix:**
```typescript
// Admin utility script to reset stuck content
const resetStuckContent = async () => {
  const stuckThreshold = new Date(
    Date.now() - 4 * 60 * 60 * 1000 // 4 hours ago
  );

  const stuck = await prisma.content.findMany({
    where: {
      transcriptionStatus: "PROCESSING",
      updatedAt: { lt: stuckThreshold },
    },
    select: { id: true, title: true, updatedAt: true },
  });

  console.log(`Found ${stuck.length} stuck content items`);

  for (const content of stuck) {
    await prisma.content.update({
      where: { id: content.id },
      data: { transcriptionStatus: "FAILED",
              transcriptionError: "Job timed out" },
    });
    console.log(`Reset: ${content.title} (${content.id})`);
  }
};
```

---

**End of Quiz Generation Workflow Sub-Document**

---

**Document Information**

| Field | Value |
|-------|-------|
| Sub-Document Title | M2i_LMS Quiz Generation Workflow Sub-Document |
| Sub-Document Number | 05 of 05 |
| Version | 1.0 |
| Status | Ready for Development |
| Parent Document | M2i_LMS Master Product Documentation v1.0 |
| Created | March 2026 |
| Last Updated | March 2026 |
| Previous Sub-Document | M2i_LMS_Tech_Stack.md |
| Next Sub-Document | None — final sub-document |
| Maintained By | Product Team |
| Repository | /docs/sub/M2i_LMS_Quiz_Generation_Workflow.md |