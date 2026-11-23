#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const EXPECTED_SKILLS = [
  'kvkk-backend-architecture',
  'kvkk-core-law-2026',
  'kvkk-cross-border-art9',
  'kvkk-dsar-breach-ops',
  'kvkk-frontend-audit',
];

const VALID_SUBDOMAINS = new Set([
  'kvkk-compliance',
  'frontend-privacy-engineering',
  'backend-privacy-engineering',
  'cross-border-transfers',
  'dsar-and-breach-ops',
]);

function unquote(val) {
  const trimmed = val.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseFrontmatter(yamlText) {
  const lines = yamlText.split(/\r?\n/);
  const root = {};
  let currentMap = root;
  let currentMapIndent = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    if (!raw.trim() || raw.trim().startsWith('#')) continue;

    const indent = raw.match(/^\s*/)[0].length;
    const line = raw.trim();

    if (indent === 0 || indent < currentMapIndent) {
      currentMap = root;
      currentMapIndent = 0;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) {
      throw new Error(`Invalid YAML line: ${line}`);
    }

    const key = line.slice(0, colonIdx).trim();
    const rest = line.slice(colonIdx + 1).trim();

    if (rest === '' || rest === '>' || rest === '>-' || rest === '|' || rest === '|-') {
      if (rest === '') {
        const nested = {};
        currentMap[key] = nested;
        currentMap = nested;
        currentMapIndent = indent + 1;
      } else {
        const isFolded = rest.startsWith('>');
        const blockLines = [];
        let j = i + 1;
        while (j < lines.length) {
          const nextRaw = lines[j];
          if (nextRaw.trim() === '') {
            blockLines.push('');
            j += 1;
            continue;
          }
          const nextIndent = nextRaw.match(/^\s*/)[0].length;
          if (nextIndent <= indent) break;
          blockLines.push(nextRaw.trim());
          j += 1;
        }
        i = j - 1;
        const joined = isFolded
          ? blockLines.filter((l) => l.length > 0).join(' ')
          : blockLines.join('\n');
        currentMap[key] = joined.trim();
      }
    } else {
      currentMap[key] = unquote(rest);
    }
  }

  return root;
}

function walkFiles(dirPath, results = []) {
  if (!fs.existsSync(dirPath)) return results;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      walkFiles(full, results);
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results;
}

