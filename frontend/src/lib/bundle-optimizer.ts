// Bundle optimization utilities for Astro microfrontend architecture

export interface BundleOptimizationConfig {
  // Chunk size limits (in KB)
  maxChunkSize: number;
  maxInitialChunkSize: number;
  maxAsyncChunkSize: number;
  
  // Asset size limits (in bytes)
  maxAssetSize: number;
  maxEntrypointSize: number;
  
  // Optimization flags
  splitChunks: boolean;
  minimize: boolean;
  sourceMaps: boolean;
  treeShaking: boolean;
  
  // Performance budgets
  budgets: PerformanceBudget[];
}

export interface PerformanceBudget {
  type: 'bundle' | 'asset' | 'entrypoint';
  name: string;
  maximumSize: number; // in KB
  warningSize?: number; // in KB
  compression?: 'gzip' | 'brotli';
}

// Default optimization configuration
export const defaultBundleConfig: BundleOptimizationConfig = {
  maxChunkSize: 150, // 150KB
  maxInitialChunkSize: 100, // 100KB
  maxAsyncChunkSize: 200, // 200KB
  maxAssetSize: 50 * 1024, // 50KB
  maxEntrypointSize: 150 * 1024, // 150KB
  
  splitChunks: true,
  minimize: true,
  sourceMaps: true,
  treeShaking: true,
  
  budgets: [
    {
      type: 'bundle',
      name: 'main',
      maximumSize: 100,
      warningSize: 80,
      compression: 'gzip',
    },
    {
      type: 'bundle',
      name: 'vendor',
      maximumSize: 150,
      warningSize: 120,
      compression: 'gzip',
    },
    {
      type: 'asset',
      name: 'styles',
      maximumSize: 30,
      warningSize: 25,
      compression: 'gzip',
    },
    {
      type: 'entrypoint',
      name: 'booking',
      maximumSize: 150,
      warningSize: 120,
      compression: 'gzip',
    },
    {
      type: 'entrypoint',
      name: 'dashboard',
      maximumSize: 100,
      warningSize: 80,
      compression: 'gzip',
    },
    {
      type: 'entrypoint',
      name: 'admin',
      maximumSize: 120,
      warningSize: 100,
      compression: 'gzip',
    },
  ],
};

// Chunk splitting strategy for microfrontends
export const microfrontendChunkStrategy = {
  chunks: 'all',
  minSize: 20000, // 20KB
  maxSize: 150000, // 150KB
  minChunks: 1,
  maxAsyncRequests: 30,
  maxInitialRequests: 10,
  automaticNameDelimiter: '~',
  name: true,
  
  cacheGroups: {
    // Framework chunks
    'solid-js': {
      name: 'solid-js',
      test: /[\\/]node_modules[\\/]solid-js[\\/]/,
      priority: 10,
      reuseExistingChunk: true,
    },
    
    'nanostores': {
      name: 'nanostores',
      test: /[\\/]node_modules[\\/]nanostores[\\/]/,
      priority: 9,
      reuseExistingChunk: true,
    },
    
    // UI component chunks
    'ui-components': {
      name: 'ui-components',
      test: /[\\/]src[\\/]components[\\/](ui|core|shared)[\\/]/,
      priority: 8,
      reuseExistingChunk: true,
    },
    
    // Feature-specific chunks
    'booking-components': {
      name: 'booking-components',
      test: /[\\/]src[\\/](components|islands)[\\/]booking[\\/]/,
      priority: 7,
      reuseExistingChunk: true,
    },
    
    'dashboard-components': {
      name: 'dashboard-components',
      test: /[\\/]src[\\/](components|islands)[\\/]dashboard[\\/]/,
      priority: 7,
      reuseExistingChunk: true,
    },
    
    'admin-components': {
      name: 'admin-components',
      test: /[\\/]src[\\/](components|islands)[\\/]admin[\\/]/,
      priority: 7,
      reuseExistingChunk: true,
    },
    
    // Design system chunks
    'doodle-system': {
      name: 'doodle-system',
      test: /[\\/]src[\\/]components[\\/]doodle[\\/]/,
      priority: 6,
      reuseExistingChunk: true,
    },
    
    // Utility chunks
    'app-stores': {
      name: 'app-stores',
      test: /[\\/]src[\\/]stores[\\/]/,
      priority: 5,
      reuseExistingChunk: true,
    },
    
    'app-utils': {
      name: 'app-utils',
      test: /[\\/]src[\\/](utils|lib)[\\/]/,
      priority: 4,
      reuseExistingChunk: true,
    },
    
    // Vendor chunks
    'vendor': {
      name: 'vendor',
      test: /[\\/]node_modules[\\/]/,
      priority: 1,
      reuseExistingChunk: true,
    },
    
    // Common chunks
    'common': {
      name: 'common',
      minChunks: 2,
      priority: 0,
      reuseExistingChunk: true,
    },
  },
};

