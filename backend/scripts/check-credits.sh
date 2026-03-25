#!/bin/bash
# check-credits.sh
# Update CLAUDE_CREDITS_REMAINING each morning from:
# Claude.ai → Settings → Usage

CLAUDE_CREDITS_REMAINING=100  # Update this daily

if [ "$CLAUDE_CREDITS_REMAINING" -lt 20 ]; then
  echo "CRITICAL: Claude credits < 20%. STOP USING CLAUDE CODE."
  echo "   Switch to: Gemini CLI (primary) + OpenCode+Ollama"
  echo "   Reserve remaining for emergency debugging only."
elif [ "$CLAUDE_CREDITS_REMAINING" -lt 40 ]; then
  echo "WARNING: Claude credits < 40%."
  echo "   Route all frontend + docs to Gemini CLI."
  echo "   Use Claude Code for complex service logic only."
elif [ "$CLAUDE_CREDITS_REMAINING" -lt 70 ]; then
  echo "MEDIUM: Claude credits at ${CLAUDE_CREDITS_REMAINING}%."
  echo "   Normal workflow. Avoid Claude for simple tasks."
  echo "   Use OpenCode+Ollama for boilerplate."
else
  echo "FULL: Claude credits at ${CLAUDE_CREDITS_REMAINING}%."
  echo "   Use freely. Route per the capability matrix."
fi

echo ""
echo "Tool routing quick reference:"
echo "  Claude Code  → service logic, auth/security, multi-file refactors"
echo "  Gemini CLI   → frontend, exploration, Prisma schema, infra"
echo "  OpenCode     → cost control, model switching, simple scripts"
echo "  Codex        → test suites, CI/CD pipelines, boilerplate"
