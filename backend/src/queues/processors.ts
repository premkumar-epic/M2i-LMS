// backend/src/queues/processors.ts
// Registers all Bull queue processors/workers.
// Imported by server.ts on startup BEFORE any jobs are added.
// Queues are initialized in queues.ts — import this file to ensure instances exist.

import "./queues";
import "./contentProcessingWorker";
import "./notificationWorker";

// Metrics calculation queue (F09 — Week 6)
// import "./metricsWorker";

// Live session queue (F06 — Week 5)
// import "./sessionWorker";

import { logger } from "../lib/logger";
logger.info("[Queues] Queue processors registered");
