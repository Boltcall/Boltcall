#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const PROTECTED_REPOS = [
  path.normalize('C:\\Users\\Asus\\Desktop\\Boltcall_website\\Boltcall')
];

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
const basename = path.basename(filePath);
const fileDir = path.dirname(filePath);

if (filePath.toLowerCase().includes('vault') || filePath.toLowerCase().includes('valut')) {
  try {
    const dir = fs.existsSync(fileDir) ? fileDir : cwd;
    execSync(`git -C "${dir}" add "${filePath}"`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    execSync(`git -C "${dir}" commit -m "auto-save: ${basename}" -- "${filePath}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    console.log(`Vault committed: ${basename}`);
  } catch {}
}

if (filePath.endsWith('.md') && fs.existsSync(filePath)) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (match) {
      const frontmatter = match[1];
      const required = ['type', 'status', 'tags', 'source', 'created'];
      const missing = required.filter((key) => !frontmatter.includes(`${key}:`));
      if (missing.length > 0) {
        console.log(`WARN missing YAML fields: ${missing.join(', ')}`);
      }
    }
  } catch {}
}

function isInProtectedRepo(dir) {
  const normalized = path.resolve(dir).toLowerCase();
  return PROTECTED_REPOS.some((repo) =>
    normalized.startsWith(path.normalize(repo).toLowerCase())
  );
}

function isInWorktree(dir) {
  try {
    const gitDir = execSync('git rev-parse --git-dir', {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    const commonDir = execSync('git rev-parse --git-common-dir', {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return path.resolve(dir, gitDir) !== path.resolve(dir, commonDir);
  } catch {
    return false;
  }
}

const checkDir = fs.existsSync(fileDir) ? fileDir : cwd;
if ((isInProtectedRepo(cwd) || isInProtectedRepo(checkDir)) && isInWorktree(cwd)) {
  try {
    execSync(`git add "${filePath}"`, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    const status = execSync('git diff --cached --name-only', {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (status) {
      execSync(`git commit -m "auto: ${basename}" -- "${filePath}"`, {
        cwd,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      console.log(`Auto-committed: ${basename}`);
    }
  } catch {}
}
