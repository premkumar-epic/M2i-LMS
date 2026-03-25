# Feature 03 — Content Management System
### Complete Implementation Guide | Version 1.0 | March 2026

---

# 1. Feature Description
*From docs/Features_SubDocument.md*

The Content Management System is the primary tool through which mentors deliver learning material to students. It handles the full lifecycle of learning content — from initial upload through organization, publication, and eventual archiving. It is also the entry point for the AI quiz generation pipeline: every piece of content that passes through the CMS is automatically transcribed and used to generate quizzes.

The design philosophy of the CMS is minimal friction for the mentor. Uploading a video should require no more effort than dragging a file into a browser and filling in a title. Everything downstream — storage, transcription, quiz generation — happens automatically. The mentor's job is to create good content and review AI-generated quizzes, not to manage technical processes.

---

# 2. User Stories
*From docs/Features_SubDocument.md*

### Mentor Stories

**US-CMS-01**
As a mentor, I want to upload a video file to the platform with a title, description, and topic tags, so that students in my batch can access the learning material.

**US-CMS-02**
As a mentor, I want to see the upload progress in real time, so that I know whether my upload is succeeding and how much longer it will take.

**US-CMS-03**
As a mentor, I want to add learning objectives to my content, so that the AI quiz generation system produces quizzes that are well-aligned with what I intend students to learn.

**US-CMS-04**
As a mentor, I want to save content as a draft before publishing, so that I can prepare material in advance without making it visible to students before it is ready.

**US-CMS-05**
As a mentor, I want to publish content when it is ready, so that students can access it immediately.

**US-CMS-06**
As a mentor, I want to unpublish content if I need to make corrections, so that students do not access material that contains errors.

**US-CMS-07**
As a mentor, I want to upload supplementary materials such as PDFs and slides alongside a video, so that students have reference materials to support their learning.

**US-CMS-08**
As a mentor, I want to view and edit the auto-generated transcript for my video, so that I can correct any transcription errors before quiz generation is triggered.

**US-CMS-09**
As a mentor, I want to see the transcription and quiz generation status for each piece of content, so that I know when quizzes will be ready for review.

**US-CMS-10**
As a mentor, I want to reorder content within my batch, so that students see the material in a logical curriculum sequence.

**US-CMS-11**
As a mentor, I want to delete a piece of content that is no longer relevant, so that the content library stays clean and up to date.

### Student Stories

**US-CMS-12**
As a student, I want to see a list of all published content in my batch organized in curriculum order, so that I know what material is available and in what sequence I should study it.

**US-CMS-13**
As a student, I want to watch a video with standard playback controls including play, pause, seek, and speed adjustment, so that I can learn at my own pace.

**US-CMS-14**
As a student, I want to see my completion status for each piece of content, so that I can track which material I have finished.

**US-CMS-15**
As a student, I want to access supplementary materials associated with a video, so that I can download and study reference documents.

---

# 3. Acceptance Criteria
*From docs/Features_SubDocument.md*

### Content Upload and Management (US-CMS-01, US-CMS-02, US-CMS-03, US-CMS-04, US-CMS-05, US-CMS-06, US-CMS-11)

- AC-CMS-01-1: The video upload form requires a video file (MP4, MOV, or WebM, maximum 2GB) and a title (maximum 150 characters). Description and topic tags are optional.
- AC-CMS-02-1: The UI displays a progress bar during upload showing percentage completion and estimated time remaining.
- AC-CMS-03-1: Mentors can enter up to five learning objectives as bullet points. These are stored as a JSON array in the content record.
- AC-CMS-04-1: New uploads default to DRAFT status. They are not visible to students.
- AC-CMS-05-1: Mentors can transition content from DRAFT to PUBLISHED with a single click. A confirmation dialog appears if transcription or quiz generation is not yet complete.
- AC-CMS-06-1: PUBLISHED content can be moved back to DRAFT status, immediately removing it from student view.
- AC-CMS-11-1: Content can be deleted. Deletion is a soft delete (deleted_at timestamp set) to preserve referential integrity for student progress records.

### Supplementary Materials (US-CMS-07, US-CMS-15)

- AC-CMS-07-1: Mentors can upload multiple supplementary files per video. Supported formats: PDF, DOCX, PPTX. Maximum file size: 50MB per file.
- AC-CMS-15-1: Students see a list of supplementary files in a dedicated tab below the video player. Clicking a file name initiates a download.

### Transcription and Reordering (US-CMS-08, US-CMS-09, US-CMS-10)

- AC-CMS-08-1: Once transcription is complete, the transcript is displayed in an editable text area. Mentors can correct spelling errors or technical terms.
- AC-CMS-08-2: Saving transcript edits triggers a recalculation of the content hash, which will trigger quiz regeneration if it has already been run.
- AC-CMS-09-1: The content list shows a status badge for each item: Uploading, Transcribing, Generating Quizzes, Quizzes Ready, or Ready to Publish.
- AC-CMS-10-1: Mentors can change the sequence of content within a batch using a drag-and-drop interface. The new order is saved to the database immediately.

### Student Content Experience (US-CMS-12, US-CMS-13, US-CMS-14)

- AC-CMS-12-1: The student content library only displays PUBLISHED content.
- AC-CMS-13-1: The video player supports full-screen mode, volume control, and playback speed adjustment (0.5x to 2.0x).
- AC-CMS-14-1: Content completion is tracked automatically. A video is marked as COMPLETED for a student when they have watched at least 90 percent of the total duration.
- AC-CMS-14-2: Completion status is displayed as a green checkmark next to the content title in the student library.

