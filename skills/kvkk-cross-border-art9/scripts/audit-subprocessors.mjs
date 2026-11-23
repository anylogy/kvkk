#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const HELP_TEXT = `audit-subprocessors.mjs - Audit vendor/subprocessor manifests against post-Sept 2024 Turkish KVKK Article 9 rules

Usage:
  node audit-subprocessors.mjs --file <subprocessors.json> [options]

Options:
  --file <path>              Path to subprocessor JSON manifest (required)
  --as-of <YYYY-MM-DD>       Reference date for checking unnotified SCC 5-business-day deadlines (default: today)
  --holidays <dates>         Comma-separated Turkish official public holidays (YYYY-MM-DD) to exclude from 5-business-day counts
  --json                     Emit machine-readable JSON output
  -h, --help                 Show this help text

Notice:
  Technical compliance engineering tool only; not formal Turkish legal advice (hukuki mutalaa).
`;

const VALID_FOREIGN_MECHANISMS = new Set([
  'ADEQUACY',
  'SCC_FILED',
  'BCR_APPROVED',
  'PUBLIC_AGREEMENT',
  'BOARD_UNDERTAKING',
  'ARIZI_EXCEPTION',
]);

const VALID_SCC_MODULES = new Set(['SS-1', 'SS-2', 'SS-3', 'SS-4']);

export function parseStrictIsoDate(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return null;
  }
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) {
    return null;
  }
  return d;
}

export function countBusinessDays(startIso, endIso, holidays = []) {
  const start = parseStrictIsoDate(startIso);
  const end = parseStrictIsoDate(endIso);
  if (!start || !end) {
    return null;
  }
  if (end < start) return -1;

  const holidaySet = new Set();
  for (const h of holidays) {
    if (!parseStrictIsoDate(h)) {
      throw new Error(`Invalid holiday date '${h}' (expected YYYY-MM-DD).`);
    }
    holidaySet.add(h);
  }

  let days = 0;
  const cursor = new Date(start);
  while (cursor < end) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const day = cursor.getUTCDay();
    const iso = cursor.toISOString().slice(0, 10);
    if (day !== 0 && day !== 6 && !holidaySet.has(iso)) {
      days += 1;
    }
  }
  return days;
}

export function auditSubprocessors(manifest, options = {}) {
  const asOf = options.asOf || new Date().toISOString().slice(0, 10);
  if (!parseStrictIsoDate(asOf)) {
    throw new Error(`Invalid --as-of date '${asOf}' (expected YYYY-MM-DD).`);
  }

  const holidays = Array.isArray(options.holidays) ? options.holidays : [];
  for (const h of holidays) {
    if (!parseStrictIsoDate(h)) {
      throw new Error(`Invalid --holidays date '${h}' (expected YYYY-MM-DD).`);
    }
  }
  const businessDayNote =
    holidays.length > 0
      ? `5-business-day counts start after signature completion excluding weekends and ${holidays.length} provided Turkish public holiday(s).`
      : '5-business-day counts start after signature completion excluding weekends; verify and pass Turkish official public holidays (resmi tatiller) via --holidays if any fall inside the window.';

  const vendors = Array.isArray(manifest?.subprocessors) ? manifest.subprocessors : [];
  const findings = [];

  if (!manifest || !Array.isArray(manifest.subprocessors)) {
    return {
      passed: false,
      as_of: asOf,
      vendor_count: 0,
      p0: 1,
      p1: 0,
      findings: [
        {
          vendor: 'ROOT',
          severity: 'P0',
          rule: 'INVALID_MANIFEST',
          detail: 'Manifest must contain a subprocessors array.',
        },
      ],
    };
  }

  for (const v of vendors) {
    const name = v.vendor_name || 'UNNAMED_VENDOR';
    const hosting = String(v.hosting_country || '').trim().toUpperCase();
    const controlEntity = String(v.controlling_entity_country || hosting).trim().toUpperCase();
    const hasForeignControlPlane = Boolean(v.foreign_control_plane);
    const hasForeignAccess = Boolean(v.subprocessor_access_from_abroad);
    const isCrossBorder =
      hosting !== 'TR' || controlEntity !== 'TR' || hasForeignControlPlane || hasForeignAccess;

    if (!isCrossBorder) {
      continue;
    }

    const freq = String(v.frequency || 'CONTINUOUS').trim().toUpperCase();
    const mech = String(v.transfer_mechanism || '').trim().toUpperCase();
    const sccModule = String(v.scc_module || '').trim().toUpperCase();

    if (mech === 'EXPLICIT_CONSENT') {
      if (freq === 'CONTINUOUS' || freq === 'SYSTEMATIC') {
        findings.push({
          vendor: name,
          severity: 'P0',
          rule: 'ART9_ILLEGAL_EXPLICIT_CONSENT',
          detail: 'Continuous/systematic foreign transfer cannot rely on EXPLICIT_CONSENT under post-Sept 2024 KVKK Art. 9.',
        });
      } else {
        findings.push({
          vendor: name,
          severity: 'P0',
          rule: 'ART9_USE_ARIZI_EXCEPTION',
          detail: 'Occasional consent-based transfer must be explicitly classified as ARIZI_EXCEPTION (Art. 9/6-a) with risk-informed consent.',
        });
      }
      continue;
    }

    if (mech === 'SCC_SIGNED') {
      if (!sccModule || !VALID_SCC_MODULES.has(sccModule)) {
        findings.push({
          vendor: name,
          severity: 'P0',
          rule: 'ART9_MISSING_SCC_MODULE',
          detail: 'Signed Standard Contract must specify scc_module (SS-1, SS-2, SS-3, or SS-4).',
        });
      }
      const gap = v.scc_signed_date ? countBusinessDays(v.scc_signed_date, asOf, holidays) : null;
      if (gap === null || gap < 0 || gap > 5) {
        findings.push({
          vendor: name,
          severity: 'P0',
          rule: 'ART9_SCC_NOTIFICATION_OVERDUE',
          detail: `SCC_SIGNED without valid kvkk_notification_date exceeds 5-business-day SLA (gap: ${gap ?? 'invalid/missing date'} business days; Art. 18/1-d fine exposure).`,
        });
      } else {
        const remaining = 5 - gap;
        findings.push({
          vendor: name,
          severity: 'P1',
          rule: 'ART9_SCC_NOTIFICATION_PENDING',
          business_days_remaining: remaining,
          detail: `SCC_SIGNED pending KVKK Authority filing (${gap}/5 business days elapsed since ${v.scc_signed_date}; ${remaining} business day(s) remaining${gap >= 4 ? ' - URGENT' : ''}).`,
        });
      }
      continue;
    }

    if (!VALID_FOREIGN_MECHANISMS.has(mech)) {
      findings.push({
        vendor: name,
        severity: 'P0',
        rule: 'ART9_MISSING_MECHANISM',
        detail: `Foreign-exposed vendor (hosting=${hosting}, control=${controlEntity}, foreign_control_plane=${hasForeignControlPlane}, remote_access=${hasForeignAccess}) lacks a valid Art. 9 transfer_mechanism.`,
      });
      continue;
    }

    if (mech === 'ARIZI_EXCEPTION' && freq !== 'OCCASIONAL') {
      findings.push({
        vendor: name,
        severity: 'P0',
        rule: 'ART9_ARIZI_ON_CONTINUOUS',
        detail: `ARIZI_EXCEPTION (Art. 9/6) is strictly limited to OCCASIONAL transfers (got frequency='${freq}').`,
      });
    }

    if (mech === 'SCC_FILED') {
      if (!sccModule || !VALID_SCC_MODULES.has(sccModule)) {
        findings.push({
          vendor: name,
          severity: 'P0',
          rule: 'ART9_MISSING_SCC_MODULE',
          detail: 'SCC_FILED vendor must specify scc_module (SS-1, SS-2, SS-3, or SS-4).',
        });
      }
      if (!v.scc_signed_date) {
        findings.push({
          vendor: name,
          severity: 'P0',
          rule: 'ART9_MISSING_SCC_SIGNED_DATE',
          detail: 'SCC_FILED vendor must record scc_signed_date to prove compliance with the 5-business-day KVKK Authority filing deadline.',
        });
      }
      if (!v.kvkk_notification_date) {
        findings.push({
          vendor: name,
          severity: 'P0',
          rule: 'ART9_UNFILED_SCC',
          detail: 'SCC_FILED vendor is missing kvkk_notification_date.',
        });
      } else if (!parseStrictIsoDate(v.kvkk_notification_date)) {
        findings.push({
          vendor: name,
          severity: 'P0',
          rule: 'ART9_INVALID_DATE',
          detail: `Invalid kvkk_notification_date '${v.kvkk_notification_date}' (expected YYYY-MM-DD).`,
        });
      } else if (v.scc_signed_date) {
        const filedDays = countBusinessDays(v.scc_signed_date, v.kvkk_notification_date, holidays);
        if (filedDays === null || filedDays < 0 || filedDays > 5) {
          findings.push({
            vendor: name,
            severity: 'P0',
            rule: 'ART9_SCC_LATE_FILING',
            detail: `Standard Contract notified ${filedDays} business days after signature (max 5 business days; Art. 18/1-d fine hits both controller & processor).`,
          });
        }
      }

      const lifecycleEvents = [
        { label: 'amendment', date: v.scc_amended_date },
        { label: 'termination', date: v.scc_terminated_date },
      ];
      for (const ev of lifecycleEvents) {
        if (!ev.date) continue;
        if (!parseStrictIsoDate(ev.date)) {
          findings.push({
            vendor: name,
            severity: 'P0',
            rule: 'ART9_INVALID_DATE',
            detail: `Invalid SCC ${ev.label} date '${ev.date}' (expected YYYY-MM-DD).`,
          });
          continue;
        }
        if (!v.scc_lifecycle_notification_date) {
          const lcGap = countBusinessDays(ev.date, asOf, holidays);
          if (lcGap === null || lcGap < 0 || lcGap > 5) {
            findings.push({
              vendor: name,
              severity: 'P0',
              rule: 'ART9_SCC_LIFECYCLE_OVERDUE',
              detail: `SCC ${ev.label} (${ev.date}) without scc_lifecycle_notification_date exceeds 5-business-day SLA (gap: ${lcGap} business days; Jan 2025 Guide & Art. 18/1-d).`,
            });
          } else {
            const remaining = 5 - lcGap;
            findings.push({
              vendor: name,
              severity: 'P1',
              rule: 'ART9_SCC_LIFECYCLE_PENDING',
              business_days_remaining: remaining,
              detail: `SCC ${ev.label} (${ev.date}) pending KVKK Authority notification (${lcGap}/5 business days elapsed; ${remaining} business day(s) remaining).`,
            });
          }
        } else if (!parseStrictIsoDate(v.scc_lifecycle_notification_date)) {
          findings.push({
            vendor: name,
            severity: 'P0',
            rule: 'ART9_INVALID_DATE',
            detail: `Invalid scc_lifecycle_notification_date '${v.scc_lifecycle_notification_date}' (expected YYYY-MM-DD).`,
          });
        } else {
          const lcFiledDays = countBusinessDays(ev.date, v.scc_lifecycle_notification_date, holidays);
          if (lcFiledDays === null || lcFiledDays < 0 || lcFiledDays > 5) {
            findings.push({
              vendor: name,
              severity: 'P0',
              rule: 'ART9_SCC_LIFECYCLE_LATE_FILING',
              detail: `SCC ${ev.label} notified ${lcFiledDays} business days after ${ev.date} (max 5 business days).`,
            });
          }
        }
      }
    }
  }

  const p0 = findings.filter((f) => f.severity === 'P0').length;
  const p1 = findings.filter((f) => f.severity === 'P1').length;

  return {
    passed: p0 === 0 && p1 === 0,
    as_of: asOf,
    holidays_excluded: holidays,
    business_day_note: businessDayNote,
    vendor_count: vendors.length,
    p0,
    p1,
    findings,
  };
}

function parseArgs(argv) {
  const opts = { holidays: [], json: argv.includes('--json'), help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--json') opts.json = true;
    else if (arg === '--file') {
      const val = argv[++i];
      if (!val || val.startsWith('--')) throw new Error('Missing file path after --file.');
      opts.file = val;
    } else if (arg === '--as-of') {
      const val = argv[++i];
      if (!val || val.startsWith('--')) throw new Error('Missing YYYY-MM-DD date after --as-of.');
      opts.asOf = val;
    } else if (arg === '--holidays') {
      const val = argv[++i];
      if (!val || val.startsWith('--')) throw new Error('Missing comma-separated YYYY-MM-DD dates after --holidays.');
      for (const item of val.split(',')) {
        const trimmed = item.trim();
        if (trimmed) opts.holidays.push(trimmed);
      }
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

  if (!opts.file) {
    if (opts.json) {
      console.log(JSON.stringify({ passed: false, error: '--file <subprocessors.json> is required.' }, null, 2));
    } else {
      console.error('Error: --file <subprocessors.json> is required.');
    }
    process.exit(1);
  }

  try {
    const absPath = path.resolve(opts.file);
    const data = JSON.parse(fs.readFileSync(absPath, 'utf8'));
    const report = auditSubprocessors(data, { asOf: opts.asOf, holidays: opts.holidays });

    if (opts.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Audited ${report.vendor_count} vendors (as of ${report.as_of}): ${report.passed ? 'PASS' : 'FAIL'}`);
      console.log(`Note: ${report.business_day_note}`);
      console.log(`Findings: P0=${report.p0}, P1=${report.p1}`);
      for (const f of report.findings) {
        console.log(`[${f.severity}] (${f.vendor}) ${f.rule}: ${f.detail}`);
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