async function main() {
  const errors = [];
  const skillsDir = path.join(ROOT_DIR, 'skills');

  // 1. Validate exact 5 skill directories
  const actualSkills = fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  if (JSON.stringify(actualSkills) !== JSON.stringify(EXPECTED_SKILLS)) {
    errors.push(
      `Expected exact 5 skill folders [${EXPECTED_SKILLS.join(', ')}], found [${actualSkills.join(', ')}].`
    );
  }

  // 2. Validate SKILL.md frontmatter, body length <= 250, and structure
  const skillScripts = [];
  for (const skillName of actualSkills) {
    const skillPath = path.join(skillsDir, skillName);
    const skillMdPath = path.join(skillPath, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) {
      errors.push(`skills/${skillName}: missing SKILL.md`);
      continue;
    }

    const content = fs.readFileSync(skillMdPath, 'utf8');
    const lineCount = content.split(/\r?\n/).length;
    if (lineCount > 250) {
      errors.push(`skills/${skillName}/SKILL.md exceeds 250 lines (${lineCount} lines).`);
    }

    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    if (!fmMatch) {
      errors.push(`skills/${skillName}/SKILL.md: missing or malformed YAML frontmatter.`);
      continue;
    }

    let fm;
    try {
      fm = parseFrontmatter(fmMatch[1]);
    } catch (err) {
      errors.push(`skills/${skillName}/SKILL.md: YAML parse error (${err.message}).`);
      continue;
    }

    if (fm.name !== skillName) {
      errors.push(`skills/${skillName}/SKILL.md: name '${fm.name}' does not match folder '${skillName}'.`);
    }
    if (!fm.description || fm.description.length > 1024) {
      errors.push(`skills/${skillName}/SKILL.md: description missing or > 1024 chars.`);
    }
    if (fm.license !== 'Apache-2.0') {
      errors.push(`skills/${skillName}/SKILL.md: license must be 'Apache-2.0'.`);
    }
    const meta = fm.metadata || {};
    for (const key of ['author', 'version', 'domain', 'subdomain', 'tags']) {
      if (!meta[key]) {
        errors.push(`skills/${skillName}/SKILL.md: missing metadata.${key}.`);
      }
    }
    if (meta.subdomain && !VALID_SUBDOMAINS.has(meta.subdomain)) {
      errors.push(`skills/${skillName}/SKILL.md: invalid subdomain '${meta.subdomain}'.`);
    }

    const scriptsDir = path.join(skillPath, 'scripts');
    const mjsFiles = fs.existsSync(scriptsDir)
      ? fs.readdirSync(scriptsDir).filter((f) => f.endsWith('.mjs')).map((f) => path.join(scriptsDir, f))
      : [];
    if (mjsFiles.length === 0) {
      errors.push(`skills/${skillName}: missing scripts/*.mjs`);
    } else {
      skillScripts.push(...mjsFiles);
    }
  }

  // 3. Validate gemini-extension.json, plugin.json, and all JSON files
  const extManifestPath = path.join(ROOT_DIR, 'gemini-extension.json');
  try {
    const ext = JSON.parse(fs.readFileSync(extManifestPath, 'utf8'));
    if (!ext.name || !ext.version || !ext.description) {
      errors.push('gemini-extension.json must define name, version, and description.');
    }
  } catch (err) {
    errors.push(`gemini-extension.json invalid JSON: ${err.message}`);
  }

  const pluginManifestPath = path.join(ROOT_DIR, 'plugin.json');
  try {
    const plg = JSON.parse(fs.readFileSync(pluginManifestPath, 'utf8'));
    if (!plg.name || !plg.description || !plg.version) {
      errors.push('plugin.json must define name, description, and version.');
    }
  } catch (err) {
    errors.push(`plugin.json invalid JSON: ${err.message}`);
  }

  const allJsonFiles = [
    ...walkFiles(path.join(ROOT_DIR, 'skills')),
    ...walkFiles(path.join(ROOT_DIR, 'tests')),
  ].filter((f) => f.endsWith('.json'));

  for (const jf of allJsonFiles) {
    try {
      JSON.parse(fs.readFileSync(jf, 'utf8'));
    } catch (err) {
      errors.push(`${path.relative(ROOT_DIR, jf)}: invalid JSON (${err.message})`);
    }
  }

  // 4. Em-dash ban across repo files
  const filesToScanForEmDash = [
    path.join(ROOT_DIR, 'README.md'),
    path.join(ROOT_DIR, 'CONTRIBUTING.md'),
    path.join(ROOT_DIR, 'SECURITY.md'),
    path.join(ROOT_DIR, 'CITATION.cff'),
    path.join(ROOT_DIR, 'gemini-extension.json'),
    path.join(ROOT_DIR, 'plugin.json'),
    ...walkFiles(path.join(ROOT_DIR, 'skills')),
    ...walkFiles(path.join(ROOT_DIR, 'scripts')),
    ...walkFiles(path.join(ROOT_DIR, 'tests')),
    ...walkFiles(path.join(ROOT_DIR, '.github')),
  ];

  for (const file of filesToScanForEmDash) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (text.includes('\u2014')) {
      errors.push(`${path.relative(ROOT_DIR, file)}: contains forbidden em dash (\\u2014).`);
    }
  }

  // 5. Anti-contamination linter on SKILL.md and references/*.md
  const docFiles = walkFiles(skillsDir).filter(
    (f) => path.basename(f) === 'SKILL.md' || f.includes(`${path.sep}references${path.sep}`)
  );

  for (const df of docFiles) {
    if (!df.endsWith('.md')) continue;
    const rel = path.relative(ROOT_DIR, df);
    const text = fs.readFileSync(df, 'utf8');
    const lines = text.split(/\r?\n/);

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (/2019\/78/.test(line) && /(explicit consent|acik riza|açık rıza)/i.test(line)) {
        errors.push(`${rel}:${i + 1}: hallucinated 2019/78 + explicit consent precedent detected.`);
      }
      if (/2019\/10/.test(line) && /(controller|processor distinction|veri sorumlusu.*veri isleyen)/i.test(line)) {
        errors.push(`${rel}:${i + 1}: hallucinated 2019/10 + controller/processor distinction detected.`);
      }
      if (/2020\/915/.test(line) && /(cookie|cerez|çerez)/i.test(line)) {
        errors.push(`${rel}:${i + 1}: hallucinated 2020/915 + cookie precedent detected.`);
      }
      if (
        !/\b(never|prohibit(?:s|ed)?|illegal|ban(?:s|ned)?|cannot|not valid|must not|do not)\b/i.test(line) &&
        /(use|rely on|recommend|valid for|permit(?:s|ted)?)\s+explicit consent.*(continuous|systematic).*(cross-border|transfer|abroad)/i.test(
          line
        )
      ) {
        errors.push(`${rel}:${i + 1}: recommends explicit consent for continuous/systematic Art. 9 transfers.`);
      }
    }
  }

  // 6. Syntax/import check and --help smoke check on all .mjs scripts
  const allScripts = [
    ...skillScripts,
    ...walkFiles(path.join(ROOT_DIR, 'scripts')).filter((f) => f.endsWith('.mjs')),
  ];

  for (const script of allScripts) {
    const rel = path.relative(ROOT_DIR, script);
    if (!process.versions.bun) {
      const chk = spawnSync(process.execPath, ['--check', script], { encoding: 'utf8' });
      if (chk.status !== 0) {
        errors.push(`${rel}: syntax check failed: ${chk.stderr}`);
      }
    }
    try {
      await import(pathToFileURL(script).href);
    } catch (err) {
      errors.push(`${rel}: ESM import failed: ${err.message}`);
    }
  }

  for (const script of skillScripts) {
    const rel = path.relative(ROOT_DIR, script);
    const helpRes = spawnSync(process.execPath, [script, '--help'], { encoding: 'utf8' });
    if (helpRes.status !== 0 || !helpRes.stdout.trim()) {
      errors.push(`${rel}: --help failed (exit=${helpRes.status}): ${helpRes.stderr}`);
    }
  }

  console.log(`Validated ${actualSkills.length} skills, ${skillScripts.length} skill scripts, and ${allJsonFiles.length} JSON files.`);

  if (errors.length > 0) {
    console.error(`\n${errors.length} validation error(s) found:`);
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log('All repository integrity and anti-contamination checks passed.');
}

main();