---

# 4. Business Rules
*From docs/Features_SubDocument.md*

**BR-CMS-01:** Content is batch-scoped. While the same video file can be used in multiple batches, each batch has its own Content record to allow for different learning objectives, transcripts, and quiz sets per batch.

**BR-CMS-02:** Transcription is mandatory for all VIDEO content. The AI quiz generation system cannot operate without a transcript. Content that fails transcription cannot proceed to the quiz generation stage.

**BR-CMS-03:** Content can be published before quizzes are ready. This allows students to begin watching material immediately while the mentor is still reviewing generated questions. A disclaimer appears for the student: "Quizzes for this content will be available soon."

**BR-CMS-04:** Deleting a piece of content does not delete the associated student progress data (e.g., that a student completed it). The historical record is preserved for metrics purposes.

**BR-CMS-05:** Students cannot skip ahead to content that appears later in the curriculum sequence if "Sequential Learning" is enabled for the batch (optional admin setting).

---

# 5. Core Functionality
*From features/F03_Content_Management_System.md*

The CMS manages four types of content:

1.  **VIDEO:** The primary learning format. Mentor-recorded or lecture
    videos uploaded as MP4, MOV, or WebM files.
2.  **DOCUMENT:** Supplementary learning materials — PDFs, DOCX files,
    slide decks.
3.  **RESOURCE:** External reference links, GitHub repositories, reading
    lists.
4.  **LIVE_RECORDING:** Automatically created content records when a live
    session ends.

---

# 6. Data Model
*Refer to docs/Database_Schema.md for the authoritative version.*

The CMS relies on the `content`, `content_access_logs`, and
`supplementary_files` tables.

---

# 7. API Endpoints
*Refer to docs/API_Endpoints.md for the authoritative version.*

Key endpoints:
- `POST /api/content/upload-url` (S3 Pre-signed)
- `POST /api/content` (Finalize registration)
- `GET /api/batches/:batchId/content`
- `PATCH /api/content/:contentId/transcript`
- `PATCH /api/content/:contentId/progress` (Student watch time)

---

# 8. Frontend Components
*From features/F03_Content_Management_System.md*

## 8.1 Component Structure
```
src/
├── app/
│   ├── mentor/
│   │   └── batches/
│   │       └── [batchId]/
│   │           ├── content/
│   │           │   ├── page.tsx           (content library)
│   │           │   ├── upload/
│   │           │   │   └── page.tsx       (upload page)
│   │           │   └── [contentId]/
│   │           │       ├── page.tsx       (content detail)
│   │           │       └── transcript/
│   │           │           └── page.tsx   (transcript editor)
│   └── student/
│       └── batches/
│           └── content/
│               ├── page.tsx               (content library)
│               └── [contentId]/
│                   └── page.tsx           (content viewer)
├── components/
│   └── content/
│       ├── VideoUploader.tsx
│       ├── UploadProgressBar.tsx
│       ├── ContentCard.tsx
│       ├── ContentStatusBadge.tsx
│       ├── ContentList.tsx
│       ├── VideoPlayer.tsx
│       ├── TranscriptEditor.tsx
│       ├── SupplementaryFilesList.tsx
```

---

# 9. Implementation Steps
*From features/F03_Content_Management_System.md*

### Step 1 — Storage and Database (Day 1)

1.  Configure AWS S3 bucket and CloudFront distribution.
2.  Define `content` and `supplementary_files` tables.
3.  Implement `S3Service` for pre-signed URL generation.

### Step 2 — Upload Pipeline (Day 1)

1.  Implement `upload-url` endpoint.
2.  Implement `VideoUploader` component with direct-to-S3 logic.
3.  Implement callback endpoint to finalize content registration.

### Step 3 — Transcription Worker (Day 2)

1.  Set up Bull queue for transcription jobs.
2.  Implement Whisper-based transcription worker.
3.  Implement transcript editor UI for mentors.

### Step 4 — Student Viewing Experience (Day 3)

1.  Integrate video player (e.g., Video.js or Mux Player).
2.  Implement watch-time tracking and progress reporting.
3.  Build student content library view.

---

# 10. Error Handling
*From features/F03_Content_Management_System.md*

- **400 Bad Request:** Unsupported file type, file too large.
- **403 Forbidden:** Mentor attempting to upload to a batch they don't own.
- **502 Bad Gateway:** S3 upload failed, transcription service unavailable.

---

# 11. Testing Strategy
*Refer to docs/Testing_And_QA_Guide.md for the authoritative version.*

Key tests:
- Successful 2-step upload (URL generation + S3 PUT).
- Verify transcription worker handles long videos (> 30 mins).
- Verify 90% watch-time marks content as COMPLETED.
- Verify soft delete hides content from students but keeps logs.

---

# 12. Performance Optimization
*From features/F03_Content_Management_System.md*

- **S3 Pre-signed URLs:** Avoids routing heavy binary data through the Node.js server.
- **CDN Delivery:** CloudFront reduces latency and S3 egress costs.
- **Transcript Indexing:** Use GIN indexes if full-text search on transcripts is needed.
- **Debounced Progress:** Track watch time every 30s to avoid hammering the API.
