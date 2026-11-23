#!/usr/bin/env node
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const HELP_TEXT = `check-verbis-threshold.mjs - Evaluate Turkish KVKK VERBIS registration obligation (Decisions 2023/1154, 2025/1572, 2025/2393)

Usage:
  node check-verbis-threshold.mjs --employees <n> [--balance-sheet-try <amount>] [options]

Options:
  --employees <n>                   Annual employee count (non-negative integer; required unless --foreign-controller, --abroad, or --public-entity)
  --balance-sheet-try <tl>          Annual financial balance sheet total in TRY (yillik mali bilanço toplami; required on balance-sheet basis)
  --bookkeeping-basis <mode>        Bookkeeping mode: 'balance-sheet' (default, bilanço esasi) or 'non-balance-sheet' (Decision 2025/2393)
  --non-balance-sheet               Shorthand for --bookkeeping-basis non-balance-sheet (evaluates annual employee count only)
  --turnover-try <tl>               Explicitly rejected unless --balance-sheet-try is also provided
  --art6-primary                    Controller's primary business activity is processing Art. 6 special category data
  --foreign-controller              Data controller is established outside Turkiye (must register and appoint Veri Sorumlusu Temsilcisi)
  --abroad                          Alias for --foreign-controller
  --public-entity                   Data controller is a public institution or professional organization with public status
  --json                            Emit machine-readable JSON output
  -h, --help                        Show this help text

Notice:
  Technical compliance engineering tool only; not formal Turkish legal advice (hukuki mutalaa).
`;

export function evaluateVerbisThreshold(input) {
  const {
    employees,
    balanceSheetTry,
    turnoverTry,
    bookkeepingBasis = 'balance-sheet',
    art6Primary = false,
    abroad = false,
    foreignController = false,
    publicEntity = false,
  } = input;

  if (bookkeepingBasis !== 'balance-sheet' && bookkeepingBasis !== 'non-balance-sheet') {
    throw new Error(
      `Invalid --bookkeeping-basis '${bookkeepingBasis}'. Expected 'balance-sheet' or 'non-balance-sheet'.`
    );
  }

  if (turnoverTry !== undefined && balanceSheetTry === undefined) {
    throw new Error(
      'VERBIS uses annual financial balance sheet total (yillik mali bilanço toplami), NOT turnover (ciro). Pass --balance-sheet-try.'
    );
  }

  const mandatoryObligationsWarning =
    'VERBIS exemption NEVER waives KVKK Art. 5/6 (lawful processing bases), Art. 10 (Aydinlatma), Art. 12 (Data Security & Board Decision 2018/10), Art. 13 (application response / Art. 11 DSAR SLAs), or maintaining an internal Kisisel Veri Isleme Envanteri.';

  if (abroad || foreignController) {
    return {
      verbis_required: true,
      status: 'REQUIRED_FOREIGN_CONTROLLER',
      applied_decisions: ['KVKK Art. 16', 'Data Controllers Registry Regulation'],
      reason:
        'Controllers established outside Turkiye must register with VERBIS and appoint a Veri Sorumlusu Temsilcisi in Turkiye regardless of employee headcount, balance sheet total, or bookkeeping basis.',
      mandatory_obligations_warning: mandatoryObligationsWarning,
    };
  }

  if (publicEntity) {
    return {
      verbis_required: true,
      status: 'REQUIRED_PUBLIC_ENTITY',
      applied_decisions: ['KVKK Art. 16', 'Data Controllers Registry Regulation'],
      reason: 'Public institutions and professional organizations with public entity status must register with VERBIS regardless of headcount or balance sheet.',
      mandatory_obligations_warning: mandatoryObligationsWarning,
    };
  }

  if (
    typeof employees !== 'number' ||
    !Number.isFinite(employees) ||
    !Number.isInteger(employees) ||
    employees < 0
  ) {
    throw new Error('Provide a valid non-negative integer for --employees.');
  }

  if (bookkeepingBasis === 'non-balance-sheet') {
    const maxEmployees = art6Primary ? 10 : 50;
    const exempt = employees < maxEmployees;
    const appliedDecisions = art6Primary
      ? ['2025/1572 (04.09.2025)', '2025/2393 (25.12.2025, announced 12.01.2026)']
      : ['2023/1154 (06.07.2023)', '2025/2393 (25.12.2025, announced 12.01.2026)'];
    return {
      verbis_required: !exempt,
      status: exempt
        ? art6Primary
          ? 'EXEMPT_ART6_MICRO'
          : 'EXEMPT_GENERAL'
        : art6Primary
          ? 'REQUIRED_ART6_PRIMARY'
          : 'REQUIRED_GENERAL',
      applied_decisions: appliedDecisions,
      thresholds: { max_employees_exclusive: maxEmployees, balance_sheet_evaluated: false },
      inputs: {
        employees,
        balance_sheet_try: balanceSheetTry ?? null,
        bookkeeping_basis: 'non-balance-sheet',
        art6_primary: art6Primary,
      },
      reason: exempt
        ? `Domestic controller not keeping books on a balance-sheet basis (Decision 2025/2393) is evaluated on employee count only and has ${employees} (< ${maxEmployees}) annual employees.`
        : `Domestic controller not keeping books on a balance-sheet basis (Decision 2025/2393) has ${employees} (>= ${maxEmployees}) annual employees and must register with VERBIS.`,
      mandatory_obligations_warning: mandatoryObligationsWarning,
    };
  }

  if (
    typeof balanceSheetTry !== 'number' ||
    !Number.isFinite(balanceSheetTry) ||
    balanceSheetTry < 0
  ) {
    throw new Error(
      'Provide a valid non-negative finite number for --balance-sheet-try (annual financial balance sheet total in TRY), or pass --non-balance-sheet if the controller does not keep books on a balance-sheet basis.'
    );
  }

  if (art6Primary) {
    const exempt = employees < 10 && balanceSheetTry < 10_000_000;
    return {
      verbis_required: !exempt,
      status: exempt ? 'EXEMPT_ART6_MICRO' : 'REQUIRED_ART6_PRIMARY',
      applied_decisions: ['2025/1572 (04.09.2025)', '2025/2393 (25.12.2025, announced 12.01.2026)'],
      thresholds: {
        max_employees_exclusive: 10,
        max_balance_sheet_try_exclusive: 10_000_000,
        balance_sheet_evaluated: true,
      },
      inputs: {
        employees,
        balance_sheet_try: balanceSheetTry,
        bookkeeping_basis: 'balance-sheet',
        art6_primary: true,
      },
      reason: exempt
        ? `Domestic Art. 6 primary controller on balance-sheet basis has ${employees} (< 10) employees AND ${balanceSheetTry.toLocaleString('en-US')} TL (< 10,000,000 TL) balance sheet total.`
        : `Domestic Art. 6 primary controller on balance-sheet basis exceeds micro-exemption thresholds (${employees} employees, ${balanceSheetTry.toLocaleString('en-US')} TL balance sheet total; must be BOTH < 10 employees AND < 10,000,000 TL).`,
      mandatory_obligations_warning: mandatoryObligationsWarning,
    };
  }

  const exempt = employees < 50 && balanceSheetTry < 100_000_000;
  return {
    verbis_required: !exempt,
    status: exempt ? 'EXEMPT_GENERAL' : 'REQUIRED_GENERAL',
    applied_decisions: ['2023/1154 (06.07.2023)', '2025/2393 (25.12.2025, announced 12.01.2026)'],
    thresholds: {
      max_employees_exclusive: 50,
      max_balance_sheet_try_exclusive: 100_000_000,
      balance_sheet_evaluated: true,
    },
    inputs: {
      employees,
      balance_sheet_try: balanceSheetTry,
      bookkeeping_basis: 'balance-sheet',
      art6_primary: false,
    },
    reason: exempt
      ? `Domestic controller on balance-sheet basis has ${employees} (< 50) employees AND ${balanceSheetTry.toLocaleString('en-US')} TL (< 100,000,000 TL) balance sheet total.`
      : `Domestic controller on balance-sheet basis exceeds general exemption thresholds (${employees} employees, ${balanceSheetTry.toLocaleString('en-US')} TL balance sheet total; must be BOTH < 50 employees AND < 100,000,000 TL).`,
    mandatory_obligations_warning: mandatoryObligationsWarning,
  };
}

