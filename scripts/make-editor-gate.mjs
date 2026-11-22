// Builds assets/studio/gate.json from the CHURCH_EDITOR_PASSWORD GitHub secret.
// Only a salted PBKDF2 hash is written to the site; the password itself is never stored in the repository.
// Run by .github/workflows/editor-gate.yml. Keeps the existing salt when the password is unchanged.
import {pbkdf2Sync, randomBytes} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';

const FILE = 'assets/studio/gate.json';
const ITERATIONS = 310000;
const password = (process.env.CHURCH_EDITOR_PASSWORD || '').trim();

if (!password) {
  console.error('The CHURCH_EDITOR_PASSWORD secret is missing or empty.');
  process.exit(1);
}

let previous = null;
try { previous = JSON.parse(readFileSync(FILE, 'utf8')); } catch {}

if (previous && previous.iterations === ITERATIONS) {
  const current = pbkdf2Sync(password, Buffer.from(previous.salt, 'base64'), ITERATIONS, 32, 'sha256');
  if (current.toString('base64') === previous.hash) {
    console.log('Editor password unchanged.');
    process.exit(0);
  }
}

const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
writeFileSync(FILE, JSON.stringify({
  version: 1,
  algorithm: 'PBKDF2-SHA256',
  iterations: ITERATIONS,
  salt: salt.toString('base64'),
  hash: hash.toString('base64'),
}, null, 2) + '\n');
console.log('Editor password updated.');
