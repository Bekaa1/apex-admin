import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { supportPrompt } from '../../server/chat/prompt.ts';

// Run with Node >=22, from the same checkout used to build the website responder.
// The destination is an explicit server/staging file, never a frontend asset.
const destination = process.argv[2];
if (!destination || process.argv.length !== 3) {
  throw new Error('Usage: node --experimental-strip-types deploy/chat/export-whatsapp-prompt.mjs <bot/prompts/apex-agent.txt>');
}
const path = resolve(destination);
if (!path.endsWith('apex-agent.txt')) throw new Error('Destination must be apex-agent.txt');
await mkdir(dirname(path), { recursive: true });
await writeFile(path, supportPrompt, 'utf8');
console.log(`Shared support prompt SHA-256: ${createHash('sha256').update(supportPrompt).digest('hex')}`);
