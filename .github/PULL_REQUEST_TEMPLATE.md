## Summary
<!-- Brief description of changes -->

## Type of Change
- [ ] Skill improvement
- [ ] Bug fix (script, template, or reference)
- [ ] New fixture / E2E test
- [ ] Documentation update
- [ ] Infrastructure/CI change

## Checklist
- [ ] Skill `name` in YAML frontmatter matches directory name and `SKILL.md` is <= 250 lines
- [ ] YAML frontmatter has all required fields (`name`, `description`, `license: Apache-2.0`, `metadata`)
- [ ] Zero em dashes (`\u2014`) in any Markdown, JSON, SQL, YAML, or JS file
- [ ] One sentence per physical line in all edited Markdown files
- [ ] All KVKK (Law No. 6698 / Law No. 7499) citations and Board Decisions are verified
- [ ] Zero external runtime dependencies in `.mjs` scripts (`node:*` built-ins only)
- [ ] `node scripts/validate-repo.mjs && node tests/run-all.mjs` passes
- [ ] `bun scripts/validate-repo.mjs && bun tests/run-all.mjs` passes

## Testing
<!-- Paste output summary of validate-repo.mjs and tests/run-all.mjs -->
