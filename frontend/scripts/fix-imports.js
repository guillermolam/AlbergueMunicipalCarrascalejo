import fs from 'fs';
import path from 'path';

// Define the paths to search
const searchPaths = [
  '/home/glam/git/AlbergueMunicipalCarrascalejo/frontend/packages/components/**/*.{tsx,ts}',
  '/home/glam/git/AlbergueMunicipalCarrascalejo/frontend/apps/**/*.{tsx,ts}'
];

// Define the import replacements
const importReplacements = {
  "@contexts/i18n": "@i18n",
  "@contexts/auth": "@auth/shared",
  "@components/components": "@components",
  "@components/ui": "@ui"
};

// Process each file
searchPaths.forEach(async searchPath => {
  const files = await fs.readdir(searchPath, { recursive: true });
  
  for (const file of files) {
    if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const filePath = path.join(searchPath, file);
      let content = await fs.readFile(filePath, 'utf-8');
      
      // Replace each import
      Object.entries(importReplacements).forEach(([oldPath, newPath]) => {
        const importRegex = new RegExp(`from\s+['"]${oldPath}['"]`, 'g');
        content = content.replace(importRegex, `from '${newPath}'`);
      });
      
      // Write back the updated content
      await fs.writeFile(filePath, content);
    }
  }
});
