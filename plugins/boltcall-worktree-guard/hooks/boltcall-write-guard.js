#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const os = require('os');

const PROTECTED_REPOS = [
  path.normalize('C:\\Users\\Asus\\Desktop\\Boltcall_website\\Boltcall'),
  path.normalize('C:\\Users\\Asus\\Desktop\\Marketing\\agentic-os')
];
const SESSION_DIR = path.join(os.homedir(), '.claude', 'session-worktrees');

let input = '';
try {
  input = fs.readFileSync(0, 'utf8');
} catch {}

let filePath = '';
try {
  const data = JSON.parse(input);
  filePath = (data.tool_input || {}).file_path || '';
} catch {}

if (!filePath) process.exit(0);

const cwd = process.cwd();

function isInProtectedRepo(dir) {
  const normalized = path.resolve(dir).toLowerCase();
  return PROTECTED_REPOS.some((repo) =>
    normalized.startsWith(path.normalize(repo).toLowerCase())
  );
}

function isInWorktree(dir) {
  try {
    let current = path.resolve(dir);
    for (let i = 0; i < 10; i += 1) {
      const gitPath = path.join(current, '.git');
      if (fs.existsSync(gitPath)) {
        const stat = fs.statSync(gitPath);
        if (stat.isFile()) return true;
        if (stat.isDirectory()) return false;
      }
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
    return false;
  } catch {
    return false;
  }
}

function getSessionState() {
  try {
    const exactFile = path.join(SESSION_DIR, `boltcall-${process.ppid}.json`);
    const candidates = fs.existsSync(exactFile)
      ? [exactFile]
      : fs.existsSync(SESSION_DIR)
        ? fs.readdirSync(SESSION_DIR)
            .filter((name) => name.startsWith('boltcall-') && name.endsWith('.json'))
            .map((name) => path.join(SESSION_DIR, name))
            .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
        : [];

    for (const file of candidates) {
      const state = JSON.parse(fs.readFileSync(file, 'utf8'));
      const ageMs = Date.now() - fs.statSync(file).mtimeMs;
      if (
        state &&
        state.worktreePath &&
        fs.existsSync(state.worktreePath) &&
        ageMs < 2 * 60 * 60 * 1000
      ) {
        return state;
      }
    }
  } catch {}
  return null;
}

if (!isInProtectedRepo(path.dirname(filePath))) {
  process.exit(0);
}

if (isInWorktree(cwd)) {
  process.exit(0);
}

if (isInWorktree(path.dirname(filePath))) {
  process.exit(0);
}

const which =
  PROTECTED_REPOS.find((repo) =>
    path.resolve(filePath).toLowerCase().startsWith(repo.toLowerCase())
  ) || 'protected repo';

const isAios = which.toLowerCase().includes('agentic-os');
const sessionState = getSessionState();

console.log(`BLOCKED: Direct edits to ${path.basename(which)} are not allowed outside a worktree.`);
console.log('Multiple parallel sessions overwrite each other - always use git worktrees.');
console.log('');
console.log('Start an isolated worktree first:');
if (isAios) {
  console.log('  cd C:\\Users\\Asus\\Desktop\\Marketing\\scripts');
  console.log('  .\\new-aios-session.ps1 -Name <task> -Open');
  console.log('');
  console.log('When done, merge to main with (does NOT deploy):');
  console.log('  .\\end-aios-session.ps1 -Name <task>');
  console.log('');
  console.log('Deploy is a separate user-triggered step.');
} else if (sessionState) {
  console.log(`  Auto-created worktree: ${sessionState.worktreePath}`);
  console.log(`  Branch: ${sessionState.branch}`);
  console.log('');
  console.log('Open that worktree folder and continue the task there.');
} else {
  console.log('  git worktree add -b codex/<task> C:\\Users\\Asus\\Desktop\\Boltcall_website\\worktrees\\<task> HEAD');
  console.log('');
  console.log('Then open the new worktree folder and do the task there.');
}
console.log('');
console.log('Then open a new Codex or Claude session inside that worktree folder and retry.');
process.exit(2);
