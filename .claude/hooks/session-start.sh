#!/bin/bash
# SessionStart hook: (re)install the "watch" Claude Code plugin
# (https://github.com/bradautomates/claude-video) in cloud sessions.
# Idempotent, non-interactive, and never fails the session.
set -uo pipefail

# Only run in Claude Code cloud (remote) sessions.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

REPO_URL="https://github.com/bradautomates/claude-video.git"
REPO_DIR="/home/user/claude-video"
MARKETPLACE="claude-video"
PLUGIN="watch@claude-video"

log()  { echo "[watch-hook] $*" >&2; }
warn() { echo "[watch-hook] WARNING: $*" >&2; }

# 1. Clone or update the plugin repo.
if [ -d "$REPO_DIR/.git" ]; then
  timeout 30 git -C "$REPO_DIR" pull --ff-only -q >/dev/null 2>&1 \
    && log "repo updated: $REPO_DIR" \
    || warn "git pull failed for $REPO_DIR (using existing checkout)"
else
  if timeout 120 git clone -q --depth 1 "$REPO_URL" "$REPO_DIR" >/dev/null 2>&1; then
    log "repo cloned: $REPO_DIR"
  else
    warn "git clone of $REPO_URL failed"
  fi
fi

# 2. Register the marketplace and install the plugin (skip if already done).
if command -v claude >/dev/null 2>&1 && [ -d "$REPO_DIR" ]; then
  if claude plugin marketplace list 2>/dev/null | grep -q "^[[:space:]]*> $MARKETPLACE\$"; then
    log "marketplace '$MARKETPLACE' already configured"
  else
    claude plugin marketplace add "$REPO_DIR" >/dev/null 2>&1 \
      && log "marketplace '$MARKETPLACE' added" \
      || warn "failed to add marketplace from $REPO_DIR"
  fi

  if claude plugin list 2>/dev/null | grep -q "> $PLUGIN\$"; then
    log "plugin $PLUGIN already installed"
  else
    claude plugin install "$PLUGIN" >/dev/null 2>&1 \
      && log "plugin $PLUGIN installed" \
      || warn "failed to install plugin $PLUGIN"
  fi
else
  warn "claude CLI or $REPO_DIR missing; skipping plugin install"
fi

# 3. System dependencies (check only; ffmpeg/ffprobe/python3 come with the image).
for bin in ffmpeg ffprobe python3; do
  command -v "$bin" >/dev/null 2>&1 || warn "$bin not found on PATH"
done

# 4. yt-dlp (with curl-cffi impersonation support).
if command -v yt-dlp >/dev/null 2>&1; then
  log "yt-dlp present ($(yt-dlp --version 2>/dev/null))"
else
  timeout 180 pip install -q "yt-dlp[default,curl-cffi]" >/dev/null 2>&1 \
    && log "yt-dlp installed" \
    || warn "pip install yt-dlp failed"
fi

# 5. Gemini engine: key is supplied via environment settings, never stored here.
if [ -n "${GEMINI_API_KEY:-}" ]; then
  log "GEMINI_API_KEY is set"
else
  warn "GEMINI_API_KEY is not set; add it in the cloud environment settings"
fi

exit 0
