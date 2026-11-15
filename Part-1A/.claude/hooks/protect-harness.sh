#!/usr/bin/env bash
# Harness protection hook — PreToolUse
# Blocks modifications to:
#   • tests/, .harness/, evidence/harness-results/   (test suite + harness)
#   • vitest.config.js, eslint.config.js, package.json (quality-gate config)
#   • .claude/settings.json, .claude/hooks/**         (hook enforcement config)
#   • npm install <pkg> / npm add                     (dependency changes go through the user)
# npm install (bare re-install) is explicitly allowed.
# Exit 2 = block with message; exit 0 = allow.

set -euo pipefail

INPUT=$(cat)

extract() {
  # Usage: extract <json_path_dot_separated>
  # e.g. extract tool_name, extract tool_input.file_path
  local key="$1"
  echo "$INPUT" | python3 -c "
import sys, json, functools, operator
try:
    d = json.load(sys.stdin)
    keys = '${key}'.split('.')
    val = functools.reduce(operator.getitem, keys, d)
    print(val)
except Exception:
    print('')
" 2>/dev/null || echo ""
}

TOOL=$(extract tool_name)

# ── Protected path prefixes (substring match) ─────────────────────────────────
PROTECTED_PATH_PREFIXES=("tests/" ".harness/" "evidence/harness-results/")

# ── Protected config filenames (basename match) ───────────────────────────────
PROTECTED_CONFIGS=("vitest.config.js" "eslint.config.js" "package.json")

# ── Protected agent-config paths (substring match) ────────────────────────────
PROTECTED_CLAUDE_PATHS=(".claude/settings.json" ".claude/hooks/")

BLOCK_PATH_MSG="BLOCKED by harness-protection hook.
Protected paths: tests/, .harness/, evidence/harness-results/
These contain the spec-derived test suite and harness — weakening them is prohibited
by the constitution (Agent Rules, Harness Independence).

To lift for a legitimate spec-driven change:
  1. Open Part-1A/.claude/settings.json
  2. Set \"PreToolUse\": []
  3. Make your change (must reference an AC or FR)
  4. Restore the hook array before running npm run harness"

BLOCK_CONFIG_MSG="BLOCKED by harness-protection hook.
Protected config files: vitest.config.js, eslint.config.js, package.json
These set quality-gate thresholds and dependency versions that the agent
must not alter without explicit user approval (constitution §I–II).

To change a quality-gate config: ask the user to make the edit directly,
or lift the hook via Part-1A/.claude/settings.json (\"PreToolUse\": [])."

BLOCK_NPM_MSG="BLOCKED by harness-protection hook.
Adding or removing npm packages must go through the user.
'npm install' (bare re-install of existing deps) is still allowed.

To add a dependency: ask the user to run 'npm install <pkg>' directly,
then restore the hook."

BLOCK_CLAUDE_MSG="BLOCKED by harness-protection hook.
Protected agent-config paths: .claude/settings.json, .claude/hooks/**
These control hook enforcement — modifying them undermines harness independence.

To make a legitimate change: edit the file directly in a text editor
(outside Claude Code), or ask the user to make the edit."

# ── Helpers ───────────────────────────────────────────────────────────────────

path_contains_protected_prefix() {
  local text="$1"
  for p in "${PROTECTED_PATH_PREFIXES[@]}"; do
    if [[ "$text" == *"$p"* ]]; then
      return 0
    fi
  done
  return 1
}

basename_is_protected_config() {
  local path="$1"
  local base
  base=$(basename "$path")
  for c in "${PROTECTED_CONFIGS[@]}"; do
    if [[ "$base" == "$c" ]]; then
      return 0
    fi
  done
  return 1
}

cmd_references_protected_config() {
  local cmd="$1"
  for c in "${PROTECTED_CONFIGS[@]}"; do
    if [[ "$cmd" == *"$c"* ]]; then
      return 0
    fi
  done
  return 1
}

path_contains_claude_protected() {
  local text="$1"
  for p in "${PROTECTED_CLAUDE_PATHS[@]}"; do
    if [[ "$text" == *"$p"* ]]; then
      return 0
    fi
  done
  return 1
}

is_write_op() {
  local cmd="$1"
  # Shell-level write indicators: redirect, tee, mutating commands
  if echo "$cmd" | grep -qE '(>>?[^>]|\btee\b|\bcp\b|\bmv\b|\bchmod\b|\bchown\b|\bsed[[:space:]]+-i\b|\btruncate\b|\bdd\b)'; then
    return 0
  fi
  return 1
}

is_npm_package_add() {
  # Returns 0 (true) if the command is npm install/add/i WITH package arguments.
  # Returns 1 (false) for bare npm install / npm ci / flags-only invocations.
  # Checks only lines that START with npm to avoid false positives from echo/comment strings.
  local cmd="$1"
  echo "$cmd" | python3 -c "
import sys, re, shlex
cmd = sys.stdin.read()
# Only check lines that begin with 'npm' (after stripping whitespace).
# This prevents false positives from scripts that mention npm in echo or comment lines.
for line in cmd.splitlines():
    stripped = line.strip()
    if not re.match(r'^npm\s+', stripped):
        continue
    try:
        tokens = shlex.split(stripped)
    except Exception:
        tokens = stripped.split()
    if len(tokens) < 2:
        continue
    if tokens[1] not in ('install', 'add', 'i'):
        continue
    # Collect non-flag args after the subcommand
    pkg_args = [t for t in tokens[2:] if not t.startswith('-')]
    if pkg_args:
        sys.exit(0)  # found npm install <package> on its own line
sys.exit(1)  # no npm package-add detected
" 2>/dev/null
  return $?
}

# ── Main logic ────────────────────────────────────────────────────────────────

if [[ "$TOOL" == "Edit" || "$TOOL" == "Write" ]]; then
  FILE_PATH=$(extract tool_input.file_path)

  if path_contains_claude_protected "$FILE_PATH"; then
    echo "$BLOCK_CLAUDE_MSG"
    exit 2
  fi

  if path_contains_protected_prefix "$FILE_PATH"; then
    echo "$BLOCK_PATH_MSG"
    exit 2
  fi

  if basename_is_protected_config "$FILE_PATH"; then
    echo "$BLOCK_CONFIG_MSG"
    exit 2
  fi

elif [[ "$TOOL" == "Bash" ]]; then
  COMMAND=$(extract tool_input.command)

  # 1. Agent-config paths + write op
  if path_contains_claude_protected "$COMMAND" && is_write_op "$COMMAND"; then
    echo "$BLOCK_CLAUDE_MSG"
    exit 2
  fi

  # 2. Protected path prefix + write op
  if path_contains_protected_prefix "$COMMAND" && is_write_op "$COMMAND"; then
    echo "$BLOCK_PATH_MSG"
    exit 2
  fi

  # 3. Protected config filename + write op
  if cmd_references_protected_config "$COMMAND" && is_write_op "$COMMAND"; then
    echo "$BLOCK_CONFIG_MSG"
    exit 2
  fi

  # 4. npm install <package> / npm add
  if is_npm_package_add "$COMMAND"; then
    echo "$BLOCK_NPM_MSG"
    exit 2
  fi
fi

exit 0
