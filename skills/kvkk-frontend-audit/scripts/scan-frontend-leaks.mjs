#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const HELP_TEXT = `scan-frontend-leaks.mjs - Recursive frontend scanner for Turkish KVKK Art. 9 browser leaks, cookie UX anti-patterns, and client PII exposure

Usage:
  node scan-frontend-leaks.mjs --target <dir> [options]

Options:
  --target <dir>               Root directory to scan (default: ".")
  --allow-domain <domain>      First-party or sovereign domain to ignore silently (repeatable or comma-separated)
  --art9-approved-domain <d>   Third-party foreign domain backed by a valid post-Sept 2024 Art. 9 safeguard & updated Aydinlatma (repeatable or comma-separated)
  --exclude <dir>              Directory name or relative path prefix to skip (repeatable or comma-separated)
  --strict                     Fail on all severities (default also fails on P0 and P1)
  --strict-placeholders        Flag unfilled [PLACEHOLDER_...] tokens
  --json                       Emit machine-readable JSON output
  -h, --help                   Show this help text

Notice:
  Technical compliance engineering tool only; not formal Turkish legal advice (hukuki mutalaa).
`;

const MAX_FILE_BYTES = 2 * 1024 * 1024;

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.svelte-kit',
  '.next',
  '.nuxt',
  '.output',
  '.vercel',
  '.turbo',
  '.cache',
  'coverage',
  'playwright-report',
  'test-results',
  'storybook-static',
  '__pycache__',
  '.venv',
]);

const CODE_EXTENSIONS = new Set([
  '.html',
  '.htm',
  '.css',
  '.scss',
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.jsx',
  '.svelte',
  '.vue',
  '.astro',
]);

const BENIGN_DOMAINS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  'www.w3.org',
  'w3.org',
  'schema.org',
  'xmlns.com',
  'svelte.dev',
  'reactjs.org',
]);

const HIGH_RISK_FOREIGN_PATTERNS = [
  /fonts\.googleapis\.com/i,
  /fonts\.gstatic\.com/i,
  /googletagmanager\.com/i,
  /google-analytics\.com/i,
  /analytics\.google\.com/i,
  /connect\.facebook\.net/i,
  /facebook\.com\/tr/i,
  /static\.hotjar\.com/i,
  /api\.mixpanel\.com/i,
  /sentry\.io/i,
  /js\.stripe\.com/i,
  /google\.com\/recaptcha/i,
  /recaptcha\.net/i,
  /js\.hcaptcha\.com/i,
  /challenges\.cloudflare\.com\/turnstile/i,
  /cdn\.jsdelivr\.net/i,
  /unpkg\.com/i,
  /cdnjs\.cloudflare\.com/i,
  /ajax\.googleapis\.com/i,
  /accounts\.google\.com\/gsi/i,
  /plausible\.io/i,
  /posthog\.com/i,
  /segment\.com/i,
  /amplitude\.com/i,
  /intercom\.io/i,
  /crisp\.chat/i,
  /tawk\.to/i,
  /maps\.googleapis\.com/i,
  /youtube\.com\/embed/i,
  /cloudflareinsights\.com/i,
  /clarity\.ms/i,
  /mc\.yandex\.ru/i,
  /cdn\.tailwindcss\.com/i,
  /gravatar\.com/i,
];

const RISKY_SDK_PACKAGES = [
  '@sentry/',
  'sentry',
  'posthog-js',
  'mixpanel-browser',
  '@segment/',
  'react-ga',
  'react-ga4',
  'ga-4-react',
  '@vercel/analytics',
  '@vercel/speed-insights',
  'hotjar',
  '@hcaptcha/',
  'react-google-recaptcha',
  '@marsidev/react-turnstile',
  'svelte-turnstile',
  'firebase',
  '@firebase/',
  '@amplitude/',
  'amplitude-js',
  '@stripe/stripe-js',
  '@datadog/browser-rum',
  '@datadog/browser-logs',
  'logrocket',
  '@fullstory/',
  '@microsoft/clarity',
];

const URL_REGEX =
  /(?:^|[\s"'`(=])((?:https?:)?\/\/([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,})(?::\d+)?([^\s"'`<>)]*)?)/g;
const CLIENT_STORAGE_REGEX =
  /(?:localStorage|sessionStorage)(?:\.(?:setItem|getItem)|\s*\[\s*['"`]|\.[a-zA-Z0-9_$]+\s*=)|document\.cookie\s*=/;
const PRECHECKED_REGEX =
  /(?<!(?:^|[\s<])bind:)\bchecked\s*=\s*\{?\s*true\s*\}?|(?<!(?:^|[\s<])bind:)\bchecked\s*=\s*["'](?:true|checked)["']|\bdefaultChecked\b(?!\s*=\s*\{?\s*false\s*\}?)|<input\b[^>]*\btype=["']checkbox["'][^>]*\bchecked(?=\s|\/?>)|<input\b[^>]*\bchecked(?=\s|\/?>)[^>]*\btype=["']checkbox["']/i;
const CONSOLE_LOG_REGEX = /console\.(?:log|info|debug|warn)\s*\(/;
const PLACEHOLDER_REGEX = /\[PLACEHOLDER_[A-Z0-9_]+\]/g;
const PII_KEYWORD_REGEX =
  /\b(tc_no|tcno|tckn|tc_kimlik|kimlik|ikamet|ykn|id_token|passport|pasaport|email|eposta|e_posta|phone|telefon|gsm|token|access_token|refresh_token|birth|dogum|health|saglik|blood|kan_grubu|religion|din|uyruk|nationality|adres|address)\b/i;

function normalizeDomain(input) {
  let clean = String(input || '').trim().toLowerCase();
  clean = clean.replace(/^https?:\/\//, '').replace(/^\/\//, '');
  clean = clean.split('/')[0].split(':')[0];
  return clean;
}

function isDomainAllowed(hostname, allowedDomains) {
  const lower = hostname.toLowerCase();
  if (BENIGN_DOMAINS.has(lower)) return true;
  for (const clean of allowedDomains) {
    if (lower === clean || lower.endsWith(`.${clean}`)) {
      return true;
    }
  }
  return false;
}

function isCommentOnlyLine(trimmedLine) {
  if (!trimmedLine) return false;
  if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
    return true;
  }
  if (trimmedLine.startsWith('<!--') && trimmedLine.endsWith('-->')) {
    return true;
  }
  return false;
}

function shouldExcludeDir(entryName, relPath, excludeSet) {
  if (SKIP_DIRS.has(entryName)) return true;
  if (excludeSet.has(entryName)) return true;
  for (const ex of excludeSet) {
    if (relPath === ex || relPath.startsWith(`${ex}/`)) {
      return true;
    }
  }
  return false;
}

function collectFiles(dirPath, rootDir, excludeSet, state) {
  const entries = fs
    .readdirSync(dirPath, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const abs = path.join(dirPath, entry.name);
    const rel = path.relative(rootDir, abs).replaceAll('\\', '/');
    if (entry.isDirectory()) {
      if (shouldExcludeDir(entry.name, rel, excludeSet)) continue;
      collectFiles(abs, rootDir, excludeSet, state);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (entry.name === 'package.json' || CODE_EXTENSIONS.has(ext)) {
        const size = fs.statSync(abs).size;
        if (size > MAX_FILE_BYTES) {
          state.skippedLargeFiles += 1;
          continue;
        }
        state.files.push({ absPath: abs, relPath: rel });
      }
    }
  }
}

export function scanFrontendDirectory(targetDir, options = {}) {
  const absTarget = path.resolve(targetDir);
  if (!fs.existsSync(absTarget)) {
    throw new Error(`Target directory does not exist: ${absTarget}`);
  }

  const allowedDomains = new Set(
    (options.allowDomains || []).map(normalizeDomain).filter(Boolean)
  );
  const art9ApprovedDomains = new Set(
    (options.art9ApprovedDomains || []).map(normalizeDomain).filter(Boolean)
  );
  const excludeSet = new Set(
    (options.excludes || []).map((x) => String(x).trim().replaceAll('\\', '/').replace(/\/+$/, '')).filter(Boolean)
  );
  const strictPlaceholders = Boolean(options.strictPlaceholders);

  const state = { files: [], skippedLargeFiles: 0 };
  collectFiles(absTarget, absTarget, excludeSet, state);
  const findings = [];
  const art9ApprovedMap = new Map();

  for (const fileObj of state.files) {
    const { absPath, relPath } = fileObj;
    const content = fs.readFileSync(absPath, 'utf8');
    const lines = content.split(/\r?\n/);

    if (path.basename(absPath) === 'package.json') {
      try {
        const pkg = JSON.parse(content);
        const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        for (const depName of Object.keys(allDeps)) {
          const matchedRisk = RISKY_SDK_PACKAGES.some(
            (prefix) => depName === prefix || depName.startsWith(prefix)
          );
          if (matchedRisk) {
            const lineIdx = lines.findIndex((l) => l.includes(`"${depName}"`));
            findings.push({
              rule: 'ART9_FOREIGN_SDK_DEP',
              severity: 'P0',
              file: relPath,
              line: lineIdx >= 0 ? lineIdx + 1 : 1,
              snippet: depName,
              detail: `Package '${depName}' may initiate foreign telemetry/captcha/payment transfers under KVKK Art. 9.`,
            });
          }
        }
      } catch {
        // Ignore malformed package.json here.
      }
      continue;
    }

    for (let idx = 0; idx < lines.length; idx += 1) {
      const lineText = lines[idx];
      if (!lineText) continue;
      const lineNo = idx + 1;
      const trimmed = lineText.trim();
      const commentLine = isCommentOnlyLine(trimmed);

      if (!commentLine) {
        if (lineText.includes('//')) {
          URL_REGEX.lastIndex = 0;
          let m;
          while ((m = URL_REGEX.exec(lineText)) !== null) {
            const fullUrl = m[1];
            const hostname = m[2];
            if (!hostname || isDomainAllowed(hostname, allowedDomains)) continue;
            if (isDomainAllowed(hostname, art9ApprovedDomains)) {
              const normHost = hostname.toLowerCase();
              if (!art9ApprovedMap.has(normHost)) {
                art9ApprovedMap.set(normHost, {
                  domain: normHost,
                  first_seen: `${relPath}:${lineNo}`,
                  verification_note:
                    'Excluded from P0 via --art9-approved-domain; verify executed & KVKK-notified Standard Contract (or Adequacy/BCR) and updated Aydinlatma Metni.',
                });
              }
              continue;
            }
            const isKnownHighRisk = HIGH_RISK_FOREIGN_PATTERNS.some((re) => re.test(fullUrl));
            findings.push({
              rule: 'ART9_FOREIGN_ENDPOINT',
              severity: 'P0',
              file: relPath,
              line: lineNo,
              snippet: fullUrl,
              detail: isKnownHighRisk
                ? `Unverified high-risk foreign tracker/CDN/font/captcha URL (${hostname}) triggers an unlawful Art. 9 browser transfer unless backed by a filed Art. 9 safeguard + updated Aydinlatma (--art9-approved-domain).`
                : `Unverified external origin (${hostname}) contacted by browser requires post-Sept 2024 Art. 9 safeguard verification (and --art9-approved-domain) or sovereign self-hosting.`,
            });
          }
        }

        if (
          (lineText.includes('Storage') || lineText.includes('document.cookie')) &&
          CLIENT_STORAGE_REGEX.test(lineText) &&
          PII_KEYWORD_REGEX.test(lineText)
        ) {
          findings.push({
            rule: 'CLIENT_STORAGE_PII',
            severity: 'P0',
            file: relPath,
            line: lineNo,
            snippet: trimmed,
            detail: 'Client-side browser storage or document.cookie accesses potential PII/identity attributes.',
          });
        }

        if (
          (lineText.includes('checked') || lineText.includes('defaultChecked')) &&
          PRECHECKED_REGEX.test(lineText)
        ) {
          findings.push({
            rule: 'PRECHECKED_CONSENT',
            severity: 'P1',
            file: relPath,
            line: lineNo,
            snippet: trimmed,
            detail: 'Pre-checked checkbox pattern violates KVKK Cookie Guidelines & Acik Riza opt-in rules.',
          });
        }

        if (
          lineText.includes('console.') &&
          CONSOLE_LOG_REGEX.test(lineText) &&
          PII_KEYWORD_REGEX.test(lineText)
        ) {
          findings.push({
            rule: 'CONSOLE_PII_LEAK',
            severity: 'P1',
            file: relPath,
            line: lineNo,
            snippet: trimmed,
            detail: 'Browser console logging appears to reference PII or token fields.',
          });
        }
      }

      if (strictPlaceholders && lineText.includes('[PLACEHOLDER_')) {
        const placeholderMatches = lineText.match(PLACEHOLDER_REGEX);
        if (placeholderMatches) {
          for (const token of placeholderMatches) {
            findings.push({
              rule: 'UNFILLED_PLACEHOLDER',
              severity: 'P1',
              file: relPath,
              line: lineNo,
              snippet: token,
              detail: `Unfilled legal template placeholder token '${token}' detected.`,
            });
          }
        }
      }
    }
  }

  const p0Count = findings.filter((f) => f.severity === 'P0').length;
  const p1Count = findings.filter((f) => f.severity === 'P1').length;
  const art9ApprovedOrigins = [...art9ApprovedMap.values()];
  return {
    target: absTarget,
    scanned_files: state.files.length,
    summary: {
      total_findings: findings.length,
      p0: p0Count,
      p1: p1Count,
      art9_approved_origins_count: art9ApprovedOrigins.length,
      skipped_large_files: state.skippedLargeFiles,
      passed: findings.length === 0,
    },
    art9_approved_origins: art9ApprovedOrigins,
    findings,
  };
}

function parseArgs(argv) {
  const opts = {
    target: '.',
    allowDomains: [],
    art9ApprovedDomains: [],
    excludes: [],
    strict: false,
    strictPlaceholders: false,
    json: argv.includes('--json'),
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg === '--json') {
      opts.json = true;
    } else if (arg === '--strict') {
      opts.strict = true;
    } else if (arg === '--strict-placeholders') {
      opts.strictPlaceholders = true;
    } else if (arg === '--target') {
      const val = argv[++i];
      if (!val || val.startsWith('--')) throw new Error('Missing value after --target.');
      opts.target = val;
    } else if (arg === '--allow-domain') {
      const val = argv[++i];
      if (!val || val.startsWith('--')) throw new Error('Missing value after --allow-domain.');
      for (const item of val.split(',')) {
        const trimmed = item.trim();
        if (trimmed) opts.allowDomains.push(trimmed);
      }
    } else if (arg === '--art9-approved-domain') {
      const val = argv[++i];
      if (!val || val.startsWith('--')) throw new Error('Missing value after --art9-approved-domain.');
      for (const item of val.split(',')) {
        const trimmed = item.trim();
        if (trimmed) opts.art9ApprovedDomains.push(trimmed);
      }
    } else if (arg === '--exclude') {
      const val = argv[++i];
      if (!val || val.startsWith('--')) throw new Error('Missing value after --exclude.');
      for (const item of val.split(',')) {
        const trimmed = item.trim();
        if (trimmed) opts.excludes.push(trimmed);
      }
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
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
      console.log(JSON.stringify({ error: err.message }, null, 2));
    } else {
      console.error(`Error: ${err.message}`);
    }
    process.exit(1);
  }

  if (opts.help) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  try {
    const report = scanFrontendDirectory(opts.target, {
      allowDomains: opts.allowDomains,
      art9ApprovedDomains: opts.art9ApprovedDomains,
      excludes: opts.excludes,
      strictPlaceholders: opts.strictPlaceholders,
    });

    if (opts.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Scanned ${report.scanned_files} files in ${report.target}`);
      console.log(
        `Findings: ${report.summary.total_findings} (P0: ${report.summary.p0}, P1: ${report.summary.p1}, Art.9 Approved Origins: ${report.summary.art9_approved_origins_count}, Skipped large files: ${report.summary.skipped_large_files})`
      );
      for (const a of report.art9_approved_origins) {
        console.log(`[INFO] ART9_APPROVED_ORIGIN ${a.domain} (${a.first_seen}) - ${a.verification_note}`);
      }
      for (const f of report.findings) {
        console.log(`[${f.severity}] ${f.rule} ${f.file}:${f.line} - ${f.detail} (${f.snippet})`);
      }
    }

    const shouldFail = opts.strict
      ? report.summary.total_findings > 0
      : report.summary.p0 > 0 || report.summary.p1 > 0;
    process.exit(shouldFail ? 1 : 0);
  } catch (err) {
    if (opts.json) {
      console.log(JSON.stringify({ error: err.message }, null, 2));
    } else {
      console.error(`Error: ${err.message}`);
    }
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main();
}