function readNumericFlagValue(argv, idx, flagName) {
  const raw = argv[idx + 1];
  if (raw === undefined || raw.startsWith('--')) {
    throw new Error(`Missing numeric value after ${flagName}.`);
  }
  const num = Number(raw);
  if (raw.trim() === '' || !Number.isFinite(num)) {
    throw new Error(`Invalid numeric value '${raw}' for ${flagName}.`);
  }
  return num;
}

function parseArgs(argv) {
  const opts = {
    bookkeepingBasis: 'balance-sheet',
    art6Primary: false,
    abroad: false,
    foreignController: false,
    publicEntity: false,
    json: argv.includes('--json'),
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg === '--json') {
      opts.json = true;
    } else if (arg === '--art6-primary') {
      opts.art6Primary = true;
    } else if (arg === '--abroad') {
      opts.abroad = true;
    } else if (arg === '--foreign-controller') {
      opts.foreignController = true;
    } else if (arg === '--public-entity') {
      opts.publicEntity = true;
    } else if (arg === '--non-balance-sheet') {
      opts.bookkeepingBasis = 'non-balance-sheet';
    } else if (arg === '--bookkeeping-basis') {
      const val = argv[++i];
      if (!val || val.startsWith('--')) {
        throw new Error("Missing value after --bookkeeping-basis ('balance-sheet' or 'non-balance-sheet').");
      }
      opts.bookkeepingBasis = val.trim().toLowerCase();
    } else if (arg === '--employees') {
      opts.employees = readNumericFlagValue(argv, i, '--employees');
      i += 1;
    } else if (arg === '--balance-sheet-try') {
      opts.balanceSheetTry = readNumericFlagValue(argv, i, '--balance-sheet-try');
      i += 1;
    } else if (arg === '--turnover-try') {
      opts.turnoverTry = readNumericFlagValue(argv, i, '--turnover-try');
      i += 1;
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
    const result = evaluateVerbisThreshold(opts);
    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`VERBIS Required: ${result.verbis_required ? 'YES' : 'NO'} (${result.status})`);
      console.log(`Applied Decisions: ${result.applied_decisions.join(', ')}`);
      console.log(`Reason: ${result.reason}`);
      console.log(`WARNING: ${result.mandatory_obligations_warning}`);
    }
    process.exit(0);
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
