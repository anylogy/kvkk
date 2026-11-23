#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import nodeTest from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const queuedTests = [];
let useFallbackRunner = false;

function test(name, fn) {
  if (useFallbackRunner) {
    queuedTests.push({ name, fn });
    return;
  }
  try {
    nodeTest(name, fn);
  } catch (err) {
    if (String(err?.message || '').includes('outside of the test runner')) {
      useFallbackRunner = true;
      queuedTests.push({ name, fn });
    } else {
      throw err;
    }
  }
}

async function flushFallbackRunnerIfNeeded() {
  if (!useFallbackRunner || queuedTests.length === 0) return;
  let passed = 0;
  let failed = 0;
  for (const item of queuedTests) {
    try {
      await item.fn();
      passed += 1;
      console.log(`PASS: ${item.name}`);
    } catch (err) {
      failed += 1;
      console.error(`FAIL: ${item.name}\n${err?.stack || err}`);
    }
  }
  console.log(`\n${passed} passed, ${failed} failed (${queuedTests.length} total).`);
  if (failed > 0) process.exit(1);
}

function runScript(relScriptPath, args) {
  const absScript = path.join(ROOT_DIR, relScriptPath);
  const res = spawnSync(process.execPath, [absScript, ...args], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });
  let parsed = null;
  try {
    if (res.stdout && res.stdout.trim().startsWith('{')) {
      parsed = JSON.parse(res.stdout);
    }
  } catch {
    parsed = null;
  }
  return { status: res.status, stdout: res.stdout, stderr: res.stderr, json: parsed };
}

function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kvkk-e2e-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// 1. check-verbis-threshold.mjs
test('VERBIS: general threshold 2023/1154 (< 50 employees AND < 100M TL balance sheet)', () => {
  const exempt = runScript('skills/kvkk-core-law-2026/scripts/check-verbis-threshold.mjs', [
    '--employees', '49',
    '--balance-sheet-try', '99999999',
    '--json',
  ]);
  assert.equal(exempt.status, 0);
  assert.equal(exempt.json.verbis_required, false);
  assert.equal(exempt.json.status, 'EXEMPT_GENERAL');
  assert.match(exempt.json.mandatory_obligations_warning, /NEVER waives/);

  const required = runScript('skills/kvkk-core-law-2026/scripts/check-verbis-threshold.mjs', [
    '--employees', '50',
    '--balance-sheet-try', '5000000',
    '--json',
  ]);
  assert.equal(required.status, 0);
  assert.equal(required.json.verbis_required, true);
  assert.equal(required.json.status, 'REQUIRED_GENERAL');
});

test('VERBIS: Art. 6 primary micro-exemption 2025/1572 & 2025/2393 (9/9M vs 12/9M)', () => {
  const exempt = runScript('skills/kvkk-core-law-2026/scripts/check-verbis-threshold.mjs', [
    '--employees', '9',
    '--balance-sheet-try', '9000000',
    '--art6-primary',
    '--json',
  ]);
  assert.equal(exempt.status, 0);
  assert.equal(exempt.json.verbis_required, false);
  assert.equal(exempt.json.status, 'EXEMPT_ART6_MICRO');

  const required = runScript('skills/kvkk-core-law-2026/scripts/check-verbis-threshold.mjs', [
    '--employees', '12',
    '--balance-sheet-try', '9000000',
    '--art6-primary',
    '--json',
  ]);
  assert.equal(required.status, 0);
  assert.equal(required.json.verbis_required, true);
  assert.equal(required.json.status, 'REQUIRED_ART6_PRIMARY');
});

