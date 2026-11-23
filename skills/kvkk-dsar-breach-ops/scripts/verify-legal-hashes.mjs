#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const HELP_TEXT = `verify-legal-hashes.mjs - Verify SHA-256 hashes and detect unfilled [PLACEHOLDER_...] tokens in Turkish KVKK legal documents

Usage:
  node verify-legal-hashes.mjs --dir <legal-docs-dir> [--manifest <manifest.json>] [options]

Options:
  --dir <path>              Directory containing legal documents (required)
  --manifest <path>         Path to manifest JSON (default: <dir>/manifest.json in verify mode)
  --generate                Generate deterministic portable SHA-256 manifest JSON to stdout
  --raw-bytes               Hash raw disk bytes without CRLF/CR-to-LF line-ending normalization (default normalizes to LF for cross-platform Windows/Linux CI determinism)
  --no-placeholder-check    Do not fail on unfilled [PLACEHOLDER_...] tokens
  --json                    Emit machine-readable JSON output
  -h, --help                Show this help text

Notice:
  Technical compliance engineering tool only; not formal Turkish legal advice (hukuki mutalaa).
`;

const DOC_EXTENSIONS = new Set(['.md', '.mdx', '.txt', '.html']);
const PLACEHOLDER_TOKEN_REGEX = /\[PLACEHOLDER_[A-Z0-9_]+\]/g;

function collectDocFiles(dirPath, rootDir = dirPath, results = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const abs = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectDocFiles(abs, rootDir, results);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (DOC_EXTENSIONS.has(ext)) {
        results.push({
          absPath: abs,
          relPath: path.relative(rootDir, abs).replaceAll('\\', '/'),
        });
      }
    }
  }
  return results;
}

function findUnfilledPlaceholders(content) {
  if (!content.includes('[PLACEHOLDER_')) {
    return [];
  }
  const hits = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    if (!lines[i].includes('[PLACEHOLDER_')) continue;
    const matches = lines[i].match(PLACEHOLDER_TOKEN_REGEX);
    if (matches) {
      for (const token of matches) {
        hits.push({ line: i + 1, token });
      }
    }
  }
  return hits;
}

function computeDocumentDigest(absPath, normalizeLineEndings = true) {
  const rawBuf = fs.readFileSync(absPath);
  const rawContent = rawBuf.toString('utf8');
  const hashInput = normalizeLineEndings
    ? Buffer.from(rawContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n'), 'utf8')
    : rawBuf;
  return {
    sha256: crypto.createHash('sha256').update(hashInput).digest('hex'),
    bytes: hashInput.length,
    content: rawContent,
  };
}

export function generateLegalManifest(dirPath, options = {}) {
  const absDir = path.resolve(dirPath);
  if (!fs.existsSync(absDir)) {
    throw new Error(`Directory does not exist: ${absDir}`);
  }

  const checkPlaceholders = options.checkPlaceholders !== false;
  const normalizeLineEndings = options.normalizeLineEndings !== false;
  const docs = collectDocFiles(absDir);
  const documents = [];
  let placeholderCount = 0;

  for (const doc of docs) {
    const { sha256, bytes, content } = computeDocumentDigest(doc.absPath, normalizeLineEndings);
    const unfilled = findUnfilledPlaceholders(content);
    placeholderCount += unfilled.length;

    documents.push({
      path: doc.relPath,
      sha256,
      bytes,
      unfilled_placeholders: unfilled,
    });
  }

  return {
    algorithm: 'sha256',
    line_ending_normalization: normalizeLineEndings ? 'lf' : 'none',
    generated_at: new Date().toISOString(),
    document_count: documents.length,
    unfilled_placeholder_count: placeholderCount,
    passed: checkPlaceholders ? placeholderCount === 0 : true,
    documents,
  };
}

export function verifyLegalHashes(dirPath, manifestPath, options = {}) {
  const absDir = path.resolve(dirPath);
  const absManifest = path.resolve(manifestPath || path.join(absDir, 'manifest.json'));
  const checkPlaceholders = options.checkPlaceholders !== false;
  const normalizeLineEndings = options.normalizeLineEndings !== false;

  if (!fs.existsSync(absDir)) {
    throw new Error(`Directory does not exist: ${absDir}`);
  }
  if (!fs.existsSync(absManifest)) {
    throw new Error(`Manifest file does not exist: ${absManifest}`);
  }

  const manifest = JSON.parse(fs.readFileSync(absManifest, 'utf8'));
  const errors = [];

  if (!manifest || !Array.isArray(manifest.documents)) {
    return {
      passed: false,
      directory: absDir,
      manifest: absManifest,
      checked_documents: 0,
      error_count: 1,
      errors: [
        {
          rule: 'INVALID_MANIFEST',
          path: path.basename(absManifest),
          detail: 'Manifest JSON must contain a documents array.',
        },
      ],
    };
  }

  const manifestDocs = manifest.documents;
  const diskDocs = collectDocFiles(absDir);
  const diskCache = new Map();

  for (const doc of diskDocs) {
    const { sha256, content } = computeDocumentDigest(doc.absPath, normalizeLineEndings);
    diskCache.set(doc.relPath, {
      ...doc,
      sha256,
      content: checkPlaceholders ? content : null,
    });
  }

  const manifestMap = new Map(manifestDocs.map((d) => [d.path, d]));

  for (const entry of manifestDocs) {
    const cached = diskCache.get(entry.path);
    if (!cached) {
      errors.push({
        rule: 'MISSING_DOCUMENT',
        path: entry.path,
        detail: 'Document listed in manifest is missing on disk.',
      });
      continue;
    }

    if (cached.sha256 !== entry.sha256) {
      errors.push({
        rule: 'HASH_MISMATCH',
        path: entry.path,
        detail: `SHA-256 mismatch (expected ${entry.sha256}, actual ${cached.sha256}).`,
      });
    }
  }

  for (const [relPath, cached] of diskCache.entries()) {
    if (!manifestMap.has(relPath)) {
      errors.push({
        rule: 'UNTRACKED_DOCUMENT',
        path: relPath,
        detail: 'Document exists on disk but is missing from manifest.',
      });
    }

    if (checkPlaceholders && cached.content !== null) {
      const unfilled = findUnfilledPlaceholders(cached.content);
      for (const hit of unfilled) {
        errors.push({
          rule: 'UNFILLED_PLACEHOLDER',
          path: relPath,
          line: hit.line,
          detail: `Unfilled placeholder '${hit.token}' at line ${hit.line}.`,
        });
      }
    }
  }

  return {
    passed: errors.length === 0,
    directory: absDir,
    manifest: absManifest,
    checked_documents: diskDocs.length,
    error_count: errors.length,
    errors,
  };
}

function parseArgs(argv) {
  const opts = {
    generate: false,
    checkPlaceholders: true,
    normalizeLineEndings: true,
    json: argv.includes('--json'),
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--json') opts.json = true;
    else if (arg === '--generate') opts.generate = true;
    else if (arg === '--raw-bytes') opts.normalizeLineEndings = false;
    else if (arg === '--no-placeholder-check') opts.checkPlaceholders = false;
    else if (arg === '--dir') {
      const val = argv[++i];
      if (!val || val.startsWith('--')) throw new Error('Missing directory path after --dir.');
      opts.dir = val;
    } else if (arg === '--manifest') {
      const val = argv[++i];
      if (!val || val.startsWith('--')) throw new Error('Missing file path after --manifest.');
      opts.manifest = val;
    } else throw new Error(`Unknown option: ${arg}`);
  }
  return opts;
}

function main() {
  const argv = process.argv.slice(2);
  const wantJson = argv.includes('--json');

  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    if (wantJson) {
      console.log(JSON.stringify({ passed: false, error: err.message }, null, 2));
    } else {
      console.error(`Error: ${err.message}`);
    }
    process.exit(1);
  }

  if (opts.help) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  if (!opts.dir) {
    if (opts.json) {
      console.log(JSON.stringify({ passed: false, error: '--dir <legal-docs-dir> is required.' }, null, 2));
    } else {
      console.error('Error: --dir <legal-docs-dir> is required.');
    }
    process.exit(1);
  }

  try {
    if (opts.generate) {
      const manifest = generateLegalManifest(opts.dir, {
        checkPlaceholders: opts.checkPlaceholders,
        normalizeLineEndings: opts.normalizeLineEndings,
      });
      console.log(JSON.stringify(manifest, null, 2));
      process.exit(manifest.passed ? 0 : 1);
    }

    const report = verifyLegalHashes(opts.dir, opts.manifest, {
      checkPlaceholders: opts.checkPlaceholders,
      normalizeLineEndings: opts.normalizeLineEndings,
    });

    if (opts.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(
        `Verified ${report.checked_documents} legal documents: ${report.passed ? 'PASS' : 'FAIL'}`
      );
      for (const err of report.errors) {
        console.log(`[FAIL] (${err.path}) ${err.rule}: ${err.detail}`);
      }
    }
    process.exit(report.passed ? 0 : 1);
  } catch (err) {
    if (opts.json) {
      console.log(JSON.stringify({ passed: false, error: err.message }, null, 2));
    } else {
      console.error(`Error: ${err.message}`);
    }
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main();
}
