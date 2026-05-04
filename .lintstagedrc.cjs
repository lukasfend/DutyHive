// DutyHive lint-staged config.
//
// Runs Prettier on staged files. Two project-specific quirks are encoded here:
//
//   1. Pass *relative* paths to prettier, not absolute. On Windows, an
//      absolute path that contains a top-level dir with spaces (the case for
//      this checkout: "A:\\000 - Fend.Software - ORG\\...") triggers a
//      Prettier ignore-pattern false-positive — Prettier reports "Explicitly
//      specified file was ignored due to negative glob patterns" and skips
//      the file. Using path.relative(process.cwd(), f) sidesteps the bug.
//
//   2. We deliberately do NOT format *.prisma files here. prettier-plugin-
//      prisma is not installed (it pulls in a heavy peer set). `prisma format`
//      is the canonical formatter for the schema and runs separately.

const path = require('node:path');

const rel = (files) =>
  files.map((f) => `"${path.relative(process.cwd(), f).replace(/\\/g, '/')}"`).join(' ');

module.exports = {
  '*.{ts,tsx,js,jsx}': (files) => `prettier --write ${rel(files)}`,
  '*.{json,md,yml,yaml,css,html}': (files) => `prettier --write ${rel(files)}`,
};
