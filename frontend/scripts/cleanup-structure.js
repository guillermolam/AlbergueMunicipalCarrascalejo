import fs from 'fs/promises';
import path from 'path';

async function moveSharedComponents() {
  // Define shared components to move
  const componentsToMove = {
    'frontend/src/components': {
      target: 'frontend/packages/ui/src'
    },
    'frontend/src/pages': {
      target: 'frontend/apps'
    }
  };

  // Move each component
  for (const [source, { target }] of Object.entries(componentsToMove)) {
    try {
      const files = await fs.readdir(source);
      for (const file of files) {
        if (file.endsWith('.tsx') || file.endsWith('.ts')) {
          const sourcePath = path.join(source, file);
          const targetPath = path.join(target, file);
          await fs.rename(sourcePath, targetPath);
        }
      }
      // Remove empty directories
      await fs.rmdir(source);
    } catch (error) {
      console.error(`Error moving components from ${source}:`, error);
    }
  }
}

async function updateImports() {
  // Define import replacements
  const importReplacements = {
    "@components/ui": "@ui",
    "@components/auth": "@auth",
    "@components/registration-form": "@registration-form"
  };

  // Search in all app and package files
  const searchPaths = [
    '/home/glam/git/AlbergueMunicipalCarrascalejo/frontend/apps',
    '/home/glam/git/AlbergueMunicipalCarrascalejo/frontend/packages'
  ];

  // Update each file
  for (const searchPath of searchPaths) {
    const files = await fs.readdir(searchPath, { withFileTypes: true, recursive: true });
    for (const file of files) {
      if (file.isFile() && file.name.endsWith('.tsx')) {
        const filePath = path.join(searchPath, file.name);
        const fullPath = path.join(searchPath, file.name);
        let content = await fs.readFile(fullPath, 'utf-8');
        
        // Replace each import
        for (const [oldPath, newPath] of Object.entries(importReplacements)) {
          const importRegex = new RegExp(`from\s+['"]${oldPath}['"]`, 'g');
          content = content.replace(importRegex, `from '${newPath}'`);
        }
        
        // Write back the updated content
        await fs.writeFile(fullPath, content);
      }
    }
  }
}

async function removeRedundantFiles() {
  // List of files/directories to remove
  const toRemove = [
    'frontend/src/data/mock-reviews.ts',
    'frontend/src/data/mock-booking.ts',
    'frontend/src/types',
    'frontend/src/lib'
  ];

  for (const item of toRemove) {
    try {
      await fs.rm(item, { recursive: true, force: true });
    } catch (error) {
      console.error(`Error removing ${item}:`, error);
    }
  }
}

async function main() {
  try {
    await moveSharedComponents();
    await updateImports();
    await removeRedundantFiles();
    console.log('Cleanup complete!');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

main();
