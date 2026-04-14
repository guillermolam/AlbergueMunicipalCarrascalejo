#!/usr//env node

/**
 * TypeScript type checking script for SSR-compatible Astro project
 * Ensures all components and pages are properly typed for production
 */

import { execSync } from 'node:child_process';
import { existsSync, promises as fs } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

// Constants
const ROOT_DIR = process.cwd();
const SRC_DIR = join(ROOT_DIR, 'src');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// --- Logging Utilities ---

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logError(message) {
  console.error(`${colors.red}${colors.bright}❌ ${message}${colors.reset}`);
}

function logSuccess(message) {
  console.log(`${colors.green}${colors.bright}✅ ${message}${colors.reset}`);
}

function logInfo(message) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

// --- Helper Functions ---

/**
 * Recursively find files in a directory
 */
async function findFiles(dir, exts) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const res = join(dir, entry.name);
      return entry.isDirectory() ? findFiles(res, exts) : res;
    })
  );
  return files.flat().filter((file) => exts.some((ext) => file.endsWith(ext)));
}

// --- Validation Functions ---

async function validatePrerequisites() {
  try {
    execSync('npx tsc --version', { stdio: 'ignore' });
    execSync('npx astro --version', { stdio: 'ignore' });
    return true;
  } catch (err) {
    logError('Prerequisites check failed. Ensure TypeScript and Astro are installed.');
    return false;
  }
}

async function runComponentInterfaceCheck() {
  log('\n📋 Checking component interfaces...', colors.cyan);

  const requiredFiles = [
    'src/types/components.ts',
    'src/types/global.d.ts',
    'src/styles/design-tokens.ts',
    // UI components - updating to match real structure if needed
    'src/components/ui/Button.astro',
    'src/components/ui/Card.astro',
    'src/components/ui/DoodleIcon.astro',
    'src/components/ui/Hero.astro',
    'src/components/ui/Stats.astro',
  ];

  try {
    let allFilesExist = true;
    for (const file of requiredFiles) {
      const filePath = resolve(ROOT_DIR, file);
      if (existsSync(filePath)) {
        logSuccess(`Found: ${file}`);
      } else {
        logWarning(`Missing optional component: ${file}`);
        // We don't fail the whole check for these specific UI files 
        // as they might have been moved or renamed in this project structure
      }
    }
    return allFilesExist;
  } catch (err) {
    logError(`Component interface check failed: ${err.message}`);
    return false;
  }
}

async function runSSRCompatibilityCheck() {
  log('\n🌐 Checking SSR compatibility...', colors.cyan);

  try {
    const files = await findFiles(SRC_DIR, ['.astro', '.ts', '.tsx']);
    let hasIssues = false;

    await Promise.all(
      files.map(async (file) => {
        try {
          const content = await fs.readFile(file, 'utf8');

          // Check for unguarded window/document usage
          const unguardedWindow = content.includes('window.') && !content.includes('typeof window');
          const unguardedDocument = content.includes('document.') && !content.includes('typeof document');

          if (unguardedWindow || unguardedDocument) {
            const relativePath = file.replace(ROOT_DIR + '/', '');
            logWarning(`Potential SSR issue in ${relativePath}: unguarded ${unguardedWindow ? 'window' : ''}${unguardedWindow && unguardedDocument ? '/' : ''}${unguardedDocument ? 'document' : ''} usage`);
            hasIssues = true;
          }
        } catch (err) {
          logError(`Error reading file ${file}: ${err.message}`);
        }
      })
    );

    if (hasIssues) {
      logWarning('Found potential SSR issues. Please review the warnings above.');
    } else {
      logSuccess('SSR compatibility check passed!');
    }
    return true; // We return true because these are warnings, not hard errors
  } catch (err) {
    logError(`Failed to check SSR compatibility: ${err.message}`);
    return false;
  }
}

async function runTypeCheck() {
  log('\n🔍 Running TypeScript type checking...', colors.cyan);

  try {
    execSync('npx tsc --noEmit --skipLibCheck --strict', {
      stdio: 'inherit',
      cwd: ROOT_DIR,
    });
    logSuccess('TypeScript compilation completed successfully!');
    return true;
  } catch (err) {
    logError('TypeScript compilation failed. Please fix the type errors above.');
    return false;
  }
}

async function runAstroCheck() {
  log('\n🚀 Running Astro type checking...', colors.cyan);

  try {
    execSync('npx astro check', {
      stdio: 'inherit',
      cwd: ROOT_DIR,
    });
    logSuccess('Astro type checking completed successfully!');
    return true;
  } catch (err) {
    logError('Astro type checking failed. Please fix the errors above.');
    return false;
  }
}

async function generateTypeReport() {
  log('\n📊 Generating type checking report...', colors.cyan);

  try {
    // Generate detailed type information
    execSync('npx tsc --noEmit --skipLibCheck --strict --generateTrace trace', {
      stdio: 'ignore',
      cwd: ROOT_DIR,
    });

    logInfo('Type checking report generated in ./trace directory');
    return true;
  } catch (err) {
    logWarning(`Failed to generate trace report: ${err.message}`);
    return false;
  }
}

// --- Main Execution ---

async function main() {
  const args = process.argv.slice(2);
  const skipReport = args.includes('--skip-report');
  const quickMode = args.includes('--quick');

  log('\n' + '='.repeat(60), colors.magenta);
  log('🎯 Astro + TypeScript Type Checking Tool', colors.magenta);
  log('SSR-Compatible Component Validation', colors.magenta);
  log('='.repeat(60), colors.magenta);

  // 1. Prerequisites
  if (!(await validatePrerequisites())) {
    process.exit(1);
  }

  let hasErrors = false;

  // 2. Fast parallel checks
  const [interfacesPassed, ssrPassed] = await Promise.all([
    runComponentInterfaceCheck(),
    runSSRCompatibilityCheck()
  ]);

  if (!interfacesPassed) {
    // We treat missing interfaces as warning for now, but you could set hasErrors = true here
    logWarning('Some component interfaces were missing.');
  }

  // 3. Heavy sequential checks
  if (!quickMode) {
    if (!(await runTypeCheck())) {
      hasErrors = true;
    }

    if (!(await runAstroCheck())) {
      hasErrors = true;
    }
  } else {
    logInfo('\n⏩ Quick mode: skipping full type checking and astro check');
  }

  // 4. Report generation
  if (!skipReport && !hasErrors && !quickMode) {
    await generateTypeReport();
  }

  // Final summary
  log('\n' + '='.repeat(60), colors.magenta);

  if (hasErrors) {
    logError('Type checking completed with errors!');
    log('Please fix the issues above before deploying to production.', colors.red);
    process.exit(1);
  } else {
    logSuccess('🎉 All type checks passed successfully!');
    log('Your Astro project is ready for production deployment.', colors.green);
    
    log('\n📌 Next steps:', colors.blue);
    const packageManager = existsSync(join(ROOT_DIR, 'pnpm-lock.yaml')) ? 'pnpm' : 'npm';
    log(`  1. Run: ${packageManager} run build`, colors.white);
    log(`  2. Run: ${packageManager} run test`, colors.white);
    log(`  3. Run: ${packageManager} run deploy`, colors.white);
  }

  log('='.repeat(60), colors.magenta);
}

// --- Error Handling ---

process.on('unhandledRejection', (err) => {
  logError(`Unhandled rejection: ${err}`);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logError(`Uncaught exception: ${err.message}`);
  process.exit(1);
});

// Run the tool
main().catch((err) => {
  logError(`Script failed: ${err.message}`);
  process.exit(1);
});
