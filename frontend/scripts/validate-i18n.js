#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const languages = [
  'es', 'en', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ko', 'ja', 
  'zh', 'ru', 'cs', 'sk', 'hu', 'ca', 'eu', 'gl', 'oc', 'Gode'
];

const categories = [
  'common', 'navigation', 'booking', 'dashboard', 'admin', 'messages'
];

const localesDir = path.join(__dirname, '../src/components/LanguageSelector/locales');

console.log('🔍 Validating i18n configuration...');

let valid = true;

languages.forEach(lang => {
  categories.forEach(cat => {
    const file = path.join(localesDir, lang, `${cat}.json`);
    if (!fs.existsSync(file)) {
      console.error(`❌ Missing file: ${file}`);
      valid = false;
    } else {
      try {
        const content = fs.readFileSync(file, 'utf8');
        JSON.parse(content);
      } catch (error) {
        console.error(`❌ Invalid JSON in: ${file} - ${error.message}`);
        valid = false;
      }
    }
  });
});

if (valid) {
  console.log('✅ All i18n files are present and valid');
  console.log(`📁 Total files: ${languages.length * categories.length}`);
} else {
  console.log('❌ i18n validation failed');
  process.exit(1);
}
