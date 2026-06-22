#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const BOLTCALL_ROOT = path.normalize('C:\\Users\\Asus\\Desktop\\Boltcall_website\\Boltcall');
const BOLTCALL_WORKTREES = path.normalize('C:\\Users\\Asus\\Desktop\\Boltcall_website\\worktrees');
const AIOS_ROOT = path.normalize('C:\\Users\\Asus\\Desktop\\Marketing\\agentic-os');
const SESSION_DIR = path.join(os.homedir(), '.claude', 'session-worktrees');
const LOCK_DIR = path.join(os.homedir(), '.claude', 'session-locks');

function run(cmd, cwd) {
  return execSync(cmd, {
    cwd,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

function isInside(target, base) {
  return path.resolve(target).toLowerCase().startsWith(path.resolve(base).toLowerCase());
}

function isWorktree(cwd) {
  try {
    const gitDir = run('git rev-parse --git-dir', cwd);
    const commonDir = run('git rev-parse --git-common-dir', cwd);
    return path.resolve(cwd, gitDir) !== path.resolve(cwd, commonDir);
  } catch {
    return false;
  }
}

function getSessionKey() {
  return `boltcall-${process.ppid}`;
}

function getSessionFile() {
  return path.join(SESSION_DIR, `${getSessionKey()}.json`);
}

function readSessionState() {
  try {
    const file = getSessionFile();
    if (!fs.existsSync(file)) return null;
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (parsed && parsed.worktreePath && fs.existsSync(parsed.worktreePath)) {
      return parsed;
    }
  } catch {}
  return null;
}

function writeSessionState(state) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
  fs.writeFileSync(getSessionFile(), JSON.stringify(state, null, 2));
}

function getActiveSessions(repoKey) {
  const lockFile = path.join(LOCK_DIR, `${repoKey}.json`);
  if (!fs.existsSync(lockFile)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
    const cutoff = Date.now() - 12 * 60 * 60 * 1000;
    return (data.sessions || []).filter((session) => session.timestamp > cutoff);
  } catch {
    return [];
  }
}

function registerSession(repoKey) {
  fs.mkdirSync(LOCK_DIR, { recursive: true });
  const lockFile = path.join(LOCK_DIR, `${repoKey}.json`);
  const sessions = getActiveSessions(repoKey);
  sessions.push({ id: getSessionKey(), timestamp: Date.now(), pid: process.ppid });
  fs.writeFileSync(lockFile, JSON.stringify({ sessions }, null, 2));
}

function uniqueSuffix() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-p${process.ppid}`;
}

function ensureBoltcallWorktree() {
  const existing = readSessionState();
  if (existing) return existing;

  fs.mkdirSync(BOLTCALL_WORKTREES, { recursive: true });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = attempt === 0 ? uniqueSuffix() : `${uniqueSuffix()}-${attempt}`;
    const branch = `codex/session-${suffix}`;
    const folderName = `session-${suffix}`;
    const worktreePath = path.join(BOLTCALL_WORKTREES, folderName);

    try {
      run(`git worktree add -b "${branch}" "${worktreePath}" HEAD`, BOLTCALL_ROOT);
      const state = {
        branch,
        worktreePath,
        createdAt: new Date().toISOString(),
        pid: process.ppid
      };
      writeSessionState(state);
      return state;
    } catch {}
  }

  return null;
}

const cwd = process.cwd();

if (!isInside(cwd, BOLTCALL_ROOT) && !isInside(cwd, AIOS_ROOT)) {
  process.exit(0);
}

if (isWorktree(cwd)) {
  console.log('Session is already in a worktree. Isolation OK.');
  process.exit(0);
}

registerSession('boltcall');

console.log('');
console.log('==============================================');
console.log('BOLTCALL WORKTREE-REQUIRED MODE');
console.log('==============================================');

if (isInside(cwd, BOLTCALL_ROOT)) {
  const state = ensureBoltcallWorktree();
  console.log('Root main checkout is read-only for agent work.');
  if (state) {
    console.log(`Auto-created worktree: ${state.worktreePath}`);
    console.log(`Branch: ${state.branch}`);
    console.log('Reopen or continue the task from that worktree path before editing.');
  } else {
    console.log('Automatic worktree creation failed.');
    console.log(`Create one manually under ${BOLTCALL_WORKTREES} before editing.`);
  }
  console.log('Use the root checkout only for explicit merge, review, or deploy steps.');
  console.log('');
  process.exit(0);
}

console.log('AIOS root checkout is read-only for agent work.');
console.log('Move into a dedicated AIOS session/worktree before any edit.');
console.log('Use the root checkout only for explicit merge, review, or deploy steps.');
console.log('');
