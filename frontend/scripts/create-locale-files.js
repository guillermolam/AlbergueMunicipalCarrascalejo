#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const languages = [
  'es',
  'en',
  'fr',
  'de',
  'it',
  'pt',
  'nl',
  'pl',
  'ko',
  'ja',
  'zh',
  'ru',
  'cs',
  'sk',
  'hu',
  'ca',
  'eu',
  'gl',
  'oc',
  'Gode',
];

const categories = ['common', 'navigation', 'booking', 'dashboard', 'admin', 'messages'];

const localesDir = path.join(__dirname, '../src/components/LanguageSelector/locales');

// Create locales directory if it doesn't exist
if (!fs.existsSync(localesDir)) {
  fs.mkdirSync(localesDir, { recursive: true });
}

// Create directories and files for each language
languages.forEach((lang) => {
  const langDir = path.join(localesDir, lang);

  // Create language directory
  if (!fs.existsSync(langDir)) {
    fs.mkdirSync(langDir, { recursive: true });
  }

  // Create category files
  categories.forEach((category) => {
    const filePath = path.join(langDir, `${category}.json`);
    const content = JSON.stringify({}, null, 2);
    fs.writeFileSync(filePath, content);
    console.log(`Created: ${filePath}`);
  });
});

console.log(`\n✅ Created locale files for ${languages.length} languages`);
console.log(`📁 Total files: ${languages.length * categories.length}`);
