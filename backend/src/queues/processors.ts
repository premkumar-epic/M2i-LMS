// backend/src/queues/processors.ts
// Registers all Bull queue processors/workers.
// Imported by server.ts on startup BEFORE any jobs are added.
// Queues are initialized in queues.ts — import this file to ensure instances exist.

import "./queues";
import { logger } from "../lib/logger";

// Content processing queue (AI pipeline — F03/F04)
// import "./contentProcessingWorker";

// Metrics calculation queue (F09)
// import "./metricsWorker";

// Live session queue (F06)
// import "./sessionWorker";

// Notification queue (F10)
// import "./notificationWorker";

logger.info("[Queues] Queue processors registered (workers pending implementation)");