// Performance monitoring utilities
export class BundlePerformanceMonitor {
  private metrics: Map<string, number> = new Map();
  
  recordChunkSize(name: string, size: number) {
    this.metrics.set(`chunk-${name}`, size);
  }
  
  recordAssetSize(name: string, size: number) {
    this.metrics.set(`asset-${name}`, size);
  }
  
  recordEntrypointSize(name: string, size: number) {
    this.metrics.set(`entrypoint-${name}`, size);
  }
  
  checkBudgets(budgets: PerformanceBudget[]): { violations: string[]; warnings: string[] } {
    const violations: string[] = [];
    const warnings: string[] = [];
    
    budgets.forEach(budget => {
      const key = `${budget.type}-${budget.name}`;
      const size = this.metrics.get(key);
      
      if (size !== undefined) {
        const sizeKB = size / 1024;
        
        if (sizeKB > budget.maximumSize) {
          violations.push(
            `${budget.type} "${budget.name}" exceeds budget: ${sizeKB.toFixed(2)}KB > ${budget.maximumSize}KB`
          );
        } else if (budget.warningSize && sizeKB > budget.warningSize) {
          warnings.push(
            `${budget.type} "${budget.name}" approaching budget: ${sizeKB.toFixed(2)}KB > ${budget.warningSize}KB`
          );
        }
      }
    });
    
    return { violations, warnings };
  }
  
  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }
  
  clear() {
    this.metrics.clear();
  }
}

// Bundle analysis utilities
export function analyzeBundleStats(stats: any): BundleAnalysis {
  const chunks = stats.compilation.chunks;
  const assets = stats.compilation.assets;
  
  const analysis: BundleAnalysis = {
    totalSize: 0,
    chunkCount: chunks.length,
    assetCount: Object.keys(assets).length,
    largestChunk: { name: '', size: 0 },
    smallestChunk: { name: '', size: Infinity },
    averageChunkSize: 0,
    chunks: [],
    assets: [],
  };
  
  // Analyze chunks
  chunks.forEach((chunk: any) => {
    const size = chunk.size;
    analysis.totalSize += size;
    
    if (size > analysis.largestChunk.size) {
      analysis.largestChunk = { name: chunk.name, size };
    }
    
    if (size < analysis.smallestChunk.size) {
      analysis.smallestChunk = { name: chunk.name, size };
    }
    
    analysis.chunks.push({
      name: chunk.name,
      size,
      modules: chunk.modules.length,
      files: chunk.files,
    });
  });
  
  analysis.averageChunkSize = analysis.totalSize / analysis.chunkCount;
  
  // Analyze assets
  Object.entries(assets).forEach(([name, asset]: [string, any]) => {
    analysis.assets.push({
      name,
      size: asset.size,
      type: name.split('.').pop() || 'unknown',
    });
  });
  
  return analysis;
}

export interface BundleAnalysis {
  totalSize: number;
  chunkCount: number;
  assetCount: number;
  largestChunk: { name: string; size: number };
  smallestChunk: { name: string; size: number };
  averageChunkSize: number;
  chunks: Array<{
    name: string;
    size: number;
    modules: number;
    files: string[];
  }>;
  assets: Array<{
    name: string;
    size: number;
    type: string;
  }>;
}

// Optimization recommendations
export function generateOptimizationRecommendations(analysis: BundleAnalysis, config: BundleOptimizationConfig): string[] {
  const recommendations: string[] = [];
  
  // Check chunk sizes
  if (analysis.largestChunk.size > config.maxChunkSize * 1024) {
    recommendations.push(
      `Consider splitting the largest chunk "${analysis.largestChunk.name}" (${(analysis.largestChunk.size / 1024).toFixed(2)}KB)`
    );
  }
  
  // Check average chunk size
  if (analysis.averageChunkSize > config.maxChunkSize * 1024) {
    recommendations.push(
      `Average chunk size (${(analysis.averageChunkSize / 1024).toFixed(2)}KB) exceeds recommended limit (${config.maxChunkSize}KB)`
    );
  }
  
  // Check total size
  if (analysis.totalSize > 1000 * 1024) { // 1MB
    recommendations.push(
      `Total bundle size (${(analysis.totalSize / 1024).toFixed(2)}KB) is quite large. Consider code splitting or lazy loading.`
    );
  }
  
  // Check for duplicate modules
  const moduleCounts = new Map<string, number>();
  analysis.chunks.forEach(chunk => {
    chunk.modules.forEach((module: any) => {
      moduleCounts.set(module, (moduleCounts.get(module) || 0) + 1);
    });
  });
  
  const duplicates = Array.from(moduleCounts.entries()).filter(([_, count]) => count > 1);
  if (duplicates.length > 0) {
    recommendations.push(
      `Found ${duplicates.length} modules duplicated across chunks. Consider using shared chunks.`
    );
  }
  
  return recommendations;
}

// Export default configuration
export default defaultBundleConfig;