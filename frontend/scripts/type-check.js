#!/usr/bin/env node

/**
 * TypeScript type checking script for SSR-compatible Astro project
 * Ensures all components and pages are properly typed for production
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

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

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function error(message) {
  console.error(`${colors.red}${colors.bright}❌ ${message}${colors.reset}`);
}

function success(message) {
  console.log(`${colors.green}${colors.bright}✅ ${message}${colors.reset}`);
}

function info(message) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

function warning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

// Check if TypeScript is available
function checkTypeScript() {
  try {
    execSync('npx tsc --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    error('TypeScript is not available. Please install it first.');
    return false;
  }
}

// Check if Astro is available
function checkAstro() {
  try {
    execSync('npx astro --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    error('Astro is not available. Please install it first.');
    return false;
  }
}

// Run TypeScript compilation check
function runTypeCheck() {
  log('\n🔍 Running TypeScript type checking...', colors.cyan);

  try {
    // Run TypeScript compiler with strict settings
    execSync('npx tsc --noEmit --skipLibCheck --strict', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    success('TypeScript compilation completed successfully!');
    return true;
  } catch (error) {
    error('TypeScript compilation failed. Please fix the type errors above.');
    return false;
  }
}

// Run Astro check for .astro files
function runAstroCheck() {
  log('\n🚀 Running Astro type checking...', colors.cyan);

  try {
    // Run Astro check command
    execSync('npx astro check', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    success('Astro type checking completed successfully!');
    return true;
  } catch (error) {
    error('Astro type checking failed. Please fix the errors above.');
    return false;
  }
}

// Check component interfaces
function checkComponentInterfaces() {
  log('\n📋 Checking component interfaces...', colors.cyan);

  const requiredFiles = [
    'src/types/components.ts',
    'src/types/global.d.ts',
    'src/styles/design-tokens.ts',
    'src/components/ui/Button.astro',
    'src/components/ui/Card.astro',
    'src/components/ui/DoodleIcon.astro',
    'src/components/ui/Hero.astro',
    'src/components/ui/Stats.astro',
  ];

  let allFilesExist = true;

  for (const file of requiredFiles) {
    const filePath = resolve(process.cwd(), file);
    if (existsSync(filePath)) {
      success(`Found: ${file}`);
    } else {
      error(`Missing: ${file}`);
      allFilesExist = false;
    }
  }

  return allFilesExist;
}

// Check SSR compatibility
function checkSSRCompatibility() {
  log('\n🌐 Checking SSR compatibility...', colors.cyan);

  try {
    // Check if window/document usage is properly guarded
    const files = execSync('find src -name "*.astro" -o -name "*.ts" -o -name "*.tsx"', {
      encoding: 'utf8',
    })
      .trim()
      .split('\n');

    let hasIssues = false;

    for (const file of files) {
      if (!file) continue;

      try {
        const content = execSync(`cat "${file}"`, { encoding: 'utf8' });

        // Check for unguarded window/document usage
        if (content.includes('window.') && !content.includes('typeof window')) {
          warning(`Potential SSR issue in ${file}: unguarded window usage`);
          hasIssues = true;
        }

        if (content.includes('document.') && !content.includes('typeof document')) {
          warning(`Potential SSR issue in ${file}: unguarded document usage`);
          hasIssues = true;
        }
      } catch (error) {
        // File read error, skip
      }
    }

    if (!hasIssues) {
      success('SSR compatibility check passed!');
    } else {
      warning('Found potential SSR issues. Please review the warnings above.');
    }

    return true;
  } catch (error) {
    error('Failed to check SSR compatibility');
    return false;
  }
}

// Generate type report
function generateTypeReport() {
  log('\n📊 Generating type checking report...', colors.cyan);

  try {
    // Generate detailed type information
    execSync('npx tsc --noEmit --skipLibCheck --strict --generateTrace trace', {
      stdio: 'ignore',
      cwd: process.cwd(),
    });

    info('Type checking report generated in ./trace directory');
    return true;
  } catch (error) {
    warning('Could not generate detailed type report');
    return false;
  }
}

// Main execution
async function main() {
  log('\n' + '='.repeat(60), colors.magenta);
  log('🎯 Astro + TypeScript Type Checking Tool', colors.magenta);
  log('SSR-Compatible Component Validation', colors.magenta);
  log('='.repeat(60), colors.magenta);

  // Check prerequisites
  if (!checkTypeScript() || !checkAstro()) {
    process.exit(1);
  }

  let hasErrors = false;

  // Run all checks
  if (!checkComponentInterfaces()) {
    hasErrors = true;
  }

  if (!checkSSRCompatibility()) {
    hasErrors = true;
  }

  if (!runTypeCheck()) {
    hasErrors = true;
  }

  if (!runAstroCheck()) {
    hasErrors = true;
  }

  // Generate report (optional)
  generateTypeReport();

  // Final summary
  log('\n' + '='.repeat(60), colors.magenta);

  if (hasErrors) {
    error('Type checking completed with errors!');
    log('Please fix the issues above before deploying to production.', colors.red);
    process.exit(1);
  } else {
    success('🎉 All type checks passed successfully!');
    log('Your Astro project is ready for production deployment.', colors.green);
    log('\n📌 Next steps:', colors.blue);
    log('  1. Run: pnpm run build', colors.white);
    log('  2. Test: pnpm run test', colors.white);
    log('  3. Deploy: pnpm run deploy', colors.white);
  }

  log('='.repeat(60), colors.magenta);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  error(`Unhandled rejection: ${error}`);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  error(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

// Run the tool
main().catch((error) => {
  error(`Script failed: ${error.message}`);
  process.exit(1);
});
