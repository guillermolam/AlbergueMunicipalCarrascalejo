import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd());

function runGit(args) {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function getChangedFiles() {
  const baseSha = process.env.GITHUB_BASE_SHA;
  const headSha = process.env.GITHUB_SHA;

  if (baseSha && headSha) {
    return runGit(['diff', '--name-only', `${baseSha}...${headSha}`])
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  try {
    return runGit(['diff', '--name-only', 'HEAD~1...HEAD'])
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return runGit(['ls-files'])
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function nonEmptyLineCount(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0).length;
}

function isUnder(relPath, folder) {
  const norm = relPath.replaceAll('\\', '/');
  const prefix = folder.replaceAll('\\', '/').replace(/\/+$/, '') + '/';
  return norm === folder || norm.startsWith(prefix);
}

const changedFiles = getChangedFiles();
const changedSourceFiles = changedFiles.filter((p) => isUnder(p, 'src/'));

const allowlistedLargeFiles = new Set([
  'src/islands/booking/PilgrimCardIsland.ts',
  'src/scripts/profile-island.ts',
  'src/pages/dashboard.astro',
  'src/pages/profile.astro',
  'src/pages/admin/settings.astro',
]);

const allowlistedDrizzleFiles = new Set([
  'src/actions/admin/settings.ts',
  'src/pages/api/availability.ts',
  'src/pages/api/admin/pricing-rules.ts',
  'src/pages/api/admin/services.ts',
  'src/pages/api/admin/hostel-config.ts',
  'src/pages/api/admin/dormitories.ts',
]);

const allowlistedHeavyImports = new Set([
  'src/pages/info/directions.astro',
  'src/components/info/Map3DAlbergue.astro',
  'src/components/info/Map3DTown.astro',
  'src/components/info/Hostel3DBackground.astro',
  'src/pages/hostel-3d.astro',
  'src/components/info/scenes/SceneHero.astro',
  'src/components/info/scenes/SceneFacilities.astro',
  'src/components/info/scenes/SceneGallery.astro',
  'src/components/info/scenes/SceneFAQ.astro',
  'src/components/info/scenes/SceneCTA.astro',
  'src/components/info/scenes/SceneReviews.astro',
  'src/components/info/scenes/ScenePractical.astro',
]);

const errors = [];
const notices = [];

for (const rel of changedSourceFiles) {
  const ext = path.extname(rel).toLowerCase();
  if (!['.ts', '.tsx', '.js', '.mjs', '.astro', '.css'].includes(ext)) continue;

  const abs = path.join(repoRoot, rel);
  const text = readFileSafe(abs);
  if (text == null) continue;

  const loc = nonEmptyLineCount(text);
  if (loc > 250 && !allowlistedLargeFiles.has(rel)) {
    errors.push(
      `File size budget exceeded: ${rel} has ${loc} non-empty lines (>250). Split into modules/components.`
    );
  } else if (loc > 250 && allowlistedLargeFiles.has(rel)) {
    notices.push(`Legacy large file touched: ${rel} (${loc} lines). Keep changes minimal; split plan required.`);
  }

  const hasDrizzleImport =
    /from\s+['"]drizzle-orm['"]/.test(text) ||
    /import\s*\(\s*['"]drizzle-orm['"]\s*\)/.test(text);
  if (hasDrizzleImport) {
    if (allowlistedDrizzleFiles.has(rel) || isUnder(rel, 'src/db/')) {
      notices.push(`Legacy DB coupling present: ${rel} imports drizzle-orm (migration required).`);
    } else {
      errors.push(
        `Architecture gate: ${rel} imports drizzle-orm. Frontend must use explicit Gateway fetch contracts only.`
      );
    }
  }

  if (ext === '.astro') {
    if (/client:only\s*=\s*['"]react['"]/.test(text)) {
      errors.push(`Architecture gate: ${rel} uses client:only="react" (React is not allowed in this stack).`);
    }
  }

  const isInfoSurface = isUnder(rel, 'src/pages/info/') || isUnder(rel, 'src/components/info/');
  if (isInfoSurface && !allowlistedHeavyImports.has(rel)) {
    const hasStaticThree = /from\s+['"]three['"]/.test(text);
    const hasStaticMapLibre = /from\s+['"]maplibre-gl['"]/.test(text);
    const hasDynamicThree = /import\s*\(\s*['"]three['"]\s*\)/.test(text);
    const hasDynamicMapLibre = /import\s*\(\s*['"]maplibre-gl['"]\s*\)/.test(text);

    if ((hasStaticThree && !hasDynamicThree) || (hasStaticMapLibre && !hasDynamicMapLibre)) {
      errors.push(
        `Performance gate: ${rel} statically imports heavy libs (three/maplibre-gl). Use dynamic import behind intent/visibility.`
      );
    }
  }
}

if (notices.length) {
  process.stdout.write(`Architecture notices (${notices.length}):\n`);
  for (const n of notices) process.stdout.write(`- ${n}\n`);
  process.stdout.write('\n');
}

if (errors.length) {
  process.stderr.write(`Architecture gates failed (${errors.length}):\n`);
  for (const e of errors) process.stderr.write(`- ${e}\n`);
  process.stderr.write('\n');
  process.exit(1);
}

process.stdout.write('Architecture gates passed.\n');

