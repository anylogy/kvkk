#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const HELP_TEXT = `validate-inventory.mjs - Validate a Turkish KVKK Kisisel Veri Isleme Envanteri JSON file against Nov 2026 statutory rules

Usage:
  node validate-inventory.mjs --file <inventory.json> [--json]

Options:
  --file <path>   Path to the inventory JSON file (required)
  --json          Emit machine-readable JSON output
  -h, --help      Show this help text

Notice:
  Technical compliance engineering tool only; not formal Turkish legal advice (hukuki mutalaa).
`;

const VALID_ART5_BASES = new Set([
  'ART_5_1_EXPLICIT_CONSENT',
  'ART_5_2_A_LAW',
  'ART_5_2_B_LIFE_INTEGRITY',
  'ART_5_2_C_CONTRACT',
  'ART_5_2_CC_LEGAL_OBLIGATION',
  'ART_5_2_D_MADE_PUBLIC',
  'ART_5_2_E_RIGHT_DEFENSE',
  'ART_5_2_F_LEGITIMATE_INTEREST',
]);

const VALID_ART6_BASES = new Set([
  'ART_6_3_A_EXPLICIT_CONSENT',
  'ART_6_3_B_LAW',
  'ART_6_3_C_LIFE_INTEGRITY',
  'ART_6_3_CC_MADE_PUBLIC',
  'ART_6_3_D_RIGHT_DEFENSE',
  'ART_6_3_E_PUBLIC_HEALTH',
  'ART_6_3_F_EMPLOYMENT_OHS_SS',
  'ART_6_3_G_NONPROFIT_SCOPE',
]);

const VALID_ART9_MECHANISMS = new Set([
  'ADEQUACY',
  'SCC_FILED',
  'BCR_APPROVED',
  'PUBLIC_AGREEMENT',
  'BOARD_UNDERTAKING',
  'ARIZI_EXCEPTION',
]);

const REQUIRED_2018_10_CONTROLS = [
  'separate_policy',
  'encryption_at_rest',
  'key_management',
  'access_control_2fa',
  'audit_logging',
  'employee_confidentiality_training',
];

const BANNED_GDPR_TERMS = /\b(GDPR_ART_6|GDPR_ART_9|GDPR_ART_30|ROPA|DPO|EU_SCC)\b/i;

const UNBOUNDED_RETENTION_REGEX =
  /\b(suresiz|süresiz|indefinite|unlimited|forever|never|sinirsiz|sınırsız)\b/i;

// Nationality (uyruk) alone is Art. 5 general data and intentionally excluded here.
const SPECIAL_CATEGORY_HINT_REGEX =
  /\b(saglik|sağlık|health|biometric|biyometrik|genetic|genetik|religion|din|mezhep|blood|kan_grubu|kan grubu|criminal|ceza mahkumiyeti|sabika|sabıka|sexual|cinsel|union|sendika|dernek|vakif|vakıf|race|irk|ırk|ethnic|etnik|political|siyasi|philosophical|felsefi|ozel nitelikli|özel nitelikli)\b/i;

function parseStrictIsoDate(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return null;
  }
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) {
    return null;
  }
  return d;
}

function countBusinessDays(startIso, endIso) {
  const start = parseStrictIsoDate(startIso);
  const end = parseStrictIsoDate(endIso);
  if (!start || !end) return null;
  if (end < start) return -1;

  let days = 0;
  const cursor = new Date(start);
  while (cursor < end) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      days += 1;
    }
  }
  return days;
}

export function validateInventory(inventory) {
  const errors = [];

  if (!inventory || typeof inventory !== 'object' || Array.isArray(inventory)) {
    return {
      valid: false,
      activity_count: 0,
      error_count: 1,
      errors: [{ activity_id: null, rule: 'INVALID_JSON', detail: 'Inventory must be a JSON object.' }],
    };
  }

  const serializedTop = JSON.stringify({
    veri_sorumlusu: inventory.veri_sorumlusu,
    governance: inventory.governance,
  });
  if (BANNED_GDPR_TERMS.test(serializedTop)) {
    errors.push({
      activity_id: null,
      rule: 'BANNED_GDPR_TERMINOLOGY',
      detail: 'Inventory metadata uses forbidden GDPR terminology (e.g., DPO, ROPA, GDPR_ART_30) instead of KVKK equivalents.',
    });
  }

  if (!inventory.veri_sorumlusu || !inventory.veri_sorumlusu.unvan || !inventory.veri_sorumlusu.irtibat_kisisi) {
    errors.push({
      activity_id: null,
      rule: 'MISSING_CONTROLLER_METADATA',
      detail: 'veri_sorumlusu.unvan and veri_sorumlusu.irtibat_kisisi are required.',
    });
  }

  const activities = Array.isArray(inventory.activities) ? inventory.activities : [];
  if (activities.length === 0) {
    errors.push({
      activity_id: null,
      rule: 'EMPTY_ACTIVITIES',
      detail: 'Inventory must contain at least one processing activity.',
    });
  }

  for (let idx = 0; idx < activities.length; idx += 1) {
    const act = activities[idx];
    if (!act || typeof act !== 'object' || Array.isArray(act)) {
      errors.push({
        activity_id: `INDEX_${idx}`,
        rule: 'INVALID_ACTIVITY_ENTRY',
        detail: 'Each entry in activities[] must be a JSON object.',
      });
      continue;
    }

    const id = act.id || act.process_name || `INDEX_${idx}`;

    if (BANNED_GDPR_TERMS.test(JSON.stringify(act))) {
      errors.push({
        activity_id: id,
        rule: 'BANNED_GDPR_TERMINOLOGY',
        detail: 'Activity contains forbidden GDPR terminology (GDPR_ART_6, GDPR_ART_9, GDPR_ART_30, ROPA, DPO, EU_SCC).',
      });
    }

    if (!act.process_name || String(act.process_name).trim().length < 2) {
      errors.push({
        activity_id: id,
        rule: 'MISSING_PROCESS_NAME',
        detail: 'Data Controllers Registry Regulation Art. 5 requires a descriptive process_name.',
      });
    }

    if (!act.data_subject_group || String(act.data_subject_group).trim().length < 2) {
      errors.push({
        activity_id: id,
        rule: 'MISSING_DATA_SUBJECT_GROUP',
        detail: 'Data Controllers Registry Regulation Art. 5 requires data_subject_group.',
      });
    }

    const categories = Array.isArray(act.data_categories)
      ? act.data_categories.filter((c) => typeof c === 'string' && c.trim().length > 0)
      : [];
    if (categories.length === 0) {
      errors.push({
        activity_id: id,
        rule: 'MISSING_DATA_CATEGORIES',
        detail: 'Data Controllers Registry Regulation Art. 5 requires a non-empty data_categories array.',
      });
    }

    const purposes = Array.isArray(act.processing_purposes)
      ? act.processing_purposes.filter((p) => typeof p === 'string' && p.trim().length > 0)
      : [];
    if (purposes.length === 0) {
      errors.push({
        activity_id: id,
        rule: 'MISSING_PROCESSING_PURPOSES',
        detail: 'Data Controllers Registry Regulation Art. 5 requires a non-empty processing_purposes array.',
      });
    }

    const hasRecipients = Array.isArray(act.domestic_recipients) || Array.isArray(act.recipient_groups);
    if (!hasRecipients) {
      errors.push({
        activity_id: id,
        rule: 'MISSING_RECIPIENT_GROUPS',
        detail: 'Data Controllers Registry Regulation Art. 5 requires an explicit domestic_recipients (or recipient_groups) array (use [] if none).',
      });
    }

    const measures = Array.isArray(act.technical_and_administrative_measures)
      ? act.technical_and_administrative_measures.filter((m) => typeof m === 'string' && m.trim().length > 1)
      : [];
    if (measures.length === 0) {
      errors.push({
        activity_id: id,
        rule: 'MISSING_SECURITY_MEASURES',
        detail: 'Data Controllers Registry Regulation Art. 5 and KVKK Art. 12 require explicit technical_and_administrative_measures.',
      });
    }

    if (act.is_special_category) {
      if (String(act.legal_basis || '').includes('6_2') || String(act.legal_basis || '').includes('6/2')) {
        errors.push({
          activity_id: id,
          rule: 'REPEALED_ART6_2',
          detail: 'Old Article 6/2 was repealed on June 1, 2024; must cite unified Article 6/3-a through 6/3-g.',
        });
      } else if (!VALID_ART6_BASES.has(act.legal_basis)) {
        errors.push({
          activity_id: id,
          rule: 'INVALID_ART6_BASIS',
          detail: `Special category activity must use a valid post-June 2024 Art. 6/3 basis (got '${act.legal_basis}').`,
        });
      }

      const controls = act.decision_2018_10_controls || {};
      const missingControls = REQUIRED_2018_10_CONTROLS.filter((c) => controls[c] !== true);
      if (missingControls.length > 0) {
        errors.push({
          activity_id: id,
          rule: 'MISSING_DECISION_2018_10_CONTROLS',
          detail: `Art. 6 activity missing Board Decision 2018/10 controls: ${missingControls.join(', ')}.`,
        });
      }
    } else {
      if (!VALID_ART5_BASES.has(act.legal_basis)) {
        errors.push({
          activity_id: id,
          rule: 'INVALID_ART5_BASIS',
          detail: `General personal data activity must cite a valid Art. 5/1 or 5/2 basis (got '${act.legal_basis}').`,
        });
      }
      const categoriesText = Array.isArray(act.data_categories) ? act.data_categories.join(' ') : '';
      if (SPECIAL_CATEGORY_HINT_REGEX.test(categoriesText)) {
        errors.push({
          activity_id: id,
          rule: 'UNFLAGGED_SPECIAL_CATEGORY',
          detail: `data_categories ('${categoriesText}') appears to include Art. 6 special category data while is_special_category is false.`,
        });
      }
    }

    if (!act.retention_period || String(act.retention_period).trim().length < 2) {
      errors.push({
        activity_id: id,
        rule: 'MISSING_RETENTION_PERIOD',
        detail: 'Every activity must specify a concrete retention_period.',
      });
    } else if (UNBOUNDED_RETENTION_REGEX.test(String(act.retention_period))) {
      errors.push({
        activity_id: id,
        rule: 'UNBOUNDED_RETENTION_PERIOD',
        detail: `KVKK Art. 4/2-d & Data Controllers Registry Regulation Art. 5 prohibit indefinite retention_period ('${act.retention_period}'); define the maximum period tied to purpose or statutory carve-out.`,
      });
    }

    if (
      typeof act.periodic_destruction_months !== 'number' ||
      act.periodic_destruction_months < 1 ||
      act.periodic_destruction_months > 6
    ) {
      errors.push({
        activity_id: id,
        rule: 'INVALID_PERIODIC_DESTRUCTION_CYCLE',
        detail: `Erasure Regulation requires periodic_destruction_months <= 6 (got '${act.periodic_destruction_months}').`,
      });
    }

    if (
      typeof act.destruction_log_retention_years !== 'number' ||
      act.destruction_log_retention_years < 3
    ) {
      errors.push({
        activity_id: id,
        rule: 'INVALID_DESTRUCTION_LOG_RETENTION',
        detail: `Erasure Regulation requires destruction_log_retention_years >= 3 (got '${act.destruction_log_retention_years}').`,
      });
    }

    const xfer = act.cross_border_transfer;
    if (!xfer || typeof xfer.enabled !== 'boolean') {
      errors.push({
        activity_id: id,
        rule: 'MISSING_TRANSFER_METADATA',
        detail: 'cross_border_transfer.enabled boolean is required.',
      });
    } else if (!xfer.enabled) {
      const destCountries = Array.isArray(xfer.destination_countries) ? xfer.destination_countries : [];
      const foreignDest = destCountries.filter((c) => String(c).trim().toUpperCase() !== 'TR');
      if (foreignDest.length > 0) {
        errors.push({
          activity_id: id,
          rule: 'CONTRADICTORY_TRANSFER_FLAG',
          detail: `cross_border_transfer.enabled is false but destination_countries lists non-TR entries: ${foreignDest.join(', ')}.`,
        });
      }
    } else {
      const freq = String(xfer.frequency || '').toUpperCase();
      const mech = String(xfer.mechanism || '').toUpperCase();
      const sccMod = String(xfer.scc_module || '').trim().toUpperCase();

      if (mech === 'EXPLICIT_CONSENT') {
        errors.push({
          activity_id: id,
          rule: 'ART9_ILLEGAL_EXPLICIT_CONSENT',
          detail: 'Post-Sept 2024 KVKK Art. 9 prohibits explicit consent for standing cross-border transfers; occasional risk-informed consent is strictly ARIZI_EXCEPTION.',
        });
      } else if (!VALID_ART9_MECHANISMS.has(mech)) {
        errors.push({
          activity_id: id,
          rule: 'ART9_INVALID_MECHANISM',
          detail: `Cross-border transfer requires valid Art. 9 mechanism (got '${xfer.mechanism}').`,
        });
      }

      if (mech === 'ARIZI_EXCEPTION' && freq !== 'OCCASIONAL') {
        errors.push({
          activity_id: id,
          rule: 'ART9_ARIZI_ON_CONTINUOUS',
          detail: `Art. 9/6 occasional derogation (ARIZI_EXCEPTION) cannot be used for '${freq}' transfers.`,
        });
      }

      if (mech === 'SCC_FILED') {
        if (!['SS-1', 'SS-2', 'SS-3', 'SS-4'].includes(sccMod)) {
          errors.push({
            activity_id: id,
            rule: 'ART9_MISSING_SCC_MODULE',
            detail: 'SCC_FILED transfer must specify scc_module (SS-1, SS-2, SS-3, or SS-4).',
          });
        }
        if (!xfer.kvkk_notification_date) {
          errors.push({
            activity_id: id,
            rule: 'ART9_UNFILED_SCC',
            detail: 'SCC_FILED transfer must record kvkk_notification_date (5-business-day Authority filing rule).',
          });
        } else if (!parseStrictIsoDate(xfer.kvkk_notification_date)) {
          errors.push({
            activity_id: id,
            rule: 'ART9_INVALID_DATE',
            detail: `Invalid kvkk_notification_date '${xfer.kvkk_notification_date}' (expected YYYY-MM-DD).`,
          });
        } else if (xfer.scc_signed_date) {
          const filedDays = countBusinessDays(xfer.scc_signed_date, xfer.kvkk_notification_date);
          if (filedDays === null || filedDays < 0 || filedDays > 5) {
            errors.push({
              activity_id: id,
              rule: 'ART9_SCC_LATE_FILING',
              detail: `Standard Contract notified ${filedDays} business days after signature (max 5 business days; Art. 18/1-d fine exposure).`,
            });
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    activity_count: activities.length,
    error_count: errors.length,
    errors,
  };
}

function parseArgs(argv) {
  const opts = { json: argv.includes('--json'), help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--json') opts.json = true;
    else if (arg === '--file') {
      const val = argv[++i];
      if (!val || val.startsWith('--')) throw new Error('Missing file path after --file.');
      opts.file = val;
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
      console.log(JSON.stringify({ valid: false, error: err.message }, null, 2));
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
      console.log(JSON.stringify({ valid: false, error: '--file <inventory.json> is required.' }, null, 2));
    } else {
      console.error('Error: --file <inventory.json> is required.');
    }
    process.exit(1);
  }

  try {
    const absPath = path.resolve(opts.file);
    const data = JSON.parse(fs.readFileSync(absPath, 'utf8'));
    const result = validateInventory(data);

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`Validated ${result.activity_count} activities: ${result.valid ? 'VALID' : 'INVALID'}`);
      for (const err of result.errors) {
        console.log(`[FAIL] (${err.activity_id || 'ROOT'}) ${err.rule}: ${err.detail}`);
      }
    }
    process.exit(result.valid ? 0 : 1);
  } catch (err) {
    if (opts.json) {
      console.log(JSON.stringify({ valid: false, error: err.message }, null, 2));
    } else {
      console.error(`Error: ${err.message}`);
    }
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main();
}
