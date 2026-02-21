#!/usr/bin/env node

/**
 * DHH Review Persistence Hook
 * Stop hook that blocks session close until the dhh-review is complete.
 *
 * Active when: .omc/state/dhh-review-state.json exists with active:true
 * Deactivated by: the skill deleting the state file at Step 5 completion
 * Staleness: states older than 2 hours are treated as inactive
 */

const { existsSync, readFileSync, writeFileSync, mkdirSync } = require("fs");
const { join, dirname } = require("path");

async function readStdin(timeoutMs = 5000) {
  return new Promise((resolve) => {
    const chunks = [];
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        process.stdin.removeAllListeners();
        process.stdin.destroy();
        resolve(Buffer.concat(chunks).toString("utf-8"));
      }
    }, timeoutMs);
    process.stdin.on("data", (chunk) => { chunks.push(chunk); });
    process.stdin.on("end", () => {
      if (!settled) { settled = true; clearTimeout(timeout); resolve(Buffer.concat(chunks).toString("utf-8")); }
    });
    process.stdin.on("error", () => {
      if (!settled) { settled = true; clearTimeout(timeout); resolve(""); }
    });
    if (process.stdin.readableEnded) {
      if (!settled) { settled = true; clearTimeout(timeout); resolve(Buffer.concat(chunks).toString("utf-8")); }
    }
  });
}

function readJsonFile(path) {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

function writeJsonFile(path, data) {
  try {
    const dir = dirname(path);
    if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(path, JSON.stringify(data, null, 2));
    return true;
  } catch {
    return false;
  }
}

const STALE_MS = 2 * 60 * 60 * 1000; // 2 hours

function isStale(state) {
  if (!state) return true;
  const last = state.last_checked_at ? new Date(state.last_checked_at).getTime() : 0;
  const started = state.started_at ? new Date(state.started_at).getTime() : 0;
  const recent = Math.max(last, started);
  return recent === 0 || (Date.now() - recent) > STALE_MS;
}

function isContextLimit(data) {
  const reason = (data.stop_reason || data.stopReason || "").toLowerCase();
  return ["context_limit", "context_window", "token_limit", "max_tokens",
          "conversation_too_long", "input_too_long"].some((p) => reason.includes(p));
}

function isUserAbort(data) {
  if (data.user_requested || data.userRequested) return true;
  const reason = (data.stop_reason || data.stopReason || "").toLowerCase();
  return ["aborted", "abort", "cancel", "interrupt"].some((p) => reason === p) ||
    ["user_cancel", "user_interrupt", "ctrl_c", "manual_stop"].some((p) => reason.includes(p));
}

async function main() {
  try {
    const input = await readStdin();
    let data = {};
    try { data = JSON.parse(input); } catch {}

    const directory = data.cwd || data.directory || process.cwd();
    const statePath = join(directory, ".omc", "state", "dhh-review-state.json");

    // Never block context-limit or user-abort stops
    if (isContextLimit(data) || isUserAbort(data)) {
      process.exit(0);
      return;
    }

    const state = readJsonFile(statePath);

    if (state?.active && !isStale(state)) {
      const count = (state.reinforcement_count || 0) + 1;
      if (count <= 10) {
        state.reinforcement_count = count;
        state.last_checked_at = new Date().toISOString();
        writeJsonFile(statePath, state);

        console.log(
          JSON.stringify({
            decision: "block",
            reason: [
              `[DHH-REVIEW] Review not complete. Continue working through all steps.`,
              `Target: ${state.target || "unknown"}`,
              ``,
              `Complete all steps in order:`,
              `  Step 1: Identify files to review`,
              `  Step 2: Run automated checks (rubocop, brakeman)`,
              `  Step 3: Invoke dhh-code-reviewer agent`,
              `  Step 4: Generate and present the review report`,
              `  Step 5: Ask user about fixes, then run: rm .omc/state/dhh-review-state.json`,
            ].join("\n"),
          })
        );
        return;
      }
    }

    process.exit(0);
  } catch {
    process.exit(0);
  }
}

main();
