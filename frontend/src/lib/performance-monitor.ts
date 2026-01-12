// Performance monitoring utilities for Astro microfrontend architecture

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fcp?: number; // First Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
  
  // Custom metrics
  bundleSize?: number;
  jsBundleSize?: number;
  cssBundleSize?: number;
  islandCount?: number;
  hydrationTime?: number;
  
  // User experience metrics
  loadTime?: number;
  domContentLoaded?: number;
  domInteractive?: number;
  
  // Resource loading metrics
  resourceLoadTimes?: Record<string, number>;
  
  // Error metrics
  errorCount?: number;
  warningCount?: number;
}

export interface PerformanceTarget {
  lcp: number; // < 2.5s
  fcp: number; // < 1.8s
  fid: number; // < 100ms
  cls: number; // < 0.1
  ttfb: number; // < 600ms
  bundleSize: number; // < 150KB
  jsBundleSize: number; // < 100KB
}

export const performanceTargets: PerformanceTarget = {
  lcp: 2500, // 2.5s
  fcp: 1800, // 1.8s
  fid: 100, // 100ms
  cls: 0.1, // 0.1
  ttfb: 600, // 600ms
  bundleSize: 150 * 1024, // 150KB
  jsBundleSize: 100 * 1024, // 100KB
};

export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private observers: Array<(metrics: PerformanceMetrics) => void> = [];
  private isMonitoring = false;
  
  startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    
    // Monitor Core Web Vitals
    this.monitorCoreWebVitals();
    
    // Monitor resource loading
    this.monitorResourceLoading();
    
    // Monitor bundle sizes
    this.monitorBundleSizes();
    
    // Monitor hydration performance
    this.monitorHydrationPerformance();
  }
  
  stopMonitoring() {
    this.isMonitoring = false;
  }
  
  private monitorCoreWebVitals() {
    // Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.metrics.lcp = entry.startTime;
        this.notifyObservers();
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] });
    
    // First Contentful Paint (FCP)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.metrics.fcp = entry.startTime;
        this.notifyObservers();
      }
    }).observe({ entryTypes: ['paint'] });
    
    // First Input Delay (FID)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const eventEntry = entry as PerformanceEventTiming;
        this.metrics.fid = eventEntry.processingStart - eventEntry.startTime;
        this.notifyObservers();
      }
    }).observe({ entryTypes: ['first-input'] });
    
    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      this.metrics.cls = clsValue;
      this.notifyObservers();
    }).observe({ entryTypes: ['layout-shift'] });
    
    // Time to First Byte (TTFB)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {\n        const navEntry = entry as PerformanceNavigationTiming;
        this.metrics.ttfb = navEntry.responseStart - navEntry.requestStart;
        this.notifyObservers();
      }
    }).observe({ entryTypes: ['navigation'] });
  }
  
  private monitorResourceLoading() {
    const resourceLoadTimes: Record<string, number> = {};
    
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          resourceLoadTimes[entry.name] = entry.duration;
        }
      }
      this.metrics.resourceLoadTimes = resourceLoadTimes;
      this.notifyObservers();
    }).observe({ entryTypes: ['resource'] });
  }
  
  private monitorBundleSizes() {
    // Monitor JavaScript bundle sizes
    const jsResources = performance.getEntriesByType('resource')
      .filter(entry => entry.name.endsWith('.js'));
    
    let totalJsSize = 0;
    jsResources.forEach(resource => {
      // Estimate size based on transfer size or content length
      const size = (resource as any).transferSize || (resource as any).encodedBodySize || 0;
      totalJsSize += size;
    });
    
    this.metrics.jsBundleSize = totalJsSize;
    
    // Monitor CSS bundle sizes
    const cssResources = performance.getEntriesByType('resource')
      .filter(entry => entry.name.endsWith('.css'));
    
    let totalCssSize = 0;
    cssResources.forEach(resource => {
      const size = (resource as any).transferSize || (resource as any).encodedBodySize || 0;
      totalCssSize += size;
    });
    
    this.metrics.cssBundleSize = totalCssSize;
    this.metrics.bundleSize = totalJsSize + totalCssSize;
    
    this.notifyObservers();
  }
  
  private monitorHydrationPerformance() {
    // Monitor Solid.js hydration time
    if (typeof window !== 'undefined' && (window as any).__SOLID_DEVTOOLS__) {
      const startTime = performance.now();
      
      // Listen for hydration completion
      document.addEventListener('DOMContentLoaded', () => {
        const endTime = performance.now();
        this.metrics.hydrationTime = endTime - startTime;
        this.notifyObservers();
      });
    }
  }
  
  // Public methods
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
  
  getPerformanceScore(): number {
    const metrics = this.getMetrics();
    let score = 100;
    
    // LCP scoring
    if (metrics.lcp && metrics.lcp > performanceTargets.lcp) {
      score -= Math.min(30, (metrics.lcp - performanceTargets.lcp) / 100);
    }
    
    // FCP scoring
    if (metrics.fcp && metrics.fcp > performanceTargets.fcp) {
      score -= Math.min(20, (metrics.fcp - performanceTargets.fcp) / 100);
    }
    
    // FID scoring
    if (metrics.fid && metrics.fid > performanceTargets.fid) {
      score -= Math.min(20, (metrics.fid - performanceTargets.fid) / 10);
    }
    
    // CLS scoring
    if (metrics.cls && metrics.cls > performanceTargets.cls) {
      score -= Math.min(15, (metrics.cls - performanceTargets.cls) * 100);
    }
    
    // TTFB scoring
    if (metrics.ttfb && metrics.ttfb > performanceTargets.ttfb) {
      score -= Math.min(15, (metrics.ttfb - performanceTargets.ttfb) / 100);
    }
    
    // Bundle size scoring
    if (metrics.bundleSize && metrics.bundleSize > performanceTargets.bundleSize) {
      score -= Math.min(20, (metrics.bundleSize - performanceTargets.bundleSize) / (10 * 1024));
    }
    
    return Math.max(0, score);
  }
  
  checkPerformanceTargets(): { violations: string[]; warnings: string[] } {
    const violations: string[] = [];
    const warnings: string[] = [];
    const metrics = this.getMetrics();
    
    // LCP check
    if (metrics.lcp && metrics.lcp > performanceTargets.lcp) {
      violations.push(`LCP (${metrics.lcp.toFixed(0)}ms) exceeds target (${performanceTargets.lcp}ms)`);
    } else if (metrics.lcp && metrics.lcp > performanceTargets.lcp * 0.8) {
      warnings.push(`LCP (${metrics.lcp.toFixed(0)}ms) approaching target (${performanceTargets.lcp}ms)`);
    }
    
    // FCP check
    if (metrics.fcp && metrics.fcp > performanceTargets.fcp) {
      violations.push(`FCP (${metrics.fcp.toFixed(0)}ms) exceeds target (${performanceTargets.fcp}ms)`);
    } else if (metrics.fcp && metrics.fcp > performanceTargets.fcp * 0.8) {
      warnings.push(`FCP (${metrics.fcp.toFixed(0)}ms) approaching target (${performanceTargets.fcp}ms)`);
    }
    
    // FID check
    if (metrics.fid && metrics.fid > performanceTargets.fid) {
      violations.push(`FID (${metrics.fid.toFixed(0)}ms) exceeds target (${performanceTargets.fid}ms)`);
    } else if (metrics.fid && metrics.fid > performanceTargets.fid * 0.8) {
      warnings.push(`FID (${metrics.fid.toFixed(0)}ms) approaching target (${performanceTargets.fid}ms)`);
    }
    
    // CLS check
    if (metrics.cls && metrics.cls > performanceTargets.cls) {
      violations.push(`CLS (${metrics.cls.toFixed(3)}) exceeds target (${performanceTargets.cls})`);
    } else if (metrics.cls && metrics.cls > performanceTargets.cls * 0.8) {
      warnings.push(`CLS (${metrics.cls.toFixed(3)}) approaching target (${performanceTargets.cls})`);
    }
    
    // TTFB check
    if (metrics.ttfb && metrics.ttfb > performanceTargets.ttfb) {
      violations.push(`TTFB (${metrics.ttfb.toFixed(0)}ms) exceeds target (${performanceTargets.ttfb}ms)`);
    } else if (metrics.ttfb && metrics.ttfb > performanceTargets.ttfb * 0.8) {
      warnings.push(`TTFB (${metrics.ttfb.toFixed(0)}ms) approaching target (${performanceTargets.ttfb}ms)`);
    }
    
    // Bundle size check
    if (metrics.bundleSize && metrics.bundleSize > performanceTargets.bundleSize) {
      violations.push(`Bundle size (${(metrics.bundleSize / 1024).toFixed(2)}KB) exceeds target (${(performanceTargets.bundleSize / 1024).toFixed(2)}KB)`);
    } else if (metrics.bundleSize && metrics.bundleSize > performanceTargets.bundleSize * 0.8) {
      warnings.push(`Bundle size (${(metrics.bundleSize / 1024).toFixed(2)}KB) approaching target (${(performanceTargets.bundleSize / 1024).toFixed(2)}KB)`);
    }
    
    return { violations, warnings };
  }
  
  subscribe(callback: (metrics: PerformanceMetrics) => void) {
    this.observers.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.observers.indexOf(callback);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }
  
  private notifyObservers() {
    this.observers.forEach(callback => {
      callback(this.getMetrics());
    });
  }
  
  // Static utility methods
  static measureIslandPerformance(islandName: string): () => number {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      return endTime - startTime;
    };
  }
  
  static measureComponentHydration(componentName: string): () => number {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Log for development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${componentName} hydration: ${duration.toFixed(2)}ms`);
      }
      
      return duration;
    };
  }
  
  static async measureAsyncOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<{ result: T; duration: number }> {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${operationName}: ${duration.toFixed(2)}ms`);
      }
      
      return { result, duration };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (process.env.NODE_ENV === 'development') {
        console.error(`[Performance] ${operationName} failed after ${duration.toFixed(2)}ms:`, error);
      }
      
      throw error;
    }
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-start monitoring in production
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  performanceMonitor.startMonitoring();
}

// Performance utilities for Astro islands
export function withPerformanceTracking<T extends (...args: any[]) => any>(
  fn: T,
  name: string
): T {
  return ((...args: Parameters<T>) => {
    const measure = PerformanceMonitor.measureComponentHydration(name);
    const result = fn(...args);
    
    if (result && typeof result.then === 'function') {
      return result.finally(() => {
        measure();
      });
    } else {
      measure();
      return result;
    }
  }) as T;
}

// Export for use in components
export default performanceMonitor;