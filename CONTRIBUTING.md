# Contributing to Turkish KVKK Compliance Engineering Skills

Thank you for contributing to this open-source Turkish KVKK compliance engineering skill pack.
This guide explains the v2.0 repository structure, statutory accuracy requirements, formatting rules, and automated verification checks.

## Disclaimer

All materials in this repository are technical compliance engineering tools and reference architectures, not formal Turkish legal advice (*hukuki mutalaa*).

## Repository Architecture (v2.0)

The repository contains 5 focused `agentskills.io` skills under `skills/`:

- `skills/kvkk-core-law-2026/` (`subdomain: kvkk-compliance`)
- `skills/kvkk-frontend-audit/` (`subdomain: frontend-privacy-engineering`)
- `skills/kvkk-backend-architecture/` (`subdomain: backend-privacy-engineering`)
- `skills/kvkk-cross-border-art9/` (`subdomain: cross-border-transfers`)
- `skills/kvkk-dsar-breach-ops/` (`subdomain: dsar-and-breach-ops`)

Each skill directory contains:
- `SKILL.md` (<= 250 lines, clean YAML frontmatter matching `agentskills.io`)
- `references/` (authoritative statutory notes, fine tables, or control mappings)
- `assets/` (SQL DDL, JSON schemas, subprocessor templates, or Turkish legal templates using `[PLACEHOLDER_...]` tokens)
- `scripts/*.mjs` (zero-dependency Node.js 20+ / Bun ESM automation tools using `node:*` built-ins only)

## Non-Negotiable Formatting & Quality Rules

1. **Zero em dashes:** Never use the em dash character in Markdown, JSON, SQL, YAML, or JavaScript; use a plain hyphen (`-`) instead.
2. **One sentence per line in Markdown:** Place each full sentence on its own physical line while preserving headings, lists, tables, and code fences.
3. **Zero external dependencies:** Scripts under `skills/*/scripts/`, `scripts/`, and `tests/` must import only built-in `node:*` modules (`node:fs`, `node:path`, `node:crypto`, `node:url`, `node:test`, `node:assert`, `node:child_process`).
4. **Protected files:** Never manually modify `CHANGELOG.md`, `LICENSE`, or `NOTICE`.
5. **No co-author trailers:** Never add AI agent names as git commit co-author trailers.

## Statutory Accuracy Rules (Law No. 6698 / Law No. 7499)

Every pull request must uphold the verified Turkish KVKK statutory baseline:
- Use authentic Turkish terminology (*Veri Sorumlusu*, *Veri Isleyen*, *Ilgili Kisi*, *Irtibat Kisisi*, *Kisisel Veri Isleme Envanteri*, *Aydinlatma Metni*, *Acik Riza*, *Periyodik Imha*) rather than GDPR terms (`DPO`, `ROPA`).
- Cite only post-June 1, 2024 unified Article 6/3 bases (`6/3-a` through `6/3-g`) and never cite repealed Article 6/2.
- Never recommend explicit consent for continuous or systematic cross-border transfers under post-September 1, 2024 Article 9.
- Cite only verified KVKK Board Decisions (`2018/10`, `2019/10` for 72h breach notice, `2019/271`, `2023/1154`, `2025/1572`, `2025/2393`).
- Use annual financial balance sheet total (*yillik mali bilanço toplami*), never turnover (*ciro*), for VERBIS thresholds.

## Local Validation Before Opening a PR

Run both the repository integrity linter and the fixture-driven E2E test suite with Node.js and Bun:

```bash
node scripts/validate-repo.mjs
node tests/run-all.mjs
bun scripts/validate-repo.mjs
bun tests/run-all.mjs
```

## Valid Subdomains

| Subdomain | Scope |
|:---|:---|
| `kvkk-compliance` | Core Law No. 6698 / 7499 routing, VERBIS thresholds, and Art. 18 fines |
| `frontend-privacy-engineering` | Browser Art. 9 leaks, Cookie Guidelines, layered notices, and CSP |
| `backend-privacy-engineering` | Consent ledgers, Decision 2018/10 controls, and 6-month *Periyodik Imha* |
| `cross-border-transfers` | Art. 9 3-tier hierarchy, SS-1 to SS-4 filing SLAs, and sovereign infra |
| `dsar-and-breach-ops` | Art. 11 DSAR SLAs, 72-hour breach playbooks, and legal doc SHA-256 verification |

## Code of Conduct

This project follows the [Contributor Covenant v2.1](CODE_OF_CONDUCT.md).
