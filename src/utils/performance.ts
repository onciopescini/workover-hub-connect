/**
 * Performance Optimization Utilities
 * Helpers per lazy loading, prefetching e performance monitoring
 */

import { ComponentType, lazy } from 'react';

/**
 * Lazy load con retry automatico in caso di fallimento
 * Utile per gestire errori di caricamento chunk (es. nuove deploy)
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    const maxRetries = 3;
    const retryDelay = 1000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await componentImport();
      } catch (error) {
        // Se è l'ultimo tentativo, lancia l'errore
        if (i === maxRetries - 1) {
          throw error;
        }

        // Aspetta prima di ritentare
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (i + 1)));
        
        // Se è un chunk loading error, prova a ricaricare la pagina
        if (error instanceof Error && error.message.includes('Failed to fetch dynamically imported module')) {
          // Solo al secondo tentativo per evitare loop infiniti
          if (i === 1) {
            window.location.reload();
          }
        }
      }
    }

    // Fallback (non dovrebbe mai arrivare qui)
    throw new Error('Failed to load component after retries');
  });
}

/**
 * Prefetch di una route per velocizzare la navigazione
 */
export function prefetchRoute(path: string): void {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = path;
  document.head.appendChild(link);
}

/**
 * Preload di risorse critiche
 */
export function preloadResource(
  href: string,
  as: 'script' | 'style' | 'image' | 'font'
): void {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  if (as === 'font') {
    link.crossOrigin = 'anonymous';
  }
  document.head.appendChild(link);
}

/**
 * Lazy load immagini con Intersection Observer
 */
export function lazyLoadImage(img: HTMLImageElement): void {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const lazyImg = entry.target as HTMLImageElement;
            const src = lazyImg.dataset['src'];
            const srcset = lazyImg.dataset['srcset'];
            
            if (src) lazyImg.src = src;
            if (srcset) lazyImg.srcset = srcset;
            
            lazyImg.classList.remove('lazy');
            observer.unobserve(lazyImg);
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.01,
      }
    );

    observer.observe(img);
  } else {
    // Fallback per browser senza IntersectionObserver
    const src = img.dataset['src'];
    const srcset = img.dataset['srcset'];
    if (src) img.src = src;
    if (srcset) img.srcset = srcset;
  }
}

/**
 * Debounce per ottimizzare funzioni chiamate frequentemente
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle per limitare la frequenza di esecuzione
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Request Idle Callback wrapper con fallback
 */
export function requestIdleCallback(callback: () => void, timeout = 2000): void {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, 1);
  }
}

/**
 * Misura performance di una funzione
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    
    // Log solo se supera 100ms
    if (duration > 100) {
      console.warn(`[Performance] ${name} took ${duration.toFixed(2)}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[Performance] ${name} failed after ${duration.toFixed(2)}ms`, error);
    throw error;
  }
}

/**
 * Cache semplice per risultati di funzioni costose
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);
    
    return result;
  }) as T;
}

/**
 * Chunking per processare grandi array senza bloccare il thread
 */
export async function processInChunks<T, R>(
  items: T[],
  processor: (item: T) => R,
  chunkSize = 100
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = chunk.map(processor);
    results.push(...chunkResults);

    // Yield al browser tra i chunk
    if (i + chunkSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return results;
}

/**
 * Rileva se la connessione è lenta
 */
export function isSlowConnection(): boolean {
  if (!('connection' in navigator)) return false;
  
  const connection = (navigator as any).connection;
  return connection?.effectiveType === 'slow-2g' || 
         connection?.effectiveType === '2g' ||
         connection?.saveData === true;
}

/**
 * Rileva se il device ha risorse limitate
 */
export function isLowEndDevice(): boolean {
  // Check memory (se disponibile)
  const memory = (performance as any).memory;
  if (memory && memory.jsHeapSizeLimit < 1073741824) { // < 1GB
    return true;
  }

  // Check hardware concurrency
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) {
    return true;
  }

  return false;
}

/**
 * Ottimizza immagini per device corrente
 */
export function getOptimizedImageUrl(
  url: string,
  width?: number,
  quality?: number
): string {
  // Se è un'immagine esterna, ritorna l'URL originale
  if (url.startsWith('http') && !url.includes('supabase')) {
    return url;
  }

  // Se è da Supabase Storage, aggiungi parametri di trasformazione
  if (url.includes('supabase.co/storage')) {
    const params = new URLSearchParams();
    if (width) params.append('width', width.toString());
    if (quality) params.append('quality', quality.toString());
    
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${params.toString()}`;
  }

  return url;
}
