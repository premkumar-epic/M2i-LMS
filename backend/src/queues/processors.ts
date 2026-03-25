// backend/src/queues/processors.ts
// Registers all Bull queue processors/workers.
// Imported by server.ts on startup BEFORE any jobs are added.

// Content processing queue (AI pipeline — F03/F04)
// import "./contentProcessingWorker";

// Metrics calculation queue (F09)
// import "./metricsWorker";

// Notification queue (F10)
// import "./notificationWorker";

console.log("[Queues] Queue processors registered (workers pending implementation)");