test('VERBIS: foreign controller always required (with Temsilci duty), non-balance-sheet basis, turnover & fractional rejected', () => {
  const foreign = runScript('skills/kvkk-core-law-2026/scripts/check-verbis-threshold.mjs', [
    '--foreign-controller',
    '--employees', '1',
    '--balance-sheet-try', '0',
    '--json',
  ]);
  assert.equal(foreign.status, 0);
  assert.equal(foreign.json.verbis_required, true);
  assert.equal(foreign.json.status, 'REQUIRED_FOREIGN_CONTROLLER');
  assert.match(foreign.json.reason, /Veri Sorumlusu Temsilcisi/);
  assert.match(foreign.json.mandatory_obligations_warning, /Art\. 5\/6.*Art\. 10.*Art\. 12.*Art\. 13/);

  const nonBsExempt = runScript('skills/kvkk-core-law-2026/scripts/check-verbis-threshold.mjs', [
    '--employees', '9',
    '--art6-primary',
    '--non-balance-sheet',
    '--json',
  ]);
  assert.equal(nonBsExempt.status, 0);
  assert.equal(nonBsExempt.json.verbis_required, false);
  assert.equal(nonBsExempt.json.inputs.bookkeeping_basis, 'non-balance-sheet');
  assert.equal(nonBsExempt.json.thresholds.balance_sheet_evaluated, false);

  const nonBsRequired = runScript('skills/kvkk-core-law-2026/scripts/check-verbis-threshold.mjs', [
    '--employees', '50',
    '--non-balance-sheet',
    '--json',
  ]);
  assert.equal(nonBsRequired.status, 0);
  assert.equal(nonBsRequired.json.verbis_required, true);
  assert.equal(nonBsRequired.json.status, 'REQUIRED_GENERAL');

  const turnoverOnly = runScript('skills/kvkk-core-law-2026/scripts/check-verbis-threshold.mjs', [
    '--employees', '5',
    '--turnover-try', '1000000',
    '--json',
  ]);
  assert.equal(turnoverOnly.status, 1);
  assert.match(turnoverOnly.json.error, /balance sheet total/i);

  const fractional = runScript('skills/kvkk-core-law-2026/scripts/check-verbis-threshold.mjs', [
    '--employees', '9.5',
    '--balance-sheet-try', '1000000',
    '--json',
  ]);
  assert.equal(fractional.status, 1);
  assert.match(fractional.json.error, /non-negative integer/i);
});

// 2. scan-frontend-leaks.mjs
test('Frontend scanner: clean sovereign Svelte fixture passes (exit 0)', () => {
  const res = runScript('skills/kvkk-frontend-audit/scripts/scan-frontend-leaks.mjs', [
    '--target', 'tests/fixtures/frontend-clean',
    '--allow-domain', 'https://app.example.com.tr/api',
    '--strict-placeholders',
    '--json',
  ]);
  assert.equal(res.status, 0);
  assert.equal(res.json.summary.total_findings, 0);
  assert.equal(res.json.summary.passed, true);
});

test('Frontend scanner: React .tsx, Vue v-bind:checked, and --art9-approved-domain handling', () => {
  withTempDir((tmpDir) => {
    fs.writeFileSync(
      path.join(tmpDir, 'clean.svelte'),
      `// See https://fonts.googleapis.com/docs in comment only\n<!-- https://cdn.jsdelivr.net/comment -->\n<script>\n  const tc = 1;\n  localStorage.setItem('tc', String(tc));\n</script>\n<input type="checkbox" defaultChecked={false} />\n`
    );
    const cleanRes = runScript('skills/kvkk-frontend-audit/scripts/scan-frontend-leaks.mjs', [
      '--target', tmpDir,
      '--json',
    ]);
    assert.equal(cleanRes.status, 0);
    assert.equal(cleanRes.json.summary.total_findings, 0);

    fs.writeFileSync(
      path.join(tmpDir, 'leak.html'),
      `<link rel="stylesheet" href="//fonts.googleapis.com/css2?family=Inter" />\n<script src="https://plausible.io/js/script.js"></script>\n`
    );
    fs.writeFileSync(
      path.join(tmpDir, 'App.vue'),
      `<template>\n  <input type="checkbox" v-bind:checked="true" />\n  <input type="checkbox" :checked="true" />\n</template>\n`
    );
    const leakRes = runScript('skills/kvkk-frontend-audit/scripts/scan-frontend-leaks.mjs', [
      '--target', tmpDir,
      '--art9-approved-domain', 'plausible.io',
      '--json',
    ]);
    assert.equal(leakRes.status, 1);
    assert.equal(leakRes.json.summary.art9_approved_origins_count, 1);
    assert.equal(leakRes.json.art9_approved_origins[0].domain, 'plausible.io');
    const endpointFindings = leakRes.json.findings.filter((f) => f.rule === 'ART9_FOREIGN_ENDPOINT');
    const precheckedFindings = leakRes.json.findings.filter((f) => f.rule === 'PRECHECKED_CONSENT');
    assert.equal(endpointFindings.length, 1);
    assert.equal(precheckedFindings.length, 2);
  });
});

