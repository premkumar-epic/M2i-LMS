# M2i_LMS — AI Tool Orchestration Workflows
### Version 1.0 | March 2026
### Save As: Developer_Guides/M2i_LMS_AI_Orchestration_Workflows.md

---

# Table of Contents

1.  [Tool Analysis and Role Assignment](#1-tool-analysis-and-role-assignment)
2.  [Your Credit and Token Reality Check](#2-your-credit-and-token-reality-check)
3.  [Flow 1 — Solo Full-Stack Developer](#3-flow-1--solo-full-stack-developer)
4.  [Flow 2 — Backend Developer with Tool Team](#4-flow-2--backend-developer-with-tool-team)
5.  [Token and Credit Management System](#5-token-and-credit-management-system)
6.  [OpenCode Configuration File](#6-opencode-configuration-file)
7.  [Daily Operating Procedure](#7-daily-operating-procedure)
8.  [Switching Rules — When to Change Tools](#8-switching-rules--when-to-change-tools)
9.  [Task Routing Quick Reference](#9-task-routing-quick-reference)

---

# 1. Tool Analysis and Role Assignment

Based on independent developer reviews, benchmarks, and
community feedback gathered from real usage across 2025
and early 2026, here is what each tool in your stack is
genuinely good and bad at.

## Claude Code (Pro Plan)

**Strengths confirmed by reviews:**
- Highest first-try code correctness rate (~95% vs
  50-60% for Gemini, 60-70% for Codex)
- Best for multi-file changes that need to stay
  coherent across the whole codebase
- Best Git understanding — writes meaningful commit
  messages, groups logical changes correctly
- Best complex backend reasoning (business logic,
  service architecture, Prisma queries)
- Best debugging of subtle errors across multiple files
- Best pair programming for complex features

**Weaknesses:**
- Most expensive — Pro plan credits run out fastest
  on heavy usage
- No free fallback tier
- Can be slower for large agentic tasks

**Assigned role in your workflows:**
Complex backend logic, service files, algorithm
implementation, multi-file refactoring, debugging
hard errors. The "expensive but reliable" tool you
reach for when correctness matters most.

---

## Gemini CLI (AI Ultra / AI Pro Student Plan)

**Strengths confirmed by reviews:**
- 1 million token context window — unbeatable for
  large codebase exploration
- Best for understanding a large existing codebase
  you have not read before
- Best for large-scale refactoring across many files
  simultaneously
- Grounded in Google Search — can look up current
  best practices in real time
- Best for frontend work referencing Figma exports,
  screenshots, design PDFs (strongest multimodal CLI)
- Free or very generous tier — large usage budget
- Best for generating up-to-date deployment configs
  and infrastructure-as-code

**Weaknesses:**
- Higher error rate than Claude Code for complex logic
- Less reliable for intricate backend reasoning
- UI has had stability issues in some users' experience
- Needs more iterations to get to correct code

**Assigned role in your workflows:**
Large codebase exploration, frontend component work
with design references, infrastructure and DevOps
configs, anything requiring searching the current web
for up-to-date practices, and as the primary fallback
when Claude Code credits are low.

---

## OpenCode (Free Plan)

**Strengths confirmed by reviews:**
- Model-agnostic — can use Claude, Gemini, or any
  other provider through one interface
- Best token visibility — built-in token tracking,
  context compaction, usage stats
- Best for switching models mid-task to control costs
- Automatic context compaction when approaching limits
- Open source — no vendor lock-in
- Plan/Build dual-mode: Plan agent (read-only,
  architecture thinking) + Build agent (writes code)
- Fastest UI among all CLI tools tested
- Best for running local Ollama models (zero cost)

**Weaknesses:**
- Performance depends entirely on which model you
  route through it
- Free plan has provider usage limits

**Assigned role in your workflows:**
The control layer. Use OpenCode as your interface
when you want to switch between providers mid-session,
monitor token burn rate, or run local models.
Specifically: local Ollama runs for simple tasks
(zero cost), and as the router when you need to
switch from Claude to Gemini to save credits.

---

## Codex / OpenAI Codex (Go / Free Plan)

**Strengths confirmed by reviews:**
- Autonomous cloud agent — works independently,
  reports back when done (not a pair programmer)
- Best for complete feature delivery with tests and
  documentation in one shot
- Native GitHub Actions / CI-CD pipeline integration
  is the tightest of all tools
- Good for generating full features from a spec
  when you do not want to supervise step by step
- GPT-5-Codex trained specifically on real-world
  software engineering tasks

**Weaknesses:**
- UX feels less polished and informative than Claude
- Inconsistent — results vary more between runs
- Free plan has limited usage
- Requires identity verification for some features
- Not ideal for pair programming or back-and-forth

**Assigned role in your workflows:**
Fire-and-forget tasks. CI/CD pipeline setup,
GitHub Actions workflows, writing full test suites
from a spec, generating boilerplate for a new
feature end-to-end. You give it a complete spec
and let it run while you do other work.

---

## Summary Capability Matrix
```
Task                          Best Tool      Fallback
─────────────────────────────────────────────────────
Complex service logic         Claude Code    OpenCode+Claude
Multi-file refactor (large)   Gemini CLI     OpenCode+Gemini
Simple backend boilerplate    OpenCode+Ollama Gemini CLI
Frontend components           Gemini CLI     Claude Code
Frontend + design file ref    Gemini CLI     Claude Code
Database schema / Prisma      Claude Code    Gemini CLI
Algorithm implementation      Claude Code    Gemini CLI
CI/CD pipeline setup          Codex          Gemini CLI
GitHub Actions workflows      Codex          Gemini CLI
Writing full test suites      Codex          OpenCode+Claude
Debugging subtle errors       Claude Code    Gemini CLI
Large codebase exploration    Gemini CLI     OpenCode+Gemini
Infrastructure / DevOps       Gemini CLI     Codex
API endpoint implementation   Claude Code    OpenCode+Claude
Quiz generation pipeline      Claude Code    Gemini CLI
Metrics algorithms            Claude Code    OpenCode+Claude
Quick small tasks / scripts   OpenCode+Ollama Gemini CLI
Documentation generation      Gemini CLI     Claude Code
```

---

# 2. Your Credit and Token Reality Check

Before looking at the workflows, understand what you
actually have in terms of budget and when each pool
runs out.

## What You Have
```
Tool            Plan              Credit Type
────────────────────────────────────────────────────
Claude Code     Pro               Fixed monthly credits
                                  Resets monthly
                                  Fastest to exhaust on
                                  heavy agentic use

Gemini CLI      AI Ultra / Pro    Very generous free
                                  tier + quota
                                  1M context window
                                  Reliable fallback

OpenCode        Free              No direct cost —
                                  pays through provider
                                  (Claude or Gemini API)
                                  Local Ollama = FREE
                                  forever

Codex           Go / Free         Limited free calls
                                  per day/month
```

## Credit Burn Rate Estimate for M2i_LMS

Based on the project complexity:
```
Task                        Claude Cost    Gemini Cost
───────────────────────────────────────────────────────
Implementing one service    High           Medium
  file (e.g., BatchService)
Debugging a hard error      Medium         Low-Medium
Exploring whole codebase    Very High      Low (1M ctx)
Writing test suite          High           Medium
Frontend component          Medium         Low
Simple script / util        Low            Very Low
CI/CD pipeline setup        Low            Very Low
```

**Practical rule:** You will exhaust Claude Code Pro
credits within 2-3 days of heavy feature development
if you use it for everything. The workflows below
are designed so that Gemini and OpenCode+Ollama handle
the high-volume low-complexity work, preserving Claude
credits for tasks where its superior reasoning is
actually worth the cost.

---

# 3. Flow 1 — Solo Full-Stack Developer

This is your mode. You are the single human operator
handling frontend, backend, database, DevOps, CI/CD,
and everything else. The tools act as your specialized
sub-agents.

## 3.1 The Mental Model

Think of yourself as the tech lead running a team of
four specialists:
```
YOU (Orchestrator / Tech Lead)
  │
  ├── Claude Code (Senior Backend Engineer)
  │     Handles: Complex logic, multi-file coherent changes
  │     Cost: High — use deliberately
  │
  ├── Gemini CLI (Frontend + DevOps Engineer)
  │     Handles: UI components, infra, large exploration
  │     Cost: Low — use freely
  │
  ├── OpenCode (Tools Manager / Cost Controller)
  │     Handles: Local tasks, model switching, token control
  │     Cost: Free (Ollama) or passes through to Claude/Gemini
  │
  └── Codex (Autonomous Agent)
        Handles: CI/CD, test suites, boilerplate generation
        Cost: Low — fire and forget
```

## 3.2 Session Start Procedure

Every morning before starting work:
```bash
# Step 1: Check Claude Code credit balance
# Open Claude.ai → Settings → Usage
# Note: XX% of monthly credits remaining

# Step 2: Start your services
docker compose up -d postgres redis
ollama serve &

# Step 3: Open three terminal panes (tmux or split terminals)
# Pane 1: Claude Code (for deep backend work)
# Pane 2: Gemini CLI (for frontend / exploration)
# Pane 3: OpenCode (for everything else / local)

# Step 4: Look at today's tasks and route them
# (see routing table in section 3.3)
```

## 3.3 Task Routing Decision Tree
```
New task arrives
      │
      ▼
Is this task touching multiple files and
requiring coherent architecture reasoning?
      │
   YES │                    NO
      ▼                      ▼
Use Claude Code         Is it frontend/UI work
                        or requires design refs?
                              │
                           YES │         NO
                              ▼           ▼
                        Gemini CLI    Is it CI/CD,
                                      tests, or
                                      full feature
                                      boilerplate?
                                           │
                                        YES │    NO
                                           ▼      ▼
                                         Codex   Is it simple
                                                 (< 50 lines,
                                                 obvious logic)?
                                                      │
                                                   YES │   NO
                                                      ▼     ▼
                                              OpenCode+   Back to
                                              Ollama     Claude Code
```

## 3.4 Feature Development Workflow (Example: Building F07 Quiz Taking)

**This is how you actually build a feature using the tools.**
```
STEP 1 — Architecture planning (Gemini CLI)
  Why: Explore the whole codebase to understand context.
       Gemini's 1M token window holds all 20 tables and
       related files simultaneously.

  Command:
  gemini
  > Read all files in backend/src/services/ and
    backend/prisma/schema.prisma. Understand the existing
    patterns. Then explain how I should structure the
    QuizTakingService to fit this codebase.

  Output: Architecture notes. You review and approve.
  Cost: Low (Gemini)

STEP 2 — Validation schema (OpenCode + Ollama)
  Why: Simple Joi schema — no reasoning required.
       Use local Ollama = zero cost.

  Command:
  opencode
  > /model ollama/mistral
  > Write the Joi validation schema for the quiz
    submission endpoint based on this spec:
    [paste spec from API Endpoints doc]

  Output: Validation schema file. Review and paste in.
  Cost: Zero (local Ollama)

STEP 3 — Service implementation (Claude Code)
  Why: QuizTakingService has complex display-index to
       canonical-index mapping, idempotency logic,
       and atomic transactions. This is where Claude's
       reasoning superiority matters.

  Command:
  claude
  > Implement QuizTakingService following this spec:
    [paste F07 service spec]
    Match the patterns in BatchService.ts exactly.

  Output: Complete service file. Review, test, commit.
  Cost: High (Claude Code) — worth it for this complexity

STEP 4 — Controller and routes (OpenCode + Claude)
  Why: Controller is mostly boilerplate wrapping the
       service. Still route through Claude because it
       needs to match the service exactly.

  Command in OpenCode:
  > /model anthropic/claude-sonnet-4-5
  > Write the QuizTakingController wrapping this service.
    Follow the exact pattern in BatchController.ts.

  Cost: Medium (Claude via OpenCode)

STEP 5 — Frontend quiz question component (Gemini CLI)
  Why: React component with styling. No complex logic.
       If you have a Figma screenshot of the design,
       Gemini can take it as an image input.

  Command:
  gemini
  > [drag Figma screenshot into terminal]
  > Build the QuizQuestion.tsx component matching this
    design. Use Tailwind. Follow the pattern in
    DimensionCard.tsx.

  Cost: Low (Gemini)

STEP 6 — Unit tests (Codex)
  Why: Test suite generation from spec is exactly what
       Codex is built for. Fire and forget while you
       work on the next task.

  Command:
  codex "Write comprehensive unit tests for
         QuizTakingService covering:
         - display index to canonical index mapping
         - idempotency on duplicate attempt_id
         - score calculation correctness
         - NOT_ENROLLED access check
         Follow the test patterns in auth.service.test.ts"

  Output: Test file, review when Codex finishes.
  Cost: Low (Codex)

STEP 7 — Integration and cleanup (Claude Code)
  Why: Wire everything together, verify cross-file
       coherence, fix any issues found in testing.

  Cost: Medium (Claude Code)
```

## 3.5 Daily Credit Budget

Structure your day to match your Claude balance:
```
FULL CREDITS (> 70% remaining)
  Use Claude Code freely for Steps 3, 4, 7.
  Route everything else as normal.

MEDIUM CREDITS (40-70% remaining)
  Claude Code: Backend service logic only.
  Move controller generation to OpenCode+Gemini.
  Move simple debugging to Gemini.

LOW CREDITS (20-40% remaining)
  Claude Code: Only for bugs you cannot solve elsewhere.
  All new code: OpenCode+Gemini or Gemini CLI directly.
  Simple tasks: OpenCode+Ollama.

CRITICAL CREDITS (< 20% remaining)
  Claude Code: Off. Do not use until reset.
  Gemini CLI: Primary tool for all coding.
  OpenCode+Gemini: Secondary.
  Save remaining Claude credits for one critical
  emergency debug if production breaks.
```

---

# 4. Flow 2 — Backend Developer with Tool Team

This is the second mode. A backend developer runs
Claude Code Pro, Gemini CLI (AI Pro student), OpenCode
free, and Codex free. The workflow is narrower —
backend only, no frontend, no DevOps ownership.

## 4.1 The Mental Model
```
BACKEND DEVELOPER (You as Orchestrator)
  │
  ├── Claude Code Pro (Primary Backend Engineer)
  │     Handles: All complex backend — services,
  │     algorithms, debugging
  │     Context: Always loaded with CLAUDE.md
  │     (project context file)
  │
  ├── Gemini CLI (AI Pro Student) (Researcher + Explorer)
  │     Handles: Reading large codebases, understanding
  │     existing patterns before implementing anything,
  │     generating database queries and Prisma schemas
  │
  ├── OpenCode Free (Token Guard)
  │     Handles: Monitoring burn rate, switching to
  │     cheaper models when credits drop, running
  │     Ollama for simple tasks
  │
  └── Codex Go Free (Test Writer + CI Engineer)
        Handles: Test suite generation, GitHub Actions
        workflows, automated tasks run while developer
        focuses elsewhere
```

## 4.2 Backend Task Routing
```
TASK TYPE                    PRIMARY TOOL     WHEN LOW ON CREDITS
────────────────────────────────────────────────────────────────
New service file             Claude Code      OpenCode+Gemini
Controller (complex)         Claude Code      OpenCode+Gemini
Controller (simple wrap)     OpenCode+Ollama  Same
Prisma migration             Gemini CLI       Same (low cost)
Database query optimization  Gemini CLI       Same
Metrics algorithm            Claude Code      Claude Code only
                                              (too important)
Unit tests                   Codex            Same
Integration tests            Codex            Same
API endpoint debugging       Claude Code      Gemini CLI
Background job (worker)      Claude Code      OpenCode+Gemini
Queue setup (boilerplate)    OpenCode+Ollama  Same
Environment variables        OpenCode+Ollama  Same
README / documentation       Gemini CLI       OpenCode+Ollama
```

## 4.3 Starting a Backend Feature (Step-by-Step)

**Example: Implementing F09 Metrics Calculation Engine**
```
PHASE 1 — UNDERSTAND BEFORE YOU BUILD (Gemini CLI)
  Always start here. Never start writing code without
  understanding where it fits.

  gemini
  > Read backend/src/services/ and backend/prisma/schema.prisma
    completely. Then read the F09 implementation guide.
    Summarize: what data does each algorithm need,
    what tables does it read from, and what does it write to?

  This costs almost nothing (Gemini free tier) and
  prevents the most common mistake: writing code that
  does not fit the existing patterns.

PHASE 2 — IMPLEMENT ALGORITHMS (Claude Code)
  The nine metrics algorithms are the most critical
  code in the project. Incorrect algorithms mean
  incorrect student scores. Use Claude.

  claude
  > Implement calculateLearningVelocity() in
    backend/src/utils/algorithms/learningVelocity.ts
    Spec: [paste F09 algorithm spec]
    Test data to validate against: [paste expected values]

  Review the output carefully. Run unit tests.
  Do NOT proceed to the next algorithm if this one
  is not verified correct.

  Repeat for each of the 9 algorithms, one at a time.
  Cost: High but necessary. This is where Claude's
  reasoning superiority directly prevents student
  data errors.

PHASE 3 — WRITE ORCHESTRATION SERVICE (Claude Code)
  MetricsEngineService.calculateStudentMetrics()
  calls all 9 algorithms and does the UPSERT.
  Multi-file, needs to be coherent.

  claude
  > Implement MetricsEngineService using the algorithms
    I just built. Read the existing service files first
    to match the patterns exactly.

PHASE 4 — NIGHTLY JOB AND WORKER (OpenCode + Claude)
  The nightly job is mostly boilerplate structure.
  Use OpenCode to route to Claude but manage context.

  opencode
  > /model anthropic/claude-sonnet-4-5
  > Implement runNightlyMetricsJob() following the
    pattern in notificationCleanup.job.ts
    The logic is described in F09 spec section 6.3.

PHASE 5 — TESTS (Codex)
  Fire Codex at the algorithms while you work on
  the next feature.

  codex "Write comprehensive unit tests for all 9
         metric algorithms in
         backend/tests/unit/algorithms/
         Test the specific scenarios listed in
         F09 Implementation Guide Section 10.
         Match Jest patterns in existing test files."

PHASE 6 — REVIEW AND INTEGRATION (Claude Code)
  After Codex finishes, use Claude to review
  whether the tests are actually meaningful and
  fix any cross-file coherence issues.
```

---

# 5. Token and Credit Management System

## 5.1 OpenCode as Your Token Dashboard

OpenCode has built-in token tracking. Set it up
as your real-time cost monitor.
```bash
# Install OpenCode token monitoring plugin
mkdir -p ~/.config/opencode/command

# Create tokenscope command
cat > ~/.config/opencode/command/tokenscope.md << 'EOF'
---
description: Show token usage and cost for current session
---
Call the tokenscope tool directly and show me:
1. Total tokens used this session
2. Cost estimate
3. Which categories (system, user, tool outputs) are largest
4. How much context window is remaining
ONLY show me the stats, nothing else.
EOF

# Add to opencode.json
cat > ~/.config/opencode/opencode.json << 'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-sonnet-4-5",
  "providers": {
    "anthropic": {
      "apiKey": "YOUR_CLAUDE_API_KEY"
    },
    "google": {
      "apiKey": "YOUR_GEMINI_API_KEY"
    },
    "ollama": {
      "apiUrl": "http://localhost:11434"
    }
  },
  "compaction": {
    "enabled": true,
    "reserved": 20000
  }
}
EOF
```

## 5.2 Model Switching Commands in OpenCode
```bash
# Check which model you are on
/model

# Switch to Gemini (when Claude credits low)
/model google/gemini-2.5-pro

# Switch to local Ollama (zero cost, simple tasks)
/model ollama/mistral

# Switch back to Claude
/model anthropic/claude-sonnet-4-5

# Check token usage in current session
/tokenscope

# Compact context to save tokens
/compact
```

## 5.3 Context Control Strategies

**Strategy 1: Scope your working set**

Instead of opening the whole codebase, tell the tool
exactly which files are relevant:
```bash
# Claude Code: Create CLAUDE.md in project root
cat > CLAUDE.md << 'EOF'
# M2i_LMS Project Context

## Current Focus
Working on F09 Metrics Calculation Engine.

## Relevant Files
- backend/src/services/metricsEngine.service.ts
- backend/src/utils/algorithms/ (all files)
- backend/src/jobs/nightlyMetrics.job.ts
- backend/prisma/schema.prisma (student_progress table)

## Do Not Read Unless Asked
- frontend/ (entire directory)
- backend/src/routes/ (not needed for current task)
- docs/ (reference only when I paste from it)

## Patterns to Follow
- Match BatchService.ts for service structure
- Match auth.service.test.ts for test structure
EOF

# Gemini CLI: Create GEMINI.md
cat > GEMINI.md << 'EOF'
# M2i_LMS Project Context

## Tech Stack
Node.js 20, Express 4, TypeScript 5, Prisma 5,
PostgreSQL 15, Next.js 14, Tailwind CSS 3

## Current Task
[Update this daily with what you are working on]

## File Scope
[List only files relevant to today's work]
EOF
```

**Strategy 2: Use OpenCode context compaction**

When a session gets long and tokens are ballooning,
compact instead of starting a new session:
```bash
# In OpenCode, type:
/compact
# This summarizes the conversation history into a brief
# summary, freeing ~70% of the context window
# while keeping the important decisions intact
```

**Strategy 3: Start fresh sessions per task**

For each new task, start a new session rather than
continuing an old one. This prevents token debt from
accumulating across unrelated tasks.
```bash
# Claude Code: Ctrl+C, restart claude
# Gemini CLI: Ctrl+C, restart gemini
# OpenCode: /exit then restart opencode
```

## 5.4 Credit Threshold Alerts

Set up a simple shell script that checks your Claude
usage and alerts you when you hit thresholds:
```bash
# backend/scripts/check-credits.sh
#!/bin/bash

# You will need to get your usage data from Claude.ai
# dashboard manually and update this number each morning

CLAUDE_CREDITS_REMAINING=75  # Update this daily

if [ $CLAUDE_CREDITS_REMAINING -lt 20 ]; then
  echo "⛔ CRITICAL: Claude credits < 20%. STOP USING CLAUDE CODE."
  echo "   Switch to: OpenCode + Gemini CLI"
  echo "   Reserve remaining for emergency debugging only."
elif [ $CLAUDE_CREDITS_REMAINING -lt 40 ]; then
  echo "⚠️  WARNING: Claude credits < 40%."
  echo "   Route simple tasks to Gemini CLI."
  echo "   Use Claude Code for complex logic only."
elif [ $CLAUDE_CREDITS_REMAINING -lt 70 ]; then
  echo "✅ MEDIUM: Claude credits at ${CLAUDE_CREDITS_REMAINING}%."
  echo "   Normal workflow. Avoid using Claude for simple tasks."
else
  echo "✅ FULL: Claude credits at ${CLAUDE_CREDITS_REMAINING}%."
  echo "   Use freely."
fi
```

---

# 6. OpenCode Configuration File

This is the complete `~/.config/opencode/opencode.json`
for your setup. Place this file globally so it applies
across all your projects.
```json
{
  "$schema": "https://opencode.ai/config.json",

  "model": "anthropic/claude-sonnet-4-5",

  "providers": {
    "anthropic": {
      "apiKey": "YOUR_ANTHROPIC_API_KEY_HERE",
      "name": "Claude (Primary)"
    },
    "google": {
      "apiKey": "YOUR_GEMINI_API_KEY_HERE",
      "name": "Gemini (Fallback)"
    },
    "ollama": {
      "apiUrl": "http://localhost:11434",
      "name": "Local Ollama (Free)"
    }
  },

  "compaction": {
    "enabled": true,
    "reserved": 20000
  },

  "keybinds": {
    "leader": "ctrl+x"
  },

  "instructions": "You are a senior full-stack developer working on M2i_LMS, an AI-powered Learning Management System. The project documentation is in the /docs folder. Always read the relevant feature implementation guide before writing code. Match existing patterns in the codebase exactly. Use TypeScript throughout. Never use 'any' without a comment. Follow the error throwing pattern: throw { code: 'ERROR_CODE', message: 'message', statusCode: 400 }."
}
```

---

# 7. Daily Operating Procedure

## Morning Startup (5 minutes)
```bash
# 1. Check credit levels
bash backend/scripts/check-credits.sh

# 2. Update CLAUDE.md with today's focus
nano CLAUDE.md
# → Update "Current Focus" and "Relevant Files"

# 3. Update GEMINI.md with today's focus
nano GEMINI.md

# 4. Start infrastructure
docker compose up -d postgres redis
ollama serve &

# 5. Open your terminal layout
# Recommended: tmux with 3 panes
#   Left pane (wide): Claude Code or OpenCode
#   Top right pane: Gemini CLI
#   Bottom right pane: Terminal for git/npm commands
tmux new-session -d -s dev
tmux split-window -h -t dev
tmux split-window -v -t dev:0.1
```

## During Development
```
Before each task:
  → Is this the right tool? (consult routing table)
  → Is context scoped correctly? (check CLAUDE.md / GEMINI.md)
  → Are credits OK? (run check-credits.sh)

Every 30-60 minutes:
  → If in OpenCode: run /tokenscope to check burn rate
  → If session is long: run /compact to free context

At the end of each completed task:
  → Commit the code (Claude Code handles git commit messages well)
  → Start fresh session for next task
```

## End of Day (5 minutes)
```bash
# 1. Check how many Claude credits you burned today
# Log into Claude.ai → Settings → Usage

# 2. Update the check-credits.sh REMAINING number for tomorrow

# 3. Commit any uncommitted work
git add -A
git commit -m "wip: end of day checkpoint"

# 4. Stop services
docker compose down
pkill ollama
```

---

# 8. Switching Rules — When to Change Tools

## Hard Switch Rules (No Exceptions)
```
SWITCH AWAY FROM CLAUDE CODE WHEN:
  → Credits drop below 20%
  → Task is pure boilerplate (< 30 lines, obvious logic)
  → Task is frontend styling only
  → Task is reading/exploring code only (no writing)

SWITCH AWAY FROM GEMINI CLI WHEN:
  → Task requires coherent multi-file changes
    (Gemini's error rate on complex logic is too high)
  → Task is a critical algorithm where correctness is essential
    (metrics algorithms, quiz score calculation)

SWITCH AWAY FROM CODEX WHEN:
  → You need back-and-forth pair programming
    (Codex is an autonomous agent, not a pair programmer)
  → Task requires understanding your specific codebase deeply
    (Codex is better for greenfield than existing codebases)
  → Free plan limit is hit for the day

SWITCH TO OPENCODE+OLLAMA WHEN:
  → Task is simple and well-defined (< 30 lines)
  → You want zero token cost
  → Generating boilerplate config files
  → Writing simple utility functions
```

## Soft Switch Recommendations
```
PREFER GEMINI OVER CLAUDE WHEN:
  → Working on frontend components (similar quality, lower cost)
  → Exploring which files to edit before editing them
  → Generating documentation
  → Creating infrastructure as code / Docker configs

PREFER CLAUDE OVER GEMINI WHEN:
  → Writing business logic in service files
  → Debugging errors that span multiple files
  → Implementing the metrics algorithms
  → Anything involving cryptography, auth, or security
```

---

# 9. Task Routing Quick Reference

Print this and keep it on your desk or pin it in
your terminal as a tmux status message.
```
╔══════════════════════════════════════════════════════════╗
║         M2i_LMS TOOL ROUTING QUICK REFERENCE            ║
╠══════════════════════════════════════════════════════════╣
║  CLAUDE CODE (expensive, most accurate)                  ║
║    • Service layer business logic                        ║
║    • Metrics algorithm implementation                    ║
║    • Multi-file coherent refactors                       ║
║    • Hard debugging across files                         ║
║    • Auth/security critical code                         ║
╠══════════════════════════════════════════════════════════╣
║  GEMINI CLI (free, large context)                        ║
║    • Frontend components and UI                          ║
║    • Codebase exploration before writing                 ║
║    • Prisma schema and migrations                        ║
║    • Docker / infra / deployment configs                 ║
║    • Design file → component (upload screenshot)         ║
╠══════════════════════════════════════════════════════════╣
║  OPENCODE (cost control layer)                           ║
║    • Switch to Gemini when Claude credits < 40%          ║
║    • Switch to Ollama for simple zero-cost tasks         ║
║    • Monitor token burn with /tokenscope                 ║
║    • Compact long sessions with /compact                 ║
╠══════════════════════════════════════════════════════════╣
║  CODEX (autonomous, fire-and-forget)                     ║
║    • Complete test suites from spec                      ║
║    • GitHub Actions / CI-CD pipelines                    ║
║    • Full feature boilerplate with tests                 ║
║    • Run while you work on something else                ║
╠══════════════════════════════════════════════════════════╣
║  CREDIT LEVELS:                                          ║
║    > 70%: Use Claude freely                              ║
║    40-70%: Claude for logic only, Gemini for rest        ║
║    20-40%: Gemini primary, Claude for critical only      ║
║    < 20%: STOP CLAUDE. Gemini + OpenCode+Ollama only.    ║
╚══════════════════════════════════════════════════════════╝
```

---

**End of AI Tool Orchestration Workflows**

---

**Document Information**

| Field | Value |
|-------|-------|
| Document Title | M2i_LMS AI Tool Orchestration Workflows |
| Version | 1.0 |
| Created | March 2026 |
| Tools Covered | Claude Code Pro, Gemini CLI, OpenCode, Codex |
| Repository | /docs/Developer_Guides/M2i_LMS_AI_Orchestration_Workflows.md |