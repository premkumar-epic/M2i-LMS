# M2i_LMS — Deployment Runbook

### Version 1.0 | March 2026

### Save As: Developer_Guides/M2i_LMS_Deployment_Runbook.md

---

# Table of Contents

1. [Overview](#1-overview)
2. [Infrastructure Reference](#2-infrastructure-reference)
3. [First-Time Production Deployment](#3-first-time-production-deployment)
4. [Routine Version Deployment](#4-routine-version-deployment)
5. [Database Migration Procedure](#5-database-migration-procedure)
6. [Rolling Back a Bad Deployment](#6-rolling-back-a-bad-deployment)
7. [Restoring from Database Backup](#7-restoring-from-database-backup)
8. [AI Instance Management](#8-ai-instance-management)
9. [When Things Go Wrong](#9-when-things-go-wrong)
10. [Health Monitoring Checklist](#10-health-monitoring-checklist)

---

# 1. Overview

This runbook covers every deployment scenario for M2i_LMS.
Read sections 2 and 3 before the first production deployment.
Section 4 is the routine procedure used for every version
after that. Sections 5-9 are emergency procedures — read
them before you need them, not during an incident.

**Golden rules:**

- Never run database migrations without a backup
- Never deploy to production on a Friday afternoon
- Never deploy to production without testing on staging first
- When in doubt, roll back first and diagnose second

---

# 2. Infrastructure Reference

```
Service           Provider      Instance          Region
──────────────────────────────────────────────────────────
Backend API       AWS EB        t3.medium         ap-south-1
Frontend          Vercel        Auto-scaled        Global CDN
Database          AWS RDS       db.t3.medium      ap-south-1
Redis             AWS           cache.t3.micro    ap-south-1
                  ElastiCache
AI Processing     AWS EC2       g4dn.xlarge       ap-south-1
                                (GPU)
File Storage      AWS S3        Standard          ap-south-1
CDN               AWS           PriceClass_200    Global
                  CloudFront
```

**Access:**

```
AWS Console    : https://console.aws.amazon.com
                 Account ID: [stored in team password manager]
Vercel         : https://vercel.com/your-org/m2i-lms-frontend
RDS endpoint   : [stored in team password manager]
EC2 AI server  : ssh -i m2i-key.pem ubuntu@[AI-SERVER-IP]
```

---

# 3. First-Time Production Deployment

## Step 1 — AWS Infrastructure Setup

```bash
# 1. Create S3 bucket
aws s3 mb s3://m2i-lms-content-prod --region ap-south-1
aws s3api put-bucket-encryption \
  --bucket m2i-lms-content-prod \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# Block all public access
aws s3api put-public-access-block \
  --bucket m2i-lms-content-prod \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,\
BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Add lifecycle rule to clean up temp audio files
aws s3api put-bucket-lifecycle-configuration \
  --bucket m2i-lms-content-prod \
  --lifecycle-configuration file://s3-lifecycle.json

# 2. Create RDS PostgreSQL instance (via AWS Console or CLI)
# Instance: db.t3.medium, PostgreSQL 15, 20GB SSD
# Enable automated backups with 7-day retention
# Enable Multi-AZ for production reliability

# 3. Create ElastiCache Redis cluster
# Node: cache.t3.micro, Redis 7, single-node for Phase One
```

## Step 2 — AI Server Setup

```bash
# SSH into the GPU instance
ssh -i m2i-key.pem ubuntu@[AI-SERVER-IP]

# Install system dependencies
sudo apt-get update
sudo apt-get install -y ffmpeg python3 python3-pip git

# Install PyTorch (CUDA version)
pip3 install torch --index-url \
  https://download.pytorch.org/whl/cu118

# Install Whisper
pip3 install openai-whisper

# Verify Whisper
python3 -c "import whisper; print('Whisper OK')"

# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
sudo systemctl enable ollama
sudo systemctl start ollama

# Pull Mistral 7B (downloads ~4GB)
ollama pull mistral:7b-instruct-v0.2-q4_K_M

# Verify
ollama list

# Configure Ollama to listen on all interfaces
# (so backend EC2 instance can reach it)
echo "OLLAMA_HOST=0.0.0.0" | sudo tee -a /etc/ollama/ollama.env
sudo systemctl restart ollama

# IMPORTANT: Configure security group to allow
# traffic from backend EC2 only (port 11434)
# Do NOT expose Ollama to the public internet
```

## Step 3 — First Backend Deployment

```bash
# From local machine with AWS CLI configured

# 1. Build the backend
cd backend
npm ci
npm run build

# 2. Run migrations on production database
DATABASE_URL="[PRODUCTION_DATABASE_URL]" \
  npx prisma migrate deploy

# 3. Create production environment in Elastic Beanstalk
# (first time only — subsequent deploys use Step 4)
eb init m2i-lms-backend --region ap-south-1 --platform node.js
eb create m2i-lms-production

# 4. Set all environment variables
eb setenv \
  NODE_ENV=production \
  PORT=3001 \
  DATABASE_URL="[VALUE]" \
  JWT_SECRET="[VALUE]" \
  JWT_REFRESH_SECRET="[VALUE]" \
  REDIS_HOST="[VALUE]" \
  AWS_REGION=ap-south-1 \
  AWS_ACCESS_KEY_ID="[VALUE]" \
  AWS_SECRET_ACCESS_KEY="[VALUE]" \
  S3_BUCKET_NAME=m2i-lms-content-prod \
  CLOUDFRONT_DOMAIN="[VALUE]" \
  MUX_TOKEN_ID="[VALUE]" \
  MUX_TOKEN_SECRET="[VALUE]" \
  OLLAMA_URL="http://[AI-SERVER-PRIVATE-IP]:11434" \
  WHISPER_MODEL=medium \
  LOG_LEVEL=info

# 5. Deploy
eb deploy

# 6. Verify health
eb health
curl https://api.m2ilms.com/api/health
```

## Step 4 — First Frontend Deployment

```bash
# From local machine
cd frontend

# 1. Connect to Vercel (first time only)
npx vercel link

# 2. Set environment variables in Vercel dashboard:
#    NEXT_PUBLIC_API_URL=https://api.m2ilms.com
#    NEXT_PUBLIC_SOCKET_URL=https://api.m2ilms.com
#    NEXT_PUBLIC_APP_NAME=M2i LMS
#    NEXT_PUBLIC_APP_ENV=production

# 3. Deploy
npx vercel --prod

# Subsequent deploys are automatic via GitHub Actions
```

## Step 5 — Production Verification

```bash
# 1. Health check
curl https://api.m2ilms.com/api/health
# Expected: {"status":"ok"}

# 2. Login test
curl -s -X POST https://api.m2ilms.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"[SUPER_ADMIN_EMAIL]","password":"[PASSWORD]"}'
# Expected: {"success":true,"data":{...}}

# 3. Frontend loads
# Open https://app.m2ilms.com in browser
# Expected: Login page renders

# 4. Change super admin password immediately
# Login → Profile → Change Password
```

---

# 4. Routine Version Deployment

Use this procedure for every version deployment after the
first. Estimated time: 15-20 minutes.

## Pre-Deployment Checklist

```
□ All CI checks passing on main branch
□ Staging deployment tested and verified
□ Database migrations (if any) reviewed by Tech Lead
□ No active live sessions scheduled in next 30 minutes
□ Team is aware deployment is happening
□ Rollback plan confirmed (what is the previous version?)
```

## Deployment Steps

```bash
# STEP 1: Take a database snapshot before any migration
aws rds create-db-snapshot \
  --db-instance-identifier m2i-lms-production \
  --db-snapshot-identifier m2i-lms-pre-deploy-$(date +%Y%m%d%H%M)

# Wait for snapshot to complete (2-5 minutes)
aws rds describe-db-snapshots \
  --db-snapshot-identifier m2i-lms-pre-deploy-$(date +%Y%m%d%H%M) \
  --query 'DBSnapshots[0].Status'
# Wait until output is "available"

# STEP 2: Run database migrations (if any)
DATABASE_URL="[PRODUCTION_DATABASE_URL]" \
  npx prisma migrate deploy
# If this fails: do NOT proceed to step 3, investigate first

# STEP 3: Deploy backend
cd backend
npm run build
eb deploy --staged

# Watch the deployment log
eb logs --all | tail -f

# Wait until deployment shows "Health: Ok"
eb health

# STEP 4: Verify backend is healthy
curl https://api.m2ilms.com/api/health
# Check backend logs for errors:
eb logs | grep -i error

# STEP 5: Frontend deploys automatically via GitHub Actions
# Monitor: https://vercel.com/your-org/m2i-lms-frontend
# Or trigger manually:
cd frontend && npx vercel --prod

# STEP 6: Post-deployment smoke test
# Run through these in the browser (2 minutes):
# 1. Login as admin → dashboard loads
# 2. View batch → students show
# 3. Login as student → content library loads
# 4. Notification bell shows correct count

# STEP 7: Confirm deployment in team Slack
echo "Deployment complete at $(date). Health: OK."
```

---

# 5. Database Migration Procedure

## Before Running Any Migration

```bash
# 1. Check current migration status
DATABASE_URL="[PROD_URL]" npx prisma migrate status

# 2. Review what the migration does
cat backend/prisma/migrations/[migration_name]/migration.sql

# 3. Is this a destructive migration?
#    - DROP TABLE: must have verified data is backed up
#    - DROP COLUMN: must have verified column is unused
#    - ALTER COLUMN with type change: test on staging first
#    - ADD COLUMN NOT NULL without DEFAULT: will fail on
#      existing rows — add DEFAULT or make nullable first

# 4. Take a snapshot (always, no exceptions)
aws rds create-db-snapshot \
  --db-instance-identifier m2i-lms-production \
  --db-snapshot-identifier pre-migration-$(date +%Y%m%d%H%M%S)
```

## Running the Migration

```bash
# Run in a screen session in case connection drops
screen -S migration

DATABASE_URL="[PROD_URL]" npx prisma migrate deploy

# If successful:
echo "Migration complete"

# If failed:
# Do NOT try to fix the broken migration manually
# Roll back to the snapshot from step 4
```

## After Migration

```bash
# Verify migration applied correctly
DATABASE_URL="[PROD_URL]" npx prisma migrate status
# All migrations should show "Applied"

# Quick table check
psql [PROD_URL] -c "\dt"
# Verify all expected tables exist
```

---

# 6. Rolling Back a Bad Deployment

## Scenario A: Bad Backend Code (No Migration)

```bash
# Elastic Beanstalk keeps the previous version
# Roll back to it:
eb list  # Lists available versions
eb deploy [PREVIOUS_VERSION_LABEL]

# Verify
curl https://api.m2ilms.com/api/health
```

## Scenario B: Bad Migration Applied

```bash
# This is the nuclear option — only use if migration
# caused data corruption or application failure

# STEP 1: Stop the backend (prevent more writes)
eb setenv MAINTENANCE_MODE=true
# (Requires a maintenance mode middleware that returns 503)

# STEP 2: Identify the pre-migration snapshot
aws rds describe-db-snapshots \
  --query 'DBSnapshots[*].[DBSnapshotIdentifier,SnapshotCreateTime,Status]' \
  --output table

# STEP 3: Restore from snapshot
# This creates a NEW RDS instance from the snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier m2i-lms-production-restored \
  --db-snapshot-identifier pre-migration-[TIMESTAMP]

# STEP 4: Wait for restore to complete (10-30 minutes)
aws rds describe-db-instances \
  --db-instance-identifier m2i-lms-production-restored \
  --query 'DBInstances[0].DBInstanceStatus'

# STEP 5: Update backend environment to point to restored DB
eb setenv DATABASE_URL="[RESTORED_DB_URL]"

# STEP 6: Re-deploy previous backend version
eb deploy [PREVIOUS_VERSION_LABEL]

# STEP 7: Disable maintenance mode
eb setenv MAINTENANCE_MODE=false

# STEP 8: Verify and notify team
curl https://api.m2ilms.com/api/health
echo "Rollback complete. [X] minutes of data lost."
```

**Important:** A database restore means all data written
between the snapshot and the restore point is permanently
lost. Always communicate this clearly to the team and any
affected users.

---

# 7. Restoring from Database Backup

AWS RDS takes automatic daily backups with 7-day retention.

```bash
# List available automated backups
aws rds describe-db-instance-automated-backups \
  --db-instance-identifier m2i-lms-production \
  --query 'DBInstanceAutomatedBackups[*].[RestoreWindow]'

# Point-in-time restore to a specific timestamp
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier m2i-lms-production \
  --target-db-instance-identifier m2i-lms-restored \
  --restore-time 2026-04-14T02:00:00Z

# Update backend environment to point to restored instance
eb setenv DATABASE_URL="[RESTORED_INSTANCE_URL]"
```

---

# 8. AI Instance Management

## Restart Ollama After Crash

```bash
ssh -i m2i-key.pem ubuntu@[AI-SERVER-IP]

# Check status
sudo systemctl status ollama

# Restart
sudo systemctl restart ollama

# Verify model is loaded
ollama list
curl http://localhost:11434/api/tags
```

## Upgrade Whisper Model

```bash
ssh -i m2i-key.pem ubuntu@[AI-SERVER-IP]

# Download new model
pip3 install --upgrade openai-whisper

# Test with large model
python3 -m whisper /tmp/test.mp3 --model large-v2 --output_format json

# If quality is acceptable, update backend env var
eb setenv WHISPER_MODEL=large-v2
```

## When AI Instance Goes Down

If the AI EC2 instance is unavailable:

1. Content uploads continue to work (videos stored in S3)
2. Transcription jobs queue in Bull (they will not be lost)
3. Quiz generation jobs queue in Bull (they will not be lost)
4. When AI instance recovers, Bull processes the queued jobs automatically
5. Maximum queue size: 100 jobs before Bull starts rejecting
6. **Action required:** If downtime exceeds 30 minutes, notify mentors
   that transcription is delayed via a manual notification

---

# 9. When Things Go Wrong

## High CPU on Backend EC2

```bash
# Check which process is high
top

# Check for stuck Bull jobs
# Open https://api.m2ilms.com/admin/queues (admin login)
# Look for jobs stuck in "active" state for > 10 minutes
# Click "Retry" on stuck jobs

# If memory is the issue, check for memory leaks
pm2 monit  # (if using PM2)
# Or: eb logs | grep "JavaScript heap out of memory"

# Emergency: restart the backend process
eb restart  # Restarts app server without redeploying
```

## Database Connections Exhausted

```bash
# Symptom: "Too many connections" error in logs

# Check current connections
psql [PROD_URL] -c "SELECT count(*) FROM pg_stat_activity;"

# Kill idle connections
psql [PROD_URL] -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'm2i_lms'
  AND state = 'idle'
  AND state_change < NOW() - INTERVAL '10 minutes';"

# Reduce pool size in backend env
eb setenv DATABASE_POOL_MAX=5

# Long-term fix: Investigate connection leaks in Prisma
# Look for queries not properly awaited
```

## Redis Connection Lost

```bash
# Symptom: Bull queue errors, Socket.io rooms lost

# Check ElastiCache status
aws elasticache describe-cache-clusters \
  --cache-cluster-id m2i-lms-redis

# Test connection from backend EC2
ssh into backend EC2:
redis-cli -h [REDIS_HOST] ping
# Expected: PONG

# If Redis is down, Bull jobs are queued in memory temporarily
# They are lost if the backend restarts before Redis recovers
# ElastiCache typically auto-recovers within 2-5 minutes
```

---

# 10. Health Monitoring Checklist

Run this checklist daily during the beta period.

```bash
# Morning health check (5 minutes)

# 1. Backend health
curl https://api.m2ilms.com/api/health
# Expected: {"status":"ok"}

# 2. Database health (requires admin cookie)
curl -b admin_cookie https://api.m2ilms.com/api/health/db
# Expected: {"status":"ok","latency_ms": < 50}

# 3. Queue health
curl -b admin_cookie https://api.m2ilms.com/api/health/queues
# Check: no jobs stuck in "active" for > 30 minutes
#        no more than 10 failed jobs in last 24 hours

# 4. Check last nightly metrics run
psql [PROD_URL] -c "
SELECT run_type, students_processed, students_failed,
       duration_ms, started_at, error_message
FROM metrics_calculation_logs
ORDER BY started_at DESC
LIMIT 3;"
# Expected: students_failed = 0, error_message IS NULL

# 5. Check for student alerts requiring mentor attention
psql [PROD_URL] -c "
SELECT alert_type, COUNT(*) as count
FROM student_alerts
WHERE is_resolved = FALSE
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY alert_type;"

# 6. Verify Ollama is responsive
ssh ubuntu@[AI-SERVER-IP] \
  "curl -s http://localhost:11434/api/tags | jq '.models[0].name'"
# Expected: model name printed

# 7. Check S3 for failed uploads (content stuck in PROCESSING)
psql [PROD_URL] -c "
SELECT id, title, transcription_status, transcription_error,
       updated_at
FROM content
WHERE transcription_status IN ('PROCESSING', 'FAILED')
  AND updated_at < NOW() - INTERVAL '4 hours';"
# Any rows here = stuck pipeline, investigate

# 8. Check disk space on AI instance
ssh ubuntu@[AI-SERVER-IP] "df -h / | tail -1"
# Expected: Use% < 80%
```

---

**End of Deployment Runbook**

---

**Document Information**


| Field          | Value                                                |
| -------------- | ---------------------------------------------------- |
| Document Title | M2i_LMS Deployment Runbook                           |
| Version        | 1.0                                                  |
| Status         | Ready                                                |
| Created        | March 2026                                           |
| Maintained By  | Tech Lead                                            |
| Repository     | /docs/Developer_Guides/M2i_LMS_Deployment_Runbook.md |