test('Frontend scanner: leaking fixture (Svelte + HTML + React .tsx) flags all P0/P1 leak classes', () => {
  const res = runScript('skills/kvkk-frontend-audit/scripts/scan-frontend-leaks.mjs', [
    '--target', 'tests/fixtures/frontend-leaking',
    '--strict-placeholders',
    '--json',
  ]);
  assert.equal(res.status, 1);
  const rules = new Set(res.json.findings.map((f) => f.rule));
  assert.ok(rules.has('ART9_FOREIGN_ENDPOINT'));
  assert.ok(rules.has('ART9_FOREIGN_SDK_DEP'));
  assert.ok(rules.has('CLIENT_STORAGE_PII'));
  assert.ok(rules.has('PRECHECKED_CONSENT'));
  assert.ok(rules.has('CONSOLE_PII_LEAK'));
  assert.ok(rules.has('UNFILLED_PLACEHOLDER'));
  const files = new Set(res.json.findings.map((f) => f.file));
  assert.ok(files.has('src/ConsentBanner.tsx'));
  for (const f of res.json.findings) {
    assert.ok(Number.isInteger(f.line) && f.line >= 1);
  }
});

// 3. validate-inventory.mjs
test('Inventory validator: compliant inventory passes (exit 0) and violating inventory fails with Yonetmelik Art. 5 & Art. 6 rules', () => {
  const ok = runScript('skills/kvkk-backend-architecture/scripts/validate-inventory.mjs', [
    '--file', 'tests/fixtures/inventory-compliant.json',
    '--json',
  ]);
  assert.equal(ok.status, 0);
  assert.equal(ok.json.valid, true);

  const bad = runScript('skills/kvkk-backend-architecture/scripts/validate-inventory.mjs', [
    '--file', 'tests/fixtures/inventory-violating.json',
    '--json',
  ]);
  assert.equal(bad.status, 1);
  assert.equal(bad.json.valid, false);
  const rules = new Set(bad.json.errors.map((e) => e.rule));
  assert.ok(rules.has('REPEALED_ART6_2'));
  assert.ok(rules.has('MISSING_DECISION_2018_10_CONTROLS'));
  assert.ok(rules.has('MISSING_RECIPIENT_GROUPS'));
  assert.ok(rules.has('MISSING_SECURITY_MEASURES'));
  assert.ok(rules.has('UNBOUNDED_RETENTION_PERIOD'));
  assert.ok(rules.has('INVALID_PERIODIC_DESTRUCTION_CYCLE'));
  assert.ok(rules.has('INVALID_DESTRUCTION_LOG_RETENTION'));
  assert.ok(rules.has('ART9_ILLEGAL_EXPLICIT_CONSENT'));
});

test('Inventory validator: catches unflagged Art. 6 & late SCC while allowing uyruk alone under Art. 5', () => {
  withTempDir((tmpDir) => {
    const uyrukOkPath = path.join(tmpDir, 'uyruk-ok.json');
    fs.writeFileSync(
      uyrukOkPath,
      JSON.stringify({
        schema_version: 'kvkk-inventory-2026-v1',
        veri_sorumlusu: {
          unvan: 'Anatolia Teknoloji A.S.',
          irtibat_kisisi: { name: 'Anylogy KVKK Ekibi', email: 'kvkk@example.tr' },
        },
        activities: [
          {
            id: 'UYRUK-01',
            process_name: 'Uyruk ve Vize Danismanlik',
            data_subject_group: 'Basvuru Sahipleri',
            data_categories: ['Kimlik', 'Uyruk'],
            is_special_category: false,
            processing_purposes: ['Hizmet sunumu'],
            legal_basis: 'ART_5_2_C_CONTRACT',
            retention_period: '5 yil',
            periodic_destruction_months: 6,
            destruction_log_retention_years: 3,
            domestic_recipients: [],
            technical_and_administrative_measures: ['TLS 1.3 and RBAC access control'],
            cross_border_transfer: { enabled: false, destination_countries: ['TR'] },
          },
        ],
      })
    );
    const okRes = runScript('skills/kvkk-backend-architecture/scripts/validate-inventory.mjs', [
      '--file', uyrukOkPath,
      '--json',
    ]);
    assert.equal(okRes.status, 0);

    const edgeBadPath = path.join(tmpDir, 'edge-bad.json');
    fs.writeFileSync(
      edgeBadPath,
      JSON.stringify({
        schema_version: 'kvkk-inventory-2026-v1',
        veri_sorumlusu: {
          unvan: 'Anatolia Teknoloji A.S.',
          irtibat_kisisi: { name: 'Anylogy KVKK Ekibi', email: 'kvkk@example.tr' },
        },
        activities: [
          {
            id: 'EDGE-01',
            process_name: 'Saglik Sigortasi Dosyasi',
            data_subject_group: 'Basvuru Sahipleri',
            data_categories: ['Saglik Raporu', 'Kan Grubu'],
            is_special_category: false,
            processing_purposes: [],
            legal_basis: 'ART_5_2_C_CONTRACT',
            retention_period: '5 yil',
            periodic_destruction_months: 6,
            destruction_log_retention_years: 3,
            cross_border_transfer: {
              enabled: true,
              frequency: 'CONTINUOUS',
              mechanism: 'SCC_FILED',
              scc_module: 'SS-2',
              scc_signed_date: '2026-10-01',
              kvkk_notification_date: '2026-10-20',
            },
          },
        ],
      })
    );
    const badRes = runScript('skills/kvkk-backend-architecture/scripts/validate-inventory.mjs', [
      '--file', edgeBadPath,
      '--json',
    ]);
    assert.equal(badRes.status, 1);
    const rules = new Set(badRes.json.errors.map((e) => e.rule));
    assert.ok(rules.has('UNFLAGGED_SPECIAL_CATEGORY'));
    assert.ok(rules.has('ART9_SCC_LATE_FILING'));
    assert.ok(rules.has('MISSING_PROCESSING_PURPOSES'));
    assert.ok(rules.has('MISSING_RECIPIENT_GROUPS'));
    assert.ok(rules.has('MISSING_SECURITY_MEASURES'));
  });
});

