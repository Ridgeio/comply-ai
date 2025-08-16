import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function readFixtureBytes(rel: string): Promise<Uint8Array> {
  // When running from packages/parsers, we need to adjust the path
  const currentDir = process.cwd();
  let fixturePath: string;
  
  if (currentDir.endsWith('packages/parsers')) {
    // Running from within the parsers package
    fixturePath = path.resolve(currentDir, rel.replace('packages/parsers/', ''));
  } else {
    // Running from monorepo root
    fixturePath = path.resolve(currentDir, rel);
  }
  
  const buf = await fs.readFile(fixturePath);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

/** Resolve the real PDF path from env or default committed path */
export function resolveRealPdfPath() {
  return process.env.REAL_TREC20_PDF_PATH
    ?? 'packages/parsers/tests/fixtures/real/trec-20-18-houston-2024-11-04.pdf';
}