// 4. audit-subprocessors.mjs
test('Subprocessor auditor: compliant TR + filed SS-2 passes (exit 0), violating manifest fails (exit 1)', () => {
  const ok = runScript('skills/kvkk-cross-border-art9/scripts/audit-subprocessors.mjs', [
    '--file', 'tests/fixtures/subprocessors-compliant.json',
    '--as-of', '2026-10-15',
    '--json',
  ]);
  assert.equal(ok.status, 0);
  assert.equal(ok.json.passed, true);
  assert.match(ok.json.business_day_note, /resmi tatiller/);

  const bad = runScript('skills/kvkk-cross-border-art9/scripts/audit-subprocessors.mjs', [
    '--file', 'tests/fixtures/subprocessors-violating.json',
    '--as-of', '2026-10-15',
    '--json',
  ]);
  assert.equal(bad.status, 1);
  assert.equal(bad.json.passed, false);
  const rules = new Set(bad.json.findings.map((f) => f.rule));
  assert.ok(rules.has('ART9_ILLEGAL_EXPLICIT_CONSENT'));
  assert.ok(rules.has('ART9_SCC_NOTIFICATION_OVERDUE'));
});

test('Subprocessor auditor: handles Turkish public --holidays exclusion, lifecycle amendments, invalid dates, and missing scc_signed_date', () => {
  withTempDir((tmpDir) => {
    // Signed Thu 2026-10-22, notified Fri 2026-10-30 = 6 weekdays, or 5 business days excluding 2026-10-29 Republic Day.
    const holidayPath = path.join(tmpDir, 'subprocessors-holiday.json');
    fs.writeFileSync(
      holidayPath,
      JSON.stringify({
        subprocessors: [
          {
            vendor_name: 'Republic Day SCC Vendor',
            hosting_country: 'DE',
            frequency: 'CONTINUOUS',
            transfer_mechanism: 'SCC_FILED',
            scc_module: 'SS-2',
            scc_signed_date: '2026-10-22',
            kvkk_notification_date: '2026-10-30',
          },
        ],
      })
    );
    const noHolidayRes = runScript('skills/kvkk-cross-border-art9/scripts/audit-subprocessors.mjs', [
      '--file', holidayPath,
      '--json',
    ]);
    assert.equal(noHolidayRes.status, 1);
    assert.equal(noHolidayRes.json.findings[0].rule, 'ART9_SCC_LATE_FILING');

    const withHolidayRes = runScript('skills/kvkk-cross-border-art9/scripts/audit-subprocessors.mjs', [
      '--file', holidayPath,
      '--holidays', '2026-10-29',
      '--json',
    ]);
    assert.equal(withHolidayRes.status, 0);
    assert.equal(withHolidayRes.json.passed, true);

    const filePath = path.join(tmpDir, 'subprocessors-edge.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        subprocessors: [
          {
            vendor_name: 'Missing Signed Date Vendor',
            hosting_country: 'DE',
            frequency: 'CONTINUOUS',
            transfer_mechanism: 'SCC_FILED',
            scc_module: 'ss-2',
            kvkk_notification_date: '2026-02-31',
          },
          {
            vendor_name: 'Unnotified Amendment Vendor',
            hosting_country: 'DE',
            frequency: 'CONTINUOUS',
            transfer_mechanism: 'SCC_FILED',
            scc_module: 'SS-2',
            scc_signed_date: '2026-09-01',
            kvkk_notification_date: '2026-09-04',
            scc_amended_date: '2026-10-01',
          },
        ],
      })
    );
    const res = runScript('skills/kvkk-cross-border-art9/scripts/audit-subprocessors.mjs', [
      '--file', filePath,
      '--as-of', '2026-10-15',
      '--json',
    ]);
    assert.equal(res.status, 1);
    const rules = new Set(res.json.findings.map((f) => f.rule));
    assert.ok(rules.has('ART9_MISSING_SCC_SIGNED_DATE'));
    assert.ok(rules.has('ART9_INVALID_DATE'));
    assert.ok(rules.has('ART9_SCC_LIFECYCLE_OVERDUE'));
    assert.ok(!rules.has('ART9_MISSING_SCC_MODULE'));
  });
});

// 5. verify-legal-hashes.mjs
test('Legal hash verifier: valid hashed docs pass (exit 0), tampered/invalid fail (exit 1), CRLF normalizes deterministically, --generate is portable', () => {
  const ok = runScript('skills/kvkk-dsar-breach-ops/scripts/verify-legal-hashes.mjs', [
    '--dir', 'tests/fixtures/legal-docs-valid',
    '--manifest', 'tests/fixtures/legal-docs-valid/manifest.json',
    '--json',
  ]);
  assert.equal(ok.status, 0);
  assert.equal(ok.json.passed, true);

  withTempDir((tmpDir) => {
    for (const fileName of ['acik-riza-v1.md', 'aydinlatma-v1.md']) {
      const lfText = fs.readFileSync(path.join(ROOT_DIR, 'tests/fixtures/legal-docs-valid', fileName), 'utf8');
      fs.writeFileSync(path.join(tmpDir, fileName), lfText.replace(/\n/g, '\r\n'));
    }
    const manifestPath = path.join(ROOT_DIR, 'tests/fixtures/legal-docs-valid/manifest.json');
    const crlfPass = runScript('skills/kvkk-dsar-breach-ops/scripts/verify-legal-hashes.mjs', [
      '--dir', tmpDir,
      '--manifest', manifestPath,
      '--json',
    ]);
    assert.equal(crlfPass.status, 0);
    assert.equal(crlfPass.json.passed, true);

    const rawFail = runScript('skills/kvkk-dsar-breach-ops/scripts/verify-legal-hashes.mjs', [
      '--dir', tmpDir,
      '--manifest', manifestPath,
      '--raw-bytes',
      '--json',
    ]);
    assert.equal(rawFail.status, 1);
    assert.equal(rawFail.json.errors[0].rule, 'HASH_MISMATCH');
  });

  const bad = runScript('skills/kvkk-dsar-breach-ops/scripts/verify-legal-hashes.mjs', [
    '--dir', 'tests/fixtures/legal-docs-invalid',
    '--manifest', 'tests/fixtures/legal-docs-invalid/manifest.json',
    '--json',
  ]);
  assert.equal(bad.status, 1);
  assert.equal(bad.json.passed, false);
  const rules = new Set(bad.json.errors.map((e) => e.rule));
  assert.ok(rules.has('HASH_MISMATCH'));
  assert.ok(rules.has('UNFILLED_PLACEHOLDER'));

  const gen = runScript('skills/kvkk-dsar-breach-ops/scripts/verify-legal-hashes.mjs', [
    '--dir', 'tests/fixtures/legal-docs-valid',
    '--generate',
  ]);
  assert.equal(gen.status, 0);
  assert.equal(gen.json.line_ending_normalization, 'lf');
  assert.equal('directory' in gen.json, false);
  assert.equal(gen.json.document_count, 2);
});

await flushFallbackRunnerIfNeeded();
